'use client';

import { forwardRef } from 'react';
import { format } from 'date-fns';
import { formatMoney } from '../lib/format';

function DayCell({ day, isBest, mode }) {
  const hasTrades = day.trades > 0;
  const value = mode === 'r' ? day.r : day.pnl;
  const isWin = hasTrades && value > 0;
  const isLoss = hasTrades && value < 0;

  return (
    <div
      className={`relative rounded-2xl px-3 py-3.5 flex flex-col items-center text-center gap-1.5 border transition-colors ${
        isBest
          ? 'border-emerald-400/50 bg-emerald-400/[0.08] shadow-[0_0_0_1px_rgba(52,211,153,0.15)]'
          : 'border-white/[0.06] bg-white/[0.03]'
      }`}
    >
      <span className={`text-[10px] font-semibold tracking-wider uppercase ${isBest ? 'text-emerald-300/80' : 'text-slate-500'}`}>
        {day.label}
      </span>

      {hasTrades ? (
        <span
          className={`text-[15px] font-bold tabular-nums ${
            isWin ? 'text-emerald-300' : isLoss ? 'text-rose-300' : 'text-slate-300'
          }`}
        >
          {mode === 'r' ? `${value >= 0 ? '+' : ''}${value.toFixed(1)}R` : formatMoney(value)}
        </span>
      ) : (
        <span className="text-[15px] font-bold text-slate-600">—</span>
      )}

      <span className="text-[9px] text-slate-500">{hasTrades ? `${day.trades} trade${day.trades !== 1 ? 's' : ''}` : 'No trades'}</span>

      {isBest && (
        <div className="w-full mt-1 pt-1.5 border-t border-emerald-400/20 flex flex-col gap-0.5">
          <span className="text-[9px] text-emerald-300/70 uppercase tracking-wide">Win rate</span>
          <span className="text-[11px] font-semibold text-emerald-200">{day.winRate}%</span>
        </div>
      )}
    </div>
  );
}

const WeeklyRecapCard = forwardRef(function WeeklyRecapCard({ recap, mode, appName = 'Edgewise' }, ref) {
  const total = mode === 'r' ? recap.totalR : recap.totalPnl;
  const isPositive = total >= 0;
  const suffix = mode === 'r' ? 'R' : '';

  return (
    <div
      ref={ref}
      className="relative w-full max-w-[520px] mx-auto overflow-hidden rounded-[28px] p-7 sm:p-8"
      style={{
        background: 'linear-gradient(155deg, #0a0d1c 0%, #0f1129 45%, #150f28 100%)',
        fontFamily: 'inherit',
      }}
    >
      {/* decorative glow */}
      <div className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-indigo-500/20 blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-28 -left-16 w-72 h-72 rounded-full bg-violet-500/15 blur-[90px]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative">
        {/* header */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-xs">
              {appName.charAt(0)}
            </div>
            <span className="text-white font-semibold text-[15px] tracking-tight">{appName}</span>
          </div>
          <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-200 bg-white/10 border border-white/10 rounded-full px-3 py-1.5 backdrop-blur">
            Weekly recap
          </span>
        </div>

        {/* date + trade count */}
        <div className="text-[11px] font-medium tracking-wide uppercase text-slate-400 mb-2">
          {format(recap.weekStart, 'MMM d')} – {format(recap.weekEnd, 'MMM d, yyyy')} · {recap.totalTrades} trade
          {recap.totalTrades !== 1 ? 's' : ''}
        </div>

        {/* headline number */}
        <div
          className={`text-[42px] sm:text-[48px] font-extrabold tracking-tight mb-3 leading-none ${
            isPositive ? 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-200' : 'text-rose-400'
          }`}
        >
          {isPositive ? '+' : ''}
          {mode === 'r' ? `${total.toFixed(2)}${suffix}` : formatMoney(total)}
        </div>

        {/* badges */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-[11px] font-semibold text-slate-200 bg-white/[0.06] border border-white/10 rounded-full px-3 py-1">
            {recap.winRate}% win rate
          </span>
          <span className="text-[11px] font-semibold text-slate-200 bg-white/[0.06] border border-white/10 rounded-full px-3 py-1 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${recap.avgR >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            {recap.avgR >= 0 ? '+' : ''}
            {recap.avgR.toFixed(2)}R avg
          </span>
        </div>

        {/* day grid */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          {recap.days.map((day) => (
            <DayCell key={day.dateLabel} day={day} mode={mode} isBest={recap.bestDay && recap.bestDay.dateLabel === day.dateLabel} />
          ))}
        </div>

        {/* footer stats */}
        <div className="grid grid-cols-4 gap-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-4 mb-5">
          {[
            { label: 'Trades', value: recap.totalTrades },
            { label: 'Win rate', value: `${recap.winRate}%` },
            { label: 'Avg R', value: `${recap.avgR >= 0 ? '+' : ''}${recap.avgR.toFixed(2)}R` },
            { label: 'Best day', value: recap.bestDay ? recap.bestDay.label : '—' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-1">{stat.label}</div>
              <div className="text-[13px] font-bold text-white">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* watermark */}
        <div className="flex items-center justify-between text-[9px] text-slate-500">
          <span className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Tracked and reviewed in {appName}
          </span>
        </div>
      </div>
    </div>
  );
});

export default WeeklyRecapCard;
