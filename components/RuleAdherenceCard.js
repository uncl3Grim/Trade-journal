'use client';

import { computeRuleAdherenceBreakdown } from '../lib/ruleAdherence';

const LABELS = {
  followed_plan: 'Followed plan',
  impulse_entry: 'Impulse entry',
  moved_stop: 'Moved stop',
  oversized: 'Oversized',
  other: 'Other deviation',
};

export default function RuleAdherenceCard({ trades }) {
  const rows = computeRuleAdherenceBreakdown(trades);
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.pnl)));

  return (
    <div className="bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-5 mb-4">
      <h3 className="font-semibold text-neutral-100 mb-1 text-sm">Rule Adherence</h3>
      <p className="text-xs text-neutral-500 mb-3">
        How much of your result came from following your plan vs. deviating from it.
      </p>
      {rows.length === 0 ? (
        <p className="text-xs text-neutral-500">Tag trades with rule adherence to see this breakdown.</p>
      ) : (
        rows.map((r) => {
          const pct = Math.min(100, (Math.abs(r.pnl) / maxAbs) * 100);
          const isPos = r.pnl >= 0;
          return (
            <div key={r.label} className="flex items-center gap-3 py-1.5">
              <div className="w-32 text-xs text-neutral-500 flex-shrink-0">
                {LABELS[r.label] || r.label} <span className="text-neutral-600">{r.count}</span>
              </div>
              <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${isPos ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ width: `${pct}%` }} />
              </div>
              <div className={`w-16 text-right text-xs font-medium ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPos ? '+' : ''}{r.pnl.toFixed(2)}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
