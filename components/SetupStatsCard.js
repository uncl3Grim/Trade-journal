'use client';

import { computeSetupBreakdown } from '../lib/setupStats';

export default function SetupStatsCard({ trades }) {
  const rows = computeSetupBreakdown(trades);
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.pnl)));

  return (
    <div className="bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-5 mb-4">
      <h3 className="font-semibold text-neutral-100 mb-1 text-sm">Setup Performance</h3>
      <p className="text-xs text-neutral-500 mb-3">Which setups actually carry your edge vs. which are just habit.</p>
      {rows.length === 0 ? (
        <p className="text-xs text-neutral-500">Tag trades with a setup type to see this breakdown.</p>
      ) : (
        rows.map((r) => {
          const pct = Math.min(100, (Math.abs(r.pnl) / maxAbs) * 100);
          const isPos = r.pnl >= 0;
          return (
            <div key={r.label} className="flex items-center gap-3 py-1.5">
              <div className="w-28 text-xs text-neutral-500 flex-shrink-0 capitalize">
                {r.label} <span className="text-neutral-600">{r.count}</span>
              </div>
              <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${isPos ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="w-24 text-right text-xs">
                <span className={`font-medium ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPos ? '+' : ''}{r.pnl.toFixed(2)}
                </span>
                <span className="text-neutral-500"> · {r.winRate.toFixed(0)}%</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
