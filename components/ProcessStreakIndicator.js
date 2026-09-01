'use client';

import { computeProcessStreak } from '../lib/streaks';

export default function ProcessStreakIndicator({ trades }) {
  const { count, type, totalTagged, totalTrades } = computeProcessStreak(trades);

  const untagged = totalTrades - totalTagged;
  const nudge =
    untagged > 0 ? (
      <div className="text-[10px] text-gray-400 mt-1">{untagged} untagged</div>
    ) : null;

  if (count === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3 flex flex-col items-center justify-center text-center">
        <div className="text-xs text-gray-400 mb-1">Process Streak</div>
        <div className="text-lg font-semibold text-gray-400">—</div>
        {nudge}
      </div>
    );
  }

  const isGood = type === 'followed';
  return (
    <div
      className={`rounded-2xl shadow-sm p-3 flex flex-col items-center justify-center text-center border ${
        isGood ? 'bg-indigo-50 border-indigo-200' : 'bg-orange-50 border-orange-200'
      }`}
    >
      <div className="text-xs text-gray-400 mb-1">Process Streak</div>
      <div className={`text-lg font-bold ${isGood ? 'text-indigo-600' : 'text-orange-600'}`}>
        {isGood ? '🎯' : '⚠️'} {count} {isGood ? 'Followed' : 'Broken'}
      </div>
      {nudge}
    </div>
  );
}
