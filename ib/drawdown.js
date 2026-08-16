export function computeDrawdown(trades, mode) {
  const sorted = trades
    .filter((t) => t.exit_price !== null && t.exit_price !== undefined && t.entry_time)
    .slice()
    .sort((a, b) => new Date(a.entry_time) - new Date(b.entry_time));

  let equity = 0;
  let peak = 0;
  let maxDD = 0;

  for (const t of sorted) {
    equity += Number(t.pnl || 0);
    if (mode === 'trailing') {
      if (equity > peak) peak = equity;
      const dd = peak - equity;
      if (dd > maxDD) maxDD = dd;
    } else {
      const dd = 0 - equity;
      if (dd > maxDD) maxDD = dd;
    }
  }

  const finalEquity = equity;
  const currentDrawdown = mode === 'trailing' ? peak - finalEquity : Math.max(0, -finalEquity);

  return {
    maxDrawdown: maxDD,
    currentDrawdown,
    peakEquity: peak,
    currentEquity: finalEquity,
  };
}
