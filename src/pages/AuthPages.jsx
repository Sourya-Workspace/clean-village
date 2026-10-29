import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Leaf,
  Shield,
  UserCheck,
  Lock,
  Mail,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Database,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { INDIA_STATES_AND_UTS, DISTRICTS_BY_STATE } from '../services/geocoding';

const GMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;

export function LoginPage() {
  const { login, quickDemoLogin, requestPasswordReset, isSupabaseConfigured } = useApp();
  const navigate = useNavigate();
  const [loginTab, setLoginTab] = useState('citizen');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSwitchTab = (tab) => {
    setLoginTab(tab);
    setError('');
    setResetMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError('Please enter both your @gmail.com email ID and password.');
      return;
    }
    if (!GMAIL_REGEX.test(cleanEmail)) {
      setError('Email ID must be in the format xxxxxx@gmail.com.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await login(cleanEmail, password, loginTab);
      if (!res.success) {
        setError(res.error);
        return;
      }
      navigate(res.user.role === 'authority' ? '/authority/dashboard' : '/citizen/dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setResetMessage('');
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !GMAIL_REGEX.test(cleanEmail)) {
      setError('Enter your registered @gmail.com email address above first to request a password reset.');
      return;
    }
    const res = await requestPasswordReset(cleanEmail);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setResetMessage(`Password reset instructions have been sent to ${cleanEmail}.`);
  };

  const handleDemo = (role, demoUserId = null) => {
    const user = quickDemoLogin(role, demoUserId);
    if (user) {
      navigate(user.role === 'authority' ? '/authority/dashboard' : '/citizen/dashboard');
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
            Cross-Device Authentication • Registered <code>xxxxxx@gmail.com</code> &amp; Password
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Backend Connection Status Banner */}
          <div
            className={`p-3 rounded-2xl border text-[11px] flex items-start gap-2 ${
              isSupabaseConfigured
                ? 'bg-emerald-50 border-emerald-200 text-forest-900'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}
          >
            <Database className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
            <div>
              {isSupabaseConfigured ? (
                <span>
                  <strong>Shared Supabase Backend Active:</strong> Sign in from any laptop or mobile device using your registered account.
                </span>
              ) : (
                <span>
                  <strong>Local Demo Mode Active:</strong> Supabase environment variables are not configured in <code>.env</code> yet. Configure <code>.env</code> and run <code>npm run provision:admin</code> to enable live cross-device authentication.
                </span>
              )}
            </div>
          </div>

          {/* Role Selector Tabs: Citizen vs Provisioned Administrator */}
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
              Administrator Login
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {resetMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{resetMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {loginTab === 'admin'
                  ? 'Provisioned Administrator Gmail ID (@gmail.com) *'
                  : 'Citizen Gmail ID (@gmail.com) *'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="yourname@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {loginTab === 'admin'
                  ? 'Enter the private Administrator email provisioned via scripts/provision-admin.mjs'
                  : 'Must be a valid @gmail.com address (e.g., xxxxxx@gmail.com)'}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Password *</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[11px] font-bold text-forest-800 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
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
              disabled={submitting}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-forest-800 hover:bg-forest-900 disabled:opacity-50 text-white shadow-sm transition"
            >
              {submitting
                ? 'Signing In...'
                : loginTab === 'admin'
                ? 'Sign In as Administrator'
                : 'Sign In as Citizen'}
            </button>
          </form>

          {/* Local Demo Mode Account Switcher (Only shown when Supabase is not yet configured) */}
          {!isSupabaseConfigured && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
              <p className="text-xs font-bold text-forest-900">
                Local Demo Mode — Multi-Account Privacy &amp; Workflow Tester:
              </p>
              <p className="text-[11px] text-slate-600">
                Switch between Citizen A, Citizen B, and Demo Admin to verify complaint privacy, notifications, and Green Points before connecting Supabase:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleDemo('citizen', 'user-citizen-1')}
                  className="py-1.5 px-2.5 rounded-xl text-[11px] font-bold bg-forest-800 text-white"
                >
                  Citizen A (Ramesh)
                </button>
                <button
                  type="button"
                  onClick={() => handleDemo('citizen', 'user-citizen-2')}
                  className="py-1.5 px-2.5 rounded-xl text-[11px] font-bold bg-emerald-700 text-white"
                >
                  Citizen B (Lakshmi)
                </button>
                <button
                  type="button"
                  onClick={() => handleDemo('authority', 'user-authority-1')}
                  className="py-1.5 px-2.5 rounded-xl text-[11px] font-bold bg-amber-500 text-slate-950"
                >
                  Demo Admin
                </button>
              </div>
            </div>
          )}

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
  const [submitting, setSubmitting] = useState(false);

  const availableDistricts =
    formData.stateName && DISTRICTS_BY_STATE[formData.stateName]
      ? DISTRICTS_BY_STATE[formData.stateName]
      : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = (formData.email || '').trim().toLowerCase();

    if (formData.fullName.trim().length < 3) {
      setError('Please enter your full name (at least 3 characters).');
      return;
    }
    if (!GMAIL_REGEX.test(cleanEmail)) {
      setError(
        'Email ID must be in the format xxxxxx@gmail.com (only @gmail.com addresses are accepted).'
      );
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

    setSubmitting(true);
    try {
      const res = await registerCitizen(formData);
      if (!res.success) {
        setError(res.error);
        return;
      }
      navigate('/citizen/dashboard');
    } finally {
      setSubmitting(false);
    }
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
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Number (10 digits) *
              </label>
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
              <label className="block text-xs font-bold text-slate-700 mb-1">
                State / Union Territory *
              </label>
              <select
                required
                value={formData.stateName}
                onChange={(e) =>
                  setFormData({ ...formData, stateName: e.target.value, districtName: '' })
                }
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
              <label className="block text-xs font-bold text-slate-700 mb-1">
                City, Town, or Village *
              </label>
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
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Locality / Street / Ward *
              </label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Create Password *
                </label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm Created Password *
                </label>
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
              and consent to sharing my sanitation reports with authorized sanitation officials.
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl text-xs font-bold bg-forest-800 hover:bg-forest-900 disabled:opacity-50 text-white shadow-sm transition"
          >
            {submitting ? 'Creating Citizen Account...' : 'Complete Citizen Sign Up & Login'}
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
