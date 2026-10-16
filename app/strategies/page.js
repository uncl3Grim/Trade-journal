'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { formatMoney } from '../../lib/format';
import { fetchAllRows } from '../../lib/fetchAll';
import AppShell from '../../components/AppShell';

// Optional starters. Edit freely after adding.
const TEMPLATES = {
  Continuation: [
    'Daily bias: continuation',
    '4hr C2/C3 confirmed',
    '15min CISD',
    'EQ / T-spot plotted',
    'Entry via positional entry or ICISD',
    'Standard deviation levels marked',
  ],
  Reversal: [
    'Daily bias: reversal',
    '1hr/30min CISD confirmation',
    '4hr C2/C3 confirmed',
    '15min CISD',
    'EQ / T-spot plotted',
    'Entry via positional entry or ICISD',
    'Standard deviation levels marked',
  ],
};

const isClosed = (t) => t.exit_price !== null && t.exit_price !== undefined;

function summarize(list) {
  const wins = list.filter((t) => Number(t.pnl) > 0).length;
  return {
    count: list.length,
    winRate: list.length ? (wins / list.length) * 100 : null,
    pnl: list.reduce((s, t) => s + Number(t.pnl || 0), 0),
  };
}

function ChecklistStats({ tagged }) {
  // Only closed trades that were logged with a checklist
  const withList = tagged.filter((t) => isClosed(t) && Array.isArray(t.checklist) && t.checklist.length > 0);
  if (withList.length === 0) return null;
  const full = withList.filter((t) => t.checklist.every((c) => c.d));
  const missed = withList.filter((t) => !t.checklist.every((c) => c.d));
  const a = summarize(full);
  const b = summarize(missed);

  const Row = ({ label, s, tone }) => (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className={tone}>{label}</span>
      <span className="text-gray-500 tabular-nums">
        {s.count} trade{s.count !== 1 ? 's' : ''} · {s.winRate === null ? '—' : `${s.winRate.toFixed(0)}% win`} ·{' '}
        <span className={s.pnl >= 0 ? 'text-green-600' : 'text-red-500'}>{s.count ? formatMoney(s.pnl) : '—'}</span>
      </span>
    </div>
  );

  return (
    <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-1.5">
      <div className="text-xs font-medium text-gray-700 mb-1">Does the checklist pay?</div>
      <Row label="Every rule ticked" s={a} tone="text-green-600" />
      <Row label="Missed a rule" s={b} tone="text-red-500" />
    </div>
  );
}

function StrategyCard({ strategy, trades, onDelete, onSave }) {
  const tagged = trades.filter((t) => t.strategy_id === strategy.id);
  const linked = tagged.filter(isClosed);
  const openCount = tagged.length - linked.length;
  const wins = linked.filter((t) => Number(t.pnl) > 0);
  const winRate = linked.length ? (wins.length / linked.length) * 100 : 0;
  const totalPnl = linked.reduce((s, t) => s + Number(t.pnl || 0), 0);
  const items = Array.isArray(strategy.checklist) ? strategy.checklist : [];

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(strategy.name);
  const [desc, setDesc] = useState(strategy.description || '');
  const [draft, setDraft] = useState(items);
  const [newItem, setNewItem] = useState('');
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setName(strategy.name);
    setDesc(strategy.description || '');
    setDraft(items);
    setNewItem('');
    setEditing(true);
  }

  function addItem() {
    const t = newItem.trim();
    if (!t) return;
    setDraft([...draft, t]);
    setNewItem('');
  }

  function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= draft.length) return;
    const next = draft.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setDraft(next);
  }

  async function save() {
    setSaving(true);
    const pending = newItem.trim();
    const finalItems = pending ? [...draft, pending] : draft;
    await onSave(strategy.id, name, desc, finalItems);
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
      {editing ? (
        <div className="space-y-3 mb-3">
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-sm font-semibold text-gray-900" />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="What defines this setup?" className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-700" />

          <div>
            <div className="text-xs font-medium text-gray-700 mb-1.5">Pre-trade checklist</div>
            {draft.length === 0 && <p className="text-xs text-gray-400 mb-2">No rules yet. Add the steps that must be true before you enter.</p>}
            <ul className="space-y-1.5 mb-2">
              {draft.map((t, i) => (
                <li key={`${i}-${t}`} className="flex items-center gap-1.5">
                  <input
                    value={t}
                    onChange={(e) => setDraft(draft.map((x, idx) => (idx === i ? e.target.value : x)))}
                    className="flex-1 min-w-0 bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900"
                  />
                  <button type="button" onClick={() => move(i, -1)} aria-label="Move up" className="text-gray-400 hover:text-gray-700 px-1 text-xs">↑</button>
                  <button type="button" onClick={() => move(i, 1)} aria-label="Move down" className="text-gray-400 hover:text-gray-700 px-1 text-xs">↓</button>
                  <button type="button" onClick={() => setDraft(draft.filter((_, idx) => idx !== i))} aria-label="Remove rule" className="text-red-400 hover:text-red-500 px-1 text-xs">✕</button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addItem();
                  }
                }}
                placeholder="Add a rule, e.g. 15min CISD"
                className="flex-1 min-w-0 bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900"
              />
              <button type="button" onClick={addItem} className="text-xs text-indigo-600 hover:text-indigo-500 px-2">+ Add</button>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
              <span className="text-[11px] text-gray-400">Start from:</span>
              {Object.keys(TEMPLATES).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setDraft([...draft, ...TEMPLATES[k].filter((x) => !draft.includes(x))])}
                  className="text-[11px] text-indigo-600 hover:text-indigo-500"
                >
                  {k} day
                </button>
              ))}
              {draft.length > 0 && (
                <button type="button" onClick={() => setDraft([])} className="text-[11px] text-gray-400 hover:text-gray-600 ml-auto">
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="text-xs text-indigo-600 hover:text-indigo-500 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="mb-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{strategy.name}</h3>
              {strategy.description && <p className="text-xs text-gray-400 mt-0.5">{strategy.description}</p>}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={startEdit} className="text-xs text-indigo-500 hover:text-indigo-400">Edit</button>
              <button onClick={() => onDelete(strategy.id)} className="text-xs text-red-500 hover:text-red-400">Delete</button>
            </div>
          </div>
          {items.length > 0 ? (
            <ul className="mt-3 space-y-1">
              {items.map((t, i) => (
                <li key={`${i}-${t}`} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-gray-300 text-[9px] text-gray-400">{i + 1}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-gray-400">No checklist yet. Tap Edit to add the rules for this setup.</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="text-xs text-gray-400 mb-1">Trades</div>
          <div className="text-base font-semibold text-gray-900">
            {tagged.length}
            {openCount > 0 && <span className="text-xs font-normal text-gray-400"> ({openCount} open)</span>}
          </div>
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

      <ChecklistStats tagged={tagged} />
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
      // Only trades that have a strategy, fetched page by page so the
      // 1000-row server cap can never hide tagged trades.
      fetchAllRows(() =>
        supabase
          .from('trades')
          .select('id, pnl, exit_price, strategy_id, checklist')
          .not('strategy_id', 'is', null)
          .order('id', { ascending: true })
      ),
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

  async function saveStrategy(id, name, description, checklist) {
    const cleaned = checklist.map((x) => x.trim()).filter(Boolean);
    const { error } = await supabase.from('strategies').update({ name, description, checklist: cleaned }).eq('id', id);
    if (error) alert(`Couldn't save: ${error.message}`);
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
            No strategies yet. Define your first playbook above, add its checklist, then pick it when you log a trade.
          </div>
        ) : (
          <div className="space-y-3">
            {strategies.map((s) => (
              <StrategyCard key={s.id} strategy={s} trades={trades} onDelete={deleteStrategy} onSave={saveStrategy} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
