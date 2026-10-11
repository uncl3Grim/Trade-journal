'use client';

import { computeCurrentStreak } from '../lib/streaks';

export default function StreakIndicator({ trades }) {
  const { count, type } = computeCurrentStreak(trades);

  if (count === 0) {
    return (
      <div className="bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
        <div className="text-xs text-neutral-500 mb-1">Current Streak</div>
        <div className="text-lg font-semibold text-neutral-500">—</div>
      </div>
    );
  }

  const isWin = type === 'win';
  return (
    <div
      className={`rounded-2xl backdrop-blur-md p-3 flex flex-col items-center justify-center text-center border ${
        isWin ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'
      }`}
    >
      <div className="text-xs text-neutral-500 mb-1">Current Streak</div>
      <div className={`text-lg font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isWin ? '🔥' : '❄️'} {count} {isWin ? 'Win' : 'Loss'}{count !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
