import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';

export default function MainLayoutTemplate({ userProfile, hideMobileNav = false, children }) {
  return (
    <div className={`min-h-[100dvh] ${hideMobileNav ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : ''} bg-white dark:bg-black text-gray-900 dark:text-white flex transition-colors duration-200`}>
      {/* Desktop Sidebar */}
      <Sidebar userProfile={userProfile} />

      {/* Main content — offset by sidebar on desktop (72px on md, 220px on xl) & bottom nav on mobile */}
      <main className={`flex-1 md:ml-[72px] xl:ml-[220px] ${hideMobileNav ? 'pb-0 h-[100dvh] max-h-[100dvh] overflow-hidden' : 'pb-20 md:pb-0'} min-h-0 min-w-0`}>
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {!hideMobileNav && <BottomNav userProfile={userProfile} />}
    </div>
  );
}

