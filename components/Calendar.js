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

export default function Calendar({ month, dailyPnl, onDayClick, selectedDate }) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekdayLabels.map((d) => (
          <div key={d} className="text-center text-xs text-gray-500 font-medium">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayData = dailyPnl[key];
          const inMonth = isSameMonth(day, month);
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          let bg = 'bg-gray-900';
          let border = 'border-gray-800';
          if (dayData) {
            if (dayData.pnl > 0) {
              bg = 'bg-green-900/40';
              border = 'border-green-700';
            } else if (dayData.pnl < 0) {
              bg = 'bg-red-900/40';
              border = 'border-red-700';
            } else {
              bg = 'bg-gray-800';
              border = 'border-gray-600';
            }
          }

          return (
            <button
              key={key}
              onClick={() => onDayClick(day)}
              className={`aspect-square rounded-lg border p-2 flex flex-col items-start justify-between text-left transition
                ${bg} ${border}
                ${inMonth ? '' : 'opacity-30'}
                ${isSelected ? 'ring-2 ring-blue-500' : ''}
                hover:brightness-125`}
            >
              <span className="text-xs text-gray-400">{format(day, 'd')}</span>
              {dayData && (
                <div className="w-full">
                  <div
                    className={`text-xs font-semibold ${
                      dayData.pnl > 0 ? 'text-green-400' : dayData.pnl < 0 ? 'text-red-400' : 'text-gray-300'
                    }`}
                  >
                    {dayData.pnl > 0 ? '+' : ''}
                    {dayData.pnl.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-gray-500">{dayData.count} trade{dayData.count !== 1 ? 's' : ''}</div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
