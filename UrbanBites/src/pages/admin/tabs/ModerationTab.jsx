import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../../api/adminApi';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';

export default function ModerationTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('ALL'); // ALL, PENDING, APPROVED, REJECTED
  const [selectedReview, setSelectedReview] = useState(null);
  const [reason, setReason] = useState('');

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['admin-review-moderations'],
    queryFn: () => adminApi.getReviewModerations(),
  });

  const moderateMut = useMutation({
    mutationFn: (body) => adminApi.moderateReview(body),
    onSuccess: () => {
      qc.invalidateQueries(['admin-review-moderations']);
      setSelectedReview(null);
      setReason('');
    },
  });

  const filteredReviews = reviews.filter(r => filter === 'ALL' || r.status === filter);

  const STATUS_COLOR = {
    PENDING: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    APPROVED: 'text-green-700 bg-green-50 border-green-200',
    REJECTED: 'text-red-700 bg-red-50 border-red-200',
  };

  const handleModerate = (status) => {
    if (!selectedReview) return;
    moderateMut.mutate({
      reviewType: selectedReview.reviewType,
      reviewId: selectedReview.reviewId,
      status: status,
      reason: reason || 'Moderated by admin'
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#EADDCD] shadow-sm rounded-[2.5rem] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-[#780116] font-black text-lg flex items-center gap-2 font-display">
            <ShieldAlert className="text-[#F7B538]" size={18} /> Review Moderation
          </h3>
          <div className="flex gap-2">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs font-black px-3 py-1.5 rounded-xl border shadow-sm transition-all ${
                  filter === f 
                    ? 'bg-[#F7B538] text-white border-[#F7B538] shadow-[0_2px_12px_rgba(247,181,56,0.4)]' 
                    : 'bg-white text-[#8E7B73] border-[#EADDCD] hover:text-[#780116] hover:bg-[#FDF9F1]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            [...Array(3)].map((_, i) => <div key={i} className="h-20 bg-[#EADDCD]/30 rounded-2xl animate-pulse" />)
          ) : filteredReviews.length === 0 ? (
            <div className="py-12 text-center text-[#8E7B73] font-medium">No reviews found matching this filter.</div>
          ) : (
            filteredReviews.map((r) => (
              <div key={r.id} className="p-4 bg-[#FFFCF5] border border-[#EADDCD] shadow-sm rounded-2xl flex flex-col sm:flex-row gap-4 hover:border-[#F7B538] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#8E7B73] bg-[#EADDCD]/30 px-2 py-0.5 rounded">
                      {r.reviewType}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${STATUS_COLOR[r.status]}`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-[#780116] font-medium text-sm mb-2">"{r.reviewContent}"</p>
                  {r.moderationReason && (
                    <p className="text-xs text-[#8E7B73] bg-white border border-[#EADDCD] shadow-sm p-2 rounded-lg inline-block">
                      Reason: {r.moderationReason}
                    </p>
                  )}
                </div>
                
                {r.status === 'PENDING' && (
                  <div className="shrink-0 flex sm:flex-col gap-2">
                    <button 
                      onClick={() => setSelectedReview(r)}
                      className="px-4 py-2 rounded-xl text-xs font-black bg-white text-[#F7B538] hover:bg-[#FDF9F1] border border-[#EADDCD] shadow-sm transition-all"
                    >
                      Action
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Action Modal */}
      <AnimatePresence>
        {selectedReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#780116]/20 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-md bg-white border border-[#EADDCD] rounded-3xl p-6 shadow-premium"
            >
              <h3 className="text-[#780116] font-black text-lg mb-4 font-display">Moderate Review</h3>
              <p className="text-[#8E7B73] text-sm mb-4 italic p-3 bg-[#FFFCF5] rounded-xl border border-[#EADDCD] shadow-sm">
                "{selectedReview.reviewContent}"
              </p>
              
              <div className="mb-6">
                <label className="text-[#8E7B73] text-xs font-black uppercase tracking-widest block mb-2">Reason (Optional)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Contains inappropriate language..."
                  className="w-full bg-[#FFFCF5] border border-[#EADDCD] text-[#780116] text-sm rounded-xl p-3 outline-none focus:border-[#F7B538] focus:ring-1 focus:ring-[#F7B538]/50 shadow-sm transition-all resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setSelectedReview(null); setReason(''); }}
                  className="flex-1 py-2.5 rounded-xl bg-white border border-[#EADDCD] text-[#8E7B73] font-black text-sm hover:text-[#780116] hover:bg-[#FDF9F1] shadow-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleModerate('APPROVED')}
                  disabled={moderateMut.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700 font-black text-sm hover:bg-green-100 shadow-sm transition-all disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleModerate('REJECTED')}
                  disabled={moderateMut.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 font-black text-sm hover:bg-red-100 shadow-sm transition-all disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
