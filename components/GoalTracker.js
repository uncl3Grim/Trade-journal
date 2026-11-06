'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { computeGoal } from '../lib/goal';
import Exportable from './Exportable';

const card = 'relative bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-4 sm:p-5 overflow-hidden';
const field = 'w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-indigo-400/60';
const usd = (v) => `$${Math.round(v).toLocaleString('en-US')}`;
const usd2 = (v) => `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const closed = (t) => t.exit_price !== null && t.exit_price !== undefined;

function useStored(key, initial) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [key]);
  const set = useCallback(
    (v) => {
      setValue(v);
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {
        /* ignore */
      }
    },
    [key]
  );
  return [value, set];
}

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-neutral-800/60 px-3 py-2.5 min-w-0">
      <div className="text-[11px] text-neutral-500">{label}</div>
      <div className="font-heading text-base font-semibold text-neutral-50 mt-0.5 tabular-nums truncate">{value}</div>
      {sub && <div className="text-[11px] text-neutral-500 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function when(p) {
  if (!p) return null;
  if (p.calendarDays === 0) return 'Already there';
  if (p.calendarDays > 365 * 5) return 'More than 5 years';
  return `${format(p.date, 'MMM d, yyyy')} (${p.calendarDays} days)`;
}

export default function GoalTracker({ trades, account, startingBalance }) {
  const [target, setTarget] = useStored('tj_goal_target', 50000);
  const [deadlineStr, setDeadlineStr] = useStored('tj_goal_deadline', '');
  const [editing, setEditing] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState(false);
  const [amount, setAmount] = useState('');
  const [dateStr, setDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('withdrawals').select('id, amount, withdrawn_on, note').order('withdrawn_on', { ascending: false });
    if (error) {
      setMissing(true);
    } else {
      setRows(data || []);
      setMissing(false);
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const withdrawn = useMemo(() => rows.reduce((s, r) => s + Number(r.amount || 0), 0), [rows]);
  const totalPnl = useMemo(() => trades.filter(closed).reduce((s, t) => s + Number(t.pnl || 0), 0), [trades]);
  const brokerBalance = account?.broker_type === 'myfxbook' && account.broker_balance !== null && account.broker_balance !== undefined ? Number(account.broker_balance) : null;
  // MyFXBook's balance already reflects withdrawals; otherwise subtract what you have logged.
  const balanceNow = brokerBalance ?? (Number(startingBalance) > 0 ? Number(startingBalance) + totalPnl - withdrawn : null);
  const deadline = deadlineStr ? new Date(`${deadlineStr}T00:00:00`) : null;

  const g = useMemo(() => computeGoal(trades, { target: Number(target) || 0, withdrawn, deadline, balanceNow }), [trades, target, withdrawn, deadlineStr, balanceNow]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addWithdrawal() {
    const value = Number(amount);
    if (!(value > 0)) return;
    setSaving(true);
    const { error } = await supabase.from('withdrawals').insert({ amount: value, withdrawn_on: dateStr, note: note.trim() || null });
    if (error) alert('Could not save the withdrawal. Make sure the withdrawals SQL has been run.');
    else {
      setAmount('');
      setNote('');
      await load();
    }
    setSaving(false);
  }
  async function removeWithdrawal(id) {
    if (!confirm('Delete this withdrawal?')) return;
    await supabase.from('withdrawals').delete().eq('id', id);
    load();
  }
  function saveTarget() {
    const v = Number(String(targetInput).replace(/[^0-9.]/g, ''));
    if (v > 0) setTarget(v);
    setEditing(false);
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* Goal + progress */}
      <Exportable title="Road to my goal" name="goal-progress">
      <div className={card}>
        <div className="text-[11px] text-neutral-500">Withdrawn profits goal</div>
        <div className="flex items-end justify-between gap-3 mt-0.5">
          <div className="font-heading text-2xl font-bold text-neutral-50 tabular-nums">
            {usd(withdrawn)} <span className="text-neutral-500 text-base font-medium">of {usd(Number(target) || 0)}</span>
          </div>
          <button
            data-export-ignore
            onClick={() => {
              setTargetInput(String(target));
              setEditing((e) => !e);
            }}
            className="text-[11px] text-indigo-300 hover:text-indigo-200 flex-shrink-0 pb-1"
          >
            {editing ? 'Cancel' : 'Edit goal'}
          </button>
        </div>
        {editing && (
          <div data-export-ignore className="flex gap-2 mt-3">
            <input value={targetInput} onChange={(e) => setTargetInput(e.target.value)} inputMode="decimal" placeholder="50000" className={field} />
            <button onClick={saveTarget} className="flex-shrink-0 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white text-sm font-medium px-4">
              Save
            </button>
          </div>
        )}
        <div className="h-2.5 rounded-full bg-white/10 mt-3 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-700" style={{ width: `${Math.max(g.progress, g.progress > 0 ? 2 : 0)}%` }} />
        </div>
        <div className="flex justify-between text-xs text-neutral-500 mt-1.5">
          <span>{g.progress.toFixed(1)}% there</span>
          <span>{usd(g.remaining)} to go</span>
        </div>
        {balanceNow !== null && <div className="text-[11px] text-neutral-500 mt-3">Current balance {usd(balanceNow)}{brokerBalance !== null ? ' (from MyFXBook)' : ''}</div>}
      </div>
      </Exportable>

      {/* What the data says */}
      <Exportable title="My pace" name="goal-pace">
      <div className={card}>
        <h3 className="font-heading text-sm font-semibold text-neutral-100">What your trades say</h3>
        {g.n === 0 ? (
          <p className="text-xs text-neutral-500 mt-2">No closed trades yet. Sync an account or log trades to see your pace.</p>
        ) : (
          <>
            <p className="text-[11px] text-neutral-500 mt-0.5">Based on {g.windowLabel} · {g.windowTrades} trades</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3">
              <Stat label="Avg per trading day" value={usd2(g.perTradingDay)} sub={`${g.tradingDays} trading days`} />
              <Stat label="Win rate" value={`${g.winRate.toFixed(0)}%`} sub={`avg win ${usd(g.avgWin)} · loss ${usd(g.avgLoss)}`} />
              <Stat label="Expectancy" value={usd2(g.expectancy)} sub="per trade" />
              <Stat label="Trades per day" value={g.tradesPerDay.toFixed(1)} />
              <Stat label="Days traded / week" value={g.tradingDaysPerWeek.toFixed(1)} />
              {g.avgLossPct !== null && <Stat label="Avg loss vs balance" value={`${g.avgLossPct.toFixed(1)}%`} />}
            </div>

            <div className="mt-4 space-y-2">
              <div className="rounded-xl bg-white/[0.03] border border-neutral-800/60 px-3 py-2.5">
                <div className="text-[11px] text-neutral-500">If you keep this pace</div>
                <div className="text-sm text-neutral-100 font-medium mt-0.5">{when(g.atPace) || 'No pace to project yet'}</div>
                {g.atPace && <div className="text-[11px] text-neutral-500">about {g.atPace.tradingDays} trading days</div>}
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-neutral-800/60 px-3 py-2.5">
                <div className="text-[11px] text-neutral-500">If you only manage half of it</div>
                <div className="text-sm text-neutral-100 font-medium mt-0.5">{when(g.atHalf) || '—'}</div>
              </div>
            </div>
          </>
        )}
      </div>

      </Exportable>

      {/* Deadline */}
      <div className={card}>
        <h3 className="font-heading text-sm font-semibold text-neutral-100">Hit it by a date</h3>
        <label className="block mt-2">
          <span className="text-[11px] text-neutral-500">Target date (optional)</span>
          <input type="date" value={deadlineStr} min={format(new Date(), 'yyyy-MM-dd')} onChange={(e) => setDeadlineStr(e.target.value)} style={{ colorScheme: 'dark' }} className={`${field} mt-1`} />
        </label>
        {g.required && g.required.daysLeft > 0 && (
          <div className="mt-3 rounded-xl bg-white/[0.03] border border-neutral-800/60 px-3 py-2.5">
            <div className="text-[11px] text-neutral-500">You would need about</div>
            <div className="font-heading text-xl font-bold text-neutral-50 tabular-nums">{usd(g.required.perDay)} per trading day</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">
              {g.required.pctOfBalance !== null ? `${g.required.pctOfBalance.toFixed(1)}% of your balance · ` : ''}
              {g.required.vsCurrent !== null ? `${g.required.vsCurrent.toFixed(1)}× your recent average · ` : ''}
              {g.required.daysLeft} days left
            </div>
          </div>
        )}
        {g.required && g.required.daysLeft === 0 && <p className="text-xs text-neutral-500 mt-3">Pick a date in the future.</p>}
      </div>

      {/* Honest flags */}
      {g.flags.length > 0 && (
        <div className="space-y-2">
          {g.flags.map((fl, i) => (
            <div key={i} className={`rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${fl.level === 'warn' ? 'border-amber-400/30 bg-amber-500/10 text-amber-100' : 'border-neutral-800/60 bg-white/[0.03] text-neutral-400'}`}>
              {fl.text}
            </div>
          ))}
        </div>
      )}

      {/* Withdrawal log */}
      <div className={card}>
        <h3 className="font-heading text-sm font-semibold text-neutral-100">Withdrawal log</h3>
        {missing ? (
          <p className="text-xs text-amber-200/90 mt-2 leading-relaxed">The withdrawals table isn&apos;t set up yet. Run the withdrawals SQL in Supabase, then refresh this page.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="Amount, e.g. 500" className={field} />
              <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} style={{ colorScheme: 'dark' }} className={field} />
            </div>
            <div className="flex gap-2 mt-2">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className={field} />
              <button onClick={addWithdrawal} disabled={saving || !(Number(amount) > 0)} className="flex-shrink-0 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 disabled:opacity-40 text-white text-sm font-medium px-4">
                {saving ? '…' : 'Add'}
              </button>
            </div>
            <div className="mt-3 divide-y divide-neutral-800/60">
              {loaded && rows.length === 0 && <p className="text-xs text-neutral-500 py-2">Nothing logged yet. Add each withdrawal when you take it out.</p>}
              {rows.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-sm text-neutral-100 tabular-nums">{usd2(Number(r.amount))}</div>
                    <div className="text-[11px] text-neutral-500 truncate">
                      {format(new Date(`${r.withdrawn_on}T00:00:00`), 'MMM d, yyyy')}
                      {r.note ? ` · ${r.note}` : ''}
                    </div>
                  </div>
                  <button onClick={() => removeWithdrawal(r.id)} className="text-[11px] text-rose-300/80 hover:text-rose-300 flex-shrink-0">
                    Delete
                  </button>
                </div>
              ))}
            </div>
            {account?.broker_withdrawals > 0 && withdrawn === 0 && (
              <p className="text-[11px] text-neutral-500 mt-2">MyFXBook reports {usd(Number(account.broker_withdrawals))} withdrawn on this account. Add it above to count it toward your goal.</p>
            )}
          </>
        )}
      </div>

      <p className="text-[11px] text-neutral-600 leading-relaxed px-1">
        Withdrawals lower your balance but are never counted as losses, and they don&apos;t change your win rate, P&amp;L or R. These numbers are simple arithmetic on your own past trades. They are not predictions or financial advice, and past results don&apos;t guarantee future ones.
      </p>
    </div>
  );
}
