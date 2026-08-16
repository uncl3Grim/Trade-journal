'use client';

import { useState } from 'react';
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
import BreakdownReports from './BreakdownReports';
import AIAnalysis from './AIAnalysis';
import { rMultiple } from '../lib/tradeMath';

function summarize(trades, start, end, defaultRiskAmount) {
  const inRange = trades.filter((t) => isWithinInterval(new Date(t.entry_time), { start, end }));
  const closed = inRange.filter((t) => t.exit_price !== null && t.exit_price !== undefined);
  const totalPnl = closed.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
  const wins = closed.filter((t) => Number(t.pnl) > 0);
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;

  const rValues = closed.map((t) => rMultiple(t, defaultRiskAmount)).filter((r) => r !== null);
  const totalR = rValues.reduce((sum, r) => sum + r, 0);

  const byDay = {};
  for (const t of closed) {
    const key = format(new Date(t.entry_time), 'yyyy-MM-dd');
    byDay[key] = (byDay[key] || 0) + Number(t.pnl || 0);
  }
  const dayEntries = Object.entries(byDay);
  const bestDay = dayEntries.length ? dayEntries.reduce((a, b) => (b[1] > a[1] ? b : a)) : null;
  const worstDay = dayEntries.length ? dayEntries.reduce((a, b) => (b[1] < a[1] ? b : a)) : null;

  return { totalPnl, winRate, tradeCount: closed.length, bestDay, worstDay, totalR };
}

function PeriodCard({ label, current, previous, rangeLabel, control }) {
  const delta = current.totalPnl - previous.totalPnl;
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{label}</h3>
        {control}
      </div>
      <div className="text-xs text-gray-400 mb-4">{rangeLabel}</div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="text-xs text-gray-400 mb-1">P&L</div>
          <div className={`text-xl font-semibold ${current.totalPnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {current.totalPnl >= 0 ? '+' : ''}
            {current.totalPnl.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Total R</div>
          <div className={`text-xl font-semibold ${current.totalR >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {current.totalR >= 0 ? '+' : ''}
            {current.totalR.toFixed(2)}R
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Win Rate</div>
          <div className="text-lg font-medium text-gray-900">{current.winRate.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Trades</div>
          <div className="text-lg font-medium text-gray-700">{current.tradeCount}</div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">vs. previous period</span>
          <span className={delta >= 0 ? 'text-green-600' : 'text-red-500'}>
            {delta >= 0 ? '+' : ''}
            {delta.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Best day</span>
          <span className="text-green-600">
            {current.bestDay ? `${current.bestDay[0]}  +${current.bestDay[1].toFixed(2)}` : '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Worst day</span>
          <span className="text-red-500">
            {current.worstDay ? `${current.worstDay[0]}  ${current.worstDay[1].toFixed(2)}` : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}

function isoWeekToDate(isoWeekStr) {
  const [yearStr, weekStr] = isoWeekStr.split('-W');
  const year = Number(yearStr);
  const week = Number(weekStr);
  const jan4 = new Date(year, 0, 4);
  const weekStart = startOfWeek(jan4, { weekStartsOn: 1 });
  const d = new Date(weekStart);
  d.setDate(d.getDate() + (week - 1) * 7);
  return d;
}

export default function ReviewPanel({ trades, defaultRiskAmount }) {
  const now = new Date();
  const [weekAnchor, setWeekAnchor] = useState(now);
  const [monthAnchor, setMonthAnchor] = useState(now);

  const weekStart = startOfWeek(weekAnchor);
  const weekEnd = endOfWeek(weekAnchor);
  const lastWeekStart = startOfWeek(subWeeks(weekAnchor, 1));
  const lastWeekEnd = endOfWeek(subWeeks(weekAnchor, 1));

  const monthStart = startOfMonth(monthAnchor);
  const monthEnd = endOfMonth(monthAnchor);
  const lastMonthStart = startOfMonth(subMonths(monthAnchor, 1));
  const lastMonthEnd = endOfMonth(subMonths(monthAnchor, 1));

  const thisWeek = summarize(trades, weekStart, weekEnd, defaultRiskAmount);
  const lastWeek = summarize(trades, lastWeekStart, lastWeekEnd, defaultRiskAmount);
  const thisMonth = summarize(trades, monthStart, monthEnd, defaultRiskAmount);
  const lastMonth = summarize(trades, lastMonthStart, lastMonthEnd, defaultRiskAmount);

  return (
    <div>
      <AIAnalysis defaultRiskAmount={defaultRiskAmount} />
      <EquityCurve trades={trades} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <PeriodCard
          label="Week"
          current={thisWeek}
          previous={lastWeek}
          rangeLabel={`${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`}
          control={
            <input
              type="week"
              onChange={(e) => e.target.value && setWeekAnchor(isoWeekToDate(e.target.value))}
              className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-700"
            />
          }
        />
        <PeriodCard
          label="Month"
          current={thisMonth}
          previous={lastMonth}
          rangeLabel={format(monthAnchor, 'MMMM yyyy')}
          control={
            <input
              type="month"
              onChange={(e) => e.target.value && setMonthAnchor(new Date(e.target.value + '-01'))}
              className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-700"
            />
          }
        />
      </div>
      <BreakdownReports trades={trades} />
    </div>
  );
}
