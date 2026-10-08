'use client';

import { format } from 'date-fns';
import { Bricolage_Grotesque } from 'next/font/google';
import { computeWeeklyTotals } from '../lib/weeklyTotals';
import { formatMoney } from '../lib/format';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });

export default function WeeklyTotals({ month, dailyStats, mode }) {
  const weeks = computeWeeklyTotals(month, dailyStats, mode);
  const suffix = mode === 'r' ? 'R' : '';

  return (
    <div className={`bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-4 mb-4 ${bricolage.className}`}>
      <h3 className="font-semibold text-neutral-100 mb-3 text-sm">Weekly Totals</h3>
      <div className="space-y-2">
        {weeks.map((w) => (
          <div
            key={w.weekNumber}
            className="flex items-center justify-between bg-neutral-900/60 border border-neutral-800 rounded-xl px-3 py-2 transition-all duration-200 hover:border-neutral-700 hover:-translate-y-0.5"
          >
            <div>
              <div className="text-xs font-medium text-neutral-300">Week {w.weekNumber}</div>
              <div className="text-[10px] text-neutral-500">
                {format(w.start, 'MMM d')} – {format(w.end, 'MMM d')}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-semibold ${w.total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {w.tradingDays === 0 ? '—' : mode === 'r' ? `${w.total >= 0 ? '+' : ''}${w.total.toFixed(2)}${suffix}` : formatMoney(w.total)}
              </div>
              <div className="text-[10px] text-neutral-500">
                {w.tradingDays} day{w.tradingDays !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
