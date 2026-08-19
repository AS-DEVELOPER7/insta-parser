'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  MessageCircle,
  Users,
  Images,
  History,
  Sliders,
  UploadCloud,
  User,
  Settings,
  LogOut,
  Instagram,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { APP_CONFIG } from '@/constants/config';

export default function Sidebar({ userProfile }) {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();
  const [hovered, setHovered] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { label: 'Messages',        href: '/direct',       icon: MessageCircle },
    { label: 'Connections',     href: '/connections',  icon: Users },
    { label: 'Media Vault',     href: '/media',        icon: Images },
    { label: 'Logged Activity', href: '/activity-log', icon: History },
    { label: 'Preferences',     href: '/preferences',  icon: Sliders },
    { label: 'Profile',         href: '/profile',       icon: User },
    { label: 'Settings',        href: '/settings',      icon: Settings },
    { label: 'Upload Archive',  href: '/upload',       icon: UploadCloud, highlight: true },
  ];

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: hovered ? 240 : 72 }}
      className="hidden md:flex flex-col fixed left-0 top-0 h-screen border-r border-gray-200 dark:border-[#262626] bg-white dark:bg-black z-40 transition-[width] duration-200 ease-in-out overflow-hidden"
    >
      {/* Brand */}
      <Link
        href="/"
        className={`flex items-center px-4 py-5 mb-2 flex-shrink-0 overflow-hidden transition-all duration-200 ${
          hovered ? 'gap-3 justify-start' : 'justify-center'
        }`}
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center text-white flex-shrink-0">
          <Instagram size={20} />
        </div>
        <span
          className={`font-bold text-lg tracking-tight text-gray-900 dark:text-white font-sans whitespace-nowrap overflow-hidden transition-all duration-200 ${
            hovered ? 'max-w-[160px] opacity-100' : 'max-w-0 opacity-0'
          }`}
        >
          {APP_CONFIG.NAME}
        </span>
      </Link>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-0.5 px-2 overflow-hidden">
        {navItems.map((item) => {
          const Icon     = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={!hovered ? item.label : undefined}
              className={`flex items-center py-3 rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden ${
                hovered ? 'gap-4 px-3 justify-start' : 'justify-center px-0'
              } ${
                isActive
                  ? 'bg-gray-100 dark:bg-[#1a1a1a] text-gray-900 dark:text-white font-semibold'
                  : item.highlight
                  ? 'text-ig-primary hover:bg-gray-100 dark:hover:bg-[#181818] font-semibold'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#181818] hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon
                size={22}
                className={`flex-shrink-0 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`}
              />
              <span
                className={`whitespace-nowrap overflow-hidden transition-all duration-200 ${
                  hovered ? 'max-w-[160px] opacity-100' : 'max-w-0 opacity-0'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 py-3 border-t border-gray-200 dark:border-[#262626] flex-shrink-0">
        <button
          onClick={handleLogout}
          title={!hovered ? 'Log out' : undefined}
          className={`w-full flex items-center py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all duration-200 overflow-hidden ${
            hovered ? 'gap-4 px-3 justify-start' : 'justify-center px-0'
          }`}
        >
          <LogOut size={22} className="flex-shrink-0" />
          <span
            className={`whitespace-nowrap overflow-hidden transition-all duration-200 ${
              hovered ? 'max-w-[160px] opacity-100' : 'max-w-0 opacity-0'
            }`}
          >
            Log out
          </span>
        </button>
      </div>
    </aside>
  );
}
