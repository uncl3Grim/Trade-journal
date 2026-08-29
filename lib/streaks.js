export function computeCurrentStreak(trades) {
  const closed = trades
    .filter((t) => t.exit_price !== null && t.exit_price !== undefined && t.entry_time)
    .slice()
    .sort((a, b) => new Date(b.entry_time) - new Date(a.entry_time));

  if (closed.length === 0) return { count: 0, type: null };

  const firstIsWin = Number(closed[0].pnl) > 0;
  let count = 0;
  for (const t of closed) {
    const isWin = Number(t.pnl) > 0;
    if (isWin !== firstIsWin) break;
    count++;
  }
  return { count, type: firstIsWin ? 'win' : 'loss' };
}
