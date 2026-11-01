'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, isToday, isYesterday } from 'date-fns';
import { formatMoney } from '../../lib/format';
import { unjournaledTrades } from '../../lib/journalReminders';

const SNOOZE_KEY = 'tj_journal_snooze';
const dayText = (key) => {
  const d = new Date(`${key}T00:00:00`);
  return isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMM d');
};

export default function JournalReminder({ trades }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [snoozed, setSnoozed] = useState(false);

  useEffect(() => {
    try {
      setSnoozed(localStorage.getItem(SNOOZE_KEY) === format(new Date(), 'yyyy-MM-dd'));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const pending = useMemo(() => (ready ? unjournaledTrades(trades) : []), [trades, ready]);

  if (!ready || snoozed || pending.length === 0) return null;

  const shown = pending.slice(0, 3);
  const more = pending.length - shown.length;

  function snooze() {
    try {
      localStorage.setItem(SNOOZE_KEY, format(new Date(), 'yyyy-MM-dd'));
    } catch {
      /* ignore */
    }
    setSnoozed(true);
  }

  return (
    <div className="mb-6 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-amber-100">
            {pending.length} synced trade{pending.length === 1 ? '' : 's'} still need journaling
          </div>
          <p className="text-xs text-amber-100/70 mt-0.5 leading-snug">
            Log whether you followed your plan and how you felt while it&apos;s fresh. It takes under a minute a trade.
          </p>
        </div>
        <button onClick={snooze} className="flex-shrink-0 text-[11px] text-amber-100/60 hover:text-amber-100 underline underline-offset-2">
          Later
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {shown.map(({ trade, day }) => (
          <div key={trade.id} className="flex items-center justify-between gap-3 rounded-xl bg-black/20 border border-white/5 px-3 py-2">
            <div className="min-w-0">
              <div className="text-sm text-neutral-100 truncate">
                {trade.symbol} <span className="text-neutral-500">· {trade.direction}</span>
              </div>
              <div className="text-[11px] text-neutral-500">
                {dayText(day)} · <span className={Number(trade.pnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatMoney(Number(trade.pnl) || 0)}</span>
              </div>
            </div>
            <button
              onClick={() => router.push(`/journal/day/${day}`)}
              className="flex-shrink-0 text-xs font-medium text-white bg-gradient-to-br from-indigo-600 to-violet-600 hover:opacity-90 rounded-lg px-3 py-1.5"
            >
              Journal
            </button>
          </div>
        ))}
        {more > 0 && <div className="text-[11px] text-amber-100/60 px-1">+{more} more from the last 14 days</div>}
      </div>
    </div>
  );
}
