'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { Card, Label, inputCls, PrimaryButton, GhostButton, Inline } from './ui';

export default function SecurityPanel({ email, notify }) {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function changePassword(e) {
    e.preventDefault();
    setError('');
    if (pw.length < 8) return setError('Use at least 8 characters.');
    if (pw !== confirm) return setError("Passwords don't match.");
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (err) return setError(err.message);
    setPw('');
    setConfirm('');
    notify('Password updated');
  }

  async function signOutOthers() {
    const { error: err } = await supabase.auth.signOut({ scope: 'others' });
    err ? notify(err.message, 'error') : notify('Signed out of other devices');
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <div className="pf-stagger space-y-4">
      <Card title="Password" hint={`Signed in as ${email}`}>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <Label>New password</Label>
            <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls} />
          </div>
          <div>
            <Label>Confirm password</Label>
            <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
          </div>
          <PrimaryButton type="submit" disabled={busy || !pw}>{busy ? 'Updating…' : 'Update password'}</PrimaryButton>
          <Inline kind="error">{error}</Inline>
        </form>
      </Card>

      <Card title="Sessions">
        <div className="flex flex-col sm:flex-row gap-3">
          <GhostButton onClick={signOutOthers}>Sign out other devices</GhostButton>
          <button
            onClick={signOut}
            className="rounded-xl border border-red-500/25 text-red-300 hover:bg-red-500/10 px-4 py-2.5 text-sm font-medium"
          >
            Sign out
          </button>
        </div>
      </Card>
    </div>
  );
}
