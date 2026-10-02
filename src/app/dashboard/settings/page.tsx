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
  KeyRound,
  RefreshCw,
} from 'lucide-react';

interface Message {
  type: 'success' | 'error';
  text: string;
}

interface ManagedAdmin {
  id: string;
  username: string;
  role: string;
  name?: string;
  updatedAt?: string;
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
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`rounded-xl p-2 ${iconColor}`}>
            <Icon className="w-4 h-4" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        </div>
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
  // Current user info
  const [currentUsername, setCurrentUsername] = useState('');
  const [isUpperAdmin, setIsUpperAdmin] = useState(false);
  const [managedAdmins, setManagedAdmins] = useState<ManagedAdmin[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);

  // Change self username form
  const [newUsername, setNewUsername] = useState('');
  const [userCurrentPwd, setUserCurrentPwd] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState<Message | null>(null);

  // Change self password form
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<Message | null>(null);

  // Upper Admin: Manage Admin account form
  const [adminTargetUsername, setAdminTargetUsername] = useState('admin');
  const [adminNewUsername, setAdminNewUsername] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [upperAdminAuthPwd, setUpperAdminAuthPwd] = useState('');
  const [savingManagedAdmin, setSavingManagedAdmin] = useState(false);
  const [manageAdminMsg, setManageAdminMsg] = useState<Message | null>(null);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setCurrentUsername(data.username ?? '');
      setIsUpperAdmin(!!data.isUpperAdmin);
      if (data.managedAdmins) {
        setManagedAdmins(data.managedAdmins);
        if (data.managedAdmins.length > 0) {
          setAdminTargetUsername(data.managedAdmins[0].username);
        }
      }
    } catch {
      setCurrentUsername('admin');
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUsernameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      setUsernameMsg({ type: 'error', text: 'New username cannot be empty.' });
      return;
    }
    if (!userCurrentPwd) {
      setUsernameMsg({ type: 'error', text: 'Please enter your current password to confirm.' });
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
      setCurrentUsername(newUsername.trim().toLowerCase());
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
    if (!pwdCurrent) {
      setPasswordMsg({ type: 'error', text: 'Current password is required.' });
      return;
    }
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

  const handleManageAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upperAdminAuthPwd) {
      setManageAdminMsg({ type: 'error', text: 'Please enter your password to authorize this action.' });
      return;
    }
    if (!adminNewUsername && !adminNewPassword) {
      setManageAdminMsg({ type: 'error', text: 'Provide a new username or new password for the account.' });
      return;
    }

    setSavingManagedAdmin(true);
    setManageAdminMsg(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manage_admin',
          targetUsername: adminTargetUsername,
          adminNewUsername: adminNewUsername.trim() || undefined,
          adminNewPassword: adminNewPassword.trim() || undefined,
          upperAdminPassword: upperAdminAuthPwd,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update account.');
      setManageAdminMsg({ type: 'success', text: data.message || 'Account updated successfully.' });
      setAdminNewUsername('');
      setAdminNewPassword('');
      setUpperAdminAuthPwd('');
      fetchSettings();
    } catch (err: unknown) {
      setManageAdminMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update account.' });
    } finally {
      setSavingManagedAdmin(false);
      setTimeout(() => setManageAdminMsg(null), 5000);
    }
  };

  const handleQuickResetAdmin = () => {
    setAdminNewPassword('1234');
    setManageAdminMsg({
      type: 'success',
      text: 'New password set to "1234". Confirm your password below and click "Save Changes" to apply.',
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account credentials</p>
      </div>

      {/* Account Info Banner */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-5 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-full p-3">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-green-200 text-xs uppercase tracking-wide">Logged in as</p>
            {loadingUser ? (
              <div className="h-5 w-24 bg-white/20 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-lg font-bold">{currentUsername}</p>
            )}
          </div>
        </div>
      </div>

      {/* Manage Admin Account (available for bibek) */}
      {isUpperAdmin && (
        <SectionCard
          title="Manage Admin Account"
          icon={KeyRound}
          iconColor="bg-amber-50 text-amber-600"
        >
          <div className="space-y-5">
            <p className="text-sm text-slate-600">
              Update credentials or reset password for the <span className="font-semibold text-slate-900">admin</span> account.
            </p>

            {/* List of managed accounts */}
            {managedAdmins.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="space-y-2">
                  {managedAdmins.map((admin) => (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-50 text-green-700 flex items-center justify-center font-bold text-sm">
                          {admin.username[0]?.toUpperCase() || 'A'}
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                          {admin.username}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form to update or reset Admin credentials */}
            <form onSubmit={handleManageAdminSubmit} className="space-y-4 pt-2 border-t border-slate-100">
              <StatusBanner msg={manageAdminMsg} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Target Account
                  </label>
                  <input
                    type="text"
                    value={adminTargetUsername}
                    onChange={(e) => setAdminTargetUsername(e.target.value)}
                    placeholder="e.g. admin"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Change Username (optional)
                  </label>
                  <input
                    type="text"
                    value={adminNewUsername}
                    onChange={(e) => setAdminNewUsername(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Set New Password (optional)
                  </label>
                  <button
                    type="button"
                    onClick={handleQuickResetAdmin}
                    className="text-xs font-semibold text-green-700 hover:text-green-800 flex items-center gap-1 underline"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset to "1234"
                  </button>
                </div>
                <input
                  type="text"
                  value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
                  placeholder="Enter new password (min 4 characters)"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <PasswordInput
                  id="auth-pwd-confirm"
                  label="Confirm your password to authorize changes"
                  value={upperAdminAuthPwd}
                  onChange={setUpperAdminAuthPwd}
                  placeholder="Enter your current password"
                  autoComplete="current-password"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingManagedAdmin}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-xl transition text-sm shadow-sm"
                >
                  {savingManagedAdmin ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <KeyRound className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </SectionCard>
      )}

      {/* Change My Username */}
      <SectionCard title="Change Username" icon={User} iconColor="bg-blue-50 text-blue-600">
        <form onSubmit={handleUsernameChange} className="space-y-4">
          <StatusBanner msg={usernameMsg} />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Current Username
            </label>
            <input
              type="text"
              value={loadingUser ? '' : currentUsername}
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

      {/* Change My Password */}
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

          {/* Password strength indicator */}
          {pwdNew && (
            <div className="flex gap-1.5 pt-1">
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

      {/* Note */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs text-slate-500 text-center">
          Changes to your credentials take effect immediately. You may need to log in again after changing your password.
        </p>
      </div>
    </div>
  );
}
