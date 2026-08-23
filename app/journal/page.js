'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { supabase } from '../../lib/supabaseClient';
import Calendar from '../../components/Calendar';
import DayPanel from '../../components/DayPanel';
import StatsBar from '../../components/StatsBar';
import ReviewPanel from '../../components/ReviewPanel';
import NotesView from '../../components/NotesView';
import AccountSwitcher from '../../components/AccountSwitcher';
import DrawdownStats from '../../components/DrawdownStats';
import DisplayModeToggle from '../../components/DisplayModeToggle';
import PsychologyQuotes from '../../components/PsychologyQuotes';
import PeriodStatsHeader from '../../components/PeriodStatsHeader';
import { computeDailyStats } from '../../lib/dailyStats';
import { applyAccountFilter, computeActiveAccountId } from '../../lib/accountFilter';
import WeeklyTotals from '../../components/WeeklyTotals';

const DEFAULT_ACCOUNT_FILTER = { allSelected: true, selectedIds: [], includeManual: false };

export default function JournalPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [month, setMonth] = useState(new Date());
  const [trades, setTrades] = useState([]);
  const [allTrades, setAllTrades] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('calendar');
  const [accounts, setAccounts] = useState([]);
  const [defaultRiskAmount, setDefaultRiskAmount] = useState(null);
  const [accountBalance, setAccountBalance] = useState(null);
  const [mode, setMode] = useState('dollar');
  const [accountFilter, setAccountFilter] = useState(DEFAULT_ACCOUNT_FILTER);

  useEffect(() => {
    try {
      const savedFilter = localStorage.getItem('tj_account_filter');
      if (savedFilter) setAccountFilter(JSON.parse(savedFilter));
      const savedMode = localStorage.getItem('tj_display_mode');
      if (savedMode) setMode(savedMode);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('tj_account_filter', JSON.stringify(accountFilter));
    } catch {}
  }, [accountFilter]);

  useEffect(() => {
    try {
      localStorage.setItem('tj_display_mode', mode);
    } catch {}
  }, [mode]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
      } else {
        setUser(session.user);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login');
    });
    return () => listener.subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('broker_connections')
      .select('id, broker_server, broker_type, mt5_login, starting_balance')
      .order('created_at', { ascending: true })
      .then(({ data }) => setAccounts(data || []));

    supabase
      .from('user_settings')
      .select('default_risk_amount, account_balance')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setDefaultRiskAmount(data?.default_risk_amount ?? null);
        setAccountBalance(data?.account_balance ?? null);
      });
  }, [user]);

  const loadTrades = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const rangeStart = startOfWeek(startOfMonth(month));
    const rangeEnd = endOfWeek(endOfMonth(month));

    let query = supabase
      .from('trades')
      .select('*')
      .gte('entry_time', rangeStart.toISOString())
      .lte('entry_time', rangeEnd.toISOString())
      .order('entry_time', { ascending: true });

    query = applyAccountFilter(query, accountFilter);

    const { data, error } = await query;
    if (!error) setTrades(data || []);
    setLoading(false);
  }, [user, month, accountFilter]);

  const loadAllTrades = useCallback(async () => {
    if (!user) return;
    let query = supabase.from('trades').select('*').order('entry_time', { ascending: true });
    query = applyAccountFilter(query, accountFilter);
    const { data, error } = await query;
    if (!error) setAllTrades(data || []);
  }, [user, accountFilter]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  useEffect(() => {
    loadAllTrades();
  }, [loadAllTrades]);

  const dailyStats = computeDailyStats(trades, defaultRiskAmount);
  const activeAccountId = computeActiveAccountId(accountFilter);
  const activeAccountObj = activeAccountId ? accounts.find((a) => a.id === activeAccountId) : null;
  const manualOnly = !accountFilter.allSelected && accountFilter.includeManual && accountFilter.selectedIds.length === 0;
  const startingBalance = activeAccountObj ? activeAccountObj.starting_balance : manualOnly ? accountBalance : null;
  const balanceApplicable = !!activeAccountObj || manualOnly;

  const selectedDayTrades = selectedDate
    ? trades.filter((t) => format(new Date(t.entry_time), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'))
    : [];

  const initial = user?.email ? user.email[0].toUpperCase() : '?';

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 py-6 bg-[#f7f7fb]">
      <PsychologyQuotes />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Trade Journal</h1>
        <div className="flex items-center gap-3">
         'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabaseClient';
import { applyAccountFilter } from '../../lib/accountFilter';
import { rMultiple } from '../../lib/tradeMath';

const DEFAULT_ACCOUNT_FILTER = { allSelected: true, selectedIds: [], includeManual: false };

export default function TradesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [trades, setTrades] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [defaultRiskAmount, setDefaultRiskAmount] = useState(null);
  const [accountFilter, setAccountFilter] = useState(DEFAULT_ACCOUNT_FILTER);
  const [loading, setLoading] = useState(true);

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

  function accountName(id) {
    if (!id) return 'Manual';
    const a = accounts.find((x) => x.id === id);
    return a ? a.broker_server : '—';
  }

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 py-6 bg-[#f7f7fb]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Trade History</h1>
        <button onClick={() => router.push('/journal')} className="text-sm text-gray-500 hover:text-gray-800">
          Back to Journal
        </button>
      </div>

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
                  <tr key={t.id} className="border-b border-gray-50 last:border-0">
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
                      {Number(t.pnl) >= 0 ? '+' : ''}
                      {Number(t.pnl).toFixed(2)}
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
    </div>
  );
}
    <button onClick={() => router.push('/broker')} className="text-sm text-gray-500 hover:text-gray-800">
            Broker
          </button>
          <button
            onClick={() => router.push('/profile')}
            className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold"
            title="Profile"
          >
            {initial}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('calendar')}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium ${
              tab === 'calendar' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-800'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setTab('review')}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium ${
              tab === 'review' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-800'
            }`}
          >
            Review
          </button>
          <button
            onClick={() => setTab('notes')}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium ${
              tab === 'notes' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-800'
            }`}
          >
            Notes
          </button>
        </div>

        <div className="flex items-center gap-3">
          <DisplayModeToggle mode={mode} onChange={setMode} />
          {accounts.length > 0 && (
            <AccountSwitcher
              accounts={accounts}
              allSelected={accountFilter.allSelected}
              selectedIds={accountFilter.selectedIds}
              includeManual={accountFilter.includeManual}
              onChange={setAccountFilter}
            />
          )}
        </div>
      </div>

      {tab === 'calendar' && (
        <>
          <DrawdownStats
            trades={allTrades}
            defaultRiskAmount={defaultRiskAmount}
            startingBalance={startingBalance}
            balanceApplicable={balanceApplicable}
          />
          <PeriodStatsHeader trades={allTrades} mode={mode} defaultRiskAmount={defaultRiskAmount} accountBalance={startingBalance} />
          <StatsBar trades={trades} mode={mode} defaultRiskAmount={defaultRiskAmount} accountBalance={startingBalance} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setMonth(subMonths(month, 1))} className="px-3 py-1 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-sm text-gray-700">
                  ← Prev
                </button>
                <h2 className="font-medium text-gray-900">{format(month, 'MMMM yyyy')}</h2>
                <button onClick={() => setMonth(addMonths(month, 1))} className="px-3 py-1 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-sm text-gray-700">
                  Next →
                </button>
              </div>
              {loading ? (
                <p className="text-gray-400 text-sm">Loading trades...</p>
              ) : (
                <Calendar
                  month={month}
                  dailyStats={dailyStats}
                  onDayClick={setSelectedDate}
                  selectedDate={selectedDate}
                  mode={mode}
                  accountBalance={startingBalance}
                />
              )}
            </div>

            <div>
              <WeeklyTotals month={month} dailyStats={dailyStats} mode={mode} />
              <DayPanel
                date={selectedDate}
                trades={selectedDayTrades}
                userId={user?.id}
                accounts={accounts}
                defaultRiskAmount={defaultRiskAmount}
                activeAccountId={activeAccountId}
                onChanged={() => {
                  loadTrades();
                  loadAllTrades();
                }}
                onClose={() => setSelectedDate(null)}
              />
            </div>
          </div>
        </>
      )}

      {tab === 'review' && <ReviewPanel trades={allTrades} defaultRiskAmount={defaultRiskAmount} mode={mode} />}
      {tab === 'notes' && <NotesView userId={user?.id} accountFilter={accountFilter} accounts={accounts} />}
    </div>
  );
}
