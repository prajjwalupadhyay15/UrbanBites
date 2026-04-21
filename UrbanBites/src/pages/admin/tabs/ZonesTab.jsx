import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { restaurantApi } from '../../../api/restaurantApi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Map, Plus, Save, X, ToggleLeft, ToggleRight, MapPin, Search, Loader2 } from 'lucide-react';

/* ── Geocode helper: resolves a place name / pincode / district into a bounding box ── */
async function geocodeLocation(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  const data = await res.json();
  if (!data.length) return null;
  const place = data[0];
  const bb = place.boundingbox; // [south, north, west, east] as strings
  return {
    displayName: place.display_name,
    minLatitude: parseFloat(bb[0]),
    maxLatitude: parseFloat(bb[1]),
    minLongitude: parseFloat(bb[2]),
    maxLongitude: parseFloat(bb[3]),
  };
}

export default function ZonesTab() {
  const qc = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [resolvedPlace, setResolvedPlace] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    minLatitude: '',
    maxLatitude: '',
    minLongitude: '',
    maxLongitude: '',
    active: true,
  });

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['admin-zones'],
    queryFn: restaurantApi.listZones,
  });

  const createMutation = useMutation({
    mutationFn: (data) => restaurantApi.createServiceZone(data),
    onSuccess: () => {
      toast.success('Service zone created successfully!', {
        iconTheme: { primary: '#16a34a', secondary: '#fff' }
      });
      setIsAdding(false);
      resetForm();
      qc.invalidateQueries(['admin-zones']);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create zone');
    }
  });

  const resetForm = () => {
    setFormData({ name: '', minLatitude: '', maxLatitude: '', minLongitude: '', maxLongitude: '', active: true });
    setLocationQuery('');
    setResolvedPlace(null);
  };

  const handleLookup = async () => {
    if (!locationQuery.trim()) {
      toast.error('Enter a pincode, district or city name');
      return;
    }
    setIsGeocoding(true);
    setResolvedPlace(null);
    try {
      const result = await geocodeLocation(locationQuery.trim());
      if (!result) {
        toast.error('Location not found. Try a different pincode or name.');
        return;
      }
      setResolvedPlace(result);
      setFormData(prev => ({
        ...prev,
        name: prev.name || locationQuery.trim(),
        minLatitude: result.minLatitude.toFixed(6),
        maxLatitude: result.maxLatitude.toFixed(6),
        minLongitude: result.minLongitude.toFixed(6),
        maxLongitude: result.maxLongitude.toFixed(6),
      }));
      toast.success('Coordinates resolved!');
    } catch {
      toast.error('Geocoding failed. Check your network.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      name: formData.name,
      minLatitude: parseFloat(formData.minLatitude),
      maxLatitude: parseFloat(formData.maxLatitude),
      minLongitude: parseFloat(formData.minLongitude),
      maxLongitude: parseFloat(formData.maxLongitude),
      active: formData.active
    });
  };

  if (isLoading) {
    return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-[#EADDCD]/30 rounded-2xl animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[#780116] font-black text-xl flex items-center gap-2">
          <Map size={24} className="text-[#F7B538]" />
          Service Zones
        </h2>
        <button
          onClick={() => { setIsAdding(true); resetForm(); }}
          className="bg-gradient-to-r from-[#780116] to-[#A00320] hover:opacity-90 text-white px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-premium"
        >
          <Plus size={16} /> Add Zone
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
            animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
            onSubmit={handleSubmit}
            className="bg-white border border-[#EADDCD] rounded-[2rem] p-6 shadow-sm space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#EADDCD] pb-4">
              <div>
                <h3 className="font-black text-[#780116] text-lg">Create New Zone</h3>
                <p className="text-[#8E7B73] text-xs font-bold mt-0.5">Search by pincode, city, or district to auto-fill coordinates.</p>
              </div>
              <button type="button" onClick={() => setIsAdding(false)} className="text-[#8E7B73] hover:text-[#780116] transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Location Search */}
            <div className="bg-[#FDF9F1] border border-[#EADDCD]/60 rounded-2xl p-4 space-y-3">
              <label className="block text-[10px] font-black uppercase text-[#8E7B73] tracking-widest">Find by Pincode / City / District</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 110001, Delhi, Lucknow, Varanasi"
                  value={locationQuery}
                  onChange={e => setLocationQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleLookup(); } }}
                  className="flex-1 bg-white border border-[#EADDCD] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#F7B538] focus:ring-1 focus:ring-[#F7B538] text-sm font-bold text-[#780116] placeholder:text-[#D2C5B8]"
                />
                <button
                  type="button"
                  onClick={handleLookup}
                  disabled={isGeocoding}
                  className="px-5 py-2.5 bg-[#F7B538] hover:bg-[#e5a024] text-[#2A0800] rounded-xl font-black text-sm flex items-center gap-2 transition-colors disabled:opacity-50 shrink-0"
                >
                  {isGeocoding ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  {isGeocoding ? 'Looking up…' : 'Lookup'}
                </button>
              </div>
              {resolvedPlace && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2 font-bold">
                  ✅ Resolved: {resolvedPlace.displayName}
                </motion.div>
              )}
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black uppercase text-[#8E7B73] mb-1.5 ml-1 tracking-widest">Zone Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Downtown Delhi"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#FFFCF5] border border-[#EADDCD] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#F7B538] focus:ring-1 focus:ring-[#F7B538] text-sm font-bold text-[#780116]"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-black uppercase text-[#8E7B73] mb-1.5 ml-1 tracking-widest">Min Latitude</label>
                <input
                  required type="number" step="0.000001"
                  value={formData.minLatitude}
                  onChange={e => setFormData({ ...formData, minLatitude: e.target.value })}
                  className="w-full bg-[#FFFCF5] border border-[#EADDCD] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#F7B538] text-sm font-medium text-[#780116]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-[#8E7B73] mb-1.5 ml-1 tracking-widest">Max Latitude</label>
                <input
                  required type="number" step="0.000001"
                  value={formData.maxLatitude}
                  onChange={e => setFormData({ ...formData, maxLatitude: e.target.value })}
                  className="w-full bg-[#FFFCF5] border border-[#EADDCD] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#F7B538] text-sm font-medium text-[#780116]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-[#8E7B73] mb-1.5 ml-1 tracking-widest">Min Longitude</label>
                <input
                  required type="number" step="0.000001"
                  value={formData.minLongitude}
                  onChange={e => setFormData({ ...formData, minLongitude: e.target.value })}
                  className="w-full bg-[#FFFCF5] border border-[#EADDCD] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#F7B538] text-sm font-medium text-[#780116]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-[#8E7B73] mb-1.5 ml-1 tracking-widest">Max Longitude</label>
                <input
                  required type="number" step="0.000001"
                  value={formData.maxLongitude}
                  onChange={e => setFormData({ ...formData, maxLongitude: e.target.value })}
                  className="w-full bg-[#FFFCF5] border border-[#EADDCD] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#F7B538] text-sm font-medium text-[#780116]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#EADDCD]">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, active: !formData.active })}
                className={`flex items-center gap-2 text-sm font-bold transition-colors ${formData.active ? 'text-[#16a34a]' : 'text-[#8E7B73]'}`}
              >
                {formData.active ? <ToggleRight size={24} className="text-[#16a34a]" /> : <ToggleLeft size={24} />}
                {formData.active ? 'Active' : 'Inactive'}
              </button>

              <button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-gradient-to-r from-[#780116] to-[#A00320] hover:opacity-90 text-white px-6 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all disabled:opacity-50 shadow-premium"
              >
                <Save size={16} />
                {createMutation.isPending ? 'Saving...' : 'Save Zone'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {zones.length === 0 && !isAdding && (
          <div className="col-span-full py-16 text-center bg-white border border-dashed border-[#EADDCD] rounded-[2.5rem] shadow-sm">
            <Map size={48} className="mx-auto mb-3 text-[#EADDCD]" />
            <p className="text-[#780116] font-black">No service zones defined</p>
            <p className="text-[#8E7B73] text-sm font-medium mt-1">Click "Add Zone" to define your first delivery region.</p>
          </div>
        )}
        {zones.map((zone, i) => (
          <motion.div
            key={zone.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white border border-[#EADDCD] rounded-2xl p-5 hover:border-[#F7B538] transition-colors shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-[#780116] text-lg flex items-center gap-2">
                  <MapPin size={18} className="text-[#F7B538]" />
                  {zone.name}
                </h3>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${zone.active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                  {zone.active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-[#8E7B73] bg-[#FDF9F1] p-3 rounded-xl border border-[#EADDCD]/50">
                <div><span className="font-bold">Min Lat:</span> {zone.minLatitude}</div>
                <div><span className="font-bold">Max Lat:</span> {zone.maxLatitude}</div>
                <div><span className="font-bold">Min Lng:</span> {zone.minLongitude}</div>
                <div><span className="font-bold">Max Lng:</span> {zone.maxLongitude}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
