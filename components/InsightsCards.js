'use client';

import { computeInsights } from '../lib/insights';

function fmt(v, mode) {
  const suffix = mode === 'r' ? 'R' : '';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}${suffix}`;
}

export default function InsightsCards({ trades, mode, defaultRiskAmount }) {
  const { strength, leak, ifSkipped } = computeInsights(trades, mode, defaultRiskAmount);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-5">
        <div className="text-xs text-neutral-500 mb-1">YOUR STRENGTH</div>
        <div className="text-2xl font-bold text-emerald-400 mb-1">{strength ? fmt(strength.value, mode) : '—'}</div>
        <div className="text-xs text-neutral-500">{strength ? strength.label : 'Not enough data yet'}</div>
      </div>
      <div className="bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-5">
        <div className="text-xs text-neutral-500 mb-1">YOUR BIGGEST LEAK</div>
        <div className="text-2xl font-bold text-rose-400 mb-1">{leak ? fmt(leak.value, mode) : '—'}</div>
        <div className="text-xs text-neutral-500">{leak ? leak.label : 'Not enough data yet'}</div>
      </div>
      <div className="bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-5">
        <div className="text-xs text-neutral-500 mb-1">IF YOU SKIPPED IT</div>
        <div className="text-2xl font-bold text-indigo-400 mb-1">{ifSkipped ? fmt(ifSkipped.value, mode) : '—'}</div>
        <div className="text-xs text-neutral-500">{ifSkipped ? ifSkipped.note : 'Not enough data yet'}</div>
      </div>
    </div>
  );
}
