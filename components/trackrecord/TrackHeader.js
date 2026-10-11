'use client';

import { format } from 'date-fns';
import { Reveal } from './ui';

export default function TrackHeader({ name, tr }) {
  const range = tr.firstTime && tr.lastTime ? `${format(tr.firstTime, 'MMM yyyy')} – ${format(tr.lastTime, 'MMM yyyy')}` : '—';
  return (
    <Reveal>
      <header className="relative bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-5 sm:p-6 overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-400 flex items-center justify-center text-white font-bold font-heading flex-shrink-0 shadow-lg shadow-indigo-500/30">
              {(name || 'T').trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="font-heading text-xl sm:text-2xl font-bold text-neutral-50 truncate">{name}</h1>
              <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5 flex-wrap">
                {tr.isLive ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-400">
                    <span className="relative flex h-2 w-2">
                      <span className="tr-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    Live
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-neutral-400">
                    <span className="h-2 w-2 rounded-full bg-neutral-500" />
                    Snapshot
                  </span>
                )}
                <span className="text-neutral-600">·</span>
                <span>{tr.provenance}</span>
              </div>
            </div>
          </div>

          {tr.verified && (
            <span className="tr-shimmer-badge relative overflow-hidden inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path className="tr-draw" pathLength="1" d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              Verified
            </span>
          )}
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl bg-white/[0.03] border border-neutral-800/60 px-3 py-2">
            <div className="text-neutral-500">Period</div>
            <div className="text-neutral-100 font-medium mt-0.5">{range}</div>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-neutral-800/60 px-3 py-2">
            <div className="text-neutral-500">Closed trades</div>
            <div className="text-neutral-100 font-medium mt-0.5">{tr.n.toLocaleString()}</div>
          </div>
        </div>
      </header>
    </Reveal>
  );
}
