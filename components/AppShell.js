'use client';

import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import BackgroundManager from './BackgroundManager';

export default function AppShell({ children }) {
  return (
    <div className="relative flex bg-[#f7f7fb] dark:bg-[#0b0b0f] min-h-screen">
      <BackgroundManager />
      <div className="relative z-10 flex flex-1">
        <Sidebar />
        <div className="flex-1 pb-20 md:pb-6">{children}</div>
      </div>
      <MobileNav />
    </div>
  );
}
