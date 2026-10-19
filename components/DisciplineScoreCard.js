'use client';

import { useMemo } from 'react';
import { disciplineScore } from '../lib/coach';

export default function DisciplineScoreCard({ trades }) {
  const { overall, parts } = useMemo(() => disciplineScore(trades), [trades]);
  const color = overall === null ? '#737373' : overall >= 80 ? '#34d399' : overall >= 55 ? '#fbbf24' : '#fb7185';

  return (
    <div className="bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-5 mb-4">
      <h3 className="font-semibold text-neutral-100 mb-1 text-sm">Discipline Score</h3>
      <p className="text-xs text-neutral-500 mb-4">
        How well you followed your own process. It ignores whether the trades won, because a good process can still lose and a bad one can get lucky.
      </p>

      <div className="flex items-center gap-4 mb-4">
        <div className="text-3xl font-bold tabular-nums" style={{ color }}>
          {overall === null ? '—' : overall.toFixed(0)}
        </div>
        <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${overall === null ? 0 : overall}%`, backgroundColor: color }} />
        </div>
      </div>

      <div className="space-y-4">
        {parts.map((p) => (
          <div key={p.key}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-neutral-300">{p.label}</span>
              <span className="text-neutral-400 tabular-nums">{p.value === null ? 'Not tracked yet' : `${p.value.toFixed(0)}%`}</span>
            </div>
            <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${p.value === null ? '' : p.value >= 80 ? 'bg-emerald-400' : p.value >= 55 ? 'bg-amber-400' : 'bg-rose-400'}`}
                style={{ width: `${p.value === null ? 0 : p.value}%` }}
              />
            </div>
            <div className="text-[10px] text-neutral-600 mt-1">{p.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
