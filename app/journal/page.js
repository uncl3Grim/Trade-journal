'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { supabase } from '../../lib/supabaseClient';
import Calendar from '../../components/Calendar';
import DayPanel from '../../components/DayPanel';
import StatsBar from '../../components/StatsBar';
import ImportCSV from '../../components/ImportCSV';

export default function JournalPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [month, setMonth] = useState(new Date());
  const [trades, setTrades] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const loadTrades = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const rangeStart = startOfWeek(startOfMonth(month));
    const rangeEnd = endOfWeek(endOfMonth(month));

    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .gte('entry_time', rangeStart.toISOString())
      .lte('entry_time', rangeEnd.toISOString())
      .order('entry_time', { ascending: true });

    if (!error) setTrades(data || []);
    setLoading(false);
  }, [user, month]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

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
    <div className="min-h-screen max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Trade Journal</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{user?.email}</span>
  <button onClick={() => router.push('/broker')} className="text-sm text-gray-400 hover:text-gray-200">
  Broker
</button>
          <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-gray-200">
            Sign out
          </button>
        </div>
      </div>

      <StatsBar trades={trades} />

      <ImportCSV userId={user?.id} onImported={loadTrades} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setMonth(subMonths(month, 1))} className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm">
              ← Prev
            </button>
            <h2 className="font-medium">{format(month, 'MMMM yyyy')}</h2>
            <button onClick={() => setMonth(addMonths(month, 1))} className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm">
              Next →
            </button>
          </div>
          {loading ? (
            <p className="text-gray-500 text-sm">Loading trades...</p>
          ) : (
            <Calendar month={month} dailyPnl={dailyPnl} onDayClick={setSelectedDate} selectedDate={selectedDate} />
          )}
        </div>

        <div>
          <DayPanel
            date={selectedDate}
            trades={selectedDayTrades}
            userId={user?.id}
            onChanged={loadTrades}
            onClose={() => setSelectedDate(null)}
          />
        </div>
      </div>
    </div>
  );
}
