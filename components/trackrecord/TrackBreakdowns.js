'use client';

import { useEffect, useState } from 'react';
import { GlassCard } from './ui';
import { fmtNum, fmtMoneyShort } from '../../lib/trackRecord';

function Row({ r, maxAbs, grown, i }) {
  const pos = r.pnl >= 0;
  return (
    <div className="grid grid-cols-[minmax(84px,1.1fr)_2fr_auto] sm:grid-cols-[minmax(110px,1.1fr)_2.2fr_56px_56px_80px] items-center gap-3 py-2 border-b border-neutral-800/40 last:border-0">
      <div className="min-w-0">
        <div className="text-sm text-neutral-100 truncate">{r.label}</div>
        <div className="text-[10px] text-neutral-500">{r.count} trades</div>
      </div>
      <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${pos ? 'bg-gradient-to-r from-emerald-500 to-emerald-300' : 'bg-gradient-to-r from-rose-500 to-rose-300'}`}
          style={{
            width: grown ? `${Math.max(2, (Math.abs(r.pnl) / maxAbs) * 100)}%` : '0%',
            transition: `width 800ms cubic-bezier(0.2,0.8,0.2,1) ${i * 60}ms`,
          }}
        />
      </div>
      <div className="hidden sm:block text-right text-xs text-neutral-400 tabular-nums">{r.winRate.toFixed(0)}%<div className="text-[9px] text-neutral-600">win</div></div>
      <div className="hidden sm:block text-right text-xs text-neutral-400 tabular-nums">{fmtNum(r.profitFactor, 2)}<div className="text-[9px] text-neutral-600">PF</div></div>
      <div className={`text-right text-sm font-medium tabular-nums ${pos ? 'text-emerald-400' : 'text-rose-400'}`}>
        {pos ? '+' : ''}{fmtMoneyShort(r.pnl)}
      </div>
    </div>
  );
}

export default function TrackBreakdowns({ tr }) {
  const tabs = tr.breakdowns.filter((b) => b.rows.length > 0);
  const [idx, setIdx] = useState(0);
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    setGrown(false);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true)));
    return () => cancelAnimationFrame(id);
  }, [idx]);

  if (!tabs.length) return null;
  const tab = tabs[Math.min(idx, tabs.length - 1)];
  const maxAbs = Math.max(1, ...tab.rows.map((r) => Math.abs(r.pnl)));

  return (
    <GlassCard title="Breakdowns" subtitle="Where the profit and the losses came from">
      <div role="tablist" className="relative flex rounded-xl bg-neutral-900/70 border border-neutral-800/60 p-1 mb-3 overflow-hidden">
        <div
          className="absolute top-1 bottom-1 rounded-lg bg-indigo-500/25 border border-indigo-400/30 shadow-[0_0_20px_-4px_rgba(99,102,241,0.6)]"
          style={{
            width: `calc((100% - 0.5rem) / ${tabs.length})`,
            transform: `translateX(${idx * 100}%)`,
            transition: 'transform 350ms cubic-bezier(0.34,1.56,0.64,1)',
          }}
        />
        {tabs.map((t, i) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={i === idx}
            onClick={() => setIdx(i)}
            className={`relative z-10 flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-lg ${i === idx ? 'text-indigo-100' : 'text-neutral-400 hover:text-neutral-200'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div key={tab.key} className="animate-fade-in-up">
        {tab.rows.map((r, i) => (
          <Row key={r.label} r={r} maxAbs={maxAbs} grown={grown} i={i} />
        ))}
      </div>
    </GlassCard>
  );
}
