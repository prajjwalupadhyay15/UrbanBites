import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { trackingApi } from '../../api/trackingApi';
import { customerOrderApi } from '../../api/orderApi';
import { useAuthStore } from '../../store/authStore';
import { ArrowLeft, Clock, MapPin, Navigation, Package, CheckCircle2, Bike, ChefHat, UtensilsCrossed, Bell, User, Phone } from 'lucide-react';

const createCustomIcon = (iconHtml, size = [40, 40]) => {
  return L.divIcon({
    html: iconHtml,
    className: 'custom-leaflet-icon',
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] / 2],
    popupAnchor: [0, -size[1] / 2],
  });
};

const createAgentIconSized = (heading) => {
  const icon = createAgentIcon(heading);
  // Override size for the bike
  icon.options.iconSize = [56, 56];
  icon.options.iconAnchor = [28, 28];
  icon.options.popupAnchor = [0, -28];
  return icon;
};

const storeIcon = createCustomIcon(`<div class="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-[#F7B538] shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F7B538" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg></div>`);
const homeIcon = createCustomIcon(`<div class="w-10 h-10 bg-[#FFFCF5] rounded-full flex items-center justify-center border-2 border-[#EADDCD] shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#780116" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg></div>`);

const createAgentIcon = (heading) => createCustomIcon(`
  <div style="transform: rotate(${heading}deg); transition: transform 1s ease-out; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 6px 16px rgba(120,1,22,0.25));">
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Back wheel -->
      <circle cx="16" cy="46" r="8" stroke="#780116" stroke-width="2.5" fill="#FFFCF5"/>
      <circle cx="16" cy="46" r="3" fill="#780116"/>
      <!-- Front wheel -->
      <circle cx="48" cy="46" r="8" stroke="#780116" stroke-width="2.5" fill="#FFFCF5"/>
      <circle cx="48" cy="46" r="3" fill="#780116"/>
      <!-- Frame -->
      <path d="M16 46 L28 30 L42 30 L48 46" stroke="#780116" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <line x1="28" y1="30" x2="16" y2="46" stroke="#780116" stroke-width="2"/>
      <line x1="28" y1="30" x2="36" y2="46" stroke="#8E7B73" stroke-width="1.5"/>
      <!-- Engine body -->
      <rect x="24" y="34" width="16" height="8" rx="3" fill="#F7B538" stroke="#780116" stroke-width="1.5"/>
      <!-- Delivery bag on back -->
      <rect x="4" y="26" width="14" height="16" rx="3" fill="#F7B538" stroke="#780116" stroke-width="2"/>
      <rect x="6" y="28" width="10" height="4" rx="1" fill="#FFFCF5" opacity="0.6"/>
      <text x="11" y="39" text-anchor="middle" fill="#780116" font-size="6" font-weight="bold">UB</text>
      <!-- Rider body -->
      <path d="M34 28 L34 18" stroke="#780116" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M34 22 L28 28" stroke="#780116" stroke-width="2" stroke-linecap="round"/>
      <path d="M34 22 L40 26" stroke="#780116" stroke-width="2" stroke-linecap="round"/>
      <!-- Helmet -->
      <circle cx="34" cy="14" r="5" fill="#780116"/>
      <path d="M29 13 Q34 10 39 13" fill="#F7B538"/>
      <rect x="30" y="14" width="8" height="2" rx="1" fill="#FFFCF5" opacity="0.7"/>
      <!-- Handlebar -->
      <line x1="42" y1="30" x2="46" y2="26" stroke="#8E7B73" stroke-width="2" stroke-linecap="round"/>
      <circle cx="46" cy="25" r="2" fill="#8E7B73"/>
      <!-- Headlight glow -->
      <circle cx="52" cy="40" r="3" fill="#F7B538" opacity="0.8"/>
      <circle cx="52" cy="40" r="5" fill="#F7B538" opacity="0.2"/>
    </svg>
  </div>
`);

// Component to dynamically fit map bounds with a smooth fly animation (only on load)
function MapBoundsUpdater({ restaurant, customer, agent }) {
  const map = useMap();
  const hasFittedBounds = useRef(false);
  const prevAgent = useRef(null);

  useEffect(() => {
    if (!hasFittedBounds.current) {
      const points = [];
      if (restaurant) points.push(restaurant);
      if (customer) points.push(customer);
      if (agent) points.push(agent);
      
      if (points.length > 0) {
        const bounds = L.latLngBounds(points);
        map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 16, duration: 1.5 });
        hasFittedBounds.current = true;
      }
    } else if (agent) {
      // If bounds were already fitted, just pan the map to follow the agent smoothly
      if (!prevAgent.current || prevAgent.current[0] !== agent[0] || prevAgent.current[1] !== agent[1]) {
        map.panTo(agent, { animate: true, duration: 1.5 });
      }
    }
    prevAgent.current = agent;
  }, [map, restaurant, customer, agent]);
  return null;
}

const statusSteps = [
  { id: 'CONFIRMED', label: 'Order Confirmed', icon: Bell, desc: 'Restaurant has been notified' },
  { id: 'ACCEPTED_BY_RESTAURANT', label: 'Accepted', icon: CheckCircle2, desc: 'Restaurant accepted your order' },
  { id: 'PREPARING', label: 'Preparing', icon: ChefHat, desc: 'Your food is being prepared' },
  { id: 'READY_FOR_PICKUP', label: 'Ready for Pickup', icon: Package, desc: 'Food is packed and waiting' },
  { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Bike, desc: 'Delivery agent is on the way' },
  { id: 'DELIVERED', label: 'Delivered', icon: CheckCircle2, desc: 'Enjoy your meal!' },
];


export default function OrderTrackingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const qc = useQueryClient();

  // STOMP WebSocket Connection & React Query initial fetch setup
  const { data: trackerData } = useQuery({
    queryKey: ['orderSnapshot', id],
    queryFn: async () => {
      try {
        return await trackingApi.getSnapshot(id);
      } catch (e) {
        // Snapshot doesn't exist yet (agent hasn't pinged) — return null instead of erroring
        if (e?.response?.status === 404) return null;
        throw e;
      }
    },
    refetchInterval: 10000, // Poll every 10s for location updates
    retry: false,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!token || !id) return;

    const stompClient = new Client({
      webSocketFactory: () => new SockJS(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'}/ws`),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    stompClient.onConnect = () => {
      // 1. Subscribe to location tracking updates (ETA, Lat/Lng)
      stompClient.subscribe(`/topic/orders/${id}/tracking`, (message) => {
        if (message.body) {
          const snapshot = JSON.parse(message.body);
          qc.setQueryData(['orderSnapshot', id], snapshot);
        }
      });
      
      // 2. Subscribe to status updates (CONFIRMED, PREPARING, DELIVERED, etc)
      stompClient.subscribe(`/topic/orders/${id}/status`, (message) => {
        if (message.body) {
          const event = JSON.parse(message.body);
          if (event.payload) {
             // Directly overwrite the react-query cache for instant UI refresh
             qc.setQueryData(['order', id], event.payload);
             
             // Also optionally trigger a refetch just to be perfectly synced
             qc.invalidateQueries({ queryKey: ['order', id] });
             // Invalidate tracking snapshot as well in case status caused delivery completion
             qc.invalidateQueries({ queryKey: ['orderSnapshot', id] });
          }
        }
      });
    };

    stompClient.activate();

    return () => {
      stompClient.deactivate();
    };
  }, [id, token, qc]);

  const { data: order } = useQuery({
    queryKey: ['order', id],
    queryFn: () => customerOrderApi.getMyOrder(id),
  });


  // Derive coordinates — use tracker snapshot, fall back to order's stored coordinates
  const agentLat = trackerData?.latitude;
  const agentLng = trackerData?.longitude;
  const restLat = trackerData?.restaurantLatitude;
  const restLng = trackerData?.restaurantLongitude;
  const delLat = trackerData?.deliveryLatitude || order?.deliveryLatitude;
  const delLng = trackerData?.deliveryLongitude || order?.deliveryLongitude;

  const restaurantPos = restLat && restLng ? [restLat, restLng] : null;
  const customerPos = delLat && delLng ? [delLat, delLng] : null;
  const agentPos = agentLat && agentLng ? [agentLat, agentLng] : null;

  const currentStatus = trackerData?.orderStatus || order?.status;
  const isDelivered = currentStatus === 'DELIVERED';
  const isCancelled = currentStatus === 'CANCELLED';

  // Fetch route geometry + ETA from OSRM
  const { data: osrmData } = useQuery({
    queryKey: ['osrm-route', agentLat, agentLng, delLat, delLng],
    queryFn: async () => {
      if (!agentLat || !agentLng || !delLat || !delLng) return null;
      try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${agentLng},${agentLat};${delLng},${delLat}?overview=full&geometries=geojson`);
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          // GeoJSON coordinates are [lng, lat] — convert to [lat, lng] for Leaflet
          const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
          return { eta: Math.ceil(route.duration / 60), routeCoords: coords };
        }
      } catch (e) {
        console.error("OSRM route error", e);
      }
      return null;
    },
    enabled: !!agentLat && !!agentLng && !!delLat && !!delLng && currentStatus === 'OUT_FOR_DELIVERY',
    refetchInterval: 15000,
    staleTime: 10000,
  });

  // Also fetch restaurant-to-customer route for pre-pickup states
  const { data: fullRouteData } = useQuery({
    queryKey: ['osrm-full-route', restLat, restLng, delLat, delLng],
    queryFn: async () => {
      if (!restLat || !restLng || !delLat || !delLng) return null;
      try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${restLng},${restLat};${delLng},${delLat}?overview=full&geometries=geojson`);
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          return data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
        }
      } catch (e) { /* silent */ }
      return null;
    },
    enabled: !!restLat && !!restLng && !!delLat && !!delLng && currentStatus !== 'OUT_FOR_DELIVERY' && !isDelivered,
    staleTime: 60000,
  });

  const osrmEta = osrmData?.eta;
  const routeCoords = osrmData?.routeCoords;

  const displayEta = osrmEta || trackerData?.etaMinutes || order?.etaMinutes;

  const getCurrentStepIndex = () => {
    switch (currentStatus) {
      case 'PENDING_PAYMENT': return -1;
      case 'CONFIRMED': return 0;
      case 'ACCEPTED_BY_RESTAURANT': return 1;
      case 'PREPARING': return 2;
      case 'READY_FOR_PICKUP': return 3;
      case 'OUT_FOR_DELIVERY': return 4;
      case 'DELIVERED': return 5;
      default: return -1;
    }
  };
  const stepIndex = getCurrentStepIndex();

  // Heading calculation for smooth moving biker
  const prevAgentPos = useRef(null);
  const currentHeading = useRef(0);
  const [dynamicAgentIcon, setDynamicAgentIcon] = useState(() => createAgentIconSized(0));

  useEffect(() => {
    if (agentLat && agentLng) {
      if (prevAgentPos.current) {
        const [prevLat, prevLng] = prevAgentPos.current;
        if (prevLat !== agentLat || prevLng !== agentLng) {
           const lat1 = prevLat * Math.PI / 180;
           const lat2 = agentLat * Math.PI / 180;
           const dLon = (agentLng - prevLng) * Math.PI / 180;
           const y = Math.sin(dLon) * Math.cos(lat2);
           const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
           let bearing = Math.atan2(y, x) * 180 / Math.PI;
           bearing = (bearing + 360) % 360;
           
           // Don't rotate if distance is super tiny to avoid jitter
           if (Math.abs(agentLat - prevLat) > 0.00001 || Math.abs(agentLng - prevLng) > 0.00001) {
             currentHeading.current = bearing;
           }
           setDynamicAgentIcon(createAgentIconSized(currentHeading.current));
        }
      } else {
         setDynamicAgentIcon(createAgentIconSized(0));
      }
      prevAgentPos.current = [agentLat, agentLng];
    }
  }, [agentLat, agentLng]);

  // Loading state — must be AFTER all hooks
  if (!order) {
    return (
      <div className="min-h-screen bg-[#FFFCF5] flex items-center justify-center">
        <div className="w-16 h-16 bg-black/5 rounded-full animate-pulse shadow-sm" />
      </div>
    );
  }

  // Status label for header
  const getStatusLabel = () => {
    if (isCancelled) return 'Order Cancelled';
    if (isDelivered) return 'Delivered!';
    const step = statusSteps[stepIndex];
    return step?.label || currentStatus?.replace(/_/g, ' ') || 'Processing';
  };

  return (
    <div className="min-h-screen bg-[#FFFCF5] text-[#2A0800] flex flex-col md:flex-row">
      {/* MAP SECTION - Left on desktop, Top on mobile */}
      <div className="h-[40vh] md:h-screen md:flex-1 relative z-0">
        <button 
          onClick={() => navigate('/orders')}
          className="absolute top-6 left-6 z-[1000] bg-white p-3 rounded-xl shadow-sm hover:bg-[#FDF9F1] hover:border-[#F7B538] transition-all border border-[#EADDCD] text-[#780116]"
        >
          <ArrowLeft size={20} />
        </button>

        <MapContainer 
          center={[28.7041, 77.1025]} // Default Delhi 
          zoom={13} 
          style={{ height: "100%", width: "100%", zIndex: 0 }}
          zoomControl={false}
        >
          {/* CartoDB Light Matter tile layer for premium light look */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          
          <MapBoundsUpdater restaurant={restaurantPos} customer={customerPos} agent={agentPos} />

          {restaurantPos && (
            <Marker position={restaurantPos} icon={storeIcon}>
              <Popup className="custom-popup">
                <div className="text-dark-text font-medium">{order.restaurantName}</div>
              </Popup>
            </Marker>
          )}

          {customerPos && (
            <Marker position={customerPos} icon={homeIcon}>
              <Popup className="custom-popup">
                <div className="text-[#780116] font-bold">Delivery Address</div>
              </Popup>
            </Marker>
          )}

          {agentPos && !isDelivered && (
            <Marker position={agentPos} icon={dynamicAgentIcon}>
              <Popup className="custom-popup">
                <div className="text-[#780116] font-bold">Delivery Agent</div>
              </Popup>
            </Marker>
          )}

          {/* Draw OSRM road route: agent → customer (during delivery) */}
          {routeCoords && routeCoords.length > 1 && currentStatus === 'OUT_FOR_DELIVERY' && !isDelivered && (
            <>
              {/* Route shadow for depth */}
              <Polyline
                positions={routeCoords}
                pathOptions={{ color: '#780116', weight: 7, opacity: 0.15, lineCap: 'round', lineJoin: 'round' }}
              />
              {/* Main route line */}
              <Polyline
                positions={routeCoords}
                pathOptions={{ color: '#F7B538', weight: 5, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }}
              />
              {/* Animated dashes overlay */}
              <Polyline
                positions={routeCoords}
                pathOptions={{ color: '#FFFCF5', weight: 2, opacity: 0.5, dashArray: '8, 14', lineCap: 'round' }}
              />
            </>
          )}

          {/* Fallback: restaurant → customer route (before agent picks up) */}
          {!routeCoords && fullRouteData && fullRouteData.length > 1 && !isDelivered && (
            <>
              <Polyline
                positions={fullRouteData}
                pathOptions={{ color: '#8E7B73', weight: 4, opacity: 0.2, lineCap: 'round', lineJoin: 'round' }}
              />
              <Polyline
                positions={fullRouteData}
                pathOptions={{ color: '#EADDCD', weight: 3, opacity: 0.6, dashArray: '6, 12', lineCap: 'round' }}
              />
            </>
          )}

          {/* Ultimate fallback: straight line if no OSRM route */}
          {!routeCoords && !fullRouteData && customerPos && (agentPos || restaurantPos) && !isDelivered && (
             <Polyline
               positions={[agentPos || restaurantPos, customerPos]}
               pathOptions={{ color: '#F7B538', dashArray: '10, 10', weight: 4, opacity: 0.7 }}
             />
          )}
        </MapContainer>
        
        {/* Overlay when no tracking data */}
        {!trackerData && !isDelivered && !isCancelled && (
          <div className="absolute inset-0 z-[15] flex items-center justify-center pointer-events-none">
            <div className="bg-white border border-[#EADDCD] px-6 py-4 rounded-[1.5rem] flex items-center gap-4 shadow-lg pointer-events-auto">
              <div className="w-4 h-4 rounded-full bg-[#F7B538] border-2 border-white shadow-sm animate-pulse" />
              <div>
                <p className="text-[#780116] font-black text-sm">Waiting for live tracking</p>
                <p className="text-[#8E7B73] font-bold text-xs">Agent location will appear once pickup begins</p>
              </div>
            </div>
          </div>
        )}

        {/* Overlays / Gradients for premium blending */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#FFFCF5] to-transparent z-[10]"></div>
      </div>

      {/* TRACKING DETAILS PANEL - Right on desktop, Bottom on mobile */}
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        className="flex-1 max-w-md w-full bg-[#FFFCF5] z-20 md:border-l md:border-[#EADDCD] flex flex-col pt-10 md:pt-12 pb-4 px-5 relative rounded-t-[2rem] md:rounded-none md:h-screen md:overflow-y-auto shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:shadow-none"
      >
        <div className="w-12 h-1.5 bg-[#EADDCD] rounded-full mx-auto mb-4 md:hidden"></div>

        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-black font-display text-[#780116] mb-1 tracking-tight">Tracking Order</h1>
            <p className="text-[#8E7B73] font-bold text-xs flex items-center">
              <span className="bg-white border border-[#EADDCD] shadow-sm px-2 py-1 rounded-md overflow-hidden text-ellipsis whitespace-nowrap">#{order.orderId}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-[#8E7B73] tracking-widest mb-0.5">Ordering for</p>
            <p className="text-[#780116] font-bold text-sm bg-[#FDF9F1] border border-[#F7B538]/30 px-3 py-1 rounded-lg">{order.customerName}</p>
          </div>
        </div>

        {isCancelled ? (
            <div className="bg-red-50 border border-red-200 shadow-sm rounded-[1.5rem] p-6 text-center mb-6">
               <div className="w-16 h-16 bg-white border border-red-200 text-red-600 shadow-sm rounded-full flex items-center justify-center mx-auto mb-4">
                 <CheckCircle2 size={32} />
               </div>
               <h3 className="text-2xl font-black text-red-700 mb-2">Order Cancelled</h3>
               <p className="text-red-600/80 font-bold">This order has been cancelled.</p>
            </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 mb-6">
              {/* ETA Card */}
              <div className="bg-white border-2 border-[#EADDCD] shadow-sm rounded-[1.5rem] p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#F7B538]/5 to-transparent"></div>
                <div className="relative z-10 w-full">
                  {isDelivered ? (
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-green-50 border border-green-200 text-green-600 shadow-sm rounded-full flex items-center justify-center">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-[#780116]">Delivered</h3>
                        <p className="text-green-600 text-xs font-bold mt-0.5">Enjoy your food!</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-[#8E7B73] font-bold text-xs mb-1 flex items-center gap-1.5">
                           <Clock size={14} className="text-[#F7B538]" /> Arriving in
                        </h3>
                        <div className="flex items-end gap-2">
                          <span className="text-4xl font-black font-display text-[#780116] tracking-tighter leading-none">
                            {displayEta ? displayEta : '--'}
                          </span>
                          <span className="text-sm text-[#8E7B73] font-bold mb-0.5">mins</span>
                        </div>
                      </div>
                      {currentStatus === 'OUT_FOR_DELIVERY' && agentLat && (
                        <div className="text-right">
                          <p className="text-[#F7B538] text-[10px] font-black flex items-center gap-1.5 bg-[#FDF9F1] border border-[#F7B538]/30 px-2 py-1 rounded-md shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-[#F7B538] border border-white animate-pulse"></span>
                            Live Map
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Agent Card */}
              {trackerData?.agentName && !isCancelled && (
                <div className="bg-white border border-[#EADDCD] shadow-sm rounded-[1.5rem] p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#FDF9F1] border border-[#F7B538]/30 rounded-full flex items-center justify-center text-[#F7B538]">
                      <User size={24} />
                    </div>
                    <div>
                      <p className="text-[#8E7B73] text-[10px] font-black uppercase tracking-widest mb-0.5">Delivery Partner</p>
                      <p className="text-[#780116] font-bold text-sm">{trackerData.agentName}</p>
                    </div>
                  </div>
                  {trackerData.agentPhone && (
                    <a href={`tel:${trackerData.agentPhone}`} className="w-10 h-10 bg-green-50 border border-green-200 text-green-600 rounded-full flex items-center justify-center hover:bg-green-100 transition-colors shadow-sm">
                      <Phone size={18} />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="relative ml-4 pl-6 border-l-2 border-[#EADDCD] space-y-6 mb-6 pb-2">
              {statusSteps.map((step, i) => {
                const isCompleted = i <= stepIndex;
                const isCurrent = i === stepIndex && !isDelivered;
                const Icon = step.icon;

                return (
                  <div key={step.id} className="relative">
                    {/* Circle Node */}
                    <div 
                      className={`absolute -left-[35px] w-6 h-6 rounded-full border-2 flex items-center justify-center bg-white transition-colors duration-500 shadow-sm ${
                        isCompleted ? 'border-[#F7B538]' : 'border-[#EADDCD]'
                      }`}
                    >
                      {isCompleted ? (
                         <div className="w-2.5 h-2.5 bg-[#F7B538] rounded-full"></div>
                      ) : null}
                    </div>

                    <div className={`transition-opacity duration-300 ${isCompleted ? 'opacity-100' : 'opacity-40'} -mt-0.5`}>
                      <h4 className={`text-base font-black flex items-center gap-2 ${isCurrent ? 'text-[#780116]' : 'text-[#2A0800]'}`}>
                        {step.label}
                      </h4>
                      {isCurrent && step.desc && (
                        <p className="text-[#8E7B73] font-bold text-xs mt-0.5">
                          {step.desc}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Order Items & Delivery Address Toggle */}
            <details className="group border border-[#EADDCD] rounded-2xl bg-white shadow-sm overflow-hidden mb-8">
              <summary className="flex items-center justify-between p-4 cursor-pointer font-black text-[#780116] list-none select-none">
                <div className="flex items-center gap-3">
                  <Package size={20} className="text-[#F7B538]" />
                  <span>View Order Details</span>
                </div>
                <span className="text-[#2A0800] text-lg tracking-tight">₹{Number(order.grandTotal).toLocaleString('en-IN')}</span>
              </summary>
              <div className="p-4 border-t border-[#EADDCD] bg-[#FFFCF5]">
                <div className="space-y-3 mb-4">
                  {order.items?.map(item => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-sm border flex items-center justify-center ${item.veg ? 'border-green-600' : 'border-red-600'}`}>
                          <span className={`w-1 h-1 rounded-full ${item.veg ? 'bg-green-600' : 'bg-red-600'}`} />
                        </span>
                        <span className="text-[#780116] text-sm font-bold">{item.itemName}</span>
                        <span className="text-[#8E7B73] font-bold text-xs">×{item.quantity}</span>
                      </div>
                      <span className="text-[#2A0800] text-sm font-black tabular-nums">₹{Number(item.lineTotal).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
                {/* Bill breakdown */}
                <div className="pt-3 border-t border-[#EADDCD] border-dashed space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-[#8E7B73] font-bold">Subtotal</span><span className="text-[#2A0800] font-black">₹{Number(order.subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-[#8E7B73] font-bold">Delivery Fee</span><span className="text-[#2A0800] font-black">₹{Number(order.deliveryFee)}</span></div>
                  {Number(order.taxTotal) > 0 && <div className="flex justify-between"><span className="text-[#8E7B73] font-bold">Tax</span><span className="text-[#2A0800] font-black">₹{Number(order.taxTotal)}</span></div>}
                  <div className="flex justify-between pt-2 mt-1 border-t border-[#EADDCD] border-dashed"><span className="text-[#780116] font-black text-sm">Total Paid</span><span className="text-[#2A0800] font-black text-base">₹{Number(order.grandTotal).toLocaleString('en-IN')}</span></div>
                </div>

                {/* Delivery Address */}
                <div className="border-t border-[#EADDCD] pt-4 mt-4">
                  <h4 className="font-bold text-[#780116] text-sm mb-2">Delivering To</h4>
                  <div className="flex gap-3">
                    <MapPin size={16} className="text-[#F7B538] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-[#780116] text-sm">{order.customerName || 'Delivery Address'}</h4>
                      <p className="text-xs font-medium text-[#8E7B73] mt-0.5 leading-relaxed">{order.deliveryFullAddress || 'Address details loading...'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </>
        )}
      </motion.div>
    </div>
  );
}
