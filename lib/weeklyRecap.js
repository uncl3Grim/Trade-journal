import { startOfWeek, addDays, endOfDay, isSameDay, format } from 'date-fns';
import { rMultiple } from './tradeMath';
import { tradeProcess, mistakesOf } from './coach';

// Builds the recap for whichever week `anchorDate` falls in (Monday start).
// The grid always shows all 7 days (Mon–Sun), even when Saturday and Sunday
// have no trades, so the recap card is the same length every week.
// Pass `mode` ('dollar' | 'r') to control which metric drives the "best day"
// pick and the headline total.
export function computeWeeklyRecap(trades, anchorDate, defaultRiskAmount, mode = 'dollar') {
  const weekStart = startOfWeek(anchorDate, { weekStartsOn: 1 });
  const allDays = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(weekStart, i));
  const weekEndOfSunday = endOfDay(allDays[6]);

  const closed = trades.filter((t) => t.entry_time && t.exit_price !== null && t.exit_price !== undefined);
  const inWeek = closed.filter((t) => {
    const d = new Date(t.entry_time);
    return d >= weekStart && d <= weekEndOfSunday;
  });

  const weekDays = allDays;

  const days = weekDays.map((date) => {
    const dayTrades = inWeek.filter((t) => isSameDay(new Date(t.entry_time), date));
    const pnl = dayTrades.reduce((s, t) => s + Number(t.pnl || 0), 0);
    const rValues = dayTrades.map((t) => rMultiple(t, defaultRiskAmount)).filter((r) => r !== null);
    const r = rValues.reduce((s, v) => s + v, 0);
    const wins = dayTrades.filter((t) => Number(t.pnl) > 0).length;
    const dow = date.getDay();
    return {
      date,
      label: format(date, 'EEE'),
      dateLabel: format(date, 'MMM d'),
      isWeekend: dow === 0 || dow === 6,
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
  const losses = inWeek.filter((t) => Number(t.pnl) < 0).length;
  const winRate = totalTrades ? Math.round((wins / totalTrades) * 100) : 0;
  const avgR = rValues.length ? totalR / rValues.length : 0;

  const activeDays = days.filter((d) => d.trades > 0);
  const bestDay = activeDays.length
    ? activeDays.reduce((best, d) => ((mode === 'r' ? d.r : d.pnl) > (mode === 'r' ? best.r : best.pnl) ? d : best))
    : null;
  const greenDays = activeDays.filter((d) => (mode === 'r' ? d.r : d.pnl) > 0).length;

  // Running total across the week, starting from zero (one point per active day).
  let runP = 0;
  let runR = 0;
  const curve = [0, ...activeDays.map((d) => (runP += d.pnl))];
  const curveR = [0, ...activeDays.map((d) => (runR += d.r))];

  // Last week, so the card can say whether this one was better.
  const prevStart = addDays(weekStart, -7);
  const prevEnd = endOfDay(addDays(weekStart, -1));
  const prevTrades = closed.filter((t) => {
    const d = new Date(t.entry_time);
    return d >= prevStart && d <= prevEnd;
  });
  const prev = prevTrades.length
    ? {
        trades: prevTrades.length,
        pnl: prevTrades.reduce((s, t) => s + Number(t.pnl || 0), 0),
        r: prevTrades.map((t) => rMultiple(t, defaultRiskAmount)).filter((r) => r !== null).reduce((s, v) => s + v, 0),
      }
    : null;

  // Process: how well the week followed the trader's own rules (null when nothing was recorded).
  const scores = inWeek.map(tradeProcess).filter((s) => s !== null);
  const processScore = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : null;
  const rated = inWeek.filter((t) => t.rule_adherence);
  const mistakeTrades = inWeek.filter((t) => mistakesOf(t).length > 0);
  const mistakeCost = mistakeTrades.reduce((s, t) => s + (Number(t.pnl) < 0 ? Math.abs(Number(t.pnl)) : 0), 0);

  let verdict = null;
  if (processScore !== null && totalPnl !== 0) {
    const clean = processScore >= 80;
    if (totalPnl > 0) verdict = clean ? 'Green week and the process held.' : 'Green week, but the rules slipped. Tighten up before you size up.';
    else verdict = clean ? 'Red week with a clean process. Stay with it.' : 'Red week and the rules slipped. Review the mistakes below.';
  }

  return {
    weekStart,
    weekEnd: weekDays[weekDays.length - 1],
    days,
    includesWeekend: true,
    totalTrades,
    totalPnl,
    totalR,
    winRate,
    avgR,
    bestDay,
    activeDayCount: activeDays.length,
    wins,
    losses,
    greenDays,
    curve,
    curveR,
    prev,
    process: {
      score: processScore,
      tracked: scores.length,
      planRated: rated.length,
      planFollowed: rated.filter((t) => t.rule_adherence === 'followed_plan').length,
      mistakeCount: mistakeTrades.length,
      mistakeCost,
    },
    verdict,
  };
}
