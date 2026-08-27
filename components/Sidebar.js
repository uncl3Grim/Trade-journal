'use client';

import { useRouter, usePathname } from 'next/navigation';
import { LayoutGrid, BarChart3, NotebookPen, List, Link2, User } from 'lucide-react';

const NAV_ITEMS = [
  { key: 'journal', label: 'Journal', icon: LayoutGrid, path: '/journal' },
  { key: 'trades', label: 'Trades', icon: List, path: '/trades' },
  { key: 'broker', label: 'Broker', icon: Link2, path: '/broker' },
  { key: 'profile', label: 'Profile', icon: User, path: '/profile' },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="hidden md:flex flex-col w-20 bg-gray-950 min-h-screen py-6 items-center gap-2 flex-shrink-0">
      <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm mb-6">
        TJ
      </div>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname?.startsWith(item.path);
        return (
          <button
            key={item.key}
            onClick={() => router.push(item.path)}
            className={`group flex flex-col items-center gap-1 w-16 py-3 rounded-xl transition-all duration-200 ${
              isActive ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-500 hover:text-indigo-300 hover:bg-white/5'
            }`}
          >
            <Icon
              size={20}
              className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-125 group-hover:-translate-y-0.5'}`}
            />
            <span className="text-[9px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
