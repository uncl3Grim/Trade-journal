'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Alert } from './Notice';
import { MethodIntro, fieldClass, labelClass, primaryBtn } from './broker/ui';

// Creates a plain `broker_connections` row with no CSV/broker sync behind
// it: just a named bucket the user logs trades into by hand (see the
// "Quick entry" mode in DayPanel.js). Reuses the same table as CSV/MT5
// accounts so it shows up everywhere accounts are already listed.
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
    <form onSubmit={handleCreate} className="space-y-3">
      <MethodIntro
        title="Create a manual account"
        what="A named account you log trades into yourself from the Journal, using win/loss and R-multiple instead of exact prices. Nothing syncs or imports."
        need="A name. A starting balance is optional: add one to track balance and drawdown, or set it later under Your accounts."
      />
      <div className="grid sm:grid-cols-[1fr_12rem] gap-3">
        <div>
          <label className={labelClass} htmlFor="man-name">Account name</label>
          <input id="man-name" placeholder="e.g. Personal live account" value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="man-bal">Starting balance ($)</label>
          <input id="man-bal" type="number" step="any" placeholder="Optional" value={startingBalance} onChange={(e) => setStartingBalance(e.target.value)} className={fieldClass} />
        </div>
      </div>
      <Alert type="error">{error}</Alert>
      <button type="submit" disabled={creating || !name.trim()} className={`w-full ${primaryBtn}`}>
        {creating ? 'Creating…' : 'Create account'}
      </button>
    </form>
  );
}
