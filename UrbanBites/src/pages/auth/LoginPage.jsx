import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/authApi';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, AlertCircle, Phone, ArrowLeft, ArrowRight, Flame, Eye, EyeOff, ShieldCheck } from 'lucide-react';
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
      {error && <p className="absolute -bottom-5 left-1 text-xs font-bold text-red-500">{error}</p>}
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

export default function LoginPage() {
  const [method, setMethod] = useState('email');
  const [formData, setFormData] = useState({ email: '', password: '', phone: '', otp: '' });
  const [step, setStep] = useState(1); 
  const [isProcessingOtp, setIsProcessingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpRefs = React.useRef([]);

  const [sessionExpiredInfo, setSessionExpiredInfo] = useState(null);
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleSource = searchParams.get('role');

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('__ub_last_401');
      if (raw) {
        const info = JSON.parse(raw);
        console.warn('🔒 Session expired — the API call that caused logout:', info);
        setSessionExpiredInfo(info);
        sessionStorage.removeItem('__ub_last_401');
      }
    } catch (_) {}
  }, []);

  let signupLink = "/register";
  if (roleSource === 'restaurant') signupLink = "/partner/restaurant/register";
  if (roleSource === 'delivery') signupLink = "/partner/delivery/register";

  useEffect(() => { clearError(); setValidationErrors({}); setOtpError(''); }, [method, step]);

  const handleChange = (e) => {
    clearError();
    setValidationErrors({ ...validationErrors, [e.target.name]: '' });
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateEmail = () => {
    const err = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) err.email = 'Invalid email';
    if (!formData.password) err.password = 'Password required';
    setValidationErrors(err);
    return Object.keys(err).length === 0;
  };

  const validatePhone = () => {
    const err = {};
    if (!/^\d{10}$/.test(formData.phone)) err.phone = '10 digit number required';
    setValidationErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!validateEmail()) return;
    try {
      const res = await login({ email: formData.email, password: formData.password });
      if (!res.isEmailVerified && res.role === 'CUSTOMER') {
        setStep(5);
        try { await authApi.requestEmailVerificationOtp(); } catch(e){}
        return;
      }
      toast.success('Welcome back!');
      const redirectTo = searchParams.get('redirect');
      const redirectPath = redirectTo || useAuthStore.getState().getRoleRedirectPath(res.role);
      navigate(redirectPath || '/');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Login failed');
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!validatePhone()) return;
    setIsProcessingOtp(true);
    setOtpError('');
    try {
      await authApi.requestPhoneLoginOtp({ phone: formData.phone });
      toast.success('OTP sent to your phone!');
      setStep(2);
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
      setOtpError(err.response?.data?.message || 'Failed to send OTP. Try again.');
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
      if (step === 2) verifyPhoneOtp(next.join(''));
      if (step === 5) verifyEmailOtp(next.join(''));
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
      toast.success('Signed in successfully!');
      const redirectTo = searchParams.get('redirect');
      const redirectPath = redirectTo || useAuthStore.getState().getRoleRedirectPath(resp?.role);
      navigate(redirectPath || '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
      setOtpError(err.response?.data?.message || 'Invalid OTP. Try again.');
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
      toast.success('Email verified!');
      const redirectTo = searchParams.get('redirect');
      const role = useAuthStore.getState().role;
      const redirectPath = redirectTo || useAuthStore.getState().getRoleRedirectPath(role);
      navigate(redirectPath || '/');
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Invalid OTP. Try again.');
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
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setIsProcessingOtp(false);
    }
  };

  const handleRequestPasswordReset = async (e) => {
    e.preventDefault();
    if (method === 'email' && !formData.email) {
      setValidationErrors({ email: 'Email required for reset' }); return;
    }
    if (method === 'phone' && !formData.phone) {
      setValidationErrors({ phone: 'Phone required for reset' }); return;
    }
    setIsProcessingOtp(true);
    setOtpError('');
    try {
      const payload = method === 'email' ? { email: formData.email } : { phone: formData.phone };
      await authApi.requestPasswordResetOtp(payload);
      setStep(4);
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Failed to request reset');
    } finally { setIsProcessingOtp(false); }
  };

  const handleConfirmPasswordReset = async (e) => {
    e.preventDefault();
    if (!formData.newPassword || formData.newPassword.length < 8) {
      setValidationErrors({ newPassword: 'Password must be at least 8 characters' }); return;
    }
    const code = otpDigits.join('');
    if (code.length < 6) {
      setOtpError('Please complete the 6-digit code'); return;
    }
    setIsProcessingOtp(true);
    setOtpError('');
    try {
      const payload = method === 'email' 
        ? { email: formData.email, otp: code, newPassword: formData.newPassword }
        : { phone: formData.phone, otp: code, newPassword: formData.newPassword };
      await authApi.confirmPasswordReset(payload);
      toast.success('Password reset successful! Please login.');
      setStep(1);
      setOtpError('Password reset successful! Please login.');
      setFormData({ ...formData, password: '', newPassword: '' });
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Failed to reset password');
    } finally { setIsProcessingOtp(false); }
  };

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
          <ShieldCheck size={64} className="drop-shadow-xl" />
        </motion.div>

        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-md text-[#780116] border border-white hover:bg-white font-black px-6 py-3 rounded-full transition-all shadow-lg hover:shadow-xl">
            <ArrowLeft size={20} /> Home
          </Link>
        </div>

        <div className="relative z-10 mt-auto bg-white/60 p-10 rounded-[3rem] backdrop-blur-xl border-2 border-white shadow-2xl">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-5xl font-display font-black text-[#2A0800] leading-[1.1] mb-6">
            Welcome back to <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F7B538] to-[#E59A1D]">UrbanBites.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-[#8E7B73] text-lg font-bold max-w-md leading-relaxed">
            Sign in to manage your orders, track deliveries, and discover new favorite flavors.
          </motion.p>
        </div>
      </div>

      {/* ─── RIGHT PANEL (Forms) ─── */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-6 sm:p-12 relative bg-transparent z-10">
        <div className="w-full max-w-[420px] relative">
          <Link to="/" className="lg:hidden inline-flex items-center gap-2 bg-white text-[#780116] border border-[#EADDCD] hover:bg-[#FDF9F1] hover:border-[#F7B538] font-black px-5 py-2.5 rounded-full transition-all shadow-md hover:shadow-lg mb-10">
            <ArrowLeft size={18} /> Back
          </Link>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <h2 className="text-4xl font-display font-black text-[#780116] mb-2">Sign In</h2>
                <p className="text-[#8E7B73] font-bold mb-8">Access your personalized food hub.</p>

                <div className="flex bg-[#FFFCF5] p-1.5 rounded-2xl mb-8 border border-[#EADDCD] shadow-inner">
                  <button onClick={() => { setMethod('email'); clearError(); }} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${method === 'email' ? 'bg-white text-[#780116] shadow-sm' : 'text-[#8E7B73] hover:text-[#2A0800]'}`}>Email</button>
                  <button onClick={() => { setMethod('phone'); clearError(); }} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${method === 'phone' ? 'bg-white text-[#780116] shadow-sm' : 'text-[#8E7B73] hover:text-[#2A0800]'}`}>Mobile OTP</button>
                </div>

                {sessionExpiredInfo && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="mb-6 p-4 bg-[#F7B538]/10 border border-[#F7B538]/30 rounded-2xl text-[#780116]">
                    <p className="text-sm font-bold mb-1">⚡ Session expired — you were logged out automatically.</p>
                  </motion.div>
                )}
                {(error || otpError) && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
                    <AlertCircle size={20} className="shrink-0 text-red-500" />
                    <p className="text-sm font-bold">{error || otpError}</p>
                  </motion.div>
                )}

                {method === 'email' ? (
                  <form onSubmit={handleEmailSubmit} className="space-y-5">
                    <LightInput icon={Mail} name="email" type="email" placeholder="Email address" value={formData.email} onChange={handleChange} error={validationErrors.email} />
                    <div className="pb-3">
                      <LightInput icon={Lock} name="password" type="password" placeholder="Password" value={formData.password} onChange={handleChange} error={validationErrors.password} />
                    </div>
                    <div className="flex justify-end -mt-3">
                      <button type="button" onClick={() => setStep(3)} className="text-sm font-bold text-[#8E7B73] hover:text-[#F7B538] transition-colors">Forgot Password?</button>
                    </div>
                    <button type="submit" disabled={isLoading}
                      className="w-full h-14 rounded-2xl bg-[#780116] text-white font-black text-lg shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 group">
                      {isLoading ? 'Signing in…' : 'Sign In'}
                      {!isLoading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-5">
                    <LightInput icon={Phone} name="phone" type="tel" placeholder="Mobile number (10 digits)" value={formData.phone} onChange={handleChange} maxLength={10} error={validationErrors.phone} />
                    <button onClick={handleRequestOtp} disabled={isProcessingOtp}
                      className="w-full h-14 rounded-2xl bg-[#780116] text-white font-black text-lg shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 group">
                      {isProcessingOtp ? 'Sending OTP…' : 'Get OTP'}
                      {!isProcessingOtp && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
                <button onClick={() => { setStep(1); setOtpError(''); }} className="mb-8 flex items-center gap-2 text-[#8E7B73] hover:text-[#780116] text-sm font-bold transition-colors">
                  <ArrowLeft size={18} /> Change Number
                </button>
                <h3 className="text-4xl font-display font-black text-[#780116] mb-2">Verify OTP</h3>
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
                  {isProcessingOtp ? 'Verifying…' : 'Verify & Sign In'}
                </button>

                <p className="text-center text-sm font-bold text-[#8E7B73] mt-6">
                  Didn't get it?{' '}
                  <button onClick={() => { setStep(1); setOtpDigits(['', '', '', '', '', '']); }} className="text-[#F7B538] hover:text-[#780116] transition-colors">
                    Resend
                  </button>
                </p>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
                <button onClick={() => { setStep(1); setOtpError(''); setValidationErrors({}); }} className="mb-8 flex items-center gap-2 text-[#8E7B73] hover:text-[#780116] text-sm font-bold transition-colors">
                  <ArrowLeft size={18} /> Back to Login
                </button>
                <h3 className="text-4xl font-display font-black text-[#780116] mb-2">Reset Password</h3>
                <p className="text-[#8E7B73] text-base font-bold mb-8">Enter your {method} to receive a password reset code.</p>

                {(error || otpError) && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
                    <AlertCircle size={20} className="shrink-0" />
                    <p className="text-sm font-bold">{error || otpError}</p>
                  </motion.div>
                )}

                <form onSubmit={handleRequestPasswordReset} className="space-y-5">
                  {method === 'email' ? (
                    <LightInput icon={Mail} name="email" type="email" placeholder="Registered Email" value={formData.email} onChange={handleChange} error={validationErrors.email} />
                  ) : (
                    <LightInput icon={Phone} name="phone" type="tel" placeholder="Registered Mobile" value={formData.phone} onChange={handleChange} maxLength={10} error={validationErrors.phone} />
                  )}

                  <button type="submit" disabled={isProcessingOtp}
                    className="w-full h-14 mt-2 rounded-2xl bg-[#780116] text-white font-black text-lg shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center">
                    {isProcessingOtp ? 'Sending Reset Code…' : 'Send Code'}
                  </button>
                </form>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
                <button onClick={() => { setStep(3); setOtpError(''); setOtpDigits(['', '', '', '', '', '']); }} className="mb-8 flex items-center gap-2 text-[#8E7B73] hover:text-[#780116] text-sm font-bold transition-colors">
                  <ArrowLeft size={18} /> Back
                </button>
                <h3 className="text-4xl font-display font-black text-[#780116] mb-2">New Password</h3>
                <p className="text-[#8E7B73] text-base font-bold mb-8">Enter the 6-digit code sent to your {method}.</p>

                {otpError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
                    <AlertCircle size={20} className="shrink-0" />
                    <p className="text-sm font-bold">{otpError}</p>
                  </div>
                )}

                <form onSubmit={handleConfirmPasswordReset} className="space-y-8">
                  <div>
                    <div className="flex justify-between gap-1 sm:gap-2 mb-2">
                      {otpDigits.map((d, i) => (
                        <OtpDigitInput key={i} value={d} inputRef={(el) => otpRefs.current[i] = el}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (isNaN(val)) return;
                            const next = [...otpDigits];
                            next[i] = val;
                            setOtpDigits(next);
                            setOtpError('');
                            if (val && i < 5) otpRefs.current[i + 1]?.focus();
                          }}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)} />
                      ))}
                    </div>
                  </div>

                  <LightInput icon={Lock} name="newPassword" type="password" placeholder="New Password (min. 8 chars)" value={formData.newPassword} onChange={handleChange} error={validationErrors.newPassword} />

                  <button type="submit" disabled={isProcessingOtp}
                    className="w-full h-14 rounded-2xl bg-[#780116] text-white font-black text-lg shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center">
                    {isProcessingOtp ? 'Resetting Password…' : 'Reset My Password'}
                  </button>
                </form>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div key="s5" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
                <button onClick={() => { setStep(1); setOtpError(''); }} className="mb-8 flex items-center gap-2 text-[#8E7B73] hover:text-[#780116] text-sm font-bold transition-colors">
                  <ArrowLeft size={18} /> Back to Login
                </button>
                <h3 className="text-4xl font-display font-black text-[#780116] mb-2">Verify Email</h3>
                <p className="text-[#8E7B73] text-base font-bold mb-8">
                  We sent a 6-digit code to <span className="text-[#2A0800]">{formData.email}</span>
                </p>

                {otpError && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
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
                  className="w-full h-14 rounded-2xl bg-[#780116] text-white font-black text-lg shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isProcessingOtp ? 'Verifying…' : <><ShieldCheck size={20} /> Verify & Sign In</>}
                </button>

                <p className="text-center text-sm font-bold text-[#8E7B73] mt-6">
                  Didn't get it?{' '}
                  <button onClick={resendEmailOtp} disabled={isProcessingOtp} className="text-[#F7B538] hover:text-[#780116] transition-colors disabled:opacity-50">
                    Resend OTP
                  </button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-10 pt-6 border-t border-[#EADDCD] text-center">
            <p className="text-[#8E7B73] text-base font-bold">
              Don't have an account?{' '}
              <Link to={signupLink} className="text-[#F7B538] hover:text-[#780116] transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
