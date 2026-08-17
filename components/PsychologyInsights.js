'use client';

import { computeEmotionBreakdown, detectRevengeTrades } from '../lib/psychology';

export default function PsychologyInsights({ trades }) {
  const emotionRows = computeEmotionBreakdown(trades);
  const revenge = detectRevengeTrades(trades);
  const maxAbs = Math.max(1, ...emotionRows.map((r) => Math.abs(r.pnl)));

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-4">
      <h3 className="font-semibold text-gray-900 mb-1 text-sm">Psychology</h3>
      <p className="text-xs text-gray-400 mb-4">
        How your mindset tags and impulsive re-entries connect to your results.
      </p>

      {revenge.count > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
          <div className="text-xs font-medium text-red-600 mb-1">
            ⚠ {revenge.count} possible revenge trade{revenge.count !== 1 ? 's' : ''} detected
          </div>
          <div className="text-xs text-gray-600">
            Entered within 20 min of a loss, sized up from the previous trade. Combined result:{' '}
            <span className={revenge.totalCost >= 0 ? 'text-green-600' : 'text-red-500'}>
              {revenge.totalCost >= 0 ? '+' : ''}
              {revenge.totalCost.toFixed(2)}
            </span>{' '}
            · Win rate {revenge.winRate.toFixed(0)}%
          </div>
        </div>
      )}

      {emotionRows.length === 0 ? (
        <p className="text-xs text-gray-400">Tag trades with an emotion to see this breakdown.</p>
      ) : (
        <div>
          <div className="text-xs text-gray-400 mb-2">By emotion tag</div>
          {emotionRows.map((r) => {
            const pct = Math.min(100, (Math.abs(r.pnl) / maxAbs) * 100);
            const isPos = r.pnl >= 0;
            return (
              <div key={r.label} className="flex items-center gap-3 py-1.5">
                <div className="w-24 text-xs text-gray-500 flex-shrink-0 capitalize">
                  {r.label} <span className="text-gray-300">{r.count}</span>
                </div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isPos ? 'bg-green-400' : 'bg-red-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="w-24 text-right text-xs">
                  <span className={`font-medium ${isPos ? 'text-green-600' : 'text-red-500'}`}>
                    {isPos ? '+' : ''}
                    {r.pnl.toFixed(2)}
                  </span>
                  <span className="text-gray-400"> · {r.winRate.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
