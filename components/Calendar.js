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

function formatValue(stat, mode, accountBalance) {
  if (!stat) return null;
  if (mode === 'r') {
    return `${stat.r >= 0 ? '+' : ''}${stat.r.toFixed(2)}R`;
  }
  if (mode === 'percent') {
    if (!accountBalance) return `${stat.dollar >= 0 ? '+' : ''}${stat.dollar.toFixed(2)}`;
    const pct = (stat.dollar / accountBalance) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
  }
  return `${stat.dollar >= 0 ? '+' : ''}${stat.dollar.toFixed(2)}`;
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
    <div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
        {weekdayLabels.map((d) => (
          <div key={d} className="text-center text-[10px] sm:text-xs text-gray-400 font-medium">
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

          let bg = 'bg-white';
          let border = 'border-gray-200';
          if (stat) {
            if (sign > 0) {
              bg = 'bg-green-50';
              border = 'border-green-200';
            } else if (sign < 0) {
              bg = 'bg-red-50';
              border = 'border-red-200';
            } else {
              bg = 'bg-gray-50';
              border = 'border-gray-200';
            }
          }

          return (
            <button
              key={key}
              onClick={() => onDayClick(day)}
              className={`h-16 sm:h-20 rounded-lg sm:rounded-xl border p-1.5 sm:p-2 flex flex-col items-start justify-between text-left transition overflow-hidden
                ${bg} ${border}
                ${inMonth ? '' : 'opacity-40'}
                ${isSelected ? 'ring-2 ring-indigo-500' : ''}
                hover:border-indigo-300`}
            >
              <span className="text-[10px] sm:text-xs text-gray-400 leading-none">{format(day, 'd')}</span>
              {stat && (
                <div className="w-full min-w-0">
                  <div
                    className={`text-[10px] sm:text-xs font-semibold leading-tight truncate ${
                      sign > 0 ? 'text-green-600' : sign < 0 ? 'text-red-500' : 'text-gray-500'
                    }`}
                  >
                    {formatValue(stat, mode, accountBalance)}
                  </div>
                  <div className="text-[8px] sm:text-[10px] text-gray-400 leading-tight truncate">
                    {stat.count} trade{stat.count !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
