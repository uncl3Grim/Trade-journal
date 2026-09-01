'use client';

import { computeSessionBreakdown } from '../lib/sessionStats';

export default function SessionStatsCard({ trades }) {
  const rows = computeSessionBreakdown(trades);
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.pnl)));

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-4">
      <h3 className="font-semibold text-gray-900 mb-1 text-sm">Session Performance</h3>
      <p className="text-xs text-gray-400 mb-3">
        Which trading session you tend to enter in — computed automatically from entry time, no tagging needed.
      </p>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400">No closed trades yet to break down by session.</p>
      ) : (
        rows.map((r) => {
          const pct = Math.min(100, (Math.abs(r.pnl) / maxAbs) * 100);
          const isPos = r.pnl >= 0;
          return (
            <div key={r.label} className="flex items-center gap-3 py-1.5">
              <div className="w-32 text-xs text-gray-500 flex-shrink-0">
                {r.label} <span className="text-gray-300">{r.count}</span>
              </div>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${isPos ? 'bg-green-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="w-24 text-right text-xs">
                <span className={`font-medium ${isPos ? 'text-green-600' : 'text-red-500'}`}>
                  {isPos ? '+' : ''}{r.pnl.toFixed(2)}
                </span>
                <span className="text-gray-400"> · {r.winRate.toFixed(0)}%</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
