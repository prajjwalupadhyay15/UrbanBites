import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/authApi';
import { restaurantApi } from '../../api/restaurantApi';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Mail, Lock, User, AlertCircle, ArrowLeft, ArrowRight,
  CheckCircle2, Store, UploadCloud, MapPin, Building2,
  Eye, EyeOff, Home, Milestone, Globe, Navigation, Edit2, Flame,
  Pizza, ChefHat, Coffee, CupSoda, Phone
} from 'lucide-react';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function LocationMarker({ position, onPositionChange }) {
  const map = useMapEvents({
    click(e) {
      if (onPositionChange) onPositionChange(e.latlng.lat, e.latlng.lng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });
  useEffect(() => {
    if (position?.lat && position?.lng) {
      map.setView([position.lat, position.lng], map.getZoom(), { animate: true });
    }
  }, [position?.lat, position?.lng, map]);
  return position?.lat && position?.lng ? <Marker position={[position.lat, position.lng]} /> : null;
}

function OtpDigitInput({ value, onChange, onKeyDown, inputRef }) {
  return (
    <motion.input
      ref={inputRef}
      type="text"
      maxLength={1}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      whileFocus={{ scale: 1.1, borderColor: '#780116' }}
      animate={{ scale: value ? [1, 1.15, 1] : 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 18 }}
      className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-black text-[#780116] bg-white/50 backdrop-blur-md border-2 border-white focus:border-[#F7B538] outline-none rounded-2xl focus:shadow-[0_0_20px_rgba(247,181,56,0.3)] transition-all shadow-sm focus:bg-white"
    />
  );
}

function LightInput({ icon: Icon, error, type, label, ...props }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
  return (
    <div className="relative group flex-1 w-full">
      {label && <label className="block text-[10px] uppercase tracking-widest font-black text-[#8E7B73] mb-1.5 ml-1">{label}</label>}
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E7B73] group-focus-within:text-[#780116] transition-colors z-10" size={20} />
        <input
          type={inputType}
          {...props}
          className={`w-full bg-white/50 backdrop-blur-md border-2 ${error ? 'border-red-500 bg-red-50/80' : 'border-white'} text-[#2A0800] placeholder:text-[#AFA49F] rounded-2xl py-4 pl-12 ${isPassword ? 'pr-12' : 'pr-4'} outline-none focus:border-[#F7B538] focus:bg-white transition-all font-bold text-sm shadow-sm hover:shadow-md`}
        />
        {isPassword && (
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E7B73] hover:text-[#780116] transition-colors z-10">
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mt-1 text-xs font-bold text-red-500 ml-1">{error}</motion.p>
      )}
    </div>
  );
}

function StepBadge({ current, steps }) {
  return (
    <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
      {steps.map((label, i) => (
        <React.Fragment key={i}>
          <div className={`flex items-center gap-1.5 text-xs font-bold transition-all whitespace-nowrap ${i < current ? 'text-green-600' : i === current ? 'text-[#780116]' : 'text-[#8E7B73]'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all ${
              i < current ? 'bg-green-100 border-green-600 text-green-700' :
              i === current ? 'bg-[#FDF9F1] border-[#780116] text-[#780116]' :
              'bg-[#FFFCF5] border-[#EADDCD] text-[#AFA49F]'
            }`}>
              {i < current ? <CheckCircle2 size={12} /> : i + 1}
            </div>
            {label}
          </div>
          {i < steps.length - 1 && <div className={`w-6 h-0.5 rounded-full ${i < current ? 'bg-green-400' : 'bg-[#EADDCD]'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function RestaurantPartnerPage() {
  const { register, login, isLoading, error, clearError, isAuthenticated, role } = useAuthStore();
  const navigate = useNavigate();

  // If user is already logged in as RESTAURANT_OWNER, skip straight to restaurant creation
  const [step, setStep] = useState(() => {
    const state = useAuthStore.getState();
    return (state.isAuthenticated && state.role === 'RESTAURANT_OWNER') ? 5 : 1;
  });
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [isProcessingOtp, setIsProcessingOtp] = useState(false);
  const [isCreatingRestaurant, setIsCreatingRestaurant] = useState(false);
  const otpRefs = useRef([]);

  const [restaurantName, setRestaurantName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [location, setLocation] = useState({
    latitude: 28.6139,
    longitude: 77.2090,
    addressLine: '',
    buildingName: '',
    streetArea: '',
    landmark: '',
    city: '',
    openNow: true,
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [isGeocoding, setIsGeocoding] = useState(false);

  // (auth store destructured above)

  useEffect(() => { clearError(); setValidationErrors({}); setOtpError(''); }, [step]);

  const handleChange = (e) => {
    clearError();
    setValidationErrors({ ...validationErrors, [e.target.name]: '' });
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateAuth = () => {
    const err = {};
    if (!formData.fullName.trim()) err.fullName = 'Required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) err.email = 'Invalid email';
    if (formData.password.length < 8) err.password = 'Min 8 chars';
    setValidationErrors(err);
    return !Object.keys(err).length;
  };

  const validateRestaurant = () => {
    const err = {};
    if (!restaurantName.trim()) err.restaurantName = 'Restaurant name is required';
    if (!description.trim()) err.description = 'Description is required';
    if (!imageFile) err.image = 'Restaurant photo is required';
    setValidationErrors(err);
    return !Object.keys(err).length;
  };

  const validateLocation = () => {
    const err = {};
    if (!location.addressLine.trim()) err.addressLine = 'Required';
    if (!location.streetArea.trim()) err.streetArea = 'Required';
    if (!location.city.trim()) err.city = 'Required';
    if (!location.latitude || !location.longitude) err.location = 'Please pin location on map';
    setValidationErrors(err);
    return !Object.keys(err).length;
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!validateAuth()) return;
    try {
      await register({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: 'RESTAURANT_OWNER'
      });
      setStep(4);
      try { await authApi.requestEmailVerificationOtp(); } catch (e) { }
    } catch (err) { }
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);
    setOtpError('');
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (value && index === 5) {
      if (step === 4) verifyEmailOtp(next.join(''));
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0)
      otpRefs.current[index - 1]?.focus();
  };

  const verifyEmailOtp = async (code) => {
    if (code.length < 6) return;
    setIsProcessingOtp(true);
    setOtpError('');
    try {
      await authApi.verifyEmailOtp({ otp: code });
      await login({ email: formData.email, password: formData.password });
      setStep(5);
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Invalid OTP.');
      setOtpDigits(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally { setIsProcessingOtp(false); }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { setValidationErrors({ image: 'Image must be < 2MB' }); return; }
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setValidationErrors(prev => ({ ...prev, image: null }));
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setIsGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(p => ({ ...p, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        setIsGeocoding(false);
      },
      () => setIsGeocoding(false)
    );
  };

  const handleMapPinDrag = (lat, lng) => setLocation(prev => ({ ...prev, latitude: lat, longitude: lng }));

  const submitRestaurant = async (e) => {
    e.preventDefault();
    if (!validateRestaurant() || !validateLocation()) return;
    setIsCreatingRestaurant(true);
    try {
      const fd = new FormData();
      fd.append('name', restaurantName);
      fd.append('description', description);
      if (imageFile) fd.append('image', imageFile);
      fd.append('latitude', location.latitude);
      fd.append('longitude', location.longitude);
      fd.append('addressLine', location.addressLine);
      if (location.buildingName) fd.append('buildingName', location.buildingName);
      if (location.streetArea) fd.append('streetArea', location.streetArea);
      if (location.landmark) fd.append('landmark', location.landmark);
      fd.append('city', location.city);
      fd.append('openNow', location.openNow);

      await restaurantApi.createMyRestaurant(fd);
      setStep(8);
    } catch (err) {
      setValidationErrors({ submit: err.response?.data?.message || 'Failed to create restaurant' });
    } finally { setIsCreatingRestaurant(false); }
  };

  const backPath = isAuthenticated && role === 'RESTAURANT_OWNER' ? '/owner/restaurants' : '/partner-with-us';

  return (
    <div className="min-h-screen flex bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-[#FFFCF5] to-[#FDF9F1] overflow-hidden font-sans">
      
      {/* ─── VIBRANT LEFT PANEL (Hidden on Mobile) ─── */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-12 overflow-hidden border-r border-[#EADDCD]/50 shadow-2xl z-20 bg-white/40 backdrop-blur-3xl">
        
        {/* Animated Mesh Gradient Background inside Left Panel */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <motion.div 
            className="absolute top-0 left-0 w-[600px] h-[600px] bg-[#F7B538]/20 rounded-full blur-[120px]"
            animate={{ x: [-30, 30], y: [-30, 30] }}
            transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#780116]/10 rounded-full blur-[120px]"
            animate={{ x: [30, -30], y: [30, -30] }}
            transition={{ duration: 12, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 1 }}
          />
        </div>

        {/* Floating Food Photos */}
        <motion.div
          className="absolute top-28 left-8 w-28 h-28 rounded-[2rem] overflow-hidden border-2 border-white shadow-2xl"
          animate={{ y: [-15, 15], rotate: [-6, 6] }}
          transition={{ duration: 6, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        >
          <img src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&auto=format&fit=crop&q=70" alt="" className="w-full h-full object-cover" />
        </motion.div>

        <motion.div
          className="absolute bottom-44 right-8 w-36 h-36 rounded-full overflow-hidden border-2 border-white shadow-2xl"
          animate={{ y: [20, -20], rotate: [8, -8] }}
          transition={{ duration: 8, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 1 }}
        >
          <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&auto=format&fit=crop&q=70" alt="" className="w-full h-full object-cover" />
        </motion.div>

        <motion.div
          className="absolute top-52 right-16 w-20 h-20 rounded-full overflow-hidden border-2 border-white/60 shadow-lg opacity-70 blur-[1px]"
          animate={{ y: [-10, 12], x: [-10, 10] }}
          transition={{ duration: 12, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        >
          <img src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=150&auto=format&fit=crop&q=60" alt="" className="w-full h-full object-cover" />
        </motion.div>

        <motion.div
          className="absolute bottom-72 left-16 w-16 h-16 rounded-full overflow-hidden border-2 border-white/50 shadow-md opacity-60 blur-[1px]"
          animate={{ y: [8, -8], x: [5, -5] }}
          transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 2 }}
        >
          <img src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=120&auto=format&fit=crop&q=60" alt="" className="w-full h-full object-cover" />
        </motion.div>

        <div className="relative z-10">
          <Link to={backPath} className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-md text-[#780116] border border-white hover:bg-white font-black px-6 py-3 rounded-full transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
            <ArrowLeft size={20} /> Back
          </Link>
        </div>

        <div className="relative z-10 mt-auto bg-white/60 p-10 rounded-[3rem] backdrop-blur-xl border-2 border-white shadow-2xl">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-5xl font-display font-black text-[#2A0800] leading-[1.1] mb-6">
            Grow your business <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#780116] to-[#A00320]">exponentially.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-[#8E7B73] text-lg font-bold max-w-md leading-relaxed">
            Partner with UrbanBites to reach thousands of new hungry customers every single day with powerful analytics and tools.
          </motion.p>
        </div>
      </div>

      {/* ─── RIGHT PANEL (Forms) ─── */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-6 sm:p-12 relative overflow-y-auto bg-transparent z-10">
        <div className="w-full max-w-xl relative">
          <Link to={backPath} className="lg:hidden inline-flex items-center gap-2 bg-white/80 backdrop-blur-md text-[#780116] border border-white hover:bg-white font-black px-5 py-2.5 rounded-full transition-all shadow-md hover:shadow-lg mb-10">
            <ArrowLeft size={18} /> Back
          </Link>

          <AnimatePresence mode="wait">
            
            {/* ── STEP 1: Owner Registration ── */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <StepBadge current={0} steps={['Owner', 'Verify', 'Restaurant']} />
                
                <h2 className="text-4xl font-display font-black text-[#780116] mb-2">Partner with us</h2>
                <p className="text-[#8E7B73] font-bold mb-8">First, let's create your owner account.</p>

                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
                    <AlertCircle size={20} className="shrink-0 text-red-500" />
                    <p className="text-sm font-bold">{error}</p>
                  </motion.div>
                )}

                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  <div className="flex gap-4">
                    <LightInput icon={User} name="fullName" type="text" placeholder="Full Name" value={formData.fullName} onChange={handleChange} error={validationErrors.fullName} />
                    <LightInput icon={Mail} name="email" type="email" placeholder="Email Address" value={formData.email} onChange={handleChange} error={validationErrors.email} />
                  </div>
                  <div className="pb-4">
                    <LightInput icon={Lock} name="password" type="password" placeholder="Password (min. 8 chars)" value={formData.password} onChange={handleChange} error={validationErrors.password} />
                  </div>
                  <button type="submit" disabled={isLoading}
                    className="w-full h-14 rounded-2xl bg-[#780116] text-white font-black text-lg shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 group">
                    {isLoading ? 'Creating account…' : 'Continue'}
                    {!isLoading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                  </button>
                </form>
                
                <div className="mt-8 pt-6 border-t border-[#EADDCD] text-center">
                  <p className="text-[#8E7B73] text-sm font-bold">
                    Already a partner?{' '}
                    <Link to="/login?role=restaurant" className="text-[#F7B538] hover:text-[#780116] transition-colors">Sign In here</Link>
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── STEP 4: Email OTP ── */}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <StepBadge current={1} steps={['Owner', 'Verify', 'Restaurant']} />
                
                <h3 className="text-4xl font-display font-black text-[#780116] mb-2">Verify Email</h3>
                <p className="text-[#8E7B73] text-base font-bold mb-8">
                  We sent a 6-digit code to <span className="text-[#2A0800]">{formData.email}</span>
                </p>

                {otpError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
                    <AlertCircle size={20} className="shrink-0" />
                    <p className="text-sm font-bold">{otpError}</p>
                  </div>
                )}

                <div className="flex justify-between gap-2 mb-8">
                  {otpDigits.map((d, i) => (
                    <OtpDigitInput key={i} value={d} inputRef={(el) => otpRefs.current[i] = el} onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(i, e)} />
                  ))}
                </div>

                <button onClick={() => verifyEmailOtp(otpDigits.join(''))} disabled={isProcessingOtp}
                  className="w-full h-14 rounded-2xl bg-[#780116] text-white font-black text-lg shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center">
                  {isProcessingOtp ? 'Verifying…' : 'Verify & Continue'}
                </button>
              </motion.div>
            )}

            {/* ── STEP 5: Restaurant Info ── */}
            {step === 5 && (
              <motion.div key="s5" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="pb-8">
                <StepBadge current={0} steps={['Info', 'Address', 'Map & Launch']} />

                <h3 className="text-3xl font-display font-black text-[#780116] mb-2">Restaurant Info</h3>
                <p className="text-[#8E7B73] font-bold text-sm mb-6">Tell customers what to expect.</p>

                <div className="space-y-5">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-black text-[#8E7B73] mb-2 block">Cover Photo *</label>
                    <div className={`relative w-full h-40 rounded-2xl border-2 border-dashed ${validationErrors.image ? 'border-red-500 bg-red-50' : 'border-[#EADDCD] hover:border-[#F7B538] bg-[#FFFCF5]'} transition-colors flex flex-col items-center justify-center overflow-hidden group cursor-pointer`}>
                      <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      {previewUrl ? (<><img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" /><div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors" /><div className="z-10 bg-white/90 backdrop-blur text-[#2A0800] text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">Change Photo</div></>) : (<div className="text-center flex flex-col items-center"><div className="w-10 h-10 bg-[#EADDCD] text-[#780116] rounded-full flex items-center justify-center mb-2 group-hover:bg-[#F7B538] transition-colors"><UploadCloud size={20} /></div><p className="text-sm font-bold text-[#2A0800]">Upload cover image</p><p className="text-[10px] font-bold text-[#8E7B73] mt-1">JPEG/PNG max 2MB</p></div>)}
                    </div>
                    {validationErrors.image && <p className="mt-1 text-xs font-bold text-red-500">{validationErrors.image}</p>}
                  </div>
                  <LightInput icon={Store} name="restaurantName" type="text" label="Restaurant Name *" placeholder="e.g. The Burger Bar" value={restaurantName} error={validationErrors.restaurantName} onChange={(e) => { setRestaurantName(e.target.value); setValidationErrors(v => ({ ...v, restaurantName: '' })); }} />
                  <div className="relative group w-full">
                    <label className="block text-[10px] uppercase tracking-widest font-black text-[#8E7B73] mb-1.5 ml-1">Short Description *</label>
                    <textarea rows={2} placeholder="e.g. Best artisanal burgers in town..." value={description} onChange={(e) => { setDescription(e.target.value); setValidationErrors(v => ({ ...v, description: '' })); }} className={`w-full bg-[#FFFCF5] border-2 ${validationErrors.description ? 'border-red-500' : 'border-[#EADDCD]'} text-[#2A0800] placeholder:text-[#AFA49F] rounded-xl py-3 px-4 outline-none focus:border-[#F7B538] focus:bg-white transition-all font-bold text-sm shadow-sm resize-none`} />
                    {validationErrors.description && <p className="mt-1 text-xs font-bold text-red-500 ml-1">{validationErrors.description}</p>}
                  </div>
                  <button type="button" onClick={() => { if (!validateRestaurant()) return; setStep(6); }} className="w-full h-14 rounded-2xl bg-[#780116] text-white font-black text-lg shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group">
                    Next: Address <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 6: Address Details ── */}
            {step === 6 && (
              <motion.div key="s6" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="pb-8">
                <StepBadge current={1} steps={['Info', 'Address', 'Map & Launch']} />
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-3xl font-display font-black text-[#780116] mb-1">Location Details</h3>
                    <p className="text-[#8E7B73] font-bold text-sm">Where can customers find you?</p>
                  </div>
                  <button onClick={() => setStep(5)} className="text-sm font-bold text-[#8E7B73] hover:text-[#780116] flex items-center gap-1 transition-colors"><ArrowLeft size={16} /> Back</button>
                </div>
                <div className="space-y-4">
                  <LightInput icon={MapPin} name="addressLine" type="text" label="Address Line 1 *" placeholder="e.g. Shop 42, Ground Floor" value={location.addressLine} error={validationErrors.addressLine} onChange={(e) => { setLocation(p => ({ ...p, addressLine: e.target.value })); setValidationErrors(v => ({ ...v, addressLine: '' })); }} />
                  <LightInput icon={Building2} name="buildingName" type="text" label="Building / Mall (optional)" placeholder="e.g. Phoenix Mall" value={location.buildingName} onChange={(e) => setLocation(p => ({ ...p, buildingName: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-4">
                    <LightInput icon={Milestone} name="streetArea" type="text" label="Street / Area *" placeholder="e.g. MG Road" value={location.streetArea} error={validationErrors.streetArea} onChange={(e) => { setLocation(p => ({ ...p, streetArea: e.target.value })); setValidationErrors(v => ({ ...v, streetArea: '' })); }} />
                    <LightInput icon={Globe} name="city" type="text" label="City *" placeholder="e.g. New Delhi" value={location.city} error={validationErrors.city} onChange={(e) => { setLocation(p => ({ ...p, city: e.target.value })); setValidationErrors(v => ({ ...v, city: '' })); }} />
                  </div>
                  <LightInput icon={Home} name="landmark" type="text" label="Landmark (optional)" placeholder="e.g. Near Metro Station" value={location.landmark} onChange={(e) => setLocation(p => ({ ...p, landmark: e.target.value }))} />
                  <button type="button" onClick={() => { if (!validateLocation()) return; setStep(7); }} className="w-full h-14 rounded-2xl bg-[#780116] text-white font-black text-lg shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group mt-2">
                    Next: Pin on Map <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 7: Map + Submit ── */}
            {step === 7 && (
              <motion.div key="s7" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="pb-8">
                <StepBadge current={2} steps={['Info', 'Address', 'Map & Launch']} />
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-3xl font-display font-black text-[#780116] mb-1">Pin & Launch</h3>
                    <p className="text-[#8E7B73] font-bold text-sm">Confirm your exact location.</p>
                  </div>
                  <button onClick={() => setStep(6)} className="text-sm font-bold text-[#8E7B73] hover:text-[#780116] flex items-center gap-1 transition-colors"><ArrowLeft size={16} /> Back</button>
                </div>
                <form onSubmit={submitRestaurant} className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] uppercase tracking-widest font-black text-[#8E7B73] flex items-center gap-1.5"><Navigation size={12} /> Pin Location *{isGeocoding && <span className="ml-2 inline-flex items-center gap-1 text-[#F7B538]"><span className="w-2.5 h-2.5 border-2 border-[#F7B538] border-t-transparent rounded-full animate-spin inline-block" /> Locating…</span>}</label>
                      <button type="button" onClick={handleLocateMe} className="text-[#780116] text-xs font-black hover:text-[#F7B538] flex items-center gap-1 transition-colors bg-[#FFFCF5] border border-[#EADDCD] px-2 py-1 rounded-md"><Navigation size={12} /> Use My Location</button>
                    </div>
                    <div className="h-56 rounded-2xl overflow-hidden border-2 border-[#EADDCD] relative z-0 shadow-inner">
                      <MapContainer center={[location.latitude, location.longitude]} zoom={14} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                        <TileLayer attribution='&copy; OSM' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                        <LocationMarker position={{ lat: location.latitude, lng: location.longitude }} onPositionChange={handleMapPinDrag} />
                      </MapContainer>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-[#FFFCF5] border-2 border-[#EADDCD] rounded-2xl px-5 py-4 shadow-sm">
                    <div><p className="text-[#2A0800] font-black text-sm">Open for Orders Now?</p><p className="text-[#8E7B73] text-xs font-bold mt-0.5">You can toggle this later.</p></div>
                    <button type="button" onClick={() => setLocation(p => ({ ...p, openNow: !p.openNow }))} className={`relative w-14 h-8 rounded-full transition-colors ${location.openNow ? 'bg-green-500' : 'bg-[#EADDCD]'}`}><span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${location.openNow ? 'left-7' : 'left-1'}`} /></button>
                  </div>
                  {(validationErrors.submit || validationErrors.location) && (<div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-500 text-xs font-bold flex items-center gap-2"><AlertCircle size={14} /> {validationErrors.submit || validationErrors.location}</div>)}
                  <button type="submit" disabled={isCreatingRestaurant} className="w-full py-4 rounded-2xl bg-[#780116] text-white font-black text-lg shadow-premium hover:-translate-y-1 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {isCreatingRestaurant ? (<><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Setting up…</>) : (<><Store size={20} /> Launch My Restaurant</>)}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── STEP 8: Submitted ── */}
            {step === 8 && (
              <motion.div key="s6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
                <div className="mb-8 text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-green-100 border border-green-200 flex items-center justify-center mb-6 shadow-sm">
                    <CheckCircle2 size={40} className="text-green-600" />
                  </div>
                  <h2 className="text-4xl font-display font-black text-[#780116] mb-3">Submitted!</h2>
                  <p className="text-[#8E7B73] text-base font-bold">
                    Your restaurant is under review. We'll notify you once it's approved by an admin.
                  </p>
                </div>

                <div className="bg-[#FFFCF5] border border-[#EADDCD] rounded-2xl p-6 mb-8 shadow-sm">
                  <p className="text-xs uppercase tracking-widest font-black text-[#2A0800] mb-3">What happens next</p>
                  <ul className="space-y-3 text-sm text-[#8E7B73] font-bold">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#F7B538]" /> Admin reviews your details.</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#F7B538]" /> Approval makes you discoverable.</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#F7B538]" /> Receive an in-app notification.</li>
                  </ul>
                </div>

                <div className="flex flex-col gap-3">
                  <button onClick={() => navigate('/owner/dashboard')} className="w-full py-4 rounded-xl bg-[#780116] text-white font-black text-lg shadow-premium hover:-translate-y-1 transition-all">
                    Go to Dashboard
                  </button>
                  <button onClick={() => navigate('/owner/restaurants')} className="w-full py-4 rounded-xl bg-[#FFFCF5] border border-[#EADDCD] text-[#2A0800] font-bold text-sm hover:bg-[#FDF9F1] transition-all">
                    View My Restaurants
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
