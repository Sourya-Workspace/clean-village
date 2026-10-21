import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Shield, UserCheck, Lock, Mail, AlertCircle, KeyRound } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SINGLE_ADMIN_EMAIL } from '../data/seedData';
import { INDIA_STATES_AND_UTS, DISTRICTS_BY_STATE } from '../services/geocoding';

const GMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;

export function LoginPage() {
  const { login, quickDemoLogin } = useApp();
  const navigate = useNavigate();
  const [loginTab, setLoginTab] = useState('citizen');
  const [email, setEmail] = useState('rameshbabu.pinapadu@gmail.com');
  const [password, setPassword] = useState('Citizen@123');
  const [error, setError] = useState('');

  const handleSwitchTab = (tab) => {
    setLoginTab(tab);
    setError('');
    if (tab === 'admin') {
      setEmail(SINGLE_ADMIN_EMAIL);
      setPassword('Admin@123');
    } else {
      setEmail('rameshbabu.pinapadu@gmail.com');
      setPassword('Citizen@123');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError('Please enter both your @gmail.com email ID and password.');
      return;
    }
    if (!GMAIL_REGEX.test(cleanEmail)) {
      setError('Email ID must be in the format xxxxxx@gmail.com.');
      return;
    }
    if (loginTab === 'admin' && cleanEmail !== SINGLE_ADMIN_EMAIL) {
      setError(`There is only one authorized Administrator account (${SINGLE_ADMIN_EMAIL}).`);
      return;
    }

    const res = login(cleanEmail, password);
    if (!res.success) {
      setError(res.error);
      return;
    }
    navigate(res.user.role === 'authority' ? '/authority/dashboard' : '/citizen/dashboard');
  };

  const handleDemo = (role) => {
    const user = quickDemoLogin(role);
    if (user) {
      navigate(role === 'authority' ? '/authority/dashboard' : '/citizen/dashboard');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-lg overflow-hidden">
        <div className="village-canopy-bg p-6 text-white text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mx-auto">
            <Leaf className="w-6 h-6 text-emerald-300" />
          </div>
          <h1 className="text-xl font-extrabold">Sign In to CleanVillage</h1>
          <p className="text-xs text-emerald-100">
            Use your registered <code>xxxxxx@gmail.com</code> Email ID &amp; Password
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Role Selector Tabs: Citizen vs Single Admin */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100">
            <button
              type="button"
              onClick={() => handleSwitchTab('citizen')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                loginTab === 'citizen'
                  ? 'bg-forest-800 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Citizen Login
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTab('admin')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                loginTab === 'admin'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Sole Admin Login
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {loginTab === 'admin' ? 'Sole Admin Gmail ID (@gmail.com) *' : 'Citizen Gmail ID (@gmail.com) *'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="xxxxxx@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {loginTab === 'admin'
                  ? `Only 1 Admin exists in the system: ${SINGLE_ADMIN_EMAIL}`
                  : 'Must be a valid @gmail.com address (e.g., xxxxxx@gmail.com)'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-forest-800 hover:bg-forest-900 text-white shadow-sm transition"
            >
              {loginTab === 'admin' ? 'Sign In as Sole Administrator' : 'Sign In as Citizen'}
            </button>
          </form>

          {/* Documented One-Click Demo Accounts for Evaluation */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
            <p className="text-xs font-bold text-forest-900">Demo Credentials for Evaluation:</p>
            <div className="text-[11px] text-slate-700 space-y-1">
              <div>
                <strong>Citizen:</strong> <code>rameshbabu.pinapadu@gmail.com</code> / <code>Citizen@123</code>
              </div>
              <div>
                <strong>Only 1 Admin:</strong> <code>cleanvillage.admin@gmail.com</code> / <code>Admin@123</code>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleDemo('citizen')}
                className="py-1.5 px-2.5 rounded-xl text-xs font-bold bg-forest-800 text-white"
              >
                Quick Citizen Demo
              </button>
              <button
                type="button"
                onClick={() => handleDemo('authority')}
                className="py-1.5 px-2.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950"
              >
                Quick Sole Admin
              </button>
            </div>
          </div>

          <p className="text-xs text-center text-slate-600">
            New to CleanVillage?{' '}
            <Link to="/register" className="font-bold text-forest-800 hover:underline">
              Sign Up as a Citizen (@gmail.com)
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { registerCitizen } = useApp();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    stateName: '',
    districtName: '',
    cityOrVillage: '',
    householdArea: '',
    consent: false,
  });
  const [error, setError] = useState('');

  const availableDistricts =
    formData.stateName && DISTRICTS_BY_STATE[formData.stateName]
      ? DISTRICTS_BY_STATE[formData.stateName]
      : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = (formData.email || '').trim().toLowerCase();

    if (formData.fullName.trim().length < 3) {
      setError('Please enter your full name (at least 3 characters).');
      return;
    }
    if (!GMAIL_REGEX.test(cleanEmail)) {
      setError('Email ID must be in the format xxxxxx@gmail.com (only @gmail.com addresses are accepted).');
      return;
    }
    if (cleanEmail === SINGLE_ADMIN_EMAIL) {
      setError('There is only one Admin account in CleanVillage. Please register with your personal @gmail.com ID.');
      return;
    }
    if (!/^\d{10}$/.test(formData.mobile.trim())) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!formData.stateName || !formData.cityOrVillage.trim()) {
      setError('Please select your State/UT and enter your Village, Town, or City.');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setError('You must create a password of at least 6 characters.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Created password and confirm password do not match.');
      return;
    }
    if (!formData.consent) {
      setError('Please accept the Privacy Policy consent to register.');
      return;
    }

    const res = registerCitizen(formData);
    if (!res.success) {
      setError(res.error);
      return;
    }
    navigate('/citizen/dashboard');
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-lg overflow-hidden">
        <div className="village-canopy-bg p-6 text-white space-y-1.5">
          <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-extrabold">
            Citizen Sign Up • India-Wide Community Platform
          </span>
          <h1 className="text-xl font-extrabold">Create Citizen Account (@gmail.com)</h1>
          <p className="text-xs text-emerald-100">
            Provide your <code>xxxxxx@gmail.com</code> email ID, select your State and Village/City in India, and create a password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g., Subba Rao K."
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number (10 digits) *</label>
              <input
                type="tel"
                required
                placeholder="9848012345"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Citizen Gmail ID (Must be xxxxxx@gmail.com) *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="xxxxxx@gmail.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">State / Union Territory *</label>
              <select
                required
                value={formData.stateName}
                onChange={(e) => setFormData({ ...formData, stateName: e.target.value, districtName: '' })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              >
                <option value="">Select State / UT</option>
                {INDIA_STATES_AND_UTS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">District</label>
              <input
                type="text"
                list="reg-district-list"
                placeholder="Select or enter district"
                value={formData.districtName}
                onChange={(e) => setFormData({ ...formData, districtName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <datalist id="reg-district-list">
                {availableDistricts.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">City, Town, or Village *</label>
              <input
                type="text"
                required
                placeholder="e.g., Guntur, Hyderabad, Bengaluru, Pune"
                value={formData.cityOrVillage}
                onChange={(e) => setFormData({ ...formData, cityOrVillage: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Locality / Street / Ward *</label>
              <input
                type="text"
                required
                placeholder="Street name, ward, or house area"
                value={formData.householdArea}
                onChange={(e) => setFormData({ ...formData, householdArea: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-forest-900">
              <KeyRound className="w-4 h-4 text-emerald-700" />
              <span>Create Your Citizen Login Password</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Create Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Created Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter created password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                />
              </div>
            </div>
          </div>

          <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={formData.consent}
              onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
              className="mt-0.5 rounded text-forest-800"
            />
            <span>
              I agree to the{' '}
              <Link to="/privacy" className="text-forest-800 font-bold underline">
                Privacy Policy
              </Link>{' '}
              and consent to sharing my sanitation reports.
            </span>
          </label>

          <button
            type="submit"
            className="w-full py-3 rounded-xl text-xs font-bold bg-forest-800 hover:bg-forest-900 text-white shadow-sm transition"
          >
            Complete Citizen Sign Up &amp; Login
          </button>

          <p className="text-xs text-center text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-forest-800 hover:underline">
              Sign In Here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
