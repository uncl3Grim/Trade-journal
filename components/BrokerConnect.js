'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Alert } from './Notice';
import ImportCSV from './ImportCSV';
import ManualAccountCreate from './ManualAccountCreate';
import { Segmented, MethodIntro, fieldClass, labelClass, primaryBtn, ghostBtn } from './broker/ui';

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
      setError('You are signed out. Sign in again and retry.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/broker/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ server, login, investorPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not connect this account.');

      setSuccess('Account added. It can take a minute to come online. Once it does, open it under Your accounts and press Sync now.');
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
      <MethodIntro
        title="Connect MT5 directly"
        what="Pull trades straight from your MT5 account through MetaApi. Uses your read-only investor password, so nothing can be traded from here."
        need="Your broker server name, MT5 login number, and investor password. MetaApi needs a small paid balance to keep the connection running."
      />
      <div>
        <label className={labelClass} htmlFor="mt5-server">Broker server</label>
        <input id="mt5-server" placeholder="e.g. ICMarkets-Live05" value={server} onChange={(e) => setServer(e.target.value)} required className={fieldClass} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="mt5-login">MT5 login number</label>
          <input id="mt5-login" inputMode="numeric" placeholder="e.g. 51234567" value={login} onChange={(e) => setLogin(e.target.value)} required className={fieldClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="mt5-pass">Investor password</label>
          <input id="mt5-pass" type="password" placeholder="Read-only password" value={investorPassword} onChange={(e) => setInvestorPassword(e.target.value)} required className={fieldClass} />
        </div>
      </div>
      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>
      <button type="submit" disabled={loading} className={`w-full ${primaryBtn}`}>
        {loading ? 'Connecting…' : 'Connect MT5 account'}
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
      setError('You are signed out. Sign in again and retry.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/broker/connect-myfxbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ email, password, accountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not connect this account.');

      if (data.needsSelection) {
        setAccountChoices(data.accounts);
        setLoading(false);
        return;
      }

      setSuccess(`${data.accountName || 'MyFXBook account'} added. Open it under Your accounts and press Sync now to pull in trades.`);
      setAccountChoices(null);
      setChosenAccountId('');
      onConnected?.();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  if (accountChoices) {
    return (
      <div className="space-y-3 bk-swap">
        <MethodIntro
          title="Choose an account"
          what="This MyFXBook login has more than one account. Pick the one to connect. You can run this again to add the others."
        />
        <div className="space-y-2" role="radiogroup">
          {accountChoices.map((a) => {
            const selected = chosenAccountId === String(a.id);
            return (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setChosenAccountId(String(a.id))}
                className={`w-full flex items-center gap-3 p-3 border rounded-xl text-left bk-row ${
                  selected ? 'is-selected' : 'border-neutral-800 hover:border-neutral-700 hover:bg-white/[0.03]'
                }`}
              >
                <span
                  className={`h-4 w-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                    selected ? 'border-indigo-400 bg-indigo-500' : 'border-neutral-600'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full bg-white transition-transform duration-200 ${selected ? 'scale-100' : 'scale-0'}`} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-neutral-100 truncate">{a.name}</span>
                  <span className="block text-xs text-neutral-500 truncate">{a.server}</span>
                </span>
              </button>
            );
          })}
        </div>
        <Alert type="error">{error}</Alert>
        <div className="flex gap-2">
          <button onClick={() => submitConnect(chosenAccountId)} disabled={loading || !chosenAccountId} className={`flex-1 ${primaryBtn}`}>
            {loading ? 'Connecting…' : 'Connect this account'}
          </button>
          <button onClick={() => setAccountChoices(null)} className={ghostBtn}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submitConnect(undefined);
      }}
      className="space-y-3"
    >
      <MethodIntro
        title="Connect with MyFXBook"
        what="Sync trades automatically through your MyFXBook account. It's free, and works with any MT5 account MyFXBook already tracks."
        need="Your MyFXBook email and password (not your MT5 password), with the MT5 account already added and syncing on myfxbook.com. If your login holds several accounts, you'll pick one next."
      />
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="mfx-email">MyFXBook email</label>
          <input id="mfx-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className={fieldClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="mfx-pass">MyFXBook password</label>
          <input id="mfx-pass" type="password" placeholder="Your MyFXBook password" value={password} onChange={(e) => setPassword(e.target.value)} required className={fieldClass} />
        </div>
      </div>
      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>
      <button type="submit" disabled={loading} className={`w-full ${primaryBtn}`}>
        {loading ? 'Connecting…' : 'Connect MyFXBook'}
      </button>
    </form>
  );
}

const METHODS = [
  { value: 'myfxbook', label: 'MyFXBook' },
  { value: 'mt5', label: 'MT5' },
  { value: 'csv', label: 'CSV' },
  { value: 'manual', label: 'Manual' },
];

// One place for every way to add an account. Only the selected method's
// form is on screen; switching slides the highlight and fades the new form in.
export default function BrokerConnect({ userId, onConnected, onImported }) {
  const [method, setMethod] = useState('myfxbook');

  return (
    <div>
      <Segmented options={METHODS} value={method} onChange={setMethod} className="mb-5" />
      <div key={method} className="bk-swap">
        {method === 'myfxbook' && <MyfxbookForm onConnected={onConnected} />}
        {method === 'mt5' && <Mt5Form onConnected={onConnected} />}
        {method === 'csv' && <ImportCSV userId={userId} onImported={onImported} />}
        {method === 'manual' && <ManualAccountCreate userId={userId} onCreated={onConnected} />}
      </div>
    </div>
  );
}
