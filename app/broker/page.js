'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabaseClient';
import BrokerConnect from '../../components/BrokerConnect';
import ImportCSV from '../../components/ImportCSV';

function RulesEditor({ connection, onSaved }) {
  const [daily, setDaily] = useState(connection.daily_loss_limit_pct ?? '');
  const [maxDd, setMaxDd] = useState(connection.max_loss_limit_pct ?? '');
  const [target, setTarget] = useState(connection.profit_target_pct ?? '');
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  async function save() {
    setSaving(true);
    await supabase
      .from('broker_connections')
      .update({
        daily_loss_limit_pct: daily === '' ? null : parseFloat(daily),
        max_loss_limit_pct: maxDd === '' ? null : parseFloat(maxDd),
        profit_target_pct: target === '' ? null : parseFloat(target),
      })
      .eq('id', connection.id);
    setSaving(false);
    onSaved?.();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-indigo-500 hover:text-indigo-400 mt-2">
        Set prop firm rules
      </button>
    );
  }

  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      <div>
        <label className="block text-[10px] text-gray-400 mb-1">Daily loss limit (%)</label>
        <input
          type="number"
          step="any"
          placeholder="e.g. 5"
          value={daily}
          onChange={(e) => setDaily(e.target.value)}
          className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900"
        />
      </div>
      <div>
        <label className="block text-[10px] text-gray-400 mb-1">Max drawdown (%)</label>
        <input
          type="number"
          step="any"
          placeholder="e.g. 10"
          value={maxDd}
          onChange={(e) => setMaxDd(e.target.value)}
          className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900"
        />
      </div>
      <div>
        <label className="block text-[10px] text-gray-400 mb-1">Profit target (%)</label>
        <input
          type="number"
          step="any"
          placeholder="e.g. 8"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900"
        />
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="col-span-3 text-xs text-indigo-600 hover:text-indigo-500 disabled:opacity-50 mt-1"
      >
        {saving ? 'Saving...' : 'Save rules'}
      </button>
    </div>
  );
}
function BalanceEditor({ connection, onSaved }) {
  const [value, setValue] = useState(connection.starting_balance ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await supabase
      .from('broker_connections')
      .update({ starting_balance: value === '' ? null : parseFloat(value) })
      .eq('id', connection.id);
    setSaving(false);
    onSaved?.();
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <label className="text-xs text-gray-400">Starting balance:</label>
      <input
        type="number"
        step="any"
        placeholder="e.g. 10000"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-28 bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900"
      />
      <button
        onClick={save}
        disabled={saving}
        className="text-xs text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}

function NameEditor({ connection, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(connection.broker_server);
  const [saving, setSaving] = useState(false);

  async function save() {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSaving(true);
    await supabase.from('broker_connections').update({ broker_server: trimmed }).eq('id', connection.id);
    setSaving(false);
    setEditing(false);
    onSaved?.();
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <div className="font-medium text-gray-900">{connection.broker_server}</div>
        {connection.broker_type === 'csv' && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">CSV</span>
        )}
        <button onClick={() => setEditing(true)} className="text-[10px] text-indigo-500 hover:text-indigo-400">
          Rename
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-900"
      />
      <button
        onClick={save}
        disabled={saving}
        className="text-xs text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
      >
        {saving ? '...' : 'Save'}
      </button>
      <button
        onClick={() => {
          setEditing(false);
          setValue(connection.broker_server);
        }}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        Cancel
      </button>
    </div>
  );
}

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
          <div key={c.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <NameEditor connection={c} onSaved={loadConnections} />
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
            <div className="text-xs text-gray-400 mt-1">
              {c.broker_type !== 'csv' && `Login ${c.mt5_login} · `}
              {c.status}
              {c.last_synced_at && ` · Last synced ${format(new Date(c.last_synced_at), 'MMM d, h:mm a')}`}
            </div>
            <BalanceEditor connection={c} onSaved={loadConnections} />
          </div>
        ))}
      </div>
    </div>
  );
}
