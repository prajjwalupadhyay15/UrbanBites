import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, addressApi } from '../../api/userApi';
import { walletApi } from '../../api/walletApi';
import { authApi } from '../../api/authApi';
import { useAuthStore } from '../../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { reviewApi } from '../../api/reviewApi';
import {
  User, MapPin, Settings, Plus, Star, Trash2, Edit2, Camera,
  CheckCircle2, AlertCircle, Home, Briefcase, MoreHorizontal,
  Shield, LogOut, ChevronRight, Phone, Mail, Clock, Bell, X, ShieldCheck,
  MessageSquare, HelpCircle, Wallet, ArrowDownRight, ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AddressFormModal from '../../components/common/AddressFormModal';

const IMAGE_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

const TABS = [
  { id: 'profile', label: 'Personal Info', icon: User },
  { id: 'wallet', label: 'UrbanBites Wallet', icon: Wallet },
  { id: 'addresses', label: 'Saved Addresses', icon: MapPin },
  { id: 'reviews', label: 'My Reviews', icon: Star },
  { id: 'support', label: 'Help & Support', icon: HelpCircle },
  { id: 'settings', label: 'Settings', icon: Settings },
];

/* â”€â”€ Light vibrant input â”€â”€ */
function DI({ label, icon: Icon, error, ...props }) {
  return (
    <div>
      {label && <label className="block text-xs font-bold text-[#8E7B73] uppercase tracking-wider mb-1.5">{label}</label>}
      <div className="relative group">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E7B73] group-focus-within:text-[#780116] transition-colors" size={18} />}
        <input
          {...props}
          className={`w-full bg-[#FFFCF5] border-2 ${error ? 'border-red-500 bg-red-50' : 'border-[#EADDCD]'} text-[#2A0800] placeholder:text-[#AFA49F] rounded-2xl py-3.5 ${Icon ? 'pl-12' : 'pl-4'} pr-4 outline-none focus:border-[#F7B538] focus:bg-white transition-all font-bold text-sm shadow-sm`}
        />
      </div>
      {error && <p className="mt-1 text-xs font-bold text-red-500">{error}</p>}
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout, checkAuth } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: userApi.getProfile,
  });

  const avatarUrl = profile?.profilePictureUrl
    ? profile.profilePictureUrl.startsWith('http')
      ? profile.profilePictureUrl
      : `${IMAGE_BASE}${profile.profilePictureUrl}`
    : null;

  const initial = (profile?.fullName || user?.fullName || 'U').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#FFFCF5] pt-28 pb-16 font-sans">
      {/* Hero header */}
      <div className="relative overflow-hidden bg-white shadow-sm border-b border-[#EADDCD]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#F7B538]/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-64 bg-[#780116]/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-4 border-white shadow-lg bg-[#FFFCF5]">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#FDF9F1] flex items-center justify-center text-5xl font-display font-black text-[#780116]">
                    {initial}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 border-4 border-white rounded-full" />
            </div>

            <div className="pt-2">
              <h1 className="text-3xl sm:text-5xl font-display font-black text-[#780116] tracking-tight">
                {profileLoading ? <span className="animate-pulse bg-[#EADDCD] rounded-xl w-48 h-10 block mx-auto sm:mx-0" /> : (profile?.fullName || 'My Profile')}
              </h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3">
                {profile?.email && (
                  <span className="flex items-center gap-1.5 text-[#8E7B73] text-sm font-bold">
                    <Mail size={16} className="text-[#F7B538]" /> {profile.email}
                  </span>
                )}
                {profile?.phone && (
                  <span className="flex items-center gap-1.5 text-[#8E7B73] text-sm font-bold">
                    <Phone size={16} className="text-[#F7B538]" /> {profile.phone}
                  </span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap justify-center sm:justify-start items-center gap-2">
                <span className="bg-[#FFFCF5] border border-[#EADDCD] px-4 py-1.5 rounded-full text-xs font-black text-[#2A0800] capitalize shadow-sm">
                  {profile?.role.toLowerCase().replace('_', ' ')}
                </span>
                {!profile?.emailVerified && (
                  <span className="bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                    <AlertCircle size={12} /> Email Unverified
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Navigation Sidebar */}
          <div className="lg:w-72 shrink-0">
            <div className="sticky top-24 bg-white border border-[#EADDCD] rounded-[2rem] p-3 shadow-sm">
              <nav className="flex flex-col gap-1">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm w-full text-left
                        ${isActive 
                          ? 'bg-[#FDF9F1] text-[#780116] shadow-sm' 
                          : 'text-[#8E7B73] hover:bg-[#FFFCF5] hover:text-[#2A0800]'}`}
                    >
                      <Icon size={18} className={isActive ? 'text-[#F7B538]' : ''} />
                      {tab.label}
                      {isActive && <ChevronRight size={16} className="ml-auto text-[#780116]/40" />}
                    </button>
                  );
                })}
                <div className="h-px bg-[#EADDCD] my-2 mx-4" />
                <button
                  onClick={logout}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-red-600 hover:bg-red-50 font-bold text-sm w-full text-left transition-colors"
                >
                  <LogOut size={18} /> Logout
                </button>
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-white border border-[#EADDCD] rounded-[2.5rem] shadow-sm overflow-hidden"
              >
                {activeTab === 'profile' && <ProfileTab profile={profile} isLoading={profileLoading} />}
                {activeTab === 'wallet' && <WalletTab />}
                {activeTab === 'addresses' && <AddressesTab />}
                {activeTab === 'reviews' && <ReviewsTab />}
                {activeTab === 'support' && <SupportTab />}
                {activeTab === 'settings' && <SettingsTab profile={profile} />}
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ TABS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ProfileTab({ profile, isLoading }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ fullName: '' });
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => userApi.updateProfile(data),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['profile'], updatedProfile);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-profile'] });
      // Sync authStore so Navbar, Dashboard greetings update instantly
      useAuthStore.setState((prev) => ({
        user: { ...prev.user, fullName: updatedProfile.fullName },
      }));
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update profile');
    },
  });

  if (isLoading) return <div className="p-8"><div className="w-full h-64 bg-[#FFFCF5] animate-pulse rounded-3xl" /></div>;

  return (
    <div className="p-6 sm:p-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#EADDCD]">
        <div>
          <h2 className="text-2xl font-display font-black text-[#780116]">Personal Information</h2>
          <p className="text-[#8E7B73] font-bold text-sm">Update your photo and personal details.</p>
        </div>
        {!isEditing && (
          <button onClick={() => {
            setFormData({ fullName: profile?.fullName || '' });
            setPreviewUrl(profile?.profilePictureUrl ? (profile.profilePictureUrl.startsWith('http') ? profile.profilePictureUrl : `${IMAGE_BASE}${profile.profilePictureUrl}`) : null);
            setIsEditing(true);
          }} className="bg-[#FFFCF5] border-2 border-[#EADDCD] hover:border-[#F7B538] text-[#2A0800] px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm">
            <Edit2 size={16} className="text-[#780116]" /> Edit Profile
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={(e) => {
          e.preventDefault();
          updateMutation.mutate({
            fullName: formData.fullName,
            email: profile.email,
            profileImage: imageFile
          });
        }} className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#EADDCD] bg-[#FFFCF5] shadow-inner">
                {previewUrl ? <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#8E7B73]"><User size={32} /></div>}
              </div>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#780116] rounded-full flex items-center justify-center text-white border-2 border-white shadow-md hover:scale-110 transition-transform">
                <Camera size={14} />
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                if(e.target.files[0]) {
                  setImageFile(e.target.files[0]);
                  setPreviewUrl(URL.createObjectURL(e.target.files[0]));
                }
              }} />
            </div>
            <div>
              <p className="font-bold text-[#2A0800]">Profile Photo</p>
              <p className="text-xs font-bold text-[#8E7B73]">JPG or PNG. Max 2MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-5">
            <DI label="Full Name" icon={User} value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} required />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-3.5 rounded-xl bg-[#FFFCF5] border border-[#EADDCD] text-[#2A0800] font-bold text-sm hover:bg-[#FDF9F1] transition-all">Cancel</button>
            <button type="submit" disabled={updateMutation.isPending} className="flex-1 py-3.5 rounded-xl bg-[#780116] text-white font-black text-sm shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50">
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-[#FFFCF5] p-5 rounded-2xl border border-[#EADDCD] shadow-sm">
            <p className="text-[10px] uppercase tracking-widest font-black text-[#8E7B73] mb-1">Full Name</p>
            <p className="text-lg font-black text-[#2A0800]">{profile?.fullName}</p>
          </div>
          <div className="bg-[#FFFCF5] p-5 rounded-2xl border border-[#EADDCD] shadow-sm flex flex-col justify-center">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-widest font-black text-[#8E7B73] mb-1">Email Address</p>
                <p className="text-lg font-black text-[#2A0800] truncate">{profile?.email}</p>
              </div>
              {!profile?.emailVerified ? (
                <button 
                  onClick={() => setShowVerifyModal(true)} 
                  className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-xl font-black text-xs hover:bg-red-100 transition-colors shadow-sm shrink-0"
                >
                  Verify
                </button>
              ) : (
                <span className="bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1 shadow-sm shrink-0">
                  <CheckCircle2 size={14} /> Verified
                </span>
              )}
            </div>
          </div>
          <div className="bg-[#FFFCF5] p-5 rounded-2xl border border-[#EADDCD] shadow-sm">
            <p className="text-[10px] uppercase tracking-widest font-black text-[#8E7B73] mb-1">Mobile Number</p>
            <p className="text-lg font-black text-[#2A0800]">{profile?.phone || 'Not provided'}</p>
          </div>
        </div>
      )}

      <AnimatePresence>
        <EmailVerificationModal isOpen={showVerifyModal} onClose={() => setShowVerifyModal(false)} email={profile?.email} />
      </AnimatePresence>
    </div>
  );
}

function AddressesTab() {
  const { data: addresses = [], isLoading } = useQuery({ queryKey: ['my-addresses'], queryFn: addressApi.getAddresses });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editAddress, setEditAddress] = useState(null);
  
  if(isLoading) return <div className="p-8 text-center text-[#8E7B73] font-bold">Loading addresses...</div>;

  return (
    <div className="p-6 sm:p-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#EADDCD]">
        <div>
          <h2 className="text-2xl font-display font-black text-[#780116]">Saved Addresses</h2>
          <p className="text-[#8E7B73] font-bold text-sm">Manage where we deliver your food.</p>
        </div>
        <button onClick={() => { setEditAddress(null); setIsModalOpen(true); }} className="bg-[#780116] text-white px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 shadow-premium hover:-translate-y-0.5 transition-all w-fit">
          <Plus size={16} /> Add New
        </button>
      </div>

      <AddressFormModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditAddress(null); }} editAddress={editAddress} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-[#FFFCF5] rounded-2xl border-2 border-dashed border-[#EADDCD]">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-[#EADDCD]"><MapPin size={24} className="text-[#8E7B73]" /></div>
            <h3 className="text-[#2A0800] font-black text-lg mb-1">No saved addresses</h3>
            <p className="text-[#8E7B73] text-sm font-bold">You haven't saved any addresses yet.</p>
          </div>
        ) : (
          addresses.map(addr => (
            <div key={addr.id} className="bg-white border-2 border-[#EADDCD] rounded-2xl p-5 relative shadow-sm group">
              <button onClick={() => { setEditAddress(addr); setIsModalOpen(true); }} className="absolute top-4 right-4 p-2 bg-white border border-[#EADDCD] text-[#8E7B73] hover:text-[#F7B538] hover:border-[#F7B538] rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10">
                <Edit2 size={16} />
              </button>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-[#FFFCF5] rounded-lg border border-[#EADDCD] text-[#780116]">
                  {addr.label === 'Home' ? <Home size={16} /> : addr.label === 'Work' ? <Briefcase size={16} /> : <MapPin size={16} />}
                </div>
                <span className="font-black text-[#2A0800] capitalize">{addr.label}</span>
                {addr.isDefault && <span className="ml-auto bg-[#FDF9F1] text-[#780116] border border-[#F7B538] text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm">Default</span>}
              </div>
              <p className="text-[#8E7B73] text-sm font-bold leading-relaxed line-clamp-3">
                {addr.line1} {addr.line2 ? `, ${addr.line2}` : ''}<br/>
                {addr.city} - {addr.pincode}
              </p>
              {addr.contactName && (
                <p className="text-[#8E7B73] text-xs font-bold mt-2 pt-2 border-t border-[#EADDCD] border-dashed flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F7B538]"></span>
                  {addr.contactName} Â· {addr.contactPhone}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SettingsTab({ profile }) {
  const { logout } = useAuthStore();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <>
    <div className="p-6 sm:p-10">
      <div className="mb-8 pb-6 border-b border-[#EADDCD]">
        <h2 className="text-2xl font-display font-black text-[#780116]">Settings & Security</h2>
        <p className="text-[#8E7B73] font-bold text-sm">Manage your account security and preferences.</p>
      </div>

      <div className="space-y-4">
        <div className="bg-[#FFFCF5] border border-[#EADDCD] rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl border border-[#EADDCD] flex items-center justify-center shadow-sm">
              <Shield size={24} className="text-[#780116]" />
            </div>
            <div>
              <h3 className="font-black text-[#2A0800]">Password</h3>
              <p className="text-[#8E7B73] text-xs font-bold">Update your password to keep your account secure</p>
            </div>
          </div>
          <button onClick={() => setShowPasswordModal(true)} className="bg-white border-2 border-[#EADDCD] hover:border-[#F7B538] text-[#2A0800] px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm">Change</button>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center justify-between mt-8 shadow-sm">
           <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl border border-red-200 flex items-center justify-center shadow-sm">
              <Trash2 size={24} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-black text-red-600">Delete Account</h3>
              <p className="text-red-500/80 text-xs font-bold">Permanently remove all your data</p>
            </div>
          </div>
          <button onClick={() => setShowDeleteModal(true)} className="bg-red-100 text-red-600 px-4 py-2 rounded-xl font-black text-sm hover:bg-red-200 transition-colors border border-red-200 shadow-sm">Delete</button>
        </div>
      </div>
    </div>

    <AnimatePresence>
      <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
      <DeleteConfirmationModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} />
    </AnimatePresence>
    </>
  );
}

function ChangePasswordModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({ oldPassword: '', newPassword: '' });
  const [error, setError] = useState('');
  
  const mutation = useMutation({
    mutationFn: (data) => userApi.changePassword(data),
    onSuccess: () => {
      onClose();
      setFormData({ oldPassword: '', newPassword: '' });
      setError('');
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to change password');
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#2A0800]/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2rem] p-6 sm:p-8 shadow-premium border border-[#EADDCD] z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-display font-black text-[#780116]">Change Password</h2>
          <button onClick={onClose} className="p-2 bg-[#FFFCF5] text-[#8E7B73] hover:text-[#780116] rounded-xl border border-[#EADDCD]"><X size={20} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(formData); }} className="space-y-4">
          <DI type="password" label="Current Password" value={formData.oldPassword} onChange={(e) => setFormData({...formData, oldPassword: e.target.value})} required />
          <DI type="password" label="New Password" value={formData.newPassword} onChange={(e) => setFormData({...formData, newPassword: e.target.value})} required />
          {error && <p className="text-sm font-bold text-red-500 bg-red-50 p-3 rounded-xl border border-red-200">{error}</p>}
          <button type="submit" disabled={mutation.isPending} className="w-full py-3.5 rounded-xl bg-[#780116] text-white font-black text-sm shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50">
            {mutation.isPending ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function DeleteConfirmationModal({ isOpen, onClose }) {
  const { logout } = useAuthStore();
  const mutation = useMutation({
    mutationFn: userApi.deleteProfile,
    onSuccess: () => {
      logout();
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-red-950/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2rem] p-6 sm:p-8 shadow-premium border border-red-200 z-10 text-center">
        <div className="w-16 h-16 bg-red-50 border-2 border-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-display font-black text-[#2A0800] mb-2">Delete Account?</h2>
        <p className="text-[#8E7B73] font-bold text-sm mb-8">This action cannot be undone. All your data will be permanently removed.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-xl bg-[#FFFCF5] border border-[#EADDCD] text-[#2A0800] font-bold text-sm hover:bg-[#FDF9F1] transition-all">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="flex-1 py-3.5 rounded-xl bg-red-600 text-white font-black text-sm shadow-md hover:-translate-y-1 transition-all disabled:opacity-50">
            {mutation.isPending ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function EmailVerificationModal({ isOpen, onClose, email }) {
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: request, 2: verify
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const queryClient = useQueryClient();

  const requestMutation = useMutation({
    mutationFn: authApi.requestEmailVerificationOtp,
    onSuccess: () => {
      setStep(2);
      setError('');
      setResendCooldown(30);
    },
    onError: (err) => {
      if (err.response?.status === 429) {
        setStep(2); // If already sent, move to input step
        setError('An OTP was recently sent. Please check your email.');
      } else {
        setError(err.response?.data?.message || 'Failed to send OTP');
      }
    }
  });

  const verifyMutation = useMutation({
    mutationFn: (data) => authApi.verifyEmailOtp(data),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['profile'], updatedProfile);
      onClose();
    },
    onError: (err) => setError(err.response?.data?.message || 'Invalid OTP')
  });

  useEffect(() => {
    if (isOpen && step === 1) {
      requestMutation.mutate();
    }
  }, [isOpen]);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#2A0800]/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2rem] p-6 sm:p-8 shadow-premium border border-[#EADDCD] z-10 text-center">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-[#FFFCF5] text-[#8E7B73] hover:text-[#780116] rounded-xl border border-[#EADDCD]"><X size={20} /></button>
        <div className="w-16 h-16 bg-[#FDF9F1] border-2 border-[#F7B538]/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail size={32} className="text-[#F7B538]" />
        </div>
        <h2 className="text-2xl font-display font-black text-[#780116] mb-2">Verify Email</h2>
        <p className="text-[#8E7B73] font-bold text-sm mb-6">
          {step === 1 ? 'Sending OTP to your email...' : `Enter the 6-digit OTP sent to ${email}`}
        </p>

        {error && <p className="text-sm font-bold text-red-500 bg-red-50 p-3 rounded-xl border border-red-200 mb-4">{error}</p>}

        {step === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); verifyMutation.mutate({ otp }); }} className="space-y-4">
            <DI value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" required className="text-center text-xl tracking-widest" maxLength={6} />
            <button type="submit" disabled={verifyMutation.isPending} className="w-full py-3.5 rounded-xl bg-[#F7B538] text-[#780116] font-black text-sm shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50">
              {verifyMutation.isPending ? 'Verifying...' : 'Verify Now'}
            </button>
             <button 
               type="button" 
               disabled={requestMutation.isPending || resendCooldown > 0} 
               onClick={() => requestMutation.mutate()} 
               className="text-xs font-bold text-[#8E7B73] hover:text-[#780116] mt-4 block mx-auto underline disabled:opacity-50"
             >
               {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
             </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

function ReviewsTab() {
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: reviewApi.getMyReviews,
  });

  if (isLoading) return <div className="p-8 text-center text-[#8E7B73] font-bold">Loading reviews...</div>;

  return (
    <div className="p-6 sm:p-10">
      <div className="mb-8 pb-6 border-b border-[#EADDCD]">
        <h2 className="text-2xl font-display font-black text-[#780116]">My Reviews</h2>
        <p className="text-[#8E7B73] font-bold text-sm">Feedback you've left for restaurants.</p>
      </div>

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="py-12 text-center bg-[#FFFCF5] rounded-2xl border-2 border-dashed border-[#EADDCD]">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-[#EADDCD]">
              <Star size={24} className="text-[#8E7B73]" />
            </div>
            <h3 className="text-[#2A0800] font-black text-lg mb-1">No reviews yet</h3>
            <p className="text-[#8E7B73] text-sm font-bold">You haven't reviewed any orders.</p>
          </div>
        ) : (
          reviews.map(review => (
            <motion.div key={review.id} initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="bg-[#FFFCF5] border border-[#EADDCD] shadow-sm rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[#780116] font-black text-base block">{review.restaurantName}</span>
                  <span className="text-[#8E7B73] text-[10px] font-black uppercase tracking-wider">Order #{review.orderId}</span>
                </div>
                <div className="flex items-center gap-1 bg-[#FDF9F1] border border-[#F7B538]/30 px-2.5 py-1 rounded-full text-[#F7B538] font-black text-sm">
                  <Star size={14} className="fill-[#F7B538]" /> {review.rating}.0
                </div>
              </div>
              {review.comment && <p className="text-[#2A0800] text-sm font-medium italic">"{review.comment}"</p>}
              <p className="text-[#8E7B73] text-xs font-bold">{new Date(review.createdAt).toLocaleDateString()}</p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function SupportTab() {
  return (
    <div className="p-6 sm:p-10">
      <div className="mb-8 pb-6 border-b border-[#EADDCD]">
        <h2 className="text-2xl font-display font-black text-[#780116]">Help & Support</h2>
        <p className="text-[#8E7B73] font-bold text-sm">We are here to help you 24/7.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#FFFCF5] border border-[#EADDCD] rounded-3xl p-6 text-center hover:shadow-premium hover:border-[#F7B538] transition-all cursor-pointer group">
          <div className="w-16 h-16 bg-white border border-[#EADDCD] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#FDF9F1] transition-colors">
            <MessageSquare size={24} className="text-[#F7B538]" />
          </div>
          <h3 className="text-[#780116] font-black text-lg mb-2">Live Chat</h3>
          <p className="text-[#8E7B73] text-sm font-bold mb-4">Chat with our support executives instantly.</p>
          <button className="px-5 py-2 rounded-full bg-[#780116] text-white font-black text-xs shadow-sm hover:bg-[#5a0010] transition-colors">Start Chat</button>
        </div>

        <div className="bg-[#FFFCF5] border border-[#EADDCD] rounded-3xl p-6 text-center hover:shadow-premium hover:border-[#F7B538] transition-all cursor-pointer group">
          <div className="w-16 h-16 bg-white border border-[#EADDCD] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#FDF9F1] transition-colors">
            <Mail size={24} className="text-[#F7B538]" />
          </div>
          <h3 className="text-[#780116] font-black text-lg mb-2">Email Support</h3>
          <p className="text-[#8E7B73] text-sm font-bold mb-4">Send us an email and we'll reply within 2 hours.</p>
          <a href="mailto:support@urbanbites.com" className="inline-block px-5 py-2 rounded-full border-2 border-[#EADDCD] text-[#780116] font-black text-xs shadow-sm hover:bg-[#FDF9F1] transition-colors">support@urbanbites.com</a>
        </div>
      </div>

      <div className="bg-white border border-[#EADDCD] shadow-sm rounded-3xl p-6">
        <h3 className="text-[#780116] font-black text-lg mb-4">Frequently Asked Questions</h3>
        <div className="space-y-4">
          <details className="group border border-[#EADDCD] rounded-2xl p-4 bg-[#FFFCF5] cursor-pointer">
            <summary className="font-black text-[#2A0800] outline-none list-none flex justify-between items-center">
              Where is my refund?
              <ChevronRight size={16} className="text-[#8E7B73] group-open:rotate-90 transition-transform" />
            </summary>
            <p className="text-[#8E7B73] text-sm font-bold mt-3 leading-relaxed">If your order was cancelled, the admin processes refunds manually within 24 hours. The money will reflect in your original payment method within 3-5 business days.</p>
          </details>
          <details className="group border border-[#EADDCD] rounded-2xl p-4 bg-[#FFFCF5] cursor-pointer">
            <summary className="font-black text-[#2A0800] outline-none list-none flex justify-between items-center">
              How do I report missing items?
              <ChevronRight size={16} className="text-[#8E7B73] group-open:rotate-90 transition-transform" />
            </summary>
            <p className="text-[#8E7B73] text-sm font-bold mt-3 leading-relaxed">Please start a Live Chat with us and provide your Order ID. We will coordinate with the restaurant and resolve the issue immediately.</p>
          </details>
          <details className="group border border-[#EADDCD] rounded-2xl p-4 bg-[#FFFCF5] cursor-pointer">
            <summary className="font-black text-[#2A0800] outline-none list-none flex justify-between items-center">
              Can I change my delivery address?
              <ChevronRight size={16} className="text-[#8E7B73] group-open:rotate-90 transition-transform" />
            </summary>
            <p className="text-[#8E7B73] text-sm font-bold mt-3 leading-relaxed">Once an order is confirmed, the address cannot be changed. However, you can contact the delivery agent once the order is out for delivery.</p>
          </details>
        </div>
      </div>
    </div>
  );
}

// ─── WALLET TAB ────────────────────────────────────────────────────────────────
function WalletTab() {
  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: walletApi.getBalance,
    staleTime: 0
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['wallet-history'],
    queryFn: walletApi.getHistory,
    staleTime: 0
  });

  return (
    <div className="p-6 sm:p-10">
      <div className="mb-8 pb-6 border-b border-[#EADDCD] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-black text-[#780116]">UrbanBites Wallet</h2>
          <p className="text-[#8E7B73] font-bold text-sm">Manage your credits and refunds.</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#F7B538] to-[#f9cb6b] rounded-3xl p-8 text-[#2A0800] shadow-premium mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 blur-[80px] rounded-full pointer-events-none" />
        <p className="font-bold text-sm uppercase tracking-wider mb-2 opacity-80">Available Balance</p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl sm:text-5xl font-black tracking-tight">₹{balance?.balance?.toFixed(2) || '0.00'}</span>
        </div>
        <p className="text-xs font-bold mt-4 opacity-75">Credits can be applied at checkout.</p>
      </div>

      <h3 className="text-[#780116] font-black text-lg mb-4">Transaction History</h3>
      {historyLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-[#EADDCD]/30 rounded-2xl animate-pulse" />)}
        </div>
      ) : history?.length === 0 ? (
        <div className="text-center py-10 bg-[#FFFCF5] rounded-3xl border border-[#EADDCD]">
          <Wallet size={48} className="mx-auto text-[#EADDCD] mb-3" />
          <p className="text-[#8E7B73] font-bold">No transactions yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history?.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-4 bg-white border border-[#EADDCD] rounded-2xl hover:border-[#F7B538] transition-colors shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                  tx.type === 'CREDIT' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                }`}>
                  {tx.type === 'CREDIT' ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                </div>
                <div>
                  <p className="text-[#2A0800] font-bold text-sm">{tx.description || tx.referenceType}</p>
                  <p className="text-[#8E7B73] text-xs font-bold mt-1">
                    {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-black ${tx.type === 'CREDIT' ? 'text-green-600' : 'text-[#2A0800]'}`}>
                  {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount?.toFixed(2)}
                </p>
                <p className="text-[#8E7B73] text-[10px] font-bold uppercase">{tx.type}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


