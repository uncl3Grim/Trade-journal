export function computeAdvancedStats(trades) {
  const closed = trades.filter((t) => t.exit_price !== null && t.exit_price !== undefined);
  const pnls = closed.map((t) => Number(t.pnl || 0));

  const grossProfit = pnls.filter((p) => p > 0).reduce((s, p) => s + p, 0);
  const grossLoss = Math.abs(pnls.filter((p) => p < 0).reduce((s, p) => s + p, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : null;

  const n = pnls.length;
  const mean = n ? pnls.reduce((s, p) => s + p, 0) / n : 0;
  const variance = n > 1 ? pnls.reduce((s, p) => s + (p - mean) ** 2, 0) / (n - 1) : 0;
  const stdev = Math.sqrt(variance);
  const sharpe = stdev > 0 ? mean / stdev : null;

  return { profitFactor, sharpe, grossProfit, grossLoss, tradeCount: n };
}

export function computeDrawdownToProfitRatio(maxDrawdown, totalPnl) {
  if (!totalPnl || totalPnl <= 0) return null;
  return maxDrawdown / totalPnl;
}
