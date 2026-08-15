'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function RiskSettings({ userId, onSaved }) {
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('user_settings')
      .select('default_risk_amount')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.default_risk_amount) setAmount(String(data.default_risk_amount));
        setLoaded(true);
      });
  }, [userId]);

  async function handleSave() {
    setSaving(true);
    await supabase.from('user_settings').upsert({
      user_id: userId,
      default_risk_amount: amount === '' ? null : parseFloat(amount),
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    onSaved?.(amount === '' ? null : parseFloat(amount));
  }

  if (!loaded) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 mb-6 flex items-end gap-3">
      <div className="flex-1">
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
