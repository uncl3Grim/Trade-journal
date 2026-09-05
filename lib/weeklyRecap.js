import { startOfWeek, addDays, endOfDay, isSameDay, format } from 'date-fns';
import { rMultiple } from './tradeMath';

// Builds a Mon–Fri recap (matching the trading week) for whichever week
// `anchorDate` falls in. Pass `mode` ('dollar' | 'r') to control which
// metric drives the "best day" pick and the headline total.
export function computeWeeklyRecap(trades, anchorDate, defaultRiskAmount, mode = 'dollar') {
  const weekStart = startOfWeek(anchorDate, { weekStartsOn: 1 });
  const weekDays = [0, 1, 2, 3, 4].map((i) => addDays(weekStart, i));
  const weekEnd = endOfDay(weekDays[4]);

  const closed = trades.filter((t) => t.entry_time && t.exit_price !== null && t.exit_price !== undefined);
  const inWeek = closed.filter((t) => {
    const d = new Date(t.entry_time);
    return d >= weekStart && d <= weekEnd;
  });

  const days = weekDays.map((date) => {
    const dayTrades = inWeek.filter((t) => isSameDay(new Date(t.entry_time), date));
    const pnl = dayTrades.reduce((s, t) => s + Number(t.pnl || 0), 0);
    const rValues = dayTrades.map((t) => rMultiple(t, defaultRiskAmount)).filter((r) => r !== null);
    const r = rValues.reduce((s, v) => s + v, 0);
    const wins = dayTrades.filter((t) => Number(t.pnl) > 0).length;
    return {
      date,
      label: format(date, 'EEE'),
      dateLabel: format(date, 'MMM d'),
      trades: dayTrades.length,
      pnl,
      r,
      winRate: dayTrades.length ? Math.round((wins / dayTrades.length) * 100) : null,
    };
  });

  const totalTrades = inWeek.length;
  const totalPnl = inWeek.reduce((s, t) => s + Number(t.pnl || 0), 0);
  const rValues = inWeek.map((t) => rMultiple(t, defaultRiskAmount)).filter((r) => r !== null);
  const totalR = rValues.reduce((s, v) => s + v, 0);
  const wins = inWeek.filter((t) => Number(t.pnl) > 0).length;
  const winRate = totalTrades ? Math.round((wins / totalTrades) * 100) : 0;
  const avgR = rValues.length ? totalR / rValues.length : 0;

  const activeDays = days.filter((d) => d.trades > 0);
  const bestDay = activeDays.length
    ? activeDays.reduce((best, d) => ((mode === 'r' ? d.r : d.pnl) > (mode === 'r' ? best.r : best.pnl) ? d : best))
    : null;

  return {
    weekStart,
    weekEnd: weekDays[4],
    days,
    totalTrades,
    totalPnl,
    totalR,
    winRate,
    avgR,
    bestDay,
    activeDayCount: activeDays.length,
  };
}
