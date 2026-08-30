'use client';

import { useEffect, useState } from 'react';

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
  { text: 'Don\'t make the next trade pay for the last one.', author: 'Trading wisdom' },
  { text: 'Stop asking "will this trade win?" Ask, "does this trade belong in my system?"', author: 'Trading wisdom' },
  { text: 'Execute the setup. Accept the outcome.', author: 'Trading wisdom' },
  { text: 'When you achieve complete acceptance of the uncertainty of each edge and the uniqueness of each moment, your frustration with trading will end.', author: 'Mark Douglas (paraphrased)' },
  { text: 'The hard, cold reality of trading is that every trade has an uncertain outcome.', author: 'Trading wisdom' },
  { text: 'Don\'t let the wins get to your head, or let the losses get to your heart.', author: 'Trading wisdom' },
  { text: 'Trading is behavior management. Fix your habits, fix your results.', author: 'Trading wisdom' },
  { text: 'Make a change, or just quit.', author: 'Trading wisdom' },
  { text: 'A planned trade with a small loss is a win. A reckless win is a future loss in disguise.', author: 'Trading wisdom' },
  { text: 'Detach from needing to win.', author: 'Trading wisdom' },
  { text: 'Your edge is not your strategy. Your edge is self-control.', author: 'Trading wisdom' },
  { text: 'You don\'t need to win — you need to last.', author: 'Trading wisdom' },
  { text: 'Process over profits.', author: 'Trading wisdom' },
  { text: 'Position size is a risk decision, not a confidence decision.', author: 'Trading wisdom' },
  { text: 'The trade you didn\'t take is never a loss.', author: 'Trading wisdom' },
  { text: 'Your stop loss isn\'t optional — it\'s the price of admission.', author: 'Trading wisdom' },
  { text: 'Overtrading is fear dressed up as opportunity.', author: 'Trading wisdom' },
  { text: 'A losing streak tests your system. A winning streak tests your discipline.', author: 'Trading wisdom' },
  { text: 'Consistency beats intensity — small edges compound.', author: 'Trading wisdom' },
  { text: 'If you wouldn\'t take the trade on paper, don\'t take it live.', author: 'Trading wisdom' },
  { text: 'Boredom is not a setup.', author: 'Trading wisdom' },
  { text: 'The market doesn\'t owe you a trade today.', author: 'Trading wisdom' },
  { text: 'Revenge trading is the fastest way to turn one loss into three.', author: 'Trading wisdom' },
  { text: 'Your worst trades are usually the ones you didn\'t plan.', author: 'Trading wisdom' },
  { text: 'Discipline is remembering what you decided when you were calm.', author: 'Trading wisdom' },
  { text: 'Confidence comes from your process, not your last trade.', author: 'Trading wisdom' },
  { text: 'Every rule you break costs more than the trade it was protecting.', author: 'Trading wisdom' },
  { text: 'Small, repeatable wins build a career. Big, lucky wins build overconfidence.', author: 'Trading wisdom' },
  { text: 'Manage risk first. Manage profit second.', author: 'Trading wisdom' },
  { text: 'The goal isn\'t to be right. The goal is to make money when you\'re right and lose little when you\'re wrong.', author: 'Trading wisdom' },
  { text: 'A good trader loses well.', author: 'Trading wisdom' },
  { text: 'Patience is a position too.', author: 'Trading wisdom' },
  { text: 'Journal the process, not just the P&L.', author: 'Trading wisdom' },
];

const FAVORITE_WEIGHT = 3;

function loadFavorites() {
  try {
    const saved = localStorage.getItem('tj_quote_favorites');
    if (saved) return new Set(JSON.parse(saved));
  } catch {}
  return new Set();
}

function pickWeightedIndex(favorites, excludeIndex = null) {
  const weights = QUOTES.map((_, i) => (favorites.has(i) ? FAVORITE_WEIGHT : 1));
  const total = weights.reduce((a, b) => a + b, 0);

  for (let attempt = 0; attempt < 8; attempt++) {
    let r = Math.random() * total;
    let chosen = weights.length - 1;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        chosen = i;
        break;
      }
    }
    if (chosen !== excludeIndex || QUOTES.length === 1) return chosen;
  }
  return excludeIndex;
}

export default function PsychologyQuotes() {
  const [favorites, setFavorites] = useState(new Set());
  const [index, setIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = loadFavorites();
    setFavorites(saved);
    setIndex(pickWeightedIndex(saved));
  }, []);

  if (dismissed) return null;
  const quote = QUOTES[index];
  const isFavorite = favorites.has(index);

  function next() {
    setIndex((i) => pickWeightedIndex(favorites, i));
  }

  function toggleFavorite() {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      try {
        localStorage.setItem('tj_quote_favorites', JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-20 md:bottom-4 right-4 w-11 h-11 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center text-lg z-30"
        title="Trading mindset"
      >
        💭
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 max-w-xs bg-white dark:bg-[#15151b] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg p-4 z-30">
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
      <p className="text-sm text-gray-700 dark:text-gray-200 italic leading-snug mb-2">"{quote.text}"</p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400">— {quote.author}</span>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleFavorite}
            className={`text-sm ${isFavorite ? 'text-yellow-500' : 'text-gray-300 hover:text-gray-400'}`}
            title={isFavorite ? 'Unfavorite' : 'Favorite — show this one more often'}
          >
            {isFavorite ? '★' : '☆'}
          </button>
          <button onClick={next} className="text-[10px] text-indigo-500 hover:text-indigo-400">
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
