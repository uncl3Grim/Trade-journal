'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { supabase } from '../../lib/supabaseClient';
import Calendar from '../../components/Calendar';
import StatsBar from '../../components/StatsBar';
import ReviewPanel from '../../components/ReviewPanel';
import NotesView from '../../components/NotesView';
import AccountSwitcher from '../../components/AccountSwitcher';
import DrawdownStats from '../../components/DrawdownStats';
import DisplayModeToggle from '../../components/DisplayModeToggle';
import PsychologyQuotes from '../../components/PsychologyQuotes';
import PeriodStatsHeader from '../../components/PeriodStatsHeader';
import WeeklyTotals from '../../components/WeeklyTotals';
import PropFirmTracker from '../../components/PropFirmTracker';
import AnimatedOverview from '../../components/AnimatedOverview';
import SyncStatusWidget from '../../components/SyncStatusWidget';
import AppShell from '../../components/AppShell';
import { computeDailyStats } from '../../lib/dailyStats';
import { applyAccountFilter, computeActiveAccountId } from '../../lib/accountFilter';

const DEFAULT_ACCOUNT_FILTER = { allSelected: true, selectedIds: [], includeManual: false };

export default function JournalPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [month, setMonth] = useState(new Date());
  const [trades, setTrades] = useState([]);
  const [allTrades, setAllTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('calendar');
  const [accounts, setAccounts] = useState([]);
  const [strategies, setStrategies] = useState([]);
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
      .select(
        'id, broker_server, broker_type, mt5_login, starting_balance, daily_loss_limit_pct, max_loss_limit_pct, profit_target_pct, status, last_synced_at'
      )
      .order('created_at', { ascending: true })
      .then(({ data }) => setAccounts(data || []));

    supabase
      .from('strategies')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }) => setStrategies(data || []));

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

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <PsychologyQuotes />

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Trade Journal</h1>
          <span className="text-sm text-gray-400">{user?.email}</span>
        </div>

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('calendar')}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium ${
                tab === 'calendar'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-[#15151b] border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setTab('review')}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium ${
                tab === 'review'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-[#15151b] border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Review
            </button>
            <button
              onClick={() => setTab('notes')}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium ${
                tab === 'notes'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-[#15151b] border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
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
            {activeAccountObj && (
              <SyncStatusWidget account={activeAccountObj} onSynced={() => { loadTrades(); loadAllTrades(); }} />
            )}
            {activeAccountObj && <PropFirmTracker trades={allTrades} account={activeAccountObj} />}
            <AnimatedOverview trades={allTrades} />
            <DrawdownStats
              trades={allTrades}
              defaultRiskAmount={defaultRiskAmount}
              startingBalance={startingBalance}
              balanceApplicable={balanceApplicable}
              account={activeAccountObj}
            />
            <PeriodStatsHeader trades={allTrades} mode={mode} defaultRiskAmount={defaultRiskAmount} accountBalance={startingBalance} />
            <StatsBar trades={trades} mode={mode} defaultRiskAmount={defaultRiskAmount} accountBalance={startingBalance} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setMonth(subMonths(month, 1))}
                    className="px-3 py-1 rounded-xl bg-white dark:bg-[#15151b] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-200"
                  >
                    ← Prev
                  </button>
                  <h2 className="font-medium text-gray-900 dark:text-gray-100">{format(month, 'MMMM yyyy')}</h2>
                  <button
                    onClick={() => setMonth(addMonths(month, 1))}
                    className="px-3 py-1 rounded-xl bg-white dark:bg-[#15151b] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-200"
                  >
                    Next →
                  </button>
                </div>
                {loading ? (
                  <p className="text-gray-400 text-sm">Loading trades...</p>
                ) : (
                  <Calendar
                    month={month}
                    dailyStats={dailyStats}
                    onDayClick={(day) => router.push(`/journal/day/${format(day, 'yyyy-MM-dd')}`)}
                    selectedDate={null}
                    mode={mode}
                    accountBalance={startingBalance}
                  />
                )}
              </div>

              <div>
                <WeeklyTotals month={month} dailyStats={dailyStats} mode={mode} />
              </div>
            </div>
          </>
        )}

        {tab === 'review' && <ReviewPanel trades={allTrades} defaultRiskAmount={defaultRiskAmount} mode={mode} />}
        {tab === 'notes' && <NotesView userId={user?.id} accountFilter={accountFilter} accounts={accounts} />}
      </div>
    </AppShell>
  );
}
