import { format } from 'date-fns';
import { computeDrawdown } from './drawdown';

export function computePropFirmCompliance(trades, startingBalance, rules) {
  if (!startingBalance || startingBalance <= 0) return null;

  const mode = rules.mode || 'trailing';

  const closed = trades
    .filter((t) => t.exit_price !== null && t.exit_price !== undefined && t.entry_time)
    .slice()
    .sort((a, b) => new Date(a.entry_time) - new Date(b.entry_time));

  const byDay = {};
  for (const t of closed) {
    const key = format(new Date(t.entry_time), 'yyyy-MM-dd');
    byDay[key] = (byDay[key] || 0) + Number(t.pnl || 0);
  }
  const days = Object.keys(byDay).sort();

  // Walk day-by-day so we know each day's STARTING balance (yesterday's
  // ending balance) — this is what a prop firm's daily loss limit is
  // actually measured against, not the account's initial balance.
  let runningBalance = startingBalance;
  const dailyBreaches = [];
  let worstDailyLossPct = 0;
  const dayStartBalances = {}; // day -> balance at the start of that day

  for (const day of days) {
    dayStartBalances[day] = runningBalance;
    const dayStartBalance = runningBalance;
    const dayPnl = byDay[day];
    const dayLossPct = dayPnl < 0 ? (Math.abs(dayPnl) / dayStartBalance) * 100 : 0;
    if (dayLossPct > worstDailyLossPct) worstDailyLossPct = dayLossPct;
    if (rules.dailyLossLimitPct && dayLossPct >= rules.dailyLossLimitPct) {
      dailyBreaches.push({ day, dayPnl, dayLossPct });
    }
    runningBalance += dayPnl;
  }

  const totalPnl = closed.reduce((s, t) => s + Number(t.pnl || 0), 0);
  const currentBalance = startingBalance + totalPnl;
  const profitPct = (totalPnl / startingBalance) * 100;

  const dd = computeDrawdown(trades, mode);
  const maxDrawdownPct = (dd.maxDrawdown / startingBalance) * 100;
  const currentDrawdownPct = (dd.currentDrawdown / startingBalance) * 100;

  const maxDdBreached = rules.maxLossLimitPct ? maxDrawdownPct >= rules.maxLossLimitPct : false;
  const profitTargetHit = rules.profitTargetPct ? profitPct >= rules.profitTargetPct : false;

  // --- Max loss limit, expressed as an actual dollar breach level ---
  // The limit's SIZE is always a fixed % of the account's initial balance
  // (e.g. "4% of $10,000 = $400"), regardless of mode. What moves is the
  // ANCHOR the limit is measured from:
  //   trailing -> anchored to the high-water mark (highest balance ever reached)
  //   static   -> anchored to the initial starting balance, never moves
  const highWaterMarkBalance = startingBalance + dd.peakEquity;
  const maxLossLimitDollar = rules.maxLossLimitPct ? startingBalance * (rules.maxLossLimitPct / 100) : null;
  const maxEquityBreachLevel =
    maxLossLimitDollar !== null
      ? mode === 'trailing'
        ? highWaterMarkBalance - maxLossLimitDollar
        : startingBalance - maxLossLimitDollar
      : null;
  const maxBreachMeterPct = maxLossLimitDollar ? Math.min(100, (dd.currentDrawdown / maxLossLimitDollar) * 100) : 0;

  // --- Daily loss limit, based on TODAY specifically ---
  // Sized against yesterday's ending balance (= today's starting balance),
  // and resets every day — separate from "worst daily loss ever" above.
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  let todayStartBalance;
  if (dayStartBalances[todayKey] !== undefined) {
    todayStartBalance = dayStartBalances[todayKey];
  } else {
    // No trades yet today — today's starting balance is just the current
    // running balance from all prior days.
    todayStartBalance = runningBalance;
  }
  const todayPnl = byDay[todayKey] || 0;
  const todayLossDollar = todayPnl < 0 ? Math.abs(todayPnl) : 0;
  const dailyLossLimitDollar = rules.dailyLossLimitPct ? todayStartBalance * (rules.dailyLossLimitPct / 100) : null;
  const dailyEquityBreachLevel = dailyLossLimitDollar !== null ? todayStartBalance - dailyLossLimitDollar : null;
  const dailyBreachMeterPct = dailyLossLimitDollar ? Math.min(100, (todayLossDollar / dailyLossLimitDollar) * 100) : 0;
  const dailyBreachedToday = rules.dailyLossLimitPct
    ? (todayLossDollar / todayStartBalance) * 100 >= rules.dailyLossLimitPct
    : false;

  // Consistency: best single day's profit as a % of total profit.
  // Most prop firms cap this (commonly around 30-40%) so no single day
  // can carry a disproportionate share of the evaluation's profit.
  const dayPnls = Object.values(byDay);
  const bestDayPnl = dayPnls.length ? Math.max(...dayPnls) : 0;
  const consistencyPct = totalPnl > 0 && bestDayPnl > 0 ? (bestDayPnl / totalPnl) * 100 : null;

  const consistencyBreached = rules.consistencyLimitPct && consistencyPct !== null
    ? consistencyPct > rules.consistencyLimitPct
    : false;

  return {
    currentBalance,
    profitPct,
    maxDrawdownPct,
    currentDrawdownPct,
    worstDailyLossPct,
    dailyBreaches,
    maxDdBreached,
    profitTargetHit,
    bestDayPnl,
    consistencyPct,
    consistencyBreached,
    highWaterMarkBalance,
    maxLossLimitDollar,
    maxEquityBreachLevel,
    maxBreachMeterPct,
    todayStartBalance,
    todayLossDollar,
    dailyLossLimitDollar,
    dailyEquityBreachLevel,
    dailyBreachMeterPct,
    dailyBreachedToday,
  };
}
