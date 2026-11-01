import { format } from 'date-fns';
import { isSynced, mistakesOf } from './coach';

const isClosed = (t) => t.exit_price !== null && t.exit_price !== undefined;

// Has the trader recorded anything about their process for this trade?
export function hasJournal(t) {
  if (t.rule_adherence) return true;
  if (t.emotion) return true;
  if (typeof t.notes === 'string' && t.notes.trim()) return true;
  if (Array.isArray(t.checklist) && t.checklist.some((c) => c && c.d)) return true;
  if (mistakesOf(t).length > 0) return true;
  return false;
}

// Auto-synced trades from the last `days` days that still need journaling, newest first.
export function unjournaledTrades(trades, days = 14, now = Date.now()) {
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return (trades || [])
    .filter((t) => isSynced(t) && isClosed(t) && t.entry_time && new Date(t.entry_time).getTime() >= cutoff && !hasJournal(t))
    .sort((a, b) => new Date(b.entry_time) - new Date(a.entry_time))
    .map((t) => ({ trade: t, day: format(new Date(t.entry_time), 'yyyy-MM-dd') }));
}
