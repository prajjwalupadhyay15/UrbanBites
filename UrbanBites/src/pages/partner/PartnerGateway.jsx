import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Store, Bike, ArrowRight, ArrowLeft, Star, TrendingUp, Pizza, ChefHat, Coffee, CupSoda } from 'lucide-react';

export default function PartnerGateway() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-[#FFFCF5] to-[#FDF9F1] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* ─── Deep Background Elements (Animated Mesh Gradient) ─── */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <motion.div 
          className="absolute top-0 left-0 w-[800px] h-[800px] bg-[#F7B538]/10 rounded-full blur-[150px]"
          animate={{ x: [-50, 50], y: [-50, 50] }}
          transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-[#780116]/5 rounded-full blur-[150px]"
          animate={{ x: [50, -50], y: [50, -50] }}
          transition={{ duration: 12, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 1 }}
        />
        
        {/* Floating Glass Orbs: Foreground (Crisp, active) */}
        <motion.div 
          className="absolute top-24 left-12 md:left-32 w-32 h-32 rounded-[2rem] bg-white/40 backdrop-blur-2xl border border-white/60 shadow-2xl flex items-center justify-center text-[#780116]"
          animate={{ y: [-20, 20], rotate: [-10, 15] }}
          transition={{ duration: 6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        >
          <Pizza size={48} className="drop-shadow-xl" />
        </motion.div>
        
        <motion.div 
          className="absolute bottom-24 right-12 md:right-32 w-40 h-40 rounded-full bg-white/40 backdrop-blur-2xl border border-white/60 shadow-2xl flex items-center justify-center text-[#F7B538]"
          animate={{ y: [25, -25], rotate: [15, -10] }}
          transition={{ duration: 8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 1 }}
        >
          <ChefHat size={64} className="drop-shadow-xl" />
        </motion.div>

        {/* Floating Glass Orbs: Background (Blurred, small, slow) */}
        <motion.div 
          className="absolute top-40 right-1/4 w-24 h-24 rounded-full bg-white/20 backdrop-blur-lg border border-white/30 shadow-lg flex items-center justify-center text-[#2A0800]/50 blur-[2px]"
          animate={{ y: [-15, 15], x: [-15, 15] }}
          transition={{ duration: 15, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        >
          <CupSoda size={36} />
        </motion.div>

        <motion.div 
          className="absolute bottom-48 left-1/4 w-28 h-28 rounded-3xl bg-white/20 backdrop-blur-lg border border-white/30 shadow-lg flex items-center justify-center text-[#780116]/40 blur-[3px]"
          animate={{ y: [15, -15], x: [15, -15] }}
          transition={{ duration: 18, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 2 }}
        >
          <Coffee size={40} />
        </motion.div>
      </div>

      {/* ─── Navigation Controls ─── */}
      <div className="absolute top-6 left-6 z-50">
        <Link to="/" className="flex items-center gap-2 bg-white/80 backdrop-blur-md border border-[#EADDCD] text-[#8E7B73] hover:text-[#780116] hover:bg-white text-sm font-bold px-5 py-2.5 rounded-full transition-all shadow-sm">
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </div>
      <div className="absolute top-6 right-6 z-50">
        <Link to="/login" className="flex items-center gap-2 bg-white/80 backdrop-blur-md border border-[#EADDCD] text-[#780116] hover:border-[#F7B538] hover:bg-white text-sm font-bold px-6 py-2.5 rounded-full transition-all shadow-sm">
          Existing Partner? Sign In
        </Link>
      </div>

      {/* ─── Header ─── */}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="text-center z-10 mb-20 relative mt-16">
        <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-[#FDF9F1] border border-[#F7B538]/30 text-[#F7B538] text-xs font-black uppercase tracking-widest shadow-sm">
          Join the Network
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-[#2A0800] tracking-tight mb-4 font-display leading-tight">
          Partner with <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#780116] to-[#A00320]">UrbanBites</span>
        </h1>
        <p className="text-[#8E7B73] font-bold text-lg max-w-xl mx-auto leading-relaxed">
          Unlock new growth opportunities. Choose how you want to partner with us and start reaching thousands of happy customers today.
        </p>
      </motion.div>

      {/* ─── Cards Container ─── */}
      <div className="flex flex-col lg:flex-row gap-10 w-full max-w-5xl z-10 relative px-4">
        
        {/* RESTAURANT CARD */}
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
          className="flex-1 bg-white/70 backdrop-blur-2xl border-2 border-white hover:border-[#F7B538]/50 rounded-[3rem] p-10 transition-all duration-500 group flex flex-col relative shadow-xl hover:shadow-2xl">
          
          {/* Internal Glow */}
          <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-[#F7B538]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          
          {/* Glowing Orbiting Badge */}
          <motion.div 
            className="absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br from-[#F7B538] to-[#E59A1D] rounded-full flex items-center justify-center text-white shadow-[0_0_40px_rgba(247,181,56,0.6)] z-30 border-4 border-white"
            animate={{ 
              y: [-15, 15], 
              x: [-5, 5],
            }}
            transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          >
            <Store size={40} className="drop-shadow-lg" />
          </motion.div>

          <div className="w-16 h-16 bg-gradient-to-br from-[#F7B538]/20 to-[#F7B538]/5 rounded-[1.25rem] border border-[#F7B538]/20 flex items-center justify-center mb-8 text-[#F7B538] group-hover:-translate-y-2 transition-transform duration-500 relative z-10">
            <Store size={32} />
          </div>
          
          <h2 className="text-3xl font-black text-[#2A0800] mb-3 tracking-tight relative z-10 font-display">Restaurant Partner</h2>
          <p className="text-[#8E7B73] font-bold mb-10 flex-1 relative z-10 leading-relaxed">
            Grow your business exponentially. Reach more customers locally, access powerful analytics, and manage your orders seamlessly with our dedicated dashboard.
          </p>
          
          <div className="space-y-3 mb-10 relative z-10">
            <div className="flex items-center gap-3 text-sm font-bold text-[#8E7B73]"><TrendingUp size={18} className="text-[#F7B538]" /> Boost your daily revenue</div>
            <div className="flex items-center gap-3 text-sm font-bold text-[#8E7B73]"><Star size={18} className="text-[#F7B538]" /> Dedicated marketing support</div>
          </div>

          <Link to="/partner/restaurant/register" className="relative z-10 flex items-center justify-between w-full p-2 rounded-[1.5rem] bg-white border border-[#EADDCD] group-hover:border-transparent group-hover:shadow-lg transition-all overflow-hidden group/btn">
            <div className="absolute inset-0 bg-gradient-to-r from-[#780116] to-[#A00320] translate-x-[-100%] group-hover/btn:translate-x-0 transition-transform duration-500 ease-out" />
            <span className="font-black px-6 text-[#780116] group-hover/btn:text-white transition-colors duration-500 relative z-10 text-lg">
              List your Restaurant
            </span>
            <div className="w-12 h-12 rounded-xl bg-[#FDF9F1] border border-[#EADDCD] flex items-center justify-center group-hover/btn:bg-white/20 group-hover/btn:border-transparent transition-colors text-[#780116] group-hover/btn:text-white relative z-10">
                <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
            </div>
          </Link>
        </motion.div>

        {/* DELIVERY CARD */}
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
          className="flex-1 bg-white/70 backdrop-blur-2xl border-2 border-white hover:border-[#780116]/30 rounded-[3rem] p-10 transition-all duration-500 group flex flex-col relative shadow-xl hover:shadow-2xl mt-12 lg:mt-0">
          
          {/* Internal Glow */}
          <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-[#780116]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          
          {/* Glowing Orbiting Badge */}
          <motion.div 
            className="absolute -bottom-8 -left-8 w-24 h-24 bg-gradient-to-br from-[#780116] to-[#A00320] rounded-full flex items-center justify-center text-white shadow-[0_0_40px_rgba(120,1,22,0.5)] z-30 border-4 border-white"
            animate={{ 
              y: [15, -15], 
              x: [5, -5],
            }}
            transition={{ duration: 4.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          >
            <Bike size={40} className="drop-shadow-lg" />
          </motion.div>

          <div className="w-16 h-16 bg-gradient-to-br from-[#780116]/20 to-[#780116]/5 rounded-[1.25rem] border border-[#780116]/20 flex items-center justify-center mb-8 text-[#780116] group-hover:-translate-y-2 transition-transform duration-500 relative z-10">
            <Bike size={32} />
          </div>
          
          <h2 className="text-3xl font-black text-[#2A0800] mb-3 tracking-tight relative z-10 font-display">Delivery Partner</h2>
          <p className="text-[#8E7B73] font-bold mb-10 flex-1 relative z-10 leading-relaxed">
            Be your own boss and earn on your own schedule. Join our fleet to deliver joy across the city while enjoying flexible hours and competitive payouts.
          </p>

          <div className="space-y-3 mb-10 relative z-10">
            <div className="flex items-center gap-3 text-sm font-bold text-[#8E7B73]"><TrendingUp size={18} className="text-[#780116]" /> Weekly fast payouts</div>
            <div className="flex items-center gap-3 text-sm font-bold text-[#8E7B73]"><Star size={18} className="text-[#780116]" /> Flexible working hours</div>
          </div>

          <Link to="/partner/delivery/register" className="relative z-10 flex items-center justify-between w-full p-2 rounded-[1.5rem] bg-white border border-[#EADDCD] group-hover:border-transparent group-hover:shadow-lg transition-all overflow-hidden group/btn">
            <div className="absolute inset-0 bg-gradient-to-r from-[#F7B538] to-[#E59A1D] translate-x-[-100%] group-hover/btn:translate-x-0 transition-transform duration-500 ease-out" />
            <span className="font-black px-6 text-[#780116] transition-colors duration-500 relative z-10 text-lg">
              Start Delivering
            </span>
            <div className="w-12 h-12 rounded-xl bg-[#FDF9F1] border border-[#EADDCD] flex items-center justify-center group-hover/btn:bg-white/40 group-hover/btn:border-transparent transition-colors text-[#780116] relative z-10">
                <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
            </div>
          </Link>
        </motion.div>

      </div>
    </div>
  );
}
