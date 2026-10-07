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
      className={`rounded-lg px-2.5 py-3 flex flex-col items-center text-center gap-1 border transition-all duration-200 ${
        isBest
          ? 'border-neutral-700 bg-neutral-900/80'
          : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 hover:bg-neutral-900/80'
      } ${hasTrades ? 'hover:-translate-y-0.5' : ''}`}
    >
      <span className="text-[9px] font-medium uppercase tracking-wide text-neutral-500">{day.label}</span>

      {hasTrades ? (
        <span className={`text-[13px] font-semibold tabular-nums ${isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-neutral-300'}`}>
          {mode === 'r' ? `${value >= 0 ? '+' : ''}${value.toFixed(1)}R` : formatMoney(value)}
        </span>
      ) : (
        <span className="text-[13px] font-semibold text-neutral-700">—</span>
      )}

      <span className="text-[8px] text-neutral-600">{hasTrades ? `${day.trades} trade${day.trades !== 1 ? 's' : ''}` : 'No trades'}</span>

      {isBest && (
        <div className="w-full mt-0.5 pt-1 border-t border-neutral-800">
          <span className="text-[8px] text-neutral-500 uppercase tracking-wide">{day.winRate}% win</span>
        </div>
      )}
    </div>
  );
}

const WeeklyRecapCard = forwardRef(function WeeklyRecapCard(
  { recap, mode, appName = 'Edgewise', backgroundUrl, backgroundDim = 0.6 },
  ref
) {
  const total = mode === 'r' ? recap.totalR : recap.totalPnl;
  const isPositive = total >= 0;
  const suffix = mode === 'r' ? 'R' : '';

  return (
    <div
      ref={ref}
      className="relative w-full max-w-[540px] mx-auto overflow-hidden rounded-2xl border border-neutral-800 p-6 sm:p-7"
      style={
        backgroundUrl
          ? { backgroundImage: `url(${backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', fontFamily: 'inherit' }
          : { backgroundColor: '#0a0a0a', fontFamily: 'inherit' }
      }
    >
      {backgroundUrl && (
        <div className="pointer-events-none absolute inset-0" style={{ backgroundColor: `rgba(10,10,10,${backgroundDim})` }} />
      )}

      <div className="relative">
        {/* header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-200 font-bold text-[10px]">
              {appName.charAt(0)}
            </div>
            <span className="text-neutral-100 font-medium text-sm tracking-tight">{appName}</span>
          </div>
          <span className="text-[10px] font-medium tracking-wide uppercase text-neutral-400 bg-neutral-900 border border-neutral-800 rounded-md px-2.5 py-1">
            Weekly recap
          </span>
        </div>

        {/* date + trade count */}
        <div className="text-[11px] text-neutral-500 mb-1.5">
          {format(recap.weekStart, 'MMM d')} – {format(recap.weekEnd, 'MMM d, yyyy')} · {recap.totalTrades} trade
          {recap.totalTrades !== 1 ? 's' : ''}
        </div>

        {/* headline number */}
        <div className={`text-4xl sm:text-5xl font-bold tracking-tight mb-4 leading-none ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isPositive ? '+' : ''}
          {mode === 'r' ? `${total.toFixed(2)}${suffix}` : formatMoney(total)}
        </div>

        {/* day grid */}
        <div className="grid grid-cols-5 gap-2 mb-5">
          {recap.days.map((day) => (
            <DayCell key={day.dateLabel} day={day} mode={mode} isBest={recap.bestDay && recap.bestDay.dateLabel === day.dateLabel} />
          ))}
        </div>

        {/* footer stat row */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { label: 'Trades', value: recap.totalTrades },
            { label: 'Win rate', value: `${recap.winRate}%` },
            { label: 'Avg R', value: `${recap.avgR >= 0 ? '+' : ''}${recap.avgR.toFixed(2)}R` },
            { label: 'Best day', value: recap.bestDay ? recap.bestDay.label : '—' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="border border-neutral-800 bg-neutral-900/60 rounded-lg p-3 text-center transition-all duration-200 hover:border-neutral-700 hover:-translate-y-0.5"
            >
              <div className="text-[9px] uppercase tracking-wide text-neutral-500 mb-1">{stat.label}</div>
              <div className="text-[13px] font-semibold text-neutral-100">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* watermark */}
        <div className="flex items-center gap-1.5 text-[9px] text-neutral-600">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Tracked and reviewed in {appName}
        </div>
      </div>
    </div>
  );
});

export default WeeklyRecapCard;
