export function computeEmotionBreakdown(trades) {
  const closed = trades.filter((t) => t.exit_price !== null && t.exit_price !== undefined && t.emotion);
  const map = {};
  for (const t of closed) {
    if (!map[t.emotion]) map[t.emotion] = { label: t.emotion, count: 0, pnl: 0, wins: 0 };
    map[t.emotion].count += 1;
    map[t.emotion].pnl += Number(t.pnl || 0);
    if (Number(t.pnl) > 0) map[t.emotion].wins += 1;
  }
  return Object.values(map)
    .map((r) => ({ ...r, winRate: r.count ? (r.wins / r.count) * 100 : 0 }))
    .sort((a, b) => b.pnl - a.pnl);
}

// Flags trades opened soon after a losing trade closed, with a larger
// position size than that losing trade — a common revenge-trading pattern.
export function detectRevengeTrades(trades, windowMinutes = 20) {
  const closed = trades
    .filter((t) => t.exit_price !== null && t.exit_price !== undefined && t.entry_time && t.exit_time)
    .slice()
    .sort((a, b) => new Date(a.entry_time) - new Date(b.entry_time));

  const flagged = [];
  for (let i = 1; i < closed.length; i++) {
    const prev = closed[i - 1];
    const curr = closed[i];
    if (Number(prev.pnl) >= 0) continue;

    const gapMinutes = (new Date(curr.entry_time) - new Date(prev.exit_time)) / 60000;
    if (gapMinutes < 0 || gapMinutes > windowMinutes) continue;

    const prevSize = Number(prev.size) || 0;
    const currSize = Number(curr.size) || 0;
    if (prevSize && currSize > prevSize) {
      flagged.push(curr);
    }
  }

  const totalCost = flagged.reduce((s, t) => s + Number(t.pnl || 0), 0);
  const winCount = flagged.filter((t) => Number(t.pnl) > 0).length;

  return {
    count: flagged.length,
    totalCost,
    winRate: flagged.length ? (winCount / flagged.length) * 100 : 0,
    trades: flagged,
  };
}
