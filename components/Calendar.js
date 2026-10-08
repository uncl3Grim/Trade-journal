'use client';

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
} from 'date-fns';
import { Bricolage_Grotesque } from 'next/font/google';
import { formatMoney } from '../lib/format';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });

function formatValue(stat, mode, accountBalance) {
  if (!stat) return null;
  if (mode === 'r') {
    return `${stat.r >= 0 ? '+' : ''}${stat.r.toFixed(2)}R`;
  }
  if (mode === 'percent') {
    if (!accountBalance) return formatMoney(stat.dollar);
    const pct = (stat.dollar / accountBalance) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
  }
  return formatMoney(stat.dollar);
}

function signOf(stat, mode) {
  if (!stat) return 0;
  return mode === 'r' ? stat.r : stat.dollar;
}

export default function Calendar({ month, dailyStats, onDayClick, selectedDate, mode = 'dollar', accountBalance }) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={`bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-3 sm:p-4 ${bricolage.className}`}>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
        {weekdayLabels.map((d) => (
          <div key={d} className="text-center text-[10px] sm:text-xs text-neutral-500 font-medium uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const stat = dailyStats[key];
          const inMonth = isSameMonth(day, month);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const sign = signOf(stat, mode);

          let bg = 'bg-neutral-900/50';
          let border = 'border-neutral-800';
          if (stat) {
            if (sign > 0) {
              bg = 'bg-emerald-400/[0.07]';
              border = 'border-emerald-900/50';
            } else if (sign < 0) {
              bg = 'bg-rose-400/[0.07]';
              border = 'border-rose-900/50';
            } else {
              bg = 'bg-neutral-900/70';
              border = 'border-neutral-800';
            }
          }

          return (
            <button
              key={key}
              onClick={() => onDayClick(day)}
              className={`h-20 sm:h-24 rounded-lg sm:rounded-xl border p-1.5 sm:p-2 flex flex-col items-start justify-between text-left transition-all duration-200 overflow-hidden
                ${bg} ${border}
                ${inMonth ? '' : 'opacity-30'}
                ${isSelected ? 'ring-1 ring-neutral-400' : ''}
                hover:border-neutral-600 hover:-translate-y-0.5`}
            >
              <span className="text-[10px] sm:text-xs text-neutral-500 leading-none">{format(day, 'd')}</span>
              {stat && (
                <div className="w-full min-w-0">
                  <div
                    className={`text-[10px] sm:text-xs font-semibold leading-tight truncate ${
                      sign > 0 ? 'text-emerald-400' : sign < 0 ? 'text-rose-400' : 'text-neutral-400'
                    }`}
                  >
                    {formatValue(stat, mode, accountBalance)}
                  </div>
                  <div className="text-[8px] sm:text-[10px] text-neutral-500 leading-tight truncate">
                    {stat.count} trade{stat.count !== 1 ? 's' : ''}
                  </div>
                  {stat.symbols?.length > 0 && (
                    <div className="text-[8px] sm:text-[9px] text-neutral-600 leading-tight truncate">
                      {stat.symbols.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
