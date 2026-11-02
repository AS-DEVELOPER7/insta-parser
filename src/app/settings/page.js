'use client';

import { useState } from 'react';
import MainLayoutTemplate from '@/components/templates/MainLayoutTemplate';
import { useTheme, THEMES } from '@/components/providers/ThemeProvider';
import { createClient } from '@/lib/supabase/client';
import {
  KeyRound,
  Palette,
  Check,
  Loader2,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Moon,
  Sun,
  Laptop,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const supabase = createClient();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Handle Password Update
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordSuccess('');
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      setPasswordSaving(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      setPasswordSaving(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordSuccess('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const getThemeIcon = (id) => {
    if (id === 'light') return <Sun size={22} className="text-amber-500" />;
    if (id === 'dark') return <Moon size={22} className="text-blue-400" />;
    return <Laptop size={22} className="text-purple-400" />;
  };

  return (
    <MainLayoutTemplate userProfile={null}>
      <div className="py-8 px-4 sm:px-6 md:px-10 max-w-4xl mx-auto">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            <Sparkles size={28} className="text-ig-primary" />
            Settings
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your password security and customize app theme preferences.
          </p>
        </div>

        <div className="space-y-8">
          {/* ── 1. Theme & Appearance Card (3 Options: Light, Dark, System) ── */}
          <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#222] rounded-3xl p-6 md:p-8 shadow-xl transition-colors duration-200">
            <div className="flex items-center gap-3 pb-6 border-b border-gray-200 dark:border-[#222] mb-6">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Palette size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Theme & Appearance</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Choose between Light, Dark, or System mode</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {THEMES.map((t) => {
                const isActive = theme === t.id;

                return (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`relative flex flex-col items-center justify-center p-6 rounded-2xl border text-center transition-all group overflow-hidden ${
                      isActive
                        ? 'border-ig-primary bg-ig-primary text-white shadow-lg ring-2 ring-ig-primary/40'
                        : 'border-gray-200 dark:border-[#262626] bg-slate-50 dark:bg-[#161616] hover:bg-gray-100 dark:hover:bg-[#1f1f1f] hover:border-gray-300 dark:hover:border-[#3a3a3a]'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${isActive ? 'bg-white/20' : 'bg-gray-200 dark:bg-[#1f1f1f]'}`}>
                      {getThemeIcon(t.id)}
                    </div>

                    <span className={`font-bold text-base mb-1 ${isActive ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{t.name}</span>
                    <span className={`text-xs ${isActive ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'}`}>{t.description}</span>

                    {isActive && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white text-ig-primary flex items-center justify-center text-xs shadow-md">
                        <Check size={14} className="stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 2. Security & Password Card ── */}
          <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#222] rounded-3xl p-6 md:p-8 shadow-xl transition-colors duration-200">
            <div className="flex items-center gap-3 pb-6 border-b border-gray-200 dark:border-[#222] mb-6">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <KeyRound size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Change Password</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Update your account security password</p>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              {passwordSuccess && (
                <div className="flex items-center gap-2 p-3.5 bg-green-500/10 border border-green-500/30 rounded-2xl text-xs text-green-400 font-medium">
                  <ShieldCheck size={16} />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="flex items-center gap-2 p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-400 font-medium">
                  <AlertCircle size={16} />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] focus:border-ig-primary rounded-2xl pl-4 pr-11 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-colors"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] focus:border-ig-primary rounded-2xl pl-4 pr-11 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-colors"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold text-sm rounded-2xl transition-all shadow-md disabled:opacity-50"
                >
                  {passwordSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </MainLayoutTemplate>
  );
}
