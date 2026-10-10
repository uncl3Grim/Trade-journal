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
      <div className="bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-5 mb-4 text-sm text-neutral-500">
        No closed trades yet to chart.
      </div>
    );
  }

  return (
    <div className="bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-5 mb-4">
      <h3 className="font-semibold text-neutral-100 mb-4 text-sm">Net Daily P&L</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis dataKey="date" stroke="#737373" fontSize={10} interval="preserveStartEnd" />
            <YAxis stroke="#737373" fontSize={10} />
            <Tooltip contentStyle={{ background: '#15151b', border: '1px solid #2e2e38', borderRadius: 8, color: '#e5e5e5' }} />
            <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.pnl >= 0 ? '#34d399' : '#fb7185'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
