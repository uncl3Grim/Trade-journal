'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Creates a plain `broker_connections` row with no CSV/broker sync behind
// it — just a named bucket the user logs trades into by hand (see the
// "Quick entry" mode in DayPanel.js). Reuses the same table as CSV/MT5
// accounts so it shows up for free everywhere accounts are already listed
// (AccountSwitcher, DayPanel's account select, the Trades page, etc).
export default function ManualAccountCreate({ userId, onCreated }) {
  const [name, setName] = useState('');
  const [startingBalance, setStartingBalance] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !userId) return;
    setCreating(true);
    setError('');
    const { error } = await supabase.from('broker_connections').insert({
      user_id: userId,
      broker_type: 'manual',
      broker_server: trimmed,
      mt5_login: 'Manual',
      status: 'manual',
      starting_balance: startingBalance === '' ? null : parseFloat(startingBalance),
    });
    setCreating(false);
    if (error) {
      setError(error.message);
      return;
    }
    setName('');
    setStartingBalance('');
    onCreated?.();
  }

  return (
    <div className="bg-white dark:bg-[#15151b] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-5 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Manual account</h2>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 ml-10">
        No CSV import, no broker sync — just a named account you log trades into yourself from the
        Journal (Win/Loss + R-multiple instead of exact prices).
      </p>
      <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2">
        <input
          placeholder="e.g. Personal Live Account"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-white dark:bg-[#101019] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-colors"
        />
        <input
          type="number"
          step="any"
          placeholder="Starting balance ($)"
          value={startingBalance}
          onChange={(e) => setStartingBalance(e.target.value)}
          className="sm:w-44 bg-white dark:bg-[#101019] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-sm font-medium whitespace-nowrap"
        >
          {creating ? 'Creating...' : 'Create account'}
        </button>
      </form>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 ml-10">
        Optional — leave blank if you don't want balance/drawdown tracking for this account. You can also set or edit it later from the account's row below.
      </p>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
