import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Leaf,
  Menu,
  X,
  AlertCircle,
  UserCheck,
  Shield,
  LogOut,
  Bell,
  Trees,
  MapPin,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import IndiaLocationSelector from './IndiaLocationSelector';
import NotificationBellPanel from './NotificationBellPanel';
import { formatLocationLabel } from '../services/geocoding';

export default function Navbar() {
  const {
    currentUser,
    logout,
    selectedLocation,
    setSelectedLocation,
    clearSelectedLocation,
    isLocationModalOpen,
    setIsLocationModalOpen,
  } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'How It Works', path: '/how-it-works' },
    { name: 'Report an Issue', path: '/report-problem' },
    { name: 'Collection Schedule', path: '/schedule' },
    { name: 'Green Rewards', path: '/citizen/rewards' },
    { name: 'Awareness', path: '/awareness' },
  ];

  const locationDisplay = selectedLocation
    ? formatLocationLabel(selectedLocation)
    : 'Select your village or city';

  return (
    <>
      <header className="sticky top-0 z-40 shadow-sm">
        <nav className="bg-white/95 backdrop-blur-md border-b border-emerald-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 gap-2">
              {/* Brand Logo */}
              <Link to="/" className="flex items-center gap-2.5 group shrink-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-forest-700 to-emerald-500 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition">
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-extrabold tracking-tight text-forest-900">
                      Clean<span className="text-emerald-600">Village</span>
                    </span>
                    <Trees className="w-4 h-4 text-emerald-600 hidden sm:inline" />
                  </div>
                  <p className="text-[10px] font-medium text-emerald-700 -mt-1">
                    Every Village. Every Community.
                  </p>
                </div>
              </Link>

              {/* Desktop Nav Links */}
              <div className="hidden xl:flex items-center gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                        isActive
                          ? 'bg-emerald-50 text-forest-800 font-bold'
                          : 'text-slate-600 hover:text-forest-800 hover:bg-emerald-50/50'
                      }`
                    }
                  >
                    {item.name}
                  </NavLink>
                ))}
              </div>

              {/* Select Location + Login / Profile */}
              <div className="hidden lg:flex items-center gap-2">
                {/* Select Location Button */}
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-forest-900 border border-emerald-200 max-w-[210px] transition"
                  title="Select or change your village, town, or city in India"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">
                    {selectedLocation ? locationDisplay : 'Select Location'}
                  </span>
                </button>

                {currentUser ? (
                  <div className="flex items-center gap-2">
                    <NotificationBellPanel />
                    <Link
                      to={currentUser.role === 'authority' ? '/authority/dashboard' : '/citizen/dashboard'}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-forest-800 hover:bg-forest-900 text-white transition"
                    >
                      {currentUser.role === 'authority' ? (
                        <Shield className="w-3.5 h-3.5 text-amber-300" />
                      ) : (
                        <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
                      )}
                      {currentUser.role === 'authority' ? 'Authority Portal' : 'Profile / Dashboard'}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        navigate('/');
                      }}
                      className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
                      title="Log Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link
                      to="/login"
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-forest-800 hover:bg-forest-900 text-white shadow-sm transition"
                    >
                      Login / Sign Up
                    </Link>
                  </div>
                )}
              </div>

              {/* Mobile Controls */}
              <div className="flex items-center gap-1.5 xl:hidden">
                {currentUser && <NotificationBellPanel />}
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-forest-900 border border-emerald-200 max-w-[140px]"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{selectedLocation ? locationDisplay : 'Location'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="p-2 rounded-lg text-slate-700 hover:bg-emerald-50"
                  aria-label="Toggle Menu"
                >
                  {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Drawer */}
          {mobileOpen && (
            <div className="xl:hidden bg-white border-b border-emerald-100 px-4 pt-2 pb-4 space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `px-3 py-2 rounded-lg text-xs font-semibold ${
                        isActive ? 'bg-emerald-100 text-forest-900 font-bold' : 'text-slate-700 hover:bg-emerald-50'
                      }`
                    }
                  >
                    {item.name}
                  </NavLink>
                ))}
              </div>

              <div className="pt-2 border-t border-emerald-100 flex flex-wrap items-center justify-between gap-2">
                {currentUser ? (
                  <>
                    <Link
                      to={currentUser.role === 'authority' ? '/authority/dashboard' : '/citizen/dashboard'}
                      onClick={() => setMobileOpen(false)}
                      className="flex-1 text-center py-2 rounded-xl text-xs font-semibold bg-forest-800 text-white"
                    >
                      Go to {currentUser.role === 'authority' ? 'Authority' : 'Citizen'} Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setMobileOpen(false);
                        navigate('/');
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-50 text-red-700"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMobileOpen(false)}
                      className="flex-1 text-center py-2 rounded-xl text-xs font-semibold border border-emerald-300 text-forest-900"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileOpen(false)}
                      className="flex-1 text-center py-2 rounded-xl text-xs font-semibold bg-forest-800 text-white"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Global India Location Selector Modal */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl my-8">
            <IndiaLocationSelector
              value={selectedLocation}
              title="Location: Select Your Village, Town, or City in India"
              subtitle="Filter schedules, activities, and community updates for your area, or clear to view all of India."
              onConfirm={(loc) => {
                setSelectedLocation(loc);
                setIsLocationModalOpen(false);
              }}
              onClear={() => {
                clearSelectedLocation();
                setIsLocationModalOpen(false);
              }}
              onCancel={() => setIsLocationModalOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
