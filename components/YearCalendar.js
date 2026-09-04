'use client';

import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth } from 'date-fns';

function monthTotals(dailyStats, year, monthIndex) {
  let dollar = 0;
  let r = 0;
  let count = 0;
  for (const key in dailyStats) {
    const d = new Date(`${key}T00:00:00`);
    if (d.getFullYear() === year && d.getMonth() === monthIndex) {
      dollar += dailyStats[key].dollar;
      r += dailyStats[key].r;
      count += dailyStats[key].count;
    }
  }
  return { dollar, r, count };
}

function MiniMonth({ year, monthIndex, dailyStats, onMonthClick, onDayClick }) {
  const monthDate = new Date(year, monthIndex, 1);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const totals = monthTotals(dailyStats, year, monthIndex);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-2">
      <button onClick={() => onMonthClick(monthDate)} className="w-full text-left mb-1.5">
        <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">{format(monthDate, 'MMMM')}</div>
        {totals.count > 0 && (
          <div className={`text-[10px] font-medium ${totals.dollar >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {totals.dollar >= 0 ? '+' : ''}${totals.dollar.toFixed(0)} · {totals.r >= 0 ? '+' : ''}
            {totals.r.toFixed(1)}R
          </div>
        )}
      </button>
      <div className="grid grid-cols-7 gap-[2px]">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const stat = dailyStats[key];
          const inMonth = isSameMonth(day, monthDate);
          let bg = 'bg-gray-50';
          if (stat) {
            if (stat.dollar > 0) bg = 'bg-green-400';
            else if (stat.dollar < 0) bg = 'bg-red-400';
            else bg = 'bg-gray-300';
          }
          return (
            <button
              key={key}
              onClick={() => inMonth && onDayClick(day)}
              className={`aspect-square rounded-sm ${bg} ${inMonth ? '' : 'opacity-20 cursor-default'}`}
              title={inMonth ? format(day, 'MMM d') : undefined}
              disabled={!inMonth}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function YearCalendar({ year, dailyStats, onMonthClick, onDayClick, onPrevYear, onNextYear }) {
  const months = Array.from({ length: 12 }, (_, i) => i);

  let yearDollar = 0;
  let yearR = 0;
  for (const key in dailyStats) {
    const d = new Date(`${key}T00:00:00`);
    if (d.getFullYear() === year) {
      yearDollar += dailyStats[key].dollar;
      yearR += dailyStats[key].r;
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrevYear}
          className="px-3 py-1 rounded-xl bg-white dark:bg-[#15151b] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-200"
        >
          ← Prev
        </button>
        <div className="text-center">
          <h2 className="font-medium text-gray-900 dark:text-gray-100">{year}</h2>
          <div className={`text-xs font-medium ${yearDollar >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {yearDollar >= 0 ? '+' : ''}${yearDollar.toFixed(2)} · {yearR >= 0 ? '+' : ''}
            {yearR.toFixed(2)}R
          </div>
        </div>
        <button
          onClick={onNextYear}
          className="px-3 py-1 rounded-xl bg-white dark:bg-[#15151b] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-200"
        >
          Next →
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {months.map((m) => (
          <MiniMonth key={m} year={year} monthIndex={m} dailyStats={dailyStats} onMonthClick={onMonthClick} onDayClick={onDayClick} />
        ))}
      </div>
    </div>
  );
}
