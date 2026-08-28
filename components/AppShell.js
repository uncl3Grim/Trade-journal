'use client';

import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

export default function AppShell({ children }) {
  return (
    <div className="flex bg-[#f7f7fb] min-h-screen">
      <Sidebar />
      <div className="flex-1 pb-20 md:pb-6">{children}</div>
      <MobileNav />
    </div>
  );
}
