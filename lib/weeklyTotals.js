import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

export function computeWeeklyTotals(month, dailyStats, mode) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    const weekDays = days.slice(i, i + 7);
    let total = 0;
    let tradingDays = 0;
    for (const d of weekDays) {
      const key = format(d, 'yyyy-MM-dd');
      const stat = dailyStats[key];
      if (stat) {
        total += mode === 'r' ? stat.r : stat.dollar;
        tradingDays += 1;
      }
    }
    weeks.push({
      weekNumber: weeks.length + 1,
      start: weekDays[0],
      end: weekDays[6],
      total,
      tradingDays,
    });
  }
  return weeks;
}
