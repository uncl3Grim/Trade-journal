import { format } from 'date-fns';
import { rMultiple } from './tradeMath';

export function computeDailyStats(trades, defaultRiskAmount) {
  const map = {};
  for (const t of trades) {
    if (!t.entry_time) continue;
    const key = format(new Date(t.entry_time), 'yyyy-MM-dd');
    if (!map[key]) map[key] = { dollar: 0, r: 0, count: 0 };
    map[key].dollar += Number(t.pnl || 0);
    const r = rMultiple(t, defaultRiskAmount);
    if (r !== null) map[key].r += r;
    map[key].count += 1;
  }
  return map;
}
