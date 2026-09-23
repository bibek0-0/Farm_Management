'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Droplets, Users, FileText, BarChart3 } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/entry', label: 'Entry', icon: Droplets },
  { href: '/dashboard/farmers', label: 'Farmers', icon: Users },
  { href: '/dashboard/records', label: 'Records', icon: FileText },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="flex md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-lg safe-area-inset-bottom">
      <div className="flex w-full">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center flex-1 min-h-[56px] gap-1 px-1 py-2 transition-colors duration-150 ${
                active ? 'text-green-600' : 'text-slate-500 hover:text-slate-700'
              }`}
              style={{ minHeight: '56px' }}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 ${
                  active ? 'bg-green-50' : ''
                }`}
              >
                <Icon
                  size={20}
                  className={`transition-colors ${
                    active ? 'text-green-600' : 'text-slate-500'
                  }`}
                />
              </div>
              <span
                className={`text-[10px] font-medium leading-tight ${
                  active ? 'text-green-600' : 'text-slate-500'
                }`}
              >
                {label}
              </span>
              {active && (
                <span className="absolute bottom-0 w-8 h-0.5 rounded-t-full bg-green-600" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
