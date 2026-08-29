'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { formatMoney } from '../../lib/format';
import AppShell from '../../components/AppShell';

function StrategyCard({ strategy, trades, onDelete, onRename }) {
  const linked = trades.filter((t) => t.strategy_id === strategy.id && t.exit_price !== null && t.exit_price !== undefined);
  const wins = linked.filter((t) => Number(t.pnl) > 0);
  const winRate = linked.length ? (wins.length / linked.length) * 100 : 0;
  const totalPnl = linked.reduce((s, t) => s + Number(t.pnl || 0), 0);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(strategy.name);
  const [desc, setDesc] = useState(strategy.description || '');

  async function save() {
    await onRename(strategy.id, name, desc);
    setEditing(false);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
      {editing ? (
        <div className="space-y-2 mb-3">
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-sm font-semibold text-gray-900" />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="What defines this setup?" className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-700" />
          <div className="flex gap-2">
            <button onClick={save} className="text-xs text-indigo-600 hover:text-indigo-500">Save</button>
            <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">{strategy.name}</h3>
            {strategy.description && <p className="text-xs text-gray-400 mt-0.5">{strategy.description}</p>}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => setEditing(true)} className="text-xs text-indigo-500 hover:text-indigo-400">Edit</button>
            <button onClick={() => onDelete(strategy.id)} className="text-xs text-red-500 hover:text-red-400">Delete</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="text-xs text-gray-400 mb-1">Trades</div>
          <div className="text-base font-semibold text-gray-900">{linked.length}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Win Rate</div>
          <div className="text-base font-semibold text-gray-900">{linked.length ? `${winRate.toFixed(0)}%` : '—'}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">P&L</div>
          <div className={`text-base font-semibold ${totalPnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {linked.length ? formatMoney(totalPnl) : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StrategiesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [strategies, setStrategies] = useState([]);
  const [trades, setTrades] = useState([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/login');
      else setUser(session.user);
    });
  }, [router]);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: s }, { data: t }] = await Promise.all([
      supabase.from('strategies').select('*').order('created_at', { ascending: true }),
      supabase.from('trades').select('id, pnl, exit_price, strategy_id'),
    ]);
    setStrategies(s || []);
    setTrades(t || []);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function createStrategy() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    await supabase.from('strategies').insert({ user_id: user.id, name });
    setNewName('');
    setCreating(false);
    load();
  }

  async function renameStrategy(id, name, description) {
    await supabase.from('strategies').update({ name, description }).eq('id', id);
    load();
  }

  async function deleteStrategy(id) {
    if (!confirm('Delete this strategy? Trades tagged with it will become untagged.')) return;
    await supabase.from('strategies').delete().eq('id', id);
    load();
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Strategies</h1>
          <button onClick={() => router.push('/journal')} className="text-sm text-gray-500 hover:text-gray-800">
            Back to Journal
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 mb-6 flex gap-2">
          <input
            placeholder="New strategy name (e.g. ICT Silver Bullet)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
          />
          <button
            onClick={createStrategy}
            disabled={creating}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-sm font-medium"
          >
            + Add
          </button>
        </div>

        {strategies.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-10 text-center text-gray-400 text-sm">
            No strategies yet — define your first playbook above, then tag trades with it from the Calendar tab.
          </div>
        ) : (
          <div className="space-y-3">
            {strategies.map((s) => (
              <StrategyCard key={s.id} strategy={s} trades={trades} onDelete={deleteStrategy} onRename={renameStrategy} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
