'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import DrawdownLimitSelect from '../DrawdownLimitSelect';
import { Switch, ghostBtn } from './ui';

function Section({ title, hint, children }) {
  return (
    <section className="py-4 border-t border-neutral-800/60 first:border-t-0 first:pt-0">
      <h4 className="text-sm font-semibold text-neutral-100">{title}</h4>
      {hint && <p className="text-xs text-neutral-500 mt-0.5 mb-3 leading-relaxed">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </section>
  );
}

function Group({ title, note, children }) {
  return (
    <div className="mt-5 first:mt-0">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">{title}</div>
      {note && <p className="text-[11px] text-neutral-500 -mt-1 mb-2.5 leading-relaxed">{note}</p>}
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

// Starting points only. They fill the fields, nothing is saved until you press Save.
const PRESETS = [
  {
    key: 'prop',
    label: 'Typical prop challenge',
    values: { prop: true, daily: 5, maxDd: 10, target: 10, minDays: 4, weekly: null, risk: null, trades: null, streak: null, consistency: null, days: null },
  },
  {
    key: 'personal',
    label: 'Strict personal account',
    values: { prop: false, daily: 2, maxDd: 6, weekly: 5, risk: 1, trades: 5, streak: 3, target: null, consistency: null, minDays: null, days: null },
  },
];

export default function RulesSection({ c, onSaved, notify }) {
  const [isPropFirm, setIsPropFirm] = useState(c.is_prop_firm ?? false);
  const [daily, setDaily] = useState(c.daily_loss_limit_pct ?? null);
  const [maxDd, setMaxDd] = useState(c.max_loss_limit_pct ?? null);
  const [weekly, setWeekly] = useState(c.weekly_loss_limit_pct ?? null);
  const [risk, setRisk] = useState(c.max_risk_per_trade_pct ?? null);
  const [trades, setTrades] = useState(c.max_trades_per_day ?? null);
  const [streak, setStreak] = useState(c.max_loss_streak ?? null);
  const [target, setTarget] = useState(c.profit_target_pct ?? null);
  const [consistency, setConsistency] = useState(c.consistency_limit_pct ?? null);
  const [minDays, setMinDays] = useState(c.min_trading_days ?? null);
  const [days, setDays] = useState(c.challenge_days ?? null);
  const [saving, setSaving] = useState(false);

  function applyPreset(p) {
    const v = p.values;
    setIsPropFirm(v.prop);
    setDaily(v.daily ?? null);
    setMaxDd(v.maxDd ?? null);
    setWeekly(v.weekly ?? null);
    setRisk(v.risk ?? null);
    setTrades(v.trades ?? null);
    setStreak(v.streak ?? null);
    setTarget(v.target ?? null);
    setConsistency(v.consistency ?? null);
    setMinDays(v.minDays ?? null);
    setDays(v.days ?? null);
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from('broker_connections')
      .update({
        is_prop_firm: isPropFirm,
        daily_loss_limit_pct: daily,
        max_loss_limit_pct: maxDd,
        weekly_loss_limit_pct: weekly,
        max_risk_per_trade_pct: risk,
        max_trades_per_day: trades,
        max_loss_streak: streak,
        profit_target_pct: target,
        consistency_limit_pct: consistency,
        min_trading_days: minDays,
        challenge_days: days,
      })
      .eq('id', c.id);
    setSaving(false);
    if (error) return notify('error', `Couldn't save rules: ${error.message}`);
    notify('success', 'Rules saved.');
    onSaved();
  }

  return (
    <Section
      title="Loss limits and rules"
      hint="Works on any account, including manual ones. Percent rules are measured against the starting balance and power the Journal's Limits tab and the warning while you log trades."
    >
      {!(Number(c.starting_balance) > 0) && (
        <p className="text-xs text-amber-300/90 mb-3">Add a starting balance above first, so rules can be worked out in dollars.</p>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[11px] text-neutral-500">Start from:</span>
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => applyPreset(p)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300 hover:bg-white/10"
          >
            {p.label}
          </button>
        ))}
      </div>

      <Group title="Loss limits" note="Up to 75%. Prop firms usually use 4-5% daily and 8-12% max. Many personal traders go tighter.">
        <DrawdownLimitSelect label="Daily loss limit" value={daily} onChange={setDaily} presets={[2, 3, 4, 5]} />
        <DrawdownLimitSelect label="Max drawdown" value={maxDd} onChange={setMaxDd} presets={[5, 6, 8, 10]} />
        <DrawdownLimitSelect label="Weekly loss limit" value={weekly} onChange={setWeekly} presets={[5, 7, 10]} />
      </Group>

      <Group title="Your discipline rules" note="For any account. These feed the Rules and Close calls views.">
        <DrawdownLimitSelect label="Max risk per trade" value={risk} onChange={setRisk} max={25} presets={[0.5, 1, 2]} />
        <DrawdownLimitSelect label="Max trades per day" value={trades} onChange={setTrades} step={1} max={100} suffix="trades" presets={[3, 5, 8]} />
        <DrawdownLimitSelect label="Stop after losses in a row" value={streak} onChange={setStreak} step={1} max={50} suffix="losses" presets={[2, 3, 4]} />
      </Group>

      <Group title="Challenge rules" note="Mostly for prop firm evaluations.">
        <DrawdownLimitSelect label="Profit target" value={target} onChange={setTarget} presets={[8, 10]} />
        <DrawdownLimitSelect label="Consistency (best day cap)" value={consistency} onChange={setConsistency} presets={[30, 40, 50]} />
        <DrawdownLimitSelect label="Minimum trading days" value={minDays} onChange={setMinDays} step={1} max={365} suffix="days" presets={[3, 4, 5, 7]} />
        <DrawdownLimitSelect label="Time limit" value={days} onChange={setDays} step={1} max={365} suffix="days" presets={[30, 60]} />
      </Group>

      <div className="mt-5">
        <Switch
          checked={isPropFirm}
          onChange={setIsPropFirm}
          label="This is a prop firm account"
          hint="Adds a Prop firm badge and turns on weekend-hold and inactivity checks. Your limits work either way."
        />
      </div>
      <button onClick={save} disabled={saving} className={`${ghostBtn} mt-4`}>{saving ? 'Saving…' : 'Save rules'}</button>
    </Section>
  );
}
