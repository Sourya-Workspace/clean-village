import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Award,
  Trophy,
  CalendarCheck,
  Bell,
  User,
  ShieldCheck,
  ClipboardList,
  Truck,
  Activity,
  BarChart3,
  Users,
  LogOut,
  Sprout,
  Wrench,
  MapPin,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatLocationLabel } from '../services/geocoding';

export default function DashboardLayout({ children, role = 'citizen', title, subtitle, actions }) {
  const {
    currentUser,
    logout,
    notifications,
    selectedLocation,
    setIsLocationModalOpen,
    clearSelectedLocation,
  } = useApp();
  const navigate = useNavigate();

  const citizenLinks = [
    { name: 'Citizen Dashboard', path: '/citizen/dashboard', icon: LayoutDashboard },
    { name: 'Submit Complaint', path: '/citizen/submit-complaint', icon: PlusCircle },
    { name: 'My Complaints', path: '/citizen/complaints', icon: FileText },
    { name: 'Green Rewards', path: '/citizen/rewards', icon: Award },
    { name: 'Leaderboard', path: '/citizen/leaderboard', icon: Trophy },
    { name: 'Cleanliness Activities', path: '/citizen/activities', icon: CalendarCheck },
    { name: 'Collection Schedule', path: '/schedule', icon: Truck },
    { name: 'Notifications', path: '/citizen/notifications', icon: Bell },
    { name: 'My Profile', path: '/citizen/profile', icon: User },
  ];

  const authorityLinks = [
    { name: 'Authority Dashboard', path: '/authority/dashboard', icon: LayoutDashboard },
    { name: 'Complaint Management', path: '/authority/complaints', icon: ClipboardList },
    { name: 'Cleaning Tasks', path: '/authority/tasks', icon: Wrench },
    { name: 'Collection Management', path: '/authority/schedules', icon: Truck },
    { name: 'Cleanliness Monitoring', path: '/authority/monitoring', icon: Activity },
    { name: 'Rewards Management', path: '/authority/rewards', icon: Award },
    { name: 'Reports & Analytics', path: '/authority/reports', icon: BarChart3 },
    { name: 'User Management', path: '/authority/users', icon: Users },
    { name: 'Notifications', path: '/authority/notifications', icon: Bell },
  ];

  const links = role === 'authority' ? authorityLinks : citizenLinks;

  const unreadCount = notifications.filter(
    (n) =>
      !n.read &&
      currentUser &&
      (n.userId === currentUser.id || (currentUser.role === 'authority' && n.targetRole === 'authority'))
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Desktop Sidebar */}
        <aside className="lg:w-64 shrink-0">
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden sticky top-20">
            {/* User Summary Banner */}
            <div className="village-canopy-bg p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-400/20 border border-emerald-300/40 flex items-center justify-center font-bold text-emerald-200">
                  {currentUser?.fullName?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{currentUser?.fullName || 'Guest User'}</p>
                  <p className="text-[11px] text-emerald-200 truncate">
                    {currentUser?.village || 'India Community Member'}
                  </p>
                </div>
              </div>
              {role === 'citizen' && currentUser && (
                <div className="mt-3 pt-3 border-t border-emerald-700/60 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-emerald-200">
                    <Sprout className="w-3.5 h-3.5 text-amber-300" />
                    Green Points:
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-extrabold">
                    {currentUser.greenPoints || 0} pts
                  </span>
                </div>
              )}
              {role === 'authority' && (
                <div className="mt-3 pt-3 border-t border-emerald-700/60 flex items-center gap-1.5 text-xs text-amber-300 font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authorized Sanitation Admin</span>
                </div>
              )}
            </div>

            {/* Location Control inside Sidebar */}
            <div className="p-3 bg-emerald-50/70 border-b border-emerald-100 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-forest-900">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  Selected Area
                </span>
                {selectedLocation && (
                  <button
                    type="button"
                    onClick={clearSelectedLocation}
                    className="text-[10px] text-slate-500 hover:text-red-600 underline"
                  >
                    Show All
                  </button>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-800 truncate">
                {selectedLocation ? formatLocationLabel(selectedLocation) : 'All India (No Filter)'}
              </p>
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(true)}
                className="w-full py-1.5 px-2.5 rounded-lg text-[11px] font-bold bg-white hover:bg-emerald-100 text-forest-800 border border-emerald-200 transition"
              >
                {selectedLocation ? 'Change Location' : 'Select Village or City'}
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="p-2.5 space-y-1">
              {links.map((item) => {
                const Icon = item.icon;
                const isNotif = item.name === 'Notifications';
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                        isActive
                          ? 'bg-forest-800 text-white shadow-sm'
                          : 'text-slate-700 hover:bg-emerald-50 hover:text-forest-900'
                      }`
                    }
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      {item.name}
                    </span>
                    {isNotif && unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-slate-950">
                        {unreadCount}
                      </span>
                    )}
                  </NavLink>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition mt-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Page Header Banner */}
          {title && (
            <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-forest-800">
                    {role === 'authority' ? 'Sanitation Authority Console' : 'Citizen Sanitation Portal'}
                  </span>
                  <span className="text-[11px] text-slate-500">• CleanVillage India</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">{title}</h1>
                {subtitle && <p className="text-xs sm:text-sm text-slate-600 mt-0.5">{subtitle}</p>}
              </div>
              {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
}
