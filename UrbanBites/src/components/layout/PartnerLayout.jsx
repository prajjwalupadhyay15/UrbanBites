import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { userApi } from '../../api/userApi';
import {
  LayoutDashboard, Store, User, Map, LogOut, Plus, ChefHat, Bike, ShieldCheck,
  DollarSign, Activity, AlertTriangle, Ticket, MessageSquare, Users, MapPin,
  ClipboardList, History, CreditCard, Package
} from 'lucide-react';

const IMAGE_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

export default function PartnerLayout() {
  const { role, logout, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isItemActive = (itemPath) => {
    const currentPath = location.pathname;
    const currentSearch = location.search;
    
    const [basePath, searchStr] = itemPath.split('?');
    
    if (searchStr) {
      // If the link has a query string, current path and query must match
      return currentPath === basePath && currentSearch.includes(searchStr);
    } else {
      // If the link is the base dashboard path, it is only active if there are no tab queries
      if (itemPath === '/owner/dashboard' || itemPath === '/admin/dashboard' || itemPath === '/delivery/dashboard') {
        return currentPath === basePath && !currentSearch.includes('tab=');
      }
      // For profile or restaurants list, base path match is enough
      return currentPath.startsWith(basePath);
    }
  };

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: userApi.getProfile,
    staleTime: 1000 * 60 * 5,
  });

  const avatarUrl = profile?.profilePictureUrl
    ? profile.profilePictureUrl.startsWith('http') ? profile.profilePictureUrl : `${IMAGE_BASE}${profile.profilePictureUrl}`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.fullName || user?.fullName || 'User')}&background=F7B538&color=780116`;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isOwner = role === 'RESTAURANT_OWNER';
  const isAdmin = role === 'ADMIN';
  const themeColor = isOwner ? 'text-[#F7B538]' : isAdmin ? 'text-[#F7B538]' : 'text-[#780116]';
  const themeBgActive = isOwner ? 'bg-white border-[#EADDCD] shadow-premium' : isAdmin ? 'bg-white border-[#EADDCD] shadow-premium' : 'bg-white border-[#EADDCD] shadow-premium';
  const themeGlow = 'shadow-sm';

  const navItems = isOwner ? [
    { label: 'Live Board', icon: LayoutDashboard, path: '/owner/dashboard' },
    { label: 'My Restaurants', icon: Store, path: '/owner/restaurants' },
    { label: 'Orders', icon: ClipboardList, path: '/owner/dashboard?tab=incoming' },
    { label: 'Kitchen', icon: Package, path: '/owner/dashboard?tab=kitchen' },
    { label: 'Order History', icon: History, path: '/owner/dashboard?tab=history' },
    { label: 'Finance', icon: DollarSign, path: '/owner/dashboard?tab=finance' },
    { label: 'Profile', icon: User, path: '/owner/profile' },
  ] : isAdmin ? [
    { label: 'Overview', icon: LayoutDashboard, path: '/admin/dashboard' },
    { label: 'Users', icon: Users, path: '/admin/dashboard?tab=users' },
    { label: 'Restaurants', icon: Store, path: '/admin/dashboard?tab=restaurants' },
    { label: 'Approvals', icon: ShieldCheck, path: '/admin/dashboard?tab=approvals' },
    { label: 'Finance', icon: DollarSign, path: '/admin/dashboard?tab=finance' },
    { label: 'Operations', icon: Activity, path: '/admin/dashboard?tab=operations' },
    { label: 'Disputes', icon: AlertTriangle, path: '/admin/dashboard?tab=disputes' },
    { label: 'Moderation', icon: MessageSquare, path: '/admin/dashboard?tab=moderation' },
    { label: 'Coupons', icon: Ticket, path: '/admin/dashboard?tab=coupons' },
    { label: 'Zones', icon: MapPin, path: '/admin/dashboard?tab=zones' },
    { label: 'Profile', icon: User, path: '/admin/profile' },
  ] : [
    { label: 'Active Delivery', icon: Map, path: '/delivery/dashboard' },
    { label: 'Order History', icon: History, path: '/delivery/dashboard?tab=history' },
    { label: 'Earnings', icon: CreditCard, path: '/delivery/dashboard?tab=finance' },
    { label: 'Profile', icon: User, path: '/delivery/profile' },
  ];

  const RoleIcon = isOwner ? ChefHat : isAdmin ? ShieldCheck : Bike;
  const roleLabel = isOwner ? 'Partner Suite' : isAdmin ? 'Admin Console' : 'Rider HUD';

  return (
    <div className="min-h-screen bg-[#FDF9F1] flex flex-col md:flex-row text-[#2A0800] font-sans overflow-hidden">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 border-r border-[#EADDCD] bg-[#FFFCF5] h-screen relative z-30 shadow-sm">
        
        {/* Brand Header */}
        <div className="p-8 border-b border-[#EADDCD]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-[#EADDCD] ${themeColor} ${themeGlow}`}>
              <RoleIcon size={20} />
            </div>
            <div>
              <h2 className="font-black text-xl tracking-tight leading-none text-[#780116] font-display">Urban<span className="text-[#F7B538]">Bites</span></h2>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#8E7B73] font-black mt-1">
                {roleLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-6 space-y-3 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = isItemActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all border
                  ${isActive 
                    ? `${themeColor} ${themeBgActive} shadow-sm` 
                    : 'text-[#8E7B73] border-transparent hover:bg-white hover:text-[#780116] hover:border-[#EADDCD] hover:shadow-sm'}
                `}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}

          {/* Add Restaurant Quick Button - ONLY FOR OWNERS */}
          {isOwner && (
            <div className="pt-6 mt-6 border-t border-[#EADDCD] border-dashed">
              <button 
                onClick={() => navigate('/partner/restaurant/register')} 
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-[#FFFCF5] border border-[#EADDCD] text-[#780116] hover:bg-[#780116] hover:text-white hover:border-[#A00320] shadow-sm hover:shadow-premium hover:-translate-y-1 active:scale-[0.98] transition-all font-black text-sm group"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                Add New Restaurant
              </button>
            </div>
          )}
        </nav>

        {/* User Card & Logout */}
        <div className="p-6 border-t border-[#EADDCD] bg-[#FFFCF5]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-white border border-[#EADDCD] shadow-sm flex items-center justify-center text-[#780116] font-black text-sm overflow-hidden">
                 <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
               </div>
               <div className="overflow-hidden max-w-[120px]">
                 <p className="text-[#780116] font-bold text-sm truncate">{user?.fullName || 'Partner'}</p>
                 <p className="text-[#8E7B73] text-xs font-bold truncate">{user?.email}</p>
               </div>
            </div>
            <button onClick={handleLogout} className="w-10 h-10 rounded-xl bg-white border border-[#EADDCD] shadow-sm flex items-center justify-center text-[#8E7B73] hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full h-screen overflow-y-auto bg-[#FDF9F1]">
        {/* Mobile Header (Only visible on small screens) */}
        <div className="md:hidden flex items-center justify-between p-5 border-b border-[#EADDCD] bg-[#FFFCF5] sticky top-0 z-40 backdrop-blur-xl bg-opacity-95 shadow-sm">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-[#EADDCD] shadow-sm ${themeColor}`}>
              <RoleIcon size={16} />
            </div>
            <h2 className="font-black text-lg tracking-tight text-[#780116] font-display">Urban<span className="text-[#F7B538]">Bites</span></h2>
          </div>
          <button onClick={handleLogout} className="text-[#8E7B73] hover:text-red-600 transition-colors">
            <LogOut size={20} />
          </button>
        </div>

        {/* Page Content */}
        <div className="p-4 md:p-8 relative h-full">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#FFFCF5] border-t border-[#EADDCD] shadow-premium z-50 px-2 pb-safe pt-2 flex justify-around overflow-x-auto">
        {navItems.map((item) => {
          const isActive = isItemActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex flex-col items-center gap-1 p-2 rounded-xl transition-all min-w-[72px]
                ${isActive ? themeColor : 'text-[#8E7B73] hover:text-[#780116]'}
              `}
            >
              <item.icon size={20} className={isActive ? '' : ''} />
              <span className="text-[10px] font-bold whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
