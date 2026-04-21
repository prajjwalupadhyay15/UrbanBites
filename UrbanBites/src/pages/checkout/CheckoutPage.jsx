import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { cartApi } from '../../api/cartApi';
import { addressApi } from '../../api/userApi';
import { customerOrderApi } from '../../api/orderApi';
import AddressSelector from '../../components/common/AddressSelector';
import {
  MapPin, Receipt, ShieldCheck, CreditCard, Plus, Minus,
  ArrowLeft, Package, AlertCircle, CheckCircle2, Loader2,
  ChefHat, Utensils, Bike, PartyPopper
} from 'lucide-react';

const IMAGE_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

// Load Razorpay script dynamically
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

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, restaurantName, restaurantId, clearCart, getTotalPrice, addItem, removeItem } = useCartStore();
  const { user, isAuthenticated, token } = useAuthStore();

  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [step, setStep] = useState('review'); // review → paying → success
  const [error, setError] = useState('');
  const [placedOrderId, setPlacedOrderId] = useState(null);
  const [orderedItems, setOrderedItems] = useState([]);
  const [orderedRestaurant, setOrderedRestaurant] = useState('');
  const [orderedTotal, setOrderedTotal] = useState(0);
  const didRedirect = useRef(false);

  // Auth guard — only redirect once, and only on initial mount
  useEffect(() => {
    if (!isAuthenticated && !token && !didRedirect.current) {
      didRedirect.current = true;
      navigate('/login?redirect=/checkout');
    }
  }, []);

  // Empty cart guard — only during review step
  useEffect(() => {
    if (items.length === 0 && step === 'review' && !placedOrderId) {
      navigate('/');
    }
  }, [items.length, step]);

  // Checkout preview (real backend pricing)
  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['checkout-preview'],
    queryFn: cartApi.checkoutPreview,
    staleTime: 30000,
    enabled: items.length > 0 && isAuthenticated,
  });

  const fees = preview?.fees;
  const serviceable = preview?.serviceable ?? true;

  // Local fallback when backend fees are unavailable
  const localSubtotal = getTotalPrice();
  const localTax = Math.round(localSubtotal * 0.05);
  const localPlatformFee = 5;
  const localGrandTotal = localSubtotal + localTax + localPlatformFee;

  const billItems = fees
    ? [
        { label: 'Item Total', value: Number(fees.subtotal) },
        { label: 'Delivery Fee', value: Number(fees.deliveryFee), sub: fees.distanceKm ? `${Number(fees.distanceKm).toFixed(1)} km` : null },
        ...(Number(fees.packingCharge) > 0 ? [{ label: 'Packing Charge', value: Number(fees.packingCharge) }] : []),
        { label: 'Platform Fee', value: Number(fees.platformFee) },
        { label: 'Tax', value: Number(fees.tax) },
        ...(Number(fees.discount) > 0 ? [{ label: 'Discount', value: -Number(fees.discount), isDiscount: true }] : []),
      ]
    : [
        { label: 'Item Total', value: localSubtotal },
        { label: 'Delivery Fee', value: 0, sub: 'Calculated at order' },
        { label: 'Platform Fee', value: localPlatformFee },
        { label: 'Tax (est.)', value: localTax },
      ];
  const grandTotal = fees ? Number(fees.grandTotal) : localGrandTotal;
  const hasSurge = fees && Number(fees.surgeMultiplier) > 1;

  // Mutations
  const placeOrderMut = useMutation({
    mutationFn: customerOrderApi.placeOrder,
    onError: (err) => setError(err.response?.data?.message || 'Failed to place order'),
  });

  const paymentMut = useMutation({
    mutationFn: customerOrderApi.createPaymentIntent,
    onError: (err) => setError(err.response?.data?.message || 'Payment intent failed'),
  });

  const simSuccessMut = useMutation({
    mutationFn: customerOrderApi.simulatePaymentSuccess,
  });

  const handlePlaceOrder = async () => {
    setError('');
    setStep('paying');
    try {
      // Step 0: Set the selected address as default
      if (selectedAddressId) {
        await addressApi.setDefault(selectedAddressId);
      }

      // Save items before they get cleared
      setOrderedItems([...items]);
      setOrderedRestaurant(restaurantName || '');
      setOrderedTotal(grandTotal);

      // Step 1: Place the order
      const order = await placeOrderMut.mutateAsync();
      setPlacedOrderId(order.orderId);

      // Step 2: Create Razorpay payment intent
      const intent = await paymentMut.mutateAsync(order.orderId);

      // Step 3: If Razorpay is available, open checkout
      if (intent.razorpayOrderId && intent.razorpayKeyId) {
        const loaded = await loadRazorpayScript();
        if (loaded && window.Razorpay) {
          const options = {
            key: intent.razorpayKeyId,
            amount: Number(intent.amount) * 100,
            currency: intent.currency || 'INR',
            name: 'UrbanBites',
            description: `Order #${order.orderId}`,
            order_id: intent.razorpayOrderId,
            prefill: {
              email: user?.email || '',
              name: user?.fullName || '',
            },
            theme: { color: '#F7B538', backdrop_color: '#FFFCF5' },
            handler: async function (response) {
              // Note: Since this is local dev, Razorpay webhooks cannot hit localhost:8080.
              // We must manually trigger the simulate endpoint to advance the order state.
              try {
                await simSuccessMut.mutateAsync(order.orderId);
              } catch (e) {
                console.error("Failed to notify backend of payment success:", e);
              }
              clearCart();
              setStep('success');
            },
            modal: {
              ondismiss: function () {
                setStep('review');
                setError('Payment was cancelled. You can try again.');
              },
            },
          };
          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', function (response) {
            setStep('review');
            setError(response.error?.description || 'Payment failed. Please try again.');
          });
          rzp.open();
          return;
        }
      }

      // Fallback: simulate success (dev mode when Razorpay not configured)
      await simSuccessMut.mutateAsync(order.orderId);
      clearCart();
      setStep('success');
    } catch (e) {
      setStep('review');
      if (e?.response?.status === 401) {
        setError('Session expired. Please log in again to complete your payment.');
      } else if (!error) {
        // Only set if not already set by a mutation's onError
        setError(e?.response?.data?.message || e?.message || 'Something went wrong. Please try again.');
      }
    }
  };

  // ── Success Screen (Zomato-style) ──
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#FFFCF5] flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-sm w-full"
        >
          {/* Animated confetti dots */}
          <div className="relative w-32 h-32 mx-auto mb-8">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  x: [0, Math.cos((i * Math.PI) / 4) * 60],
                  y: [0, Math.sin((i * Math.PI) / 4) * 60],
                }}
                transition={{ delay: 0.3 + i * 0.08, duration: 1.2, ease: 'easeOut' }}
                className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full"
                style={{ backgroundColor: ['#F7B538', '#780116', '#22c55e', '#3b82f6'][i % 4] }}
              />
            ))}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
              className="absolute inset-0 bg-green-50 border-2 border-green-200 rounded-full flex items-center justify-center shadow-sm"
            >
              <CheckCircle2 size={56} className="text-green-500" />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h1 className="text-4xl font-display font-black text-[#780116] mb-2 tracking-tight">Order Placed! 🎉</h1>
            <p className="text-[#8E7B73] text-sm font-bold mb-4">
              Payment successful. Your food is on its way!
            </p>
          </motion.div>

          {/* Order details card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white border border-[#EADDCD] shadow-sm rounded-3xl p-6 mb-4 text-left"
          >
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#EADDCD]">
              <div>
                <p className="text-[#780116] font-black text-base">{orderedRestaurant || 'Your Order'}</p>
                {placedOrderId && <p className="text-[#8E7B73] text-xs font-bold mt-0.5">Order #{placedOrderId}</p>}
              </div>
              <span className="text-[#2A0800] font-black text-xl">₹{orderedTotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="space-y-3">
              {orderedItems.map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center ${item.veg ? 'border-green-600' : 'border-red-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${item.veg ? 'bg-green-600' : 'bg-red-600'}`} />
                    </span>
                    <span className="text-[#780116] text-sm font-bold">{item.name}</span>
                    <span className="text-[#8E7B73] text-xs">×{item.quantity}</span>
                  </div>
                  <span className="text-[#2A0800] text-sm font-black">₹{(item.price * item.quantity).toFixed(0)}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Status timeline preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white border border-[#EADDCD] shadow-sm rounded-3xl p-6 mb-8 text-left"
          >
            <p className="text-[#8E7B73] text-[10px] font-black uppercase tracking-widest mb-4">What's happening next</p>
            <div className="space-y-4">
              {[
                { icon: ChefHat, label: 'Restaurant notified', desc: 'Waiting for confirmation', active: true },
                { icon: Utensils, label: 'Food preparation', desc: 'Chef will start cooking', active: false },
                { icon: Bike, label: 'Delivery assigned', desc: 'Agent will pick up your order', active: false },
              ].map(({ icon: Icon, label, desc, active }, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    active ? 'bg-[#FDF9F1] border-2 border-[#F7B538]' : 'bg-white border border-[#EADDCD]'
                  }`}>
                    <Icon size={18} className={active ? 'text-[#F7B538]' : 'text-[#EADDCD]'} />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${active ? 'text-[#780116]' : 'text-[#8E7B73]'}`}>{label}</p>
                    <p className="text-[#8E7B73] text-xs">{desc}</p>
                  </div>
                  {active && (
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="ml-auto w-2.5 h-2.5 rounded-full bg-[#F7B538]"
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="space-y-4"
          >
            <button
              onClick={() => navigate(`/orders/${placedOrderId}/track`)}
              className="w-full py-4 rounded-2xl bg-[#780116] border-2 border-[#A00320] text-white font-black text-lg shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Package size={20} /> Track Order
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-4 rounded-2xl bg-white border border-[#EADDCD] text-[#780116] font-bold text-sm hover:bg-[#FDF9F1] hover:border-[#F7B538] transition-all shadow-sm"
            >
              Back to Home
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Don't render checkout UI if not authenticated
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#FFFCF5] font-sans">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#FFFCF5]/90 backdrop-blur-xl border-b border-[#EADDCD] shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/cart')} className="p-2.5 rounded-xl bg-white border border-[#EADDCD] text-[#780116] hover:bg-[#FDF9F1] shadow-sm transition-all">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-[#780116] tracking-tight font-display">Checkout</h1>
            <p className="text-[#8E7B73] text-sm font-bold">{restaurantName}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600 shadow-sm">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-sm font-bold flex-1">{error}</p>
            {error.includes('Session expired') && (
              <button
                onClick={() => navigate('/login?redirect=/checkout')}
                className="shrink-0 px-4 py-2 bg-white border border-red-200 rounded-lg text-red-600 text-sm font-bold hover:bg-red-50 transition-colors shadow-sm"
              >
                Re-login
              </button>
            )}
          </motion.div>
        )}

        {/* Delivery Address */}
        <section className="bg-white border border-[#EADDCD] rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={20} className="text-[#F7B538]" />
            <h3 className="text-lg font-black text-[#780116]">Delivery Address</h3>
          </div>
          <AddressSelector
            selectedId={selectedAddressId}
            onSelect={setSelectedAddressId}
            variant="full"
          />
        </section>

        {/* Order Items — with quantity controls and "Add more" */}
        <section className="bg-white border border-[#EADDCD] rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Package size={20} className="text-[#F7B538]" />
              <h3 className="text-lg font-black text-[#780116]">Your Items</h3>
              <span className="text-[#8E7B73] text-sm font-bold ml-1">{items.length} item{items.length !== 1 ? 's' : ''}</span>
            </div>
            {restaurantId && (
              <Link
                to={`/restaurant/${restaurantId}`}
                className="text-[#F7B538] text-sm font-black flex items-center gap-1 hover:text-[#780116] transition-colors"
              >
                <Plus size={14} /> Add more
              </Link>
            )}
          </div>
          <div className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center shrink-0 ${item.veg ? 'border-green-600' : 'border-red-600'}`}>
                    <span className={`w-2 h-2 rounded-full ${item.veg ? 'bg-green-600' : 'bg-red-600'}`} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[#780116] font-bold text-base truncate">{item.name}</p>
                    <p className="text-[#2A0800] text-sm font-bold">₹{item.price}</p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 bg-[#FFFCF5] border border-[#EADDCD] shadow-inner rounded-xl h-10 px-0.5 shrink-0">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="w-8 h-full flex items-center justify-center text-[#780116] hover:text-[#F7B538] transition-colors"
                  >
                    <Minus size={16} strokeWidth={3} />
                  </button>
                  <span className="w-6 text-center font-black text-[#2A0800] text-sm tabular-nums">{item.quantity}</span>
                  <button
                    onClick={() => addItem(item, restaurantId, restaurantName)}
                    className="w-8 h-full flex items-center justify-center text-[#780116] hover:text-[#F7B538] transition-colors"
                  >
                    <Plus size={16} strokeWidth={3} />
                  </button>
                </div>
                <span className="text-[#2A0800] font-black text-base tabular-nums shrink-0 w-16 text-right">
                  ₹{(item.price * item.quantity).toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Bill Details — always visible */}
        <section className="bg-white border border-[#EADDCD] rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Receipt size={20} className="text-[#F7B538]" />
            <h3 className="text-lg font-black text-[#780116]">Bill Details</h3>
            {!fees && !previewLoading && (
              <span className="text-[10px] bg-[#FDF9F1] border border-[#F7B538] text-[#F7B538] px-2 py-0.5 rounded-full font-black ml-auto">
                ESTIMATED
              </span>
            )}
          </div>
          {previewLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => <div key={i} className="h-4 bg-black/5 rounded-full animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {billItems.map(({ label, value, sub, isDiscount }) => (
                <div key={label} className="flex justify-between">
                  <div>
                    <span className="text-[#8E7B73] text-sm font-bold">{label}</span>
                    {sub && <span className="text-[#8E7B73] text-[10px] ml-1.5 opacity-70">({sub})</span>}
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${isDiscount ? 'text-green-600' : 'text-[#2A0800]'}`}>
                    {isDiscount ? `-₹${Math.abs(value)}` : `₹${value}`}
                  </span>
                </div>
              ))}
              {hasSurge && (
                <div className="flex justify-between">
                  <span className="text-[#F7B538] text-sm font-black flex items-center gap-1"><AlertCircle size={14} /> Surge Pricing</span>
                  <span className="text-[#F7B538] text-sm font-black">{fees.surgeMultiplier}×</span>
                </div>
              )}
              <div className="border-t border-dashed border-[#EADDCD] pt-4 flex justify-between items-center">
                <span className="text-[#780116] font-black text-lg">To Pay</span>
                <span className="text-[#2A0800] font-black text-2xl tabular-nums tracking-tight">₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          {!serviceable && preview?.serviceabilityReason && (
            <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm font-bold shadow-sm">
              <AlertCircle size={18} /> {preview.serviceabilityReason}
            </div>
          )}
        </section>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 text-[#8E7B73] text-xs font-black py-2 tracking-wide uppercase">
          <ShieldCheck size={16} />
          100% Secure Payment · Powered by Razorpay
        </div>

        {/* Pay button */}
        <button
          onClick={handlePlaceOrder}
          disabled={step === 'paying' || !serviceable || previewLoading || items.length === 0 || !selectedAddressId}
          className="w-full relative overflow-hidden h-16 rounded-[1.5rem] bg-[#780116] border-2 border-[#A00320] text-white font-black text-xl shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-3 group"
        >
          <motion.div
            animate={{ x: ['-120%', '220%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 4 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none"
          />
          <span className="relative z-10 flex items-center gap-2">
            {step === 'paying' ? (
              <><Loader2 size={20} className="animate-spin" /> Processing…</>
            ) : !selectedAddressId ? (
              <><MapPin size={20} /> Select Address First</>
            ) : (
              <><CreditCard size={20} /> Pay ₹{grandTotal.toLocaleString('en-IN')}</>
            )}
          </span>
        </button>

        <div className="h-8" />
      </div>
    </div>
  );
}
