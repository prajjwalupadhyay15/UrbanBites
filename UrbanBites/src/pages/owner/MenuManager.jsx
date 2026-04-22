import React, { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { restaurantApi } from '../../api/restaurantApi';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, UploadCloud, X, Leaf, Drumstick, ToggleLeft, ToggleRight,
  DollarSign, Tag, FileText, Image, Pencil, Trash2, CheckCircle2,
  AlertCircle, ChevronLeft, Store, Sparkles, Eye, EyeOff, Search
} from 'lucide-react';

const IMAGE_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  veg: true,
  available: true,
  category: '',
};

/* ─── Input helper ─────────────────────────────────────────── */
function Field({ label, icon: Icon, error, textarea, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-[#8E7B73]">
          {label}
        </label>
      )}
      <div className="relative group">
        {Icon && (
          <Icon
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E7B73] group-focus-within:text-[#F7B538] transition-colors pointer-events-none"
          />
        )}
        {textarea ? (
          <textarea
            {...props}
            rows={3}
            className={`w-full bg-white border ${error ? 'border-red-500/40' : 'border-[#EADDCD]'
              } text-[#780116] placeholder:text-[#8E7B73] rounded-[1.25rem] py-3.5 ${Icon ? 'pl-10' : 'pl-4'
              } pr-4 outline-none focus:border-[#F7B538]/50 focus:ring-2 focus:ring-[#F7B538]/10 transition-all font-bold text-sm resize-none shadow-sm`}
          />
        ) : (
          <input
            {...props}
            className={`w-full bg-white border ${error ? 'border-red-500/40' : 'border-[#EADDCD]'
              } text-[#780116] placeholder:text-[#8E7B73] rounded-full py-3.5 ${Icon ? 'pl-10' : 'pl-4'
              } pr-4 outline-none focus:border-[#F7B538]/50 focus:ring-2 focus:ring-[#F7B538]/10 transition-all font-bold text-sm shadow-sm`}
          />
        )}
      </div>
      {error && <p className="text-xs font-bold text-red-500">{error}</p>}
    </div>
  );
}

/* ─── Menu Item Card ────────────────────────────────────────── */
function MenuCard({ item, onEdit, onDelete }) {
  const imgSrc = item.imagePath
    ? item.imagePath.startsWith('http')
      ? item.imagePath
      : `${IMAGE_BASE}${item.imagePath}`
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white/60 backdrop-blur-3xl border-2 border-white hover:border-[#F7B538]/50 shadow-xl hover:shadow-2xl rounded-[2rem] flex gap-4 p-4 group transition-all"
    >
      {/* Image */}
      <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-[#FDF9F1] border border-[#EADDCD] shadow-sm">
        {imgSrc ? (
          <img src={imgSrc} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            {item.veg ? '🥗' : '🍗'}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span
                className={`w-3.5 h-3.5 rounded-sm border-2 flex-shrink-0 ${item.veg
                    ? 'border-green-600 bg-green-50'
                    : 'border-red-600 bg-red-50'
                  }`}
              >
                <span
                  className={`block w-1.5 h-1.5 rounded-full mx-auto mt-[1px] ${item.veg ? 'bg-green-600' : 'bg-red-600'
                    }`}
                />
              </span>
              <h4 className="text-[#780116] font-black text-sm truncate font-display">{item.name}</h4>
              {item.category && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FDF9F1] text-[#F7B538] border border-[#EADDCD]">
                  {item.category}
                </span>
              )}
            </div>
            {item.description && (
              <p className="text-[#8E7B73] text-xs font-bold line-clamp-2 mt-0.5">
                {item.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
            <button
              onClick={() => onEdit(item)}
              className="p-2 rounded-xl bg-[#FFFCF5] border border-[#EADDCD] shadow-sm hover:bg-[#FDF9F1] text-[#8E7B73] hover:text-[#F7B538] transition-colors"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="p-2 rounded-xl bg-[#FFFCF5] border border-[#EADDCD] shadow-sm hover:bg-red-50 text-[#8E7B73] hover:text-red-600 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2">
          <span className="text-[#2A0800] font-black text-base">₹{item.price}</span>
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${item.available
                ? 'bg-green-50 text-green-600 border-green-200'
                : 'bg-red-50 text-red-600 border-red-200'
              }`}
          >
            {item.available ? 'Available' : 'Unavailable'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Add / Edit Form Drawer ────────────────────────────────── */
function MenuItemForm({ restaurantId, editItem, onClose, onSuccess }) {
  const [form, setForm] = useState(
    editItem
      ? {
        name: editItem.name || '',
        description: editItem.description || '',
        price: String(editItem.price || ''),
        veg: editItem.veg ?? true,
        available: editItem.available ?? true,
        category: editItem.category || '',
      }
      : EMPTY_FORM
  );
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(
    editItem?.imagePath
      ? editItem.imagePath.startsWith('http')
        ? editItem.imagePath
        : `${IMAGE_BASE}${editItem.imagePath}`
      : null
  );
  const [errors, setErrors] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();
  const qc = useQueryClient();

  const CATEGORIES = [
    'Beverages', 'Breads', 'Burger', 'Chinese', 'Desserts', 'Healthy', 
    'Main Course', 'North Indian', 'Pasta', 'Pizza', 'Rice & Biryani', 
    'Sides', 'South Indian', 'Starters', 'Street Food'
  ];

  const createMutation = useMutation({
    mutationFn: (fd) => restaurantApi.createMenuItem(restaurantId, fd),
    onSuccess: () => {
      qc.invalidateQueries(['owner-menu', restaurantId]);
      onSuccess?.();
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (fd) => restaurantApi.updateMenuItem(restaurantId, editItem.id, fd),
    onSuccess: () => {
      qc.invalidateQueries(['owner-menu', restaurantId]);
      onSuccess?.();
      onClose();
    },
  });

  const mutation = editItem ? updateMutation : createMutation;

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Item name is required';
    if (!form.price || isNaN(parseFloat(form.price)) || parseFloat(form.price) <= 0)
      e.price = 'Enter a valid price > 0';
    if (!editItem && !imageFile) e.image = 'Please upload an image for the item';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, image: '' }));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const fd = new FormData();
    fd.append('name', form.name.trim());
    fd.append('description', form.description.trim());
    fd.append('price', parseFloat(form.price));
    fd.append('veg', form.veg);
    fd.append('available', form.available);
    if (form.category) fd.append('category', form.category);
    if (imageFile) fd.append('image', imageFile);
    // If editing with no new image, backend accepts optional image
    mutation.mutate(fd);
  };

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#2A0800]/40 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative bg-[#FFFCF5] border border-[#EADDCD] rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[0_32px_80px_rgba(42,8,0,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#F7B538] rounded-t-[2.5rem]" />

        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-5 border-b border-[#EADDCD]">
          <div>
            <h2 className="text-2xl font-black text-[#780116] tracking-tight font-display">
              {editItem ? 'Edit Menu Item' : 'Add New Item'}
            </h2>
            <p className="text-[#8E7B73] text-sm font-bold mt-0.5">
              {editItem ? 'Update the details for this dish.' : 'Add a delicious new dish to your menu.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white hover:bg-[#FDF9F1] border border-[#EADDCD] shadow-sm flex items-center justify-center text-[#8E7B73] hover:text-[#780116] transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-7 space-y-6">
          {/* Error banner */}
          <AnimatePresence>
            {mutation.isError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600"
              >
                <AlertCircle size={16} className="shrink-0" />
                <p className="text-sm font-bold">
                  {mutation.error?.response?.data?.message || 'Failed to save. Try again.'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Image Upload */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[#8E7B73] block mb-2">
              Item Photo {!editItem && <span className="text-red-500">*</span>}
            </label>
            <div
              className={`relative border-2 border-dashed rounded-3xl transition-all cursor-pointer overflow-hidden shadow-sm
                ${dragOver ? 'border-[#F7B538] bg-[#FDF9F1]' : errors.image ? 'border-red-500/40' : 'border-[#EADDCD] bg-white hover:border-[#F7B538]'}`}
              style={{ height: imagePreview ? 200 : 140 }}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-white/50 backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-[#780116] font-black text-sm">
                    <UploadCloud size={18} /> Change Photo
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-[#FDF9F1] border border-[#EADDCD] shadow-sm flex items-center justify-center">
                    <UploadCloud size={20} className="text-[#F7B538]" />
                  </div>
                  <p className="text-[#780116] text-sm font-black">Drop image here or click to browse</p>
                  <p className="text-[#8E7B73] text-xs font-bold">JPG, PNG, WEBP — max 5MB</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
            {errors.image && <p className="text-xs font-bold text-red-400 mt-1.5">{errors.image}</p>}
          </div>

          {/* Name + Category */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="Dish Name *"
              icon={Tag}
              placeholder="e.g. Chicken Biryani"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              error={errors.name}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#8E7B73]">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full bg-white border border-[#EADDCD] shadow-sm text-[#780116] rounded-full py-3.5 px-4 outline-none focus:border-[#F7B538]/50 focus:ring-2 focus:ring-[#F7B538]/10 transition-all font-bold text-sm"
              >
                <option value="">No Category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <Field
            label="Description"
            icon={FileText}
            placeholder="Describe ingredients, flavors, or preparation..."
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            textarea
          />

          {/* Price */}
          <Field
            label="Price (₹) *"
            icon={DollarSign}
            type="number"
            min="1"
            step="0.01"
            placeholder="299"
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
            error={errors.price}
          />

          {/* Veg / Non-Veg Toggle */}
          <div className="grid grid-cols-2 gap-3">
            {/* Veg type */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#8E7B73] block mb-2">
                Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => set('veg', true)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-black border transition-all shadow-sm
                    ${form.veg ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-[#EADDCD] text-[#8E7B73] hover:text-[#780116]'}`}
                >
                  <Leaf size={14} /> Veg
                </button>
                <button
                  type="button"
                  onClick={() => set('veg', false)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-black border transition-all shadow-sm
                    ${!form.veg ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-[#EADDCD] text-[#8E7B73] hover:text-[#780116]'}`}
                >
                  <Drumstick size={14} /> Non-Veg
                </button>
              </div>
            </div>

            {/* Availability */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#8E7B73] block mb-2">
                Availability
              </label>
              <button
                type="button"
                onClick={() => set('available', !form.available)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all shadow-sm
                  ${form.available ? 'bg-[#FDF9F1] border-[#EADDCD] text-[#F7B538]' : 'bg-white border-[#EADDCD] text-[#8E7B73]'}`}
              >
                <span className="text-sm font-black">
                  {form.available ? 'Available' : 'Unavailable'}
                </span>
                {form.available ? <ToggleRight size={22} className="text-[#F7B538]" /> : <ToggleLeft size={22} />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 h-14 rounded-full bg-[#780116] border-2 border-[#A00320] text-white font-black text-base shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {mutation.isPending ? (
                'Saving…'
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  {editItem ? 'Save Changes' : 'Add to Menu'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 h-14 rounded-full bg-white border border-[#EADDCD] shadow-sm text-[#2A0800] font-black hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
export default function MenuManager() {
  const { restaurantId } = useParams();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [filterVeg, setFilterVeg] = useState('all'); // 'all' | 'veg' | 'nonveg'
  const [filterAvail, setFilterAvail] = useState('all'); // 'all' | 'available' | 'unavailable'
  const [successMsg, setSuccessMsg] = useState('');

  const { data: menuItems = [], isLoading, isError } = useQuery({
    queryKey: ['owner-menu', restaurantId],
    queryFn: () => restaurantApi.getOwnerMenu(restaurantId),
    staleTime: 1000 * 30,
  });

  const filtered = menuItems.filter((item) => {
    if (search) {
      const q = search.toLowerCase();
      if (!item.name.toLowerCase().includes(q) && !(item.description || '').toLowerCase().includes(q)) return false;
    }
    if (filterVeg === 'veg' && !item.veg) return false;
    if (filterVeg === 'nonveg' && item.veg) return false;
    if (filterAvail === 'available' && !item.available) return false;
    if (filterAvail === 'unavailable' && item.available) return false;
    return true;
  });

  const byCategory = filtered.reduce((acc, item) => {
    const cat = item.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const queryClient = useQueryClient();

  const handleSuccess = () => {
    setSuccessMsg(editItem ? 'Item updated!' : 'Item added to your menu!');
    setTimeout(() => setSuccessMsg(''), 3000);
    setEditItem(null);
  };

  const deleteMutation = useMutation({
    mutationFn: (menuItemId) => restaurantApi.deleteMenuItem(restaurantId, menuItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-menu', restaurantId] });
      setSuccessMsg('Item deleted from menu!');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to delete menu item.');
    }
  });

  const handleDelete = (menuItemId) => {
     if(window.confirm('Are you sure you want to delete this item?')) {
        deleteMutation.mutate(menuItemId);
     }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditItem(null);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-[#FFFCF5] to-[#FDF9F1] relative overflow-hidden font-sans">
      
      {/* ─── Animated Mesh Gradient Background ─── */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div 
          className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-[#F7B538]/10 rounded-full blur-[120px]"
          animate={{ x: [-30, 30], y: [30, -30] }}
          transition={{ duration: 15, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-[#780116]/5 rounded-full blur-[100px]"
          animate={{ x: [30, -30], y: [-30, 30] }}
          transition={{ duration: 12, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 2 }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <Link
            to="/owner/restaurants"
            className="flex items-center gap-1.5 text-[#8E7B73] hover:text-[#780116] text-sm font-bold transition-colors mb-3"
          >
            <ChevronLeft size={15} /> Back to Restaurants
          </Link>
          <h1 className="text-3xl font-black text-[#780116] tracking-tight mb-1 font-display">
            Menu <span className="text-[#F7B538]">Manager</span>
          </h1>
          <p className="text-[#8E7B73] text-sm font-bold">
            {isLoading ? 'Loading…' : `${menuItems.length} items in your menu`}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleAddNew}
          className="h-12 px-6 rounded-full bg-[#780116] border border-[#A00320] text-white font-black text-sm flex items-center gap-2 shadow-premium hover:shadow-[0_8px_30px_rgba(120,1,22,0.3)] transition-shadow shrink-0"
        >
          <Plus size={18} /> Add New Item
        </motion.button>
      </div>

      {/* Success Toast */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="mb-5 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3 text-green-700"
          >
            <CheckCircle2 size={16} className="shrink-0" />
            <span className="text-sm font-bold">{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E7B73]" />
          <input
            type="text"
            placeholder="Search menu items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-[#EADDCD] shadow-sm text-[#780116] font-bold text-sm rounded-full py-3 pl-9 pr-4 outline-none focus:border-[#F7B538]/50 focus:ring-2 focus:ring-[#F7B538]/10 transition-all placeholder:text-[#8E7B73]"
          />
        </div>

        {/* Veg filter */}
        <div className="flex bg-white shadow-sm border border-[#EADDCD] rounded-2xl p-0.5 gap-0.5">
          {[['all', 'All'], ['veg', '🌿 Veg'], ['nonveg', '🍗 Non-Veg']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilterVeg(val)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filterVeg === val ? 'bg-[#FFFCF5] border border-[#EADDCD] text-[#780116] shadow-sm' : 'text-[#8E7B73] hover:text-[#780116]'
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Availability filter */}
        <div className="flex bg-white shadow-sm border border-[#EADDCD] rounded-2xl p-0.5 gap-0.5">
          {[['all', 'All'], ['available', '✅ Available'], ['unavailable', '❌ Unavailable']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilterAvail(val)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filterAvail === val ? 'bg-[#FFFCF5] border border-[#EADDCD] text-[#780116] shadow-sm' : 'text-[#8E7B73] hover:text-[#780116]'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[100px] bg-white border border-[#EADDCD] shadow-sm rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="py-20 text-center bg-[#FDF9F1] border border-[#EADDCD] shadow-sm rounded-3xl">
          <div className="text-4xl mb-3">⚠️</div>
          <h3 className="text-[#780116] font-black text-lg mb-2 font-display">Could not load menu</h3>
          <p className="text-[#8E7B73] font-bold text-sm">Check your connection and try again.</p>
        </div>
      ) : menuItems.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-24 flex flex-col items-center text-center bg-[#FFFCF5] border-2 border-dashed border-[#EADDCD] hover:border-[#F7B538] rounded-[2.5rem] transition-colors cursor-pointer group shadow-sm hover:shadow-premium"
          onClick={handleAddNew}
        >
          <div className="w-20 h-20 rounded-2xl bg-white border border-[#EADDCD] shadow-sm group-hover:bg-[#FDF9F1] group-hover:border-[#F7B538] flex items-center justify-center mb-5 transition-all">
            <Sparkles size={32} className="text-[#8E7B73] group-hover:text-[#F7B538] transition-colors" />
          </div>
          <h3 className="text-[#780116] font-black text-xl mb-2 font-display">Your menu is empty</h3>
          <p className="text-[#8E7B73] text-sm font-bold max-w-xs">
            Start adding dishes to build your menu. Click anywhere or the "Add New Item" button.
          </p>
          <div className="mt-6 flex items-center gap-2 text-[#780116] font-black text-sm">
            <Plus size={16} /> Add your first item
          </div>
        </motion.div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-[#FDF9F1] border border-[#EADDCD] shadow-sm rounded-3xl">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="text-[#780116] font-black text-lg mb-2 font-display">No items match your filters</h3>
          <button
            onClick={() => { setSearch(''); setFilterVeg('all'); setFilterAvail('all'); }}
            className="mt-2 text-[#F7B538] text-sm font-black hover:text-[#780116] transition-colors"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <AnimatePresence>
          {Object.entries(byCategory).map(([cat, items]) => (
            <motion.section
              key={cat}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-black text-[#780116]">{cat}</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-[#EADDCD] to-transparent" />
                <span className="text-xs font-black text-[#8E7B73]">{items.length}</span>
              </div>
              <div className="space-y-3">
                {items.map((item) => (
                  <MenuCard key={item.id} item={item} onEdit={handleEdit} onDelete={handleDelete} />
                ))}
              </div>
            </motion.section>
          ))}
        </AnimatePresence>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <MenuItemForm
            restaurantId={restaurantId}
            editItem={editItem}
            onClose={() => { setShowForm(false); setEditItem(null); }}
            onSuccess={handleSuccess}
          />
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
