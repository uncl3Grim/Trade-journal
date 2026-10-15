'use client';

import { useEffect } from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import BackgroundManager from './BackgroundManager';

export default function AppShell({ children }) {
  useEffect(() => {
    document.documentElement.classList.add('tj-app');
    return () => document.documentElement.classList.remove('tj-app');
  }, []);

  return (
    <div className="relative flex w-full max-w-full overflow-x-hidden bg-[#0a0a0a] min-h-[100dvh]">
      <BackgroundManager />
      <div className="relative z-10 flex flex-1 min-w-0">
        <Sidebar />
        <div className="flex-1 min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6">{children}</div>
      </div>
      <MobileNav />
    </div>
  );
}
