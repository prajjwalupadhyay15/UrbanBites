import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addressApi } from '../../api/userApi';
import {
  X, MapPin, Home, Briefcase, Navigation, Loader2,
  Trash2, AlertCircle, CheckCircle2, LocateFixed
} from 'lucide-react';

const LABEL_CHIPS = [
  { value: 'Home', icon: Home, emoji: '🏠' },
  { value: 'Work', icon: Briefcase, emoji: '🏢' },
  { value: 'Other', icon: Navigation, emoji: '📍' },
];

const INITIAL_FORM = {
  label: 'Home',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  landmark: '',
  contactName: '',
  contactPhone: '',
  latitude: '',
  longitude: '',
  isDefault: false,
};

/**
 * AddressFormModal – create or edit an address.
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {object|null} editAddress – if provided, modal is in edit mode
 */
export default function AddressFormModal({ isOpen, onClose, editAddress = null }) {
  const qc = useQueryClient();
  const isEdit = !!editAddress;

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // Pre-fill when editing
  useEffect(() => {
    if (editAddress) {
      setForm({
        label: editAddress.label || 'Home',
        line1: editAddress.line1 || '',
        line2: editAddress.line2 || '',
        city: editAddress.city || '',
        state: editAddress.state || '',
        pincode: editAddress.pincode || '',
        landmark: editAddress.landmark || '',
        contactName: editAddress.contactName || '',
        contactPhone: editAddress.contactPhone || '',
        latitude: editAddress.latitude ?? '',
        longitude: editAddress.longitude ?? '',
        isDefault: editAddress.isDefault || false,
      });
    } else {
      setForm(INITIAL_FORM);
    }
    setErrors({});
    setSuccess(false);
  }, [editAddress, isOpen]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  // Validation
  const validate = () => {
    const e = {};
    if (!form.label.trim()) e.label = 'Label is required';
    if (!form.line1.trim()) e.line1 = 'Address line 1 is required';
    if (!form.city.trim()) e.city = 'City is required';
    if (!form.state.trim()) e.state = 'State is required';
    if (!form.pincode.trim()) e.pincode = 'Pincode is required';
    else if (!/^[0-9A-Za-z\- ]{4,20}$/.test(form.pincode)) e.pincode = 'Invalid pincode';
    if (!form.contactName.trim()) e.contactName = 'Contact name is required';
    if (!form.contactPhone.trim()) e.contactPhone = 'Phone is required';
    else if (!/^\+?[0-9]{7,15}$/.test(form.contactPhone.replace(/\s/g, '')))
      e.contactPhone = 'Invalid phone number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Create mutation
  const createMut = useMutation({
    mutationFn: (body) => addressApi.createAddress(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-addresses'] });
      setSuccess(true);
      setTimeout(() => onClose(), 800);
    },
    onError: (err) => {
      setErrors({ _api: err.response?.data?.message || 'Failed to save address' });
    },
  });

  // Update mutation
  const updateMut = useMutation({
    mutationFn: ({ id, body }) => addressApi.updateAddress(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-addresses'] });
      setSuccess(true);
      setTimeout(() => onClose(), 800);
    },
    onError: (err) => {
      setErrors({ _api: err.response?.data?.message || 'Failed to update address' });
    },
  });

  // Delete mutation
  const deleteMut = useMutation({
    mutationFn: (id) => addressApi.deleteAddress(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-addresses'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const body = {
      ...form,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
    };
    if (isEdit) {
      updateMut.mutate({ id: editAddress.id, body });
    } else {
      createMut.mutate(body);
    }
  };

  const [locating, setLocating] = useState(false);
  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setErrors((prev) => ({ ...prev, _api: 'Geolocation not supported by your browser' }));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      (err) => {
        setErrors((prev) => ({ ...prev, _api: 'Could not get location. Please enter manually.' }));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#2A0800]/40 backdrop-blur-md z-[70]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          >
            <div className="bg-[#FFFCF5] border border-[#EADDCD] rounded-[2rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-premium">
              {/* Header */}
              <div className="sticky top-0 bg-[#FFFCF5] z-10 flex items-center justify-between px-6 py-6 border-b border-[#EADDCD]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white border border-[#EADDCD] shadow-sm rounded-xl flex items-center justify-center">
                    <MapPin size={22} className="text-[#F7B538]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-black text-[#780116]">
                      {isEdit ? 'Edit Address' : 'Add New Address'}
                    </h2>
                    <p className="text-[#8E7B73] text-xs font-bold mt-0.5">
                      {isEdit ? 'Update your delivery address' : 'Where should we deliver?'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 bg-white border border-[#EADDCD] hover:border-[#F7B538] rounded-xl flex items-center justify-center text-[#780116] hover:bg-[#FDF9F1] transition-all shadow-sm"
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>

              {/* Success overlay */}
              {success && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-[#FFFCF5]/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-[2rem]"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.1 }}
                    className="w-20 h-20 bg-green-50 border-2 border-green-200 rounded-full flex items-center justify-center mb-4 shadow-lg"
                  >
                    <CheckCircle2 size={40} className="text-green-500" />
                  </motion.div>
                  <p className="text-[#780116] font-display font-black text-2xl">
                    {isEdit ? 'Address Updated!' : 'Address Saved!'}
                  </p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* API Error */}
                {errors._api && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm font-bold shadow-sm">
                    <AlertCircle size={18} /> {errors._api}
                  </div>
                )}

                {/* Label chips */}
                <div>
                  <label className="block text-[#8E7B73] text-xs font-black mb-2 uppercase tracking-widest">
                    Save as
                  </label>
                  <div className="flex gap-3">
                    {LABEL_CHIPS.map(({ value, emoji }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleChange('label', value)}
                        className={`flex-1 py-3 rounded-xl text-sm font-black flex justify-center items-center gap-2 transition-all border-2 ${
                          form.label === value
                            ? 'bg-[#FDF9F1] border-[#F7B538] text-[#780116] shadow-sm'
                            : 'bg-white border-[#EADDCD] text-[#8E7B73] hover:text-[#780116] hover:border-[#F7B538] shadow-sm'
                        }`}
                      >
                        <span className="text-lg leading-none">{emoji}</span> {value}
                      </button>
                    ))}
                  </div>
                  {errors.label && (
                    <p className="text-red-500 text-xs font-bold mt-1.5">{errors.label}</p>
                  )}
                </div>

                {/* Address Line 1 */}
                <FormField
                  label="Address Line 1 *"
                  placeholder="Flat / House No., Building Name"
                  value={form.line1}
                  onChange={(v) => handleChange('line1', v)}
                  error={errors.line1}
                />

                {/* Address Line 2 */}
                <FormField
                  label="Address Line 2"
                  placeholder="Street, Area, Colony"
                  value={form.line2}
                  onChange={(v) => handleChange('line2', v)}
                />

                {/* City + State */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    label="City *"
                    placeholder="e.g. New Delhi"
                    value={form.city}
                    onChange={(v) => handleChange('city', v)}
                    error={errors.city}
                  />
                  <FormField
                    label="State *"
                    placeholder="e.g. Delhi"
                    value={form.state}
                    onChange={(v) => handleChange('state', v)}
                    error={errors.state}
                  />
                </div>

                {/* Pincode + Landmark */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    label="Pincode *"
                    placeholder="e.g. 110001"
                    value={form.pincode}
                    onChange={(v) => handleChange('pincode', v)}
                    error={errors.pincode}
                  />
                  <FormField
                    label="Landmark"
                    placeholder="Near..."
                    value={form.landmark}
                    onChange={(v) => handleChange('landmark', v)}
                  />
                </div>

                {/* Contact Name + Phone */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    label="Contact Name *"
                    placeholder="Recipient name"
                    value={form.contactName}
                    onChange={(v) => handleChange('contactName', v)}
                    error={errors.contactName}
                  />
                  <FormField
                    label="Contact Phone *"
                    placeholder="+91XXXXXXXXXX"
                    value={form.contactPhone}
                    onChange={(v) => handleChange('contactPhone', v)}
                    error={errors.contactPhone}
                  />
                </div>

                {/* Location coordinates */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[#8E7B73] text-xs font-black uppercase tracking-widest">
                      Location Coordinates (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={handleUseLocation}
                      disabled={locating}
                      className="flex items-center gap-1.5 text-[#F7B538] text-xs font-black hover:text-[#780116] transition-colors disabled:opacity-50"
                    >
                      {locating ? (
                        <><Loader2 size={14} className="animate-spin" /> Locating…</>
                      ) : (
                        <><LocateFixed size={14} /> Use Current Location</>
                      )}
                    </button>
                  </div>
                  {form.latitude && form.longitude && (
                    <p className="text-green-600 text-xs font-bold mt-2 flex items-center gap-1 bg-green-50 w-fit px-3 py-1.5 rounded-lg border border-green-200">
                      <CheckCircle2 size={16} /> Exact GPS Location Captured
                    </p>
                  )}
                </div>

                {/* Default toggle */}
                <div
                  onClick={() => handleChange('isDefault', !form.isDefault)}
                  className="flex items-center gap-3 p-4 rounded-xl bg-white border border-[#EADDCD] cursor-pointer hover:border-[#F7B538] shadow-sm transition-all"
                >
                  <div
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                      form.isDefault
                        ? 'bg-[#F7B538] border-[#F7B538]'
                        : 'border-[#EADDCD] bg-[#FFFCF5]'
                    }`}
                  >
                    {form.isDefault && (
                      <motion.svg
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        viewBox="0 0 12 12"
                        className="w-4 h-4 text-[#780116]"
                      >
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </motion.svg>
                    )}
                  </div>
                  <div>
                    <p className="text-[#780116] text-sm font-black">Set as default address</p>
                    <p className="text-[#8E7B73] text-xs font-bold">Auto-selected at checkout</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  {isEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Delete this address?')) {
                          deleteMut.mutate(editAddress.id);
                        }
                      }}
                      disabled={deleteMut.isPending}
                      className="px-5 py-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 font-bold text-sm hover:bg-red-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-4 rounded-2xl bg-[#780116] border-2 border-[#A00320] text-white font-black text-lg shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={20} className="animate-spin" /> Saving…
                      </>
                    ) : isEdit ? (
                      'Update Address'
                    ) : (
                      'Save Address'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Reusable dark input field */
function FormField({ label, placeholder, value, onChange, error }) {
  return (
    <div>
      <label className="block text-[#8E7B73] text-xs font-black mb-1.5 uppercase tracking-widest">
        {label}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-white border-2 ${
          error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-[#EADDCD] focus:border-[#F7B538] focus:ring-[#F7B538]/10'
        } text-[#780116] placeholder:text-[#8E7B73] rounded-xl py-3.5 px-4 outline-none focus:ring-4 transition-all font-bold text-sm shadow-inner`}
      />
      {error && <p className="text-red-500 text-xs font-bold mt-1.5">{error}</p>}
    </div>
  );
}
