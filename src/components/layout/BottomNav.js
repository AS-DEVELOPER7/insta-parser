'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, Users, Images, User, Settings } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/direct', icon: MessageCircle, label: 'Messages' },
    { href: '/connections', icon: Users, label: 'Connections' },
    { href: '/media', icon: Images, label: 'Media' },
    { href: '/profile', icon: User, label: 'Profile' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-black/95 backdrop-blur-md border-t border-gray-200 dark:border-[#1f1f1f] flex items-center justify-around z-50 px-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href === '/profile' && pathname.startsWith('/profile'));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl transition-all ${
              isActive ? 'text-ig-primary font-bold' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Icon size={22} className={isActive ? 'stroke-[2.5] text-ig-primary' : 'stroke-[1.75]'} />
            <span className="text-[10px] mt-1 font-medium leading-none tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
