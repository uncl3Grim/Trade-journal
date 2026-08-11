'use client';

import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
  format,
  isWithinInterval,
} from 'date-fns';
import EquityCurve from './EquityCurve';

function summarize(trades, start, end) {
  const inRange = trades.filter((t) =>
    isWithinInterval(new Date(t.entry_time), { start, end })
  );
  const closed = inRange.filter((t) => t.exit_price !== null && t.exit_price !== undefined);
  const totalPnl = closed.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
  const wins = closed.filter((t) => Number(t.pnl) > 0);
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;

  const byDay = {};
  for (const t of closed) {
    const key = format(new Date(t.entry_time), 'yyyy-MM-dd');
    byDay[key] = (byDay[key] || 0) + Number(t.pnl || 0);
  }
  const dayEntries = Object.entries(byDay);
  const bestDay = dayEntries.length ? dayEntries.reduce((a, b) => (b[1] > a[1] ? b : a)) : null;
  const worstDay = dayEntries.length ? dayEntries.reduce((a, b) => (b[1] < a[1] ? b : a)) : null;

  return { totalPnl, winRate, tradeCount: closed.length, bestDay, worstDay };
}

function PeriodCard({ label, current, previous, rangeLabel }) {
  const delta = current.totalPnl - previous.totalPnl;
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-semibold">{label}</h3>
        <span className="text-xs text-gray-500">{rangeLabel}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">P&L</div>
          <div className={`text-xl font-semibold ${current.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {current.totalPnl >= 0 ? '+' : ''}
            {current.totalPnl.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Win Rate</div>
          <div className="text-xl font-semibold text-gray-200">{current.winRate.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Trades</div>
          <div className="text-lg font-medium text-gray-300">{current.tradeCount}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">vs. previous period</div>
          <div className={`text-lg font-medium ${delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {delta >= 0 ? '+' : ''}
            {delta.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800 pt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Best day</span>
          <span className="text-green-400">
            {current.bestDay ? `${current.bestDay[0]}  +${current.bestDay[1].toFixed(2)}` : '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Worst day</span>
          <span className="text-red-400">
            {current.worstDay ? `${current.worstDay[0]}  ${current.worstDay[1].toFixed(2)}` : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ReviewPanel({ trades }) {
  const now = new Date();

  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const lastWeekStart = startOfWeek(subWeeks(now, 1));
  const lastWeekEnd = endOfWeek(subWeeks(now, 1));

  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const thisWeek = summarize(trades, weekStart, weekEnd);
  const lastWeek = summarize(trades, lastWeekStart, lastWeekEnd);
  const thisMonth = summarize(trades, monthStart, monthEnd);
  const lastMonth = summarize(trades, lastMonthStart, lastMonthEnd);

  return (
    <div>
      <EquityCurve trades={trades} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <PeriodCard
          label="This Week"
          current={thisWeek}
          previous={lastWeek}
          rangeLabel={`${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`}
        />
        <PeriodCard
          label="This Month"
          current={thisMonth}
          previous={lastMonth}
          rangeLabel={format(now, 'MMMM yyyy')}
        />
      </div>
    </div>
  );
}
