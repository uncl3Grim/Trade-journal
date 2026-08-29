'use client';

import { useRouter, usePathname } from 'next/navigation';
import { JournalGlyph, TradesGlyph, BrokerGlyph, ProfileGlyph, PlaybookGlyph } from './AnimeIcons';

const NAV_ITEMS = [
  { key: 'journal', label: 'Journal', icon: JournalGlyph, path: '/journal' },
  { key: 'trades', label: 'Trades', icon: TradesGlyph, path: '/trades' },
  { key: 'strategies', label: 'Strategies', icon: PlaybookGlyph, path: '/strategies' },
  { key: 'broker', label: 'Broker', icon: BrokerGlyph, path: '/broker' },
  { key: 'profile', label: 'Profile', icon: ProfileGlyph, path: '/profile' },
];

export default function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-950 flex items-center justify-around py-2 z-40 border-t border-gray-800 overflow-x-auto">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname?.startsWith(item.path);
        return (
          <button
            key={item.key}
            onClick={() => router.push(item.path)}
            className={`flex flex-col items-center gap-0.5 px-2.5 py-1 flex-shrink-0 transition-all duration-200 ${
              isActive ? 'text-indigo-400' : 'text-gray-500'
            }`}
          >
            <Icon size={20} className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
            <span className="text-[9px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
