'use client';

import { useMemo } from 'react';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function computeInsights(trades) {
  const insights = [];
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const closed = trades.filter(
    (t) => t.exit_price !== null && t.exit_price !== undefined && t.entry_time && new Date(t.entry_time) >= weekAgo
  );

  if (closed.length === 0) return insights;

  // --- Worst / best weekday this week ---
  const byDay = {};
  for (const t of closed) {
    const day = new Date(t.entry_time).getDay();
    if (!byDay[day]) byDay[day] = { pnl: 0, count: 0 };
    byDay[day].pnl += Number(t.pnl || 0);
    byDay[day].count += 1;
  }
  const dayEntries = Object.entries(byDay);
  if (dayEntries.length > 0) {
    const worst = dayEntries.sort((a, b) => a[1].pnl - b[1].pnl)[0];
    if (worst[1].pnl < 0) {
      insights.push({
        text: `${WEEKDAYS[worst[0]]} was your worst day this week: -$${Math.abs(worst[1].pnl).toFixed(2)} across ${worst[1].count} trade${worst[1].count !== 1 ? 's' : ''}.`,
        tone: 'warn',
      });
    }
  }

  // --- Revenge-trading pattern: re-entry within 15 min of a losing trade's close ---
  const sorted = [...closed].sort((a, b) => new Date(a.entry_time) - new Date(b.entry_time));
  let quickReentries = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (Number(prev.pnl) < 0 && prev.exit_time) {
      const minutesGap = (new Date(curr.entry_time) - new Date(prev.exit_time)) / 60000;
      if (minutesGap >= 0 && minutesGap <= 15) quickReentries++;
    }
  }
  if (quickReentries > 0) {
    insights.push({
      text: `${quickReentries} trade${quickReentries !== 1 ? 's' : ''} this week opened within 15 minutes of a losing trade — worth checking if that was plan or impulse.`,
      tone: 'warn',
    });
  }

  // --- Overtrading day: most trades in a single day, and it lost money ---
  const busiestDay = dayEntries.sort((a, b) => b[1].count - a[1].count)[0];
  if (busiestDay && busiestDay[1].count >= 5 && busiestDay[1].pnl < 0) {
    insights.push({
      text: `${WEEKDAYS[busiestDay[0]]} had your most trades (${busiestDay[1].count}) and ended negative — high activity didn't convert to results.`,
      tone: 'warn',
    });
  }

  // --- Best symbol this week ---
  const bySymbol = {};
  for (const t of closed) {
    if (!t.symbol) continue;
    bySymbol[t.symbol] = (bySymbol[t.symbol] || 0) + Number(t.pnl || 0);
  }
  const symbolEntries = Object.entries(bySymbol);
  if (symbolEntries.length > 1) {
    const best = symbolEntries.sort((a, b) => b[1] - a[1])[0];
    if (best[1] > 0) {
      insights.push({
        text: `${best[0]} was your strongest symbol this week: +$${best[1].toFixed(2)}.`,
        tone: 'good',
      });
    }
  }

  // --- Positive: good weekday ---
  if (dayEntries.length > 0) {
    const best = dayEntries.sort((a, b) => b[1].pnl - a[1].pnl)[0];
    if (best[1].pnl > 0 && insights.length < 2) {
      insights.push({
        text: `${WEEKDAYS[best[0]]} was your best day this week: +$${best[1].pnl.toFixed(2)}.`,
        tone: 'good',
      });
    }
  }

  return insights.slice(0, 3);
}

const TONES = {
  warn: {
    chip: 'bg-amber-500/10 border-amber-500/25 text-amber-200',
    dot: 'bg-amber-400',
  },
  good: {
    chip: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200',
    dot: 'bg-emerald-400',
  },
};

export default function WeeklyInsights({ trades }) {
  const insights = useMemo(() => computeInsights(trades), [trades]);

  if (insights.length === 0) return null;

  return (
    <div className="bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-4 mb-6 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
        <h3 className="font-semibold text-neutral-100 text-sm">This week's patterns</h3>
        <span className="ml-auto text-[11px] text-neutral-500">Last 7 days</span>
      </div>
      <div className="space-y-2">
        {insights.map((insight, i) => {
          const tone = TONES[insight.tone] || TONES.good;
          return (
            <div
              key={i}
              className={`flex items-start gap-2.5 text-[13px] leading-snug rounded-xl px-3 py-2.5 border animate-fade-in-up ${tone.chip}`}
              style={{ animationDelay: `${80 + i * 70}ms` }}
            >
              <span className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${tone.dot}`} />
              <span>{insight.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
