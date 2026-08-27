export function computeRuleAdherenceBreakdown(trades) {
  const closed = trades.filter((t) => t.exit_price !== null && t.exit_price !== undefined && t.rule_adherence);
  const map = {};
  for (const t of closed) {
    const key = t.rule_adherence;
    if (!map[key]) map[key] = { label: key, count: 0, pnl: 0 };
    map[key].count += 1;
    map[key].pnl += Number(t.pnl || 0);
  }
  return Object.values(map).sort((a, b) => b.pnl - a.pnl);
}
