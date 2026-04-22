import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useLocationStore } from '../../store/locationStore';
import { useQuery } from '@tanstack/react-query';
import { userApi } from '../../api/userApi';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, User, LogOut, FileText, Menu, X, Flame, Store, ArrowLeft, MapPin, ChevronDown, Search } from 'lucide-react';
import LocationPickerModal from '../common/LocationPickerModal';

const IMAGE_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

export default function Navbar() {
  const { isAuthenticated, user, role, logout } = useAuthStore();
  const hasToken = Boolean(localStorage.getItem('token'));
  const isSessionAuthenticated = isAuthenticated && hasToken;
  const effectiveRole = isSessionAuthenticated ? role : null;
  const { getTotalItems } = useCartStore();
  const { lat, lng, locationName, setLocation: setGlobalLocation, initFromGPS } = useLocationStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const cartCount = getTotalItems();

  // Initialize GPS on first load
  useEffect(() => { initFromGPS(); }, []);

  // Fetch real profile for avatar
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: userApi.getProfile,
    enabled: isSessionAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  const avatarUrl = profile?.profilePictureUrl
    ? profile.profilePictureUrl.startsWith('http') ? profile.profilePictureUrl : `${IMAGE_BASE}${profile.profilePictureUrl}`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.fullName || 'User')}&background=F7B538&color=780116`;
  const initial = (profile?.fullName || user?.fullName || 'U').charAt(0).toUpperCase();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  const hideNavbarRoutes = ['/login', '/register', '/partner-with-us', '/partner/restaurant/register', '/partner/delivery/register', '/checkout', '/cart'];
  if (hideNavbarRoutes.includes(location.pathname)) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Consumer-only nav links (not shown to owners/agents)
  const navLinks = isSessionAuthenticated && effectiveRole === 'CUSTOMER'
    ? [
      { to: '/orders', icon: FileText, label: 'Orders' },
      { to: '/profile', icon: User, label: 'Profile' },
    ]
    : [];

  const isConsumer = !isSessionAuthenticated || effectiveRole === 'CUSTOMER';
  const isDarkHero = location.pathname.startsWith('/restaurant') && !isScrolled;

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-colors duration-200 py-4 ${isScrolled
      ? 'bg-white/95 backdrop-blur-md border-b border-[#EADDCD] shadow-sm'
      : 'bg-transparent'
      }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">
            {/* Back Button on Partner Pages */}
            {location.pathname.startsWith('/partner') && (
              <Link to="/" className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isScrolled ? 'bg-[#FDF9F1] text-[#780116] hover:bg-[#F7B538]' : 'bg-black/10 text-[#780116] hover:bg-black/20'}`}>
                <ArrowLeft size={18} />
              </Link>
            )}

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 bg-white rounded-[1rem] flex items-center justify-center shadow-sm group-hover:shadow-glow-orange transition-shadow border-2 border-[#780116]">
                <Flame size={20} className="text-[#F7B538] fill-[#F7B538] animate-bounce-slow" />
              </div>
              <span className={`text-2xl font-display font-black tracking-tight hidden sm:inline ${isDarkHero ? 'text-white drop-shadow-md' : 'text-[#780116]'}`}>
                UrbanBites
              </span>
            </Link>
            
            {/* ── Standalone Location Pill (Home & Others) ── */}
            {isConsumer && location.pathname !== '/search' && (
              <div className="hidden sm:flex h-[40px] items-center border-l border-black/10 pl-4 ml-2">
                <button
                  onClick={() => setIsLocationModalOpen(true)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full transition-all group max-w-[220px] font-bold ${isScrolled ? 'hover:bg-[#FDF9F1] text-[#2A0800]' : isDarkHero ? 'hover:bg-white/10 text-white drop-shadow-md' : 'hover:bg-black/5 text-[#780116]'}`}
                >
                  <MapPin size={16} className={isDarkHero ? "text-white" : "text-[#F7B538] shrink-0"} />
                  <span className="text-sm truncate">{locationName}</span>
                  <ChevronDown size={14} className="opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              </div>
            )}
          </div>

          {/* ── Zomato-Style Global Search & Location Pill ── */}
          {isConsumer && location.pathname === '/search' && (
              <div className="hidden md:flex flex-1 max-w-2xl mx-6">
                <div className={`flex w-full items-center rounded-xl border transition-all shadow-sm ${
                  isScrolled 
                    ? 'bg-white border-[#EADDCD]' 
                    : 'bg-white/95 backdrop-blur-md border-transparent shadow-[0_8px_30px_rgba(42,8,0,0.12)]'
                }`}>
                  {/* Location Part */}
                  <button
                    onClick={() => setIsLocationModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-l-xl hover:bg-[#FDF9F1] transition-colors shrink-0 max-w-[200px]"
                  >
                    <MapPin size={18} className="text-[#F7B538] shrink-0" />
                    <span className="text-sm font-bold text-[#2A0800] truncate">{locationName}</span>
                    <ChevronDown size={14} className="text-[#8E7B73] shrink-0" />
                  </button>

                  {/* Divider */}
                  <div className="w-[1px] h-6 bg-[#EADDCD] shrink-0" />

                  {/* Search Part */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const q = new FormData(e.target).get('q');
                      if (q) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
                    }} 
                    className="flex-1 relative flex items-center"
                  >
                    <Search className="absolute left-3 text-[#8E7B73]" size={18} />
                    <input 
                      type="text" 
                      name="q"
                      defaultValue={new URLSearchParams(location.search).get('q') || ''}
                      placeholder="Search for restaurant, cuisine or a dish" 
                      className="w-full bg-transparent py-2.5 pl-10 pr-4 text-sm font-bold text-[#2A0800] placeholder:text-[#8E7B73] outline-none rounded-r-xl"
                    />
                  </form>
                </div>
              </div>
            )}

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2">
            {navLinks.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all
                  ${location.pathname === to
                    ? 'bg-[#780116] text-white'
                    : isScrolled ? 'text-[#780116] hover:bg-[#FDF9F1]' : isDarkHero ? 'text-white hover:bg-white/10 drop-shadow-md' : 'text-[#780116] hover:bg-black/5'
                  }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}

            {isSessionAuthenticated ? (
              <div className="flex items-center gap-2 ml-2">
                {effectiveRole === 'CUSTOMER' && !location.pathname.includes('/partner') && (
                  <Link to="/partner-with-us" className={`hidden lg:flex px-4 py-2 items-center gap-1.5 rounded-full font-bold text-xs transition-colors mr-1 shadow-sm ${isScrolled ? 'bg-[#FDF9F1] text-[#780116] hover:bg-[#F7B538] border border-[#EADDCD]' : 'bg-[#780116] text-white hover:bg-black/80'}`}>
                    <Store size={14} /> Partner with Us
                  </Link>
                )}
                {(effectiveRole === 'RESTAURANT_OWNER' || effectiveRole === 'DELIVERY_AGENT') && !location.pathname.includes('/dashboard') && (
                  <Link to={effectiveRole === 'RESTAURANT_OWNER' ? '/owner/dashboard' : '/delivery/dashboard'} className={`hidden lg:flex px-4 py-2 items-center gap-1.5 rounded-full font-bold text-xs transition-all shadow-sm ${isScrolled ? 'bg-[#780116] text-white hover:bg-[#A00320]' : 'bg-[#780116] text-white hover:bg-black/80'} mr-1`}>
                    <Store size={14} /> Go to Dashboard
                  </Link>
                )}
                {/* Cart — only shown to customers, not to owners/agents */}
                {isConsumer && !location.pathname.startsWith('/checkout') && (
                  <button
                    onClick={() => navigate('/cart')}
                    className={`relative p-2.5 rounded-full transition-all ${isScrolled ? 'text-[#2A0800] hover:bg-[#FDF9F1]' : isDarkHero ? 'text-white hover:bg-white/10 bg-black/20 backdrop-blur-md' : 'text-[#780116] hover:bg-black/5 bg-white/20 backdrop-blur-md'}`}
                  >
                    <ShoppingBag size={20} />
                    <AnimatePresence>
                      {cartCount > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute -top-0.5 -right-0.5 bg-[#F7B538] text-[#780116] text-[9px] font-black h-4.5 w-4.5 min-w-[18px] min-h-[18px] flex items-center justify-center rounded-full border border-white animate-pulse-burgundy shadow-sm"
                        >
                          {cartCount > 9 ? '9+' : cartCount}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                )}

                {/* Avatar + logout */}
                <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                  <Link to="/profile" className="flex items-center gap-2 group">
                    <div className="w-9 h-9 rounded-full overflow-hidden shadow-sm border-2 border-white/50 group-hover:border-[#F7B538] transition-colors">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#780116] flex items-center justify-center text-white font-black text-sm">
                          {initial}
                        </div>
                      )}
                    </div>
                    <span className={`text-xs font-bold hidden xl:block max-w-[80px] truncate ${isDarkHero ? 'text-white drop-shadow-md' : 'text-[#780116]'}`}>
                      {profile?.fullName ? profile.fullName.split(' ')[0] : 'Profile'}
                    </span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    title="Logout"
                    className={`p-2.5 rounded-full transition-colors ${isScrolled ? 'text-[#2A0800] hover:bg-[#FDF9F1]' : isDarkHero ? 'text-white hover:bg-white/10 bg-black/20 backdrop-blur-md' : 'text-[#780116] hover:bg-black/5 bg-white/20 backdrop-blur-md'}`}
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                {!location.pathname.includes('/partner') ? (
                  <>
                    <Link to="/partner-with-us" className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${isScrolled ? 'text-[#780116] hover:bg-[#FDF9F1]' : isDarkHero ? 'text-white hover:bg-white/10 bg-black/20 backdrop-blur-md' : 'text-[#780116] hover:bg-black/5 bg-white/20 backdrop-blur-md'}`}>
                      Partner with Us
                    </Link>
                    <Link to="/login" className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${isScrolled ? 'text-[#780116] hover:bg-[#FDF9F1]' : isDarkHero ? 'text-white hover:bg-white/10 bg-black/20 backdrop-blur-md' : 'text-[#780116] hover:bg-black/5 bg-white/20 backdrop-blur-md'}`}>
                      Log in
                    </Link>
                    <Link to="/register" className={`px-4 py-2 rounded-full font-bold text-sm text-white transition-all shadow-sm ${isScrolled ? 'bg-[#780116] hover:bg-[#A00320]' : 'bg-[#780116] hover:bg-black/80'}`}>
                      Sign up
                    </Link>
                  </>
                ) : (
                  <Link to="/login" className="px-5 py-2.5 rounded-full font-black text-sm border-2 border-[#F7B538]/30 text-[#F7B538] hover:bg-[#FDF9F1] transition-all shadow-sm flex">
                    Existing Partner? Sign In
                  </Link>
                )}
              </div>
            )}
          </nav>

          {/* Mobile toggle */}
          <button
            className={`md:hidden p-2.5 rounded-xl transition-all ${isScrolled ? 'bg-white border border-[#EADDCD] text-[#780116] shadow-sm' : isDarkHero ? 'bg-black/20 backdrop-blur-md text-white' : 'bg-white/80 backdrop-blur-md border border-[#EADDCD] text-[#780116] shadow-sm'}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full left-0 right-0 bg-[#FFFCF5] border-t border-[#EADDCD] p-4 flex flex-col gap-2 md:hidden shadow-sm"
          >
            {/* Mobile Location Pill */}
            {isConsumer && (
              <button
                onClick={() => { setIsLocationModalOpen(true); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-[#EADDCD] mb-2 text-left shadow-sm"
              >
                <MapPin size={16} className="text-[#F7B538] shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-[#8E7B73]">Delivering to</p>
                  <p className="text-[#780116] text-sm font-bold truncate">{locationName}</p>
                </div>
                <ChevronDown size={14} className="text-[#8E7B73]" />
              </button>
            )}

            {!location.pathname.includes('/partner') && (!isSessionAuthenticated || effectiveRole === 'CUSTOMER') && (
              <Link to="/partner-with-us" className="flex justify-center items-center w-full p-3 rounded-xl bg-white text-[#780116] border border-[#EADDCD] font-bold text-sm mb-2 hover:bg-[#FDF9F1] transition-all shadow-sm">
                🚀 Partner with Us
              </Link>
            )}

            {isSessionAuthenticated && (effectiveRole === 'RESTAURANT_OWNER' || effectiveRole === 'DELIVERY_AGENT') && (
              <Link to={effectiveRole === 'RESTAURANT_OWNER' ? '/owner/dashboard' : '/delivery/dashboard'} className="flex justify-center items-center w-full p-3 rounded-xl bg-[#780116] text-white font-bold text-sm mb-2 hover:bg-[#A00320] transition-all shadow-sm">
                🌟 Go to Dashboard
              </Link>
            )}

            {isSessionAuthenticated ? (
              <>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-[#EADDCD] mb-2 shadow-sm">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#EADDCD] shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#780116] flex items-center justify-center text-white font-black text-lg">
                        {initial}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-[#780116] text-sm leading-tight">{profile?.fullName || user?.fullName || 'User'}</p>
                    <p className="text-[#8E7B73] text-xs font-bold">{profile?.email || user?.email || user?.phone}</p>
                  </div>
                </div>
                {navLinks.map(({ to, icon: Icon, label }) => (
                  <Link key={to} to={to} className="flex items-center gap-3 p-3 rounded-xl text-[#8E7B73] hover:text-[#780116] hover:bg-[#FDF9F1] font-bold transition-all">
                    <Icon size={18} className="text-[#F7B538]" /> {label}
                  </Link>
                ))}
                {isConsumer && (
                  <button onClick={() => navigate('/cart')} className="flex items-center gap-3 p-3 rounded-xl text-[#8E7B73] hover:text-[#780116] hover:bg-[#FDF9F1] font-bold transition-all w-full text-left">
                    <ShoppingBag size={18} className="text-[#F7B538]" /> Cart {cartCount > 0 && `(${cartCount})`}
                  </button>
                )}
                <button onClick={handleLogout} className="flex items-center gap-3 p-3 rounded-xl text-red-600 hover:bg-red-50 font-bold transition-all w-full text-left">
                  <LogOut size={18} /> Logout
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                {!location.pathname.includes('/partner') ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Link to="/login" className={`px-5 py-2 font-bold text-sm transition-colors rounded-full text-[#780116] hover:bg-black/5 bg-white/20 backdrop-blur-md`}>
                      Login
                    </Link>
                    <Link to="/register" className={`px-5 py-2 font-bold text-sm text-white transition-all rounded-full shadow-sm bg-[#780116] hover:bg-black/80`}>
                      Sign up
                    </Link>
                  </div>
                ) : (
                  <Link to="/login" className="w-full p-3 rounded-xl border-2 border-[#F7B538]/30 text-[#F7B538] font-bold text-center hover:bg-[#FDF9F1] transition-all shadow-sm">
                    Existing Partner? Sign In
                  </Link>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Location Picker Modal ── */}
      <AnimatePresence>
        {isLocationModalOpen && (
          <LocationPickerModal
            isOpen={isLocationModalOpen}
            onClose={() => setIsLocationModalOpen(false)}
            currentLat={lat}
            currentLng={lng}
            currentName={locationName}
            onSelect={(newLoc) => {
              setGlobalLocation(newLoc.lat, newLoc.lng, newLoc.name);
              setIsLocationModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </header>
  );
}
