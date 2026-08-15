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
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-6 text-sm text-gray-400">
        No closed trades yet to chart.
      </div>
    );
  }

  const isUp = data[data.length - 1].balance >= 0;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-6">
      <h3 className="font-semibold mb-4 text-gray-900">Equity Curve</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" fontSize={12} />
            <Tooltip
              contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8 }}
              labelStyle={{ color: '#6b7280' }}
            />
            <Line
              type="monotone"
              dataKey="balance"
              stroke={isUp ? '#16a34a' : '#ef4444'}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
