import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { ShoppingBag, ArrowRight } from 'lucide-react';

export default function CartFloatingBar() {
  const { items, getTotalPrice, getTotalItems } = useCartStore();
  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Hide on checkout/cart pages — they have their own CTAs
  const hiddenRoutes = ['/checkout', '/cart'];
  if (hiddenRoutes.some((r) => pathname.startsWith(r))) return null;
  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.div
          initial={{ y: 120, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 120, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg z-40 pointer-events-none"
        >
          <motion.button
            onClick={() => navigate('/cart')}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="w-full pointer-events-auto relative overflow-hidden rounded-[1.5rem] bg-[#780116] border-2 border-[#A00320] shadow-[0_16px_40px_rgba(120,1,22,0.4)] flex items-center justify-between px-5 py-4 cursor-pointer"
          >
            {/* Shimmer sweep animation */}
            <motion.div
              animate={{ x: ['-120%', '220%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 pointer-events-none"
            />

            {/* Left: info */}
            <div className="flex items-center gap-3 relative z-10">
              <div className="relative">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-inner">
                  <ShoppingBag size={20} className="text-[#F7B538]" />
                </div>
                <motion.span
                  key={totalItems}
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                  className="absolute -top-1.5 -right-1.5 bg-[#F7B538] text-[#780116] text-[10px] font-black min-w-[20px] h-[20px] flex items-center justify-center rounded-full border-2 border-[#780116] px-1"
                >
                  {totalItems}
                </motion.span>
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-white/80 text-[10px] font-black uppercase tracking-widest leading-none">
                  {totalItems} item{totalItems !== 1 ? 's' : ''}
                </span>
                <motion.span
                  key={totalPrice}
                  initial={{ y: -8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-white text-2xl font-black leading-none tracking-tight"
                >
                  ₹{totalPrice.toFixed(0)}
                </motion.span>
              </div>
            </div>

            {/* Right: CTA */}
            <div className="flex items-center gap-2 relative z-10 bg-[#F7B538] rounded-xl px-4 py-2.5 shadow-sm group-hover:bg-[#FFC65C] transition-colors">
              <span className="text-[#780116] font-black text-sm">View Cart</span>
              <ArrowRight size={18} className="text-[#780116]" />
            </div>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
