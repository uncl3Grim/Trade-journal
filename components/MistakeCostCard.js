'use client';

import { useMemo } from 'react';
import { formatMoney } from '../lib/format';
import { mistakeCosts } from '../lib/coach';

const moneyAbs = (v) => formatMoney(Math.abs(v)).replace(/^[+-]/, '');

export default function MistakeCostCard({ trades }) {
  const rows = useMemo(() => mistakeCosts(trades), [trades]);
  const maxCost = Math.max(1, ...rows.map((r) => r.cost));
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const top = rows.find((r) => r.cost > 0);

  return (
    <div className="bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-5 mb-4">
      <h3 className="font-semibold text-neutral-100 mb-1 text-sm">What your mistakes cost</h3>
      <p className="text-xs text-neutral-500 mb-3">
        Money lost on trades you marked with a mistake, plus trades logged as moved stop, oversized, impulse, FOMO or revenge.
      </p>

      {rows.length === 0 ? (
        <p className="text-xs text-neutral-500 leading-relaxed">
          Nothing tagged yet. When you log a trade, pick what went wrong under “What went wrong?” and this card will show which habit costs you the most.
        </p>
      ) : (
        <>
          {top && (
            <div className="mb-4 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100 leading-relaxed">
              Your costliest habit is <b>{top.label.toLowerCase()}</b>: {moneyAbs(top.cost)} lost across {top.losses} losing trade{top.losses !== 1 ? 's' : ''}.
              {totalCost > 0 && ` All tagged mistakes together cost ${moneyAbs(totalCost)}.`}
            </div>
          )}
          {rows.map((r) => (
            <div key={r.key} className="flex items-center gap-3 py-1.5">
              <div className="w-32 text-xs text-neutral-400 flex-shrink-0 truncate">
                {r.label} <span className="text-neutral-600">{r.count}</span>
              </div>
              <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-rose-400" style={{ width: `${Math.min(100, (r.cost / maxCost) * 100)}%` }} />
              </div>
              <div className="w-20 text-right text-xs font-medium text-rose-400 tabular-nums">{r.cost > 0 ? `-${moneyAbs(r.cost)}` : '$0.00'}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
