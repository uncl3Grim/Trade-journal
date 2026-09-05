'use client';

import { startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, format, isValid } from 'date-fns';
import { summarizePeriod } from '../lib/periodStats';
import { rMultiple } from '../lib/tradeMath';
import { formatMoney } from '../lib/format';

function fmt(v, mode, accountBalance) {
  if (mode === 'r') return `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`;
  if (mode === 'percent' && accountBalance) {
    return `${v >= 0 ? '+' : ''}${((v / accountBalance) * 100).toFixed(2)}%`;
  }
  return formatMoney(v);
}

// `month` is the month currently selected on the calendar (not necessarily
// today's real month) — both cards below are scoped to it. Falls back to
// today if `month` is ever missing or invalid, so this can never crash the
// build/render.
export default function PeriodStatsHeader({ trades, month, mode, defaultRiskAmount, accountBalance }) {
  const safeMonth = month instanceof Date && isValid(month) ? month : new Date();
  const rangeStart = startOfMonth(safeMonth);
  const rangeEnd = endOfMonth(safeMonth);
  const monthly = summarizePeriod(trades, rangeStart, rangeEnd, defaultRiskAmount);
  const monthValue = mode === 'r' ? monthly.totalR : monthly.totalPnl;

  const closedInMonth = trades.filter(
    (t) =>
      t.entry_time &&
      t.exit_price !== null &&
      t.exit_price !== undefined &&
      new Date(t.entry_time) >= rangeStart &&
      new Date(t.entry_time) <= rangeEnd
  );

  let bestDay = null;
  eachDayOfInterval({ start: rangeStart, end: rangeEnd }).forEach((day) => {
    const dayTrades = closedInMonth.filter((t) => isSameDay(new Date(t.entry_time), day));
    if (!dayTrades.length) return;
    const pnl = dayTrades.reduce((s, t) => s + Number(t.pnl || 0), 0);
    const rTotal = dayTrades
      .map((t) => rMultiple(t, defaultRiskAmount))
      .filter((r) => r !== null)
      .reduce((s, r) => s + r, 0);
    const value = mode === 'r' ? rTotal : pnl;
    if (!bestDay || value > bestDay.value) {
      bestDay = { date: day, value, tradeCount: dayTrades.length };
    }
  });

  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3">
        <div className="text-xs text-gray-400 mb-1">{format(safeMonth, 'MMMM yyyy')}</div>
        <div className={`text-lg font-semibold ${monthValue >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {fmt(monthValue, mode, accountBalance)}
        </div>
        <div className="text-[10px] text-gray-400">
          {monthly.tradeCount} trades · {monthly.winRate.toFixed(0)}% win rate
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3">
        <div className="text-xs text-gray-400 mb-1">Best Day</div>
        <div
          className={`text-lg font-semibold ${
            bestDay ? (bestDay.value >= 0 ? 'text-green-600' : 'text-red-500') : 'text-gray-400'
          }`}
        >
          {bestDay ? fmt(bestDay.value, mode, accountBalance) : '—'}
        </div>
        <div className="text-[10px] text-gray-400">
          {bestDay
            ? `${format(bestDay.date, 'MMM d')} · ${bestDay.tradeCount} trade${bestDay.tradeCount !== 1 ? 's' : ''}`
            : 'No trades this month'}
        </div>
      </div>
    </div>
  );
}
