import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '../../store/authStore';
import { ownerOrderApi } from '../../api/orderApi';
import { userApi } from '../../api/userApi';
import { notificationApi } from '../../api/notificationApi';
import toast from 'react-hot-toast';
import {
  Store, TrendingUp, DollarSign, Clock, ChefHat,
  Package, CheckCircle2, XCircle, Flame,
  ArrowRight, RefreshCw, UtensilsCrossed, BellRing,
  Wallet, Activity, History, ReceiptText
} from 'lucide-react';

const STATUS_CONFIG = {
  CONFIRMED: { label: 'New', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Package },
  ACCEPTED_BY_RESTAURANT: { label: 'Accepted', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', icon: CheckCircle2 },
  PREPARING: { label: 'Preparing', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: ChefHat },
  READY_FOR_PICKUP: { label: 'Ready', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle2 },
  OUT_FOR_DELIVERY: { label: 'Out', color: 'bg-[#FDF9F1] text-[#F7B538] border-[#F7B538]/20', icon: ArrowRight },
  DELIVERED: { label: 'Delivered', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
  PENDING_PAYMENT: { label: 'Pending', color: 'bg-[#FFFCF5] text-[#8E7B73] border-[#EADDCD]', icon: Clock },
  CREATED: { label: 'Created', color: 'bg-[#FFFCF5] text-[#8E7B73] border-[#EADDCD]', icon: Clock },
};

const resolveOwnerApprovalStatus = (notifications = []) => {
  const hasApproved = notifications.some((n) => n.type === 'PARTNER_APPROVAL_APPROVED');
  if (hasApproved) return 'APPROVED';
  const hasRejected = notifications.some((n) => n.type === 'PARTNER_APPROVAL_REJECTED');
  if (hasRejected) return 'REJECTED';
  return null;
};

function OrderRow({ order, onAccept, onPreparing, onReady, onCancel, loading }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.CREATED;
  const StatusIcon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      className="bg-white border border-[#EADDCD] rounded-[2rem] p-4 hover:border-[#F7B538] shadow-sm hover:shadow-premium transition-all overflow-hidden"
    >
      <div 
        className="flex items-center justify-between gap-3 flex-wrap cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Order ID & Restaurant */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-[#FDF9F1] border border-[#EADDCD] shadow-sm rounded-xl flex items-center justify-center shrink-0">
            <UtensilsCrossed size={16} className="text-[#F7B538]" />
          </div>
          <div className="min-w-0">
            <p className="text-[#780116] font-black text-sm">Order #{order.orderId}</p>
            <p className="text-[#8E7B73] text-xs font-bold truncate">{order.restaurantName || '—'} · {order.totalItems} items</p>
          </div>
        </div>

        {/* Status badge */}
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border flex items-center gap-1 shrink-0 ${cfg.color}`}>
          <StatusIcon size={10} />
          {cfg.label}
        </span>

        {/* Grand total */}
        <span className="text-[#2A0800] font-black text-sm tabular-nums shrink-0">
          ₹{Number(order.grandTotal).toLocaleString('en-IN')}
        </span>

        {/* Actions */}
        <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {order.status === 'CONFIRMED' && (
            <button
              onClick={() => onAccept(order.orderId)}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all disabled:opacity-50"
            >
              Accept
            </button>
          )}
          {order.status === 'ACCEPTED_BY_RESTAURANT' && (
            <button
              onClick={() => onPreparing(order.orderId)}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-all disabled:opacity-50"
            >
              Start Prep
            </button>
          )}
          {order.status === 'PREPARING' && (
            <button
              onClick={() => onReady(order.orderId)}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all disabled:opacity-50"
            >
              Mark Ready
            </button>
          )}
          {(order.status === 'CONFIRMED' || order.status === 'ACCEPTED_BY_RESTAURANT' || order.status === 'PREPARING') && (
            <button
              onClick={() => onCancel(order.orderId)}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-[#EADDCD] border-dashed"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Items List */}
              <div>
                <h4 className="text-[#8E7B73] text-xs font-black mb-3 uppercase tracking-wider">Order Items</h4>
                <div className="space-y-3">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-[#FFFCF5] p-3 rounded-xl border border-[#EADDCD] shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${item.veg ? 'border-green-600' : 'border-red-600'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${item.veg ? 'bg-green-600' : 'bg-red-600'}`} />
                        </div>
                        <span className="text-[#8E7B73] font-bold text-sm">{item.quantity}x</span>
                        <span className="text-[#780116] text-sm font-black">{item.itemName}</span>
                      </div>
                      <span className="text-[#2A0800] font-black text-sm tabular-nums">₹{item.lineTotal}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Revenue & Details */}
              <div className="bg-[#FFFCF5] border border-[#EADDCD] shadow-sm rounded-2xl p-5">
                <h4 className="text-[#8E7B73] text-xs font-black mb-3 uppercase tracking-wider">Customer & Location</h4>
                {(order.customerName || order.deliveryFullAddress) ? (
                  <div className="mb-4 pb-4 border-b border-[#EADDCD] border-dashed">
                    <p className="text-[#780116] font-black">{order.customerName}</p>
                    <p className="text-[#8E7B73] text-xs mt-1 font-bold leading-relaxed max-w-[250px]">{order.deliveryFullAddress}</p>
                  </div>
                ) : (
                  <div className="mb-4 pb-4 border-b border-[#EADDCD] border-dashed">
                    <p className="text-[#8E7B73] text-xs italic font-bold">Awaiting customer details...</p>
                  </div>
                )}
                
                <h4 className="text-[#8E7B73] text-xs font-black mb-3 uppercase tracking-wider">Revenue Breakdown</h4>
                <div className="space-y-2 text-sm font-bold">
                  {order.payment?.providerPaymentId && (
                    <div className="flex justify-between mb-2">
                       <span className="text-[#8E7B73]">Payment Ref</span>
                       <span className="text-[#780116] font-mono text-xs">{order.payment.providerPaymentId}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#8E7B73]">Subtotal</span>
                    <span className="text-[#2A0800] font-black">₹{order.subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8E7B73]">Packing Charge</span>
                    <span className="text-[#2A0800] font-black">+₹{order.packingCharge}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8E7B73]">Tax (GST)</span>
                    <span className="text-[#2A0800] font-black">+₹{order.taxTotal}</span>
                  </div>
                  <div className="my-3 border-t border-[#EADDCD] border-dashed" />
                  <div className="flex justify-between font-black text-[#780116] text-lg">
                    <span>Grand Total</span>
                    <span>₹{order.grandTotal}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function OwnerDashboard() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: userApi.getProfile,
    staleTime: 1000 * 60 * 5,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', 'approval-signal'],
    queryFn: () => notificationApi.list(0, 100),
    staleTime: 1000 * 60,
  });

  const approvalStatus = profile?.approvalStatus || resolveOwnerApprovalStatus(notifications);

  const { data: orders = [], isLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['owner-orders'],
    queryFn: ownerOrderApi.listOwnerOrders,
    refetchInterval: 15000, // poll every 15s for live updates
    staleTime: 5000,
  });

  const { data: financeSummary, refetch: refetchFinance } = useQuery({
    queryKey: ['owner-finance-summary'],
    queryFn: ownerOrderApi.getFinanceSummary,
    staleTime: 1000 * 60,
  });

  const { data: transactions = [], refetch: refetchTransactions } = useQuery({
    queryKey: ['owner-finance-transactions'],
    queryFn: ownerOrderApi.getFinanceTransactions,
    staleTime: 1000 * 60,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const refetchAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchOrders(),
        refetchFinance(),
        refetchTransactions(),
        qc.invalidateQueries({ queryKey: ['owner-orders'] }),
        qc.invalidateQueries({ queryKey: ['owner-finance-summary'] }),
        qc.invalidateQueries({ queryKey: ['owner-finance-transactions'] }),
        qc.invalidateQueries({ queryKey: ['profile'] }),
      ]);
      toast.success('Dashboard refreshed!');
    } catch {
      toast.error('Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'incoming'; // 'incoming', 'kitchen', 'history', 'finance'
  const setActiveTab = (tab) => setSearchParams(tab === 'incoming' ? {} : { tab }, { replace: true });

  const preparingMut = useMutation({
    mutationFn: (orderId) => ownerOrderApi.markPreparing(orderId),
    onSuccess: () => { qc.invalidateQueries(['owner-orders']); toast.success('Order moved to kitchen!'); },
    onError: (err) => toast.error(err?.response?.data?.message || 'Action failed'),
  });
  const readyMut = useMutation({
    mutationFn: (orderId) => ownerOrderApi.markReadyForPickup(orderId),
    onSuccess: () => { qc.invalidateQueries(['owner-orders']); toast.success('Marked ready for pickup!'); },
    onError: (err) => toast.error(err?.response?.data?.message || 'Action failed'),
  });
  const cancelMut = useMutation({
    mutationFn: (orderId) => ownerOrderApi.cancelOwnerOrder(orderId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['owner-orders'] }); toast('Order cancelled', { icon: '❌' }); },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to cancel'),
  });
  const acceptMut = useMutation({
    mutationFn: (orderId) => ownerOrderApi.markAcceptedByRestaurant(orderId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['owner-orders'] }); toast.success('Order accepted!'); },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to accept'),
  });

  const isMutating = preparingMut.isPending || readyMut.isPending || cancelMut.isPending || acceptMut.isPending;

  // Real-time Notification State
  const [incomingOrder, setIncomingOrder] = useState(null);
  const audioRef = useRef(new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg'));

  useEffect(() => {
    // Connect to websocket even if approval status isn't fully determined locally
    // If the user has access to this dashboard, we assume they are approved.
    if (!user?.id) return;

    const stompClient = new Client({
      webSocketFactory: () => new SockJS(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'}/ws`),
      connectHeaders: { Authorization: `Bearer ${useAuthStore.getState().token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    stompClient.onConnect = () => {
      stompClient.subscribe(`/topic/owners/${user.id}/orders`, (message) => {
        if (message.body) {
          const event = JSON.parse(message.body);
          if (event.eventType === 'NEW_ORDER') {
            setIncomingOrder(event.payload);
            audioRef.current.play().catch(e => console.log('Audio autoplay blocked by browser', e));
            // Also invalidate query to update dashboard lists in background
            qc.invalidateQueries({ queryKey: ['owner-orders'] });
          }
        }
      });
    };

    stompClient.activate();
    return () => stompClient.deactivate();
  }, [user?.id, approvalStatus, qc]);

  const handleAcceptIncoming = () => {
    if (incomingOrder) {
      acceptMut.mutate(incomingOrder.orderId);
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIncomingOrder(null);
    }
  };

  const handleDeclineIncoming = () => {
    if (incomingOrder) {
      cancelMut.mutate(incomingOrder.orderId);
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIncomingOrder(null);
    }
  };

  // Tab processing
  // Include PENDING_PAYMENT and CREATED so they don't disappear into the void
  const incomingOrders = orders.filter(o => ['CONFIRMED', 'PENDING_PAYMENT', 'CREATED'].includes(o.status));
  const kitchenOrders = orders.filter(o => ['ACCEPTED_BY_RESTAURANT', 'PREPARING', 'READY_FOR_PICKUP'].includes(o.status));
  const historyOrders = orders.filter(o => !['CONFIRMED', 'PENDING_PAYMENT', 'CREATED', 'ACCEPTED_BY_RESTAURANT', 'PREPARING', 'READY_FOR_PICKUP'].includes(o.status));
  const activeOrders = [...incomingOrders, ...kitchenOrders, ...orders.filter(o => o.status === 'OUT_FOR_DELIVERY')];

  // Determine what list to show based on activeTab
  const displayedOrders = activeTab === 'incoming' 
    ? incomingOrders 
    : activeTab === 'kitchen' 
      ? kitchenOrders 
      : historyOrders;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-[#FFFCF5] to-[#FDF9F1] relative overflow-hidden font-sans">
      
      {/* ─── Animated Mesh Gradient Background ─── */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div 
          className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-[#F7B538]/10 rounded-full blur-[120px]"
          animate={{ x: [-30, 30], y: [30, -30] }}
          transition={{ duration: 15, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-[#780116]/5 rounded-full blur-[100px]"
          animate={{ x: [30, -30], y: [-30, 30] }}
          transition={{ duration: 12, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 2 }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <motion.h1
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="text-4xl sm:text-5xl font-black text-[#780116] tracking-tight font-display"
              >
                Welcome, <span className="text-[#F7B538]">{(profile?.fullName || user?.fullName) ? (profile?.fullName || user?.fullName).split(' ')[0] : 'Partner'}</span>
              </motion.h1>
              {approvalStatus && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${approvalStatus === 'APPROVED'
                    ? 'bg-green-50 text-green-600 border-green-200'
                    : approvalStatus === 'REJECTED'
                      ? 'bg-red-50 text-red-600 border-red-200'
                      : 'bg-[#FDF9F1] text-[#F7B538] border-[#EADDCD]'
                  }`}>
                  {approvalStatus === 'APPROVED' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                  {approvalStatus === 'APPROVED' ? 'Verified' : approvalStatus === 'REJECTED' ? 'Rejected' : 'Pending Review'}
                </span>
              )}
            </div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-[#8E7B73] font-bold text-lg">
              Here's what's happening at your restaurant today.
            </motion.p>
          </div>
          <button
            onClick={refetchAll}
            disabled={isRefreshing}
            className="self-start flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#EADDCD] text-[#8E7B73] hover:text-[#780116] hover:bg-[#FDF9F1] shadow-sm hover:shadow-premium transition-all text-sm font-black active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* Stats Grid - Now interactive */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { id: 'incoming', label: 'Active Orders', value: incomingOrders.length, icon: Activity, trend: `${incomingOrders.length} new` },
            { id: 'finance', label: 'Net Revenue', value: financeSummary ? `₹${Number(financeSummary.netRevenueAmount).toLocaleString('en-IN')}` : '₹0', icon: Wallet, trend: financeSummary ? `${financeSummary.successfulPayments} payouts` : '...' },
            { id: 'history', label: 'Total Orders', value: financeSummary ? financeSummary.totalOrders : '0', icon: TrendingUp, trend: 'all time' },
            { id: 'kitchen', label: 'Preparing', value: kitchenOrders.filter(o => o.status === 'PREPARING').length, icon: ChefHat, trend: 'in kitchen' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              onClick={() => setActiveTab(stat.id)}
              className={`bg-white/60 backdrop-blur-2xl border-2 rounded-[2rem] p-6 relative overflow-hidden group cursor-pointer transition-all duration-300 ${activeTab === stat.id ? 'border-[#F7B538] shadow-2xl scale-[1.02]' : 'border-white shadow-xl hover:border-[#F7B538]/50 hover:shadow-2xl'}`}
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#F7B538]/10 rounded-full blur-2xl group-hover:bg-[#F7B538]/20 transition-colors" />
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-[#FDF9F1] rounded-2xl border border-[#EADDCD] shadow-sm">
                  <stat.icon className="text-[#F7B538]" size={20} />
                </div>
                <span className="text-[#8E7B73] text-[10px] font-black uppercase tracking-wider">{stat.trend}</span>
              </div>
              <h3 className="text-[#8E7B73] font-bold text-sm mb-1">{stat.label}</h3>
              <p className="text-3xl font-black text-[#780116] font-display">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Incoming Orders Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white/70 backdrop-blur-3xl border-2 border-white shadow-2xl rounded-[3rem] overflow-hidden"
        >
          <div className="px-8 pt-8 border-b border-[#EADDCD]/50">
            {/* Header info */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#F7B538]/20 rounded-xl flex items-center justify-center">
                  <Flame size={18} className="text-[#F7B538]" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#780116]">Live Order Workflow</h2>
                  <p className="text-[#8E7B73] text-xs font-bold">Manage and progress your active orders</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4">
              {[
                { id: 'incoming', label: 'Incoming', count: incomingOrders.length, alert: incomingOrders.length > 0 },
                { id: 'kitchen', label: 'In Kitchen', count: kitchenOrders.length, alert: false },
                { id: 'history', label: 'History', count: historyOrders.length, alert: false },
                { id: 'finance', label: 'Finance', count: transactions.length, alert: false }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative pb-3 text-sm font-black transition-all flex items-center gap-2
                    ${activeTab === tab.id ? 'text-[#780116]' : 'text-[#8E7B73] hover:text-[#780116]'}`}
                >
                  {tab.label}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-[#FDF9F1] text-[#F7B538] border border-[#EADDCD]' : 'bg-black/5 text-[#8E7B73]'}`}>
                    {tab.count}
                  </span>
                  {tab.alert && (
                    <span className="w-2 h-2 rounded-full bg-[#F7B538] absolute top-0 -right-1 animate-pulse" />
                  )}
                  {activeTab === tab.id && (
                    <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F7B538]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 space-y-3">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-black/5 rounded-[2rem] animate-pulse" />
              ))
            ) : activeTab === 'finance' ? (
              <div className="space-y-4">
                {transactions.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-20 h-20 mx-auto bg-[#FDF9F1] border border-[#EADDCD] shadow-sm rounded-full flex items-center justify-center mb-5">
                      <ReceiptText size={32} className="text-[#8E7B73]" />
                    </div>
                    <h3 className="text-xl font-black text-[#780116] mb-2 font-display">No Transactions Yet</h3>
                    <p className="text-[#8E7B73] text-sm font-bold">Completed payments will appear here.</p>
                  </div>
                ) : (
                  transactions.map(txn => (
                    <motion.div key={txn.orderId} initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="bg-[#FFFCF5] border border-[#EADDCD] shadow-sm rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[#780116] font-black text-base">Order #{txn.orderId}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${txn.paymentStatus === 'CAPTURED' ? 'bg-green-50 border-green-200 text-green-600' : 'bg-black/5 border-[#EADDCD] text-[#8E7B73]'}`}>
                            {txn.paymentStatus}
                          </span>
                        </div>
                        <p className="text-[#8E7B73] text-xs font-bold">Ref: <span className="font-mono text-[#780116]">{txn.providerPaymentId || 'N/A'}</span></p>
                      </div>
                      <div className="flex flex-col md:items-end">
                        <span className="text-xl font-black text-[#2A0800]">₹{Number(txn.netAmount).toLocaleString('en-IN')}</span>
                        {Number(txn.refundedAmount) > 0 && <span className="text-red-600 text-xs font-bold">Refunded: ₹{txn.refundedAmount}</span>}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            ) : displayedOrders.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-20 h-20 mx-auto bg-[#FDF9F1] border border-[#EADDCD] shadow-sm rounded-full flex items-center justify-center mb-5">
                  {activeTab === 'history' ? <History size={32} className="text-[#8E7B73]" /> : <Package size={32} className="text-[#8E7B73]" />}
                </div>
                <h3 className="text-xl font-black text-[#780116] mb-2 font-display">
                  {activeTab === 'incoming' ? 'No incoming orders' : activeTab === 'kitchen' ? 'Kitchen is clear' : 'No order history'}
                </h3>
                <p className="text-[#8E7B73] text-sm font-bold max-w-xs mx-auto">
                  {activeTab === 'incoming' ? 'Waiting for customers...' : activeTab === 'kitchen' ? 'Accept orders to start preparing.' : 'Completed orders will appear here.'}
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {displayedOrders.map((order) => (
                  <OrderRow
                    key={order.orderId}
                    order={order}
                    onAccept={(id) => acceptMut.mutate(id)}
                    onPreparing={(id) => preparingMut.mutate(id)}
                    onReady={(id) => readyMut.mutate(id)}
                    onCancel={(id) => cancelMut.mutate(id)}
                    loading={isMutating}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </motion.div>

      </div>

      {/* NEW ORDER POPUP OVERLAY */}
      <AnimatePresence>
        {incomingOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#2A0800]/40 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#FFFCF5] border-4 border-[#F7B538] shadow-premium rounded-[2.5rem] p-8 max-w-sm w-full relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-[#F7B538] animate-pulse"></div>

              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-[#F7B538]/20 rounded-full flex items-center justify-center border-4 border-white shadow-sm relative">
                  <div className="absolute inset-0 rounded-full border-2 border-[#F7B538] animate-ping opacity-20"></div>
                  <BellRing size={32} className="text-[#F7B538] animate-bounce" />
                </div>
              </div>

              <h2 className="text-2xl font-black text-[#780116] text-center mb-2 font-display">New Order Alert!</h2>
              <p className="text-center text-[#8E7B73] font-bold mb-6">Order #{incomingOrder.orderId}</p>

              <div className="bg-white border border-[#EADDCD] shadow-sm rounded-2xl p-5 mb-6">
                <div className="flex justify-between items-center mb-3 text-sm font-bold">
                  <span className="text-[#8E7B73]">Items</span>
                  <span className="text-[#2A0800] font-black">{incomingOrder.totalItems}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-[#EADDCD] border-dashed pt-3 font-bold">
                  <span className="text-[#8E7B73]">Revenue</span>
                  <span className="text-[#2A0800] font-black text-xl">₹{Number(incomingOrder.grandTotal).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleAcceptIncoming}
                  disabled={acceptMut.isPending}
                  className="w-full py-4 rounded-2xl bg-[#780116] border-2 border-[#A00320] text-white font-black text-lg shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={24} />
                  Accept & PREPARE
                </button>

                <button
                  onClick={handleDeclineIncoming}
                  disabled={cancelMut.isPending}
                  className="w-full py-3.5 rounded-2xl bg-white border border-[#EADDCD] text-[#2A0800] font-black hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all shadow-sm disabled:opacity-50"
                >
                  Decline (Cancel Order)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
