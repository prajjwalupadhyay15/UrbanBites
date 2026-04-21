import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/authApi';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, AlertCircle, Phone, ArrowLeft, ArrowRight, Bike, Eye, EyeOff, Map, Navigation, ShieldCheck } from 'lucide-react';

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
      animate={{
        scale: value ? [1, 1.15, 1] : 1,
        borderRadius: value ? ['16px', '50%', '20px'] : '16px',
      }}
      transition={{ type: 'spring', stiffness: 350, damping: 18 }}
      className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-black text-[#780116] bg-white border-2 border-[#EADDCD] outline-none rounded-2xl focus:border-[#F7B538] focus:bg-[#FDF9F1] shadow-sm transition-all"
    />
  );
}

/* Reusable light input */
function DarkInput({ icon: Icon, error, type, ...props }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="relative group">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E7B73] group-focus-within:text-[#780116] transition-colors z-10" size={18} />
      <input
        type={inputType}
        {...props}
        className={`w-full bg-white/50 backdrop-blur-md border-2 ${error ? 'border-red-500 bg-red-50/80' : 'border-white'} text-[#2A0800] placeholder:text-[#AFA49F] rounded-2xl py-4 pl-12 ${isPassword ? 'pr-12' : 'pr-4'} outline-none focus:border-[#F7B538] focus:bg-white transition-all font-bold text-sm shadow-sm hover:shadow-md`}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E7B73] hover:text-[#780116] transition-colors z-10"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute -bottom-5 left-1 text-xs font-bold text-red-500">
          {error}
        </motion.p>
      )}
    </div>
  );
}

export default function DeliveryPartnerPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });
  const [validationErrors, setValidationErrors] = useState({});
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [isProcessingOtp, setIsProcessingOtp] = useState(false);
  const otpRefs = useRef([]);
  const { register, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => { clearError(); setValidationErrors({}); setOtpError(''); }, [step]);

  const handleChange = (e) => {
    clearError();
    setValidationErrors({ ...validationErrors, [e.target.name]: '' });
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateEmail = () => {
    const err = {};
    if (!formData.fullName.trim()) err.fullName = 'Full name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) err.email = 'Invalid email address';
    if (formData.password.length < 8) err.password = 'Minimum 8 characters';
    setValidationErrors(err);
    return !Object.keys(err).length;
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!validateEmail()) return;
    try {
      await register({ fullName: formData.fullName, email: formData.email, password: formData.password, role: 'DELIVERY_AGENT' });
      await authApi.requestEmailVerificationOtp();
      setStep(3);
    } catch (err) { }
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);
    setOtpError('');
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (value && index === 5) verifyOtp(next.join(''));
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0)
      otpRefs.current[index - 1]?.focus();
  };

  const verifyOtp = async (code) => {
    if (code.length < 6) return;
    setIsProcessingOtp(true);
    setOtpError('');
    try {
      // verifyEmailOtp returns UserProfileResponse (not AuthResponse) — user is ALREADY authenticated.
      // The token is already in the store from registration. Just confirm email then redirect.
      await authApi.verifyEmailOtp({ otp: code });
      // Use role from existing store state (set during registration) to redirect correctly
      const currentRole = useAuthStore.getState().role;
      const redirectPath = useAuthStore.getState().getRoleRedirectPath(currentRole);
      navigate(redirectPath || '/delivery/dashboard');
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Invalid OTP. Please try again.');
      setOtpDigits(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setIsProcessingOtp(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-[#FFFCF5] to-[#FDF9F1] overflow-hidden font-sans">
      
      {/* ─── VIBRANT LEFT PANEL (Hidden on Mobile) ─── */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-12 overflow-hidden border-r border-[#EADDCD]/50 shadow-2xl z-20 bg-white/40 backdrop-blur-3xl">
        
        {/* Animated Mesh Gradient Background inside Left Panel */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <motion.div 
            className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#780116]/10 rounded-full blur-[120px]"
            animate={{ x: [-30, 30], y: [30, -30] }}
            transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#F7B538]/10 rounded-full blur-[120px]"
            animate={{ x: [30, -30], y: [-30, 30] }}
            transition={{ duration: 12, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 1 }}
          />
        </div>

        {/* Floating Glass Orbs: Foreground (Crisp, active) */}
        <motion.div 
          className="absolute top-32 right-10 w-40 h-40 rounded-full bg-white/60 backdrop-blur-2xl border border-white shadow-2xl flex items-center justify-center text-[#780116]"
          animate={{ y: [25, -25], rotate: [15, -10] }}
          transition={{ duration: 8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        >
          <Bike size={64} className="drop-shadow-xl" />
        </motion.div>
        
        <motion.div 
          className="absolute bottom-40 left-10 w-32 h-32 rounded-[2rem] bg-white/60 backdrop-blur-2xl border border-white shadow-2xl flex items-center justify-center text-[#F7B538]"
          animate={{ y: [-20, 20], rotate: [-10, 15] }}
          transition={{ duration: 6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 1 }}
        >
          <Map size={48} className="drop-shadow-xl" />
        </motion.div>

        {/* Floating Glass Orbs: Background (Blurred, small, slow) */}
        <motion.div 
          className="absolute top-48 left-20 w-24 h-24 rounded-full bg-white/30 backdrop-blur-lg border border-white/50 shadow-lg flex items-center justify-center text-[#2A0800]/50 blur-[2px]"
          animate={{ y: [-15, 15], x: [15, -15] }}
          transition={{ duration: 15, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        >
        </motion.div>

        <div className="relative z-10">
          <Link to="/partner-with-us" className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-md text-[#780116] border border-white hover:bg-white font-black px-6 py-3 rounded-full transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
            <ArrowLeft size={20} /> Back
          </Link>
        </div>

        <div className="relative z-10 mt-auto bg-white/60 p-10 rounded-[3rem] backdrop-blur-xl border-2 border-white shadow-2xl">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-5xl font-display font-black text-[#2A0800] leading-[1.1] mb-6">
            Deliver <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F7B538] to-[#E59A1D]">joy and earn.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-[#8E7B73] text-lg font-bold max-w-md leading-relaxed">
            Join the UrbanBites fleet to earn on your own schedule. Fast weekly payouts and flexible working hours.
          </motion.p>
        </div>
      </div>

      <div className="w-full lg:w-[55%] flex items-center justify-center p-6 sm:p-12 relative overflow-y-auto bg-transparent z-10">
        <div className="w-full max-w-[400px] relative">
          <Link to="/partner-with-us" className="lg:hidden inline-flex items-center gap-2 bg-white/80 backdrop-blur-md text-[#780116] border border-white hover:bg-white font-black px-5 py-2.5 rounded-full transition-all shadow-md hover:shadow-lg mb-10">
            <ArrowLeft size={18} /> Back
          </Link>

          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl font-black text-[#2A0800] tracking-tight mb-2 font-display">
              Delivery <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F7B538] to-[#E59A1D]">Partner.</span>
            </h1>
            <p className="text-[#8E7B73] font-bold">Join our massive fleet and earn flexibly.</p>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="form1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-red-600 shadow-sm">
                    <AlertCircle size={18} className="shrink-0" />
                    <p className="text-xs font-bold">{error}</p>
                  </motion.div>
                )}

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <DarkInput icon={User} name="fullName" type="text" placeholder="Full Name" value={formData.fullName} onChange={handleChange} error={validationErrors.fullName} />
                  <DarkInput icon={Mail} name="email" type="email" placeholder="Email address" value={formData.email} onChange={handleChange} error={validationErrors.email} />
                  <div className="pb-2">
                    <DarkInput icon={Lock} name="password" type="password" placeholder="Password (min. 8 chars)" value={formData.password} onChange={handleChange} error={validationErrors.password} />
                  </div>
                  <button type="submit" disabled={isLoading}
                    className="w-full h-14 rounded-2xl bg-[#780116] border-2 border-[#A00320] text-white font-black text-lg shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 group">
                    {isLoading ? 'Creating account…' : 'Start Delivering'}
                    {!isLoading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-[#EADDCD] text-center border-dashed">
                  <p className="text-[#8E7B73] text-sm font-bold">
                    Already a partner?{' '}
                    <Link to="/login?role=delivery" className="text-[#780116] hover:text-[#F7B538] font-black transition-colors">Sign In here</Link>
                  </p>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="form3" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <h3 className="text-3xl font-black text-[#780116] tracking-tight mb-2 font-display">Verify <span className="text-[#F7B538]">Email</span></h3>
                <p className="text-[#8E7B73] font-bold text-sm mb-6">
                  Check your inbox! We've sent a 6-digit code to <span className="text-[#780116]">{formData.email}</span>
                </p>

                {otpError && (
                  <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-red-600 shadow-sm">
                    <AlertCircle size={18} className="shrink-0" />
                    <p className="text-xs font-bold">{otpError}</p>
                  </div>
                )}

                <div className="relative mb-8">
                  <div className="flex justify-between gap-2">
                    {otpDigits.map((d, i) => (
                      <OtpDigitInput
                        key={i}
                        value={d}
                        inputRef={(el) => otpRefs.current[i] = el}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      />
                    ))}
                  </div>
                </div>

                <button onClick={() => verifyOtp(otpDigits.join(''))} disabled={isProcessingOtp}
                  className="w-full h-14 rounded-2xl bg-[#780116] border-2 border-[#A00320] text-white font-black text-lg shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all flex items-center justify-center">
                  {isProcessingOtp ? 'Verifying...' : 'Verify Email'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
