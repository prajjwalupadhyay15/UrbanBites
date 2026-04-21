import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../../api/adminApi';
import { adminOrderApi } from '../../../api/orderApi';
import { notificationApi } from '../../../api/notificationApi';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, RefreshCcw, Package, AlertTriangle, RotateCcw, DollarSign, X, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OperationsTab() {
  const qc = useQueryClient();
  const [dlqJobId, setDlqJobId] = useState('');
  const [refundTarget, setRefundTarget] = useState(null); // { orderId, grandTotal }
  const [refundForm, setRefundForm] = useState({ amount: '', reason: '' });
  const [refundFile, setRefundFile] = useState(null);
  const fileRef = useRef(null);

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: adminApi.getOrders,
  });

  const refundMut = useMutation({
    mutationFn: ({ orderId, amount, reason, evidenceImage }) =>
      adminOrderApi.refundOrder(orderId, { amount, reason, evidenceImage }),
    onSuccess: () => {
      toast.success('Refund processed successfully');
      qc.invalidateQueries(['admin-orders']);
      qc.invalidateQueries(['admin-refunds']);
      setRefundTarget(null);
      setRefundForm({ amount: '', reason: '' });
      setRefundFile(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Refund failed'),
  });

  const retryDlqMut = useMutation({
    mutationFn: (jobId) => notificationApi.retryDlqJob(jobId),
    onSuccess: () => {
      toast.success('DLQ Job retry queued');
      setDlqJobId('');
    },
    onError: () => toast.error('Failed to retry DLQ job'),
  });

  const { data: refunds = [], isLoading: refundsLoading } = useQuery({
    queryKey: ['admin-refunds'],
    queryFn: adminApi.getRefunds,
  });

  const { data: unassigned = [], isLoading: unassignedLoading } = useQuery({
    queryKey: ['admin-unassigned-dispatch'],
    queryFn: adminApi.getUnassignedDispatch,
  });

  const STATUS_COLOR = {
    PLACED: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    ACCEPTED: 'text-blue-700 bg-blue-50 border-blue-200',
    PREPARING: 'text-purple-700 bg-purple-50 border-purple-200',
    READY_FOR_PICKUP: 'text-[#F7B538] bg-[#FDF9F1] border-[#F7B538]/30',
    OUT_FOR_DELIVERY: 'text-[#F7B538] bg-[#FDF9F1] border-[#F7B538]/30',
    DELIVERED: 'text-green-700 bg-green-50 border-green-200',
    CANCELLED: 'text-red-700 bg-red-50 border-red-200',
  };

  return (
    <div className="space-y-6">
      {/* Critical Alert: Unassigned Dispatch */}
      {unassigned.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-[2.5rem] p-6 shadow-sm">
          <h3 className="text-red-600 font-black text-lg mb-4 flex items-center gap-2 font-display">
            <AlertTriangle size={18} /> Critical: Unassigned Dispatches ({unassigned.length})
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {unassigned.map(d => (
              <div key={d.id} className="bg-white border border-red-200 rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[#780116] font-bold text-sm">Order #{d.orderId}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-300">
                    {d.status}
                  </span>
                </div>
                <p className="text-[#8E7B73] text-xs">Attempts: {d.attemptNumber}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DLQ Retry Section */}
      <div className="bg-white border border-[#EADDCD] rounded-[2.5rem] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-[#780116] font-black text-lg flex items-center gap-2 font-display">
            <RotateCcw size={18} className="text-[#F7B538]" /> Retry DLQ Job
          </h3>
          <p className="text-[#8E7B73] text-xs font-bold mt-1">Manually re-queue failed notification background jobs.</p>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="number" 
            placeholder="Job ID" 
            value={dlqJobId}
            onChange={(e) => setDlqJobId(e.target.value)}
            className="w-32 bg-[#FFFCF5] border border-[#EADDCD] text-[#780116] text-sm font-bold rounded-xl py-2 px-3 outline-none focus:border-[#F7B538] transition-colors"
          />
          <button 
            onClick={() => retryDlqMut.mutate(dlqJobId)}
            disabled={!dlqJobId || retryDlqMut.isLoading}
            className="px-4 py-2 bg-gradient-to-r from-[#780116] to-[#A00320] text-white text-sm font-black rounded-xl shadow-premium disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Orders List */}
        <div className="bg-white border border-[#EADDCD] rounded-[2.5rem] p-6 shadow-sm">
          <h3 className="text-[#780116] font-black text-lg mb-6 flex items-center gap-2 font-display">
            <Package className="text-[#F7B538]" size={18} /> Recent Orders
          </h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {ordersLoading ? (
              [...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[#EADDCD]/30 rounded-2xl animate-pulse" />)
            ) : orders.length === 0 ? (
              <p className="text-[#8E7B73] text-sm text-center py-6">No orders found.</p>
            ) : (
              orders.slice(0, 50).map((o) => (
                <div key={o.orderId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#FFFCF5] border border-[#EADDCD] rounded-2xl gap-3 shadow-sm hover:border-[#F7B538] transition-colors">
                  <div className="min-w-0">
                    <p className="text-[#780116] font-bold text-sm truncate flex items-center gap-2">
                      #{o.orderId} <span className="text-[#D2C5B8] font-normal">•</span> {o.restaurantName}
                    </p>
                    <p className="text-[#8E7B73] text-xs truncate mt-0.5">{o.customerEmail}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-3">
                      <span className="text-[#780116] font-black text-sm">₹{Number(o.grandTotal).toLocaleString('en-IN')}</span>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${STATUS_COLOR[o.status] || 'bg-[#FDF9F1] text-[#8E7B73] border-[#EADDCD]'}`}>
                        {o.status}
                      </span>
                    </div>
                    {o.status === 'CANCELLED' && (
                      <button 
                        onClick={() => { setRefundTarget({ orderId: o.orderId, grandTotal: o.grandTotal }); setRefundForm({ amount: o.grandTotal || '', reason: '' }); }}
                        className="text-[10px] font-black flex items-center gap-1 text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded-md border border-blue-200 transition-colors"
                      >
                        <DollarSign size={10} /> Issue Refund
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Refunds List */}
        <div className="bg-white border border-[#EADDCD] rounded-[2.5rem] p-6 shadow-sm">
          <h3 className="text-[#780116] font-black text-lg mb-6 flex items-center gap-2 font-display">
            <RefreshCcw className="text-[#F7B538]" size={18} /> Processed Refunds
          </h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {refundsLoading ? (
              [...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[#EADDCD]/30 rounded-2xl animate-pulse" />)
            ) : refunds.length === 0 ? (
              <p className="text-[#8E7B73] text-sm text-center py-6">No refunds processed.</p>
            ) : (
              refunds.map((r) => (
                <div key={r.paymentId} className="p-4 bg-[#FFFCF5] border border-[#EADDCD] rounded-2xl shadow-sm hover:border-[#F7B538] transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[#780116] font-bold text-sm">Order #{r.orderId}</p>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full border bg-green-50 text-green-700 border-green-200">
                      {r.paymentStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[#8E7B73] text-xs line-through">₹{r.amount}</span>
                    <span className="text-red-600 font-bold text-sm">Refunded: ₹{r.refundedAmount}</span>
                  </div>
                  <p className="text-[#8E7B73] text-xs bg-white border border-[#EADDCD] p-2 rounded-xl shadow-sm">
                    Reason: {r.refundReason || 'No reason provided'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Refund Modal */}
      <AnimatePresence>
        {refundTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#780116]/20 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} className="w-full max-w-md bg-white border border-[#EADDCD] rounded-3xl p-6 shadow-premium">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-[#780116] font-black text-lg">Refund Order #{refundTarget.orderId}</h3>
                  <p className="text-[#8E7B73] text-xs font-bold">Process a payment refund for this cancelled order.</p>
                </div>
                <button onClick={() => setRefundTarget(null)} className="text-[#8E7B73] hover:text-[#780116] transition-colors"><X size={20}/></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-[#8E7B73] mb-1.5 ml-1">Refund Amount (₹)</label>
                  <input type="number" step="0.01" value={refundForm.amount} onChange={e => setRefundForm(p => ({...p, amount: e.target.value}))} className="w-full bg-[#FFFCF5] border border-[#EADDCD] text-[#780116] text-sm rounded-2xl p-3 font-bold outline-none focus:border-[#F7B538]" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-[#8E7B73] mb-1.5 ml-1">Reason</label>
                  <textarea value={refundForm.reason} onChange={e => setRefundForm(p => ({...p, reason: e.target.value}))} rows={2} className="w-full bg-[#FFFCF5] border border-[#EADDCD] text-[#780116] text-sm rounded-2xl p-3 font-bold outline-none focus:border-[#F7B538] resize-none" placeholder="e.g. Customer reported missing items" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-[#8E7B73] mb-1.5 ml-1">Evidence Image (optional)</label>
                  <input ref={fileRef} type="file" accept="image/*" onChange={e => setRefundFile(e.target.files?.[0] || null)} className="hidden" />
                  <button type="button" onClick={() => fileRef.current?.click()} className="w-full bg-[#FFFCF5] border border-dashed border-[#EADDCD] text-[#8E7B73] text-xs rounded-2xl p-3 font-bold hover:border-[#F7B538] transition-colors flex items-center justify-center gap-2">
                    <Upload size={14} /> {refundFile ? refundFile.name : 'Click to upload evidence'}
                  </button>
                </div>
              </div>
              <button
                onClick={() => refundMut.mutate({ orderId: refundTarget.orderId, amount: refundForm.amount, reason: refundForm.reason, evidenceImage: refundFile })}
                disabled={refundMut.isPending || !refundForm.amount || !refundForm.reason}
                className="w-full mt-6 py-3 bg-gradient-to-r from-[#780116] to-[#A00320] text-white font-black text-sm rounded-2xl shadow-premium disabled:opacity-50 hover:-translate-y-0.5 transition-all"
              >
                {refundMut.isPending ? 'Processing…' : 'Confirm Refund'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
