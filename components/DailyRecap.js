import { format, isSameDay } from 'date-fns';
import { rMultiple } from './tradeMath';

export function computeDailyRecap(trades, date, defaultRiskAmount, mode = 'dollar') {
  const closed = trades.filter((t) => t.entry_time && t.exit_price !== null && t.exit_price !== undefined);
  const dayTrades = closed
    .filter((t) => isSameDay(new Date(t.entry_time), date))
    .slice()
    .sort((a, b) => new Date(a.entry_time) - new Date(b.entry_time));

  const tradeRows = dayTrades.map((t) => {
    const r = rMultiple(t, defaultRiskAmount);
    return {
      id: t.id,
      symbol: t.symbol || '—',
      direction: t.direction || null,
      time: format(new Date(t.entry_time), 'h:mm a'),
      entryPrice: t.entry_price ?? null,
      exitPrice: t.exit_price ?? null,
      takeProfit: t.take_profit ?? null,
      stopLoss: t.stop_loss ?? null,
      size: t.size ?? null,
      pnl: Number(t.pnl || 0),
      r,
    };
  });

  const totalTrades = dayTrades.length;
  const totalPnl = tradeRows.reduce((s, t) => s + t.pnl, 0);
  const rValues = tradeRows.map((t) => t.r).filter((r) => r !== null);
  const totalR = rValues.reduce((s, v) => s + v, 0);
  const wins = tradeRows.filter((t) => t.pnl > 0).length;
  const winRate = totalTrades ? Math.round((wins / totalTrades) * 100) : 0;
  const avgR = rValues.length ? totalR / rValues.length : 0;

  const bestTrade = tradeRows.length
    ? tradeRows.reduce((best, t) => ((mode === 'r' ? t.r ?? -Infinity : t.pnl) > (mode === 'r' ? best.r ?? -Infinity : best.pnl) ? t : best))
    : null;

  return {
    date,
    dateLabel: format(date, 'EEEE, MMM d, yyyy'),
    trades: tradeRows,
    totalTrades,
    totalPnl,
    totalR,
    winRate,
    avgR,
    bestTrade,
  };
}
