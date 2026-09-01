// Classifies a trade's entry time into the trading session that was active
// when it opened — purely derived from the stored (UTC) entry_time, so it
// works automatically for every trade, imported or manual, with zero
// tagging. Session windows are fixed, commonly-cited UTC hours; they don't
// shift for daylight saving in any region, so treat this as a useful
// approximation rather than an exact broker-session boundary.
const SESSIONS = [
  { key: 'sydney', label: 'Sydney', start: 22, end: 7 },
  { key: 'tokyo', label: 'Tokyo', start: 0, end: 9 },
  { key: 'london', label: 'London', start: 8, end: 17 },
  { key: 'newyork', label: 'New York', start: 13, end: 22 },
];

function inWindow(hour, start, end) {
  if (start <= end) return hour >= start && hour < end;
  return hour >= start || hour < end; // wraps past midnight (Sydney)
}

export function getTradeSession(entryTimeIso) {
  if (!entryTimeIso) return null;
  const d = new Date(entryTimeIso);
  if (isNaN(d.getTime())) return null;
  const hour = d.getUTCHours();

  const active = SESSIONS.filter((s) => inWindow(hour, s.start, s.end)).map((s) => s.key);

  if (active.includes('london') && active.includes('newyork')) return 'London/New York Overlap';
  if (active.includes('london')) return 'London';
  if (active.includes('newyork')) return 'New York';
  if (active.includes('tokyo')) return 'Tokyo';
  if (active.includes('sydney')) return 'Sydney';
  return 'Other';
}
