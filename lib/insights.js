import { format } from 'date-fns';
import { rMultiple } from './tradeMath';

function valueForMode(trade, mode, defaultRiskAmount) {
  if (mode === 'r') {
    const r = rMultiple(trade, defaultRiskAmount);
    return r === null ? 0 : r;
  }
  return Number(trade.pnl || 0);
}

export function computeInsights(trades, mode, defaultRiskAmount) {
  const closed = trades.filter((t) => t.exit_price !== null && t.exit_price !== undefined && t.entry_time);

  const total = closed.reduce((s, t) => s + valueForMode(t, mode, defaultRiskAmount), 0);

  const weekdayMap = {};
  for (const t of closed) {
    const day = format(new Date(t.entry_time), 'EEE');
    weekdayMap[day] = (weekdayMap[day] || 0) + valueForMode(t, mode, defaultRiskAmount);
  }
  const weekdayEntries = Object.entries(weekdayMap);
  const bestWeekday = weekdayEntries.length ? weekdayEntries.reduce((a, b) => (b[1] > a[1] ? b : a)) : null;

  const byDay = {};
  for (const t of closed) {
    const day = format(new Date(t.entry_time), 'yyyy-MM-dd');
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(t);
  }

  const bucketMap = {};
  for (const day in byDay) {
    const dayTrades = byDay[day];
    const n = dayTrades.length;
    const val = dayTrades.reduce((s, t) => s + valueForMode(t, mode, defaultRiskAmount), 0);
    if (!bucketMap[n]) bucketMap[n] = 0;
    bucketMap[n] += val;
  }
  const bucketEntries = Object.entries(bucketMap);
  const worstBucket = bucketEntries.length ? bucketEntries.reduce((a, b) => (b[1] < a[1] ? b : a)) : null;

  const ifSkippedTotal = worstBucket ? total - worstBucket[1] : null;
  const suffix = mode === 'r' ? 'R' : '';

  return {
    strength: bestWeekday ? { label: `Your best weekday is ${bestWeekday[0]}`, value: bestWeekday[1] } : null,
    leak: worstBucket ? { label: `You lose on days with ${worstBucket[0]} trades`, value: worstBucket[1] } : null,
    ifSkipped: worstBucket
      ? {
          value: -worstBucket[1],
          note: `If we exclude days with ${worstBucket[0]} trades: total would be ${ifSkippedTotal.toFixed(2)}${suffix} instead of ${total.toFixed(2)}${suffix}`,
        }
      : null,
  };
}
