import { computeBreakdowns } from './breakdowns';

function expandDay(short) {
  const map = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
  return map[short] || short;
}

export function generateWeeklyReviewText(trades) {
  const b = computeBreakdowns(trades);
  if (!b.byWeekday.length) return null;

  const worst = b.byWeekday.reduce((a, c) => (c.pnl < a.pnl ? c : a));
  const best = b.byWeekday.reduce((a, c) => (c.pnl > a.pnl ? c : a));

  const lines = [];
  if (worst.pnl < 0) {
    lines.push(
      `${expandDay(worst.label)}s are your worst day: ${worst.pnl.toFixed(2)} over ${worst.count} trade${worst.count !== 1 ? 's' : ''}.`
    );
  }
  if (best.pnl > 0) {
    lines.push(
      `${expandDay(best.label)}s are your best day: +${best.pnl.toFixed(2)} over ${best.count} trade${best.count !== 1 ? 's' : ''}.`
    );
  }
  return lines;
}
