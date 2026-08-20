'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabaseClient';
import BrokerConnect from '../../components/BrokerConnect';
import ImportCSV from '../../components/ImportCSV';

export default function BrokerPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [connections, setConnections] = useState([]);
  const [syncingId, setSyncingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
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

  async function handleDelete(connectionId, label) {
    if (!confirm(`Remove ${label}? Its trades will stay in your journal but be unlinked from this account.`)) return;
    setDeletingId(connectionId);
    const { error } = await supabase.from('broker_connections').delete().eq('id', connectionId);
    setDeletingId(null);
    if (error) {
      setSyncMessage(`Error deleting: ${error.message}`);
    } else {
      loadConnections();
    }
  }

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-6 bg-[#f7f7fb]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Broker Connections</h1>
        <button onClick={() => router.push('/journal')} className="text-sm text-gray-500 hover:text-gray-800">
          Back to Journal
        </button>
      </div>

      <BrokerConnect onConnected={loadConnections} />

      <ImportCSV userId={user?.id} onImported={() => { setSyncMessage('CSV import complete — check your Calendar tab.'); loadConnections(); }} />

      {syncMessage && <p className="text-sm text-gray-500 mb-4">{syncMessage}</p>}

      <div className="space-y-3">
        {connections.length === 0 && (
          <p className="text-sm text-gray-400">No accounts connected yet.</p>
        )}
        {connections.map((c) => (
          <div key={c.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-gray-900">
                {c.broker_server}
                {c.broker_type === 'csv' && (
                  <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 align-middle">
                    CSV
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-400">
                {c.broker_type !== 'csv' && `Login ${c.mt5_login} · `}
                {c.status}
                {c.last_synced_at && ` · Last synced ${format(new Date(c.last_synced_at), 'MMM d, h:mm a')}`}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {c.broker_type !== 'csv' && (
                <button
                  onClick={() => handleSync(c.id)}
                  disabled={syncingId === c.id}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-sm font-medium"
                >
                  {syncingId === c.id ? 'Syncing...' : 'Sync Now'}
                </button>
              )}
              <button
                onClick={() => handleDelete(c.id, c.broker_server)}
                disabled={deletingId === c.id}
                className="border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 rounded-xl px-3 py-2 text-sm font-medium"
              >
                {deletingId === c.id ? '...' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
