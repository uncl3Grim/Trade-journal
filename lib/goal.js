import { format, startOfDay, subDays, differenceInCalendarDays, addDays } from 'date-fns';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const isClosed = (t) => t.exit_price !== null && t.exit_price !== undefined;
const closeMs = (t) => new Date(t.exit_time || t.entry_time || 0).getTime();
const dayOf = (t) => format(new Date(closeMs(t)), 'yyyy-MM-dd');

// Plain arithmetic on the trader's own closed trades. Nothing here predicts the future.
export function computeGoal(trades, { target = 50000, withdrawn = 0, deadline = null, balanceNow = null, windowDays = 30, now = new Date() } = {}) {
  const closed = (trades || []).filter((t) => isClosed(t) && (t.exit_time || t.entry_time)).sort((a, b) => closeMs(a) - closeMs(b));
  const remaining = Math.max(0, target - withdrawn);
  const progress = target > 0 ? Math.min(100, (withdrawn / target) * 100) : 0;
  const base = { n: closed.length, target, withdrawn, remaining, progress, flags: [] };
  if (!closed.length) return base;

  // Recent window (falls back to all trades when there are fewer than 5 recent ones)
  const since = subDays(startOfDay(now), windowDays - 1).getTime();
  let win = closed.filter((t) => closeMs(t) >= since);
  let windowLabel = `last ${windowDays} days`;
  if (win.length < 5) {
    win = closed;
    windowLabel = 'all your trades';
  }

  const byDay = new Map();
  for (const t of win) byDay.set(dayOf(t), (byDay.get(dayOf(t)) || 0) + num(t.pnl));
  const tradingDays = byDay.size;
  const pnl = win.reduce((s, t) => s + num(t.pnl), 0);
  const first = new Date(closeMs(win[0]));
  const last = new Date(closeMs(win[win.length - 1]));
  const spanDays = Math.max(1, differenceInCalendarDays(last, first) + 1);
  const tradingDaysPerWeek = Math.min(7, (tradingDays / spanDays) * 7);
  const perTradingDay = pnl / tradingDays;

  const wins = win.filter((t) => num(t.pnl) > 0);
  const losses = win.filter((t) => num(t.pnl) < 0);
  const avgWin = wins.length ? wins.reduce((s, t) => s + num(t.pnl), 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + num(t.pnl), 0)) / losses.length : 0;

  // How much of ALL profit came from the single best day
  const allByDay = new Map();
  for (const t of closed) allByDay.set(dayOf(t), (allByDay.get(dayOf(t)) || 0) + num(t.pnl));
  const netAll = closed.reduce((s, t) => s + num(t.pnl), 0);
  const bestDay = Math.max(...allByDay.values());
  const topDayShare = netAll > 0 && bestDay > 0 ? bestDay / netAll : null;

  const avgLossPct = balanceNow && avgLoss ? (avgLoss / balanceNow) * 100 : null;
  const fiveLossPct = avgLossPct !== null ? (1 - Math.pow(1 - avgLossPct / 100, 5)) * 100 : null;

  // Pace projection
  const project = (perDay) => {
    if (!(perDay > 0)) return null;
    if (remaining === 0) return { tradingDays: 0, calendarDays: 0, date: now };
    const td = Math.ceil(remaining / perDay);
    const cal = Math.ceil((td * 7) / Math.max(0.5, tradingDaysPerWeek));
    return { tradingDays: td, calendarDays: cal, date: addDays(now, cal) };
  };
  const atPace = project(perTradingDay);
  const atHalf = project(perTradingDay / 2);

  // Required pace to hit a date
  let required = null;
  if (deadline && remaining > 0) {
    const daysLeft = differenceInCalendarDays(deadline, now);
    if (daysLeft >= 1) {
      const tdLeft = Math.max(1, Math.round((daysLeft * Math.max(0.5, tradingDaysPerWeek)) / 7));
      const perDay = remaining / tdLeft;
      required = { daysLeft, tradingDaysLeft: tdLeft, perDay, pctOfBalance: balanceNow ? (perDay / balanceNow) * 100 : null, vsCurrent: perTradingDay > 0 ? perDay / perTradingDay : null };
    } else {
      required = { daysLeft: 0 };
    }
  }

  const flags = [];
  if (closed.length < 30) flags.push({ level: 'info', text: `Only ${closed.length} closed trades so far. Treat every projection here as rough.` });
  if (topDayShare !== null && topDayShare > 0.5) flags.push({ level: 'warn', text: `${Math.round(topDayShare * 100)}% of your total profit came from a single day, so your recent pace may not repeat.` });
  if (avgLossPct !== null && avgLossPct > 3) flags.push({ level: 'warn', text: `Your average loss is ${avgLossPct.toFixed(1)}% of your balance. Five losses in a row would cost about ${fiveLossPct.toFixed(0)}%.` });
  if (required?.pctOfBalance > 2) flags.push({ level: 'warn', text: `Hitting that date needs about ${required.pctOfBalance.toFixed(1)}% of your balance every trading day. Raising your size to chase a deadline is how accounts get wiped out.` });
  if (!(perTradingDay > 0)) flags.push({ level: 'info', text: 'Your recent average per trading day is flat or negative, so there is no pace to project yet.' });

  return {
    ...base,
    windowLabel,
    tradingDays,
    tradingDaysPerWeek,
    perTradingDay,
    winRate: (wins.length / win.length) * 100,
    avgWin,
    avgLoss,
    expectancy: pnl / win.length,
    tradesPerDay: win.length / tradingDays,
    windowTrades: win.length,
    atPace,
    atHalf,
    required,
    topDayShare,
    avgLossPct,
    flags,
  };
}
