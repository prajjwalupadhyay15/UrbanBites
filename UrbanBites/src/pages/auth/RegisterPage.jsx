import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/authApi';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, AlertCircle, Phone, ArrowLeft, ArrowRight, Edit3, CheckCircle2, Flame, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

/* Reusable light vibrant input */
function LightInput({ icon: Icon, error, type, ...props }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="relative group flex-1 w-full">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E7B73] group-focus-within:text-[#780116] transition-colors z-10" size={20} />
      <input
        type={inputType}
        {...props}
        className={`w-full bg-white/50 backdrop-blur-md border-2 ${error ? 'border-red-500 bg-red-50/80' : 'border-white'} text-[#2A0800] placeholder:text-[#AFA49F] rounded-2xl py-4 pl-12 ${isPassword ? 'pr-12' : 'pr-4'} outline-none focus:border-[#F7B538] focus:bg-white transition-all font-bold text-base shadow-sm hover:shadow-md`}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E7B73] hover:text-[#780116] transition-colors z-10"
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
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
      className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-black text-[#780116] bg-[#FFFCF5] border-2 border-[#EADDCD] outline-none rounded-2xl focus:shadow-glow-orange transition-shadow shadow-sm focus:bg-white"
    />
  );
}

export default function RegisterPage() {
  const [method, setMethod] = useState('email');
  const [step, setStep] = useState(1); 
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', phone: '' });
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [validationErrors, setValidationErrors] = useState({});
  const [otpError, setOtpError] = useState('');
  const [isProcessingOtp, setIsProcessingOtp] = useState(false);
  const otpRefs = useRef([]);

  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => { clearError(); setValidationErrors({}); setOtpError(''); }, [method, step]);

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

  const validatePhone = () => {
    const err = {};
    if (!/^[0-9]{10}$/.test(formData.phone)) err.phone = 'Enter a valid 10-digit number';
    setValidationErrors(err);
    return !Object.keys(err).length;
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!validateEmail()) return;
    try {
      await register({ fullName: formData.fullName, email: formData.email, password: formData.password, role: 'CUSTOMER' });
      toast.success('Account created! Please verify your email.');
      setOtpDigits(['', '', '', '', '', '']);
      setOtpError('');
      setStep(4);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Registration failed');
    }
  };

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    if (!validatePhone()) return;
    setStep(2);
  };

  const confirmPhoneAndRequestOtp = async () => {
    setIsProcessingOtp(true);
    setOtpError('');
    try {
      await authApi.requestPhoneOtp({ phone: formData.phone });
      setStep(3);
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Failed to send OTP. Try again.');
      setStep(1);
    } finally {
      setIsProcessingOtp(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);
    setOtpError('');
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (value && index === 5) {
      if (step === 3) verifyPhoneOtp(next.join(''));
      if (step === 4) verifyEmailOtp(next.join(''));
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0)
      otpRefs.current[index - 1]?.focus();
  };

  const verifyPhoneOtp = async (code) => {
    if (code.length < 6) return;
    setIsProcessingOtp(true);
    setOtpError('');
    try {
      const resp = await authApi.verifyPhoneOtp({ phone: formData.phone, otp: code });
      useAuthStore.setState({
        user: { email: resp.email, fullName: resp.fullName },
        role: resp.role,
        token: resp.accessToken,
        isAuthenticated: true
      });
      localStorage.setItem('token', resp.accessToken);
      toast.success('Phone verified! Welcome to UrbanBites!');
      const redirectTo = searchParams.get('redirect');
      const redirectPath = redirectTo || useAuthStore.getState().getRoleRedirectPath(resp?.role);
      navigate(redirectPath || '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
      setOtpError(err.response?.data?.message || 'Invalid OTP. Please try again.');
      setOtpDigits(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setIsProcessingOtp(false);
    }
  };

  const verifyEmailOtp = async (code) => {
    if (code.length < 6) return;
    setIsProcessingOtp(true);
    setOtpError('');
    try {
      await authApi.verifyEmailOtp({ otp: code });
      toast.success('Email verified! Welcome!');
      const redirectTo = searchParams.get('redirect');
      const role = useAuthStore.getState().role;
      const redirectPath = redirectTo || useAuthStore.getState().getRoleRedirectPath(role);
      navigate(redirectPath || '/');
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Invalid OTP. Please try again.');
      setOtpDigits(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setIsProcessingOtp(false);
    }
  };

  const resendEmailOtp = async () => {
    setIsProcessingOtp(true);
    setOtpError('');
    try {
      await authApi.requestEmailVerificationOtp();
      setOtpError('');
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Failed to resend OTP.');
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
            className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#F7B538]/20 rounded-full blur-[120px]"
            animate={{ x: [30, -30], y: [-30, 30] }}
            transition={{ duration: 12, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 1 }}
          />
        </div>

        {/* Floating Glass Orbs: Foreground (Crisp, active) */}
        <motion.div 
          className="absolute top-32 left-10 w-32 h-32 rounded-[2rem] bg-white/60 backdrop-blur-2xl border border-white shadow-2xl flex items-center justify-center text-[#780116]"
          animate={{ y: [-20, 20], rotate: [-10, 15] }}
          transition={{ duration: 6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        >
          <Flame size={48} className="drop-shadow-xl" />
        </motion.div>
        
        <motion.div 
          className="absolute bottom-40 right-10 w-40 h-40 rounded-full bg-white/60 backdrop-blur-2xl border border-white shadow-2xl flex items-center justify-center text-[#F7B538]"
          animate={{ y: [25, -25], rotate: [15, -10] }}
          transition={{ duration: 8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 1 }}
        >
          <User size={64} className="drop-shadow-xl" />
        </motion.div>

        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-md text-[#780116] border border-white hover:bg-white font-black px-6 py-3 rounded-full transition-all shadow-lg hover:shadow-xl">
            <ArrowLeft size={20} /> Home
          </Link>
        </div>

        <div className="relative z-10 mt-auto bg-white/60 p-10 rounded-[3rem] backdrop-blur-xl border-2 border-white shadow-2xl">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-5xl font-display font-black text-[#2A0800] leading-[1.1] mb-6">
            Join the feast.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F7B538] to-[#E59A1D]">Sign up now.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-[#8E7B73] text-lg font-bold max-w-md leading-relaxed">
            Create an account to start ordering from thousands of top-rated restaurants around you.
          </motion.p>
        </div>
      </div>

      {/* ─── RIGHT PANEL (Forms) ─── */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-6 sm:p-12 relative bg-transparent z-10">
        <div className="w-full max-w-[420px] relative">
          <Link to="/" className="lg:hidden inline-flex items-center gap-2 bg-white text-[#780116] border border-[#EADDCD] hover:bg-[#FDF9F1] hover:border-[#F7B538] font-black px-5 py-2.5 rounded-full transition-all shadow-md hover:shadow-lg mb-10">
            <ArrowLeft size={18} /> Back
          </Link>

          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl font-display font-black text-[#780116] tracking-tight mb-2">
              Create Account
            </h1>
            <p className="text-[#8E7B73] font-bold">Start ordering deliciousness today.</p>
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1 / 2: form */}
            {(step === 1 || step === 2) && (
              <motion.div key="form" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                {/* Method toggle */}
                <div className="flex bg-[#FFFCF5] p-1.5 rounded-2xl mb-8 border border-[#EADDCD] shadow-inner">
                  {[{ id: 'email', label: '📧 Email' }, { id: 'phone', label: '📱 Mobile' }].map(({ id, label }) => (
                    <button key={id}
                      onClick={() => { if (step === 1) { setMethod(id); clearError(); } }}
                      disabled={step === 2}
                      className={`flex-1 py-3 font-bold text-sm rounded-xl transition-all
                        ${method === id ? 'bg-white text-[#780116] shadow-sm' : 'text-[#8E7B73] hover:text-[#2A0800]'}
                        disabled:opacity-60 disabled:cursor-not-allowed`}>
                      {label}
                    </button>
                  ))}
                </div>

                {(error) && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
                    <AlertCircle size={20} className="shrink-0 text-red-500" />
                    <p className="text-sm font-bold">{error}</p>
                  </motion.div>
                )}

                {method === 'email' ? (
                  <form onSubmit={handleEmailSubmit} className="space-y-5">
                    <LightInput icon={User} name="fullName" type="text" placeholder="Full Name" value={formData.fullName} onChange={handleChange} error={validationErrors.fullName} disabled={step === 2} />
                    <LightInput icon={Mail} name="email" type="email" placeholder="Email address" value={formData.email} onChange={handleChange} error={validationErrors.email} disabled={step === 2} />
                    <div className="pb-3">
                      <LightInput icon={Lock} name="password" type="password" placeholder="Password (min. 8 chars)" value={formData.password} onChange={handleChange} error={validationErrors.password} disabled={step === 2} />
                    </div>
                    <button type="submit" disabled={isLoading || step === 2}
                      className="w-full h-14 rounded-2xl bg-[#780116] text-white font-black text-lg shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 group">
                      {isLoading ? 'Creating account…' : 'Create Account'}
                      {!isLoading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handlePhoneSubmit} className="space-y-5">
                    <div className="pb-3">
                      <LightInput icon={Phone} name="phone" type="tel" placeholder="Mobile number (10 digits)" value={formData.phone} onChange={handleChange} maxLength={10} error={validationErrors.phone} disabled={step === 2} />
                    </div>
                    <button type="submit" disabled={step === 2}
                      className="w-full h-14 rounded-2xl bg-[#780116] text-white font-black text-lg shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 group">
                      Continue <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </form>
                )}
              </motion.div>
            )}

            {/* Step 3: Phone OTP */}
            {step === 3 && (
              <motion.div key="otp" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                <button onClick={() => { setStep(1); setOtpDigits(['', '', '', '', '', '']); setOtpError(''); }}
                  className="mb-8 flex items-center gap-2 text-[#8E7B73] hover:text-[#780116] text-sm font-bold transition-colors">
                  <ArrowLeft size={18} /> Change Number
                </button>

                <h3 className="text-4xl font-display font-black text-[#780116] mb-2">Enter OTP</h3>
                <p className="text-[#8E7B73] text-base font-bold mb-8">
                  Sent to <span className="text-[#2A0800]">+91 {formData.phone}</span>
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

                <button onClick={() => verifyPhoneOtp(otpDigits.join(''))} disabled={isProcessingOtp}
                  className="w-full h-14 rounded-2xl bg-[#780116] text-white font-black text-lg shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center">
                  {isProcessingOtp ? 'Verifying…' : '🔓 Verify & Create Account'}
                </button>

                <p className="text-center text-sm font-bold text-[#8E7B73] mt-6">
                  Didn't get it?{' '}
                  <button onClick={confirmPhoneAndRequestOtp} className="text-[#F7B538] hover:text-[#780116] transition-colors">Resend OTP</button>
                </p>
              </motion.div>
            )}

            {/* Step 4: Email OTP verification card */}
            {step === 4 && (
              <motion.div key="email-otp" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <button onClick={() => { setStep(1); setOtpDigits(['', '', '', '', '', '']); setOtpError(''); }}
                  className="mb-8 flex items-center gap-2 text-[#8E7B73] hover:text-[#780116] text-sm font-bold transition-colors">
                  <ArrowLeft size={18} /> Back
                </button>

                <h3 className="text-4xl font-display font-black text-[#780116] mb-2">Verify Email</h3>
                <p className="text-[#8E7B73] text-base font-bold mb-8">
                  We sent a 6-digit code to <span className="text-[#2A0800]">{formData.email}</span>
                </p>

                {otpError && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
                    <AlertCircle size={20} className="shrink-0" />
                    <p className="text-sm font-bold">{otpError}</p>
                  </motion.div>
                )}

                <div className="flex justify-between gap-2 mb-8">
                  {otpDigits.map((d, i) => (
                    <OtpDigitInput key={i} value={d} inputRef={(el) => otpRefs.current[i] = el} onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(i, e)} />
                  ))}
                </div>

                <button onClick={() => verifyEmailOtp(otpDigits.join(''))} disabled={isProcessingOtp}
                  className="w-full h-14 rounded-2xl bg-[#780116] text-white font-black text-lg shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center">
                  {isProcessingOtp ? 'Verifying…' : '✉️ Verify & Continue'}
                </button>

                <p className="text-center text-sm font-bold text-[#8E7B73] mt-6">
                  Didn't get it?{' '}
                  <button onClick={resendEmailOtp} disabled={isProcessingOtp} className="text-[#F7B538] hover:text-[#780116] transition-colors disabled:opacity-50">Resend OTP</button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Confirmation bubble modal overlay (Step 2) */}
          <AnimatePresence>
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-[#2A0800]/60 backdrop-blur-md rounded-3xl"
              >
                <motion.div
                  initial={{ scale: 0.75, opacity: 0, y: 24 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.85, opacity: 0, y: 16 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                  className="bg-white border-2 border-[#EADDCD] shadow-premium rounded-[2.5rem] p-8 w-[calc(100%-2rem)] max-w-sm text-center relative overflow-hidden"
                >
                  {/* Top color accent */}
                  <div className="absolute top-0 left-0 right-0 h-2 bg-[#F7B538]" />

                  <div className="relative z-10">
                    <div className="w-16 h-16 bg-[#FDF9F1] border-2 border-[#EADDCD] rounded-2xl flex items-center justify-center mx-auto mb-5 text-3xl">
                      📱
                    </div>
                    <h3 className="text-3xl font-display font-black text-[#780116] tracking-tight mb-2">Confirm Number</h3>
                    <p className="text-[#8E7B73] text-sm font-bold mb-6">We'll send you an OTP to verify this number</p>

                    {otpError && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="mb-4 p-3 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center gap-2 text-red-500">
                        <AlertCircle size={14} />
                        <p className="text-xs font-bold">{otpError}</p>
                      </motion.div>
                    )}

                    <div className="bg-[#FFFCF5] border border-[#EADDCD] rounded-2xl py-4 mb-8">
                      <p className="text-[#8E7B73] text-[10px] font-black uppercase tracking-widest mb-1">Mobile</p>
                      <p className="text-2xl font-black text-[#2A0800] tracking-widest">+91 {formData.phone}</p>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button onClick={confirmPhoneAndRequestOtp} disabled={isProcessingOtp}
                        className="w-full h-14 rounded-2xl bg-[#780116] text-white font-black text-lg shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                        {isProcessingOtp ? 'Sending…' : 'Confirm & Get OTP'} {!isProcessingOtp && <CheckCircle2 size={20} />}
                      </button>
                      <button onClick={() => setStep(1)}
                        className="w-full h-12 rounded-2xl bg-[#FFFCF5] border border-[#EADDCD] text-[#2A0800] font-bold text-sm hover:bg-[#FDF9F1] transition-all flex items-center justify-center gap-1.5">
                        <Edit3 size={16} /> Edit Number
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {step === 1 && (
            <div className="mt-10 pt-6 border-t border-[#EADDCD] text-center">
              <p className="text-[#8E7B73] text-base font-bold">
                Already have an account?{' '}
                <Link to="/login" className="text-[#F7B538] hover:text-[#780116] font-bold transition-colors">Sign In</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
