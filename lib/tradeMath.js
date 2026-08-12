export function rMultiple(trade) {
  const entry = Number(trade.entry_price);
  const stop = Number(trade.stop_loss);
  const pnl = Number(trade.pnl);
  if (!entry || !stop || entry === stop) return null;
  const size = Number(trade.size) || 1;
  const riskPerUnit = Math.abs(entry - stop);
  const riskAmount = riskPerUnit * size;
  if (!riskAmount) return null;
  return pnl / riskAmount;
}
