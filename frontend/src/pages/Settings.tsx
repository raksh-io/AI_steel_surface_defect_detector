import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Lock,
  Eye,
  EyeOff,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Bell,
  Monitor,
  Cpu,
  Gauge,
  LogOut,
  Info,
} from 'lucide-react';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ── Password Change State ──
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // ── App Preferences (client-side) ──
  const [confidenceThreshold, setConfidenceThreshold] = useState(() => {
    return Number(localStorage.getItem('confidence_threshold') || '70');
  });
  const [autoRefreshDashboard, setAutoRefreshDashboard] = useState(() => {
    return localStorage.getItem('auto_refresh') !== 'false';
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('notifications') !== 'false';
  });
  const [pageSize, setPageSize] = useState(() => {
    return Number(localStorage.getItem('page_size') || '20');
  });

  const [prefsSuccess, setPrefsSuccess] = useState(false);

  // ── Password Change Handler ──
  const handleChangePassword = async () => {
    setPwError(null);

    if (!currentPassword) {
      setPwError('Current password is required');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match');
      return;
    }

    setPwLoading(true);
    try {
      await authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwSuccess(false), 4000);
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to change password';
      setPwError(detail);
    } finally {
      setPwLoading(false);
    }
  };

  // ── Save Preferences ──
  const handleSavePreferences = () => {
    localStorage.setItem('confidence_threshold', confidenceThreshold.toString());
    localStorage.setItem('auto_refresh', autoRefreshDashboard.toString());
    localStorage.setItem('notifications', notificationsEnabled.toString());
    localStorage.setItem('page_size', pageSize.toString());
    setPrefsSuccess(true);
    setTimeout(() => setPrefsSuccess(false), 3000);
  };

  // ── Logout Handler ──
  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Password strength indicator
  const getPasswordStrength = (pw: string) => {
    if (pw.length === 0) return { label: '', color: 'bg-slate-200', width: '0%' };
    let score = 0;
    if (pw.length >= 8) score += 1;
    if (pw.length >= 12) score += 1;
    if (/[A-Z]/.test(pw)) score += 1;
    if (/[0-9]/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;

    if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: '20%' };
    if (score <= 2) return { label: 'Fair', color: 'bg-orange-500', width: '40%' };
    if (score <= 3) return { label: 'Good', color: 'bg-amber-500', width: '60%' };
    if (score <= 4) return { label: 'Strong', color: 'bg-green-500', width: '80%' };
    return { label: 'Excellent', color: 'bg-emerald-500', width: '100%' };
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-industrial-500" />
          Platform Settings
        </h1>
        <p className="text-slate-500 mt-1">
          Configure security, appearance, and inspection preferences.
        </p>
      </div>

      {/* ═══════════ Security Section ═══════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center gap-2">
          <Shield className="w-5 h-5 text-industrial-500" />
          <h2 className="text-base font-bold text-slate-900">Security</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Password Change */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Change Password
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Update your password to keep your account secure.
            </p>

            {/* Success */}
            {pwSuccess && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg flex items-center gap-2 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <CheckCircle2 className="w-4 h-4" />
                Password changed successfully!
              </div>
            )}

            {/* Error */}
            {pwError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {pwError}
              </div>
            )}

            <div className="space-y-4 max-w-md">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-industrial-500/30 focus:border-industrial-500 transition-colors"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-industrial-500/30 focus:border-industrial-500 transition-colors"
                    placeholder="Enter new password (min 8 characters)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Strength Meter */}
                {newPassword.length > 0 && (
                  <div className="mt-2">
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                        style={{ width: strength.width }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Strength: <span className="font-semibold">{strength.label}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pr-10 pl-4 py-2.5 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-industrial-500/30 transition-colors ${
                      confirmPassword && confirmPassword !== newPassword
                        ? 'border-red-300 focus:border-red-400'
                        : 'border-slate-200 focus:border-industrial-500'
                    }`}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>

              <button
                onClick={handleChangePassword}
                disabled={pwLoading || !currentPassword || !newPassword || !confirmPassword}
                className="px-5 py-2.5 bg-industrial-600 hover:bg-industrial-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {pwLoading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* ═══════════ Inspection Preferences ═══════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center gap-2">
          <Gauge className="w-5 h-5 text-industrial-500" />
          <h2 className="text-base font-bold text-slate-900">Inspection Preferences</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Success */}
          {prefsSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg flex items-center gap-2 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <CheckCircle2 className="w-4 h-4" />
              Preferences saved successfully!
            </div>
          )}

          {/* Confidence Threshold */}
          <div className="flex items-start justify-between gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-900">Confidence Display Threshold</p>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Only highlight detections above this confidence level in the UI.
              </p>
              <div className="max-w-xs">
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="10"
                    max="99"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-industrial-600"
                  />
                  <span className="text-sm font-bold text-slate-900 w-12 text-right">
                    {confidenceThreshold}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-slate-100" />

          {/* Auto Refresh */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor className="w-5 h-5 text-slate-500" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Auto-refresh Dashboard</p>
                <p className="text-xs text-slate-400">Automatically refresh stats every 15 seconds</p>
              </div>
            </div>
            <button
              onClick={() => setAutoRefreshDashboard(!autoRefreshDashboard)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                autoRefreshDashboard ? 'bg-industrial-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  autoRefreshDashboard ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="w-full h-px bg-slate-100" />

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-slate-500" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Defect Notifications</p>
                <p className="text-xs text-slate-400">Show alerts when defects are detected during live inspection</p>
              </div>
            </div>
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                notificationsEnabled ? 'bg-industrial-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  notificationsEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="w-full h-px bg-slate-100" />

          {/* Default Page Size */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-slate-500" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Default Page Size</p>
                <p className="text-xs text-slate-400">Number of records to show per page in History</p>
              </div>
            </div>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-industrial-500/30 focus:border-industrial-500 transition-colors"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              onClick={handleSavePreferences}
              className="px-5 py-2.5 bg-industrial-600 hover:bg-industrial-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Preferences
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════ Account Actions ═══════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h2 className="text-base font-bold text-slate-900">Account Actions</h2>
        </div>

        <div className="p-6 space-y-4">
          {/* Sign Out */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">Sign Out</p>
              <p className="text-xs text-slate-400">Log out of your current session</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>

          <div className="w-full h-px bg-slate-100" />

          {/* Account Info */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">Account Information</p>
              <p className="text-xs text-slate-400">
                Signed in as <span className="font-semibold text-slate-600">{user?.email || '—'}</span>
                {' · '}
                Role: <span className="font-semibold text-industrial-600 capitalize">{user?.role || 'inspector'}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 pb-4">
        <p>SteelDefect AI Platform v1.0.0 · Powered by EfficientNet-B0 + Grad-CAM</p>
      </div>
    </div>
  );
}
