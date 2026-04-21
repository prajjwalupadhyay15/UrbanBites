import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/adminApi';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Users, Store, ShoppingBag, TrendingUp, AlertTriangle, Ticket,
  ToggleLeft, ToggleRight, CheckCircle2, XCircle, RefreshCw,
  ChevronRight, Shield, Clock, DollarSign, Bike, Tag,
  MessageSquare, Settings, Activity, FileText, MapPin
} from 'lucide-react';

import FinanceTab from './tabs/FinanceTab';
import OperationsTab from './tabs/OperationsTab';
import ModerationTab from './tabs/ModerationTab';
import ZonesTab from './tabs/ZonesTab';

/* ─── Stat Card ─────────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, color, delay = 0 }) {
  const iconColor = color.includes('F7B538') || color.includes('orange') ? '#F7B538'
    : color.includes('blue') ? '#3b82f6'
    : color.includes('green') ? '#16a34a'
    : color.includes('red') ? '#dc2626'
    : '#9333ea';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="bg-white border border-[#EADDCD] rounded-[2.5rem] p-6 relative overflow-hidden group hover:border-[#F7B538] hover:shadow-premium shadow-sm transition-all"
    >
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none ${color}`} />
      <div className="flex justify-between items-start mb-5">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center border border-current/20"
          style={{ color: iconColor, backgroundColor: `${iconColor}10` }}
        >
          <Icon size={20} />
        </div>
      </div>
      <p className="text-[#8E7B73] text-xs font-black uppercase tracking-widest mb-1.5">{label}</p>
      <p className="text-3xl font-black text-[#780116] font-display">
        {value === undefined || value === null ? (
          <span className="bg-[#EADDCD]/30 rounded-lg w-20 h-7 block animate-pulse" />
        ) : value}
      </p>
    </motion.div>
  );
}

/* ─── Users Table ───────────────────────────────────────────── */
function UsersTab() {
  const qc = useQueryClient();
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminApi.getUsers,
    staleTime: 1000 * 30,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ userId, enabled }) => adminApi.setUserEnabled(userId, enabled),
    onSuccess: () => qc.invalidateQueries(['admin-users']),
  });

  const ROLE_LABEL = {
    CUSTOMER: { label: 'Customer', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    RESTAURANT_OWNER: { label: 'Owner', color: 'bg-[#FDF9F1] text-[#F7B538] border-[#F7B538]/30' },
    DELIVERY_AGENT: { label: 'Agent', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    ADMIN: { label: 'Admin', color: 'bg-red-50 text-red-700 border-red-200' },
  };

  if (isLoading) return <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-[#EADDCD]/30 rounded-2xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_120px_100px_80px] gap-4 px-4 pb-2 border-b border-[#EADDCD]">
        {['User', 'Role', 'Joined', 'Status'].map(h => (
          <span key={h} className="text-[10px] font-black uppercase tracking-widest text-[#8E7B73]">{h}</span>
        ))}
      </div>
      {users.map((u, i) => {
        const role = ROLE_LABEL[u.role] || { label: u.role, color: 'bg-[#FDF9F1] text-[#8E7B73] border-[#EADDCD]' };
        return (
          <motion.div
            key={u.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
            className="grid grid-cols-[1fr_120px_100px_80px] gap-4 items-center px-4 py-3.5 bg-white hover:bg-[#FDF9F1] border border-[#EADDCD] rounded-2xl transition-colors shadow-sm"
          >
            <div className="min-w-0">
              <p className="text-[#780116] font-bold text-sm truncate">{u.fullName || '—'}</p>
              <p className="text-[#8E7B73] text-xs truncate">{u.email || u.phone || '—'}</p>
            </div>
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border self-center w-fit ${role.color}`}>
              {role.label}
            </span>
            <span className="text-[#8E7B73] text-xs font-medium self-center">
              {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
            </span>
            <button
              onClick={() => toggleMutation.mutate({ userId: u.id, enabled: !u.enabled })}
              className={`self-center flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                u.enabled
                  ? 'bg-green-50 border-green-200 text-green-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                  : 'bg-red-50 border-red-200 text-red-600 hover:bg-green-50 hover:border-green-200 hover:text-green-700'
              }`}
            >
              {u.enabled ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
              {u.enabled ? 'Active' : 'Banned'}
            </button>
          </motion.div>
        );
      })}
      {users.length === 0 && <p className="text-center text-[#8E7B73] font-medium py-10">No users found.</p>}
    </div>
  );
}

/* ─── Restaurants Tab ───────────────────────────────────────── */
function RestaurantsTab() {
  const qc = useQueryClient();
  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ['admin-restaurants'],
    queryFn: adminApi.getRestaurants,
    staleTime: 1000 * 30,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => adminApi.setRestaurantActive(id, active),
    onSuccess: () => qc.invalidateQueries(['admin-restaurants']),
  });

  if (isLoading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[#EADDCD]/30 rounded-2xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_160px_100px] gap-4 px-4 pb-2 border-b border-[#EADDCD]">
        {['Restaurant', 'Owner', 'Status'].map(h => (
          <span key={h} className="text-[10px] font-black uppercase tracking-widest text-[#8E7B73]">{h}</span>
        ))}
      </div>
      {restaurants.map((r, i) => (
        <motion.div
          key={r.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.02 }}
          className="grid grid-cols-[1fr_160px_100px] gap-4 items-center px-4 py-3.5 bg-white hover:bg-[#FDF9F1] border border-[#EADDCD] rounded-2xl transition-colors shadow-sm"
        >
          <div className="min-w-0">
            <p className="text-[#780116] font-bold text-sm truncate">{r.name}</p>
            <p className="text-[#8E7B73] text-xs truncate">{r.city || '—'}</p>
          </div>
          <p className="text-[#8E7B73] text-xs font-medium truncate">{r.ownerName || '—'}</p>
          <button
            onClick={() => toggleMutation.mutate({ id: r.id, active: !r.active })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              r.active
                ? 'bg-green-50 border-green-200 text-green-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                : 'bg-red-50 border-red-200 text-red-600 hover:bg-green-50 hover:border-green-200 hover:text-green-700'
            }`}
          >
            {r.active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {r.active ? 'Active' : 'Inactive'}
          </button>
        </motion.div>
      ))}
      {restaurants.length === 0 && <p className="text-center text-[#8E7B73] font-medium py-10">No restaurants found.</p>}
    </div>
  );
}

/* ─── Disputes Tab ──────────────────────────────────────────── */
function DisputesTab() {
  const qc = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ orderId: '', type: 'ORDER', title: '', description: '' });

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: () => adminApi.getDisputes(),
    staleTime: 1000 * 30,
  });

  const createMut = useMutation({
    mutationFn: (data) => adminApi.createDispute(data),
    onSuccess: () => {
      toast.success('Dispute created');
      qc.invalidateQueries(['admin-disputes']);
      setIsModalOpen(false);
      setForm({ orderId: '', type: 'ORDER', title: '', description: '' });
    },
    onError: () => toast.error('Failed to create dispute'),
  });

  const STATUS_COLOR = {
    OPEN: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    RESOLVED: 'bg-green-50 text-green-700 border-green-200',
    CLOSED: 'bg-[#FDF9F1] text-[#8E7B73] border-[#EADDCD]',
  };

  if (isLoading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-[#EADDCD]/30 rounded-2xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-[#780116] to-[#A00320] text-white text-sm font-black rounded-xl shadow-premium hover:-translate-y-0.5 transition-all flex items-center gap-2"
        >
          <AlertTriangle size={14} /> New Dispute
        </button>
      </div>
      <div className="space-y-3">
      {disputes.map((d, i) => (
        <motion.div
          key={d.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03 }}
          className="flex items-center gap-4 px-5 py-4 bg-white hover:bg-[#FDF9F1] border border-[#EADDCD] rounded-2xl transition-colors shadow-sm"
        >
          <div className="w-10 h-10 rounded-2xl bg-yellow-50 border border-yellow-200 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} className="text-yellow-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#780116] font-bold text-sm">Dispute #{d.id}</p>
            <p className="text-[#8E7B73] text-xs truncate">{d.reason || d.description || 'No reason provided'}</p>
          </div>
          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border shrink-0 ${STATUS_COLOR[d.status] || STATUS_COLOR.CLOSED}`}>
            {d.status || 'UNKNOWN'}
          </span>
        </motion.div>
      ))}
      {disputes.length === 0 && (
        <div className="py-16 text-center bg-white border border-dashed border-[#EADDCD] rounded-[2.5rem] shadow-sm">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-[#780116] font-black">No open disputes</p>
          <p className="text-[#8E7B73] text-sm font-medium mt-1">Platform is running smoothly.</p>
        </div>
      )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#780116]/20 backdrop-blur-sm"
          >
             <motion.div
               initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
               className="w-full max-w-md bg-white border border-[#EADDCD] rounded-3xl p-6 shadow-premium"
             >
               <div className="flex items-center justify-between mb-5">
                 <div>
                   <h3 className="text-[#780116] font-black text-lg">Create Dispute</h3>
                   <p className="text-[#8E7B73] text-xs font-bold">Manually log an administrative dispute.</p>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="text-[#8E7B73] hover:text-[#780116] transition-colors"><XCircle size={20}/></button>
               </div>

               <div className="space-y-4">
                 <div>
                   <label className="block text-[10px] font-black uppercase text-[#8E7B73] mb-1.5 ml-1">Order ID</label>
                   <input type="number" value={form.orderId} onChange={e => setForm(p => ({...p, orderId: e.target.value}))} className="w-full bg-[#FFFCF5] border border-[#EADDCD] text-[#780116] text-sm rounded-2xl p-3 font-bold outline-none focus:border-[#F7B538]" />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black uppercase text-[#8E7B73] mb-1.5 ml-1">Type</label>
                   <select value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))} className="w-full bg-[#FFFCF5] border border-[#EADDCD] text-[#780116] text-sm rounded-2xl p-3 font-bold outline-none focus:border-[#F7B538]">
                     <option value="ORDER">ORDER</option>
                     <option value="PAYMENT">PAYMENT</option>
                     <option value="DELIVERY">DELIVERY</option>
                     <option value="REVIEW">REVIEW</option>
                     <option value="OTHER">OTHER</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-[10px] font-black uppercase text-[#8E7B73] mb-1.5 ml-1">Title</label>
                   <input type="text" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} maxLength={160} className="w-full bg-[#FFFCF5] border border-[#EADDCD] text-[#780116] text-sm rounded-2xl p-3 font-bold outline-none focus:border-[#F7B538]" />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black uppercase text-[#8E7B73] mb-1.5 ml-1">Description</label>
                   <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={3} maxLength={1200} className="w-full bg-[#FFFCF5] border border-[#EADDCD] text-[#780116] text-sm rounded-2xl p-3 font-bold outline-none focus:border-[#F7B538] resize-none" />
                 </div>
               </div>

               <button 
                 onClick={() => createMut.mutate({ orderId: Number(form.orderId), type: form.type, title: form.title, description: form.description })}
                 disabled={createMut.isLoading || !form.orderId || !form.title || !form.description}
                 className="w-full mt-6 py-3 bg-gradient-to-r from-[#780116] to-[#A00320] text-white font-black text-sm rounded-2xl shadow-premium disabled:opacity-50 hover:-translate-y-0.5 transition-all"
               >
                 Submit Dispute
               </button>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Coupons Tab ───────────────────────────────────────────── */
function CouponsTab() {
  const qc = useQueryClient();
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: adminApi.getCouponCampaigns,
    staleTime: 1000 * 30,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => adminApi.setCouponActive(id, active),
    onSuccess: () => qc.invalidateQueries(['admin-coupons']),
  });

  if (isLoading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-[#EADDCD]/30 rounded-2xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-3">
      {coupons.map((c, i) => (
        <motion.div
          key={c.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03 }}
          className="flex items-center gap-4 px-5 py-4 bg-white hover:bg-[#FDF9F1] border border-[#EADDCD] rounded-2xl transition-colors shadow-sm"
        >
          <div className="w-10 h-10 rounded-2xl bg-[#FDF9F1] border border-[#F7B538]/30 flex items-center justify-center shrink-0">
            <Tag size={16} className="text-[#F7B538]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#780116] font-black text-sm font-mono tracking-wider">{c.code || c.couponCode}</p>
            <p className="text-[#8E7B73] text-xs">
              {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% off` : `₹${c.discountValue} off`}
              {c.maxUsage ? ` · Max ${c.maxUsage} uses` : ''}
              {c.expiresAt ? ` · Expires ${new Date(c.expiresAt).toLocaleDateString('en-IN')}` : ''}
            </p>
          </div>
          <button
            onClick={() => toggleMutation.mutate({ id: c.id, active: !c.active })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              c.active
                ? 'bg-green-50 border-green-200 text-green-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                : 'bg-white border-[#EADDCD] text-[#8E7B73] hover:bg-[#FDF9F1] hover:border-[#F7B538]/30 hover:text-[#F7B538] shadow-sm'
            }`}
          >
            {c.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
            {c.active ? 'Active' : 'Inactive'}
          </button>
        </motion.div>
      ))}
      {coupons.length === 0 && (
        <div className="py-12 text-center text-[#8E7B73] font-medium">No coupon campaigns yet.</div>
      )}
    </div>
  );
}

/* ─── Approvals Tab ─────────────────────────────────────────── */
function ApprovalsTab() {
  const qc = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: pendingPartners = [], isLoading: partnersLoading } = useQuery({
    queryKey: ['admin-approvals', 'partners'],
    queryFn: adminApi.getPendingPartnerApprovals,
    staleTime: 1000 * 30,
  });

  const { data: pendingRestaurants = [], isLoading: restaurantsLoading } = useQuery({
    queryKey: ['admin-approvals', 'restaurants'],
    queryFn: adminApi.getPendingRestaurantApprovals,
    staleTime: 1000 * 30,
  });

  const { data: pendingAgents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['admin-approvals', 'delivery-agents'],
    queryFn: adminApi.getPendingDeliveryAgentApprovals,
    staleTime: 1000 * 30,
  });

  const approvePartnerMut = useMutation({
    mutationFn: ({ userId, approved, rejectionReason: reason }) =>
      adminApi.approvePartner({ userId, approved, rejectionReason: reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-approvals'] }),
  });

  const approveRestaurantMut = useMutation({
    mutationFn: ({ restaurantId, approved, rejectionReason: reason }) =>
      adminApi.approveRestaurant({ restaurantId, approved, rejectionReason: reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-approvals'] }),
  });

  const approveAgentMut = useMutation({
    mutationFn: ({ userId, approved, rejectionReason: reason }) =>
      adminApi.approveDeliveryAgent({ userId, approved, rejectionReason: reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-approvals'] }),
  });

  const isMutating = approvePartnerMut.isPending || approveRestaurantMut.isPending || approveAgentMut.isPending;

  const ROLE_LABEL = {
    RESTAURANT_OWNER: { label: 'Owner', color: 'bg-[#FDF9F1] text-[#F7B538] border-[#F7B538]/30' },
    DELIVERY_AGENT: { label: 'Agent', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  };

  const formatDate = (value) => (
    value
      ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
      : '—'
  );

  const openReject = (payload) => {
    setRejectTarget(payload);
    setRejectionReason('');
  };

  const closeReject = () => {
    setRejectTarget(null);
    setRejectionReason('');
  };

  const confirmReject = () => {
    if (!rejectTarget || !rejectionReason.trim()) return;
    const reason = rejectionReason.trim();
    if (rejectTarget.type === 'partner') {
      approvePartnerMut.mutate({ userId: rejectTarget.id, approved: false, rejectionReason: reason });
    } else if (rejectTarget.type === 'restaurant') {
      approveRestaurantMut.mutate({ restaurantId: rejectTarget.id, approved: false, rejectionReason: reason });
    } else if (rejectTarget.type === 'agent') {
      approveAgentMut.mutate({ userId: rejectTarget.id, approved: false, rejectionReason: reason });
    }
    closeReject();
  };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Owners */}
        <div className="bg-white border border-[#EADDCD] shadow-sm rounded-3xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FDF9F1] border border-[#F7B538]/30 flex items-center justify-center">
                <Store size={16} className="text-[#F7B538]" />
              </div>
              <div>
                <p className="text-[#780116] font-black text-sm">Restaurant Owners</p>
                <p className="text-[#8E7B73] text-xs font-bold">Pending onboarding</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#FDF9F1] border border-[#F7B538]/30 text-[#F7B538] text-xs font-black">
              {pendingPartners.length}
            </span>
          </div>

          {partnersLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-[#EADDCD]/30 rounded-2xl animate-pulse" />)}</div>
          ) : pendingPartners.length === 0 ? (
            <div className="py-10 text-center text-[#8E7B73] text-sm font-bold">No pending owner approvals.</div>
          ) : (
            <div className="space-y-3">
              {pendingPartners.map((u, i) => {
                const role = ROLE_LABEL[u.role] || { label: u.role || 'Partner', color: 'bg-[#FDF9F1] text-[#8E7B73] border-[#EADDCD]' };
                const uId = u.id || u.userId;
                return (
                  <motion.div
                    key={uId || i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-[#FFFCF5] border border-[#EADDCD] rounded-2xl p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[#780116] font-bold text-sm truncate">{u.fullName || u.email || 'Owner'}</p>
                        <p className="text-[#8E7B73] text-xs truncate">{u.email || '—'}</p>
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${role.color}`}>
                        {role.label}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-[#8E7B73] text-xs font-medium">Joined {formatDate(u.createdAt)}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => approvePartnerMut.mutate({ userId: uId, approved: true })}
                          disabled={isMutating}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-all disabled:opacity-50 shadow-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => openReject({ type: 'partner', id: uId, label: u.fullName || u.email })}
                          disabled={isMutating}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-all disabled:opacity-50 shadow-sm"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Restaurants */}
        <div className="bg-white border border-[#EADDCD] shadow-sm rounded-3xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FDF9F1] border border-[#F7B538]/30 flex items-center justify-center">
                <Shield size={16} className="text-[#F7B538]" />
              </div>
              <div>
                <p className="text-[#780116] font-black text-sm">Restaurants</p>
                <p className="text-[#8E7B73] text-xs font-bold">Pending discovery</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#FDF9F1] border border-[#F7B538]/30 text-[#F7B538] text-xs font-black">
              {pendingRestaurants.length}
            </span>
          </div>

          {restaurantsLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-[#EADDCD]/30 rounded-2xl animate-pulse" />)}</div>
          ) : pendingRestaurants.length === 0 ? (
            <div className="py-10 text-center text-[#8E7B73] text-sm font-bold">No pending restaurant approvals.</div>
          ) : (
            <div className="space-y-3">
              {pendingRestaurants.map((r, i) => {
                const rId = r.id || r.restaurantId;
                return (
                <motion.div
                  key={rId || i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-[#FFFCF5] border border-[#EADDCD] shadow-sm rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[#780116] font-bold text-sm truncate">{r.name || 'Restaurant'}</p>
                      <p className="text-[#8E7B73] text-xs truncate">{r.city || '—'} · {r.ownerName || r.owner?.fullName || r.owner?.email || 'Owner'}</p>
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full border bg-[#FDF9F1] text-[#8E7B73] border-[#EADDCD]">
                      Pending
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[#8E7B73] text-xs font-medium">Created {formatDate(r.createdAt)}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveRestaurantMut.mutate({ restaurantId: rId, approved: true })}
                        disabled={isMutating}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-all disabled:opacity-50 shadow-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => openReject({ type: 'restaurant', id: rId, label: r.name })}
                        disabled={isMutating}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-all disabled:opacity-50 shadow-sm"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </motion.div>
              )})}
            </div>
          )}
        </div>

        {/* Delivery Agents */}
        <div className="bg-white border border-[#EADDCD] shadow-sm rounded-3xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center">
                <Bike size={16} className="text-purple-700" />
              </div>
              <div>
                <p className="text-[#780116] font-black text-sm">Delivery Agents</p>
                <p className="text-[#8E7B73] text-xs font-bold">Pending verification</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-black">
              {pendingAgents.length}
            </span>
          </div>

          {agentsLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-[#EADDCD]/30 rounded-2xl animate-pulse" />)}</div>
          ) : pendingAgents.length === 0 ? (
            <div className="py-10 text-center text-[#8E7B73] text-sm font-bold">No pending agent approvals.</div>
          ) : (
            <div className="space-y-3">
              {pendingAgents.map((u, i) => {
                const uId = u.id || u.userId;
                return (
                <motion.div
                  key={uId || i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-[#FFFCF5] border border-[#EADDCD] shadow-sm rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[#780116] font-bold text-sm truncate">{u.fullName || u.email || 'Agent'}</p>
                      <p className="text-[#8E7B73] text-xs truncate">{u.email || '—'}</p>
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full border bg-purple-50 text-purple-700 border-purple-200">
                      Agent
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[#8E7B73] text-xs font-medium">Joined {formatDate(u.createdAt)}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveAgentMut.mutate({ userId: uId, approved: true })}
                        disabled={isMutating}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-all disabled:opacity-50 shadow-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => openReject({ type: 'agent', id: uId, label: u.fullName || u.email })}
                        disabled={isMutating}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-all disabled:opacity-50 shadow-sm"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </motion.div>
              )})}
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#780116]/20 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              className="w-[90%] max-w-md bg-white border border-[#EADDCD] rounded-3xl p-6 shadow-premium"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[#780116] font-black text-lg">Reject Approval</p>
                  <p className="text-[#8E7B73] text-xs font-bold">Please include a clear reason.</p>
                </div>
                <button onClick={closeReject} className="text-[#8E7B73] hover:text-[#780116] transition-colors"><XCircle size={20} /></button>
              </div>

              <div className="mb-4">
                <p className="text-[#8E7B73] text-xs font-black uppercase mb-2">Target</p>
                <div className="bg-[#FFFCF5] border border-[#EADDCD] rounded-2xl p-3 text-[#780116] text-sm font-bold">
                  {rejectTarget.label || 'Approval item'}
                </div>
              </div>

              <div className="mb-5">
                <label className="text-[#8E7B73] text-xs font-black uppercase block mb-2">Rejection Reason *</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  placeholder="Explain what needs to be fixed before approval..."
                  className="w-full bg-[#FFFCF5] border border-[#EADDCD] text-[#780116] text-sm rounded-2xl p-3 outline-none focus:border-[#F7B538] focus:ring-2 focus:ring-[#F7B538]/20 transition-all resize-none shadow-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closeReject}
                  className="flex-1 py-3 rounded-2xl bg-white border border-[#EADDCD] text-[#8E7B73] font-black text-sm hover:text-[#780116] hover:bg-[#FDF9F1] transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReject}
                  disabled={!rejectionReason.trim() || isMutating}
                  className="flex-1 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 font-black text-sm hover:bg-red-100 transition-all disabled:opacity-50 shadow-sm"
                >
                  Submit Rejection
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main AdminDashboard ───────────────────────────────────── */
const TABS = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'restaurants', label: 'Restaurants', icon: Store },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'operations', label: 'Operations', icon: Activity },
  { id: 'approvals', label: 'Approvals', icon: Shield },
  { id: 'moderation', label: 'Moderation', icon: MessageSquare },
  { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
  { id: 'coupons', label: 'Coupons', icon: Ticket },
  { id: 'zones', label: 'Zones', icon: MapPin },
];

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const getValidTab = (value) => (TABS.some((t) => t.id === value) ? value : 'overview');
  const [activeTab, setActiveTab] = useState(() => getValidTab(searchParams.get('tab')));

  useEffect(() => {
    const nextTab = getValidTab(searchParams.get('tab'));
    setActiveTab(nextTab);
  }, [searchParams]);

  const { data: dash, isLoading: dashLoading, refetch: refetchDash } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.getDashboard,
    staleTime: 1000 * 60,
  });

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchDash(),
        qc.invalidateQueries({ queryKey: ['admin-users'] }),
        qc.invalidateQueries({ queryKey: ['admin-restaurants'] }),
        qc.invalidateQueries({ queryKey: ['admin-orders-preview'] }),
        qc.invalidateQueries({ queryKey: ['admin-disputes'] }),
        qc.invalidateQueries({ queryKey: ['admin-coupons'] }),
        qc.invalidateQueries({ queryKey: ['admin-approvals'] }),
        qc.invalidateQueries({ queryKey: ['admin-finance'] }),
        qc.invalidateQueries({ queryKey: ['admin-operations'] }),
        qc.invalidateQueries({ queryKey: ['admin-moderation'] }),
      ]);
      toast.success('Dashboard refreshed!');
    } catch {
      toast.error('Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#F7B538] mb-1">UrbanBites HQ</p>
          <h1 className="text-4xl font-black text-[#780116] tracking-tight font-display">
            Platform <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F7B538] to-[#780116]">Admin.</span>
          </h1>
        </div>
        <button
          onClick={handleRefreshAll}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-[#EADDCD] shadow-sm text-[#8E7B73] hover:text-[#780116] hover:bg-[#FDF9F1] transition-all text-sm font-black disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Overview Stats */}
      {(activeTab === 'overview' || true) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Users" value={dash?.totalUsers ?? (dashLoading ? undefined : '—')} icon={Users} color="bg-blue-400/80" delay={0} />
          <StatCard label="Restaurants" value={dash?.totalRestaurants ?? (dashLoading ? undefined : '—')} icon={Store} color="bg-[#F7B538]/80" delay={0.05} />
          <StatCard label="Total Orders" value={dash?.totalOrders ?? (dashLoading ? undefined : '—')} icon={ShoppingBag} color="bg-green-400/80" delay={0.1} />
          <StatCard label="Platform Revenue" value={dash?.capturedRevenue != null ? `₹${Number(dash.capturedRevenue).toLocaleString('en-IN')}` : (dashLoading ? undefined : '₹0')} icon={DollarSign} color="bg-purple-400/80" delay={0.15} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-0.5 p-1 bg-[#FFFCF5] border border-[#EADDCD] shadow-sm rounded-2xl mb-6 scrollbar-hide">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setActiveTab(id);
              setSearchParams(id === 'overview' ? {} : { tab: id }, { replace: true });
            }}
            className={`flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-[11px] font-black whitespace-nowrap transition-all flex-1 min-w-0
              ${activeTab === id
                ? 'bg-[#F7B538] text-white shadow-[0_2px_12px_rgba(247,181,56,0.4)]'
                : 'text-[#8E7B73] hover:text-[#780116] hover:bg-[#FDF9F1]'
              }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === 'overview' && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Recent activity placeholder – can wire orders API */}
              <div className="bg-white border border-[#EADDCD] shadow-sm rounded-[2.5rem] p-6">
                <h3 className="text-[#780116] font-black text-lg mb-4 flex items-center gap-2 font-display">
                  <ShoppingBag size={18} className="text-[#F7B538]" /> Recent Orders
                </h3>
                <OrdersPreview />
              </div>
              <div className="bg-white border border-[#EADDCD] shadow-sm rounded-[2.5rem] p-6">
                <h3 className="text-[#780116] font-black text-lg mb-4 flex items-center gap-2 font-display">
                  <AlertTriangle size={18} className="text-yellow-600" /> Open Disputes
                </h3>
                <DisputesPreview />
              </div>
            </div>
          )}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'restaurants' && <RestaurantsTab />}
          {activeTab === 'finance' && <FinanceTab />}
          {activeTab === 'operations' && <OperationsTab />}
          {activeTab === 'approvals' && <ApprovalsTab />}
          {activeTab === 'moderation' && <ModerationTab />}
          {activeTab === 'disputes' && <DisputesTab />}
          {activeTab === 'coupons' && <CouponsTab />}
          {activeTab === 'zones' && <ZonesTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─── Mini Previews for Overview ────────────────────────────── */
function OrdersPreview() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders-preview'],
    queryFn: adminApi.getOrders,
    staleTime: 1000 * 60,
  });
  const STATUS_COLOR = {
    PLACED: 'text-yellow-600', ACCEPTED: 'text-blue-600',
    PREPARING: 'text-purple-600', OUT_FOR_DELIVERY: 'text-[#F7B538]',
    DELIVERED: 'text-green-600', CANCELLED: 'text-red-600',
  };
  if (isLoading) return <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-[#EADDCD]/30 rounded-xl animate-pulse" />)}</div>;
  if (!orders.length) return <p className="text-[#8E7B73] font-bold text-sm">No orders yet.</p>;
  return (
    <div className="space-y-2">
      {orders.slice(0, 5).map((o, index) => (
        <div key={`${o.orderId ?? o.id ?? 'order'}-${index}`} className="flex items-center justify-between px-4 py-3 bg-[#FFFCF5] border border-[#EADDCD] shadow-sm rounded-xl hover:border-[#F7B538] transition-colors">
          <span className="text-[#780116] font-black text-sm">#{o.orderId || o.id}</span>
          <span className={`text-xs font-black ${STATUS_COLOR[o.status] || 'text-[#8E7B73]'}`}>{o.status}</span>
          <span className="text-[#2A0800] text-xs font-black">₹{o.grandTotal ?? o.totalAmount ?? '—'}</span>
        </div>
      ))}
    </div>
  );
}

function DisputesPreview() {
  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: () => adminApi.getDisputes('OPEN'),
    staleTime: 1000 * 60,
  });
  if (isLoading) return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-[#EADDCD]/30 rounded-xl animate-pulse" />)}</div>;
  if (!disputes.length) return (
    <div className="flex flex-col items-center py-8 gap-2">
      <CheckCircle2 size={32} className="text-green-300" />
      <p className="text-[#8E7B73] font-bold text-sm">No open disputes 🎉</p>
    </div>
  );
  return (
    <div className="space-y-2">
      {disputes.slice(0, 5).map((d) => (
        <div key={d.id} className="flex items-center gap-3 px-4 py-3 bg-[#FFFCF5] border border-[#EADDCD] shadow-sm rounded-xl hover:border-[#F7B538] transition-colors">
          <AlertTriangle size={14} className="text-yellow-600 shrink-0" />
          <span className="text-[#780116] font-black text-sm flex-1 truncate">Dispute #{d.id}</span>
          <span className="text-yellow-600 text-xs font-black">{d.status}</span>
        </div>
      ))}
    </div>
  );
}
