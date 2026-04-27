import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { cartApi } from '../../api/cartApi';
import AddressSelector from '../common/AddressSelector';
import {
  X, ShoppingBag, Plus, Minus, Receipt, ArrowRight, Trash2,
  Leaf, Drumstick, Tag, AlertCircle, MapPin, LogIn, UserPlus
} from 'lucide-react';

const IMAGE_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

export default function CartDrawer() {
  const navigate = useNavigate();
  const {
    isDrawerOpen, closeDrawer,
    items, addItem, removeItem, clearCart,
    getTotalPrice, restaurantName, restaurantId,
  } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const subtotal = getTotalPrice();

  // Real backend fee breakup
  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['cart-checkout-preview', items.length, subtotal, selectedAddressId],
    queryFn: () => cartApi.checkoutPreview(selectedAddressId),
    enabled: isDrawerOpen && isAuthenticated && items.length > 0,
    staleTime: 15000,
    retry: 1,
  });

  const fees = preview?.fees;
  const serviceable = preview?.serviceable ?? true;
  const deliveryFee = fees ? Number(fees.deliveryFee) : 0;
  const packingCharge = fees ? Number(fees.packingCharge) : 0;
  const tax = fees ? Number(fees.tax) : Math.round(subtotal * 0.05);
  const platformFee = fees ? Number(fees.platformFee) : 5;
  const discount = fees ? Number(fees.discount) : 0;
  const total = fees ? Number(fees.grandTotal) : subtotal + deliveryFee + tax + platformFee;

  const handleClear = async () => {
    clearCart();
    if (isAuthenticated) {
      try { await cartApi.clearCart(); } catch (e) { /* silent */ }
    }
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }
    closeDrawer();
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-[#FFFCF5] z-[60] flex flex-col border-l border-[#EADDCD] shadow-[-24px_0_80px_rgba(0,0,0,0.15)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-5 border-b border-[#1a1a1a] shrink-0">
              <div>
                <h2 className="text-2xl font-black text-[#780116] tracking-tight font-display">Your Cart</h2>
                {restaurantName && (
                  <p className="text-[#F7B538] text-xs font-bold uppercase tracking-wider mt-0.5">{restaurantName}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button
                    onClick={handleClear}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#8E7B73] hover:text-[#780116] px-3 py-2 rounded-xl hover:bg-[#FDF9F1] transition-all"
                  >
                    <Trash2 size={13} /> Clear all
                  </button>
                )}
                <button
                  onClick={closeDrawer}
                  className="w-10 h-10 bg-white border border-[#EADDCD] hover:border-[#F7B538] rounded-xl flex items-center justify-center text-[#780116] hover:bg-[#FDF9F1] transition-all shadow-sm"
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <motion.div 
                    animate={{ y: [-10, 10, -10] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="w-32 h-32 bg-[#FDF9F1] border border-[#F7B538]/30 rounded-full flex items-center justify-center mb-6 shadow-glow-orange"
                  >
                    <ShoppingBag size={48} className="text-[#F7B538]" />
                  </motion.div>
                  <h3 className="text-3xl font-black text-[#780116] font-display mb-2">Cart is empty</h3>
                  <p className="text-[#8E7B73] text-base font-bold max-w-[200px] leading-relaxed">
                    Add delicious items from a restaurant to get started.
                  </p>
                  <button
                    onClick={closeDrawer}
                    className="mt-8 bg-[#780116] text-white text-base font-black px-8 py-4 rounded-2xl hover:-translate-y-1 hover:shadow-xl transition-all shadow-premium"
                  >
                    Browse Restaurants
                  </button>
                </div>
              ) : (
                <div className="p-4 space-y-2.5">

                  {/* Zomato-style Delivery Address Strip */}
                  {isAuthenticated && (
                    <div className="mb-4">
                      <div className="flex items-center gap-1.5 mb-2 px-1">
                        <MapPin size={14} className="text-[#F7B538]" />
                        <span className="text-xs font-black text-[#8E7B73] uppercase tracking-widest">Deliver to</span>
                      </div>
                      <AddressSelector
                        selectedId={selectedAddressId}
                        onSelect={setSelectedAddressId}
                        variant="strip"
                      />
                    </div>
                  )}

                  {/* Items */}
                  <AnimatePresence>
                    {items.map((item) => {
                      const imgSrc = item.imagePath
                        ? item.imagePath.startsWith('http') ? item.imagePath : `${IMAGE_BASE}${item.imagePath}`
                        : null;

                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, x: 16 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -16, height: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0 }}
                          transition={{ duration: 0.22 }}
                          className="bg-white border border-[#EADDCD] rounded-2xl p-3.5 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow"
                        >
                          {/* Veg indicator */}
                          <div className={`shrink-0 w-4 h-4 rounded-sm border-2 flex items-center justify-center
                            ${item.veg ? 'border-green-600' : 'border-red-600'}`}>
                            <span className={`w-2 h-2 rounded-full ${item.veg ? 'bg-green-600' : 'bg-red-600'}`} />
                          </div>

                          {/* Image */}
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#FFFCF5] shrink-0 border border-[#EADDCD]">
                            {imgSrc
                              ? <img src={imgSrc} alt={item.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center">
                                  {item.veg
                                    ? <Leaf size={18} className="text-green-700" />
                                    : <Drumstick size={18} className="text-red-700" />}
                                </div>
                            }
                          </div>

                          {/* Name + price */}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[#780116] text-sm truncate">{item.name}</p>
                            <p className="text-[#2A0800] font-extrabold text-sm mt-0.5">
                              ₹{(item.price * item.quantity).toFixed(0)}
                            </p>
                          </div>

                          {/* Qty */}
                          <div className="flex items-center gap-0.5 bg-[#FFFCF5] border border-[#EADDCD] rounded-xl h-9 px-0.5 shrink-0 shadow-inner">
                            <button
                              onClick={() => removeItem(item.id)}
                              className="w-8 h-full flex items-center justify-center text-[#780116] hover:text-[#F7B538] transition-colors active:scale-90"
                            >
                              <Minus size={14} strokeWidth={3} />
                            </button>
                            <motion.span
                              key={item.quantity}
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="w-6 text-center font-black text-[#2A0800] text-sm tabular-nums"
                            >
                              {item.quantity}
                            </motion.span>
                            <button
                              onClick={() => addItem(item, restaurantId, restaurantName)}
                              className="w-8 h-full flex items-center justify-center text-[#780116] hover:text-[#F7B538] transition-colors active:scale-90"
                            >
                              <Plus size={14} strokeWidth={3} />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Promo */}
                  <div className="flex items-center gap-3 bg-[#FDF9F1] border border-[#F7B538]/30 rounded-2xl p-3.5 mt-4">
                    <div className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center shrink-0">
                      <Tag size={18} className="text-[#F7B538]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#780116] font-bold text-sm">Apply Coupon</p>
                      <p className="text-[#8E7B73] text-xs">Save extra on this order</p>
                    </div>
                    <button className="text-[#F7B538] text-sm font-black uppercase tracking-wide hover:text-[#780116] transition-colors">Apply</button>
                  </div>

                  {/* Bill summary */}
                  <div className="bg-white border border-[#EADDCD] shadow-sm rounded-2xl p-5 mt-4 mb-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Receipt size={18} className="text-[#F7B538]" />
                      <h4 className="font-extrabold text-[#780116] text-base">Bill Details</h4>
                    </div>
                    {previewLoading ? (
                      <div className="space-y-3">
                        {[...Array(4)].map((_, i) => <div key={i} className="h-3.5 bg-black/5 rounded-full animate-pulse" />)}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {[
                          { label: 'Item Total', value: subtotal },
                          { label: 'Delivery Fee', value: deliveryFee },
                          ...(packingCharge > 0 ? [{ label: 'Packing', value: packingCharge }] : []),
                          { label: 'Tax', value: tax },
                          { label: 'Platform Fee', value: platformFee },
                          ...(discount > 0 ? [{ label: 'Discount', value: `-${discount}`, isDiscount: true }] : []),
                        ].map(({ label, value, isDiscount }) => (
                          <div key={label} className="flex justify-between">
                            <span className="text-[#8E7B73] text-sm font-semibold">{label}</span>
                            <span className={`text-sm font-bold tabular-nums ${isDiscount ? 'text-green-600' : 'text-[#2A0800]'}`}>₹{value}</span>
                          </div>
                        ))}
                        <div className="border-t border-dashed border-[#EADDCD] pt-3 flex justify-between">
                          <span className="text-[#780116] font-black text-base">To Pay</span>
                          <motion.span
                            key={total}
                            initial={{ scale: 1.1 }}
                            animate={{ scale: 1 }}
                            className="text-[#2A0800] font-black text-lg tabular-nums"
                          >
                            ₹{total.toLocaleString('en-IN')}
                          </motion.span>
                        </div>
                      </div>
                    )}
                    {!serviceable && preview?.serviceabilityReason && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bold">
                        <AlertCircle size={14} /> {preview.serviceabilityReason}
                      </div>
                    )}
                  </div>
                  <div className="h-2" />
                </div>
              )}
            </div>

            {/* Footer CTA */}
            {items.length > 0 && (
              <div className="p-4 border-t border-[#EADDCD] shrink-0 bg-white z-10">
                <button
                  onClick={handleCheckout}
                  disabled={!serviceable}
                  className="w-full relative overflow-hidden h-16 rounded-[1.5rem] bg-[#780116] border-2 border-[#A00320] text-white font-black text-lg shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between px-6 group"
                >
                  <motion.div
                    animate={{ x: ['-120%', '220%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 4 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none"
                  />
                  <div className="relative z-10 flex flex-col text-left">
                    <span className="text-white/80 text-[10px] font-black uppercase tracking-widest leading-none mb-1">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                    <span className="text-2xl leading-none">₹{total.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="relative z-10 flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm group-hover:bg-white/20 transition-colors">
                    <span className="text-sm">{isAuthenticated ? 'Checkout' : 'Login to Pay'}</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* Login prompt inside drawer */}
                <AnimatePresence>
                  {showLoginPrompt && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 bg-[#FFFCF5] border border-[#EADDCD] rounded-2xl p-5 space-y-4 overflow-hidden shadow-inner"
                    >
                      <div className="flex items-center gap-2 text-[#780116]">
                        <LogIn size={18} />
                        <p className="text-base font-black">Sign in to checkout</p>
                      </div>
                      <p className="text-[#8E7B73] text-sm font-bold">Your delicious choices will be saved.</p>
                      <div className="flex gap-3">
                        <Link
                          to="/login?redirect=/checkout"
                          onClick={closeDrawer}
                          className="flex-1 py-3 rounded-xl bg-[#F7B538] text-[#780116] font-black text-sm text-center shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                        >
                          Sign In
                        </Link>
                        <Link
                          to="/register?redirect=/checkout"
                          onClick={closeDrawer}
                          className="flex-1 py-3 rounded-xl bg-white border border-[#EADDCD] text-[#780116] font-black text-sm text-center hover:bg-[#FDF9F1] shadow-sm transition-all"
                        >
                          Register
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
