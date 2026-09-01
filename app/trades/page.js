'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabaseClient';
import { applyAccountFilter } from '../../lib/accountFilter';
import { rMultiple } from '../../lib/tradeMath';
import { formatMoney } from '../../lib/format';
import { tradesToCsv, downloadCsv } from '../../lib/exportCsv';
import TradeSummaryCard from '../../components/TradeSummaryCard';
import AppShell from '../../components/AppShell';

const DEFAULT_ACCOUNT_FILTER = { allSelected: true, selectedIds: [], includeManual: false };

// Same values used in DayPanel.js — kept in sync so a trade tagged here
// looks identical to one tagged from the day view.
const EMOTIONS = ['disciplined', 'confident', 'hesitant', 'fomo', 'revenge', 'bored', 'anxious'];
const RULE_OPTIONS = [
  { value: 'followed_plan', label: 'Followed plan' },
  { value: 'impulse_entry', label: 'Impulse entry' },
  { value: 'moved_stop', label: 'Moved stop' },
  { value: 'oversized', label: 'Oversized' },
  { value: 'other', label: 'Other deviation' },
];
const BULK_FIELDS = [
  { value: 'rule_adherence', label: 'Rule adherence' },
  { value: 'emotion', label: 'Emotion' },
  { value: 'setup_type', label: 'Setup type' },
  { value: 'strategy_id', label: 'Strategy' },
];

export default function TradesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [trades, setTrades] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [defaultRiskAmount, setDefaultRiskAmount] = useState(null);
  const [accountFilter, setAccountFilter] = useState(DEFAULT_ACCOUNT_FILTER);
  const [loading, setLoading] = useState(true);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkField, setBulkField] = useState('rule_adherence');
  const [bulkValue, setBulkValue] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tj_account_filter');
      if (saved) setAccountFilter(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/login');
      else setUser(session.user);
    });
  }, [router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('broker_connections')
      .select('id, broker_server, mt5_login')
      .order('created_at', { ascending: true })
      .then(({ data }) => setAccounts(data || []));
    supabase
      .from('strategies')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }) => setStrategies(data || []));
    supabase
      .from('user_settings')
      .select('default_risk_amount')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setDefaultRiskAmount(data?.default_risk_amount ?? null));
  }, [user]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase.from('trades').select('*').order('entry_time', { ascending: false });
    query = applyAccountFilter(query, accountFilter);
    const { data, error } = await query;
    if (!error) setTrades(data || []);
    setLoading(false);
  }, [user, accountFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // Selection refers to rows currently on screen — clear it whenever the
  // underlying trade list changes so we never act on stale ids.
  useEffect(() => {
    setSelectedIds([]);
  }, [trades]);

  function toggleOne(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelectedIds((prev) => (prev.length === trades.length ? [] : trades.map((t) => t.id)));
  }

  async function applyBulkTag() {
    if (!bulkValue || selectedIds.length === 0) return;
    setApplying(true);
    const { error } = await supabase
      .from('trades')
      .update({ [bulkField]: bulkValue })
      .in('id', selectedIds);
    setApplying(false);
    if (error) {
      alert(`Failed to apply tag: ${error.message}`);
      return;
    }
    setTrades((prev) =>
      prev.map((t) => (selectedIds.includes(t.id) ? { ...t, [bulkField]: bulkValue } : t))
    );
    setSelectedIds([]);
    setBulkValue('');
  }

  function accountName(id) {
    if (!id) return 'Manual';
    const a = accounts.find((x) => x.id === id);
    return a ? a.broker_server : '—';
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Trade History</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => downloadCsv(tradesToCsv(trades), `trades-export-${format(new Date(), 'yyyy-MM-dd')}.csv`)}
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              Export CSV
            </button>
            <button onClick={() => router.push('/journal')} className="text-sm text-gray-500 hover:text-gray-800">
              Back to Journal
            </button>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="sticky top-2 z-10 bg-indigo-600 text-white rounded-2xl shadow-lg px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">{selectedIds.length} selected</span>

            <select
              value={bulkField}
              onChange={(e) => {
                setBulkField(e.target.value);
                setBulkValue('');
              }}
              className="text-sm rounded-lg px-2 py-1 text-gray-900"
            >
              {BULK_FIELDS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>

            {bulkField === 'rule_adherence' && (
              <select
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                className="text-sm rounded-lg px-2 py-1 text-gray-900"
              >
                <option value="">Choose a value…</option>
                {RULE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}

            {bulkField === 'emotion' && (
              <select
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                className="text-sm rounded-lg px-2 py-1 text-gray-900"
              >
                <option value="">Choose a value…</option>
                {EMOTIONS.map((em) => (
                  <option key={em} value={em}>
                    {em}
                  </option>
                ))}
              </select>
            )}

            {bulkField === 'setup_type' && (
              <input
                placeholder="e.g. breakout, reversal, liquidity sweep"
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                className="text-sm rounded-lg px-2 py-1 text-gray-900"
              />
            )}

            {bulkField === 'strategy_id' && (
              <select
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                className="text-sm rounded-lg px-2 py-1 text-gray-900"
              >
                <option value="">Choose a strategy…</option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={applyBulkTag}
              disabled={!bulkValue || applying}
              className="text-sm bg-white text-indigo-600 font-medium px-3 py-1 rounded-lg disabled:opacity-50"
            >
              {applying ? 'Applying…' : `Apply to ${selectedIds.length} trade${selectedIds.length !== 1 ? 's' : ''}`}
            </button>

            <button onClick={() => setSelectedIds([])} className="text-sm text-indigo-100 hover:text-white ml-auto">
              Clear selection
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 text-sm">Loading trades...</p>
        ) : trades.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-10 text-center text-gray-400 text-sm">
            No trades found for this account selection.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                  <th className="px-4 py-3 font-medium">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === trades.length && trades.length > 0}
                      onChange={toggleAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Symbol</th>
                  <th className="px-4 py-3 font-medium">Side</th>
                  <th className="px-4 py-3 font-medium">Entry</th>
                  <th className="px-4 py-3 font-medium">Exit</th>
                  <th className="px-4 py-3 font-medium">Size</th>
                  <th className="px-4 py-3 font-medium">P&L</th>
                  <th className="px-4 py-3 font-medium">R</th>
                  <th className="px-4 py-3 font-medium">Account</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => {
                  const r = rMultiple(t, defaultRiskAmount);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTrade(t)}
                      className={`border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 ${
                        selectedIds.includes(t.id) ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(t.id)}
                          onChange={() => toggleOne(t.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                        {format(new Date(t.entry_time), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{t.symbol}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            t.direction === 'long' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {t.direction}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{t.entry_price}</td>
                      <td className="px-4 py-3 text-gray-600">{t.exit_price ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{t.size}</td>
                      <td className={`px-4 py-3 font-medium ${Number(t.pnl) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {formatMoney(Number(t.pnl))}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{r !== null ? `${r >= 0 ? '+' : ''}${r.toFixed(2)}R` : '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{accountName(t.broker_connection_id)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <TradeSummaryCard trade={selectedTrade} defaultRiskAmount={defaultRiskAmount} onClose={() => setSelectedTrade(null)} />
      </div>
    </AppShell>
  );
}
