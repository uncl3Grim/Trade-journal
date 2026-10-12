'use client';

import { forwardRef } from 'react';
import { Bricolage_Grotesque } from 'next/font/google';
import { format } from 'date-fns';
import { formatMoney } from '../lib/format';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });

// Every tile has exactly the same structure (label, value, trade count and a
// footer line that is only visible on the best day), so all tiles come out
// the same size whether or not they have trades.
function DayCell({ day, isBest, mode, hasBg }) {
  const hasTrades = day.trades > 0;
  const value = mode === 'r' ? day.r : day.pnl;
  const isWin = hasTrades && value > 0;
  const isLoss = hasTrades && value < 0;

  // With a wallpaper the tiles are more see-through so the image reads across the whole card.
  const surface = hasBg
    ? isBest
      ? 'border-neutral-600 bg-black/55'
      : 'border-neutral-700/70 bg-black/35 hover:border-neutral-600 hover:bg-black/50'
    : isBest
    ? 'border-neutral-700 bg-neutral-900/80'
    : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 hover:bg-neutral-900/80';

  return (
    <div
      className={`rounded-lg px-2.5 py-3 flex flex-col items-center text-center gap-1 border transition-all duration-200 min-w-0 ${surface} ${
        hasTrades ? 'hover:-translate-y-0.5' : ''
      }`}
    >
      <span className={`text-[9px] font-medium uppercase tracking-wide ${day.isWeekend ? 'text-indigo-300/80' : 'text-neutral-500'}`}>
        {day.label}
      </span>

      {hasTrades ? (
        <span className={`text-[13px] font-semibold tabular-nums ${isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-neutral-300'}`}>
          {mode === 'r' ? `${value >= 0 ? '+' : ''}${value.toFixed(1)}R` : formatMoney(value)}
        </span>
      ) : (
        <span className="text-[13px] font-semibold text-neutral-700">—</span>
      )}

      <span className="text-[8px] text-neutral-600">{hasTrades ? `${day.trades} trade${day.trades !== 1 ? 's' : ''}` : 'No trades'}</span>

      <div className={`w-full mt-0.5 pt-1 border-t ${isBest ? 'border-neutral-800' : 'border-transparent'}`}>
        <span className={`text-[8px] uppercase tracking-wide ${isBest ? 'text-neutral-500' : 'invisible'}`}>
          {isBest ? `${day.winRate}% win` : '0% win'}
        </span>
      </div>
    </div>
  );
}

const WeeklyRecapCard = forwardRef(function WeeklyRecapCard(
  { recap, mode, appName = 'Trade Journal', backgroundUrl, backgroundDim = 0.6 },
  ref
) {
  const total = mode === 'r' ? recap.totalR : recap.totalPnl;
  const isPositive = total >= 0;
  const suffix = mode === 'r' ? 'R' : '';
  const hasBg = !!backgroundUrl;

  const weekdays = recap.days.filter((d) => !d.isWeekend);
  const weekend = recap.days.filter((d) => d.isWeekend);
  const isBestDay = (day) => recap.bestDay && recap.bestDay.dateLabel === day.dateLabel;

  const statSurface = hasBg ? 'border-neutral-700/70 bg-black/35' : 'border-neutral-800 bg-neutral-900/60';

  return (
    <div
      ref={ref}
      className={`relative w-full max-w-[540px] mx-auto overflow-hidden rounded-2xl border border-neutral-800 bg-[#0a0a0a] p-6 sm:p-7 ${bricolage.className}`}
    >
      {/* Wallpaper: its own full-bleed layer, so it always spans the whole card however tall it gets. */}
      {hasBg && (
        <>
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${backgroundUrl}")` }}
          />
          <div className="pointer-events-none absolute inset-0" style={{ backgroundColor: `rgba(10,10,10,${backgroundDim})` }} />
        </>
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
          {mode === 'r' ? `${isPositive ? '+' : ''}${total.toFixed(2)}${suffix}` : formatMoney(total)}
        </div>

        {/* Mon–Fri */}
        <div className="grid grid-cols-5 gap-2">
          {weekdays.map((day) => (
            <DayCell key={day.dateLabel} day={day} mode={mode} hasBg={hasBg} isBest={isBestDay(day)} />
          ))}
        </div>

        {/* Sat + Sun: a second row, tiles exactly as wide as the weekday tiles, centred */}
        {weekend.length > 0 && (
          <div className="flex justify-center gap-2 mt-2">
            {weekend.map((day) => (
              <div key={day.dateLabel} style={{ width: 'calc((100% - 2rem) / 5)' }}>
                <DayCell day={day} mode={mode} hasBg={hasBg} isBest={isBestDay(day)} />
              </div>
            ))}
          </div>
        )}

        <div className="mb-5" />

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
              className={`border rounded-lg p-3 text-center transition-all duration-200 hover:border-neutral-600 hover:-translate-y-0.5 ${statSurface}`}
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
