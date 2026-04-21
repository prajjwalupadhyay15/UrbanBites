import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { restaurantApi } from '../../api/restaurantApi';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Star, Clock, MapPin, Utensils, Wifi, WifiOff } from 'lucide-react';
import MenuItemCard from '../../components/specific/MenuItemCard';
import CartFloatingBar from '../../components/specific/CartFloatingBar';

const IMAGE_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

function SkeletonRow() {
  return (
    <div className="bg-white rounded-3xl border border-[#EADDCD] p-4 flex gap-4 shadow-sm">
      <div className="flex-1 space-y-3 pt-5">
        <div className="h-4 bg-[#EADDCD] rounded-full w-3/4 animate-pulse" />
        <div className="h-3 bg-[#EADDCD]/60 rounded-full w-1/4 animate-pulse" />
        <div className="h-3 bg-[#EADDCD]/40 rounded-full w-full animate-pulse mt-4" />
        <div className="h-3 bg-[#EADDCD]/40 rounded-full w-2/3 animate-pulse" />
      </div>
      <div className="w-[120px] aspect-square rounded-2xl bg-[#FFFCF5] border border-[#EADDCD] animate-pulse" />
    </div>
  );
}

export default function RestaurantDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [filterVeg, setFilterVeg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch menu items
  const { data: menuItems = [], isLoading, isError } = useQuery({
    queryKey: ['restaurant-menu', id],
    queryFn: () => restaurantApi.getPublicMenu(id),
    retry: 1,
    staleTime: 1000 * 60 * 2,
  });

  // Fetch restaurant info
  const { data: restaurantInfo } = useQuery({
    queryKey: ['restaurant-info', id],
    queryFn: () => restaurantApi.getRestaurantInfo(id),
    staleTime: 1000 * 60 * 5,
  });

  const restaurantId = menuItems[0]?.restaurantId ?? Number(id);
  const restaurantName = restaurantInfo?.name || (menuItems.length > 0 ? `Restaurant` : `Restaurant #${id}`);
  const restaurantAddress = restaurantInfo?.addressLine
    ? `${restaurantInfo.addressLine}, ${restaurantInfo.city || ''}`
    : null;
  const restaurantRating = restaurantInfo?.avgRating ? Number(restaurantInfo.avgRating).toFixed(1) : null;
  const ratingCount = restaurantInfo?.ratingCount || 0;
  const isOpen = restaurantInfo?.openNow ?? true;
  const restaurantImage = restaurantInfo?.imagePath
    ? (restaurantInfo.imagePath.startsWith('http') ? restaurantInfo.imagePath : `${IMAGE_BASE}${restaurantInfo.imagePath}`)
    : null;

  const categories = [...new Set(menuItems.map((i) => i.category || 'Menu'))];

  const filteredItems = menuItems.filter((item) => {
    if (filterVeg === true && !item.veg) return false;
    if (filterVeg === false && item.veg) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!item.name.toLowerCase().includes(q) && !(item.description || '').toLowerCase().includes(q))
        return false;
    }
    return true;
  });

  const vegCount = menuItems.filter((i) => i.veg).length;
  const nonVegCount = menuItems.filter((i) => !i.veg).length;

  return (
    <div className="min-h-screen bg-[#FFFCF5] pb-36 font-sans">

      {/* Hero banner */}
      <section className="relative h-72 sm:h-[400px] overflow-hidden rounded-b-[3rem] shadow-sm bg-white">
        {/* Background image or gradient */}
        {restaurantImage ? (
          <>
            <img
              src={restaurantImage}
              alt={restaurantName}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-[#F7B538]" />
            <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC43IiBudW1PY3RhdmVzPSI0IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjUiLz48L3N2Zz4=')]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#780116]/90 via-transparent to-transparent" />
          </>
        )}

        {/* Back button */}
        <Link
          to="/"
          className="absolute top-24 left-4 sm:left-8 z-30 flex items-center gap-2 bg-white text-[#780116] border border-[#EADDCD] hover:bg-[#FDF9F1] hover:border-[#F7B538] font-black px-5 py-2.5 rounded-full transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
        >
          <ArrowLeft size={18} /> Back
        </Link>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-12 pb-8 pt-20">
          <div className="max-w-5xl mx-auto">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl sm:text-6xl font-display font-black text-white tracking-tight mb-3 drop-shadow-md"
            >
              {restaurantName}
            </motion.h1>

            {/* Restaurant description */}
            {restaurantInfo?.description && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-white text-sm sm:text-base font-bold mb-5 max-w-2xl drop-shadow-md"
              >
                {restaurantInfo.description}
              </motion.p>
            )}

            <div className="flex flex-wrap gap-3">
              {/* Rating */}
              <span className="bg-white text-[#780116] text-sm font-black px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md">
                <Star size={14} className="fill-[#F7B538] text-[#F7B538]" />
                {restaurantRating || '—'}
                {ratingCount > 0 && <span className="text-[#8E7B73] font-bold ml-1">({ratingCount})</span>}
              </span>

              {/* Open/Closed status */}
              <span className={`bg-white text-sm font-black px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md ${
                isOpen ? 'text-green-600' : 'text-red-600'
              }`}>
                {isOpen ? <Wifi size={14} /> : <WifiOff size={14} />}
                {isOpen ? 'Open Now' : 'Closed'}
              </span>

              {/* Menu count */}
              <span className="bg-white text-[#2A0800] text-sm font-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-md">
                <Utensils size={14} className="text-[#780116]" />
                {menuItems.length} items
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky filters */}
      <div className="sticky top-[72px] z-30 bg-[#FFFCF5]/95 backdrop-blur-xl border-b border-[#EADDCD] shadow-sm py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row gap-4 items-center">
          
          {/* Veg filter */}
          <div className="flex bg-white border border-[#EADDCD] rounded-2xl p-1.5 gap-1 w-full sm:w-auto shadow-sm">
            {[
              { label: 'All Menu', val: null },
              { label: 'Veg Only 🌿', val: true },
              { label: 'Non-Veg 🍗', val: false },
            ].map(({ label, val }) => (
              <button
                key={label}
                onClick={() => setFilterVeg(val)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-bold transition-all
                  ${filterVeg === val
                    ? 'bg-[#780116] text-white shadow-md'
                    : 'text-[#8E7B73] hover:text-[#2A0800] hover:bg-[#FDF9F1]'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E7B73]" size={18} />
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#EADDCD] text-[#2A0800] text-base font-bold rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-[#F7B538] focus:ring-4 focus:ring-[#F7B538]/10 transition-all placeholder:text-[#AFA49F] shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : isError ? (
          <div className="py-24 text-center">
            <div className="text-6xl mb-6">⚠️</div>
            <h3 className="text-2xl font-black text-[#780116] mb-2">Oops!</h3>
            <p className="text-[#8E7B73] font-bold text-lg">Could not load the menu right now.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {categories.map((cat) => {
              const catItems = filteredItems.filter((i) => (i.category || 'Menu') === cat);
              if (catItems.length === 0) return null;
              return (
                <section key={cat}>
                  <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-3xl font-display font-black text-[#780116] tracking-tight">{cat}</h2>
                    <div className="flex-1 h-0.5 bg-[#EADDCD] rounded-full" />
                    <span className="text-sm font-black text-[#8E7B73] bg-white px-3 py-1 rounded-full border border-[#EADDCD] shadow-sm">{catItems.length} items</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {catItems.map((item, idx) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ delay: (idx % 4) * 0.1, type: "spring", stiffness: 300, damping: 24 }}
                      >
                        <MenuItemCard item={item} restaurantId={restaurantId} restaurantName={restaurantName} />
                      </motion.div>
                    ))}
                  </div>
                </section>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="py-24 text-center">
                <div className="text-6xl mb-6">🍽️</div>
                <h3 className="text-2xl font-black text-[#780116] mb-2">Nothing found</h3>
                <p className="text-[#8E7B73] font-bold text-lg">Try searching for something else or clearing filters.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <CartFloatingBar />
    </div>
  );
}
