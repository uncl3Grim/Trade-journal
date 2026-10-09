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
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/40 backdrop-blur-xl flex items-center justify-around py-2 z-40 border-t border-neutral-800/60 overflow-x-auto">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname?.startsWith(item.path);
        return (
          <button
            key={item.key}
            onClick={() => router.push(item.path)}
            className={`relative flex flex-col items-center gap-0.5 px-2.5 py-1 flex-shrink-0 transition-all duration-200 ${
              isActive ? 'text-neutral-100' : 'text-neutral-500'
            }`}
          >
            {isActive && <span className="absolute -top-2 w-1 h-1 rounded-full bg-white/70 animate-scale-in" />}
            <Icon
              size={20}
              className={`transition-transform duration-200 ${isActive ? 'scale-110 -translate-y-0.5' : ''}`}
            />
            <span className="text-[9px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
