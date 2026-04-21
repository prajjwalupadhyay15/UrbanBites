import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { cartApi } from '../../api/cartApi';
import { Plus, Minus, Leaf, Drumstick } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

const IMAGE_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

export default function MenuItemCard({ item, restaurantId, restaurantName }) {
  const { items, addItem, removeItem } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const cartItem = items.find((i) => i.id === item.id);
  const quantity = cartItem?.quantity || 0;

  const imgSrc = item.imagePath
    ? item.imagePath.startsWith('http') ? item.imagePath : `${IMAGE_BASE}${item.imagePath}`
    : null;

  const handleAdd = async (e) => {
    e?.stopPropagation();
    if (!item.available) return;
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    addItem(
      { id: item.id, name: item.name, price: Number(item.price), imagePath: item.imagePath, veg: item.veg },
      restaurantId,
      restaurantName
    );
    if (isAuthenticated && !syncing) {
      setSyncing(true);
      try {
        const cart = await cartApi.addItem(item.id, 1);
        useCartStore.getState().hydrateFromServer(cart);
        toast.success(`${item.name} added to cart`, { id: `cart-${item.id}` });
      } catch (err) {
        if (err?.response?.status === 409) {
          // Server cart tied to different restaurant — remove old items, retry
          try {
            const serverCart = await cartApi.getCart();
            if (serverCart?.items?.length) {
              for (const si of serverCart.items) {
                try { await cartApi.removeItem(si.id); } catch {}
              }
            }
            const cart = await cartApi.addItem(item.id, 1);
            useCartStore.getState().hydrateFromServer(cart);
          } catch {}
        }
      }
      finally { setSyncing(false); }
    }
  };

  const handleRemove = async (e) => {
    e?.stopPropagation();
    const current = useCartStore.getState().items.find((i) => i.id === item.id);
    if (!current) return;
    removeItem(item.id);
    if (isAuthenticated && current.cartItemId && !syncing) {
      setSyncing(true);
      try {
        if (current.quantity <= 1) {
          await cartApi.removeItem(current.cartItemId);
        } else {
          const cart = await cartApi.updateItem(current.cartItemId, current.quantity - 1);
          useCartStore.getState().hydrateFromServer(cart);
        }
      } catch { }
      finally { setSyncing(false); }
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`relative bg-white border border-[#EADDCD] hover:border-[#F7B538]/50 rounded-3xl p-4 flex gap-4 group transition-colors shadow-sm hover:shadow-glow-orange overflow-visible
        ${!item.available ? 'opacity-60 grayscale-[0.5]' : ''}`}
    >
      {/* Veg/Non-veg indicator */}
      <div className={`absolute top-4 left-4 z-10 w-5 h-5 rounded border-[1.5px] bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm
        ${item.veg ? 'border-green-600' : 'border-red-600'}`}>
        <div className={`w-2.5 h-2.5 rounded-full ${item.veg ? 'bg-green-600' : 'bg-red-600'}`} />
      </div>

      {/* Text Content */}
      <div className="flex-1 flex flex-col min-w-0 pt-6">
        <h3 className="font-black text-[#2A0800] text-lg leading-tight tracking-tight line-clamp-2 mb-1">{item.name}</h3>
        <p className="text-[#780116] font-black text-base mb-2">₹{Number(item.price).toFixed(0)}</p>
        <p className="text-[#8E7B73] text-xs font-bold leading-relaxed line-clamp-2 mt-auto">
          {item.description || 'Freshly prepared with premium ingredients and served hot.'}
        </p>
        {!item.available && (
          <span className="mt-2 text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-50 w-fit px-2 py-0.5 rounded-full">Unavailable</span>
        )}
      </div>

      {/* Image + Controls */}
      <div className="w-[120px] shrink-0 flex flex-col items-center relative pb-6">
        {/* Image */}
        <div className="w-full aspect-square rounded-2xl overflow-hidden bg-[#FFFCF5] relative shadow-inner">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={item.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-30">
              {item.veg
                ? <Leaf size={32} className="text-green-600" />
                : <Drumstick size={32} className="text-red-600" />}
            </div>
          )}
          {/* Subtle overlay for contrast */}
          <div className="absolute inset-0 bg-black/5" />
        </div>

        {/* Add/Qty controls */}
        <div className="absolute -bottom-2 w-full flex justify-center z-20">
          <AnimatePresence mode="wait">
            {quantity > 0 ? (
              <motion.div
                key="qty"
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="flex items-center bg-white border-2 border-[#F7B538] rounded-xl h-10 shadow-lg overflow-hidden"
              >
                <button
                  onClick={handleRemove}
                  className="w-9 h-full flex items-center justify-center text-[#780116] hover:bg-[#FDF9F1] active:bg-[#F7B538]/20 transition-colors"
                >
                  <Minus size={16} strokeWidth={3} />
                </button>
                <motion.span
                  key={quantity}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-8 text-center font-black text-[#2A0800] text-sm tabular-nums"
                >
                  {quantity}
                </motion.span>
                <button
                  onClick={handleAdd}
                  disabled={!item.available}
                  className="w-9 h-full flex items-center justify-center text-[#780116] hover:bg-[#FDF9F1] active:bg-[#F7B538]/20 transition-colors"
                >
                  <Plus size={16} strokeWidth={3} />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="add"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAdd}
                disabled={!item.available}
                className="bg-white border-2 border-[#EADDCD] hover:border-[#F7B538] hover:bg-[#FFFCF5] text-[#780116] font-black text-sm tracking-wide rounded-xl shadow-md px-5 h-10 flex items-center gap-1.5 transition-all hover:shadow-glow-orange disabled:opacity-40 disabled:cursor-not-allowed group-hover:border-[#F7B538]"
              >
                ADD <Plus size={14} strokeWidth={3} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
