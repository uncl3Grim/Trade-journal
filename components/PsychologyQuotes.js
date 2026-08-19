'use client';

import { useState } from 'react';

const QUOTES = [
  { text: 'Amateurs focus on being right. Professionals focus on managing risk.', author: 'Trading wisdom' },
  { text: 'Cut losses short, let winners run — the oldest rule, still the hardest to follow.', author: 'Jesse Livermore (paraphrased)' },
  { text: 'Trading is a game of probabilities, not certainties. Think in edges, not outcomes.', author: 'Mark Douglas (paraphrased)' },
  { text: 'The elements of good trading: cutting losses, cutting losses, and cutting losses.', author: 'Ed Seykota (paraphrased)' },
  { text: 'Every trade is just one of your next thousand. No single trade should carry your emotions.', author: 'Mark Douglas (paraphrased)' },
  { text: 'Plan the trade. Trade the plan.', author: 'Trading wisdom' },
  { text: 'Wait for liquidity to be taken before trusting the move. Patience beats prediction.', author: 'ICT principle' },
  { text: 'The kill zone rewards preparation, not impulse. Most losses come from trading outside your window.', author: 'ICT principle' },
  { text: 'A shift in structure means nothing until price actually confirms it with a real close.', author: 'ICT principle' },
  { text: 'Know where price is being drawn to before you enter — trade toward liquidity, not hope.', author: 'ICT principle' },
  { text: 'Journaling is the fastest path from repeating mistakes to repeating what works.', author: 'Trading wisdom' },
  { text: 'Risk management is the only edge that survives every market regime.', author: 'Alexander Elder (paraphrased)' },
  { text: 'The market doesn\'t care what you think — it only responds to what you do.', author: 'Trading wisdom' },
];

export default function PsychologyQuotes() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (dismissed) return null;
  const quote = QUOTES[index];

  function next() {
    setIndex((i) => (i + 1) % QUOTES.length);
  }

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-4 right-4 w-11 h-11 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center text-lg z-30"
        title="Trading mindset"
      >
        💭
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-xs bg-white border border-gray-200 rounded-2xl shadow-lg p-4 z-30">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-xs font-semibold text-indigo-600">💭 Mindset</span>
        <div className="flex gap-2">
          <button onClick={() => setCollapsed(true)} className="text-gray-300 hover:text-gray-500 text-xs">
            −
          </button>
          <button onClick={() => setDismissed(true)} className="text-gray-300 hover:text-gray-500 text-xs">
            ✕
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-700 italic leading-snug mb-2">"{quote.text}"</p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400">— {quote.author}</span>
        <button onClick={next} className="text-[10px] text-indigo-500 hover:text-indigo-400">
          Next →
        </button>
      </div>
    </div>
  );
}
