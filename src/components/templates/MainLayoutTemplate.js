import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';

export default function MainLayoutTemplate({ userProfile, hideMobileNav = false, children }) {
  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Desktop Sidebar — fixed, hover-expands over content */}
      <Sidebar userProfile={userProfile} />

      {/* Main content — offset by sidebar on desktop (72px) & bottom nav on mobile */}
      <main className={`flex-1 md:ml-[72px] ${hideMobileNav ? 'pb-0 h-screen overflow-hidden' : 'pb-20 md:pb-0'} min-h-screen min-w-0`}>
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {!hideMobileNav && <BottomNav userProfile={userProfile} />}
    </div>
  );
}
