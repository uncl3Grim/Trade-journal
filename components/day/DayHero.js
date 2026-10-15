'use client';

import { addDays, format } from 'date-fns';
import { formatMoney } from '../../lib/format';
import { GhostButton, PrimaryButton } from '../profile/ui';
import { ChevronLeftGlyph, ChevronRightGlyph } from './DayIcons';

const GLOWS = {
  up: ['#10b981', '#6366f1'],
  down: ['#f43f5e', '#8b5cf6'],
  idle: ['#6366f1', '#8b5cf6'],
};

export default function DayHero({ date, stats, onPrev, onNext, onRecap, onBack }) {
  const tone = stats.count === 0 ? 'idle' : stats.net >= 0 ? 'up' : 'down';
  const [g1, g2] = GLOWS[tone];

  return (
    <div className="pf-hero relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8 mb-6">
      <div className="pf-glow absolute -top-24 -left-16 w-72 h-72 rounded-full blur-3xl opacity-40" style={{ background: g1 }} />
      <div className="pf-glow pf-glow-b absolute -bottom-28 right-0 w-72 h-72 rounded-full blur-3xl opacity-30" style={{ background: g2 }} />

      <div className="relative">
        <div className="flex items-center justify-between gap-3 mb-5">
          <button onClick={onBack} className="text-xs text-neutral-400 hover:text-neutral-100">
            ← Journal
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrev}
              aria-label="Previous day"
              className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 pl-2 pr-3 py-1.5 text-xs text-neutral-300"
            >
              <ChevronLeftGlyph size={14} />
              {format(addDays(date, -1), 'MMM d')}
            </button>
            <button
              onClick={onNext}
              aria-label="Next day"
              className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 pl-3 pr-2 py-1.5 text-xs text-neutral-300"
            >
              {format(addDays(date, 1), 'MMM d')}
              <ChevronRightGlyph size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-50">{format(date, 'EEEE')}</h1>
            <div className="text-sm text-neutral-400 mt-0.5">{format(date, 'MMMM d, yyyy')}</div>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="pf-pill">
                {stats.count} trade{stats.count !== 1 ? 's' : ''}
              </span>
              {stats.winRate !== null && <span className="pf-pill">{stats.winRate}% win rate</span>}
              {stats.totalR !== null && (
                <span className="pf-pill">
                  {stats.totalR >= 0 ? '+' : ''}
                  {stats.totalR.toFixed(2)}R
                </span>
              )}
            </div>
          </div>

          {stats.count > 0 && (
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-neutral-500">Day P&L</div>
              <div className={`text-3xl sm:text-4xl font-semibold tabular-nums ${stats.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatMoney(stats.net)}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-6">
          <PrimaryButton onClick={onRecap}>Daily recap</PrimaryButton>
          <GhostButton onClick={onBack}>Back to calendar</GhostButton>
        </div>
      </div>
    </div>
  );
}
