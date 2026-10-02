'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  Leaf,
  LayoutDashboard,
  Droplets,
  Users,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Crown,
  ShieldCheck,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/entry', label: 'Milk Entry', icon: Droplets },
  { href: '/dashboard/farmers', label: 'Farmers', icon: Users },
  { href: '/dashboard/records', label: 'Records', icon: FileText },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const username = session?.user?.username || 'admin';
  const role = session?.user?.role || 'admin';
  const isUpper = role === 'upper_admin' || username.toLowerCase() === 'bibek';

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-white border-r border-slate-200 shadow-sm fixed left-0 top-0 z-30">
      {/* Branding */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-600 shadow-sm flex-shrink-0">
          <Leaf className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 leading-tight truncate">
            Lawanyabati Krishi
          </p>
          <p className="text-xs text-slate-500 leading-tight">Farm Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                    active
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`w-4.5 h-4.5 flex-shrink-0 transition-colors ${
                      active
                        ? 'text-white'
                        : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                    size={18}
                  />
                  <span>{label}</span>
                  {active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User profile & Sign Out */}
      <div className="px-3 py-3 border-t border-slate-100">
        <div className="px-3 py-2.5 mb-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm bg-green-50 text-green-700">
            <Users className="w-4 h-4 text-green-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800 truncate leading-tight capitalize">
              {username}
            </p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-150 group"
        >
          <LogOut
            className="w-[18px] h-[18px] flex-shrink-0 text-slate-400 group-hover:text-red-500 transition-colors"
            size={18}
          />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
