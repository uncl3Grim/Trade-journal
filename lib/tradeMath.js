export function rMultiple(trade, defaultRiskAmount) {
  const pnl = Number(trade.pnl);

  const explicitRisk = trade.risk_amount ? Number(trade.risk_amount) : null;
  if (explicitRisk) return pnl / explicitRisk;

  if (defaultRiskAmount) return pnl / Number(defaultRiskAmount);

  const entry = Number(trade.entry_price);
  const stop = Number(trade.stop_loss);
  if (!entry || !stop || entry === stop) return null;
  const size = Number(trade.size) || 1;
  const riskPerUnit = Math.abs(entry - stop);
  const riskAmount = riskPerUnit * size;
  if (!riskAmount) return null;
  return pnl / riskAmount;
}
