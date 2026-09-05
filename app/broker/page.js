'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabaseClient';
import BrokerConnect from '../../components/BrokerConnect';
import ImportCSV from '../../components/ImportCSV';
import ShareReport from '../../components/ShareReport';
import AppShell from '../../components/AppShell';
import DrawdownLimitSelect from '../../components/DrawdownLimitSelect';
import { useToasts, ToastStack } from '../../components/Notice';

const inputClass =
  'bg-white dark:bg-[#101019] border border-gray-300 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors';

const STATUS_STYLES = {
  active: { dot: 'bg-emerald-500', label: 'Active' },
  connected: { dot: 'bg-emerald-500', label: 'Connected' },
  online: { dot: 'bg-emerald-500', label: 'Online' },
  manual: { dot: 'bg-gray-400', label: 'Manual' },
  pending: { dot: 'bg-amber-500', label: 'Pending' },
  error: { dot: 'bg-red-500', label: 'Error' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { dot: 'bg-gray-400', label: status || 'Unknown' };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function BrokerAvatar({ connection }) {
  const isCsv = connection.broker_type === 'csv';
  return (
    <div
      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm ${
        isCsv ? 'bg-gradient-to-br from-slate-500 to-slate-600' : 'bg-gradient-to-br from-indigo-500 to-violet-500'
      }`}
    >
      {isCsv ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 12l-4-4m4 4l4-4M4 20h16" />
        </svg>
      ) : (
        connection.broker_server?.charAt(0).toUpperCase() || '?'
      )}
    </div>
  );
}

function BalanceEditor({ connection, onSaved, notify }) {
  const [value, setValue] = useState(connection.starting_balance ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from('broker_connections')
      .update({ starting_balance: value === '' ? null : parseFloat(value) })
      .eq('id', connection.id);
    setSaving(false);
    if (error) {
      notify('error', `Couldn't save starting balance: ${error.message}`);
    } else {
      notify('success', 'Starting balance saved.');
      onSaved?.();
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-500 dark:text-gray-400">Starting balance</label>
      <input
        type="number"
        step="any"
        placeholder="e.g. 10000"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={`w-28 ${inputClass}`}
      />
      <button
        onClick={save}
        disabled={saving}
        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}

function RulesEditor({ connection, onSaved, notify }) {
  const [daily, setDaily] = useState(connection.daily_loss_limit_pct ?? null);
  const [maxDd, setMaxDd] = useState(connection.max_loss_limit_pct ?? null);
  const [target, setTarget] = useState(connection.profit_target_pct ?? null);
  const [consistency, setConsistency] = useState(connection.consistency_limit_pct ?? null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from('broker_connections')
      .update({
        daily_loss_limit_pct: daily,
        max_loss_limit_pct: maxDd,
        profit_target_pct: target,
        consistency_limit_pct: consistency,
      })
      .eq('id', connection.id);
    setSaving(false);
    if (error) {
      notify('error', `Couldn't save prop firm rules: ${error.message}`);
    } else {
      notify('success', 'Prop firm rules saved.');
      onSaved?.();
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Prop firm rules</label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <DrawdownLimitSelect label="Daily loss limit (%)" value={daily} onChange={setDaily} />
        <DrawdownLimitSelect label="Max drawdown (%)" value={maxDd} onChange={setMaxDd} />
        <DrawdownLimitSelect label="Profit target (%)" value={target} onChange={setTarget} />
        <DrawdownLimitSelect label="Consistency limit (%)" value={consistency} onChange={setConsistency} />
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 disabled:opacity-50 mt-2"
      >
        {saving ? 'Saving…' : 'Save rules'}
      </button>
    </div>
  );
}

function NameEditor({ connection, onSaved, notify }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(connection.broker_server);
  const [saving, setSaving] = useState(false);

  async function save() {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSaving(true);
    const { error } = await supabase.from('broker_connections').update({ broker_server: trimmed }).eq('id', connection.id);
    setSaving(false);
    setEditing(false);
    if (error) {
      notify('error', `Couldn't rename account: ${error.message}`);
    } else {
      notify('success', 'Account renamed.');
      onSaved?.();
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">{connection.broker_server}</div>
        {connection.broker_type === 'csv' && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex-shrink-0">
            CSV
          </span>
        )}
        <button
          onClick={() => setEditing(true)}
          className="text-[11px] text-indigo-500 dark:text-indigo-400 hover:text-indigo-400 flex-shrink-0"
        >
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
        className={inputClass}
      />
      <button onClick={save} disabled={saving} className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 disabled:opacity-50">
        {saving ? '…' : 'Save'}
      </button>
      <button
        onClick={() => {
          setEditing(false);
          setValue(connection.broker_server);
        }}
        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        Cancel
      </button>
    </div>
  );
}

function AccountCard({ connection, onSaved, onSync, onDelete, syncing, deleting, notify }) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-[#15151b] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-4 transition-colors hover:border-gray-300 dark:hover:border-gray-700">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <BrokerAvatar connection={connection} />
          <div className="min-w-0">
            <NameEditor connection={connection} onSaved={onSaved} notify={notify} />
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <StatusBadge status={connection.status} />
              {connection.broker_type !== 'csv' && (
                <span className="text-xs text-gray-400 dark:text-gray-500">· Login {connection.mt5_login}</span>
              )}
              {connection.last_synced_at && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  · Synced {format(new Date(connection.last_synced_at), 'MMM d, h:mm a')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {connection.broker_type !== 'csv' && (
            <button
              onClick={() => onSync(connection.id)}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 bg-gradient-to-br from-indigo-600 to-violet-600 hover:opacity-90 disabled:opacity-50 text-white rounded-xl px-3.5 py-2 text-xs font-semibold transition-opacity"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0114-4M20 15a8 8 0 01-14 4" />
              </svg>
              {syncing ? 'Syncing…' : 'Sync Now'}
            </button>
          )}
          <button
            onClick={() => onDelete(connection.id, connection.broker_server)}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 border border-red-200 dark:border-red-900 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
          >
            {deleting ? '…' : 'Delete'}
          </button>
        </div>
      </div>

      <button
        onClick={() => setAdvancedOpen((v) => !v)}
        className="mt-3 flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`w-3 h-3 transition-transform ${advancedOpen ? 'rotate-90' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
        </svg>
        Advanced settings
      </button>

      {advancedOpen && (
  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3 animate-fade-in-up">
          <BalanceEditor connection={connection} onSaved={onSaved} notify={notify} />
          <RulesEditor connection={connection} onSaved={onSaved} notify={notify} />
          <ShareReport connection={connection} />
        </div>
      )}
    </div>
  );
}

export default function BrokerPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [connections, setConnections] = useState([]);
  const [syncingId, setSyncingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const { toasts, notify, dismiss } = useToasts();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/login');
      else setUser(session.user);
    });
  }, [router]);

  const loadConnections = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('broker_connections').select('*').order('created_at', { ascending: false });
    setConnections(data || []);
  }, [user]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  async function handleSync(connectionId) {
    setSyncingId(connectionId);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch('/api/broker/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ connectionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      notify('success', `Synced ${data.tradesSynced} trade${data.tradesSynced === 1 ? '' : 's'}.`);
      loadConnections();
    } catch (err) {
      notify('error', err.message);
    }
    setSyncingId(null);
  }

  async function handleDelete(connectionId, label) {
    if (!confirm(`Remove ${label}? Its trades will stay in your journal but be unlinked from this account.`)) return;
    setDeletingId(connectionId);
    const { error } = await supabase.from('broker_connections').delete().eq('id', connectionId);
    setDeletingId(null);
    if (error) {
      notify('error', `Couldn't delete account: ${error.message}`);
    } else {
      notify('success', `${label} removed.`);
      loadConnections();
    }
  }

  return (
    <AppShell>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Broker Connections</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Sync live accounts, import CSVs, and manage prop firm rules.
            </p>
          </div>
          <button
            onClick={() => router.push('/journal')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Journal
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <BrokerConnect onConnected={() => { notify('success', 'Broker account connected.'); loadConnections(); }} />
          <ImportCSV
            userId={user?.id}
            onImported={() => {
              notify('success', 'CSV import complete — check your Calendar tab.');
              loadConnections();
            }}
          />
        </div>

        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Connected Accounts</h2>
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-0.5">
            {connections.length}
          </span>
        </div>

        <div className="space-y-3">
          {connections.length === 0 && (
            <div className="bg-white dark:bg-[#15151b] border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-6 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">No accounts connected yet.</p>
            </div>
          )}
          {connections.map((c) => (
            <AccountCard
              key={c.id}
              connection={c}
              onSaved={loadConnections}
              onSync={handleSync}
              onDelete={handleDelete}
              syncing={syncingId === c.id}
              deleting={deletingId === c.id}
              notify={notify}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
