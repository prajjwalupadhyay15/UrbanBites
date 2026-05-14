import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X, UtensilsCrossed, ArrowRight } from 'lucide-react';

export default function CartConflictModal({ isOpen, onClose, onConfirm, currentRestaurant, newRestaurant }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#2A0800]/40 backdrop-blur-md z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-[#FFFCF5] border border-[#EADDCD] rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-premium pointer-events-auto overflow-hidden relative">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#F7B538]/10 rounded-full blur-3xl -mr-16 -mt-16" />
              
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 border-2 border-[#EADDCD] shadow-sm relative">
                <div className="absolute inset-0 bg-red-500/5 animate-pulse rounded-3xl" />
                <AlertTriangle size={36} className="text-[#F7B538]" />
              </div>

              <h3 className="text-2xl font-black text-[#780116] mb-3 font-display">Replace cart?</h3>
              
              <div className="space-y-4 mb-8">
                <p className="text-[#8E7B73] text-sm font-bold leading-relaxed">
                  Your cart already contains items from <span className="text-[#780116] font-black">"{currentRestaurant}"</span>.
                </p>
                
                <div className="flex items-center justify-center gap-3 py-3 px-4 bg-white border border-[#EADDCD] rounded-2xl">
                   <div className="text-xs font-black text-[#8E7B73]">{currentRestaurant}</div>
                   <ArrowRight size={14} className="text-[#F7B538]" />
                   <div className="text-xs font-black text-[#780116]">{newRestaurant}</div>
                </div>

                <p className="text-[#8E7B73] text-xs font-medium italic">
                  Adding this item will remove all existing items from your current cart.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={onConfirm}
                  className="w-full py-4 rounded-2xl bg-[#780116] border-2 border-[#A00320] text-white font-black shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                >
                  <Trash2 size={18} className="group-hover:rotate-12 transition-transform" /> 
                  Clear Cart & Add
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-4 rounded-2xl bg-white border border-[#EADDCD] text-[#2A0800] font-black hover:bg-[#FDF9F1] hover:border-[#F7B538] transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <X size={18} /> Discard New Item
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
