'use client';

import { computeCurrentStreak } from '../lib/streaks';

export default function StreakIndicator({ trades }) {
  const { count, type } = computeCurrentStreak(trades);

  if (count === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3 flex flex-col items-center justify-center text-center">
        <div className="text-xs text-gray-400 mb-1">Current Streak</div>
        <div className="text-lg font-semibold text-gray-400">—</div>
      </div>
    );
  }

  const isWin = type === 'win';
  return (
    <div
      className={`rounded-2xl shadow-sm p-3 flex flex-col items-center justify-center text-center border ${
        isWin ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}
    >
      <div className="text-xs text-gray-400 mb-1">Current Streak</div>
      <div className={`text-lg font-bold ${isWin ? 'text-green-600' : 'text-red-500'}`}>
        {isWin ? '🔥' : '❄️'} {count} {isWin ? 'Win' : 'Loss'}{count !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
