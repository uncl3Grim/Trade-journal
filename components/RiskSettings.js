'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function RiskSettings({ userId, onSaved }) {
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('user_settings')
      .select('default_risk_amount, account_balance')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.default_risk_amount) setAmount(String(data.default_risk_amount));
        if (data?.account_balance) setBalance(String(data.account_balance));
        setLoaded(true);
      });
  }, [userId]);

  async function handleSave() {
    setSaving(true);
    await supabase.from('user_settings').upsert({
      user_id: userId,
      default_risk_amount: amount === '' ? null : parseFloat(amount),
      account_balance: balance === '' ? null : parseFloat(balance),
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    onSaved?.({
      defaultRiskAmount: amount === '' ? null : parseFloat(amount),
      accountBalance: balance === '' ? null : parseFloat(balance),
    });
  }

  if (!loaded) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-3">
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Default risk per trade ($) — used for R-multiple when a trade doesn't specify its own
        </label>
        <input
          type="number"
          step="any"
          placeholder="e.g. 20"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Account balance ($) — used to calculate percentage view
        </label>
        <input
          type="number"
          step="any"
          placeholder="e.g. 10000"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 outline-none"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-sm font-medium"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}
