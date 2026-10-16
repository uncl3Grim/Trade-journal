'use client';

import { addDays, format } from 'date-fns';
import { formatMoney } from '../../lib/format';
import {
  ArrowLeftGlyph,
  CandlesGlyph,
  ChevronLeftGlyph,
  ChevronRightGlyph,
  SparkleGlyph,
  TargetGlyph,
  TrendDownGlyph,
  TrendUpGlyph,
} from './DayIcons';

const GLOWS = {
  up: ['#10b981', '#6366f1'],
  down: ['#f43f5e', '#8b5cf6'],
  idle: ['#6366f1', '#8b5cf6'],
};

function IconBtn({ onClick, label, children, className = '' }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex items-center justify-center h-8 min-w-[2rem] rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300 ${className}`}
    >
      {children}
    </button>
  );
}

function Chip({ icon: Icon, tone = 'text-neutral-300', children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] tabular-nums ${tone}`}>
      <Icon size={13} />
      {children}
    </span>
  );
}

export default function DayHero({ date, stats, onPrev, onNext, onRecap, onBack }) {
  const tone = stats.count === 0 ? 'idle' : stats.net >= 0 ? 'up' : 'down';
  const [g1, g2] = GLOWS[tone];
  const rUp = stats.totalR !== null && stats.totalR >= 0;

  return (
    <div className="pf-hero relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl px-3.5 py-3 mb-4">
      <div className="pf-glow absolute -top-16 -left-10 w-40 h-40 rounded-full blur-3xl opacity-30" style={{ background: g1 }} />
      <div className="pf-glow pf-glow-b absolute -bottom-20 right-0 w-40 h-40 rounded-full blur-3xl opacity-25" style={{ background: g2 }} />

      <div className="relative flex items-center gap-2.5">
        <IconBtn onClick={onBack} label="Back to journal">
          <ArrowLeftGlyph size={16} />
        </IconBtn>

        <div className="min-w-0 flex-1 flex items-baseline gap-2">
          <h1 className="text-base sm:text-lg font-semibold text-neutral-50 leading-tight">{format(date, 'EEEE')}</h1>
          <span className="text-xs text-neutral-400 truncate">{format(date, 'MMM d, yyyy')}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <IconBtn onClick={onPrev} label={`Previous day (${format(addDays(date, -1), 'MMM d')})`}>
            <ChevronLeftGlyph size={16} />
          </IconBtn>
          <IconBtn onClick={onNext} label={`Next day (${format(addDays(date, 1), 'MMM d')})`}>
            <ChevronRightGlyph size={16} />
          </IconBtn>
          <IconBtn onClick={onRecap} label="Daily recap" className="gap-1.5 px-2.5 !border-indigo-400/30 !bg-indigo-500/15 text-indigo-200">
            <SparkleGlyph size={15} />
            <span className="hidden sm:inline text-xs">Recap</span>
          </IconBtn>
        </div>
      </div>

      <div className="relative mt-2.5 flex items-center gap-1.5 flex-wrap">
        <Chip icon={CandlesGlyph}>
          {stats.count} trade{stats.count !== 1 ? 's' : ''}
        </Chip>
        {stats.winRate !== null && <Chip icon={TargetGlyph}>{stats.winRate}%</Chip>}
        {stats.totalR !== null && (
          <Chip icon={rUp ? TrendUpGlyph : TrendDownGlyph} tone={rUp ? 'text-emerald-300' : 'text-rose-300'}>
            {rUp ? '+' : ''}
            {stats.totalR.toFixed(2)}R
          </Chip>
        )}
        {stats.count > 0 && (
          <span className={`ml-auto text-lg font-semibold tabular-nums ${stats.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatMoney(stats.net)}
          </span>
        )}
      </div>
    </div>
  );
}
