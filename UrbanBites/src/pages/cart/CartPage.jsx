import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ShoppingBag, ArrowLeft, MapPin, CreditCard, Plus, Minus, Trash2,
  AlertCircle, Receipt, Loader2, LogIn, UserPlus, UtensilsCrossed, Sparkles,
  CheckCircle2, Package, ChefHat, Utensils, Bike, ShieldCheck
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { cartApi } from '../../api/cartApi';
import { addressApi } from '../../api/userApi';
import { customerOrderApi } from '../../api/orderApi';
import AddressSelector from '../../components/common/AddressSelector';

const IMAGE_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) { resolve(true); return; }
    const s = document.createElement('script');
    s.id = 'razorpay-script';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function CartPage() {
  const navigate = useNavigate();
  const { items, removeItem, addItem, restaurantName, restaurantId, clearCart, getTotalPrice } = useCartStore();
  const { isAuthenticated, user, token } = useAuthStore();

  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [step, setStep] = useState('cart'); // cart → paying → success
  const [error, setError] = useState('');

  const subtotal = getTotalPrice();

  // Real backend fee breakup
  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['cart-checkout-preview', items.length, subtotal, selectedAddressId],
    queryFn: () => cartApi.checkoutPreview(selectedAddressId),
    enabled: isAuthenticated && items.length > 0,
    staleTime: 15000,
    retry: 1,
  });

  const fees = preview?.fees;
  const serviceable = preview?.serviceable ?? true;
  const deliveryFee = fees ? Number(fees.deliveryFee) : 0;
  const tax = fees ? Number(fees.tax) : Math.round(subtotal * 0.05);
  const platformFee = fees ? Number(fees.platformFee) : 5;
  const total = fees ? Number(fees.grandTotal) : subtotal + deliveryFee + tax + platformFee;


  // Payment mutations
  const placeOrderMut = useMutation({ mutationFn: customerOrderApi.placeOrder, onError: (err) => setError(err.response?.data?.message || 'Failed to place order') });
  const paymentMut = useMutation({ mutationFn: customerOrderApi.createPaymentIntent, onError: (err) => setError(err.response?.data?.message || 'Payment intent failed') });
  const simSuccessMut = useMutation({ mutationFn: customerOrderApi.simulatePaymentSuccess });

  // Sync local Zustand cart to the server before placing order
  const syncCartToServer = async () => {
    // 1. Clear existing server cart items
    try { await cartApi.clearCart(); } catch { }

    // 2. Try adding the first item — if 409, the cart entity is tied to a wrong restaurant
    //    We need to get the server cart, remove all its items individually, then retry
    for (const item of items) {
      try {
        const res = await cartApi.addItem(item.id, item.quantity);
        useCartStore.getState().hydrateFromServer(res);
      } catch (err) {
        if (err?.response?.status === 409) {
          // Server cart is tied to a different restaurant — remove all old items individually
          try {
            const serverCart = await cartApi.getCart();
            if (serverCart?.items?.length) {
              for (const si of serverCart.items) {
                try { await cartApi.removeItem(si.id); } catch { }
              }
            }
          } catch { }
          // Retry adding this item (server should create a fresh cart now)
          try {
            const res = await cartApi.addItem(item.id, item.quantity);
            useCartStore.getState().hydrateFromServer(res);
          } catch { }
        }
      }
    }
  };

  const handlePayNow = async () => {
    if (!isAuthenticated) { setShowLoginPrompt(true); return; }
    setError('');
    setStep('paying');
    try {
      // Ensure server cart matches local cart
      await syncCartToServer();
      if (selectedAddressId) await addressApi.setDefault(selectedAddressId);
      const order = await placeOrderMut.mutateAsync({
        addressId: selectedAddressId || undefined,
        recipientName: user?.fullName || undefined,
        recipientPhone: user?.phone || undefined,
      });
      const intent = await paymentMut.mutateAsync(order.orderId);
      if (intent.razorpayOrderId && intent.razorpayKeyId) {
        const loaded = await loadRazorpayScript();
        if (loaded && window.Razorpay) {
          const rzp = new window.Razorpay({
            key: intent.razorpayKeyId, amount: Number(intent.amount) * 100, currency: intent.currency || 'INR',
            name: 'UrbanBites', description: `Order #${order.orderId}`, order_id: intent.razorpayOrderId,
            prefill: { email: user?.email || '', name: user?.fullName || '' },
            theme: { color: '#F7B538', backdrop_color: '#FFFCF5' },
            handler: async function () {
              try { await simSuccessMut.mutateAsync(order.orderId); } catch (e) { console.error(e); }
              clearCart(); navigate(`/orders/${order.orderId}/success`);
            },
            modal: { ondismiss: () => { setStep('cart'); setError('Payment was cancelled.'); } },
          });
          rzp.on('payment.failed', (r) => { setStep('cart'); setError(r.error?.description || 'Payment failed.'); });
          rzp.open();
          return;
        }
      }
      await simSuccessMut.mutateAsync(order.orderId);
      clearCart(); navigate(`/orders/${order.orderId}/success`);
    } catch (e) {
      setStep('cart');
      if (e?.response?.status === 401) setError('Session expired. Please log in again.');
      else if (!error) setError(e?.response?.data?.message || e?.message || 'Something went wrong.');
    }
  };


  // ── Empty cart ──
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFFCF5] font-sans">
        <div className="sticky top-0 z-40 bg-[#FFFCF5]/90 backdrop-blur-xl border-b border-[#EADDCD] shadow-sm">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2.5 rounded-xl bg-white border border-[#EADDCD] text-[#780116] hover:bg-[#FDF9F1] shadow-sm transition-all">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-black text-[#780116] tracking-tight font-display">Cart</h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center p-8 pt-24 text-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-5">
            <div className="w-28 h-28 bg-white border-2 border-[#EADDCD] rounded-full flex items-center justify-center mx-auto shadow-sm">
              <ShoppingBag size={40} className="text-[#F7B538]" />
            </div>
            <h2 className="text-3xl font-display font-black text-[#780116]">Your cart is empty</h2>
            <p className="text-[#8E7B73] font-bold max-w-[300px] mx-auto leading-relaxed">
              Good food is always brewing! Explore restaurants and add some delicious items.
            </p>
            <button
              onClick={() => navigate('/')}
              className="inline-flex px-8 py-4 bg-[#780116] text-white rounded-2xl font-black shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all gap-2 items-center"
            >
              <UtensilsCrossed size={18} /> Browse Restaurants
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFCF5] font-sans">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#FFFCF5]/90 backdrop-blur-xl border-b border-[#EADDCD] shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2.5 rounded-xl bg-white border border-[#EADDCD] text-[#780116] hover:bg-[#FDF9F1] shadow-sm transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-[#780116] tracking-tight font-display">Cart</h1>
            <p className="text-[#8E7B73] text-sm font-bold">{items.length} item{items.length !== 1 ? 's' : ''} from {restaurantName || 'Restaurant'}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="hidden sm:flex items-center gap-1.5 text-sm font-bold text-[#8E7B73] hover:text-[#F7B538] transition-colors px-3 py-2 rounded-xl hover:bg-[#FDF9F1]"
          >
            <Plus size={14} /> Add more
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5 pb-36">

        {/* Restaurant banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#780116] to-[#A00320] rounded-[2rem] p-5 flex items-center gap-4 shadow-premium relative overflow-hidden"
        >
          <div className="absolute inset-0 pointer-events-none">
            <motion.div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 4, repeat: Infinity }} />
          </div>
          <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
            <UtensilsCrossed size={24} className="text-[#F7B538]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-black text-lg truncate">{restaurantName || 'Your Order'}</h2>
            <p className="text-white/60 text-xs font-bold mt-0.5">{items.length} item{items.length !== 1 ? 's' : ''} in cart</p>
          </div>
          {restaurantId && (
            <Link to={`/restaurant/${restaurantId}`} className="text-[#F7B538] text-xs font-black flex items-center gap-1 bg-white/10 px-3 py-2 rounded-xl border border-white/10 hover:bg-white/20 transition-all shrink-0">
              <Plus size={14} /> Add
            </Link>
          )}
        </motion.div>

        {/* Cart Items */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-[2rem] border border-[#EADDCD] shadow-sm overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#EADDCD]">
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} className="text-[#F7B538]" />
              <h3 className="text-lg font-black text-[#780116]">Your Items</h3>
            </div>
            <button
              onClick={() => { if (window.confirm('Clear all items?')) { clearCart(); if (isAuthenticated) cartApi.clearCart().catch(() => { }); } }}
              className="text-xs font-bold text-[#8E7B73] hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all flex items-center gap-1"
            >
              <Trash2 size={12} /> Clear
            </button>
          </div>

          <div className="divide-y divide-[#EADDCD]/60">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                  className="flex items-center justify-between gap-4 px-6 py-4"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`shrink-0 w-4 h-4 rounded-sm border-2 flex items-center justify-center ${item.veg ? 'border-green-600' : 'border-red-600'}`}>
                      <div className={`w-2 h-2 rounded-full ${item.veg ? 'bg-green-600' : 'bg-red-600'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[#2A0800] font-bold text-sm truncate">{item.name}</p>
                      <p className="text-[#8E7B73] text-xs font-bold mt-0.5">₹{item.price} each</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-[#FFFCF5] rounded-xl border border-[#EADDCD] shadow-sm h-9 px-0.5 shrink-0">
                    <button onClick={() => removeItem(item.id)} className="w-8 h-full flex items-center justify-center text-[#780116] hover:text-[#F7B538] transition-colors">
                      <Minus size={14} strokeWidth={3} />
                    </button>
                    <span className="w-7 text-center font-black text-[#2A0800] text-sm tabular-nums">{item.quantity}</span>
                    <button onClick={() => addItem(item, restaurantId, restaurantName)} className="w-8 h-full flex items-center justify-center text-[#780116] hover:text-[#F7B538] transition-colors">
                      <Plus size={14} strokeWidth={3} />
                    </button>
                  </div>

                  <span className="text-[#2A0800] font-black text-sm tabular-nums w-16 text-right shrink-0">
                    ₹{(item.price * item.quantity).toFixed(0)}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Cooking request */}
          <div className="px-6 py-4 border-t border-dashed border-[#EADDCD]">
            <textarea
              placeholder="Any cooking requests? (Optional)"
              className="w-full bg-[#FFFCF5] border-2 border-[#EADDCD] rounded-xl text-sm p-3 text-[#2A0800] placeholder:text-[#AFA49F] outline-none focus:border-[#F7B538] focus:bg-white resize-none shadow-sm font-bold transition-all"
              rows={2}
            />
          </div>
        </motion.section>

        {/* Delivery Address */}
        {isAuthenticated && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-[2rem] p-6 border border-[#EADDCD] shadow-sm"
          >
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={18} className="text-[#F7B538]" />
              <h3 className="text-lg font-black text-[#780116]">Deliver to</h3>
            </div>
            <AddressSelector selectedId={selectedAddressId} onSelect={setSelectedAddressId} variant="full" />
          </motion.section>
        )}

        {/* Bill Summary */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-[2rem] p-6 border border-[#EADDCD] shadow-sm"
        >
          <div className="flex items-center gap-2 mb-5">
            <Receipt size={18} className="text-[#F7B538]" />
            <h3 className="text-lg font-black text-[#780116]">Bill Details</h3>
            <span className="text-[10px] bg-[#FDF9F1] border border-[#F7B538] text-[#F7B538] px-2 py-0.5 rounded-full font-black ml-auto">EST</span>
          </div>

          {isAuthenticated && previewLoading ? (
            <div className="space-y-3 mb-5">
              {[...Array(4)].map((_, i) => <div key={i} className="h-4 bg-black/5 rounded-full animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3 mb-5 text-sm">
              <div className="flex justify-between"><span className="text-[#8E7B73] font-bold">Item Total</span><span className="text-[#2A0800] font-black">₹{subtotal.toFixed(0)}</span></div>
              <div className="flex justify-between"><span className="text-[#8E7B73] font-bold">Delivery Fee</span><span className="text-[#2A0800] font-black">₹{deliveryFee}</span></div>
              <div className="flex justify-between"><span className="text-[#8E7B73] font-bold">Taxes & Charges</span><span className="text-[#2A0800] font-black">₹{tax}</span></div>
              <div className="flex justify-between"><span className="text-[#8E7B73] font-bold">Platform Fee</span><span className="text-[#2A0800] font-black">₹{platformFee}</span></div>
            </div>
          )}

          <div className="flex justify-between items-center py-4 border-t border-dashed border-[#EADDCD]">
            <span className="text-[#780116] font-black text-lg">To Pay</span>
            <span className="text-[#2A0800] font-black text-2xl tracking-tight tabular-nums">₹{total.toLocaleString('en-IN')}</span>
          </div>

          {!serviceable && preview?.serviceabilityReason && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bold shadow-sm">
              <AlertCircle size={14} /> {preview.serviceabilityReason}
            </div>
          )}
        </motion.section>

        {/* Security + error */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600 shadow-sm">
            <AlertCircle size={18} className="shrink-0" />
            <p className="text-sm font-bold flex-1">{error}</p>
          </motion.div>
        )}

        <div className="flex items-center justify-center gap-2 text-[#8E7B73] text-xs font-black py-1 tracking-wide uppercase">
          <ShieldCheck size={14} /> 100% Secure Payment · Razorpay
        </div>

        {/* Continue exploring link */}
        <div className="text-center pt-1">
          <button onClick={() => navigate('/')} className="text-sm font-bold text-[#8E7B73] hover:text-[#F7B538] transition-colors inline-flex items-center gap-1.5">
            <Sparkles size={14} /> Continue Exploring Restaurants
          </button>
        </div>
      </div>

      {/* Fixed bottom pay bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-[#EADDCD] shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[#8E7B73] text-[10px] font-black uppercase tracking-widest">Total</p>
            <p className="text-[#2A0800] font-black text-2xl tracking-tight tabular-nums">₹{total.toLocaleString('en-IN')}</p>
          </div>
          <button
            disabled={!serviceable || items.length === 0 || step === 'paying'}
            onClick={handlePayNow}
            className="relative overflow-hidden flex-1 max-w-[280px] h-14 rounded-2xl bg-[#780116] border-2 border-[#A00320] text-white font-black text-lg shadow-premium hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
          >
            <motion.div animate={{ x: ['-120%', '220%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 4 }} className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 pointer-events-none" />
            <span className="relative z-10 flex items-center gap-2">
              {step === 'paying' ? <><Loader2 size={18} className="animate-spin" /> Processing…</> : isAuthenticated ? <><CreditCard size={18} /> Pay Now</> : <><LogIn size={18} /> Login & Pay</>}
            </span>
          </button>
        </div>
      </div>

      {/* Login Prompt Modal */}
      <AnimatePresence>
        {showLoginPrompt && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLoginPrompt(false)} className="fixed inset-0 bg-[#2A0800]/40 backdrop-blur-md z-[50]" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="bg-[#FFFCF5] border border-[#EADDCD] rounded-[2rem] p-8 max-w-sm w-full text-center shadow-premium">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[#EADDCD] shadow-sm">
                  <LogIn size={28} className="text-[#F7B538]" />
                </div>
                <h3 className="text-2xl font-black text-[#780116] mb-2 font-display">Login Required</h3>
                <p className="text-[#8E7B73] text-sm font-bold mb-8">Sign in to proceed with your order. Your cart items will be preserved!</p>
                <div className="flex flex-col gap-3">
                  <Link to="/login?redirect=/cart" className="w-full py-4 rounded-2xl bg-[#780116] border-2 border-[#A00320] text-white font-black shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    <LogIn size={18} /> Sign In
                  </Link>
                  <Link to="/register?redirect=/cart" className="w-full py-4 rounded-2xl bg-white border border-[#EADDCD] text-[#2A0800] font-black hover:bg-[#FDF9F1] hover:border-[#F7B538] transition-all flex items-center justify-center gap-2 shadow-sm">
                    <UserPlus size={18} /> Create Account
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
