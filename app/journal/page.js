'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths as subM } from 'date-fns';
import { supabase } from '../../lib/supabaseClient';
import Calendar from '../../components/Calendar';
import DayPanel from '../../components/DayPanel';
import StatsBar from '../../components/StatsBar';
import ImportCSV from '../../components/ImportCSV';
import ReviewPanel from '../../components/ReviewPanel';
import NotesView from '../../components/NotesView';
import AccountSwitcher from '../../components/AccountSwitcher';
import DrawdownStats from '../../components/DrawdownStats';
import DisplayModeToggle from '../../components/DisplayModeToggle';
import { computeDailyStats } from '../../lib/dailyStats';

const DEFAULT_ACCOUNT_FILTER = { allSelected: true, selectedIds: [], includeManual: false };

export default function JournalPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [month, setMonth] = useState(new Date());
  const [trades, setTrades] = useState([]);
  const [reviewTrades, setReviewTrades] = useState([]);
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
      .select('id, broker_server, broker_type, mt5_login')
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

  const applyAccountFilter = useCallback(
    (query) => {
      const { allSelected, selectedIds, includeManual } = accountFilter;
      if (allSelected) return query;

      if (includeManual && selectedIds.length) {
        return query.or(`broker_connection_id.in.(${selectedIds.join(',')}),broker_connection_id.is.null`);
      }
      if (includeManual) {
        return query.is('broker_connection_id', null);
      }
      if (selectedIds.length) {
        return query.in('broker_connection_id', selectedIds);
      }
      return query.eq('id', '00000000-0000-0000-0000-000000000000');
    },
    [accountFilter]
  );

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

    query = applyAccountFilter(query);

    const { data, error } = await query;
    if (!error) setTrades(data || []);
    setLoading(false);
  }, [user, month, applyAccountFilter]);

  const loadReviewTrades = useCallback(async () => {
    if (!user) return;
    const rangeStart = startOfMonth(subM(new Date(), 2));
    const rangeEnd = endOfMonth(new Date());

    let query = supabase
      .from('trades')
      .select('*')
      .gte('entry_time', rangeStart.toISOString())
      .lte('entry_time', rangeEnd.toISOString())
      .order('entry_time', { ascending: true });

    query = applyAccountFilter(query);

    const { data, error } = await query;
    if (!error) setReviewTrades(data || []);
  }, [user, applyAccountFilter]);

  const loadAllTrades = useCallback(async () => {
    if (!user) return;
    let query = supabase.from('trades').select('*').order('entry_time', { ascending: true });
    query = applyAccountFilter(query);
    const { data, error } = await query;
    if (!error) setAllTrades(data || []);
  }, [user, applyAccountFilter]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  useEffect(() => {
    if (tab === 'review') loadReviewTrades();
  }, [tab, loadReviewTrades]);

  useEffect(() => {
    loadAllTrades();
  }, [loadAllTrades]);

  const dailyStats = computeDailyStats(trades, defaultRiskAmount);

  const selectedDayTrades = selectedDate
    ? trades.filter((t) => format(new Date(t.entry_time), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'))
    : [];

  const initial = user?.email ? user.email[0].toUpperCase() : '?';

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 py-6 bg-[#f7f7fb]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Trade Journal</h1>
        <div className="flex items-center gap-3">
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
          <DrawdownStats trades={allTrades} defaultRiskAmount={defaultRiskAmount} accountBalance={accountBalance} />
          <StatsBar trades={trades} mode={mode} defaultRiskAmount={defaultRiskAmount} accountBalance={accountBalance} />

          <div className="mt-6">
            <ImportCSV userId={user?.id} onImported={loadTrades} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  accountBalance={accountBalance}
                />
              )}
            </div>

            <div>
              <DayPanel
                date={selectedDate}
                trades={selectedDayTrades}
                userId={user?.id}
                accounts={accounts}
                defaultRiskAmount={defaultRiskAmount}
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

      {tab === 'review' && <ReviewPanel trades={reviewTrades} defaultRiskAmount={defaultRiskAmount} mode={mode} />}
      {tab === 'notes' && <NotesView userId={user?.id} />}
    </div>
  );
}
