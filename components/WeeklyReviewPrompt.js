'use client';

import { generateWeeklyReviewText } from '../lib/weeklyReview';

export default function WeeklyReviewPrompt({ trades }) {
  const lines = generateWeeklyReviewText(trades);
  if (!lines || lines.length === 0) return null;

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-4 flex gap-3 items-start">
      <div className="text-lg">💡</div>
      <div>
        <div className="text-xs font-semibold text-indigo-700 mb-1">This week's observation</div>
        {lines.map((line, i) => (
          <p key={i} className="text-xs text-gray-600">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
