import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Star, Loader2, Sparkles, CheckCircle2, Utensils } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewApi } from '../../api/reviewApi';
import StarRating from '../common/StarRating';
import toast from 'react-hot-toast';

function MenuItemReviewForm({ item, restaurantId, orderId }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => reviewApi.submitMenuItemReview(restaurantId, item.menuItemId, orderId, rating, comment),
    onSuccess: () => {
      toast.success(`Review submitted for ${item.itemName}`);
      queryClient.invalidateQueries({ queryKey: ['restaurant-menu', restaurantId] });
      setSubmitted(true);
    },
    onError: (err) => {
      setError(err?.response?.data?.message || 'Failed to submit review.');
    }
  });

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between text-green-700">
        <div className="font-bold text-sm">Reviewed {item.itemName}</div>
        <CheckCircle2 size={16} />
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#EADDCD] rounded-2xl p-4 shadow-sm text-left">
      <div className="font-black text-[#2A0800] mb-3">{item.itemName}</div>
      <div className="flex gap-2">
        <StarRating value={rating} onChange={setRating} size={24} />
      </div>
      {rating > 0 && (
        <div className="mt-3 space-y-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="How was this dish?"
            rows={2}
            className="w-full bg-[#FFFCF5] border border-[#EADDCD] text-[#2A0800] placeholder:text-[#AFA49F] rounded-xl p-3 outline-none focus:border-[#F7B538] font-bold text-xs resize-none"
          />
          {error && <div className="text-red-500 text-xs font-bold">{error}</div>}
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="w-full h-9 rounded-xl bg-[#F7B538] text-[#2A0800] font-black text-xs shadow-sm hover:bg-[#e5a631] transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Submit'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ReviewModal({
  isOpen,
  onClose,
  orderId,
  restaurantName,
  order,
  onSuccess,
}) {
  const [activeTab, setActiveTab] = useState('restaurant'); // 'restaurant' | 'dishes'
  
  // Restaurant Form State
  const [resRating, setResRating] = useState(5);
  const [resComment, setResComment] = useState('');
  const [resError, setResError] = useState('');
  
  const queryClient = useQueryClient();

  const resMutation = useMutation({
    mutationFn: () => reviewApi.submitReview(orderId, resRating, resComment),
    onSuccess: (data) => {
      toast.success('Thank you for your feedback!');
      queryClient.invalidateQueries({ queryKey: ['myOrders'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-reviews', data.restaurantId] });
      onSuccess?.(orderId);
    },
    onError: (err) => {
      setResError(err?.response?.data?.message || 'Failed to submit review.');
    },
  });

  const handleResSubmit = (e) => {
    e.preventDefault();
    if (resRating < 1 || resRating > 5) {
      setResError('Please select a rating between 1 and 5 stars.');
      return;
    }
    setResError('');
    resMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#2A0800]/40 backdrop-blur-md"
      />

      {/* Modal Box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative bg-[#FFFCF5] border border-[#EADDCD] rounded-[2.5rem] w-full max-w-md p-6 sm:p-8 shadow-[0_32px_80px_rgba(42,8,0,0.15)] z-10 flex flex-col max-h-[90vh]"
      >
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#F7B538] rounded-t-[2.5rem]" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white hover:bg-[#FDF9F1] border border-[#EADDCD] shadow-sm flex items-center justify-center text-[#8E7B73] hover:text-[#780116] transition-all z-20"
        >
          <X size={16} />
        </button>

        {/* Tabs */}
        <div className="flex bg-[#FDF9F1] p-1.5 rounded-2xl border border-[#EADDCD] mb-6 mt-4 shrink-0">
          <button
            onClick={() => setActiveTab('restaurant')}
            className={`flex-1 py-2 text-sm font-black rounded-xl transition-all ${
              activeTab === 'restaurant'
                ? 'bg-white text-[#780116] shadow-sm'
                : 'text-[#8E7B73] hover:text-[#2A0800]'
            }`}
          >
            Restaurant
          </button>
          <button
            onClick={() => setActiveTab('dishes')}
            className={`flex-1 py-2 text-sm font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'dishes'
                ? 'bg-white text-[#780116] shadow-sm'
                : 'text-[#8E7B73] hover:text-[#2A0800]'
            }`}
          >
            Dishes
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto pr-1 -mr-1 custom-scrollbar">
          {activeTab === 'restaurant' ? (
            <form onSubmit={handleResSubmit} className="space-y-6 text-center">
              <div className="pt-2">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#EADDCD] shadow-sm">
                  <Sparkles size={26} className="text-[#F7B538] fill-[#F7B538]" />
                </div>
                <h3 className="text-2xl font-black text-[#780116] font-display tracking-tight">Rate Your Feast</h3>
                <p className="text-[#8E7B73] text-sm font-bold mt-1">How was your order from {restaurantName}?</p>
              </div>

              {resMutation.isSuccess ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-green-700 font-bold flex flex-col items-center gap-3">
                  <CheckCircle2 size={32} />
                  <span>Restaurant review submitted!</span>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-2 py-2 bg-white/50 rounded-2xl border border-[#EADDCD]/60 p-4 shadow-inner">
                    <StarRating value={resRating} onChange={setResRating} size={36} />
                  </div>

                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#8E7B73] px-1">
                      Write a Review (Optional)
                    </label>
                    <div className="relative">
                      <MessageSquare size={16} className="absolute left-4 top-4 text-[#8E7B73]" />
                      <textarea
                        value={resComment}
                        onChange={(e) => setResComment(e.target.value)}
                        placeholder="Share details of your experience..."
                        rows={3}
                        className="w-full bg-white border-2 border-[#EADDCD] text-[#2A0800] placeholder:text-[#AFA49F] rounded-2xl p-4 pl-11 outline-none focus:border-[#F7B538] resize-none shadow-sm font-bold text-sm"
                      />
                    </div>
                  </div>

                  {resError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold text-left">
                      {resError}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2 pb-4">
                    <button type="button" onClick={onClose} className="flex-1 h-12 rounded-xl bg-white border border-[#EADDCD] shadow-sm text-[#2A0800] font-black text-sm hover:text-red-600 transition-all">
                      Cancel
                    </button>
                    <button type="submit" disabled={resMutation.isPending} className="flex-[2] h-12 rounded-xl bg-[#780116] border-2 border-[#A00320] text-white font-black text-sm shadow-premium flex items-center justify-center gap-1.5">
                      {resMutation.isPending ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : <><CheckCircle2 size={16} /> Submit Feedback</>}
                    </button>
                  </div>
                </>
              )}
            </form>
          ) : (
            <div className="space-y-4 pb-4">
              <div className="text-center mb-6 pt-2">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#EADDCD] shadow-sm">
                  <Utensils size={26} className="text-[#F7B538]" />
                </div>
                <h3 className="text-2xl font-black text-[#780116] font-display tracking-tight">Rate Dishes</h3>
                <p className="text-[#8E7B73] text-sm font-bold mt-1">Review the specific items you ordered</p>
              </div>
              
              <div className="space-y-3">
                {order?.items?.map(item => (
                  <MenuItemReviewForm 
                    key={item.id} 
                    item={item} 
                    restaurantId={order.restaurantId} 
                    orderId={order.orderId}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
