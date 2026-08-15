'use client';

export default function StatsBar({ trades }) {
  const closed = trades.filter((t) => t.exit_price !== null && t.exit_price !== undefined);
  const totalPnl = closed.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
  const wins = closed.filter((t) => Number(t.pnl) > 0);
  const losses = closed.filter((t) => Number(t.pnl) < 0);
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
  const avgWin = wins.length ? wins.reduce((s, t) => s + Number(t.pnl), 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s, t) => s + Number(t.pnl), 0) / losses.length : 0;

  const stats = [
    { label: 'Total P&L', value: `${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? 'text-green-600' : 'text-red-500' },
    { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, color: 'text-gray-900' },
    { label: 'Trades', value: closed.length, color: 'text-gray-900' },
    { label: 'Avg Win', value: `+${avgWin.toFixed(2)}`, color: 'text-green-600' },
    { label: 'Avg Loss', value: avgLoss.toFixed(2), color: 'text-red-500' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
      {stats.map((s) => (
        <div key={s.label} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3">
          <div className="text-xs text-gray-400 mb-1">{s.label}</div>
          <div className={`text-lg font-semibold ${s.color}`}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}
