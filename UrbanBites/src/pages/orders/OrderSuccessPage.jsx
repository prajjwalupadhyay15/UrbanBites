import React from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ChefHat, Utensils, Bike, Package } from 'lucide-react';
import { customerOrderApi } from '../../api/orderApi';

export default function OrderSuccessPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: liveOrder, isLoading } = useQuery({
    queryKey: ['liveOrder', id],
    queryFn: () => customerOrderApi.getMyOrder(id),
    enabled: !!id,
    refetchInterval: 5000, // Poll every 5s
  });

  if (isLoading || !liveOrder) {
    return (
      <div className="min-h-screen bg-[#FFFCF5] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#EADDCD] border-t-[#F7B538] rounded-full animate-spin" />
      </div>
    );
  }

  const orderStatus = liveOrder.status || 'CONFIRMED';
  const isAccepted = ['ACCEPTED_BY_RESTAURANT', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(orderStatus);
  const isAssigned = ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(orderStatus);

  return (
    <div className="min-h-screen bg-[#FFFCF5] flex items-center justify-center p-6">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-sm w-full pt-16 pb-16">
        <div className="relative w-32 h-32 mx-auto mb-8">
          {[...Array(8)].map((_, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], x: [0, Math.cos((i * Math.PI) / 4) * 60], y: [0, Math.sin((i * Math.PI) / 4) * 60] }} transition={{ delay: 0.3 + i * 0.08, duration: 1.2 }} className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full" style={{ backgroundColor: ['#F7B538', '#780116', '#22c55e', '#3b82f6'][i % 4] }} />
          ))}
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2, stiffness: 200 }} className="absolute inset-0 bg-green-50 border-2 border-green-200 rounded-full flex items-center justify-center shadow-sm">
            <CheckCircle2 size={56} className="text-green-500" />
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <h1 className="text-4xl font-display font-black text-[#780116] mb-2">Order Placed! 🎉</h1>
          <p className="text-[#8E7B73] text-sm font-bold mb-4">Payment successful. Your food is on its way!</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-white border border-[#EADDCD] shadow-sm rounded-3xl p-6 mb-4 text-left">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#EADDCD]">
            <div><p className="text-[#780116] font-black text-base">{liveOrder.restaurantName || 'Your Order'}</p><p className="text-[#8E7B73] text-xs font-bold mt-0.5">Order #{id}</p></div>
            <span className="text-[#2A0800] font-black text-xl">₹{(liveOrder.grandTotal || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="space-y-3">
            {liveOrder.items?.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[#780116] text-sm font-bold">{item.itemName}</span>
                  <span className="text-[#8E7B73] text-xs">×{item.quantity}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="bg-white border border-[#EADDCD] shadow-sm rounded-3xl p-6 mb-8 text-left">
          <p className="text-[#8E7B73] text-[10px] font-black uppercase tracking-widest mb-4">What's happening next</p>
          <div className="space-y-4">
            {[
              { icon: ChefHat, label: 'Restaurant notified', desc: 'Waiting for confirmation', active: !isAccepted && !isAssigned },
              { icon: Utensils, label: 'Food preparation', desc: 'Chef will start cooking', active: isAccepted && !isAssigned },
              { icon: Bike, label: 'Delivery assigned', desc: 'Agent picks up your order', active: isAssigned }
            ].map(({ icon: Icon, label, desc, active }, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-[#FDF9F1] border-2 border-[#F7B538]' : 'bg-white border border-[#EADDCD]'}`}><Icon size={18} className={active ? 'text-[#F7B538]' : 'text-[#EADDCD]'} /></div>
                <div><p className={`text-sm font-bold ${active ? 'text-[#780116]' : 'text-[#8E7B73]'}`}>{label}</p><p className="text-[#8E7B73] text-xs">{desc}</p></div>
                {active && <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="ml-auto w-2.5 h-2.5 rounded-full bg-[#F7B538]" />}
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="space-y-4">
          <button onClick={() => navigate(`/orders/${id}/track`)} className="w-full py-4 rounded-2xl bg-[#780116] border-2 border-[#A00320] text-white font-black text-lg shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all flex items-center justify-center gap-2"><Package size={20} /> Track Order</button>
          <button onClick={() => navigate('/')} className="w-full py-4 rounded-2xl bg-white border border-[#EADDCD] text-[#780116] font-bold text-sm hover:bg-[#FDF9F1] hover:border-[#F7B538] transition-all shadow-sm">Back to Home</button>
        </motion.div>
      </motion.div>
    </div>
  );
}
