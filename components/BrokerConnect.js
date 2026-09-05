'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Alert } from './Notice';

const inputClass =
  'w-full bg-white dark:bg-[#101019] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-colors';

function Mt5Form({ onConnected }) {
  const [server, setServer] = useState('');
  const [login, setLogin] = useState('');
  const [investorPassword, setInvestorPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Not signed in');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/broker/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ server, login, investorPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect');

      setSuccess('Connected! It may take a minute to come online before you can sync.');
      setServer('');
      setLogin('');
      setInvestorPassword('');
      onConnected?.();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Uses your investor (read-only) password. Requires a small paid MetaApi balance to stay
        deployed.
      </p>
      <input
        placeholder="Broker server (e.g. ICMarkets-Live05)"
        value={server}
        onChange={(e) => setServer(e.target.value)}
        required
        className={inputClass}
      />
      <input
        placeholder="MT5 login number"
        value={login}
        onChange={(e) => setLogin(e.target.value)}
        required
        className={inputClass}
      />
      <input
        placeholder="Investor password"
        type="password"
        value={investorPassword}
        onChange={(e) => setInvestorPassword(e.target.value)}
        required
        className={inputClass}
      />
      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-br from-indigo-600 to-violet-600 hover:opacity-90 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold shadow-sm shadow-indigo-600/20 transition-opacity"
      >
        {loading ? 'Connecting…' : 'Connect Account'}
      </button>
    </form>
  );
}

function MyfxbookForm({ onConnected }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [accountChoices, setAccountChoices] = useState(null);
  const [chosenAccountId, setChosenAccountId] = useState('');

  async function submitConnect(accountId) {
    setError('');
    setSuccess('');
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Not signed in');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/broker/connect-myfxbook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email, password, accountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect');

      if (data.needsSelection) {
        setAccountChoices(data.accounts);
        setLoading(false);
        return;
      }

      setSuccess(`Connected to ${data.accountName || 'MyFXBook'}! Tap Sync Now to pull trades.`);
      setAccountChoices(null);
      setChosenAccountId('');
      onConnected?.();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    submitConnect(undefined);
  }

  function handleChooseAccount() {
    if (!chosenAccountId) return;
    submitConnect(chosenAccountId);
  }

  if (accountChoices) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          This MyFXBook login has multiple accounts. Pick which one to connect — you can repeat
          this to add the other one too.
        </p>
        <div className="space-y-2">
          {accountChoices.map((a) => (
            <label
              key={a.id}
              className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-colors ${
                chosenAccountId === String(a.id)
                  ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-700'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <input
                type="radio"
                name="account"
                value={a.id}
                checked={chosenAccountId === String(a.id)}
                onChange={() => setChosenAccountId(String(a.id))}
              />
              <span className="text-sm text-gray-700 dark:text-gray-200">
                {a.name} — {a.server}
              </span>
            </label>
          ))}
        </div>
        <Alert type="error">{error}</Alert>
        <div className="flex gap-2">
          <button
            onClick={handleChooseAccount}
            disabled={loading || !chosenAccountId}
            className="flex-1 bg-gradient-to-br from-indigo-600 to-violet-600 hover:opacity-90 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-opacity"
          >
            {loading ? 'Connecting…' : 'Connect This Account'}
          </button>
          <button
            onClick={() => setAccountChoices(null)}
            className="px-4 rounded-xl border border-gray-300 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Free alternative to MetaApi — uses your MyFXBook.com login (not your MT5 password). Make
        sure your MT5 account is already added and syncing on myfxbook.com first. If you have
        multiple MT5 accounts under one MyFXBook login, connect them one at a time.
      </p>
      <input
        placeholder="MyFXBook email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className={inputClass}
      />
      <input
        placeholder="MyFXBook password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        className={inputClass}
      />
      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-br from-indigo-600 to-violet-600 hover:opacity-90 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold shadow-sm shadow-indigo-600/20 transition-opacity"
      >
        {loading ? 'Connecting…' : 'Connect Account'}
      </button>
    </form>
  );
}

export default function BrokerConnect({ onConnected }) {
  const [tab, setTab] = useState('myfxbook');

  return (
    <div className="bg-white dark:bg-[#15151b] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Connect Broker</h2>
      </div>

      <div className="flex gap-1.5 mb-4 bg-gray-100 dark:bg-[#101019] p-1 rounded-xl">
        <button
          onClick={() => setTab('myfxbook')}
          className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'myfxbook'
              ? 'bg-white dark:bg-[#22222c] text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          MyFXBook (free)
        </button>
        <button
          onClick={() => setTab('mt5')}
          className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'mt5'
              ? 'bg-white dark:bg-[#22222c] text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          MT5 direct (MetaApi)
        </button>
      </div>

      {tab === 'myfxbook' ? (
        <MyfxbookForm onConnected={onConnected} />
      ) : (
        <Mt5Form onConnected={onConnected} />
      )}
    </div>
  );
}
