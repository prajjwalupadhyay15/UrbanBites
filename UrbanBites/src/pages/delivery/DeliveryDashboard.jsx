import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { dispatchApi } from '../../api/dispatchApi';
import { deliveryOrderApi } from '../../api/orderApi';
import { userApi } from '../../api/userApi';
import { notificationApi } from '../../api/notificationApi';
import { trackingApi } from '../../api/trackingApi';
import { Client } from '@stomp/stompjs';
import toast from 'react-hot-toast';
import SockJS from 'sockjs-client';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Bike, DollarSign, Clock, MapPin, Package,
  CheckCircle, CheckCircle2, XCircle, Navigation, ArrowRight,
  RefreshCw, MapPinned, Zap, History, CreditCard,
  ChefHat, FileText, ArrowUpRight, ExternalLink, Phone
} from 'lucide-react';

// ── Leaflet custom icons ─────────────────────────────────────────────────────
const createIcon = (html) => L.divIcon({ html, className: 'custom-leaflet-icon', iconSize: [36, 36], iconAnchor: [18, 18] });
const restaurantIcon = createIcon(`<div style="width:36px;height:36px;background:#F7B538;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 0 12px rgba(247,181,56,0.5)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg></div>`);
const customerIcon = createIcon(`<div style="width:36px;height:36px;background:#3b82f6;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 0 12px rgba(59,130,246,0.5)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></div>`);
const agentIcon = createIcon(`<div style="width:36px;height:36px;background:#10b981;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 0 12px rgba(16,185,129,0.5)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/></svg></div>`);

// ── Mini map bounds auto-fitter ──────────────────────────────────────────────
function MapFitter({ points }) {
  const map = useMap();
  useEffect(() => {
    const valid = points.filter(Boolean);
    if (valid.length > 0) {
      map.fitBounds(L.latLngBounds(valid), { padding: [40, 40], maxZoom: 15 });
    }
  }, [map, points]);
  return null;
}

// ── Google Maps directions link builder ──────────────────────────────────────
const gmapsNavUrl = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=two-wheeler`;

const ASSIGNMENT_STATUS_CFG = {
  OFFERED: { label: 'New Offer', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', pulse: true },
  ACCEPTED: { label: 'Go to Restaurant', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', pulse: false },
  PICKED_UP: { label: 'Deliver to Customer', color: 'bg-[#FDF9F1] text-[#F7B538] border-[#F7B538]/20', pulse: true },
};

function resolveAgentApprovalStatus(notifications) {
  const signal = notifications.find(n => n.type === 'APPROVAL_STATUS_CHANGED' && n.title.includes('Rider'));
  if (!signal) return null;
  if (signal.title.toLowerCase().includes('approved')) return 'APPROVED';
  if (signal.title.toLowerCase().includes('rejected')) return 'REJECTED';
  return 'PENDING';
}

export default function DeliveryDashboard() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [isOnline, setIsOnline] = useState(false);
  const [approvalError, setApprovalError] = useState('');
  const [geoError, setGeoError] = useState('');
  const [agentLocation, setAgentLocation] = useState(null);
  const stompClientRef = useRef(null);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'active'; // 'active', 'history', 'finance'
  const setActiveTab = (tab) => setSearchParams(tab === 'active' ? {} : { tab }, { replace: true });

  // Fetch agent profile
  const { data: profile } = useQuery({
    queryKey: ['delivery-profile'],
    queryFn: userApi.getProfile,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (profile) {
      setIsOnline(profile.online && profile.available);
    }
  }, [profile]);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', 'approval-signal'],
    queryFn: () => notificationApi.list(0, 100),
    staleTime: 1000 * 60,
  });

  const approvalStatus = profile?.approvalStatus || resolveAgentApprovalStatus(notifications);

  // 1. Current assignment polling (fallback 8s) + WebSocket Real-Time Integration
  const { data: assignment, isLoading: assignLoading, refetch } = useQuery({
    queryKey: ['delivery-current-assignment'],
    queryFn: dispatchApi.getCurrentAssignment,
    refetchInterval: isOnline ? 8000 : false,
    staleTime: 3000,
    retry: false,
  });

  const hasActiveAssignment = !!assignment && ['OFFERED', 'ACCEPTED', 'PICKED_UP'].includes(assignment.status);

  // 2. Fetch Active Assignment Data via new endpoint! (restaurant address, items, etc)
  const { data: details, isLoading: detailsLoading, refetch: refetchDetails } = useQuery({
    queryKey: ['delivery-assignment-details', assignment?.assignmentId],
    queryFn: dispatchApi.getCurrentAssignmentDetails,
    enabled: hasActiveAssignment,
    refetchInterval: isOnline ? 8000 : false,
    retry: false,
  });

  // 3. Fetch History via new endpoint
  const { data: history = [], isLoading: historyLoading } = useQuery({    
    queryKey: ['delivery-order-history'],
    queryFn: dispatchApi.getMyOrderHistory,
    enabled: activeTab === 'history',
    retry: false,
  });

  // 4. Fetch Finance via new endpoint
  const { data: financeSummary, isLoading: financeLoading } = useQuery({
    queryKey: ['delivery-finance-summary'],
    queryFn: dispatchApi.getFinanceSummary,
    enabled: activeTab === 'finance',
    retry: false,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['delivery-finance-transactions'],
    queryFn: dispatchApi.getFinanceTransactions,
    enabled: activeTab === 'finance',
    retry: false,
  });

  // Real-time STOMP Subscription for instant assignment offers
  useEffect(() => {
    if (!user?.id || !isOnline) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const stompClient = new Client({
      webSocketFactory: () => new SockJS(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'}/ws`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    stompClient.onConnect = () => {
      stompClientRef.current = stompClient;
      stompClient.subscribe(`/topic/agents/${user.id}/offers`, (message) => {
        qc.invalidateQueries(['delivery-current-assignment']);
        try { new Audio('/notification.mp3').play(); } catch (e) { /* ignore */ }
      });
    };

    stompClient.activate();
    return () => {
      stompClient.deactivate();
      stompClientRef.current = null;
    };
  }, [user?.id, isOnline, qc]);

  // Mutations
  const availabilityMut = useMutation({
    mutationFn: dispatchApi.updateAvailability,
    onSuccess: (data) => {
      setIsOnline(data.online && data.available);
      setApprovalError('');
      toast.success(data.online && data.available ? 'You are now online!' : 'You are now offline');
    },
    onError: (err) => {
      if (err?.response?.status === 403) {
        setApprovalError(err?.response?.data?.message || 'Your account is pending admin approval.');
        toast.error('Account pending approval');
      } else {
        setApprovalError('');
        toast.error('Failed to update availability');
      }
    },
  });

  const acceptMut = useMutation({
    mutationFn: dispatchApi.acceptOffer,
    onSuccess: () => { qc.invalidateQueries(['delivery-current-assignment']); refetchDetails(); toast.success('Order accepted!'); },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to accept order')
  });

  const rejectMut = useMutation({
    mutationFn: dispatchApi.rejectOffer,
    onSuccess: () => { qc.invalidateQueries(['delivery-current-assignment']); refetchDetails(); toast('Order declined', { icon: '⏭️' }); },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to reject order')
  });

  // NOTE: Changed to deliveryOrderApi.markOutForDelivery for proper global state progression!
  const pickupMut = useMutation({
    mutationFn: deliveryOrderApi.markOutForDelivery,
    onSuccess: () => { qc.invalidateQueries(['delivery-current-assignment']); refetchDetails(); toast.success('Picked up! Head to the customer.'); },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to mark as picked up')
  });

  const deliveredMut = useMutation({
    mutationFn: deliveryOrderApi.markDelivered,
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['delivery-current-assignment'] }); 
      qc.invalidateQueries({ queryKey: ['delivery-order-history'] });
      qc.invalidateQueries({ queryKey: ['delivery-finance-summary'] });
      qc.invalidateQueries({ queryKey: ['delivery-finance-transactions'] });
      toast.success('Order delivered! Great job 🎉');
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to mark as delivered')
  });

  const isMutating = acceptMut.isPending || rejectMut.isPending || pickupMut.isPending || deliveredMut.isPending || availabilityMut.isPending;

  // Live Location Tracking (Ping)
  useEffect(() => {
    if (!isOnline || !user?.id) return;

    let watchId;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const speed = pos.coords.speed ? (pos.coords.speed * 3.6) : 0;
          
          setAgentLocation([lat, lng]);

          if (stompClientRef.current && stompClientRef.current.connected) {
            stompClientRef.current.publish({
              destination: '/app/tracking/agent/ping',
              body: JSON.stringify({
                latitude: lat,
                longitude: lng,
                speedKmph: speed
              })
            });
          } else if (assignment?.orderId) {
            // Fallback to HTTP REST endpoint if WebSocket is not connected but we have an active assignment
            trackingApi.pingLocation(assignment.orderId, lat, lng).catch(() => {});
          }
        },
        (error) => console.error("Agent Live Tracking failed:", error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
    return () => { if (watchId !== undefined) navigator.geolocation.clearWatch(watchId); };
  }, [isOnline, user?.id, assignment?.orderId]);

  const handleToggleOnline = () => {
    const goOnline = !isOnline;
    if (goOnline && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoError('');
          availabilityMut.mutate({
            online: true,
            available: true,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        (err) => {
          console.error("Geo error:", err);
          setGeoError('Location access required to go online. Please enable location services.');
        },
        { enableHighAccuracy: true }
      );
    } else {
      availabilityMut.mutate({ online: false, available: false, latitude: 0, longitude: 0 });
    }
  };

  const asgn = assignment;
  const asgCfg = ASSIGNMENT_STATUS_CFG[asgn?.status] || null;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-[#FFFCF5] to-[#FDF9F1] relative overflow-hidden font-sans">
      
      {/* ─── Animated Mesh Gradient Background ─── */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div 
          className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-[#780116]/10 rounded-full blur-[120px]"
          animate={{ x: [-30, 30], y: [30, -30] }}
          transition={{ duration: 15, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-[#F7B538]/10 rounded-full blur-[100px]"
          animate={{ x: [30, -30], y: [-30, 30] }}
          transition={{ duration: 12, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 2 }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <motion.h1
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="text-4xl sm:text-5xl font-black text-[#780116] tracking-tight font-display"
              >
                Hi, <span className="text-[#F7B538]">{(profile?.fullName || user?.fullName) ? (profile?.fullName || user?.fullName).split(' ')[0] : 'Rider'}</span>
              </motion.h1>
              {approvalStatus && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider shadow-sm ${
                  approvalStatus === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' :
                  approvalStatus === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                  'bg-yellow-50 text-yellow-700 border-yellow-200'
                }`}>
                  {approvalStatus === 'APPROVED' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                  {approvalStatus === 'APPROVED' ? 'Verified' : approvalStatus === 'REJECTED' ? 'Rejected' : 'Pending Review'}
                </span>
              )}
            </div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-[#8E7B73] font-bold text-lg mt-1">
              Hit the road and deliver smiles.
            </motion.p>
          </div>

          <motion.button
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
            onClick={handleToggleOnline}
            disabled={availabilityMut.isPending}
            className={`self-start px-6 py-3 border rounded-full font-black flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 ${
              isOnline
                ? 'bg-green-50 border-green-200 text-green-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700'
                : 'bg-white border-[#EADDCD] text-[#8E7B73] hover:bg-[#FDF9F1] hover:border-[#F7B538] hover:text-[#F7B538]'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full border border-white ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-[#D2C5B8]'}`} />
            {availabilityMut.isPending ? 'Updating…' : isOnline ? 'Online — Go Offline' : 'Go Online'}
          </motion.button>
        </div>

        {geoError && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-red-600 text-xs font-bold shadow-sm">
            <MapPin size={14} /> {geoError}
          </div>
        )}
        {approvalError && (
          <div className="mb-6 p-3.5 bg-yellow-50 border border-yellow-200 rounded-2xl flex items-center gap-2 text-yellow-700 text-xs font-bold shadow-sm">
            <Clock size={14} /> {approvalError}
          </div>
        )}

        {/* Tab Navigation Menu */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none border-b border-[#EADDCD]">
           {[
             { id: 'active', label: 'Active Delivery', icon: Navigation },
             { id: 'history', label: 'Past Orders', icon: History },
             { id: 'finance', label: 'Earnings', icon: DollarSign },
           ].map((tab) => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-black text-sm uppercase tracking-wider transition-all relative whitespace-nowrap ${
                 activeTab === tab.id ? 'text-[#780116]' : 'text-[#8E7B73] hover:text-[#F7B538]'
               }`}
             >
               <tab.icon size={16} className={activeTab === tab.id ? "text-[#F7B538]" : ""} />
               {tab.label}
               {activeTab === tab.id && (
                 <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-1 rounded-t-full bg-[#F7B538] shadow-[0_0_10px_rgba(247,181,56,0.5)]" />
               )}
               
               {/* Pulse indicator for Active Delivery if assigned */}
               {tab.id === 'active' && hasActiveAssignment && (
                 <span className="absolute top-3 right-2 w-2 h-2 rounded-full bg-[#F7B538] animate-pulse" />
               )}
             </button>
           ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ─────────────────────────────────────────────────────────────
              ACTIVE TAB
             ────────────────────────────────────────────────────────────── */}
          {activeTab === 'active' && (
            <motion.div key="active" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="bg-[#FFFCF5] border border-[#EADDCD] rounded-[2.5rem] overflow-hidden shadow-premium relative">
                
                {hasActiveAssignment && asgn.status === 'OFFERED' && (
                   <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#F7B538] to-orange-400 animate-pulse" />
                )}

                <div className="px-6 py-5 border-b border-[#EADDCD] flex items-center justify-between bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#FDF9F1] rounded-xl flex items-center justify-center">
                      <Navigation size={18} className="text-[#F7B538]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-[#780116] font-display">Current Assignment</h2>
                      <p className="text-[#8E7B73] text-xs font-bold">Your live delivery task</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { refetch(); refetchDetails(); }}
                    className="px-3 py-2 rounded-xl bg-white border border-[#EADDCD] text-[#8E7B73] hover:text-[#780116] hover:bg-[#FDF9F1] text-xs font-bold transition-all shadow-sm"
                  >
                    <RefreshCw size={12} />
                  </button>
                </div>

                <div className="p-6">
                  {assignLoading || detailsLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-[#EADDCD]/30 rounded-2xl animate-pulse" />)}
                    </div>
                  ) : !hasActiveAssignment ? (
                    <div className="py-16 text-center">
                      <div className="w-20 h-20 mx-auto bg-white border border-[#EADDCD] rounded-full flex items-center justify-center mb-5 shadow-sm">
                        <Bike size={32} className="text-[#D2C5B8]" />
                      </div>
                      <h3 className="text-xl font-black text-[#780116] mb-2 font-display">
                        {isOnline ? 'Scanning for orders…' : 'You are offline'}
                      </h3>
                      <p className="text-[#8E7B73] text-sm font-bold max-w-xs mx-auto">
                        {isOnline
                          ? 'Stay online — high paying orders in your zone will be matched to you directly.'
                          : 'Go online to start receiving delivery requests.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Left: Action Control Center */}
                      <div className="lg:col-span-2 space-y-4">
                        <div className={`p-6 rounded-[2rem] border relative overflow-hidden shadow-sm ${
                          asgn.status === 'OFFERED' ? 'bg-white border-yellow-200' :
                          asgn.status === 'ACCEPTED' ? 'bg-white border-blue-200' :
                          'bg-white border-[#F7B538]/40'
                        }`}>
                           <div className="flex items-center justify-between mb-6">
                             <div className="flex items-center gap-3">
                               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${asgCfg.color}`}>
                                 <Package size={22} />
                               </div>
                               <div>
                                 <p className="text-[#780116] font-black text-xl">Order #{asgn.orderId}</p>
                                 <p className="text-[#8E7B73] text-sm font-bold">Earn highly competitive rates</p>
                               </div>
                             </div>
                             {asgCfg && (
                               <span className={`text-[11px] font-black px-4 py-2 rounded-full border ${asgCfg.color} ${asgCfg.pulse ? 'animate-pulse' : ''} shadow-sm backdrop-blur-md`}>
                                 {asgCfg.label}
                               </span>
                             )}
                           </div>
                           
                           {/* Details Card from the Backend API */}
                           {details ? (
                             <div className="mb-6 space-y-5">
                               {/* ── Mini Route Map ── */}
                               {(details.restaurantLatitude || details.deliveryLatitude) && (
                                 <div className="rounded-2xl overflow-hidden border border-[#EADDCD] h-48 relative z-0 shadow-sm">
                                   <MapContainer
                                     center={[details.restaurantLatitude || details.deliveryLatitude, details.restaurantLongitude || details.deliveryLongitude]}
                                     zoom={13}
                                     style={{ height: '100%', width: '100%' }}
                                     scrollWheelZoom={false}
                                     zoomControl={false}
                                     attributionControl={false}
                                   >
                                     <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                                     <MapFitter points={[
                                       agentLocation,
                                       details.restaurantLatitude && [details.restaurantLatitude, details.restaurantLongitude],
                                       details.deliveryLatitude && [details.deliveryLatitude, details.deliveryLongitude]
                                     ]} />
                                     {agentLocation && (
                                       <Marker position={agentLocation} icon={agentIcon}>
                                         <Popup>You</Popup>
                                       </Marker>
                                     )}
                                     {details.restaurantLatitude && (
                                       <Marker position={[details.restaurantLatitude, details.restaurantLongitude]} icon={restaurantIcon}>
                                         <Popup>{details.restaurantName}</Popup>
                                       </Marker>
                                     )}
                                     {details.deliveryLatitude && (
                                       <Marker position={[details.deliveryLatitude, details.deliveryLongitude]} icon={customerIcon}>
                                         <Popup>{details.customerName}</Popup>
                                       </Marker>
                                     )}
                                     {details.restaurantLatitude && details.deliveryLatitude && (
                                       <>
                                         {/* Route from Agent to Restaurant or Customer based on status */}
                                         {agentLocation && asgn.status === 'ACCEPTED' && (
                                           <Polyline positions={[
                                             agentLocation,
                                             [details.restaurantLatitude, details.restaurantLongitude]
                                           ]} pathOptions={{ color: '#10b981', weight: 4, dashArray: '8 6', opacity: 0.8 }} />
                                         )}
                                         {agentLocation && asgn.status === 'PICKED_UP' && (
                                           <Polyline positions={[
                                             agentLocation,
                                             [details.deliveryLatitude, details.deliveryLongitude]
                                           ]} pathOptions={{ color: '#10b981', weight: 4, dashArray: '8 6', opacity: 0.8 }} />
                                         )}
                                         {/* Full route context */}
                                         <Polyline positions={[
                                           [details.restaurantLatitude, details.restaurantLongitude],
                                           [details.deliveryLatitude, details.deliveryLongitude]
                                         ]} pathOptions={{ color: '#FF6B35', weight: 2, dashArray: '4 4', opacity: 0.5 }} />
                                       </>
                                     )}
                                   </MapContainer>
                                 </div>
                               )}

                               {/* ── Pickup / Dropoff Nodes ── */}
                               <div className="space-y-4 relative">
                                 <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-[#EADDCD]" />

                                 {/* Pickup Node */}
                                 <div className="flex gap-4 relative z-10">
                                   <div className="w-10 h-10 bg-white border border-[#EADDCD] shadow-sm rounded-full flex items-center justify-center flex-shrink-0">
                                     <ChefHat size={16} className="text-[#8E7B73]" />
                                   </div>
                                   <div className="flex-1">
                                     <p className="text-xs text-[#8E7B73] font-black uppercase tracking-wider mb-1">Pickup From</p>
                                     <p className="text-[#780116] font-black text-lg leading-tight">{details.restaurantName}</p>
                                     <p className="text-[#8E7B73] text-sm mt-1">{details.restaurantAddress || 'Address not available'}</p>
                                     {details.restaurantLatitude && (
                                       <a
                                         href={gmapsNavUrl(details.restaurantLatitude, details.restaurantLongitude)}
                                         target="_blank" rel="noopener noreferrer"
                                         className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-[#FDF9F1] border border-[#F7B538]/30 text-[#F7B538] text-xs font-bold hover:bg-[#F7B538]/20 transition-colors"
                                       >
                                         <Navigation size={12} /> Navigate <ExternalLink size={10} />
                                       </a>
                                     )}
                                   </div>
                                 </div>

                                 {/* Dropoff Node */}
                                 <div className="flex gap-4 relative z-10">
                                   <div className="w-10 h-10 bg-[#FDF9F1] border border-[#F7B538]/30 rounded-full flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(247,181,56,0.3)]">
                                     <MapPin size={16} className="text-[#F7B538]" />
                                   </div>
                                   <div className="flex-1">
                                     <p className="text-xs text-[#8E7B73] font-black uppercase tracking-wider mb-1">Deliver To</p>
                                     <p className="text-[#780116] font-black text-lg leading-tight">{details.customerName}</p>
                                     <p className="text-[#8E7B73] text-sm mt-1">{details.deliveryAddress || 'Address not available'}</p>
                                     <div className="flex flex-wrap items-center gap-2 mt-2">
                                       {details.deliveryLatitude && (
                                         <a
                                           href={gmapsNavUrl(details.deliveryLatitude, details.deliveryLongitude)}
                                           target="_blank" rel="noopener noreferrer"
                                           className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors"
                                         >
                                           <Navigation size={12} /> Navigate <ExternalLink size={10} />
                                         </a>
                                       )}
                                       {details.customerPhone && (
                                         <a
                                           href={`tel:${details.customerPhone}`}
                                           className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-bold hover:bg-green-100 transition-colors"
                                         >
                                           <Phone size={12} /> {details.customerPhone}
                                         </a>
                                       )}
                                     </div>
                                   </div>
                                 </div>
                               </div>
                             </div>
                           ) : (
                             <div className="h-32 bg-[#EADDCD]/30 rounded-2xl mb-6 animate-pulse" />
                           )}

                           {/* Action buttons based on status */}
                           <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-[#EADDCD] border-dashed">
                             {asgn.status === 'OFFERED' && (
                               <>
                                 <button
                                   onClick={() => acceptMut.mutate(asgn.orderId)}
                                   disabled={isMutating}
                                   className="flex-1 px-5 py-4 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 text-white font-black text-sm shadow-[0_4px_16px_rgba(74,222,128,0.2)] hover:shadow-[0_8px_24px_rgba(74,222,128,0.4)] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wide"
                                 >
                                   <CheckCircle2 size={18} /> Accept Delivery
                                 </button>
                                 <button
                                   onClick={() => rejectMut.mutate(asgn.orderId)}
                                   disabled={isMutating}
                                   className="px-5 py-4 rounded-2xl bg-white border border-[#EADDCD] text-[#8E7B73] shadow-sm font-black text-sm hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wide"
                                 >
                                   <XCircle size={18} /> Pass
                                 </button>
                               </>
                             )}
                             {asgn.status === 'ACCEPTED' && (
                               <>
                                 <a
                                   href={gmapsNavUrl(details?.restaurantLatitude, details?.restaurantLongitude)}
                                   target="_blank" rel="noopener noreferrer"
                                   className="flex-1 px-5 py-4 rounded-2xl bg-white border-2 border-[#F7B538] text-[#F7B538] font-black text-sm shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-wide hover:bg-[#FDF9F1]"
                                 >
                                   <Navigation size={18} /> Navigate to Restaurant
                                 </a>
                                 <button
                                   onClick={() => pickupMut.mutate(asgn.orderId)}
                                   disabled={isMutating}
                                   className="flex-1 px-5 py-4 rounded-2xl bg-[#780116] border-2 border-[#A00320] text-white font-black text-sm shadow-premium active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wide transform hover:-translate-y-1"
                                 >
                                   <Package size={18} /> Confirm Got Order
                                 </button>
                               </>
                             )}
                             {asgn.status === 'PICKED_UP' && (
                               <>
                                 <a
                                   href={gmapsNavUrl(details?.deliveryLatitude, details?.deliveryLongitude)}
                                   target="_blank" rel="noopener noreferrer"
                                   className="flex-1 px-5 py-4 rounded-2xl bg-white border-2 border-blue-500 text-blue-600 font-black text-sm shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-wide hover:bg-blue-50"
                                 >
                                   <Navigation size={18} /> Navigate to Customer
                                 </a>
                                 <button
                                   onClick={() => deliveredMut.mutate(asgn.orderId)}
                                   disabled={isMutating}
                                   className="flex-1 px-5 py-4 rounded-2xl bg-green-600 border border-green-700 text-white font-black text-sm shadow-premium active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wide transform hover:-translate-y-1"
                                 >
                                   <CheckCircle2 size={18} /> Mark Delivered
                                 </button>
                               </>
                             )}
                           </div>
                        </div>
                      </div>

                      {/* Right: Quick Order Ledger */}
                      {details && (
                        <div className="bg-white border border-[#EADDCD] shadow-sm rounded-[2rem] p-6 h-fit sticky top-6">
                           <h4 className="text-[#780116] text-xs font-black mb-4 uppercase tracking-wider flex items-center gap-2 font-display">
                             <FileText size={14} className="text-[#F7B538]" /> Order Ledger
                           </h4>
                           
                           <div className="bg-[#FFFCF5] border border-[#EADDCD] rounded-2xl p-4 mb-4 space-y-3 shadow-sm">
                             {details.items?.map((item, idx) => (
                               <div key={idx} className="flex items-start gap-2 border-b border-[#EADDCD] border-dashed pb-3 last:border-0 last:pb-0">
                                 <span className="text-[#8E7B73] font-black mt-0.5">{item.quantity}x</span>
                                 <div className="flex-1">
                                   <div className="flex items-center gap-1.5">
                                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.veg ? 'bg-green-600' : 'bg-red-600'}`} />
                                      <span className="text-[#780116] font-bold text-sm leading-snug">{item.itemName}</span>
                                   </div>
                                   {item.notes && <p className="text-[#8E7B73] text-xs mt-0.5 italic">{item.notes}</p>}
                                 </div>
                               </div>
                             ))}
                           </div>

                           <div className="space-y-3 text-sm pt-2">
                              <div className="flex justify-between">
                                <span className="text-[#8E7B73] font-bold">Subtotal Value</span>
                                <span className="text-[#2A0800] font-black">₹{details.grandTotal}</span>
                              </div>
                              <div className="flex justify-between font-black text-green-700 p-3 bg-green-50 rounded-xl border border-green-200">
                                <span>Estimated Fee</span>
                                <span>₹{details.deliveryFee || '50.00'}</span>
                              </div>
                           </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              HISTORY TAB
             ────────────────────────────────────────────────────────────── */}
          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid gap-4">
                {historyLoading ? (
                  [...Array(3)].map((_, i) => <div key={i} className="h-24 bg-[#EADDCD]/30 rounded-[2rem] animate-pulse" />)
                ) : history.length === 0 ? (
                  <div className="bg-white border border-[#EADDCD] shadow-sm rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center">
                    <History size={48} className="text-[#D2C5B8] mb-4" />
                    <h3 className="text-[#780116] font-black text-xl mb-1 font-display">No Past Deliveries</h3>
                    <p className="text-[#8E7B73] text-sm font-bold">Your delivery history will appear here once you complete orders.</p>
                  </div>
                ) : (
                  history.map((order, idx) => (
                    <motion.div 
                      key={order.orderId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white border border-[#EADDCD] hover:border-[#F7B538] hover:shadow-premium shadow-sm rounded-[2rem] p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                          order.orderStatus === 'DELIVERED' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                          {order.orderStatus === 'DELIVERED' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                        </div>
                        <div>
                          <p className="text-[#780116] font-black text-lg">Order #{order.orderId}</p>
                          <p className="text-[#8E7B73] text-xs font-bold mt-0.5">{new Date(order.updatedAt).toLocaleString()}</p>
                          <p className="text-[#8E7B73] text-sm font-medium mt-1">{order.restaurantName} <ArrowRight size={12} className="inline mx-1 text-[#D2C5B8]" /> {order.customerName}</p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right p-3 sm:p-0 bg-[#FFFCF5] sm:bg-transparent rounded-2xl border sm:border-0 border-[#EADDCD]">
                        <p className="text-[#8E7B73] text-xs font-black uppercase tracking-wider mb-1">Earned</p>
                        <p className={`text-xl font-black ${order.orderStatus === 'DELIVERED' ? 'text-green-600' : 'text-[#2A0800]'}`}>
                          {order.orderStatus === 'DELIVERED' ? `+₹${order.deliveryFee || '0.00'}` : '₹0.00'}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              FINANCE / EARNINGS TAB
             ────────────────────────────────────────────────────────────── */}
          {activeTab === 'finance' && (
            <motion.div key="finance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { title: 'Total Earned', value: `₹${financeSummary?.totalDeliveryFees || '0.00'}`, icon: CreditCard, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
                  { title: 'Completed Deliveries', value: financeSummary?.completedDeliveries || 0, icon: CheckCircle2, color: 'text-[#F7B538]', bg: 'bg-[#FDF9F1] border-[#F7B538]/30' },
                  { title: 'Cancelled / Missed', value: financeSummary?.cancelledAssignments || 0, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white border border-[#EADDCD] shadow-sm rounded-[2.5rem] p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.05]">
                      <stat.icon size={64} className={stat.color} />
                    </div>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border ${stat.bg}`}>
                      <stat.icon size={20} className={stat.color} />
                    </div>
                    <h3 className="text-[#8E7B73] font-black text-sm mb-1 uppercase tracking-wider">{stat.title}</h3>
                    <p className={`text-4xl font-black ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Payout Transactions List */}
              <div className="bg-white border border-[#EADDCD] shadow-sm rounded-[2.5rem] overflow-hidden mt-8">
                 <div className="px-6 py-5 border-b border-[#EADDCD] bg-[#FFFCF5]">
                    <h3 className="text-[#780116] font-black text-lg flex items-center gap-2 font-display">
                       <CreditCard size={18} className="text-[#F7B538]" /> Recent Payout Records
                    </h3>
                 </div>
                 <div className="p-0">
                    {transactions.length === 0 ? (
                      <div className="py-12 text-center text-[#8E7B73] font-bold">No payout records found.</div>
                    ) : (
                      <div className="divide-y divide-[#EADDCD] border-t-0">
                        {transactions.map((tx, idx) => (
                          <div key={idx} className="flex justify-between items-center px-6 py-4 hover:bg-[#FDF9F1] transition-colors">
                            <div>
                               <p className="text-[#780116] font-black tracking-wide">Payout for Order #{tx.orderId}</p>
                               <span className="text-[#8E7B73] text-xs font-bold">{new Date(tx.updatedAt).toLocaleString()}</span>
                            </div>
                            <div className="text-right">
                               <p className="text-green-600 font-black text-lg flex items-center gap-1"><ArrowUpRight size={16}/> ₹{tx.earningAmount}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
