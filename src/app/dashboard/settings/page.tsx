'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Lock,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

interface Message {
  type: 'success' | 'error';
  text: string;
}

function SectionCard({
  title,
  icon: Icon,
  iconColor,
  children,
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className={`rounded-xl p-2 ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 pr-11 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function StatusBanner({ msg }: { msg: Message | null }) {
  if (!msg) return null;
  return (
    <div
      className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
        msg.type === 'success'
          ? 'bg-green-50 border border-green-200 text-green-700'
          : 'bg-red-50 border border-red-200 text-red-700'
      }`}
    >
      {msg.type === 'success' ? (
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
      )}
      {msg.text}
    </div>
  );
}

export default function SettingsPage() {
  // Current username
  const [currentUsername, setCurrentUsername] = useState('');
  const [loadingUsername, setLoadingUsername] = useState(true);

  // Change username form
  const [newUsername, setNewUsername] = useState('');
  const [userCurrentPwd, setUserCurrentPwd] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState<Message | null>(null);

  // Change password form
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<Message | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        setCurrentUsername(data.username ?? '');
      } catch {
        setCurrentUsername('admin');
      } finally {
        setLoadingUsername(false);
      }
    }
    fetchSettings();
  }, []);

  const handleUsernameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      setUsernameMsg({ type: 'error', text: 'New username cannot be empty.' });
      return;
    }
    setSavingUsername(true);
    setUsernameMsg(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: userCurrentPwd, newUsername: newUsername.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update username.');
      setCurrentUsername(newUsername.trim());
      setNewUsername('');
      setUserCurrentPwd('');
      setUsernameMsg({ type: 'success', text: 'Username updated successfully.' });
    } catch (err: unknown) {
      setUsernameMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update username.' });
    } finally {
      setSavingUsername(false);
      setTimeout(() => setUsernameMsg(null), 5000);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdNew) {
      setPasswordMsg({ type: 'error', text: 'New password cannot be empty.' });
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (pwdNew.length < 4) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 4 characters.' });
      return;
    }
    setSavingPassword(true);
    setPasswordMsg(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwdCurrent, newPassword: pwdNew }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password.');
      setPwdCurrent('');
      setPwdNew('');
      setPwdConfirm('');
      setPasswordMsg({ type: 'success', text: 'Password updated successfully.' });
    } catch (err: unknown) {
      setPasswordMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update password.' });
    } finally {
      setSavingPassword(false);
      setTimeout(() => setPasswordMsg(null), 5000);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your admin credentials</p>
      </div>

      {/* Current account info */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-full p-3">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-green-200 text-xs uppercase tracking-wide">Logged in as</p>
            {loadingUsername ? (
              <div className="h-5 w-24 bg-white/20 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-lg font-bold">{currentUsername}</p>
            )}
          </div>
        </div>
      </div>

      {/* Change Username */}
      <SectionCard title="Change Username" icon={User} iconColor="bg-blue-50 text-blue-600">
        <form onSubmit={handleUsernameChange} className="space-y-4">
          <StatusBanner msg={usernameMsg} />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Username</label>
            <input
              type="text"
              value={loadingUsername ? '' : currentUsername}
              readOnly
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-500 bg-slate-50 cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="new-username" className="block text-sm font-medium text-slate-700 mb-1.5">
              New Username
            </label>
            <input
              id="new-username"
              type="text"
              autoComplete="username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Enter new username"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            />
          </div>

          <PasswordInput
            id="user-current-password"
            label="Current Password (to confirm)"
            value={userCurrentPwd}
            onChange={setUserCurrentPwd}
            placeholder="Enter your current password"
            autoComplete="current-password"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingUsername}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl transition text-sm shadow-sm"
            >
              {savingUsername ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Username
            </button>
          </div>
        </form>
      </SectionCard>

      {/* Change Password */}
      <SectionCard title="Change Password" icon={Lock} iconColor="bg-green-50 text-green-600">
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <StatusBanner msg={passwordMsg} />

          <PasswordInput
            id="current-password"
            label="Current Password"
            value={pwdCurrent}
            onChange={setPwdCurrent}
            placeholder="Enter your current password"
            autoComplete="current-password"
          />

          <PasswordInput
            id="new-password"
            label="New Password"
            value={pwdNew}
            onChange={setPwdNew}
            placeholder="At least 4 characters"
            autoComplete="new-password"
          />

          <PasswordInput
            id="confirm-password"
            label="Confirm New Password"
            value={pwdConfirm}
            onChange={setPwdConfirm}
            placeholder="Repeat new password"
            autoComplete="new-password"
          />

          {/* Password strength hint */}
          {pwdNew && (
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    pwdNew.length >= level * 3
                      ? pwdNew.length >= 12
                        ? 'bg-green-500'
                        : pwdNew.length >= 8
                        ? 'bg-amber-400'
                        : 'bg-red-400'
                      : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-xl transition text-sm shadow-sm"
            >
              {savingPassword ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Update Password
            </button>
          </div>
        </form>
      </SectionCard>

      {/* Danger zone hint */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs text-slate-500 text-center">
          Changes to your credentials take effect immediately. You may need to log in again after changing your password.
        </p>
      </div>
    </div>
  );
}
