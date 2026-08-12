export function rMultiple(trade) {
  const pnl = Number(trade.pnl);

  // Prefer an explicitly entered dollar risk amount, since price-based
  // estimates break for instruments with non-standard contract sizes
  // (indices, commodities, crypto, etc.)
  if (trade.risk_amount) {
    const riskAmount = Number(trade.risk_amount);
    if (!riskAmount) return null;
    return pnl / riskAmount;
  }

  const entry = Number(trade.entry_price);
  const stop = Number(trade.stop_loss);
  if (!entry || !stop || entry === stop) return null;
  const size = Number(trade.size) || 1;
  const riskPerUnit = Math.abs(entry - stop);
  const riskAmount = riskPerUnit * size;
  if (!riskAmount) return null;
  return pnl / riskAmount;
}
