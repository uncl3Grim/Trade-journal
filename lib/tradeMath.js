export function rMultiple(trade, defaultRiskAmount) {
  const pnl = Number(trade.pnl);

  const explicitRisk = trade.risk_amount ? Number(trade.risk_amount) : null;
  if (explicitRisk) return pnl / explicitRisk;

  const entry = Number(trade.entry_price);
  const stop = Number(trade.stop_loss);
  if (entry && stop && entry !== stop) {
    const size = Number(trade.size) || 1;
    const riskPerUnit = Math.abs(entry - stop);
    const riskAmount = riskPerUnit * size;
    if (riskAmount) return pnl / riskAmount;
  }

  if (defaultRiskAmount) return pnl / Number(defaultRiskAmount);

  return null;
}
