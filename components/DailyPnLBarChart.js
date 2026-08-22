'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format } from 'date-fns';

export default function DailyPnLBarChart({ trades }) {
  const closed = trades.filter((t) => t.exit_price !== null && t.exit_price !== undefined && t.entry_time);
  const byDay = {};
  for (const t of closed) {
    const key = format(new Date(t.entry_time), 'yyyy-MM-dd');
    byDay[key] = (byDay[key] || 0) + Number(t.pnl || 0);
  }
  const data = Object.entries(byDay)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .map(([date, pnl]) => ({ date: format(new Date(date), 'MMM d'), pnl: Number(pnl.toFixed(2)) }));

  if (data.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-4 text-sm text-gray-400">
        No closed trades yet to chart.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-4">
      <h3 className="font-semibold text-gray-900 mb-4 text-sm">Net Daily P&L</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} interval="preserveStartEnd" />
            <YAxis stroke="#9ca3af" fontSize={10} />
            <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }} />
            <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.pnl >= 0 ? '#4ade80' : '#f87171'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
