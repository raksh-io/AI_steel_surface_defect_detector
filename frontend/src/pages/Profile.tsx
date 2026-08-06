import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth';
import { dashboardService } from '../services/dashboard';
import {
  User as UserIcon,
  Mail,
  Shield,
  Calendar,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Target,
  TrendingUp,
  FileImage,
  Video,
  Edit3,
  X,
} from 'lucide-react';

export default function Profile() {
  const { user, updateUser } = useAuth();

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch dashboard stats for profile activity summary
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getStats(),
  });

  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const handleStartEdit = () => {
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
    setIsEditing(true);
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      setSaveError('Name is required');
      return;
    }
    if (!editEmail.trim()) {
      setSaveError('Email is required');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await authService.updateProfile({
        name: editName.trim(),
        email: editEmail.trim(),
      });
      updateUser(updated);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to update profile';
      setSaveError(detail);
    } finally {
      setIsSaving(false);
    }
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <UserIcon className="w-6 h-6 text-industrial-500" />
          User Profile
        </h1>
        <p className="text-slate-500 mt-1">
          Manage your inspector profile details and view activity summary.
        </p>
      </div>

      {/* Success Banner */}
      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="w-5 h-5" />
          <p className="text-sm font-medium">Profile updated successfully!</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Profile Card — spans 2 cols */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Profile Header Banner */}
          <div className="h-32 bg-gradient-to-br from-industrial-600 via-industrial-500 to-blue-600 relative">
            <div className="absolute -bottom-10 left-8">
              <div className="w-20 h-20 rounded-2xl bg-white shadow-lg border-4 border-white flex items-center justify-center text-2xl font-black text-industrial-600">
                {userInitials}
              </div>
            </div>
            {/* Edit Button */}
            {!isEditing && (
              <button
                onClick={handleStartEdit}
                className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-lg backdrop-blur-sm transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit Profile
              </button>
            )}
          </div>

          <div className="pt-14 px-8 pb-8">
            {/* Error */}
            {saveError && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {saveError}
              </div>
            )}

            {isEditing ? (
              /* Edit Mode */
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-industrial-500/30 focus:border-industrial-500 transition-colors"
                      placeholder="Enter your name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-industrial-500/30 focus:border-industrial-500 transition-colors"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-industrial-600 hover:bg-industrial-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors"
                  >
                    <span className="flex items-center gap-1.5"><X className="w-4 h-4" /> Cancel</span>
                  </button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{user?.name || 'Inspector'}</h2>
                  <p className="text-sm text-slate-500">{user?.email || '—'}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="p-2 bg-white rounded-md shadow-sm border border-slate-200">
                      <Mail className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Email</p>
                      <p className="text-sm font-semibold text-slate-900 truncate max-w-[200px]">{user?.email || '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="p-2 bg-white rounded-md shadow-sm border border-slate-200">
                      <Shield className="w-4 h-4 text-industrial-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Role</p>
                      <p className="text-sm font-semibold text-slate-900 capitalize">{user?.role || 'inspector'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="p-2 bg-white rounded-md shadow-sm border border-slate-200">
                      <Calendar className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Member Since</p>
                      <p className="text-sm font-semibold text-slate-900">{memberSince}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="p-2 bg-white rounded-md shadow-sm border border-slate-200">
                      <Activity className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Account Status</p>
                      <p className="text-sm font-semibold text-green-700">
                        {user?.is_active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Activity Summary Sidebar */}
        <div className="space-y-6">
          {/* Inspection Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-5">Activity Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Activity className="w-4 h-4 text-slate-700" />
                  </div>
                  <span className="text-sm text-slate-600">Total Inspections</span>
                </div>
                <span className="text-lg font-black text-slate-900">
                  {stats?.total_inspections ?? '—'}
                </span>
              </div>

              <div className="w-full h-px bg-slate-100" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <span className="text-sm text-slate-600">Defects Found</span>
                </div>
                <span className="text-lg font-black text-slate-900">
                  {stats?.total_defects ?? '—'}
                </span>
              </div>

              <div className="w-full h-px bg-slate-100" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Target className="w-4 h-4 text-orange-600" />
                  </div>
                  <span className="text-sm text-slate-600">Defect Rate</span>
                </div>
                <span className="text-lg font-black text-slate-900">
                  {stats ? `${(stats.defect_rate * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Inspection Sources */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-5">Inspection Sources</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <div className="p-2 bg-white rounded-md shadow-sm border border-blue-200">
                  <FileImage className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-blue-500 font-medium">Image Upload</p>
                  <p className="text-sm font-bold text-slate-900">Manual file upload inspections</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-violet-50/50 rounded-lg border border-violet-100">
                <div className="p-2 bg-white rounded-md shadow-sm border border-violet-200">
                  <Video className="w-4 h-4 text-violet-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-violet-500 font-medium">Live Camera</p>
                  <p className="text-sm font-bold text-slate-900">Real-time webcam detection</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
