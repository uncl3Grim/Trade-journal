'use client';

import { rMultiple } from '../lib/tradeMath';

export default function StatsBar({ trades, mode = 'dollar', defaultRiskAmount, accountBalance }) {
  const closed = trades.filter((t) => t.exit_price !== null && t.exit_price !== undefined);

  function valueOf(t) {
    if (mode === 'r') {
      const r = rMultiple(t, defaultRiskAmount);
      return r === null ? 0 : r;
    }
    return Number(t.pnl || 0);
  }

  const totalRaw = closed.reduce((sum, t) => sum + valueOf(t), 0);
  const wins = closed.filter((t) => Number(t.pnl) > 0);
  const losses = closed.filter((t) => Number(t.pnl) < 0);
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
  const avgWinRaw = wins.length ? wins.reduce((s, t) => s + valueOf(t), 0) / wins.length : 0;
  const avgLossRaw = losses.length ? losses.reduce((s, t) => s + valueOf(t), 0) / losses.length : 0;

  const usePercent = mode === 'percent' && accountBalance;
  const suffix = mode === 'r' ? 'R' : '';

  function fmt(v) {
    if (usePercent) {
      return `${v >= 0 ? '+' : ''}${((v / accountBalance) * 100).toFixed(2)}%`;
    }
    return `${v >= 0 ? '+' : ''}${v.toFixed(2)}${suffix}`;
  }

  const totalLabel = mode === 'r' ? 'Total R' : usePercent ? 'Total %' : 'Total P&L';

  const stats = [
    { label: totalLabel, value: fmt(totalRaw), color: totalRaw >= 0 ? 'text-green-600' : 'text-red-500' },
    { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, color: 'text-gray-900' },
    { label: 'Trades', value: closed.length, color: 'text-gray-900' },
    { label: 'Avg Win', value: fmt(avgWinRaw), color: 'text-green-600' },
    { label: 'Avg Loss', value: fmt(avgLossRaw), color: 'text-red-500' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-2">
      {stats.map((s) => (
        <div key={s.label} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3">
          <div className="text-xs text-gray-400 mb-1">{s.label}</div>
          <div className={`text-lg font-semibold ${s.color}`}>{s.value}</div>
        </div>
      ))}
      {mode === 'percent' && !accountBalance && (
        <div className="col-span-full text-[10px] text-gray-400">
          Set your account balance on the Profile page to see percentage values.
        </div>
      )}
    </div>
  );
}
