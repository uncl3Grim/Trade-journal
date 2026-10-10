'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export default function EquityCurve({ trades }) {
  const closed = trades
    .filter((t) => t.exit_price !== null && t.exit_price !== undefined)
    .slice()
    .sort((a, b) => new Date(a.entry_time) - new Date(b.entry_time));

  let running = 0;
  const data = closed.map((t) => {
    running += Number(t.pnl || 0);
    return {
      date: format(new Date(t.entry_time), 'MMM d'),
      balance: Number(running.toFixed(2)),
    };
  });

  if (data.length === 0) {
    return (
      <div className="bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-5 mb-6 text-sm text-neutral-500">
        No closed trades yet to chart.
      </div>
    );
  }

  const isUp = data[data.length - 1].balance >= 0;

  return (
    <div className="bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-5 mb-6">
      <h3 className="font-semibold mb-4 text-neutral-100">Equity Curve</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis dataKey="date" stroke="#737373" fontSize={12} />
            <YAxis stroke="#737373" fontSize={12} />
            <Tooltip
              contentStyle={{ background: '#15151b', border: '1px solid #2e2e38', borderRadius: 8, color: '#e5e5e5' }}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Line
              type="monotone"
              dataKey="balance"
              stroke={isUp ? '#34d399' : '#fb7185'}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
