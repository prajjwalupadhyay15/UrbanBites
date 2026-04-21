import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../../api/adminApi';
import { motion } from 'framer-motion';
import { 
  DollarSign, TrendingUp, TrendingDown, Wallet, Activity, 
  Settings, CheckCircle2, AlertTriangle, Play, Edit3, X
} from 'lucide-react';

/* ─── Stat Card Component ───────────────────────────────────── */
function StatCard({ label, value, icon: Icon, color, delay = 0, subtitle }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="bg-white border border-[#EADDCD] rounded-[2.5rem] p-6 relative overflow-hidden group hover:border-[#F7B538] hover:shadow-premium shadow-sm transition-all"
    >
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none ${color}`} />
      <div className="flex justify-between items-start mb-5">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${color.replace('bg-', 'bg-').replace('/80', '/10')} border-current/20`}
          style={{ color: color.includes('orange') ? '#F7B538' : color.includes('green') ? '#16a34a' : color.includes('red') ? '#dc2626' : color.includes('blue') ? '#3b82f6' : '#9333ea' }}
        >
          <Icon size={20} />
        </div>
      </div>
      <p className="text-[#8E7B73] text-xs font-black uppercase tracking-widest mb-1.5">{label}</p>
      <p className="text-3xl font-black text-[#780116] font-display">
        {value === undefined || value === null ? (
          <span className="bg-[#EADDCD]/30 rounded-lg w-24 h-8 block animate-pulse" />
        ) : value}
      </p>
      {subtitle && <p className="text-[#8E7B73] text-xs font-medium mt-2">{subtitle}</p>}
    </motion.div>
  );
}

export default function FinanceTab() {
  const qc = useQueryClient();
  const [editingPricingRule, setEditingPricingRule] = useState(null);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [pricingForm, setPricingForm] = useState({
    version: '', baseFee: 0, slabKmCutoff: 0, slabFee: 0, perKmRate: 0,
    surgePeakMultiplier: 1, surgeRainMultiplier: 1, minDeliveryFee: 0, maxDeliveryFee: 0,
    freeDeliveryThreshold: 0, platformFeeType: 'FIXED', platformFeeValue: 0, taxPercent: 0,
    packingPolicy: 'NONE', packingValue: 0, active: false
  });
  
  const { data: finance, isLoading: financeLoading } = useQuery({
    queryKey: ['admin-finance'],
    queryFn: adminApi.getFinanceOverview,
  });

  const { data: pricingRules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['admin-pricing-rules'],
    queryFn: adminApi.getPricingRules,
  });

  const { data: payoutControls = [], isLoading: payoutsLoading } = useQuery({
    queryKey: ['admin-payout-controls'],
    queryFn: adminApi.getPayoutControls,
  });

  const activateRuleMut = useMutation({
    mutationFn: (id) => adminApi.activatePricingRule(id),
    onSuccess: () => qc.invalidateQueries(['admin-pricing-rules']),
  });

  const togglePayoutBlockMut = useMutation({
    mutationFn: ({ id, block, reason }) => 
      adminApi.setPayoutBlock(id, { block, reason }),
    onSuccess: () => qc.invalidateQueries(['admin-payout-controls']),
  });

  const upsertPricingRuleMut = useMutation({
    mutationFn: (data) => data.id 
      ? adminApi.updatePricingRule(data.id, data) 
      : adminApi.createPricingRule(data),
    onSuccess: () => {
      qc.invalidateQueries(['admin-pricing-rules']);
      setIsPricingModalOpen(false);
      setEditingPricingRule(null);
    },
  });

  const openPricingModal = (rule = null) => {
    if (rule) {
      setEditingPricingRule(rule.id);
      setPricingForm({ ...rule });
    } else {
      setEditingPricingRule(null);
      setPricingForm({
        version: '', baseFee: 0, slabKmCutoff: 0, slabFee: 0, perKmRate: 0,
        surgePeakMultiplier: 1, surgeRainMultiplier: 1, minDeliveryFee: 0, maxDeliveryFee: 0,
        freeDeliveryThreshold: 0, platformFeeType: 'FIXED', platformFeeValue: 0, taxPercent: 0,
        packingPolicy: 'FIXED', packingValue: 0, active: false
      });
    }
    setIsPricingModalOpen(true);
  };

  const handlePricingSubmit = (e) => {
    e.preventDefault();
    upsertPricingRuleMut.mutate({ id: editingPricingRule, ...pricingForm });
  };

  const formatCurrency = (val) => {
    if (val === undefined || val === null) return null;
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-8">
      {/* Finance Overview Grid */}
      <div>
        <h3 className="text-[#780116] font-black text-xl mb-4 flex items-center gap-2 font-display">
          <Activity className="text-[#F7B538]" /> Platform Financials
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            label="Gross Earnings" 
            value={formatCurrency(finance?.urbanBitesGrossEarnings)} 
            icon={TrendingUp} color="bg-green-500/80" delay={0} 
            subtitle="Total platform fees + delivery fees"
          />
          <StatCard 
            label="Net Cash In" 
            value={formatCurrency(finance?.netCashIn)} 
            icon={Wallet} color="bg-blue-500/80" delay={0.05} 
            subtitle="Actual cash received (payments - refunds)"
          />
          <StatCard 
            label="Agent Payouts" 
            value={formatCurrency(finance?.agentPayoutTotal)} 
            icon={TrendingDown} color="bg-red-500/80" delay={0.1} 
            subtitle="Total payouts owed to delivery agents"
          />
          <StatCard 
            label="UB Net Income" 
            value={formatCurrency(finance?.urbanBitesNetAfterAgentPayout)} 
            icon={DollarSign} color="bg-purple-500/80" delay={0.15} 
            subtitle="Gross Earnings - Agent Payouts"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Pricing Rules */}
        <div className="bg-white border border-[#EADDCD] rounded-[2.5rem] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[#780116] font-black text-lg flex items-center gap-2 font-display">
              <Settings className="text-[#F7B538]" size={18} /> Pricing Engine
            </h3>
            <button 
              onClick={() => openPricingModal()}
              className="text-xs font-black px-3 py-1.5 rounded-xl bg-white border border-[#EADDCD] shadow-sm text-[#F7B538] hover:bg-[#FDF9F1] transition-all"
            >
              + New Rule
            </button>
          </div>

          <div className="space-y-3">
            {rulesLoading ? (
              [...Array(2)].map((_, i) => <div key={i} className="h-24 bg-[#EADDCD]/30 rounded-2xl animate-pulse" />)
            ) : pricingRules.length === 0 ? (
              <p className="text-[#8E7B73] text-sm text-center py-6">No pricing rules defined.</p>
            ) : (
              pricingRules.map((rule) => (
                <div key={rule.id} className={`border rounded-2xl p-4 transition-colors shadow-sm ${rule.active ? 'bg-[#FFFCF5] border-[#F7B538]' : 'bg-white border-[#EADDCD] hover:border-[#F7B538]'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#780116] font-black text-sm font-mono tracking-wider">{rule.version}</span>
                        {rule.active && <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#FDF9F1] border border-[#F7B538]/30 text-[#F7B538] uppercase tracking-widest">Active</span>}
                      </div>
                      <p className="text-[#8E7B73] text-xs mt-1 font-bold">
                        Base: ₹{rule.baseFee} • Per Km: ₹{rule.perKmRate} • Plat Fee: {rule.platformFeeType === 'PERCENTAGE' ? `${rule.platformFeeValue}%` : `₹${rule.platformFeeValue}`}
                      </p>
                    </div>
                    {!rule.active && (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => openPricingModal(rule)}
                          className="flex items-center gap-1 text-[10px] font-black px-2 py-1.5 rounded-lg bg-white border border-[#EADDCD] shadow-sm text-[#8E7B73] hover:bg-[#FDF9F1] hover:text-[#780116] transition-all"
                        >
                          <Edit3 size={12} /> Edit
                        </button>
                        <button 
                          onClick={() => activateRuleMut.mutate(rule.id)}
                          disabled={activateRuleMut.isPending}
                          className="flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 shadow-sm transition-all disabled:opacity-50"
                        >
                          <Play size={12} /> Activate
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs font-black text-[#8E7B73] bg-[#FFFCF5] border border-[#EADDCD] shadow-sm rounded-xl p-2 px-3">
                    <span>Surge Peak: {rule.surgePeakMultiplier}x</span>
                    <span>Surge Rain: {rule.surgeRainMultiplier}x</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payout Controls */}
        <div className="bg-white border border-[#EADDCD] rounded-[2.5rem] p-6 shadow-sm">
          <h3 className="text-[#780116] font-black text-lg mb-6 flex items-center gap-2 font-display">
            <AlertTriangle className="text-[#F7B538]" size={18} /> Payout Controls
          </h3>

          <div className="space-y-3">
            {payoutsLoading ? (
              [...Array(3)].map((_, i) => <div key={i} className="h-16 bg-[#EADDCD]/30 rounded-2xl animate-pulse" />)
            ) : payoutControls.length === 0 ? (
              <p className="text-[#8E7B73] text-sm text-center py-6">No payout controls active.</p>
            ) : (
              payoutControls.map((pc) => (
                <div key={pc.id} className="flex items-center justify-between p-4 bg-[#FFFCF5] border border-[#EADDCD] shadow-sm rounded-2xl hover:border-[#F7B538] transition-colors">
                  <div>
                    <p className="text-[#780116] font-bold text-sm">{pc.restaurantName}</p>
                    {pc.payoutBlocked && (
                      <p className="text-red-600 font-bold text-xs mt-0.5 max-w-[200px] truncate" title={pc.blockReason}>
                        Blocked: {pc.blockReason}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (pc.payoutBlocked) {
                        togglePayoutBlockMut.mutate({ id: pc.restaurantId, block: false });
                      } else {
                        const reason = prompt("Enter reason to block payouts:");
                        if (reason) togglePayoutBlockMut.mutate({ id: pc.restaurantId, block: true, reason });
                      }
                    }}
                    className={`text-xs font-black px-3 py-1.5 rounded-xl border shadow-sm transition-all ${
                      pc.payoutBlocked 
                        ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' 
                        : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                    }`}
                  >
                    {pc.payoutBlocked ? 'Unblock Payouts' : 'Block Payouts'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Pricing Modal */}
      {isPricingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#780116]/20 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="w-full max-w-2xl bg-white border border-[#EADDCD] rounded-[2.5rem] p-8 shadow-premium my-8 relative"
          >
            <button onClick={() => setIsPricingModalOpen(false)} className="absolute top-6 right-6 text-[#8E7B73] hover:text-[#780116]">
              <X size={20} />
            </button>
            <h3 className="text-[#780116] font-black text-xl mb-6 font-display">
              {editingPricingRule ? 'Edit Pricing Rule' : 'Create Pricing Rule'}
            </h3>
            
            <form onSubmit={handlePricingSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#8E7B73] font-black mb-1 block">Version Name</label>
                  <input required type="text" value={pricingForm.version} onChange={e => setPricingForm({...pricingForm, version: e.target.value})} className="w-full bg-[#FFFCF5] border border-[#EADDCD] rounded-xl px-4 py-2 text-[#780116] text-sm outline-none focus:border-[#F7B538] focus:ring-1 focus:ring-[#F7B538]/50 shadow-sm" placeholder="e.g. v2.1-rainy" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-[#780116] text-sm font-black bg-[#FFFCF5] border border-[#EADDCD] px-4 py-2.5 rounded-xl cursor-pointer shadow-sm">
                    <input type="checkbox" checked={pricingForm.active} onChange={e => setPricingForm({...pricingForm, active: e.target.checked})} className="accent-[#F7B538] w-4 h-4" />
                    Set as Active Rule
                  </label>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#8E7B73] font-black mb-1 block">Base Delivery Fee (₹)</label>
                  <input required type="number" step="0.01" value={pricingForm.baseFee} onChange={e => setPricingForm({...pricingForm, baseFee: e.target.value})} className="w-full bg-[#FFFCF5] border border-[#EADDCD] rounded-xl px-4 py-2 text-[#780116] text-sm outline-none focus:border-[#F7B538] shadow-sm" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#8E7B73] font-black mb-1 block">Per Km Rate (₹)</label>
                  <input required type="number" step="0.01" value={pricingForm.perKmRate} onChange={e => setPricingForm({...pricingForm, perKmRate: e.target.value})} className="w-full bg-[#FFFCF5] border border-[#EADDCD] rounded-xl px-4 py-2 text-[#780116] text-sm outline-none focus:border-[#F7B538] shadow-sm" />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#8E7B73] font-black mb-1 block">Slab Km Cutoff</label>
                  <input required type="number" step="0.01" value={pricingForm.slabKmCutoff} onChange={e => setPricingForm({...pricingForm, slabKmCutoff: e.target.value})} className="w-full bg-[#FFFCF5] border border-[#EADDCD] rounded-xl px-4 py-2 text-[#780116] text-sm outline-none focus:border-[#F7B538] shadow-sm" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#8E7B73] font-black mb-1 block">Slab Extra Fee (₹)</label>
                  <input required type="number" step="0.01" value={pricingForm.slabFee} onChange={e => setPricingForm({...pricingForm, slabFee: e.target.value})} className="w-full bg-[#FFFCF5] border border-[#EADDCD] rounded-xl px-4 py-2 text-[#780116] text-sm outline-none focus:border-[#F7B538] shadow-sm" />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#8E7B73] font-black mb-1 block">Min Delivery Fee (₹)</label>
                  <input required type="number" step="0.01" value={pricingForm.minDeliveryFee} onChange={e => setPricingForm({...pricingForm, minDeliveryFee: e.target.value})} className="w-full bg-[#FFFCF5] border border-[#EADDCD] rounded-xl px-4 py-2 text-[#780116] text-sm outline-none focus:border-[#F7B538] shadow-sm" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#8E7B73] font-black mb-1 block">Max Delivery Fee (₹)</label>
                  <input required type="number" step="0.01" value={pricingForm.maxDeliveryFee} onChange={e => setPricingForm({...pricingForm, maxDeliveryFee: e.target.value})} className="w-full bg-[#FFFCF5] border border-[#EADDCD] rounded-xl px-4 py-2 text-[#780116] text-sm outline-none focus:border-[#F7B538] shadow-sm" />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#8E7B73] font-black mb-1 block">Peak Surge Multiplier (x)</label>
                  <input required type="number" step="0.01" value={pricingForm.surgePeakMultiplier} onChange={e => setPricingForm({...pricingForm, surgePeakMultiplier: e.target.value})} className="w-full bg-[#FFFCF5] border border-[#EADDCD] rounded-xl px-4 py-2 text-[#780116] text-sm outline-none focus:border-[#F7B538] shadow-sm" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#8E7B73] font-black mb-1 block">Rain Surge Multiplier (x)</label>
                  <input required type="number" step="0.01" value={pricingForm.surgeRainMultiplier} onChange={e => setPricingForm({...pricingForm, surgeRainMultiplier: e.target.value})} className="w-full bg-[#FFFCF5] border border-[#EADDCD] rounded-xl px-4 py-2 text-[#780116] text-sm outline-none focus:border-[#F7B538] shadow-sm" />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#8E7B73] font-black mb-1 block">Platform Fee Type</label>
                  <select value={pricingForm.platformFeeType} onChange={e => setPricingForm({...pricingForm, platformFeeType: e.target.value})} className="w-full bg-[#FFFCF5] border border-[#EADDCD] rounded-xl px-4 py-2 text-[#780116] text-sm outline-none focus:border-[#F7B538] shadow-sm">
                    <option value="FIXED">Fixed (₹)</option>
                    <option value="PERCENT">Percent (%)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#8E7B73] font-black mb-1 block">Platform Fee Value</label>
                  <input required type="number" step="0.01" value={pricingForm.platformFeeValue} onChange={e => setPricingForm({...pricingForm, platformFeeValue: e.target.value})} className="w-full bg-[#FFFCF5] border border-[#EADDCD] rounded-xl px-4 py-2 text-[#780116] text-sm outline-none focus:border-[#F7B538] shadow-sm" />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#8E7B73] font-black mb-1 block">Packing Policy</label>
                  <select value={pricingForm.packingPolicy} onChange={e => setPricingForm({...pricingForm, packingPolicy: e.target.value})} className="w-full bg-[#FFFCF5] border border-[#EADDCD] rounded-xl px-4 py-2 text-[#780116] text-sm outline-none focus:border-[#F7B538] shadow-sm">
                    <option value="FIXED">Fixed (₹)</option>
                    <option value="PERCENT">Percent (%)</option>
                    <option value="ITEM_LEVEL">Item Level</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#8E7B73] font-black mb-1 block">Packing Value</label>
                  <input required type="number" step="0.01" value={pricingForm.packingValue} onChange={e => setPricingForm({...pricingForm, packingValue: e.target.value})} className="w-full bg-[#FFFCF5] border border-[#EADDCD] rounded-xl px-4 py-2 text-[#780116] text-sm outline-none focus:border-[#F7B538] shadow-sm" disabled={pricingForm.packingPolicy === 'ITEM_LEVEL'} />
                </div>
                
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#8E7B73] font-black mb-1 block">Tax Percent (%)</label>
                  <input required type="number" step="0.01" value={pricingForm.taxPercent} onChange={e => setPricingForm({...pricingForm, taxPercent: e.target.value})} className="w-full bg-[#FFFCF5] border border-[#EADDCD] rounded-xl px-4 py-2 text-[#780116] text-sm outline-none focus:border-[#F7B538] shadow-sm" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#8E7B73] font-black mb-1 block">Free Delivery Threshold (₹) (0 for none)</label>
                  <input required type="number" step="0.01" value={pricingForm.freeDeliveryThreshold} onChange={e => setPricingForm({...pricingForm, freeDeliveryThreshold: e.target.value})} className="w-full bg-[#FFFCF5] border border-[#EADDCD] rounded-xl px-4 py-2 text-[#780116] text-sm outline-none focus:border-[#F7B538] shadow-sm" />
                </div>
              </div>

              <div className="pt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsPricingModalOpen(false)} className="px-5 py-2.5 rounded-xl font-black text-sm text-[#8E7B73] bg-white border border-[#EADDCD] shadow-sm hover:text-[#780116] hover:bg-[#FDF9F1] transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={upsertPricingRuleMut.isPending} className="px-5 py-2.5 rounded-xl font-black text-sm text-white bg-[#F7B538] hover:bg-[#e0a332] shadow-[0_2px_12px_rgba(247,181,56,0.4)] transition-all disabled:opacity-50">
                  {upsertPricingRuleMut.isPending ? 'Saving...' : 'Save Pricing Rule'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
