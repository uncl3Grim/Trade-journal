'use client';

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { computeTraderScore } from '../lib/traderScore';

export default function TraderScoreCard({ trades }) {
  const { metrics, overall } = computeTraderScore(trades);

  const data = [
    { metric: 'Win %', value: metrics.winRate },
    { metric: 'Profit factor', value: metrics.profitFactor },
    { metric: 'Avg win/loss', value: metrics.avgWinLoss },
    { metric: 'Recovery factor', value: metrics.recoveryFactor },
    { metric: 'Max drawdown', value: metrics.maxDrawdown },
    { metric: 'Consistency', value: metrics.consistency },
  ];

  const color = overall >= 70 ? '#16a34a' : overall >= 40 ? '#eab308' : '#ef4444';

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-4">
      <h3 className="font-semibold text-gray-900 mb-1 text-sm">Trader Score</h3>
      <p className="text-xs text-gray-400 mb-3">
        Our own composite score across six dimensions of trading quality — not an official industry
        metric, just a way to see your overall balance at a glance.
      </p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="70%">
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#6b7280' }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2">
        <div className="text-xs text-gray-400 mb-1">Overall score</div>
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold" style={{ color }}>
            {overall.toFixed(1)}
          </div>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${overall}%`, backgroundColor: color }} />
          </div>
        </div>
      </div>
    </div>
  );
}
