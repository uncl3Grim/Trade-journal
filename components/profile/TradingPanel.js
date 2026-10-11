'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Card, Label, inputCls, PrimaryButton, Segmented } from './ui';

export default function TradingPanel({ userId, notify }) {
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState('dollar');

  useEffect(() => {
    try {
      const m = localStorage.getItem('tj_display_mode');
      if (m) setMode(m);
    } catch {}
  }, []);

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

  function changeMode(m) {
    setMode(m);
    try {
      localStorage.setItem('tj_display_mode', m);
    } catch {}
    notify('Default view saved');
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from('user_settings').upsert({
      user_id: userId,
      default_risk_amount: amount === '' ? null : parseFloat(amount),
      account_balance: balance === '' ? null : parseFloat(balance),
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    error ? notify(error.message, 'error') : notify('Trading settings saved');
  }

  if (!loaded) return <div className="skeleton h-64 !bg-white/5" />;

  return (
    <div className="pf-stagger space-y-4">
      <Card title="Risk" hint="Used to work out R-multiples and the percentage view.">
        <div className="space-y-4">
          <div>
            <Label>Default risk per trade ($)</Label>
            <input type="number" step="any" placeholder="e.g. 20" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
            <p className="text-[11px] text-neutral-500 mt-1.5">Applied when a trade doesn’t set its own risk.</p>
          </div>
          <div>
            <Label>Account balance ($)</Label>
            <input type="number" step="any" placeholder="e.g. 10000" value={balance} onChange={(e) => setBalance(e.target.value)} className={inputCls} />
            <p className="text-[11px] text-neutral-500 mt-1.5">Used to calculate the percentage view.</p>
          </div>
          <PrimaryButton onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save risk settings'}</PrimaryButton>
        </div>
      </Card>

      <Card title="Default journal view" hint="How P&L is shown when you open the journal on this device.">
        <Segmented
          value={mode}
          onChange={changeMode}
          options={[
            { key: 'dollar', label: 'Dollars $' },
            { key: 'percent', label: 'Percent %' },
            { key: 'r', label: 'R-multiple' },
          ]}
        />
      </Card>
    </div>
  );
}
