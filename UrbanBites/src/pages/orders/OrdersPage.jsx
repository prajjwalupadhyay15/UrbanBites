import React from 'react';
import { motion } from 'framer-motion';
import { Package, MapPin, Clock, ExternalLink, Navigation } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { customerOrderApi } from '../../api/orderApi';
import { format } from 'date-fns';

const TRACKABLE_STATUSES = ['PENDING_PAYMENT', 'CONFIRMED', 'ACCEPTED_BY_RESTAURANT', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'];

export default function OrdersPage() {
  const navigate = useNavigate();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['myOrders'],
    queryFn: customerOrderApi.listMyOrders
  });

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-[#FFFCF5]">
        <div className="w-16 h-16 bg-black/5 rounded-full animate-pulse shadow-sm" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center bg-[#FFFCF5]">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 border border-[#EADDCD] shadow-sm">
          <Package size={36} className="text-[#F7B538]" />
        </div>
        <h2 className="text-3xl font-display font-black text-[#780116] mb-2 tracking-tight">No orders yet</h2>
        <p className="text-[#8E7B73] font-bold mb-8">You haven't placed any orders yet. Let's fix that!</p>
        <Link to="/" className="px-8 py-4 bg-[#F7B538] text-[#780116] rounded-2xl font-black hover:shadow-lg hover:-translate-y-1 transition-all flex items-center gap-2">
          Browse Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFCF5]">
      <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 w-full">
        <h1 className="text-4xl font-black text-[#780116] mb-2 font-display tracking-tight">Your Orders</h1>
        <p className="text-[#8E7B73] font-bold text-sm mb-10">View and track all your past and current orders.</p>

        <div className="space-y-6">
          {orders.map((order, i) => {
            const isTrackable = TRACKABLE_STATUSES.includes(order.status);
            const isCancelled = order.status === 'CANCELLED';
            const isDelivered = order.status === 'DELIVERED';
            
            return (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={order.orderId} 
                className="bg-white rounded-[2rem] p-6 group border-2 border-[#EADDCD] hover:border-[#F7B538] transition-all shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#EADDCD]">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[#780116] font-black text-xl">{order.restaurantName}</span>
                      <span className="text-[#8E7B73] text-sm font-black">#{order.orderId}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold text-[#8E7B73]">
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} className="text-[#F7B538]"/> 
                        {format(new Date(order.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end gap-1.5">
                    <span className={`font-black px-4 py-1.5 rounded-full text-xs border w-fit tracking-wide shadow-sm ${
                      isCancelled ? 'bg-red-50 text-red-600 border-red-200' : 
                      isDelivered ? 'bg-green-50 text-green-600 border-green-200' : 
                      'bg-[#FDF9F1] text-[#F7B538] border-[#F7B538]/50 shadow-inner'
                    }`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[#2A0800] font-black text-2xl tracking-tight">₹{order.grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-[#8E7B73] text-sm font-black mb-2 uppercase tracking-widest">Order Items</p>
                    <div className="text-[#5A3825] text-base font-bold">
                      {order.items?.map(it => `${it.quantity}x ${it.itemName}`).join(', ') || `${order.totalItems} Items`}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 mt-4 sm:mt-0 items-center justify-end w-full sm:w-auto">
                    {isTrackable && (
                      <button 
                        onClick={() => navigate(`/orders/${order.orderId}/track`)}
                        className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#780116] border-2 border-[#A00320] text-white font-black rounded-2xl shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all text-sm shrink-0 flex-1 sm:flex-none"
                      >
                        <Navigation size={18}/> Track Order
                      </button>
                    )}
                    
                    {(isDelivered || isCancelled) && (
                      <button className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-[#EADDCD] hover:border-[#F7B538] hover:bg-[#FDF9F1] text-[#780116] font-black rounded-2xl shadow-sm hover:-translate-y-0.5 active:scale-[0.98] transition-all text-sm shrink-0 flex-1 sm:flex-none">
                        Reorder <ExternalLink size={16}/>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
