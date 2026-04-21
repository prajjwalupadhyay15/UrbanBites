import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Search, MapPin, Crosshair, X, Home, Briefcase, Navigation,
  ChevronRight, Loader2, CheckCircle2
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { addressApi } from '../../api/userApi';

// Fix Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Map marker that follows clicks ───
function DraggableMarker({ position, onMove }) {
  const map = useMapEvents({
    click(e) {
      onMove(e.latlng.lat, e.latlng.lng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });
  useEffect(() => {
    if (position?.lat && position?.lng) {
      map.setView([position.lat, position.lng], map.getZoom(), { animate: true });
    }
  }, [position?.lat, position?.lng, map]);
  return position?.lat && position?.lng
    ? <Marker position={[position.lat, position.lng]} />
    : null;
}

// ─── Address label → icon ───
function AddressIcon({ label }) {
  const l = (label || '').toLowerCase();
  if (l.includes('work') || l.includes('office')) return <Briefcase size={14} />;
  return <Home size={14} />;
}

// ═══════════════════════════════════════════════
//  MAIN MODAL
// ═══════════════════════════════════════════════
export default function LocationPickerModal({ isOpen, onClose, onSelect, currentLat, currentLng, currentName }) {
  const { isAuthenticated } = useAuthStore();

  // Internal state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Map pin position
  const [pin, setPin] = useState({ lat: currentLat || 28.6139, lng: currentLng || 77.2090 });
  const [pinName, setPinName] = useState(currentName || '');

  // Fetch saved addresses
  const { data: savedAddresses = [] } = useQuery({
    queryKey: ['my-addresses'],
    queryFn: addressApi.getAddresses,
    enabled: isAuthenticated && isOpen,
  });

  // Sync pin when the modal opens with new external coords
  useEffect(() => {
    if (isOpen && currentLat && currentLng) {
      setPin({ lat: currentLat, lng: currentLng });
      setPinName(currentName || '');
    }
  }, [isOpen]);

  // ── Debounced address search via Nominatim ──
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
        );
        setSearchResults(await res.json());
      } catch { setSearchResults([]); }
      finally { setIsSearching(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Reverse geocode a lat/lng into a name ──
  const reverseGeocode = async (lat, lng) => {
    setIsReverseGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`
      );
      const d = await res.json();
      const name =
        d?.address?.road || d?.address?.suburb || d?.address?.neighbourhood ||
        d?.address?.city || d?.address?.town || 'Selected Location';
      setPinName(name);
    } catch {
      setPinName('Selected Location');
    } finally { setIsReverseGeocoding(false); }
  };

  // ── When pin moves (map click / drag) ──
  const handlePinMove = (lat, lng) => {
    setPin({ lat, lng });
    reverseGeocode(lat, lng);
  };

  // ── When a search result is clicked → move pin ──
  const handleSearchSelect = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setPin({ lat, lng });
    setPinName(result.display_name.split(',')[0]);
    setSearchQuery('');
    setSearchResults([]);
  };

  // ── Use GPS ──
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPin({ lat, lng });
        await reverseGeocode(lat, lng);
        setIsLocating(false);
      },
      () => setIsLocating(false)
    );
  };

  // ── Select saved address ──
  const handleSavedAddress = async (addr) => {
    if (addr.latitude && addr.longitude) {
      setPin({ lat: addr.latitude, lng: addr.longitude });
      setPinName(addr.label);
    } else {
      // Fallback: geocode the address
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            (addr.line1 || addr.addressLine || '') + ', ' + (addr.city || '')
          )}&limit=1`
        );
        const data = await res.json();
        if (data?.length > 0) {
          setPin({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
          setPinName(addr.label);
        }
      } catch { /* ignore */ }
    }
  };

  // ── Confirm selection ──
  const handleConfirm = () => {
    onSelect({ lat: pin.lat, lng: pin.lng, name: pinName });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-[#2A0800]/40 backdrop-blur-md" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 24 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FFFCF5] border border-[#EADDCD] w-full max-w-lg rounded-[2rem] overflow-hidden shadow-premium flex flex-col max-h-[92vh]"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h3 className="text-[#780116] font-display font-black text-2xl flex items-center gap-2 tracking-tight">
              <MapPin size={24} className="text-[#F7B538]" /> Select Location
            </h3>
            <p className="text-[#8E7B73] text-sm font-bold mt-0.5">Find restaurants delivering near you</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-[#EADDCD] text-[#780116] hover:bg-[#FDF9F1] hover:border-[#F7B538] transition-all shadow-sm"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Search ── */}
        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E7B73]" size={18} />
            <input
              type="text"
              placeholder="Search for area, street name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-2 border-[#EADDCD] text-[#780116] rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-[#F7B538] focus:ring-4 focus:ring-[#F7B538]/10 text-base font-bold placeholder:text-[#8E7B73] transition-all shadow-inner"
            />
            {isSearching && (
              <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#F7B538] animate-spin" />
            )}
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-2 bg-white border border-[#EADDCD] rounded-2xl overflow-hidden max-h-[180px] overflow-y-auto custom-scrollbar shadow-lg absolute z-50 left-6 right-6"
              >
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    onClick={() => handleSearchSelect(res)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[#FDF9F1] transition-colors text-left border-b border-[#EADDCD] last:border-b-0 group"
                  >
                    <MapPin size={18} className="text-[#8E7B73] group-hover:text-[#F7B538] mt-0.5 shrink-0 transition-colors" />
                    <div className="min-w-0">
                      <p className="text-[#780116] text-sm font-bold truncate">{res.display_name.split(',')[0]}</p>
                      <p className="text-[#8E7B73] text-xs truncate">{res.display_name}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Map ── */}
        <div className="px-6 pb-4">
          <div className="h-[200px] rounded-2xl overflow-hidden border-2 border-[#EADDCD] relative shadow-inner">
            <MapContainer
              center={[pin.lat, pin.lng]}
              zoom={14}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; OSM'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              <DraggableMarker
                position={pin}
                onMove={handlePinMove}
              />
            </MapContainer>

            {/* Reverse geocoding loader overlay */}
            {isReverseGeocoding && (
              <div className="absolute inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center z-[1000]">
                <div className="bg-white px-5 py-3 rounded-2xl flex items-center gap-3 border border-[#EADDCD] shadow-lg">
                  <Loader2 size={18} className="text-[#F7B538] animate-spin" />
                  <span className="text-[#780116] text-sm font-bold tracking-wide">Pinpointing…</span>
                </div>
              </div>
            )}
          </div>

          {/* Pin result label */}
          <div className="flex items-center justify-between mt-3 bg-white border border-[#EADDCD] p-3 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin size={16} className="text-[#F7B538] shrink-0" />
              <p className="text-[#780116] text-sm font-bold truncate">{pinName || 'Tap on the map to select'}</p>
            </div>
            <p className="text-[#8E7B73] text-[10px] font-black uppercase tracking-widest shrink-0 ml-2">Click map to move pin</p>
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div className="px-6 pb-4 flex-1 overflow-y-auto custom-scrollbar space-y-4">
          {/* Use Current Location */}
          <button
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-[#FDF9F1] border border-[#F7B538]/30 hover:bg-[#F7B538]/10 transition-all text-left disabled:opacity-50 shadow-sm"
          >
            {isLocating ? (
              <Loader2 size={20} className="text-[#F7B538] animate-spin shrink-0" />
            ) : (
              <Crosshair size={20} className="text-[#F7B538] shrink-0" />
            )}
            <div>
              <p className="text-[#780116] text-base font-black">
                {isLocating ? 'Detecting…' : 'Use Current Location'}
              </p>
              <p className="text-[#8E7B73] text-xs font-bold mt-0.5">GPS-based pinpoint accuracy</p>
            </div>
          </button>

          {/* Saved Addresses */}
          {isAuthenticated && savedAddresses.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest font-black text-[#8E7B73] mb-3 ml-1">Saved Addresses</p>
              <div className="space-y-2">
                {savedAddresses.map(addr => (
                  <button
                    key={addr.id}
                    onClick={() => handleSavedAddress(addr)}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-[#EADDCD] hover:border-[#F7B538] hover:bg-[#FDF9F1] transition-all text-left group shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#FDF9F1] border border-[#F7B538]/30 flex items-center justify-center text-[#F7B538] group-hover:scale-110 transition-transform shrink-0">
                      <AddressIcon label={addr.label} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[#780116] text-base font-black">{addr.label}</p>
                      <p className="text-[#8E7B73] text-xs truncate font-medium mt-0.5">{addr.line1 || addr.addressLine}, {addr.city}</p>
                    </div>
                    <ChevronRight size={18} className="text-[#EADDCD] group-hover:text-[#F7B538] ml-auto shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Confirm Button ── */}
        <div className="px-6 py-5 border-t border-[#EADDCD] bg-white">
          <button
            onClick={handleConfirm}
            disabled={!pinName}
            className="w-full py-4 rounded-2xl bg-[#780116] border-2 border-[#A00320] text-white font-black text-base shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-40 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} />
            Confirm Location
          </button>
        </div>
      </motion.div>
    </div>
  );
}
