function stdDev(arr) {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

export function formatDuration(ms) {
  if (!ms) return '—';
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m || h) parts.push(`${m}min`);
  parts.push(`${s}sec`);
  return parts.join(' ');
}

export function computeFullSummary(trades) {
  const closed = trades.filter((t) => t.exit_price !== null && t.exit_price !== undefined && t.entry_time && t.exit_time);
  const pnls = closed.map((t) => Number(t.pnl || 0));
  const grossPnl = pnls.reduce((s, p) => s + p, 0);
  const numTrades = closed.length;
  const numContracts = closed.reduce((s, t) => s + Number(t.size || 0), 0);

  const durations = closed.map((t) => new Date(t.exit_time) - new Date(t.entry_time)).filter((d) => d >= 0);
  const avgDuration = durations.length ? durations.reduce((s, d) => s + d, 0) / durations.length : 0;
  const longestDuration = durations.length ? Math.max(...durations) : 0;

  const wins = closed.filter((t) => Number(t.pnl) > 0);
  const losses = closed.filter((t) => Number(t.pnl) < 0);
  const percentProfitable = numTrades ? (wins.length / numTrades) * 100 : 0;
  const expectancy = numTrades ? grossPnl / numTrades : 0;

  const winPnls = wins.map((t) => Number(t.pnl));
  const totalProfit = winPnls.reduce((s, p) => s + p, 0);
  const avgWinning = wins.length ? totalProfit / wins.length : 0;
  const largestWinning = wins.length ? Math.max(...winPnls) : 0;
  const stdDevWinning = stdDev(winPnls);
  const winDurations = wins.map((t) => new Date(t.exit_time) - new Date(t.entry_time)).filter((d) => d >= 0);
  const avgWinningTime = winDurations.length ? winDurations.reduce((s, d) => s + d, 0) / winDurations.length : 0;
  const longestWinningTime = winDurations.length ? Math.max(...winDurations) : 0;

  const lossPnls = losses.map((t) => Number(t.pnl));
  const totalLoss = lossPnls.reduce((s, p) => s + p, 0);
  const avgLosing = losses.length ? totalLoss / losses.length : 0;
  const largestLosing = losses.length ? Math.min(...lossPnls) : 0;
  const stdDevLosing = stdDev(lossPnls);
  const lossDurations = losses.map((t) => new Date(t.exit_time) - new Date(t.entry_time)).filter((d) => d >= 0);
  const avgLosingTime = lossDurations.length ? lossDurations.reduce((s, d) => s + d, 0) / lossDurations.length : 0;
  const longestLosingTime = lossDurations.length ? Math.max(...lossDurations) : 0;

  return {
    all: { grossPnl, numTrades, numContracts, avgDuration, longestDuration, percentProfitable, expectancy, totalPnl: grossPnl },
    winning: { totalProfit, numWinning: wins.length, largestWinning, avgWinning, stdDevWinning, avgWinningTime, longestWinningTime },
    losing: { totalLoss, numLosing: losses.length, largestLosing, avgLosing, stdDevLosing, avgLosingTime, longestLosingTime },
    sequence: closed.map((t, i) => ({ index: i + 1, pnl: Number(t.pnl || 0) })),
  };
}
