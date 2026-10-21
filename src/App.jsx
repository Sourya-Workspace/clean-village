import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Shield, UserCheck, Lock } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import {
  AboutPage,
  HowItWorksPage,
  CommunityImpactPage,
  AwarenessPage,
  PublicSchedulePage,
  PrivacyPolicyPage,
  HelpFaqPage,
  NotFoundPage,
} from './pages/PublicPages';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import {
  CitizenDashboardPage,
  SubmitComplaintPage,
  MyComplaintsPage,
  CitizenComplaintDetailPage,
  GreenRewardsPage,
  LeaderboardPage,
  CleanlinessActivitiesPage,
  CitizenNotificationsPage,
  CitizenProfilePage,
} from './pages/CitizenPages';
import {
  AuthorityDashboardPage,
  ComplaintManagementPage,
  AuthorityComplaintDetailPage,
  CleaningTaskManagementPage,
  WasteCollectionManagementPage,
  CleanlinessMonitoringPage,
  RewardsManagementPage,
  ReportsAnalyticsPage,
  UserManagementPage,
  AuthorityNotificationsPage,
} from './pages/AuthorityPages';

function ProtectedRoute({ children, requiredRole }) {
  const { currentUser, quickDemoLogin } = useApp();

  if (!currentUser) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl border border-emerald-100 p-8 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-forest-800 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Authentication Required</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Please sign in to access this {requiredRole === 'authority' ? 'Village Authority' : 'Citizen'} module, or use a one-click Evaluator Demo Account below:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => quickDemoLogin(requiredRole || 'citizen')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-forest-800 hover:bg-forest-900 text-white"
            >
              {requiredRole === 'authority' ? (
                <>
                  <Shield className="w-4 h-4 text-amber-300" />
                  Continue as Demo Authority
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 text-emerald-300" />
                  Continue as Demo Citizen
                </>
              )}
            </button>
            <Link
              to="/login"
              className="px-4 py-2.5 rounded-xl text-xs font-bold border border-emerald-300 text-forest-900"
            >
              Go to Login Page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (requiredRole && currentUser.role !== requiredRole) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl border border-amber-200 p-8 shadow-sm text-center space-y-4">
          <h2 className="text-xl font-extrabold text-slate-900">Role Permission Notice</h2>
          <p className="text-xs text-slate-600">
            You are currently logged in as <strong>{currentUser.fullName}</strong> ({currentUser.role}). This page requires <strong>{requiredRole}</strong> permissions.
          </p>
          <button
            type="button"
            onClick={() => quickDemoLogin(requiredRole)}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950"
          >
            Switch to Demo {requiredRole === 'authority' ? 'Authority' : 'Citizen'} Account
          </button>
        </div>
      </div>
    );
  }

  return children;
}

function ToastBanner() {
  const { toast } = useApp();
  if (!toast) return null;

  const colors = {
    success: 'bg-forest-900 text-white border-emerald-500',
    error: 'bg-red-900 text-white border-red-400',
    warning: 'bg-amber-500 text-slate-950 border-amber-700',
    info: 'bg-slate-900 text-white border-emerald-400',
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm">
      <div
        className={`px-4 py-3 rounded-2xl border shadow-xl text-xs font-bold flex items-center gap-2.5 ${
          colors[toast.type] || colors.success
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
        <span>{toast.message}</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router>
        <div className="min-h-screen flex flex-col justify-between">
          <Navbar />
          <div className="flex-1">
            <Routes>
              {/* Public Pages (1-9) */}
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/report-problem" element={<SubmitComplaintPage />} />
              <Route path="/community-impact" element={<CommunityImpactPage />} />
              <Route path="/awareness" element={<AwarenessPage />} />
              <Route path="/schedule" element={<PublicSchedulePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Citizen Pages (10-18) */}
              <Route
                path="/citizen/dashboard"
                element={
                  <ProtectedRoute requiredRole="citizen">
                    <CitizenDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/submit-complaint"
                element={
                  <ProtectedRoute requiredRole="citizen">
                    <SubmitComplaintPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/complaints"
                element={
                  <ProtectedRoute requiredRole="citizen">
                    <MyComplaintsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/complaints/:id"
                element={
                  <ProtectedRoute requiredRole="citizen">
                    <CitizenComplaintDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/citizen/rewards" element={<GreenRewardsPage />} />
              <Route path="/citizen/leaderboard" element={<LeaderboardPage />} />
              <Route path="/citizen/activities" element={<CleanlinessActivitiesPage />} />
              <Route
                path="/citizen/notifications"
                element={
                  <ProtectedRoute requiredRole="citizen">
                    <CitizenNotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/profile"
                element={
                  <ProtectedRoute requiredRole="citizen">
                    <CitizenProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* Authority Pages (19-28) */}
              <Route
                path="/authority/dashboard"
                element={
                  <ProtectedRoute requiredRole="authority">
                    <AuthorityDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/authority/complaints"
                element={
                  <ProtectedRoute requiredRole="authority">
                    <ComplaintManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/authority/complaints/:id"
                element={
                  <ProtectedRoute requiredRole="authority">
                    <AuthorityComplaintDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/authority/tasks"
                element={
                  <ProtectedRoute requiredRole="authority">
                    <CleaningTaskManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/authority/schedules"
                element={
                  <ProtectedRoute requiredRole="authority">
                    <WasteCollectionManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/authority/monitoring"
                element={
                  <ProtectedRoute requiredRole="authority">
                    <CleanlinessMonitoringPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/authority/rewards"
                element={
                  <ProtectedRoute requiredRole="authority">
                    <RewardsManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/authority/reports"
                element={
                  <ProtectedRoute requiredRole="authority">
                    <ReportsAnalyticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/authority/users"
                element={
                  <ProtectedRoute requiredRole="authority">
                    <UserManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/authority/notifications"
                element={
                  <ProtectedRoute requiredRole="authority">
                    <AuthorityNotificationsPage />
                  </ProtectedRoute>
                }
              />

              {/* Additional Pages (29-31) */}
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/help" element={<HelpFaqPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
          <Footer />
          <ToastBanner />
        </div>
      </Router>
    </AppProvider>
  );
}
