import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { restaurantApi } from '../../api/restaurantApi';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { Activity, TrendingUp, Store } from 'lucide-react';

const COLORS = ['#780116', '#F7B538', '#2A0800', '#8E7B73', '#FFD166'];

export default function PartnerAnalyticsDashboard({ restaurants }) {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(
    restaurants.length > 0 ? restaurants[0].id : null
  );

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['partner-analytics', selectedRestaurantId],
    queryFn: () => restaurantApi.getAnalytics(selectedRestaurantId),
    enabled: !!selectedRestaurantId,
    staleTime: 1000 * 60,
  });

  if (restaurants.length === 0) {
    return (
      <div className="py-16 text-center">
        <h3 className="text-xl font-black text-[#780116] mb-2 font-display">No Restaurants Yet</h3>
        <p className="text-[#8E7B73] text-sm font-bold">Add a restaurant to view analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Restaurant Selector */}
      {restaurants.length > 1 && (
        <div className="bg-white border border-[#EADDCD] p-4 rounded-[1.5rem] shadow-sm flex items-center gap-3">
          <Store className="text-[#F7B538]" size={20} />
          <select
            value={selectedRestaurantId || ''}
            onChange={(e) => setSelectedRestaurantId(Number(e.target.value))}
            className="flex-1 bg-transparent text-[#780116] font-black text-sm outline-none cursor-pointer"
          >
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <div className="w-8 h-8 border-4 border-[#F7B538] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !analytics ? (
        <div className="py-16 text-center text-[#8E7B73] font-bold">Could not load analytics.</div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#FFFCF5] border border-[#EADDCD] rounded-[2rem] p-6 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[#8E7B73] text-[10px] font-black uppercase tracking-wider mb-1">Total Revenue (7 Days)</p>
                <p className="text-3xl font-black text-[#2A0800]">₹{Number(analytics.totalRevenue).toLocaleString('en-IN')}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center border border-green-200 text-green-600">
                <TrendingUp size={24} />
              </div>
            </div>
            <div className="bg-[#FFFCF5] border border-[#EADDCD] rounded-[2rem] p-6 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[#8E7B73] text-[10px] font-black uppercase tracking-wider mb-1">Total Orders (7 Days)</p>
                <p className="text-3xl font-black text-[#2A0800]">{analytics.totalOrders}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-200 text-blue-600">
                <Activity size={24} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Revenue Chart */}
            <div className="bg-white border border-[#EADDCD] rounded-[2rem] p-6 shadow-sm">
              <h3 className="text-[#780116] font-black text-lg mb-6">Daily Revenue</h3>
              <div className="h-64">
                {analytics.revenueTimeline && analytics.revenueTimeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.revenueTimeline} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EADDCD" />
                      <XAxis dataKey="date" tick={{ fill: '#8E7B73', fontSize: 12, fontWeight: 'bold' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#8E7B73', fontSize: 12, fontWeight: 'bold' }} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                      <RechartsTooltip
                        contentStyle={{ borderRadius: '1rem', border: '1px solid #EADDCD', fontWeight: 'bold', color: '#2A0800' }}
                        formatter={(value) => [`₹${value}`, 'Revenue']}
                        labelStyle={{ color: '#780116', marginBottom: '0.25rem' }}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="#780116" strokeWidth={3} dot={{ r: 4, fill: '#780116', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-[#8E7B73] font-bold text-sm">No revenue data available</div>
                )}
              </div>
            </div>

            {/* Top Selling Items Chart */}
            <div className="bg-white border border-[#EADDCD] rounded-[2rem] p-6 shadow-sm">
              <h3 className="text-[#780116] font-black text-lg mb-6">Top Selling Items</h3>
              <div className="h-64">
                {analytics.topItems && analytics.topItems.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.topItems} margin={{ top: 5, right: 10, left: -20, bottom: 5 }} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EADDCD" />
                      <XAxis type="number" tick={{ fill: '#8E7B73', fontSize: 12, fontWeight: 'bold' }} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" tick={{ fill: '#2A0800', fontSize: 11, fontWeight: 'bold' }} tickLine={false} axisLine={false} width={120} />
                      <RechartsTooltip
                        contentStyle={{ borderRadius: '1rem', border: '1px solid #EADDCD', fontWeight: 'bold', color: '#2A0800' }}
                        formatter={(value) => [value, 'Units Sold']}
                        labelStyle={{ color: '#780116', marginBottom: '0.25rem' }}
                      />
                      <Bar dataKey="quantitySold" fill="#F7B538" radius={[0, 4, 4, 0]}>
                        {analytics.topItems.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-[#8E7B73] font-bold text-sm">No sales data available</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
