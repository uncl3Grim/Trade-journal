'use client';

import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { summarizePeriod } from '../lib/periodStats';
import { formatMoney } from '../lib/format';

function fmt(v, mode, accountBalance) {
  if (mode === 'r') return `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`;
  if (mode === 'percent' && accountBalance) {
    return `${v >= 0 ? '+' : ''}${((v / accountBalance) * 100).toFixed(2)}%`;
  }
  return formatMoney(v);
}

export default function PeriodStatsHeader({ trades, mode, defaultRiskAmount, accountBalance }) {
  const now = new Date();
  const week = summarizePeriod(trades, startOfWeek(now), endOfWeek(now), defaultRiskAmount);
  const monthly = summarizePeriod(trades, startOfMonth(now), endOfMonth(now), defaultRiskAmount);

  const weekValue = mode === 'r' ? week.totalR : week.totalPnl;
  const monthValue = mode === 'r' ? monthly.totalR : monthly.totalPnl;

  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3">
        <div className="text-xs text-gray-400 mb-1">This Week</div>
        <div className={`text-lg font-semibold ${weekValue >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {fmt(weekValue, mode, accountBalance)}
        </div>
        <div className="text-[10px] text-gray-400">{week.tradeCount} trades · {week.winRate.toFixed(0)}% win rate</div>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3">
        <div className="text-xs text-gray-400 mb-1">This Month</div>
        <div className={`text-lg font-semibold ${monthValue >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {fmt(monthValue, mode, accountBalance)}
        </div>
        <div className="text-[10px] text-gray-400">{monthly.tradeCount} trades · {monthly.winRate.toFixed(0)}% win rate</div>
      </div>
    </div>
  );
}
