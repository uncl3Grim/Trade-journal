'use client';

import ThemeToggle from './ThemeToggle';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { JournalGlyph, TradesGlyph, BrokerGlyph, ProfileGlyph } from './AnimeIcons';
import Logo from './Logo';

const NAV_ITEMS = [
  { key: 'journal', label: 'Journal', icon: JournalGlyph, path: '/journal' },
  { key: 'trades', label: 'Trades', icon: TradesGlyph, path: '/trades' },
  { key: 'broker', label: 'Broker', icon: BrokerGlyph, path: '/broker' },
  { key: 'profile', label: 'Profile', icon: ProfileGlyph, path: '/profile' },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tj_sidebar_collapsed');
      if (saved) setCollapsed(saved === 'true');
    } catch {}
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('tj_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  }

  return (
    <div
      className={`hidden md:flex flex-col bg-gray-950 min-h-screen py-6 items-center gap-2 flex-shrink-0 transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-20'
      }`}
    >
      <div className="mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
          E
        </div>
      </div>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname?.startsWith(item.path);
        return (
          <button
            key={item.key}
            onClick={() => router.push(item.path)}
            title={item.label}
            className={`group flex flex-col items-center gap-1 py-3 rounded-xl transition-all duration-200 ${
              collapsed ? 'w-12' : 'w-16'
            } ${isActive ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-500 hover:text-indigo-300 hover:bg-white/5'}`}
          >
            <Icon
              size={20}
              className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-125 group-hover:-translate-y-0.5'}`}
            />
            {!collapsed && <span className="text-[9px] font-medium">{item.label}</span>}
          </button>
        );
      })}

<ThemeToggle compact />
      <button
        onClick={toggle}
        className="mt-auto w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-500 hover:text-gray-300 flex items-center justify-center transition-colors"
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        <span className={`inline-block transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}>◀</span>
      </button>
    </div>
  );
}
