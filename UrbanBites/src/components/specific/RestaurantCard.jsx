import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Star, Clock, Heart, Zap } from 'lucide-react';

const IMAGE_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&auto=format&fit=crop&q=80',
];

export default function RestaurantCard({ restaurant }) {
  const { id, name, description, imagePath, city, distanceKm, openNow } = restaurant;

  // Stable fallback picked by id
  const fallbackImg = FALLBACK_IMAGES[Number(id) % FALLBACK_IMAGES.length];
  const imgUrl = imagePath?.startsWith('http')
    ? imagePath
    : imagePath
      ? `${IMAGE_BASE}${imagePath}`
      : fallbackImg;

  // Stable pseudo-random rating and ETA based on id
  const rating = useMemo(() => {
    const seed = Number(id) || 1;
    return (3.8 + (seed * 0.37) % 1.2).toFixed(1);
  }, [id]);
  const eta = useMemo(() => {
    const seed = Number(id) || 1;
    return 20 + (seed * 7) % 26;
  }, [id]);

  const isClosed = !openNow;

  return (
    <Link to={`/restaurant/${id}`} className={`block group outline-none bouncy-card bg-white p-2 rounded-[2rem] border shadow-sm transition-all duration-300 ${
      isClosed
        ? 'border-[#EADDCD] grayscale-[0.8] opacity-75 hover:grayscale-[0.3] hover:opacity-90'
        : 'border-[#EADDCD] hover:border-[#F7B538]/50'
    }`}>
      <div className="flex flex-col gap-3">
        {/* Image */}
        <div className="relative w-full aspect-[4/3] rounded-[1.5rem] overflow-hidden bg-[#F1E6D8]">
          <img
            src={imgUrl}
            alt={name}
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-700 ${isClosed ? '' : 'group-hover:scale-110'}`}
          />

          {/* Gradient overlay to make text readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#2A0800]/80 via-transparent to-[#2A0800]/30" />

          {/* Closed overlay — Zomato style */}
          {isClosed && (
            <div className="absolute inset-0 bg-[#2A0800]/50 flex flex-col items-center justify-center gap-2 rounded-[1.5rem]">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Clock size={20} className="text-white" />
              </div>
              <span className="bg-white/95 backdrop-blur-md text-[#780116] text-[11px] font-black px-4 py-2 rounded-full uppercase tracking-wider shadow-lg">
                Currently not accepting orders
              </span>
            </div>
          )}

          {/* Top badges */}
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
            <span className="glass-light text-[#FAFAFA] text-[10px] font-black px-2.5 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Zap size={10} className="fill-[#F7B538] text-[#F7B538]" /> Top Pick
            </span>
            <button
              onClick={(e) => e.preventDefault()}
              className="w-9 h-9 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-[#780116] transition-colors"
            >
              <Heart size={15} />
            </button>
          </div>

          {/* Bottom info on image */}
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
            {distanceKm && (
              <span className="flex items-center gap-1 bg-[#2A0800]/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full">
                <MapPin size={11} className="text-[#F7B538]" />
                {distanceKm.toFixed(1)} km
              </span>
            )}
            <span className="flex items-center gap-1 bg-[#2A0800]/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full ml-auto -translate-y-0 group-hover:-translate-y-1 transition-transform">
              <Clock size={11} className="text-[#FFCA60]" />
              {eta} min
            </span>
          </div>
        </div>

        {/* Text info */}
        <div className="px-2 pb-1 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className={`font-display font-black text-lg tracking-tight truncate transition-colors ${
              isClosed ? 'text-[#8E7B73]' : 'text-[#2A0800] group-hover:text-[#780116]'
            }`}>
              {name}
            </h3>
            <p className="text-[#8E7B73] text-sm font-medium mt-0.5 truncate">
              {description || 'Premium local restaurant'} · {city}
            </p>
          </div>
          {/* Rating */}
          <div className="flex items-center gap-1.5 shrink-0 bg-[#FDF9F1] border border-[#F1E6D8] rounded-full px-3 py-1.5 group-hover:bg-[#F7B538]/10 group-hover:border-[#F7B538]/30 transition-colors">
            <Star size={14} className="fill-[#F7B538] text-[#F7B538]" />
            <span className="text-[#2A0800] font-black text-sm">{rating}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
