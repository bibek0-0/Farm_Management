'use client';

import { SessionProvider } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PenLine,
  Users,
  FileText,
  BarChart3,
  Settings,
  Leaf,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/entry', label: 'Milk Entry', icon: PenLine },
  { href: '/dashboard/farmers', label: 'Farmers', icon: Users },
  { href: '/dashboard/records', label: 'Records & Slips', icon: FileText },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

function NavLink({
  href,
  label,
  icon: Icon,
  exact,
  mobile = false,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  mobile?: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  if (mobile) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all group ${
          isActive
            ? 'bg-green-600 text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200'
        }`}
      >
        <span
          className={`flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0 transition-colors ${
            isActive
              ? 'bg-white/20 text-white'
              : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
          }`}
        >
          <Icon className="w-4 h-4" />
        </span>
        <span className="flex-1 font-bold">{label}</span>
        {!isActive && (
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 flex-shrink-0" />
        )}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all group ${
        isActive
          ? 'bg-green-600 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
      {label}
    </Link>
  );
}

function DesktopSidebar() {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
        <div className="bg-green-600 rounded-xl p-2">
          <Leaf className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 leading-tight">Lawanyabati</p>
          <p className="text-xs text-slate-500">Krishi Farm</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navLinks.map((link) => (
          <NavLink key={link.href} {...link} />
        ))}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-slate-100">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all w-full group"
        >
          <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-500 flex-shrink-0" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
        style={{ visibility: open ? 'visible' : 'hidden' }}
      />

      {/* Drawer panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 lg:hidden w-72 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', visibility: open ? 'visible' : 'hidden' }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-green-600 rounded-xl p-2">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">Lawanyabati</p>
              <p className="text-xs text-slate-500">Krishi Farm</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navLinks.map((link) => (
            <NavLink key={link.href} {...link} mobile onClick={onClose} />
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 active:bg-red-200 transition-all"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-red-100 flex-shrink-0">
              <LogOut className="w-4 h-4 text-red-600" />
            </span>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}

function CurrentPageTitle() {
  const pathname = usePathname();
  const active = navLinks.find((l) =>
    l.exact ? pathname === l.href : pathname.startsWith(l.href)
  );
  return (
    <span className="text-sm font-bold text-slate-900 truncate">
      {active?.label ?? 'Dashboard'}
    </span>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-30 no-print">
        <DesktopSidebar />
      </aside>

      {/* Mobile drawer */}
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Main content */}
      <div className="flex-1 lg:pl-60 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header
          className="lg:hidden flex items-center justify-between px-3 bg-white border-b border-slate-200 sticky top-0 z-20 no-print"
          style={{
            height: '56px',
            paddingTop: 'env(safe-area-inset-top, 0px)',
          }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 active:bg-slate-200 text-slate-600 transition"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="bg-green-600 rounded-lg p-1.5">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <CurrentPageTitle />
          </div>

          {/* Spacer to centre the title */}
          <div className="w-10" />
        </header>

        <main
          id="dashboard-main"
          className="flex-1 px-2.5 sm:px-4 py-3 sm:py-6 lg:px-8 pb-6 min-w-0"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </SessionProvider>
  );
}
