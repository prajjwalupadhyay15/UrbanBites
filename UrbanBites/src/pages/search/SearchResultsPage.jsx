import React, { useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, ArrowLeft, UtensilsCrossed } from 'lucide-react';
import { useLocationStore } from '../../store/locationStore';
import { restaurantApi } from '../../api/restaurantApi';
import RestaurantCard from '../../components/specific/RestaurantCard';

const SkeletonCard = () => (
  <div className="bg-white rounded-3xl p-4 border-2 border-[#EADDCD] shadow-sm animate-pulse">
    <div className="w-full h-48 bg-black/5 rounded-2xl mb-4" />
    <div className="h-6 w-3/4 bg-black/5 rounded-full mb-3" />
    <div className="h-4 w-1/2 bg-black/5 rounded-full" />
  </div>
);

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useNavigate();
  const { lat, lng } = useLocationStore();



  // If there's a query, use the global search endpoint. Otherwise, show local discovery.
  const { data: results = [], isLoading } = useQuery({
    queryKey: ['restaurants', query ? 'search' : 'discovery', query || lat, lng],
    queryFn: () => {
      if (query) {
        return restaurantApi.search(query);
      }
      return restaurantApi.discover({ latitude: lat, longitude: lng, radiusKm: 30 });
    },
  });



  return (
    <div className="min-h-screen bg-[#FFFCF5] text-[#2A0800] overflow-x-hidden">
      {/* ── Search Results ── */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-32 pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20"
      >
        <div className="mb-8">
           <h2 className="text-3xl font-display font-black text-[#780116]">
             {query ? `Results for "${query}"` : 'All Restaurants'}
           </h2>
           <p className="text-[#8E7B73] font-bold mt-1 text-sm uppercase tracking-widest">
             {isLoading ? 'Searching...' : `${results.length} found`}
           </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {results.map((r, idx) => (
              <motion.div key={r.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: idx * 0.05 }} className="h-full bouncy-card">
                <RestaurantCard restaurant={r} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-24 flex flex-col items-center text-center rounded-[3rem] bg-white border-2 border-[#EADDCD] shadow-sm max-w-3xl mx-auto mt-8">
            <div className="w-24 h-24 bg-[#FDF9F1] rounded-full flex items-center justify-center mb-6 shadow-sm border border-[#EADDCD]">
              <Search size={40} className="text-[#F7B538]" />
            </div>
            <h3 className="text-3xl font-display font-black text-[#780116] mb-3">No matches found</h3>
            <p className="text-[#8E7B73] text-lg font-bold max-w-sm mx-auto mb-8">We couldn't find anything matching "{query}". Try searching for something else.</p>
            <Link to="/" className="inline-flex items-center gap-2 bg-[#780116] text-white font-black px-8 py-4 rounded-xl hover:-translate-y-1 shadow-premium transition-all">
              <UtensilsCrossed size={18} /> Explore Restaurants
            </Link>
          </div>
        )}
      </motion.section>
    </div>
  );
}
