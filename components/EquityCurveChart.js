'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatMoney } from '../lib/format';

export default function EquityCurveChart({ trades, startingBalance }) {
  const data = useMemo(() => {
    const closed = trades
      .filter((t) => t.exit_price !== null && t.exit_price !== undefined && t.entry_time)
      .slice()
      .sort((a, b) => new Date(a.entry_time) - new Date(b.entry_time));

    let equity = startingBalance || 0;
    let peak = equity;
    const points = [{ label: 'Start', equity, peak, underwater: 0 }];

    for (const t of closed) {
      equity += Number(t.pnl || 0);
      if (equity > peak) peak = equity;
      points.push({
        label: format(new Date(t.entry_time), 'MMM d'),
        equity: Number(equity.toFixed(2)),
        peak: Number(peak.toFixed(2)),
        underwater: Number((equity - peak).toFixed(2)), // always <= 0
      });
    }
    return points;
  }, [trades, startingBalance]);

  if (data.length <= 1) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-6 text-center text-sm text-gray-400">
        Not enough closed trades yet to plot an equity curve.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 mb-6">
      <h3 className="font-semibold text-gray-900 text-sm mb-3">Equity Curve</h3>

      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} interval="preserveStartEnd" />
            <YAxis
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              width={54}
              tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
              domain={['auto', 'auto']}
            />
            <Tooltip
              formatter={(value, name) => [formatMoney(value), name === 'equity' ? 'Balance' : 'High-water mark']}
              labelFormatter={(l) => l}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <ReferenceLine y={startingBalance} stroke="#d1d5db" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="peak" stroke="#c7d2fe" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
            <Line type="monotone" dataKey="equity" stroke="#4f46e5" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-gray-400 mt-2 mb-2">
        Solid line: account balance over time. Dashed line: your high-water mark (peak balance reached).
      </p>

      <div style={{ width: '100%', height: 90 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
            <XAxis dataKey="label" hide />
            <YAxis
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              width={54}
              tickFormatter={(v) => `$${Math.abs(v).toFixed(0)}`}
              domain={['auto', 0]}
            />
            <Tooltip formatter={(value) => [formatMoney(value), 'Below peak']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Area type="monotone" dataKey="underwater" stroke="#ef4444" fill="#fee2e2" strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-gray-400 mt-1">Underwater chart — how far below your peak balance you are at each point.</p>
    </div>
  );
}
