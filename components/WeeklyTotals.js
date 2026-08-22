'use client';

import { format } from 'date-fns';
import { computeWeeklyTotals } from '../lib/weeklyTotals';

export default function WeeklyTotals({ month, dailyStats, mode }) {
  const weeks = computeWeeklyTotals(month, dailyStats, mode);
  const suffix = mode === 'r' ? 'R' : '';

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 mb-4">
      <h3 className="font-semibold text-gray-900 mb-3 text-sm">Weekly Totals</h3>
      <div className="space-y-2">
        {weeks.map((w) => (
          <div key={w.weekNumber} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
            <div>
              <div className="text-xs font-medium text-gray-700">Week {w.weekNumber}</div>
              <div className="text-[10px] text-gray-400">
                {format(w.start, 'MMM d')} – {format(w.end, 'MMM d')}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-semibold ${w.total >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {w.tradingDays === 0 ? '—' : `${w.total >= 0 ? '+' : ''}${w.total.toFixed(2)}${suffix}`}
              </div>
              <div className="text-[10px] text-gray-400">
                {w.tradingDays} day{w.tradingDays !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
