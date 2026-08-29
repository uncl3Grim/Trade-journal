'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../../../lib/supabaseClient';
import DayPanel from '../../../../components/DayPanel';
import AppShell from '../../../../components/AppShell';
import { applyAccountFilter, computeActiveAccountId } from '../../../../lib/accountFilter';

const DEFAULT_ACCOUNT_FILTER = { allSelected: true, selectedIds: [], includeManual: false };

export default function DayEditPage() {
  const router = useRouter();
  const params = useParams();
  const [user, setUser] = useState(null);
  const [trades, setTrades] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [defaultRiskAmount, setDefaultRiskAmount] = useState(null);
  const [accountFilter, setAccountFilter] = useState(DEFAULT_ACCOUNT_FILTER);
  const [loading, setLoading] = useState(true);

  const dateStr = params.date;
  const date = dateStr ? parseISO(dateStr) : null;

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
      .select('id, broker_server, broker_type, mt5_login, starting_balance, daily_loss_limit_pct, max_loss_limit_pct, profit_target_pct, status, last_synced_at')
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

  const loadTrades = useCallback(async () => {
    if (!user || !dateStr) return;
    setLoading(true);
    const start = `${dateStr}T00:00:00`;
    const end = `${dateStr}T23:59:59`;
    let query = supabase
      .from('trades')
      .select('*')
      .gte('entry_time', start)
      .lte('entry_time', end)
      .order('entry_time', { ascending: true });
    query = applyAccountFilter(query, accountFilter);
    const { data, error } = await query;
    if (!error) setTrades(data || []);
    setLoading(false);
  }, [user, dateStr, accountFilter]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  const activeAccountId = computeActiveAccountId(accountFilter);

  if (!date) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-4 py-6 text-sm text-gray-400">Invalid date.</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{format(date, 'EEEE, MMM d, yyyy')}</h1>
          <button
            onClick={() => router.push('/journal')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2 text-sm font-medium"
          >
            ← Back to Calendar
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : (
          <DayPanel
            date={date}
            trades={trades}
            userId={user?.id}
            accounts={accounts}
            strategies={strategies}
            defaultRiskAmount={defaultRiskAmount}
            activeAccountId={activeAccountId}
            onChanged={loadTrades}
            onClose={() => router.push('/journal')}
          />
        )}
      </div>
    </AppShell>
  );
}
