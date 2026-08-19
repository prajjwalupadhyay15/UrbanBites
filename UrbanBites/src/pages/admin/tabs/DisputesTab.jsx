import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../../api/adminApi';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle2, XCircle, ChevronRight, X } from 'lucide-react';

const STATUS_STYLE = {
  OPEN: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  UNDER_REVIEW: 'bg-blue-50 text-blue-600 border-blue-200',
  RESOLVED: 'bg-green-50 text-green-700 border-green-200',
  REJECTED: 'bg-red-50 text-red-600 border-red-200'
};

export default function DisputesTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('ALL');
  
  const { data: allDisputes = [], isLoading } = useQuery({
    queryKey: ['admin-disputes-list'],
    queryFn: () => adminApi.getDisputes(),
    staleTime: 1000 * 30,
  });

  const disputes = filter === 'ALL' ? allDisputes : allDisputes.filter(d => d.status === filter);

  const [selectedDispute, setSelectedDispute] = useState(null);
  const [note, setNote] = useState('');
  const [refundTarget, setRefundTarget] = useState('ORIGINAL_PAYMENT');

  const statusMut = useMutation({
    mutationFn: ({ id, status, resolutionNote, refundTarget }) => adminApi.updateDisputeStatus(id, { status, resolutionNote, refundTarget }),
    onSuccess: () => {
      qc.invalidateQueries(['admin-disputes-list']);
      qc.invalidateQueries(['admin-disputes']);
      setSelectedDispute(null);
      setNote('');
    }
  });

  if (isLoading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-[#EADDCD]/30 rounded-2xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {['ALL', 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${filter === f ? 'bg-[#F7B538] text-white border-[#F7B538]' : 'bg-white text-[#8E7B73] border-[#EADDCD] hover:text-[#780116] hover:bg-[#FDF9F1]'}`}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {disputes.map((d, i) => (
        <motion.div
          key={d.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          onClick={() => { setSelectedDispute(d); setNote(''); setRefundTarget('ORIGINAL_PAYMENT'); }}
          className="bg-white hover:bg-[#FDF9F1] border border-[#EADDCD] hover:border-[#F7B538] shadow-sm hover:shadow-premium rounded-2xl p-4 cursor-pointer transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-yellow-50 border border-yellow-200 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-yellow-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[#780116] font-black text-sm truncate">Dispute #{d.id}</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${STATUS_STYLE[d.status] || 'bg-black/5 text-[#8E7B73]'}`}>
                  {d.status}
                </span>
                <span className="text-[#8E7B73] text-[10px] font-bold border border-[#EADDCD] rounded-md px-1.5 py-0.5 bg-white">
                  Order #{d.orderId}
                </span>
              </div>
              <p className="text-[#2A0800] text-sm font-bold truncate">{d.title || d.reason || 'Issue reported'}</p>
              <p className="text-[#8E7B73] text-xs font-medium truncate mt-0.5">
                {d.restaurantName || 'Restaurant'} • {d.userName || d.createdBy || 'User'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            {d.imageUrl && (
              <img src={d.imageUrl.startsWith('http') ? d.imageUrl : `http://localhost:8081${d.imageUrl}`} alt="Evidence" className="h-12 w-12 rounded-xl object-cover border border-[#EADDCD]" />
            )}
            <ChevronRight size={18} className="text-[#8E7B73]" />
          </div>
        </motion.div>
      ))}

      {disputes.length === 0 && <p className="text-center text-[#8E7B73] font-bold py-10">No disputes found.</p>}

      {/* Dispute Modal */}
      <AnimatePresence>
        {selectedDispute && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#780116]/20 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              className="w-full max-w-lg bg-white border border-[#EADDCD] rounded-3xl p-6 shadow-premium max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-[#780116] font-black text-xl font-display">Review Dispute #{selectedDispute.id}</h2>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border mt-1 inline-block ${STATUS_STYLE[selectedDispute.status] || 'bg-black/5 text-[#8E7B73]'}`}>
                    {selectedDispute.status}
                  </span>
                </div>
                <button onClick={() => setSelectedDispute(null)} className="text-[#8E7B73] hover:text-[#780116] transition-colors"><X size={24} /></button>
              </div>

              <div className="space-y-4 mb-6 text-sm">
                <div className="bg-[#FFFCF5] p-4 rounded-2xl border border-[#EADDCD]">
                  <p className="text-[#8E7B73] text-[10px] font-black uppercase mb-1">Issue Details</p>
                  <p className="text-[#780116] font-bold text-base mb-2">{selectedDispute.title || 'Issue Reported'}</p>
                  <p className="text-[#2A0800] font-medium leading-relaxed">{selectedDispute.description || selectedDispute.reason || 'No detailed description provided.'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-2xl border border-[#EADDCD]">
                    <p className="text-[#8E7B73] text-[10px] font-black uppercase mb-1">Restaurant</p>
                    <p className="text-[#780116] font-bold">{selectedDispute.restaurantName || 'Unknown'}</p>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-[#EADDCD]">
                    <p className="text-[#8E7B73] text-[10px] font-black uppercase mb-1">Customer</p>
                    <p className="text-[#780116] font-bold">{selectedDispute.userName || selectedDispute.createdBy || 'Unknown'}</p>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-[#EADDCD] col-span-2 flex justify-between items-center">
                    <div>
                      <p className="text-[#8E7B73] text-[10px] font-black uppercase mb-1">Order Total</p>
                      <p className="text-[#780116] font-bold">₹{selectedDispute.orderTotal || '—'}</p>
                    </div>
                    <div>
                       <p className="text-[#8E7B73] text-[10px] font-black uppercase mb-1 text-right">Order Items</p>
                       <p className="text-[#2A0800] text-xs font-bold text-right">{selectedDispute.orderItemsSummary || '—'}</p>
                    </div>
                  </div>
                </div>

                {selectedDispute.imageUrl && (
                  <div>
                    <p className="text-[#8E7B73] text-[10px] font-black uppercase mb-2">Evidence Image</p>
                    <img src={selectedDispute.imageUrl.startsWith('http') ? selectedDispute.imageUrl : `http://localhost:8081${selectedDispute.imageUrl}`} alt="Evidence" className="w-full max-h-[250px] object-cover rounded-2xl border border-[#EADDCD]" />
                  </div>
                )}
              </div>

              {selectedDispute.status === 'OPEN' || selectedDispute.status === 'UNDER_REVIEW' ? (
                <div className="space-y-4 pt-4 border-t border-[#EADDCD]">
                  
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-2 text-[#780116] text-sm font-bold cursor-pointer">
                      <input 
                        type="radio" 
                        name="refundTarget" 
                        value="ORIGINAL_PAYMENT" 
                        checked={refundTarget === 'ORIGINAL_PAYMENT'}
                        onChange={(e) => setRefundTarget(e.target.value)}
                        className="accent-[#F7B538]"
                      />
                      Refund to Original Source
                    </label>
                    <label className="flex items-center gap-2 text-[#780116] text-sm font-bold cursor-pointer">
                      <input 
                        type="radio" 
                        name="refundTarget" 
                        value="WALLET" 
                        checked={refundTarget === 'WALLET'}
                        onChange={(e) => setRefundTarget(e.target.value)}
                        className="accent-[#F7B538]"
                      />
                      Refund to UrbanBites Wallet
                    </label>
                  </div>

                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Add a note to be sent to the user... (e.g. 'We are refunding this order due to missing items.')"
                    className="w-full bg-[#FFFCF5] border border-[#EADDCD] rounded-2xl p-3 outline-none focus:border-[#F7B538] focus:ring-2 focus:ring-[#F7B538]/20 transition-all text-sm text-[#780116] font-medium resize-none shadow-sm"
                    rows={3}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => statusMut.mutate({ id: selectedDispute.id, status: 'REJECTED', resolutionNote: note })}
                      disabled={statusMut.isPending}
                      className="flex-1 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 font-black text-sm hover:bg-red-100 transition-all shadow-sm disabled:opacity-50"
                    >
                      Reject & Cancel
                    </button>
                    <button
                      onClick={() => statusMut.mutate({ id: selectedDispute.id, status: 'RESOLVED', resolutionNote: note, refundTarget })}
                      disabled={statusMut.isPending}
                      className="flex-1 py-3 rounded-2xl bg-green-50 border border-green-200 text-green-700 font-black text-sm hover:bg-green-100 transition-all shadow-sm disabled:opacity-50"
                    >
                      Resolve & Refund
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-4 border-t border-[#EADDCD]">
                  <p className="text-[#8E7B73] text-[10px] font-black uppercase mb-2">Resolution Note</p>
                  <p className="text-[#780116] font-medium text-sm bg-black/5 p-3 rounded-xl">{selectedDispute.resolutionNote || 'No resolution note provided.'}</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
