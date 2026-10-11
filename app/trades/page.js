'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabaseClient';
import { applyAccountFilter } from '../../lib/accountFilter';
import { rMultiple } from '../../lib/tradeMath';
import { formatMoney } from '../../lib/format';
import { tradesToCsv, downloadCsv } from '../../lib/exportCsv';
import TradeSummaryCard from '../../components/TradeSummaryCard';
import AppShell from '../../components/AppShell';

const PAGE_SIZE = 100;
const GLASS = 'bg-white/[0.04] backdrop-blur-md border border-neutral-800/60';
const FIELD =
  'bg-white/[0.04] border border-neutral-800/60 text-neutral-100 placeholder-neutral-600 rounded-xl focus:outline-none focus:border-indigo-500/60';

function safeDate(v) {
  const d = v ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? d : null;
}

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
const BULK_BATCH_SIZE = 100;
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
  const [bulkStatus, setBulkStatus] = useState(null); // { type: 'success' | 'error', text }
  const [search, setSearch] = useState('');
  const [sideFilter, setSideFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [visible, setVisible] = useState(PAGE_SIZE);

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
    let query = supabase.from('trades').select('*').order('entry_time', { ascending: false }).range(0, 49999);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trades.filter((t) => {
      if (q && !String(t.symbol || '').toLowerCase().includes(q)) return false;
      if (sideFilter !== 'all' && t.direction !== sideFilter) return false;
      const pnl = Number(t.pnl || 0);
      if (resultFilter === 'win' && !(pnl > 0)) return false;
      if (resultFilter === 'loss' && !(pnl < 0)) return false;
      return true;
    });
  }, [trades, search, sideFilter, resultFilter]);

  // Filters change which rows are on screen, so drop any selection and paging.
  useEffect(() => {
    setSelectedIds([]);
    setVisible(PAGE_SIZE);
  }, [search, sideFilter, resultFilter]);

  const summary = useMemo(() => {
    const pnls = filtered.map((t) => Number(t.pnl || 0));
    const net = pnls.reduce((a, b) => a + b, 0);
    const wins = pnls.filter((v) => v > 0).length;
    const decided = pnls.filter((v) => v !== 0).length;
    return { count: filtered.length, net, winRate: decided ? (wins / decided) * 100 : null };
  }, [filtered]);

  function toggleAll() {
    setSelectedIds((prev) => (prev.length === filtered.length ? [] : filtered.map((t) => t.id)));
  }

  // Each id travels in the request URL, so tagging hundreds of trades in one
  // call produces a URL long enough for the server to reject. Send the ids in
  // small batches, and only report success for rows the database confirms it
  // actually changed (.select('id') returns exactly the updated rows).
  async function applyBulkTag() {
    if (!bulkValue || selectedIds.length === 0) return;
    setApplying(true);
    setBulkStatus(null);

    const ids = [...selectedIds];
    const updatedIds = new Set();
    let failure = null;

    for (let i = 0; i < ids.length; i += BULK_BATCH_SIZE) {
      const batch = ids.slice(i, i + BULK_BATCH_SIZE);
      const { data, error } = await supabase
        .from('trades')
        .update({ [bulkField]: bulkValue })
        .in('id', batch)
        .select('id');
      if (error) {
        failure = error.message || 'The request was rejected.';
        break;
      }
      for (const row of data || []) updatedIds.add(row.id);
    }

    setApplying(false);

    const label = BULK_FIELDS.find((f) => f.value === bulkField)?.label || 'Tag';
    if (updatedIds.size === ids.length) {
      setBulkStatus({ type: 'success', text: `${label} applied to ${ids.length} trade${ids.length !== 1 ? 's' : ''}.` });
    } else {
      setBulkStatus({
        type: 'error',
        text: `${label} was applied to ${updatedIds.size} of ${ids.length} trades. ${
          failure ? `Error: ${failure}` : 'The database skipped the rest. Check that you own those trades.'
        }`,
      });
    }
    setTimeout(() => setBulkStatus(null), 8000);

    if (updatedIds.size > 0) {
      setTrades((prev) => prev.map((t) => (updatedIds.has(t.id) ? { ...t, [bulkField]: bulkValue } : t)));
      setBulkValue('');
    }
  }

  function accountName(id) {
    if (!id) return 'Manual';
    const a = accounts.find((x) => x.id === id);
    return a ? a.broker_server : '—';
  }

  const rows = filtered.slice(0, visible);
  const selectCls = 'text-sm px-2.5 py-1.5 ' + FIELD;

  function Seg({ value, onChange, options }) {
    return (
      <div className={`inline-flex rounded-xl p-0.5 ${GLASS}`}>
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-[10px] transition ${
              value === o.value ? 'bg-indigo-500/90 text-white shadow' : 'text-neutral-400 hover:text-neutral-100'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold text-neutral-100">Trade History</h1>
            <p className="text-xs text-neutral-500 mt-0.5">Every trade for the selected accounts. Tap a row for its card.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadCsv(tradesToCsv(trades), `trades-export-${format(new Date(), 'yyyy-MM-dd')}.csv`)}
              className={`text-sm text-indigo-300 hover:text-indigo-200 px-3 py-1.5 rounded-xl ${GLASS}`}
            >
              Export CSV
            </button>
            <button
              onClick={() => router.push('/journal')}
              className={`text-sm text-neutral-400 hover:text-neutral-100 px-3 py-1.5 rounded-xl ${GLASS}`}
            >
              Back to Journal
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <div className={`${GLASS} rounded-2xl p-3 min-w-0`}>
            <div className="text-xs text-neutral-500 mb-1">Trades</div>
            <div className="text-lg font-semibold text-neutral-100 truncate">{summary.count}</div>
          </div>
          <div className={`${GLASS} rounded-2xl p-3 min-w-0 col-span-2 sm:col-span-1 order-last sm:order-none`}>
            <div className="text-xs text-neutral-500 mb-1">Net P&L</div>
            <div className={`text-base sm:text-lg font-semibold truncate ${summary.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatMoney(summary.net)}
            </div>
          </div>
          <div className={`${GLASS} rounded-2xl p-3 min-w-0`}>
            <div className="text-xs text-neutral-500 mb-1">Win rate</div>
            <div className="text-lg font-semibold text-neutral-100 truncate">
              {summary.winRate === null ? '—' : `${summary.winRate.toFixed(1)}%`}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search symbol…"
            className={`text-sm px-3 py-1.5 w-full sm:w-52 ${FIELD}`}
          />
          <Seg
            value={sideFilter}
            onChange={setSideFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'long', label: 'Long' },
              { value: 'short', label: 'Short' },
            ]}
          />
          <Seg
            value={resultFilter}
            onChange={setResultFilter}
            options={[
              { value: 'all', label: 'Any result' },
              { value: 'win', label: 'Wins' },
              { value: 'loss', label: 'Losses' },
            ]}
          />
        </div>

        {selectedIds.length > 0 && (
          <div className="sticky top-2 z-10 bg-indigo-500/20 backdrop-blur-md border border-indigo-400/30 text-neutral-100 rounded-2xl shadow-lg px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">{selectedIds.length} selected</span>

            <select
              value={bulkField}
              style={{ colorScheme: 'dark' }}
              onChange={(e) => {
                setBulkField(e.target.value);
                setBulkValue('');
              }}
              className={selectCls}
            >
              {BULK_FIELDS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>

            {bulkField === 'rule_adherence' && (
              <select value={bulkValue} style={{ colorScheme: 'dark' }} onChange={(e) => setBulkValue(e.target.value)} className={selectCls}>
                <option value="">Choose a value…</option>
                {RULE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}

            {bulkField === 'emotion' && (
              <select value={bulkValue} style={{ colorScheme: 'dark' }} onChange={(e) => setBulkValue(e.target.value)} className={selectCls}>
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
                className={`text-sm px-2.5 py-1.5 ${FIELD}`}
              />
            )}

            {bulkField === 'strategy_id' && (
              <select value={bulkValue} style={{ colorScheme: 'dark' }} onChange={(e) => setBulkValue(e.target.value)} className={selectCls}>
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
              className="text-sm bg-indigo-500 hover:bg-indigo-400 text-white font-medium px-3 py-1.5 rounded-xl disabled:opacity-40"
            >
              {applying ? 'Applying…' : `Apply to ${selectedIds.length} trade${selectedIds.length !== 1 ? 's' : ''}`}
            </button>

            <button onClick={() => setSelectedIds([])} className="text-sm text-neutral-400 hover:text-neutral-100 ml-auto">
              Clear selection
            </button>
          </div>
        )}

        {bulkStatus && (
          <div
            role="status"
            className={`mb-4 rounded-xl border px-4 py-3 text-sm animate-fade-in-up ${
              bulkStatus.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {bulkStatus.text}
          </div>
        )}

        {loading ? (
          <div className={`${GLASS} rounded-2xl p-10 text-center text-neutral-500 text-sm`}>Loading trades…</div>
        ) : filtered.length === 0 ? (
          <div className={`${GLASS} rounded-2xl p-10 text-center text-neutral-500 text-sm`}>
            {trades.length === 0 ? 'No trades found for this account selection.' : 'No trades match these filters.'}
          </div>
        ) : (
          <div className={`${GLASS} rounded-2xl overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800/60 text-left text-[11px] uppercase tracking-wide text-neutral-500">
                    <th className="px-4 py-3 font-medium">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filtered.length && filtered.length > 0}
                        onChange={toggleAll}
                        className="rounded accent-indigo-500"
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Symbol</th>
                    <th className="px-4 py-3 font-medium">Side</th>
                    <th className="px-4 py-3 font-medium">Entry</th>
                    <th className="px-4 py-3 font-medium">Exit</th>
                    <th className="px-4 py-3 font-medium">Size</th>
                    <th className="px-4 py-3 font-medium text-right">P&L</th>
                    <th className="px-4 py-3 font-medium text-right">R</th>
                    <th className="px-4 py-3 font-medium">Account</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => {
                    const r = rMultiple(t, defaultRiskAmount);
                    const pnl = Number(t.pnl || 0);
                    const d = safeDate(t.entry_time);
                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTrade(t)}
                        className={`border-b border-neutral-800/40 last:border-0 cursor-pointer transition-colors hover:bg-white/[0.05] ${
                          selectedIds.includes(t.id) ? 'bg-indigo-500/10' : ''
                        }`}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(t.id)}
                            onChange={() => toggleOne(t.id)}
                            className="rounded accent-indigo-500"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-neutral-400">{d ? format(d, 'MMM d, yyyy') : '—'}</td>
                        <td className="px-4 py-3 font-medium text-neutral-100">{t.symbol}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full border ${
                              t.direction === 'long'
                                ? 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20'
                                : 'bg-rose-400/10 text-rose-300 border-rose-400/20'
                            }`}
                          >
                            {t.direction}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-400 tabular-nums">{t.entry_price ? t.entry_price : '—'}</td>
                        <td className="px-4 py-3 text-neutral-400 tabular-nums">{t.exit_price ? t.exit_price : '—'}</td>
                        <td className="px-4 py-3 text-neutral-400 tabular-nums">{t.size ? t.size : '—'}</td>
                        <td className={`px-4 py-3 font-medium text-right tabular-nums whitespace-nowrap ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatMoney(pnl)}
                        </td>
                        <td className="px-4 py-3 text-neutral-500 text-right tabular-nums whitespace-nowrap">
                          {r !== null ? `${r >= 0 ? '+' : ''}${r.toFixed(2)}R` : '—'}
                        </td>
                        <td className="px-4 py-3 text-neutral-500 text-xs whitespace-nowrap">{accountName(t.broker_connection_id)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length > visible && (
              <div className="border-t border-neutral-800/60 p-3 text-center">
                <button
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="text-sm text-indigo-300 hover:text-indigo-200"
                >
                  Show more ({filtered.length - visible} left)
                </button>
              </div>
            )}
          </div>
        )}
        <TradeSummaryCard trade={selectedTrade} defaultRiskAmount={defaultRiskAmount} onClose={() => setSelectedTrade(null)} />
      </div>
    </AppShell>
  );
}
