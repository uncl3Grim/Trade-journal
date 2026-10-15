'use client';

import { PrimaryButton } from '../profile/ui';
import { ImageGlyph } from './DayIcons';

// Every screenshot attached to any of the day's trades, in one grid.
// items: [{ url, caption, sub, pnl }]
export default function GalleryTab({ items, onOpen, onGoTrades }) {
  if (items.length === 0) {
    return (
      <div className="pf-card rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-10 text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-500/15 border border-indigo-400/20 text-indigo-300 flex items-center justify-center mb-4">
          <ImageGlyph size={22} />
        </div>
        <p className="text-neutral-100 font-medium">No screenshots yet</p>
        <p className="text-sm text-neutral-500 mt-1 mb-5">Attach up to 3 per trade from the Trades tab. They all show up here.</p>
        <PrimaryButton onClick={onGoTrades}>Go to trades</PrimaryButton>
      </div>
    );
  }

  return (
    <div className="pf-stagger">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((it, i) => (
          <button
            key={it.url}
            type="button"
            onClick={() => onOpen(items, i)}
            className="pf-tile group relative block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] text-left"
            aria-label={`View ${it.caption}`}
          >
            <img src={it.url} alt={it.caption} className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pt-8 pb-2.5">
              <span className="block text-xs font-medium text-neutral-50 truncate capitalize">{it.caption}</span>
              <span className={`block text-[11px] tabular-nums ${it.pnl > 0 ? 'text-emerald-300' : it.pnl < 0 ? 'text-rose-300' : 'text-neutral-300'}`}>{it.sub}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
