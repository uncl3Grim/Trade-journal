'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabaseClient';
import BrokerConnect from '../../components/BrokerConnect';

export default function BrokerPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [connections, setConnections] = useState([]);
  const [syncingId, setSyncingId] = useState(null);
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
      } else {
        setUser(session.user);
      }
    });
  }, [router]);

  const loadConnections = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('broker_connections')
      .select('*')
      .order('created_at', { ascending: false });
    setConnections(data || []);
  }, [user]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  async function handleSync(connectionId) {
    setSyncingId(connectionId);
    setSyncMessage('');
    const { data: { session } } = await supabase.auth.getSession();

    try {
      const res = await fetch('/api/broker/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ connectionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setSyncMessage(`Synced ${data.tradesSynced} trade(s).`);
      loadConnections();
    } catch (err) {
      setSyncMessage(`Error: ${err.message}`);
    }
    setSyncingId(null);
  }

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Broker Connections</h1>
        <button onClick={() => router.push('/journal')} className="text-sm text-gray-400 hover:text-gray-200">
          Back to Journal
        </button>
      </div>

      <BrokerConnect onConnected={loadConnections} />

      {syncMessage && <p className="text-sm text-gray-400 mb-4">{syncMessage}</p>}

      <div className="space-y-3">
        {connections.length === 0 && (
          <p className="text-sm text-gray-500">No broker accounts connected yet.</p>
        )}
        {connections.map((c) => (
          <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{c.broker_server}</div>
              <div className="text-xs text-gray-500">
                Login {c.mt5_login} · {c.status}
                {c.last_synced_at && ` · Last synced ${format(new Date(c.last_synced_at), 'MMM d, h:mm a')}`}
              </div>
            </div>
            <button
              onClick={() => handleSync(c.id)}
              disabled={syncingId === c.id}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-medium"
            >
              {syncingId === c.id ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
