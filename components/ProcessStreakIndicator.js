'use client';

import { computeProcessStreak } from '../lib/streaks';

export default function ProcessStreakIndicator({ trades }) {
  const { count, type, totalTagged, totalTrades } = computeProcessStreak(trades);

  const untagged = totalTrades - totalTagged;
  const nudge =
    untagged > 0 ? (
      <div className="text-[10px] text-neutral-500 mt-1">{untagged} untagged</div>
    ) : null;

  if (count === 0) {
    return (
      <div className="bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
        <div className="text-xs text-neutral-500 mb-1">Process Streak</div>
        <div className="text-lg font-semibold text-neutral-500">—</div>
        {nudge}
      </div>
    );
  }

  const isGood = type === 'followed';
  return (
    <div
      className={`rounded-2xl backdrop-blur-md p-3 flex flex-col items-center justify-center text-center border ${
        isGood ? 'bg-indigo-500/10 border-indigo-400/30' : 'bg-orange-500/10 border-orange-400/30'
      }`}
    >
      <div className="text-xs text-neutral-500 mb-1">Process Streak</div>
      <div className={`text-lg font-bold ${isGood ? 'text-indigo-400' : 'text-orange-400'}`}>
        {isGood ? '🎯' : '⚠️'} {count} {isGood ? 'Followed' : 'Broken'}
      </div>
      {nudge}
    </div>
  );
}
