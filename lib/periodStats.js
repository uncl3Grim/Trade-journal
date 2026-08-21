import { isWithinInterval } from 'date-fns';
import { rMultiple } from './tradeMath';

export function summarizePeriod(trades, start, end, defaultRiskAmount) {
  const inRange = trades.filter((t) => t.entry_time && isWithinInterval(new Date(t.entry_time), { start, end }));
  const closed = inRange.filter((t) => t.exit_price !== null && t.exit_price !== undefined);
  const totalPnl = closed.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
  const wins = closed.filter((t) => Number(t.pnl) > 0);
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
  const rValues = closed.map((t) => rMultiple(t, defaultRiskAmount)).filter((r) => r !== null);
  const totalR = rValues.reduce((sum, r) => sum + r, 0);
  return { totalPnl, winRate, tradeCount: closed.length, totalR };
}
