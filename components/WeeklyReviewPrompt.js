'use client';

import { generateWeeklyReviewText } from '../lib/weeklyReview';

export default function WeeklyReviewPrompt({ trades }) {
  const lines = generateWeeklyReviewText(trades);
  if (!lines || lines.length === 0) return null;

  return (
    <div className="bg-indigo-500/10 backdrop-blur-md border border-indigo-500/20 rounded-2xl p-4 mb-4 flex gap-3 items-start">
      <div className="text-lg">💡</div>
      <div>
        <div className="text-xs font-semibold text-indigo-300 mb-1">This week's observation</div>
        {lines.map((line, i) => (
          <p key={i} className="text-xs text-neutral-400">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
