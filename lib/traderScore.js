import { computeAdvancedStats } from './advancedStats';
import { computeDrawdown } from './drawdown';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function computeTraderScore(trades) {
  const closed = trades.filter((t) => t.exit_price !== null && t.exit_price !== undefined);
  const wins = closed.filter((t) => Number(t.pnl) > 0);
  const losses = closed.filter((t) => Number(t.pnl) < 0);
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;

  const { profitFactor } = computeAdvancedStats(trades);
  const avgWin = wins.length ? wins.reduce((s, t) => s + Number(t.pnl), 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + Number(t.pnl), 0) / losses.length) : 0;
  const avgWinLoss = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 3 : 0;

  const dd = computeDrawdown(trades, 'trailing');
  const totalPnl = closed.reduce((s, t) => s + Number(t.pnl || 0), 0);
  const recoveryFactor = dd.maxDrawdown > 0 ? totalPnl / dd.maxDrawdown : totalPnl > 0 ? 5 : 0;

  const byDay = {};
  for (const t of closed) {
    const key = new Date(t.entry_time).toDateString();
    byDay[key] = (byDay[key] || 0) + Number(t.pnl || 0);
  }
  const dayValues = Object.values(byDay);
  const bestDay = dayValues.length ? Math.max(...dayValues) : 0;
  const positiveDaySum = dayValues.filter((v) => v > 0).reduce((s, v) => s + v, 0);
  const bestDayShare = positiveDaySum > 0 ? bestDay / positiveDaySum : 0;
  const consistency = clamp(100 - bestDayShare * 100, 0, 100);

  const maxDdScore =
    totalPnl > 0
      ? clamp(100 - (dd.maxDrawdown / totalPnl) * 100, 0, 100)
      : clamp(100 - dd.maxDrawdown, 0, 100);

  const metrics = {
    winRate: clamp(winRate, 0, 100),
    profitFactor: clamp(profitFactor === null ? 0 : profitFactor === Infinity ? 100 : (profitFactor / 3) * 100, 0, 100),
    avgWinLoss: clamp((avgWinLoss / 3) * 100, 0, 100),
    maxDrawdown: maxDdScore,
    recoveryFactor: clamp((recoveryFactor / 5) * 100, 0, 100),
    consistency,
  };

  const overall = Object.values(metrics).reduce((s, v) => s + v, 0) / Object.keys(metrics).length;

  return { metrics, overall };
}
