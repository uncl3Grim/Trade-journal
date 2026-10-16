import { format } from 'date-fns';
import { computeDrawdown } from './drawdown';

// An account "has tracked rules" once it has a starting balance and at least
// one limit/target. This is deliberately independent of is_prop_firm, so a
// personal or manual account can have its own loss-limit batteries too.
export function hasTrackedRules(account) {
  if (!account) return false;
  if (!(Number(account.starting_balance) > 0)) return false;
  return !!(
    account.daily_loss_limit_pct ||
    account.max_loss_limit_pct ||
    account.profit_target_pct ||
    account.consistency_limit_pct
  );
}

export function levelFor(pct) {
  if (pct === null || pct === undefined) return 'none';
  if (pct >= 100) return 'breach';
  if (pct >= 90) return 'danger';
  if (pct >= 60) return 'warn';
  return 'ok';
}

// How much of the daily-loss and max-drawdown limits are used as of a given
// day (yyyy-MM-dd, the viewer's local day), for ONE account.
//  - the day's limit is sized from that day's STARTING balance
//    (starting balance + every closed trade before that day)
//  - max drawdown is measured through the end of that day
export function computeDayLimitStatus({ trades, account, dateStr, ddMode = 'trailing' }) {
  if (!account || !(Number(account.starting_balance) > 0)) return null;
  if (!account.daily_loss_limit_pct && !account.max_loss_limit_pct) return null;

  const start = Number(account.starting_balance);
  const closed = (trades || []).filter(
    (t) => t.exit_price !== null && t.exit_price !== undefined && t.entry_time
  );
  const keyed = closed.map((t) => ({ ...t, _day: format(new Date(t.entry_time), 'yyyy-MM-dd') }));

  const before = keyed.filter((t) => t._day < dateStr);
  const sameDay = keyed.filter((t) => t._day === dateStr);
  const throughDay = keyed.filter((t) => t._day <= dateStr);

  const dayStartBalance = start + before.reduce((s, t) => s + Number(t.pnl || 0), 0);
  const dayPnl = sameDay.reduce((s, t) => s + Number(t.pnl || 0), 0);
  const dayLoss = dayPnl < 0 ? Math.abs(dayPnl) : 0;

  let daily = null;
  if (account.daily_loss_limit_pct) {
    const limit = dayStartBalance * (Number(account.daily_loss_limit_pct) / 100);
    const usedPct = limit > 0 ? (dayLoss / limit) * 100 : 0;
    daily = { limit, loss: dayLoss, usedPct, remaining: Math.max(0, limit - dayLoss), level: levelFor(usedPct) };
  }

  let max = null;
  if (account.max_loss_limit_pct) {
    const limit = start * (Number(account.max_loss_limit_pct) / 100);
    const dd = computeDrawdown(throughDay, ddMode);
    const usedPct = limit > 0 ? (dd.currentDrawdown / limit) * 100 : 0;
    max = { limit, drawdown: dd.currentDrawdown, usedPct, remaining: Math.max(0, limit - dd.currentDrawdown), level: levelFor(usedPct) };
  }

  return { daily, max, dayPnl, dayStartBalance };
}
