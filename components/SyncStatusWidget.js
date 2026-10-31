'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabaseClient';

export default function SyncStatusWidget({ account, onSynced }) {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  if (!account || account.broker_type === 'csv' || account.broker_type === 'manual') return null;

  async function handleSync() {
    setSyncing(true);
    setMessage('');
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch('/api/broker/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ connectionId: account.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setMessage(
        data.tradesReceived > data.tradesSynced
          ? `Synced ${data.tradesSynced} of ${data.tradesReceived} trade(s)`
          : `Synced ${data.tradesSynced} trade(s)`
      );
      onSynced?.();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
    setSyncing(false);
  }

  return (
    <div className="bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-4 mb-4 flex items-center justify-between flex-wrap gap-2">
      <div className="text-xs text-neutral-400">
        {account.broker_server} · Last synced:{' '}
        {account.last_synced_at ? format(new Date(account.last_synced_at), 'MMM d, h:mm a') : 'Never'}
      </div>
      <div className="flex items-center gap-2">
        {message && <span className="text-xs text-neutral-500">{message}</span>}
        <button
          onClick={handleSync}
          disabled={syncing}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl px-3 py-1.5 text-xs font-medium"
        >
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>
    </div>
  );
}
