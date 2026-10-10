'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { computeFullSummary, formatDuration } from '../lib/summaryStats';
import { formatMoney } from '../lib/format';

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-xs py-1.5 border-b border-neutral-800/60 last:border-0">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-100">{value}</span>
    </div>
  );
}

export default function TradeSummaryStats({ trades }) {
  const { all, winning, losing, sequence } = computeFullSummary(trades);

  if (all.numTrades === 0) {
    return (
      <div className="bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-5 mb-4 text-sm text-neutral-500">
        No closed trades yet for a full summary.
      </div>
    );
  }

  const winPct = all.percentProfitable;
  const winLossSplit = [
    { name: 'Winning', value: winning.numWinning },
    { name: 'Losing', value: losing.numLosing },
  ];

  return (
    <div className="mb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-4">
          <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">All Trades</h4>
          <Row label="Gross P/L" value={formatMoney(all.grossPnl)} />
          <Row label="# of Trades" value={all.numTrades} />
          <Row label="# of Contracts" value={all.numContracts.toFixed(2)} />
          <Row label="Avg. Trade Time" value={formatDuration(all.avgDuration)} />
          <Row label="Longest Trade Time" value={formatDuration(all.longestDuration)} />
          <Row label="% Profitable" value={`${all.percentProfitable.toFixed(2)}%`} />
          <Row label="Expectancy" value={formatMoney(all.expectancy)} />
          <Row label="Total P/L" value={formatMoney(all.totalPnl)} />
        </div>
        <div className="bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-4">
          <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-2">Profit Trades</h4>
          <Row label="Total Profit" value={formatMoney(winning.totalProfit)} />
          <Row label="# Winning" value={winning.numWinning} />
          <Row label="Largest Winning" value={formatMoney(winning.largestWinning)} />
          <Row label="Avg. Winning" value={formatMoney(winning.avgWinning)} />
          <Row label="Std Dev Winning" value={winning.stdDevWinning.toFixed(2)} />
          <Row label="Avg. Winning Time" value={formatDuration(winning.avgWinningTime)} />
          <Row label="Longest Winning Time" value={formatDuration(winning.longestWinningTime)} />
        </div>
        <div className="bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-4">
          <h4 className="text-xs font-semibold text-rose-400 uppercase tracking-wide mb-2">Losing Trades</h4>
          <Row label="Total Loss" value={formatMoney(losing.totalLoss)} />
          <Row label="# Losing" value={losing.numLosing} />
          <Row label="Largest Losing" value={formatMoney(losing.largestLosing)} />
          <Row label="Avg. Losing" value={formatMoney(losing.avgLosing)} />
          <Row label="Std Dev Losing" value={losing.stdDevLosing.toFixed(2)} />
          <Row label="Avg. Losing Time" value={formatDuration(losing.avgLosingTime)} />
          <Row label="Longest Losing Time" value={formatDuration(losing.longestLosingTime)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-4">
          <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Winning vs Losing Trades</h4>
          <div className="h-48 flex items-center">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie data={winLossSplit} dataKey="value" outerRadius={70}>
                  <Cell fill="#34d399" />
                  <Cell fill="#fb7185" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="text-xs space-y-1">
              <div className="text-emerald-400 font-medium">Winning: {winPct.toFixed(2)}%</div>
              <div className="text-rose-400 font-medium">Losing: {(100 - winPct).toFixed(2)}%</div>
            </div>
          </div>
        </div>
        <div className="bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-4">
          <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">P&L History</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sequence}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="index" stroke="#737373" fontSize={9} hide />
                <YAxis stroke="#737373" fontSize={9} />
                <Tooltip contentStyle={{ background: '#15151b', border: '1px solid #2e2e38', borderRadius: 8, color: '#e5e5e5' }} formatter={(v) => formatMoney(v)} />
                <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                  {sequence.map((d, i) => (
                    <Cell key={i} fill={d.pnl >= 0 ? '#34d399' : '#fb7185'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
