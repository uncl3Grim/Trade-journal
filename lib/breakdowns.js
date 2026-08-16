import { format } from 'date-fns';

function bucketSession(hourUTC) {
  if (hourUTC >= 0 && hourUTC < 7) return 'Asia';
  if (hourUTC >= 7 && hourUTC < 8) return 'Frankfurt';
  if (hourUTC >= 8 && hourUTC < 13) return 'London';
  if (hourUTC >= 13 && hourUTC < 21) return 'New York';
  return 'Other';
}

function bucketEntryHour(hourUTC) {
  const start = Math.floor(hourUTC / 2) * 2;
  const end = start + 2;
  return `${String(start).padStart(2, '0')}-${String(end).padStart(2, '0')}`;
}

function bucketHoldingTime(minutes) {
  if (minutes < 15) return '< 15m';
  if (minutes < 60) return '< 1h';
  if (minutes < 240) return '1-4h';
  if (minutes < 1440) return '4-24h';
  return '> 24h';
}

function groupBy(trades, keyFn) {
  const map = {};
  for (const t of trades) {
    const key = keyFn(t);
    if (key === null || key === undefined) continue;
    if (!map[key]) map[key] = { label: key, count: 0, pnl: 0 };
    map[key].count += 1;
    map[key].pnl += Number(t.pnl || 0);
  }
  return Object.values(map);
}

export function computeBreakdowns(trades) {
  const closed = trades.filter((t) => t.exit_price !== null && t.exit_price !== undefined && t.entry_time);

  const byDirection = groupBy(closed, (t) => (t.direction === 'short' ? 'Short' : 'Long'));

  const byWeekday = groupBy(closed, (t) => format(new Date(t.entry_time), 'EEE'));
  const weekdayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  byWeekday.sort((a, b) => weekdayOrder.indexOf(a.label) - weekdayOrder.indexOf(b.label));

  const bySession = groupBy(closed, (t) => bucketSession(new Date(t.entry_time).getUTCHours()));
  const sessionOrder = ['Asia', 'Frankfurt', 'London', 'New York', 'Other'];
  bySession.sort((a, b) => sessionOrder.indexOf(a.label) - sessionOrder.indexOf(b.label));

  const byEntryTime = groupBy(closed, (t) => bucketEntryHour(new Date(t.entry_time).getUTCHours()));
  byEntryTime.sort((a, b) => a.label.localeCompare(b.label));

  const byHoldingTime = groupBy(
    closed.filter((t) => t.exit_time),
    (t) => bucketHoldingTime((new Date(t.exit_time) - new Date(t.entry_time)) / 60000)
  );
  const holdOrder = ['< 15m', '< 1h', '1-4h', '4-24h', '> 24h'];
  byHoldingTime.sort((a, b) => holdOrder.indexOf(a.label) - holdOrder.indexOf(b.label));

  const byOutcome = groupBy(closed, (t) => (Number(t.pnl) > 0 ? 'Win' : Number(t.pnl) < 0 ? 'Loss' : 'Breakeven'));

  const byDay = {};
  for (const t of closed) {
    const day = format(new Date(t.entry_time), 'yyyy-MM-dd');
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(t);
  }
  const perDayCounts = {};
  for (const day in byDay) {
    const n = byDay[day].length;
    const key = `${n}/day`;
    if (!perDayCounts[key]) perDayCounts[key] = { label: key, count: 0, pnl: 0, _n: n };
    perDayCounts[key].count += 1;
    perDayCounts[key].pnl += byDay[day].reduce((s, t) => s + Number(t.pnl || 0), 0);
  }
  const byTradesPerDay = Object.values(perDayCounts).sort((a, b) => a._n - b._n);

  return { byDirection, byWeekday, bySession, byEntryTime, byHoldingTime, byOutcome, byTradesPerDay };
}
