import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { restaurantApi } from '../../api/restaurantApi';
import { Link, useNavigate } from 'react-router-dom';
import RestaurantCard from '../../components/specific/RestaurantCard';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Search, MapPin, ChevronRight, Star, Clock, Sparkles, ArrowRight, Flame, Zap } from 'lucide-react';
import { useLocationStore } from '../../store/locationStore';

/* ─── Bright Appetizing Food Categories ─── */
const CATEGORIES = [
  { id: 1, name: 'Biryani', emoji: '🍛', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&auto=format&fit=crop&q=80' },
  { id: 2, name: 'Pizza', emoji: '🍕', image: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=400&auto=format&fit=crop&q=80' },
  { id: 3, name: 'Burgers', emoji: '🍔', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80' },
  { id: 4, name: 'Sushi', emoji: '🍱', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&auto=format&fit=crop&q=80' },
  { id: 5, name: 'Desserts', emoji: '🍰', image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&auto=format&fit=crop&q=80' },
  { id: 6, name: 'Rolls', emoji: '🌯', image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&auto=format&fit=crop&q=80' },
  { id: 7, name: 'Noodles', emoji: '🍜', image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&auto=format&fit=crop&q=80' },
  { id: 8, name: 'Thali', emoji: '🥘', image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&auto=format&fit=crop&q=80' },
];

/* ─── Fun Transparent Foods for Hero ─── */
const HERO_FOODS = [
  { id: 1, title: 'Crispy Burger', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=90', top: '10%', left: '5%' },
  { id: 2, title: 'Spicy Noodles', img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=90', top: '60%', left: '15%' },
  { id: 3, title: 'Fresh Sushi', img: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&auto=format&fit=crop&q=90', top: '20%', right: '5%' },
  { id: 4, title: 'Hot Pizza', img: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=600&auto=format&fit=crop&q=90', top: '70%', right: '15%' },
];

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3">
      <div className="w-full aspect-[4/3] rounded-[2rem] bg-[#EADDCD]/30" />
      <div className="space-y-2 px-1">
        <div className="h-4 bg-[#EADDCD]/30 rounded-full w-3/4" />
        <div className="h-3 bg-[#EADDCD]/30 rounded-full w-1/2" />
      </div>
    </div>
  );
}

// ─── Beautiful Hero Metrics ───
function HeroMetrics() {
  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-6 mt-12 w-full max-w-4xl mx-auto z-20 relative">
      {/* Trust Badges */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ type: "spring", stiffness: 200, delay: 0.5 }} 
        className="flex flex-wrap justify-center gap-4"
      >
        <div className="flex items-center gap-2 bg-white rounded-full px-5 py-4 shadow-sm hover:shadow-glow-orange hover:-translate-y-1 transition-all cursor-pointer">
           <Zap size={18} className="text-[#F7B538] fill-[#F7B538] animate-bounce-slow" />
           <span className="font-black text-[#780116] text-sm">Lightning Fast</span>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-full px-5 py-4 shadow-sm hover:shadow-glow-orange hover:-translate-y-1 transition-all cursor-pointer">
           <Star size={18} className="text-[#F7B538] fill-[#F7B538] animate-pulse-orange" />
           <span className="font-black text-[#780116] text-sm">Top Rated Spots</span>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-full px-5 py-4 shadow-sm hover:shadow-glow-orange hover:-translate-y-1 transition-all cursor-pointer">
           <Flame size={18} className="text-[#F7B538] fill-[#F7B538]" />
           <span className="font-black text-[#780116] text-sm">Hot & Fresh</span>
        </div>
      </motion.div>
    </div>
  );
}

export default function HomePage() {
  const { lat, lng, locationName } = useLocationStore();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 150]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -150]);

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ['restaurants', 'discovery', lat, lng],
    queryFn: () => restaurantApi.discover({ latitude: lat, longitude: lng, radiusKm: 30 }),
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFCF5] text-[#2A0800] overflow-x-hidden">

      {/* ════════════════════════════════════════════
          VIBRANT HERO SECTION (Xanthous Base)
      ════════════════════════════════════════════ */}
      <section className="relative pt-32 pb-16 lg:pb-20 min-h-[95vh] flex flex-col items-center justify-center bg-[#F7B538] overflow-hidden rounded-b-[3rem] shadow-premium">
        
        {/* Playful Floating Background Elements */}
        {HERO_FOODS.map((food, i) => (
          <motion.div
            key={food.id}
            style={{ y: i % 2 === 0 ? y1 : y2, top: food.top, left: food.left, right: food.right }}
            className="absolute hidden lg:block w-40 h-40 rounded-full border-8 border-white/20 overflow-hidden shadow-2xl z-0 mix-blend-luminosity opacity-40 hover:mix-blend-normal hover:opacity-100 transition-all duration-500 cursor-pointer"
            animate={{ rotate: 360 }}
            transition={{ duration: 40 + i * 5, repeat: Infinity, ease: "linear" }}
          >
            <img src={food.img} className="w-full h-full object-cover" alt="" />
          </motion.div>
        ))}

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
          
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}
            className="inline-flex items-center gap-2 bg-white rounded-full px-5 py-2.5 mb-8 shadow-glow-orange border-2 border-white/50">
            <MapPin size={16} className="text-[#780116]" />
            <span className="text-sm font-bold text-[#780116]">Dropping joy in <span className="text-[#2A0800]">{locationName}</span></span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", bounce: 0.4, delay: 0.1 }}
            className="text-6xl sm:text-7xl lg:text-[6rem] font-display font-black tracking-tight leading-[0.95] text-[#780116] mb-6">
            Craving Something <br/>
            <span className="text-white drop-shadow-md">Delicious?</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-[#5A3825] text-lg sm:text-2xl font-bold max-w-2xl mx-auto mb-10">
            The city's best food, delivered to your door with lightning speed and a big smile.
          </motion.p>

          {/* Chunky, Playful Search Bar */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="w-full max-w-2xl mx-auto px-4 z-10">
            <form onSubmit={handleSearchSubmit} className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#F7B538]" size={24} />
              <input type="text" placeholder="Search for pizza, burgers, thali..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white text-[#2A0800] rounded-full py-5 pl-16 pr-6 outline-none focus:ring-8 focus:ring-white/30 transition-all font-bold placeholder:text-[#AFA49F] text-lg shadow-xl" />
            </form>
          </motion.div>

          {/* Beautiful Metrics / Badges */}
          <HeroMetrics />

        </div>
      </section>

      {/* ════════════════════════════════════════════
          CATEGORIES (Bright Pills)
      ════════════════════════════════════════════ */}
      <motion.section 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        className="py-16 mt-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20"
      >
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-4xl font-display font-black text-[#780116]">Explore Categories</h2>
            <p className="text-[#8E7B73] font-bold mt-2 text-lg">Find exactly what you're hungry for</p>
          </div>
        </div>
        
        <div className="flex overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 gap-4 custom-scrollbar">
          {CATEGORIES.map((cat, i) => (
            <motion.button key={cat.id}
              whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/search?q=${encodeURIComponent(cat.name)}`)}
              className={`flex-shrink-0 flex items-center gap-3 pr-6 p-2 rounded-full transition-all border-2 shadow-sm bg-white border-[#EADDCD] hover:border-[#F7B538] text-[#2A0800]`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-[#FDF9F1] border border-[#F1E6D8]`}>
                {cat.emoji}
              </div>
              <span className="text-lg font-black tracking-wide">
                {cat.name}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* ════════════════════════════════════════════
          RESTAURANT GRID
      ════════════════════════════════════════════ */}
      <motion.section 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        className="pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20"
      >
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-4xl font-display font-black text-[#780116]">Top Picks for You</h2>
            <p className="text-[#8E7B73] text-lg font-bold mt-2">{isLoading ? 'Finding the best spots…' : `${restaurants.length} delicious options`}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : restaurants.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {restaurants.map((r, idx) => (
              <motion.div key={r.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: idx * 0.05 }} className="h-full bouncy-card">
                <RestaurantCard restaurant={r} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-32 flex flex-col items-center text-center rounded-[3rem] bg-white border-2 border-[#EADDCD] shadow-sm">
            <span className="text-7xl mb-6 animate-bounce-slow">🍽️</span>
            <h3 className="text-4xl font-display font-black text-[#780116] mb-3">No restaurants found</h3>
            <p className="text-[#8E7B73] text-xl font-bold max-w-md mx-auto">We couldn't find any restaurants in your area.</p>
          </div>
        )}
      </motion.section>

      {/* ════════════════════════════════════════════
          VIBRANT CTA BANNER
      ════════════════════════════════════════════ */}
      <motion.section 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        className="pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20"
      >
        <div className="relative rounded-[3rem] overflow-hidden p-12 sm:p-24 text-center bg-[#780116] shadow-premium group">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC43IiBudW1PY3RhdmVzPSI0IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjUiLz48L3N2Zz4=')] opacity-20 mix-blend-overlay" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#F7B538] rounded-full blur-[150px] -translate-y-1/2 translate-x-1/3 group-hover:scale-110 transition-transform duration-1000 opacity-60" />
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-glow-orange animate-bounce-slow">
              <span className="text-5xl">🚀</span>
            </div>
            <h2 className="text-5xl sm:text-6xl font-display font-black text-white mb-6">Grow With Us</h2>
            <p className="text-[#FFCA60] text-2xl font-bold max-w-2xl mx-auto mb-12 leading-relaxed">Join thousands of restaurants reaching hungry customers every single day on UrbanBites.</p>
            <Link to="/partner-with-us" className="inline-flex items-center gap-3 bg-[#F7B538] text-[#780116] font-black px-10 py-5 rounded-full hover:bg-white transition-all text-xl shadow-glow-orange hover:-translate-y-2">
              Become a Partner <ArrowRight size={24} />
            </Link>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
