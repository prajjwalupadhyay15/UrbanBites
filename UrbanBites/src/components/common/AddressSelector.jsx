import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { addressApi } from '../../api/userApi';
import AddressFormModal from './AddressFormModal';
import {
  MapPin, ChevronDown, Plus, Edit3, Home, Briefcase, Navigation, Star
} from 'lucide-react';

const LABEL_ICON = {
  Home: Home,
  Work: Briefcase,
  Other: Navigation,
};

/**
 * AddressSelector — Zomato-style address picker.
 * @param {number|null} selectedId
 * @param {function} onSelect  — (addressId) => void
 * @param {string} variant    — 'strip' (compact) | 'full' (card-based list)
 */
export default function AddressSelector({ selectedId, onSelect, variant = 'strip' }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editAddress, setEditAddress] = useState(null);

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['my-addresses'],
    queryFn: addressApi.getAddresses,
    staleTime: 60000,
  });

  // Auto-select default if nothing selected
  React.useEffect(() => {
    if (addresses.length > 0 && !selectedId) {
      const def = addresses.find((a) => a.isDefault) || addresses[0];
      onSelect(def.id);
    }
  }, [addresses, selectedId]);

  const selected = addresses.find((a) => a.id === selectedId);
  const LabelIcon = selected ? (LABEL_ICON[selected.label] || MapPin) : MapPin;

  if (isLoading) {
    return (
      <div className="bg-white border border-[#EADDCD] rounded-2xl p-4 animate-pulse shadow-sm">
        <div className="h-4 bg-black/5 rounded-full w-1/2 mb-2" />
        <div className="h-3 bg-black/5 rounded-full w-3/4" />
      </div>
    );
  }

  // ── Strip variant (compact — used in CartDrawer) ──
  if (variant === 'strip') {
    return (
      <>
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center gap-3 bg-white border border-[#EADDCD] shadow-sm rounded-2xl px-4 py-3 text-left hover:border-[#F7B538] transition-all group"
          >
            <div className="w-10 h-10 bg-[#FDF9F1] border border-[#F7B538]/30 rounded-xl flex items-center justify-center shrink-0">
              <LabelIcon size={16} className="text-[#F7B538]" />
            </div>
            <div className="flex-1 min-w-0">
              {selected ? (
                <>
                  <p className="text-[#780116] font-bold text-sm flex items-center gap-1.5">
                    {selected.label}
                    {selected.isDefault && (
                      <span className="text-[9px] bg-[#FDF9F1] border border-[#F7B538] text-[#F7B538] px-1.5 py-0.5 rounded-full font-black">DEFAULT</span>
                    )}
                  </p>
                  <p className="text-[#8E7B73] text-xs font-medium mt-0.5 truncate">{selected.line1}, {selected.city}</p>
                </>
              ) : (
                <p className="text-[#8E7B73] font-bold text-sm">Select delivery address</p>
              )}
            </div>
            <ChevronDown
              size={18}
              className={`text-[#EADDCD] group-hover:text-[#F7B538] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#EADDCD] rounded-2xl overflow-hidden z-30 shadow-lg"
              >
                {addresses.map((a) => {
                  const Icon = LABEL_ICON[a.label] || MapPin;
                  return (
                    <button
                      key={a.id}
                      onClick={() => {
                        onSelect(a.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3.5 hover:bg-[#FDF9F1] transition-colors border-b border-[#EADDCD] last:border-0 flex items-center gap-3 group ${
                        a.id === selectedId ? 'bg-[#FFFCF5]' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-white border border-[#EADDCD] group-hover:border-[#F7B538] flex items-center justify-center shrink-0">
                        <Icon size={14} className="text-[#8E7B73] group-hover:text-[#F7B538]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#780116] font-bold text-sm flex items-center gap-1.5">
                          {a.label}
                          {a.isDefault && (
                            <span className="text-[9px] bg-[#FDF9F1] border border-[#F7B538] text-[#F7B538] px-1.5 py-0.5 rounded-full font-black">DEFAULT</span>
                          )}
                        </p>
                        <p className="text-[#8E7B73] text-xs truncate">{a.line1}, {a.city} - {a.pincode}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditAddress(a);
                          setModalOpen(true);
                          setDropdownOpen(false);
                        }}
                        className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-[#EADDCD] text-[#8E7B73] hover:text-[#F7B538] transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                      >
                        <Edit3 size={14} />
                      </button>
                    </button>
                  );
                })}

                {/* Add new */}
                <button
                  onClick={() => {
                    setEditAddress(null);
                    setModalOpen(true);
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-4 hover:bg-[#FDF9F1] transition-colors flex items-center gap-3 text-[#F7B538]"
                >
                  <Plus size={16} />
                  <span className="font-bold text-sm text-[#780116]">Add New Address</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AddressFormModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditAddress(null);
          }}
          editAddress={editAddress}
        />
      </>
    );
  }

  // ── Full variant (card-based — used in CartPage / CheckoutPage) ──
  return (
    <>
      <div className="space-y-3">
        {addresses.length === 0 ? (
          <div className="text-center py-6 bg-white border border-[#EADDCD] rounded-2xl shadow-sm">
            <div className="w-16 h-16 bg-[#FFFCF5] border border-[#EADDCD] rounded-full flex items-center justify-center mx-auto mb-3">
              <MapPin size={28} className="text-[#F7B538]" />
            </div>
            <p className="text-[#780116] font-display font-black text-lg mb-1">No saved addresses yet</p>
            <p className="text-[#8E7B73] text-sm font-medium mb-4">Add your home or work address for quicker checkout.</p>
            <button
              onClick={() => {
                setEditAddress(null);
                setModalOpen(true);
              }}
              className="px-6 py-3 rounded-xl bg-[#F7B538] text-[#780116] font-black text-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2 mx-auto"
            >
              <Plus size={16} /> Add Address
            </button>
          </div>
        ) : (
          <>
            {addresses.map((a) => {
              const Icon = LABEL_ICON[a.label] || MapPin;
              const isActive = a.id === selectedId;
              return (
                <motion.div
                  key={a.id}
                  layout
                  onClick={() => onSelect(a.id)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-3 group cursor-pointer ${
                    isActive
                      ? 'bg-[#FFFCF5] border-[#F7B538] shadow-sm'
                      : 'bg-white border-[#EADDCD] hover:border-[#F7B538]/50 hover:bg-[#FDF9F1] shadow-sm'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                      isActive ? 'bg-white border-[#F7B538]/30 shadow-inner' : 'bg-[#FFFCF5] border-[#EADDCD]'
                    }`}
                  >
                    <Icon size={20} className={isActive ? 'text-[#F7B538]' : 'text-[#8E7B73]'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#780116] font-black text-base flex items-center gap-2">
                      {a.label}
                      {a.isDefault && (
                        <span className="text-[10px] bg-[#FDF9F1] border border-[#F7B538] text-[#F7B538] px-1.5 py-0.5 rounded-full font-black tracking-widest">
                          DEFAULT
                        </span>
                      )}
                    </p>
                    <p className="text-[#5A3825] text-sm font-medium mt-0.5">{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
                    <p className="text-[#8E7B73] text-xs">{a.city}, {a.state} - {a.pincode}</p>
                    {a.contactName && (
                      <p className="text-[#8E7B73] text-xs mt-2 font-bold flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-[#EADDCD]"></span>
                        {a.contactName} · {a.contactPhone}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditAddress(a);
                      setModalOpen(true);
                    }}
                    className="p-2.5 rounded-xl bg-white border border-[#EADDCD] text-[#8E7B73] hover:text-[#F7B538] hover:border-[#F7B538] shadow-sm transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Edit3 size={14} />
                  </button>
                </motion.div>
              );
            })}

            {/* Add new address button */}
            <button
              onClick={() => {
                setEditAddress(null);
                setModalOpen(true);
              }}
              className="w-full p-4 rounded-2xl bg-white border-2 border-dashed border-[#EADDCD] hover:border-[#F7B538] text-[#F7B538] font-black text-sm flex items-center justify-center gap-2 hover:bg-[#FDF9F1] transition-all shadow-sm"
            >
              <Plus size={16} /> Add New Address
            </button>
          </>
        )}
      </div>

      <AddressFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditAddress(null);
        }}
        editAddress={editAddress}
      />
    </>
  );
}
