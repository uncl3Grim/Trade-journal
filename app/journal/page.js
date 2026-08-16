'use client';
import NotesView from '../../components/NotesView';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths as subM } from 'date-fns';
import { supabase } from '../../lib/supabaseClient';
import Calendar from '../../components/Calendar';
import DayPanel from '../../components/DayPanel';
import StatsBar from '../../components/StatsBar';
import ImportCSV from '../../components/ImportCSV';
import ReviewPanel from '../../components/ReviewPanel';
import RiskSettings from '../../components/RiskSettings';

export default function JournalPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [month, setMonth] = useState(new Date());
  const [trades, setTrades] = useState([]);
  const [reviewTrades, setReviewTrades] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('calendar');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [defaultRiskAmount, setDefaultRiskAmount] = useState(null);

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
      .select('default_risk_amount')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setDefaultRiskAmount(data?.default_risk_amount ?? null));
  }, [user]);

  const applyAccountFilter = useCallback(
    (query) => {
      if (selectedAccount === 'manual') return query.is('broker_connection_id', null);
      if (selectedAccount !== 'all') return query.eq('broker_connection_id', selectedAccount);
      return query;
    },
    [selectedAccount]
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

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  useEffect(() => {
    if (tab === 'review') loadReviewTrades();
  }, [tab, loadReviewTrades]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  const dailyPnl = {};
  for (const t of trades) {
    const key = format(new Date(t.entry_time), 'yyyy-MM-dd');
    if (!dailyPnl[key]) dailyPnl[key] = { pnl: 0, count: 0 };
    dailyPnl[key].pnl += Number(t.pnl || 0);
    dailyPnl[key].count += 1;
  }

  const selectedDayTrades = selectedDate
    ? trades.filter((t) => format(new Date(t.entry_time), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'))
    : [];

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 py-6 bg-[#f7f7fb]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Trade Journal</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{user?.email}</span>
          <button onClick={() => router.push('/broker')} className="text-sm text-gray-500 hover:text-gray-800">
            Broker
          </button>
          <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-800">
            Sign out
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
        </div>

        {accounts.length > 0 && (
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-sm text-gray-700"
          >
            <option value="all">All accounts</option>
            <option value="manual">Manual entries only</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.broker_server} ({a.mt5_login})
              </option>
            ))}
          </select>
        )}
      </div>

      {tab === 'calendar' && (
        <>
          <RiskSettings userId={user?.id} onSaved={setDefaultRiskAmount} />
          <StatsBar trades={trades} />

          <ImportCSV userId={user?.id} onImported={loadTrades} />

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
                <Calendar month={month} dailyPnl={dailyPnl} onDayClick={setSelectedDate} selectedDate={selectedDate} />
              )}
            </div>

            <div>
              <DayPanel
                date={selectedDate}
                trades={selectedDayTrades}
                userId={user?.id}
                accounts={accounts}
                defaultRiskAmount={defaultRiskAmount}
                onChanged={loadTrades}
                onClose={() => setSelectedDate(null)}
              />
            </div>
          </div>
        </>
      )}

      {tab === 'review' && <ReviewPanel trades={reviewTrades} defaultRiskAmount={defaultRiskAmount} />}
        <button
            onClick={() => setTab('notes')}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium ${
              tab === 'notes' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-800'
            }`}
          >
            Notes
          </button>
              {tab === 'notes' && <NotesView userId={user?.id} />}
    </div>
  );
}
