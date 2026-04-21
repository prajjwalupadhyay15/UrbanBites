import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { restaurantApi } from '../../api/restaurantApi';
import { Store, Plus, MapPin, CheckCircle2, Clock, Edit2, Utensils, X, Trash2, Save, TrendingUp, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const IMAGE_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

export default function ManageRestaurants() {
  const [restaurants, setRestaurants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null, name: '', description: '', addressLine: '', city: '', openNow: false, active: false, imageFile: null
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: restaurantApi.listZones,
  });

  const assignZoneMut = useMutation({
    mutationFn: ({ serviceZoneId, ruleType }) => restaurantApi.assignZoneRule(editForm.id, serviceZoneId, ruleType),
    onSuccess: () => {
      toast.success('Zone rule applied successfully!');
    },
    onError: () => {
      toast.error('Failed to apply zone rule.');
    }
  });

  const navigate = useNavigate();

  const showToast = (msg) => { toast.success(msg); };

  const fetchRestaurants = async () => {
    try {
      const data = await restaurantApi.getMyRestaurants();
      setRestaurants(data);
    } catch (err) {
      setError('Failed to load your restaurants. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchRestaurants(); }, []);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
       await restaurantApi.deleteMyRestaurant(deleteConfirm);
       setRestaurants(prev => prev.filter(r => r.id !== deleteConfirm));
       toast.success('Restaurant deleted successfully.');
    } catch(err) {
       toast.error(err.response?.data?.message || 'Failed to delete restaurant.');
    } finally {
       setDeleteConfirm(null);
    }
  }

  const handleQuickToggle = async (rest, field) => {
    const toggleId = `${rest.id}-${field}`;
    setTogglingId(toggleId);
    try {
      const fd = new FormData();
      fd.append('name', rest.name || 'Untitled');
      if (rest.description) fd.append('description', rest.description);
      fd.append('addressLine', rest.addressLine || 'N/A');
      fd.append('city', rest.city || 'N/A');
      if (rest.latitude != null) fd.append('latitude', String(rest.latitude));
      if (rest.longitude != null) fd.append('longitude', String(rest.longitude));
      fd.append('openNow', String(field === 'openNow' ? !rest.openNow : rest.openNow));
      fd.append('active', String(field === 'active' ? !rest.active : rest.active));
      await restaurantApi.updateMyRestaurant(rest.id, fd);
      setRestaurants(prev => prev.map(r =>
        r.id === rest.id
          ? { ...r, [field]: !r[field] }
          : r
      ));
      const label = field === 'active' ? 'Listing' : 'Accepting orders';
      const newVal = field === 'active' ? !rest.active : !rest.openNow;
      toast.success(`${label}: ${newVal ? 'ON' : 'OFF'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Toggle failed');
    } finally {
      setTogglingId(null);
    }
  }

  const handleEditClick = (rest) => {
    setEditForm({
      id: rest.id, name: rest.name, description: rest.description || '',
      addressLine: rest.addressLine, city: rest.city, openNow: rest.openNow,
      active: rest.active, imageFile: null
    });
    setIsEditing(true);
  }

  const handleSettingsSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', editForm.name);
      if(editForm.description) fd.append('description', editForm.description);
      fd.append('addressLine', editForm.addressLine);
      fd.append('city', editForm.city);
      fd.append('openNow', editForm.openNow);
      fd.append('active', editForm.active);
      if(editForm.imageFile) fd.append('image', editForm.imageFile);

      await restaurantApi.updateMyRestaurant(editForm.id, fd);
      toast.success('Settings updated successfully.');
      setIsEditing(false);
      fetchRestaurants();
    } catch(err) {
      toast.error(err.response?.data?.message || 'Failed to update settings.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-[#FFFCF5] to-[#FDF9F1] relative overflow-hidden font-sans">
      
      {/* Animated Mesh Background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div 
          className="absolute top-[-10%] left-[-5%] w-[800px] h-[800px] bg-[#F7B538]/10 rounded-full blur-[120px]"
          animate={{ x: [-30, 30], y: [30, -30] }}
          transition={{ duration: 15, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-[#780116]/5 rounded-full blur-[100px]"
          animate={{ x: [30, -30], y: [-30, 30] }}
          transition={{ duration: 12, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 2 }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">

      {/* Toast is handled by react-hot-toast globally */}

      {/* Hero Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#780116] to-[#A00320] flex items-center justify-center shadow-lg">
                <Store size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black text-[#2A0800] tracking-tight font-display">
                  My <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#780116] to-[#F7B538]">Portfolio</span>
                </h1>
              </div>
            </div>
            <p className="text-[#8E7B73] font-bold text-sm ml-[60px]">Manage all your restaurant locations from one place.</p>
          </div>
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/partner/restaurant/register')}
            className="h-13 px-7 py-3 rounded-2xl bg-gradient-to-r from-[#780116] to-[#A00320] text-white font-black text-sm transition-all flex items-center justify-center gap-2.5 shadow-premium"
          >
            <Plus size={18} /> Add New Location
          </motion.button>
        </div>

        {/* Stats Strip */}
        {!isLoading && !error && restaurants.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="mt-6 ml-[60px] flex flex-wrap gap-3"
          >
            <div className="px-4 py-2 rounded-xl bg-white/70 backdrop-blur-md border border-white shadow-sm flex items-center gap-2">
              <Store size={14} className="text-[#780116]" />
              <span className="text-xs font-black text-[#2A0800]">{restaurants.length}</span>
              <span className="text-xs font-bold text-[#8E7B73]">Locations</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-white/70 backdrop-blur-md border border-white shadow-sm flex items-center gap-2">
              <Eye size={14} className="text-green-600" />
              <span className="text-xs font-black text-[#2A0800]">{restaurants.filter(r => r.active).length}</span>
              <span className="text-xs font-bold text-[#8E7B73]">Active</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-white/70 backdrop-blur-md border border-white shadow-sm flex items-center gap-2">
              <TrendingUp size={14} className="text-[#F7B538]" />
              <span className="text-xs font-black text-[#2A0800]">{restaurants.filter(r => r.openNow).length}</span>
              <span className="text-xs font-bold text-[#8E7B73]">Open Now</span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-[380px] bg-white/50 backdrop-blur-md animate-pulse rounded-[2.5rem] border border-white shadow-sm" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 bg-red-50/80 backdrop-blur-md border border-red-200 rounded-3xl text-center shadow-sm">
          <p className="text-red-600 font-bold">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((rest, index) => (
            <motion.div
              key={rest.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, type: 'spring', stiffness: 200, damping: 20 }}
              className="bg-white/70 backdrop-blur-xl border-2 border-white rounded-[2.5rem] overflow-hidden group hover:border-[#F7B538]/60 hover:shadow-2xl shadow-xl transition-all duration-300 relative flex flex-col"
            >
              {/* Image */}
              <div className="h-48 relative bg-gradient-to-br from-[#FDF9F1] to-[#EADDCD]">
                <img
                  src={rest.imagePath ? (rest.imagePath.startsWith('http') ? rest.imagePath : `${IMAGE_BASE}${rest.imagePath}`) : null}
                  alt={rest.name}
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500"
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2A0800]/80 via-transparent to-transparent" />

                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-xl border shadow-sm ${rest.active ? 'bg-green-50/90 text-green-700 border-green-200' : 'bg-red-50/90 text-red-700 border-red-200'}`}>
                    {rest.active ? '● Active' : '○ Inactive'}
                  </div>
                  <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-xl border shadow-sm ${rest.openNow ? 'bg-[#FDF9F1]/90 text-[#F7B538] border-[#F7B538]/30' : 'bg-white/90 text-[#8E7B73] border-[#EADDCD]'}`}>
                    {rest.openNow ? '🟢 Open Now' : '🔴 Closed'}
                  </div>
                </div>

                {/* Name overlay */}
                <div className="absolute bottom-4 left-5 right-5">
                  <h3 className="text-xl font-black text-white line-clamp-1 drop-shadow-lg">{rest.name}</h3>
                </div>
              </div>

              {/* Info */}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start gap-2 text-[#8E7B73] mb-4">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-[#F7B538]" />
                  <p className="text-xs font-bold leading-relaxed line-clamp-2">{rest.addressLine}, {rest.city}</p>
                </div>

                {/* Quick Toggles — iOS Style */}
                <div className="flex flex-col gap-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#2A0800] font-black text-xs">Active Listing</p>
                      <p className="text-[#8E7B73] text-[10px] font-bold">Show in discovery</p>
                    </div>
                    <button
                      onClick={() => handleQuickToggle(rest, 'active')}
                      disabled={togglingId === `${rest.id}-active`}
                      className={`relative w-[52px] h-[30px] rounded-full transition-all duration-300 ease-in-out disabled:opacity-50 focus:outline-none ${
                        rest.active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-[#DDDAD5]'
                      }`}
                    >
                      <span className={`absolute top-[3px] left-[3px] w-[24px] h-[24px] bg-white rounded-full shadow-md transition-transform duration-300 ease-in-out ${
                        rest.active ? 'translate-x-[22px]' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#2A0800] font-black text-xs">Open Now</p>
                      <p className="text-[#8E7B73] text-[10px] font-bold">Accepting orders</p>
                    </div>
                    <button
                      onClick={() => handleQuickToggle(rest, 'openNow')}
                      disabled={togglingId === `${rest.id}-openNow`}
                      className={`relative w-[52px] h-[30px] rounded-full transition-all duration-300 ease-in-out disabled:opacity-50 focus:outline-none ${
                        rest.openNow ? 'bg-[#F7B538] shadow-[0_0_8px_rgba(247,181,56,0.4)]' : 'bg-[#DDDAD5]'
                      }`}
                    >
                      <span className={`absolute top-[3px] left-[3px] w-[24px] h-[24px] bg-white rounded-full shadow-md transition-transform duration-300 ease-in-out ${
                        rest.openNow ? 'translate-x-[22px]' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-auto grid grid-cols-3 gap-2.5 pt-4 border-t border-[#EADDCD]/60 border-dashed">
                  <motion.button
                    whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(`/owner/restaurants/${rest.id}/menu`)}
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-gradient-to-b from-white to-[#FFFCF5] border border-[#EADDCD] hover:border-[#F7B538] shadow-sm text-[#8E7B73] hover:text-[#F7B538] transition-all"
                  >
                    <Utensils size={17} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Menu</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }}
                    onClick={() => handleEditClick(rest)}
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-gradient-to-b from-white to-[#FFFCF5] border border-[#EADDCD] hover:border-[#780116]/30 shadow-sm text-[#8E7B73] hover:text-[#780116] transition-all"
                  >
                    <Edit2 size={17} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Edit</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setDeleteConfirm(rest.id)}
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-gradient-to-b from-white to-[#FFFCF5] border border-[#EADDCD] hover:border-red-200 shadow-sm text-[#8E7B73] hover:text-red-600 transition-all"
                  >
                    <Trash2 size={17} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Delete</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Add New Card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: restaurants.length * 0.08 }}
            whileHover={{ y: -4 }}
            onClick={() => navigate('/partner/restaurant/register')}
            className="min-h-[380px] bg-white/40 backdrop-blur-md border-2 border-dashed border-[#EADDCD] hover:border-[#F7B538] shadow-sm hover:shadow-xl rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer group transition-all duration-300 relative overflow-hidden"
          >
            {/* Ambient gradient blobs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <motion.div
                className="absolute -top-10 -left-10 w-40 h-40 bg-[#F7B538]/10 rounded-full blur-[60px]"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute -bottom-10 -right-10 w-36 h-36 bg-[#780116]/8 rounded-full blur-[50px]"
                animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              />
            </div>

            {/* Center content */}
            <div className="relative z-10 flex flex-col items-center">
              <motion.div 
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FFFCF5] to-white border-2 border-[#EADDCD] group-hover:border-[#F7B538] shadow-lg group-hover:shadow-xl text-[#8E7B73] group-hover:text-[#F7B538] flex items-center justify-center transition-all duration-300 mb-5"
                whileHover={{ rotate: 90 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Plus size={28} />
              </motion.div>
              <h3 className="text-[#780116] font-black text-lg">Add Another Location</h3>
              <p className="text-[#8E7B73] text-xs font-bold mt-1.5">Expand your restaurant empire</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#2A0800]/40 backdrop-blur-md"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: -30 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/95 backdrop-blur-xl border border-[#EADDCD] rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-premium relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 to-red-600" />
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-red-200 shadow-sm">
                <Trash2 size={26} className="text-red-600" />
              </div>
              <h3 className="text-xl font-black text-[#780116] mb-2 font-display">Delete Restaurant?</h3>
              <p className="text-[#8E7B73] text-sm font-bold mb-8 leading-relaxed">
                This action cannot be undone. All associated data will be permanently removed.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3.5 rounded-2xl bg-[#FFFCF5] border border-[#EADDCD] text-[#2A0800] hover:bg-white shadow-sm font-black text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3.5 rounded-2xl bg-red-600 border border-red-700 hover:bg-red-700 text-white font-black text-sm transition-all shadow-premium"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#2A0800]/40 backdrop-blur-md"
             onClick={() => setIsEditing(false)}
          >
             <motion.div
               initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: -30 }}
               onClick={(e) => e.stopPropagation()}
               className="bg-white/95 backdrop-blur-xl border border-[#EADDCD] rounded-[2.5rem] p-8 w-full max-w-2xl shadow-premium relative max-h-[90vh] overflow-y-auto custom-scrollbar"
             >
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#780116] to-[#F7B538]" />
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#780116] to-[#A00320] flex items-center justify-center shadow-md">
                      <Edit2 size={16} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-[#780116] font-display">Restaurant Settings</h2>
                      <p className="text-[#8E7B73] text-xs font-bold mt-0.5">Update details for {editForm.name}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsEditing(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-[#EADDCD] shadow-sm text-[#8E7B73] hover:text-[#780116] transition-all">
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSettingsSave} className="space-y-5">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest font-black text-[#8E7B73] mb-1.5 ml-1">Restaurant Name</label>
                      <input type="text" value={editForm.name} onChange={e => setEditForm(p => ({...p, name: e.target.value}))} required className="w-full bg-white/80 backdrop-blur-md border-2 border-white shadow-sm text-[#2A0800] rounded-2xl py-3.5 px-4 font-bold outline-none focus:border-[#F7B538] transition-all text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest font-black text-[#8E7B73] mb-1.5 ml-1">Description</label>
                      <textarea rows={2} value={editForm.description} onChange={e => setEditForm(p => ({...p, description: e.target.value}))} className="w-full bg-white/80 backdrop-blur-md border-2 border-white shadow-sm text-[#2A0800] rounded-2xl py-3.5 px-4 font-bold outline-none focus:border-[#F7B538] transition-all text-sm resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest font-black text-[#8E7B73] mb-1.5 ml-1">City</label>
                        <input type="text" value={editForm.city} onChange={e => setEditForm(p => ({...p, city: e.target.value}))} required className="w-full bg-white/80 backdrop-blur-md border-2 border-white shadow-sm text-[#2A0800] rounded-2xl py-3.5 px-4 font-bold outline-none focus:border-[#F7B538] transition-all text-sm" />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest font-black text-[#8E7B73] mb-1.5 ml-1">Address</label>
                        <input type="text" value={editForm.addressLine} onChange={e => setEditForm(p => ({...p, addressLine: e.target.value}))} required className="w-full bg-white/80 backdrop-blur-md border-2 border-white shadow-sm text-[#2A0800] rounded-2xl py-3.5 px-4 font-bold outline-none focus:border-[#F7B538] transition-all text-sm" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-2">
                       <label className="flex items-center justify-between p-4 rounded-2xl border-2 border-white bg-white/60 backdrop-blur-md shadow-sm cursor-pointer hover:border-[#F7B538] transition-all">
                         <div>
                            <p className="text-[#780116] font-black text-sm mb-0.5">Active Listing</p>
                            <p className="text-[#8E7B73] text-xs font-bold">Show in discovery</p>
                         </div>
                         <input type="checkbox" checked={editForm.active} onChange={e => setEditForm(p => ({...p, active: e.target.checked}))} className="w-5 h-5 accent-[#F7B538] rounded" />
                       </label>
                       
                       <label className="flex items-center justify-between p-4 rounded-2xl border-2 border-white bg-white/60 backdrop-blur-md shadow-sm cursor-pointer hover:border-green-400 transition-all">
                         <div>
                            <p className="text-[#780116] font-black text-sm mb-0.5">Open Now</p>
                            <p className="text-[#8E7B73] text-xs font-bold">Accepting orders</p>
                         </div>
                         <input type="checkbox" checked={editForm.openNow} onChange={e => setEditForm(p => ({...p, openNow: e.target.checked}))} className="w-5 h-5 accent-green-600 rounded" />
                       </label>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-widest font-black text-[#8E7B73] mb-1.5 ml-1 mt-2">Update Image (Optional)</label>
                      <input type="file" accept="image/*" onChange={(e) => setEditForm(p => ({...p, imageFile: e.target.files[0]}))} className="w-full bg-white/80 backdrop-blur-md border-2 border-white shadow-sm text-[#780116] rounded-2xl py-2.5 px-4 text-xs font-bold file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-[#FDF9F1] file:text-[#F7B538] hover:file:bg-[#F7B538]/20 cursor-pointer transition-all" />
                    </div>

                    {zones && zones.length > 0 && (
                      <div className="pt-4 mt-2 border-t border-[#EADDCD]/60 border-dashed">
                        <label className="block text-[10px] uppercase tracking-widest font-black text-[#8E7B73] mb-3 ml-1">Service Zones (Quick Assign)</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {zones.map(z => (
                            <div key={z.id} className="bg-white/60 border border-[#EADDCD] p-3 rounded-2xl shadow-sm flex flex-col gap-2">
                               <span className="text-[#780116] font-bold text-sm truncate">{z.name}</span>
                               <div className="flex gap-2">
                                  <button type="button" onClick={() => assignZoneMut.mutate({ serviceZoneId: z.id, ruleType: 'INCLUDE' })} className="flex-1 py-1 text-[10px] font-black rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors">
                                    INCLUDE
                                  </button>
                                  <button type="button" onClick={() => assignZoneMut.mutate({ serviceZoneId: z.id, ruleType: 'EXCLUDE' })} className="flex-1 py-1 text-[10px] font-black rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors">
                                    EXCLUDE
                                  </button>
                               </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-5 border-t border-[#EADDCD]/60 border-dashed">
                    <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-3.5 rounded-2xl bg-white border-2 border-[#EADDCD] text-[#2A0800] font-black text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all">
                      Cancel
                    </button>
                    <button type="submit" disabled={isSaving} className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#780116] to-[#A00320] text-white font-black text-sm shadow-premium hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                       {isSaving ? 'Saving...' : <><Save size={16}/> Save Settings</>}
                    </button>
                  </div>
                </form>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
