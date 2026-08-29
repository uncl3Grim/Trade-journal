'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { computeFullSummary, formatDuration } from '../lib/summaryStats';
import { formatMoney } from '../lib/format';

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-xs py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-gray-800 dark:text-gray-100">{value}</span>
    </div>
  );
}

export default function TradeSummaryStats({ trades }) {
  const { all, winning, losing, sequence } = computeFullSummary(trades);

  if (all.numTrades === 0) {
    return (
      <div className="bg-white dark:bg-[#15151b] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-5 mb-4 text-sm text-gray-400">
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
        <div className="bg-white dark:bg-[#15151b] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">All Trades</h4>
          <Row label="Gross P/L" value={formatMoney(all.grossPnl)} />
          <Row label="# of Trades" value={all.numTrades} />
          <Row label="# of Contracts" value={all.numContracts.toFixed(2)} />
          <Row label="Avg. Trade Time" value={formatDuration(all.avgDuration)} />
          <Row label="Longest Trade Time" value={formatDuration(all.longestDuration)} />
          <Row label="% Profitable" value={`${all.percentProfitable.toFixed(2)}%`} />
          <Row label="Expectancy" value={formatMoney(all.expectancy)} />
          <Row label="Total P/L" value={formatMoney(all.totalPnl)} />
        </div>
        <div className="bg-white dark:bg-[#15151b] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-4">
          <h4 className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">Profit Trades</h4>
          <Row label="Total Profit" value={formatMoney(winning.totalProfit)} />
          <Row label="# Winning" value={winning.numWinning} />
          <Row label="Largest Winning" value={formatMoney(winning.largestWinning)} />
          <Row label="Avg. Winning" value={formatMoney(winning.avgWinning)} />
          <Row label="Std Dev Winning" value={winning.stdDevWinning.toFixed(2)} />
          <Row label="Avg. Winning Time" value={formatDuration(winning.avgWinningTime)} />
          <Row label="Longest Winning Time" value={formatDuration(winning.longestWinningTime)} />
        </div>
        <div className="bg-white dark:bg-[#15151b] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-4">
          <h4 className="text-xs font-semibold text-red-500 dark:text-red-400 uppercase tracking-wide mb-2">Losing Trades</h4>
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
        <div className="bg-white dark:bg-[#15151b] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Winning vs Losing Trades</h4>
          <div className="h-48 flex items-center">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie data={winLossSplit} dataKey="value" outerRadius={70}>
                  <Cell fill="#4ade80" />
                  <Cell fill="#f87171" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="text-xs space-y-1">
              <div className="text-green-600 dark:text-green-400 font-medium">Winning: {winPct.toFixed(2)}%</div>
              <div className="text-red-500 dark:text-red-400 font-medium">Losing: {(100 - winPct).toFixed(2)}%</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#15151b] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">P&L History</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sequence}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="index" stroke="#9ca3af" fontSize={9} hide />
                <YAxis stroke="#9ca3af" fontSize={9} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }} formatter={(v) => formatMoney(v)} />
                <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                  {sequence.map((d, i) => (
                    <Cell key={i} fill={d.pnl >= 0 ? '#4ade80' : '#f87171'} />
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
