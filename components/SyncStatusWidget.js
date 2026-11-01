'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabaseClient';

// Auto-sync runs while the app is open: when you arrive, when you come back to the
// tab, and every few minutes, but never more than once per 30 minutes per account
// (MyFXBook limits how often its data can be requested).
const AUTO_MIN_MS = 30 * 60 * 1000;
const CHECK_MS = 5 * 60 * 1000;

export default function SyncStatusWidget({ account, onSynced }) {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [lastSynced, setLastSynced] = useState(null);
  const busy = useRef(false);
  const lastRun = useRef(0);
  const onSyncedRef = useRef(onSynced);
  onSyncedRef.current = onSynced;

  const syncable = !!account && account.broker_type !== 'csv' && account.broker_type !== 'manual';
  const accountId = account?.id;
  const accountLast = account?.last_synced_at;

  const runSync = useCallback(
    async (auto) => {
      if (!accountId || busy.current) return;
      busy.current = true;
      setSyncing(true);
      if (!auto) setMessage('');
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error('Not signed in');
        const res = await fetch('/api/broker/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ connectionId: accountId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Sync failed');
        lastRun.current = Date.now();
        setLastSynced(new Date());
        const count =
          data.tradesReceived > data.tradesSynced
            ? `${data.tradesSynced} of ${data.tradesReceived} trade(s)`
            : `${data.tradesSynced} trade(s)`;
        setMessage(auto ? `Auto-synced · ${count}` : `Synced ${count}`);
        onSyncedRef.current?.();
      } catch (err) {
        if (auto) lastRun.current = Date.now(); // back off instead of retrying in a loop
        setMessage(auto ? `Auto-sync failed: ${err.message}` : `Error: ${err.message}`);
      }
      busy.current = false;
      setSyncing(false);
    },
    [accountId]
  );

  useEffect(() => {
    if (!syncable) return undefined;
    lastRun.current = 0;
    const isDue = () => {
      const base = Math.max(lastRun.current, accountLast ? new Date(accountLast).getTime() : 0);
      return Date.now() - base >= AUTO_MIN_MS;
    };
    const check = () => {
      if (document.visibilityState === 'visible' && isDue()) runSync(true);
    };
    check();
    const timer = setInterval(check, CHECK_MS);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
    // accountLast is intentionally read once per account switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncable, accountId, runSync]);

  if (!syncable) return null;

  const shownLast = lastSynced || (accountLast ? new Date(accountLast) : null);

  return (
    <div className="bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-4 mb-4 flex items-center justify-between flex-wrap gap-2">
      <div className="text-xs text-neutral-400">
        {account.broker_server} · Last synced: {shownLast ? format(shownLast, 'MMM d, h:mm a') : 'Never'}
      </div>
      <div className="flex items-center gap-2">
        {message && <span className="text-xs text-neutral-500">{message}</span>}
        <button
          onClick={() => runSync(false)}
          disabled={syncing}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl px-3 py-1.5 text-xs font-medium"
        >
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>
    </div>
  );
}
