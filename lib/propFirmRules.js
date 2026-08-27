import { format } from 'date-fns';
import { computeDrawdown } from './drawdown';

export function computePropFirmCompliance(trades, startingBalance, rules) {
  if (!startingBalance || startingBalance <= 0) return null;

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

  let runningBalance = startingBalance;
  const dailyBreaches = [];
  let worstDailyLossPct = 0;

  for (const day of days) {
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

  const dd = computeDrawdown(trades, 'trailing');
  const maxDrawdownPct = (dd.maxDrawdown / startingBalance) * 100;
  const currentDrawdownPct = (dd.currentDrawdown / startingBalance) * 100;

  const maxDdBreached = rules.maxLossLimitPct ? maxDrawdownPct >= rules.maxLossLimitPct : false;
  const profitTargetHit = rules.profitTargetPct ? profitPct >= rules.profitTargetPct : false;

  return {
    currentBalance,
    profitPct,
    maxDrawdownPct,
    currentDrawdownPct,
    worstDailyLossPct,
    dailyBreaches,
    maxDdBreached,
    profitTargetHit,
  };
}
