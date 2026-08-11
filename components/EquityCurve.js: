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
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6 text-sm text-gray-500">
        No closed trades yet to chart.
      </div>
    );
  }

  const isUp = data[data.length - 1].balance >= 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
      <h3 className="font-semibold mb-4">Equity Curve</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip
              contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Line
              type="monotone"
              dataKey="balance"
              stroke={isUp ? '#4ade80' : '#f87171'}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
