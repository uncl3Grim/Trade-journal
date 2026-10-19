'use client';

import { useEffect, useId, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { formatMoney } from '../../lib/format';
import { fetchAllRows } from '../../lib/fetchAll';
import { strategyStats, disciplineSplit, ruleStats, insightLine, MIN_SAMPLE } from '../../lib/strategyStats';
import AppShell from '../../components/AppShell';
import { inputCls, PrimaryButton, GhostButton } from '../../components/profile/ui';

// Optional starters. Edit freely after adding.
const TEMPLATES = {
  Continuation: [
    'Daily bias: continuation',
    '4hr C2/C3 confirmed',
    '15min CISD',
    'EQ / T-spot plotted',
    'Entry via positional entry or ICISD',
    'Standard deviation levels marked',
  ],
  Reversal: [
    'Daily bias: reversal',
    '1hr/30min CISD confirmation',
    '4hr C2/C3 confirmed',
    '15min CISD',
    'EQ / T-spot plotted',
    'Entry via positional entry or ICISD',
    'Standard deviation levels marked',
  ],
};

const ACCENTS = [
  ['#6366f1', '#22d3ee'],
  ['#f97316', '#ec4899'],
  ['#10b981', '#a3e635'],
  ['#a855f7', '#ec4899'],
  ['#0ea5e9', '#4f46e5'],
  ['#f59e0b', '#ef4444'],
  ['#22d3ee', '#a3e635'],
  ['#be123c', '#7c3aed'],
];

function accentFor(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

const money = (v) => formatMoney(v);
const moneyAbs = (v) => formatMoney(Math.abs(v)).replace(/^[+-]/, '');
const pct = (v) => (v === null || v === undefined ? '—' : `${v.toFixed(0)}%`);
const pf = (v) => (v === null ? '—' : v === Infinity ? '∞' : v.toFixed(2));
const rr = (v) => (v === null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`);
const pnlTone = (v) => (v === null || v === undefined || v === 0 ? 'text-neutral-100' : v > 0 ? 'text-emerald-400' : 'text-red-400');

function Sparkline({ values, color }) {
  const gid = useId().replace(/:/g, '');
  if (!values || values.length < 2) {
    return <div className="h-12 flex items-center text-[11px] text-neutral-600">Equity curve appears after 2 closed trades.</div>;
  }
  const w = 300;
  const h = 48;
  const pad = 3;
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const y = (v) => h - pad - ((v - min) / span) * (h - pad * 2);
  const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (w - pad * 2), y(v)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const zero = y(0).toFixed(1);
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${zero} L${pts[0][0].toFixed(1)} ${zero} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-12" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" x2={w} y1={zero} y2={zero} stroke="rgba(255,255,255,.12)" strokeDasharray="3 4" />
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Metric({ label, value, tone = 'text-neutral-100', hint }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-0.5">{label}</div>
      <div className={`text-sm sm:text-base font-semibold tabular-nums truncate ${tone}`}>{value}</div>
      {hint && <div className="text-[10px] text-neutral-600 truncate">{hint}</div>}
    </div>
  );
}

function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-white/10 bg-white/5 text-neutral-400',
    good: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
    bad: 'border-red-400/30 bg-red-500/10 text-red-300',
    star: 'border-amber-400/40 bg-amber-500/10 text-amber-300',
  };
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${tones[tone]}`}>{children}</span>;
}

function Chevron({ open }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className={`bk-chevron ${open ? 'is-open' : ''} text-neutral-500`} aria-hidden="true">
      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Tile({ label, value, sub, tone = 'text-neutral-50' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl px-4 py-3 min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className={`mt-1 text-lg sm:text-xl font-semibold tabular-nums truncate ${tone}`}>{value}</div>
      {sub && <div className="text-[11px] text-neutral-500 truncate mt-0.5">{sub}</div>}
    </div>
  );
}

function RuleRow({ i, r }) {
  const barColor = r.followedPct === null ? 'bg-white/10' : r.followedPct >= 80 ? 'bg-emerald-400' : r.followedPct >= 50 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <li className="rounded-xl border border-white/5 bg-black/20 px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border border-white/15 text-[10px] text-neutral-400">{i + 1}</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm text-neutral-100 leading-snug">{r.text}</div>
          {r.seen > 0 ? (
            <>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${r.followedPct}%` }} />
                </div>
                <span className="text-[11px] tabular-nums text-neutral-400 w-24 text-right">{r.followedPct.toFixed(0)}% followed</span>
              </div>
              {r.skipped.count > 0 && r.ticked.count > 0 && (
                <div className="mt-1.5 text-[11px] text-neutral-500 tabular-nums">
                  Followed: <span className={pnlTone(r.ticked.avg)}>{money(r.ticked.avg)}</span> avg · Skipped:{' '}
                  <span className={pnlTone(r.skipped.avg)}>{money(r.skipped.avg)}</span> avg
                  {r.edge !== null && r.edge > 0 && <span className="text-amber-300"> · worth {moneyAbs(r.edge)}/trade</span>}
                </div>
              )}
            </>
          ) : (
            <div className="mt-1 text-[11px] text-neutral-600">Not used on a closed trade yet.</div>
          )}
        </div>
      </div>
    </li>
  );
}

function StrategyCard({ row, isBest, defaultOpen, onDelete, onSave, onDuplicate }) {
  const { strategy, st, disc, rules, insight } = row;
  const items = Array.isArray(strategy.checklist) ? strategy.checklist : [];
  const [c1, c2] = accentFor(strategy.id);

  const [open, setOpen] = useState(defaultOpen);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(strategy.name);
  const [desc, setDesc] = useState(strategy.description || '');
  const [draft, setDraft] = useState(items);
  const [newItem, setNewItem] = useState('');
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setName(strategy.name);
    setDesc(strategy.description || '');
    setDraft(items);
    setNewItem('');
    setOpen(true);
    setEditing(true);
  }

  function addItem() {
    const t = newItem.trim();
    if (!t) return;
    setDraft([...draft, t]);
    setNewItem('');
  }

  function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= draft.length) return;
    const next = draft.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setDraft(next);
  }

  async function save() {
    setSaving(true);
    const pending = newItem.trim();
    const finalItems = pending ? [...draft, pending] : draft;
    await onSave(strategy.id, name.trim() || strategy.name, desc, finalItems);
    setSaving(false);
    setEditing(false);
  }

  let badge = null;
  if (st.closed === 0) badge = <Badge>No closed trades</Badge>;
  else if (!st.enough) badge = <Badge>Building data · {st.closed}/{MIN_SAMPLE}</Badge>;
  else if (st.pnl > 0) badge = <Badge tone="good">Profitable</Badge>;
  else badge = <Badge tone="bad">Losing</Badge>;

  const insightTone = { warn: 'border-amber-400/30 bg-amber-500/10 text-amber-200', good: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200', info: 'border-white/10 bg-white/5 text-neutral-300' }[insight.tone];

  return (
    <article className="pf-card rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden">
      <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${c1}, ${c2})` }} />
      <div className="p-4 sm:p-5">
        {editing ? (
          <div className="space-y-3 mb-4">
            <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} !font-semibold`} placeholder="Strategy name" />
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="What defines this setup?" className={`${inputCls} resize-none`} />

            <div>
              <div className="text-[11px] uppercase tracking-wider text-neutral-500 font-medium mb-1.5">Pre-trade checklist</div>
              {draft.length === 0 && <p className="text-xs text-neutral-500 mb-2">No rules yet. Add the steps that must be true before you enter.</p>}
              <ul className="space-y-1.5 mb-2">
                {draft.map((t, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="w-5 text-center text-[10px] text-neutral-600">{i + 1}</span>
                    <input
                      value={t}
                      onChange={(e) => setDraft(draft.map((x, idx) => (idx === i ? e.target.value : x)))}
                      className={`${inputCls} !py-1.5 !text-xs flex-1 min-w-0`}
                    />
                    <button type="button" onClick={() => move(i, -1)} aria-label="Move up" className="text-neutral-500 hover:text-neutral-100 px-1.5 py-1 text-xs">↑</button>
                    <button type="button" onClick={() => move(i, 1)} aria-label="Move down" className="text-neutral-500 hover:text-neutral-100 px-1.5 py-1 text-xs">↓</button>
                    <button type="button" onClick={() => setDraft(draft.filter((_, idx) => idx !== i))} aria-label="Remove rule" className="text-red-400 hover:text-red-300 px-1.5 py-1 text-xs">✕</button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItem();
                    }
                  }}
                  placeholder="Add a rule, e.g. 15min CISD"
                  className={`${inputCls} !py-1.5 !text-xs flex-1 min-w-0`}
                />
                <button type="button" onClick={addItem} className="text-xs text-indigo-300 hover:text-indigo-200 px-2">+ Add</button>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5">
                <span className="text-[11px] text-neutral-500">Start from:</span>
                {Object.keys(TEMPLATES).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setDraft([...draft, ...TEMPLATES[k].filter((x) => !draft.includes(x))])}
                    className="text-[11px] text-indigo-300 hover:text-indigo-200"
                  >
                    {k} day
                  </button>
                ))}
                {draft.length > 0 && (
                  <button type="button" onClick={() => setDraft([])} className="text-[11px] text-neutral-500 hover:text-neutral-300 ml-auto">
                    Clear all
                  </button>
                )}
              </div>
            </div>

            <p className="text-[11px] text-neutral-600">
              Renaming a rule keeps old trades, but they will no longer count toward that rule&apos;s stats.
            </p>

            <div className="flex gap-2">
              <PrimaryButton onClick={save} disabled={saving} className="!py-2 !px-4 !text-xs">
                {saving ? 'Saving…' : 'Save changes'}
              </PrimaryButton>
              <GhostButton onClick={() => setEditing(false)} className="!py-2 !px-4 !text-xs">Cancel</GhostButton>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-start justify-between gap-3 text-left mb-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading text-base sm:text-lg font-semibold text-neutral-50 truncate">{strategy.name}</h3>
                {isBest && <Badge tone="star">★ Top performer</Badge>}
                {badge}
              </div>
              {strategy.description && <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{strategy.description}</p>}
            </div>
            <span className="mt-1 flex-shrink-0"><Chevron open={open} /></span>
          </button>
        )}

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-3 gap-y-3.5">
          <Metric label="Trades" value={st.total} hint={st.open > 0 ? `${st.open} open` : null} />
          <Metric label="Win rate" value={pct(st.winRate)} />
          <Metric label="P&L" value={st.closed ? money(st.pnl) : '—'} tone={st.closed ? pnlTone(st.pnl) : undefined} />
          <Metric label="Profit factor" value={pf(st.profitFactor)} />
          <Metric label="Avg R" value={rr(st.avgR)} tone={st.avgR === null ? undefined : pnlTone(st.avgR)} />
          <Metric label="Expectancy" value={st.expectancy === null ? '—' : money(st.expectancy)} tone={pnlTone(st.expectancy)} hint="per trade" />
        </div>

        <div className="mt-4">
          <Sparkline values={st.curve} color={st.pnl >= 0 ? '#34d399' : '#f87171'} />
        </div>

        {items.length > 0 && !editing && (
          <div className={`mt-3 rounded-xl border px-3 py-2 text-xs leading-relaxed ${insightTone}`}>{insight.text}</div>
        )}

        {st.decay?.flag && !editing && (
          <div className="mt-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs leading-relaxed text-rose-200">
            Edge check: your last {st.decay.recent.n} trades on this setup average {money(st.decay.recent.exp)} per trade, versus {money(st.decay.prior.exp)} before. The setup may be losing its edge, or you may be executing it differently.
          </div>
        )}

        {open && !editing && (
          <div className="pf-fade mt-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-white/5 bg-black/20 p-3">
              <Metric label="Avg win" value={st.avgWin === null ? '—' : money(st.avgWin)} tone="text-emerald-400" />
              <Metric label="Avg loss" value={st.avgLoss === null ? '—' : money(st.avgLoss)} tone="text-red-400" />
              <Metric label="Best trade" value={st.best === null ? '—' : money(st.best)} />
              <Metric label="Longest losing run" value={st.closed ? `${st.worstStreak}` : '—'} hint={st.closed ? 'trades in a row' : null} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] uppercase tracking-wider text-neutral-500 font-medium">Checklist rules</div>
                {disc.completion !== null && <div className="text-[11px] text-neutral-500 tabular-nums">{disc.completion.toFixed(0)}% average completion</div>}
              </div>
              {items.length > 0 ? (
                <ul className="space-y-2">
                  {rules.map((r, i) => (
                    <RuleRow key={`${i}-${r.text}`} i={i} r={r} />
                  ))}
                </ul>
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 p-4 text-center">
                  <p className="text-xs text-neutral-500">No checklist yet. Add the rules that must be true before you enter.</p>
                  <button onClick={startEdit} className="mt-2 text-xs text-indigo-300 hover:text-indigo-200">Add rules</button>
                </div>
              )}
            </div>

            {disc.count > 0 && (
              <div className="rounded-xl border border-white/5 bg-black/20 p-3 space-y-1.5">
                <div className="text-xs font-medium text-neutral-200 mb-1">Does the checklist pay?</div>
                {[
                  ['Every rule ticked', disc.full, 'text-emerald-400'],
                  ['Missed a rule', disc.missed, 'text-red-400'],
                ].map(([label, s, tone]) => (
                  <div key={label} className="flex items-center justify-between gap-3 text-xs">
                    <span className={tone}>{label}</span>
                    <span className="text-neutral-500 tabular-nums text-right">
                      {s.count} trade{s.count !== 1 ? 's' : ''} · {s.winRate === null ? '—' : `${s.winRate.toFixed(0)}% win`} ·{' '}
                      <span className={pnlTone(s.pnl)}>{s.count ? money(s.pnl) : '—'}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <GhostButton onClick={startEdit} className="!py-1.5 !px-3 !text-xs">Edit</GhostButton>
              <GhostButton onClick={() => onDuplicate(strategy)} className="!py-1.5 !px-3 !text-xs">Duplicate</GhostButton>
              <button onClick={() => onDelete(strategy.id)} className="ml-auto text-xs text-red-400 hover:text-red-300 px-2 py-1.5">Delete</button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

const SORTS = [
  { key: 'pnl', label: 'P&L' },
  { key: 'winRate', label: 'Win rate' },
  { key: 'trades', label: 'Trades' },
  { key: 'newest', label: 'Newest' },
];

export default function StrategiesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [strategies, setStrategies] = useState([]);
  const [trades, setTrades] = useState([]);
  const [defaultRisk, setDefaultRisk] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('pnl');
  const [toast, setToast] = useState(null);

  const notify = useCallback((msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/login');
      else setUser(session.user);
    });
  }, [router]);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: s }, { data: t }, { data: settings }] = await Promise.all([
      supabase.from('strategies').select('*').order('created_at', { ascending: true }),
      // Only trades that have a strategy, fetched page by page so the
      // 1000-row server cap can never hide tagged trades.
      fetchAllRows(() =>
        supabase
          .from('trades')
          .select('id, pnl, exit_price, strategy_id, checklist, entry_time, risk_amount, entry_price, stop_loss, size')
          .not('strategy_id', 'is', null)
          .order('id', { ascending: true })
      ),
      supabase.from('user_settings').select('default_risk_amount').eq('user_id', user.id).maybeSingle(),
    ]);
    setStrategies(s || []);
    setTrades(t || []);
    setDefaultRisk(settings?.default_risk_amount ?? null);
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function createStrategy(name = newName, checklist = []) {
    const clean = name.trim();
    if (!clean) return;
    setCreating(true);
    const { error } = await supabase.from('strategies').insert({ user_id: user.id, name: clean, checklist });
    setCreating(false);
    if (error) return notify(`Couldn't add: ${error.message}`, 'error');
    setNewName('');
    notify(`Added ${clean}`);
    load();
  }

  async function saveStrategy(id, name, description, checklist) {
    const cleaned = checklist.map((x) => x.trim()).filter(Boolean);
    const { error } = await supabase.from('strategies').update({ name, description, checklist: cleaned }).eq('id', id);
    if (error) notify(`Couldn't save: ${error.message}`, 'error');
    else notify('Strategy saved');
    load();
  }

  async function duplicateStrategy(s) {
    const { error } = await supabase.from('strategies').insert({
      user_id: user.id,
      name: `${s.name} (copy)`,
      description: s.description || null,
      checklist: Array.isArray(s.checklist) ? s.checklist : [],
    });
    if (error) notify(`Couldn't duplicate: ${error.message}`, 'error');
    else notify('Duplicated');
    load();
  }

  async function deleteStrategy(id) {
    if (!confirm('Delete this strategy? Trades tagged with it will become untagged.')) return;
    const { error } = await supabase.from('strategies').delete().eq('id', id);
    if (error) notify(`Couldn't delete: ${error.message}`, 'error');
    else notify('Strategy deleted');
    load();
  }

  const rows = useMemo(() => {
    return strategies.map((strategy) => {
      const tagged = trades.filter((t) => t.strategy_id === strategy.id);
      const st = strategyStats(tagged, defaultRisk);
      const disc = disciplineSplit(tagged);
      const rules = ruleStats(Array.isArray(strategy.checklist) ? strategy.checklist : [], tagged);
      const insight = insightLine(rules, disc, moneyAbs);
      return { strategy, tagged, st, disc, rules, insight };
    });
  }, [strategies, trades, defaultRisk]);

  const best = useMemo(() => {
    const ranked = rows.filter((r) => r.st.closed >= 3 && r.st.pnl > 0).sort((a, b) => b.st.pnl - a.st.pnl);
    return rows.length > 1 && ranked.length ? ranked[0] : null;
  }, [rows]);

  const overall = useMemo(() => disciplineSplit(trades), [trades]);
  const closedTotal = rows.reduce((s, r) => s + r.st.closed, 0);
  const pnlTotal = rows.reduce((s, r) => s + r.st.pnl, 0);
  const fullPct = overall.count ? (overall.full.count / overall.count) * 100 : null;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => !q || r.strategy.name.toLowerCase().includes(q) || (r.strategy.description || '').toLowerCase().includes(q));
    const cmp = {
      pnl: (a, b) => b.st.pnl - a.st.pnl,
      winRate: (a, b) => (b.st.winRate ?? -1) - (a.st.winRate ?? -1),
      trades: (a, b) => b.st.total - a.st.total,
      newest: (a, b) => new Date(b.strategy.created_at || 0) - new Date(a.strategy.created_at || 0),
    }[sort];
    return list.slice().sort(cmp);
  }, [rows, query, sort]);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-neutral-50">Strategies</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Your playbooks. See which ones pay and which rules you skip.</p>
          </div>
          <button onClick={() => router.push('/journal')} className="text-sm text-neutral-400 hover:text-neutral-100 flex-shrink-0 mt-1">
            Back to Journal
          </button>
        </div>

        {strategies.length > 0 && (
          <div className="pf-stagger grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <Tile label="Playbooks" value={strategies.length} sub={`${closedTotal} closed trade${closedTotal !== 1 ? 's' : ''} tagged`} />
            <Tile label="Total P&L" value={closedTotal ? money(pnlTotal) : '—'} tone={closedTotal ? pnlTone(pnlTotal) : undefined} sub="across all playbooks" />
            <Tile label="Top performer" value={best ? best.strategy.name : '—'} sub={best ? money(best.st.pnl) : 'needs 3+ closed trades'} />
            <Tile
              label="Rule discipline"
              value={fullPct === null ? '—' : `${fullPct.toFixed(0)}%`}
              sub={fullPct === null ? 'tick checklists to track' : 'trades with every rule ticked'}
              tone={fullPct === null ? undefined : fullPct >= 80 ? 'text-emerald-400' : fullPct >= 50 ? 'text-amber-300' : 'text-red-400'}
            />
          </div>
        )}

        <section className="pf-card rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4 mb-5">
          <div className="flex gap-2">
            <input
              placeholder="New strategy name (e.g. ICT Silver Bullet)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createStrategy()}
              className={inputCls}
            />
            <PrimaryButton onClick={() => createStrategy()} disabled={creating || !newName.trim()} className="flex-shrink-0">
              + Add
            </PrimaryButton>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-[11px] text-neutral-500">Quick start with rules:</span>
            {Object.keys(TEMPLATES).map((k) => (
              <button
                key={k}
                type="button"
                disabled={creating}
                onClick={() => createStrategy(`${k} day`, TEMPLATES[k])}
                className="pf-chip rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-neutral-300 hover:text-neutral-50 hover:bg-white/10 disabled:opacity-40"
              >
                + {k}
              </button>
            ))}
          </div>
        </section>

        {strategies.length > 1 && (
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center mb-4">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search strategies…" className={`${inputCls} sm:max-w-xs`} />
            <div className="flex items-center gap-1.5 sm:ml-auto overflow-x-auto">
              <span className="text-[11px] text-neutral-500 mr-1 flex-shrink-0">Sort</span>
              {SORTS.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setSort(o.key)}
                  className={`pf-chip flex-shrink-0 rounded-full border px-3 py-1 text-[11px] ${
                    sort === o.key ? 'is-active border-indigo-400/60 bg-indigo-500/15 text-indigo-100' : 'border-white/10 bg-white/[0.03] text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {!loaded ? (
          <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="skeleton h-52 !bg-white/5" />)}</div>
        ) : strategies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center">
            <div className="text-neutral-200 font-medium">No strategies yet</div>
            <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto leading-relaxed">
              Define your first playbook above and add its checklist. Pick it when you log a trade, and this page will show which setups and rules make you money.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-neutral-500">No strategies match “{query}”.</div>
        ) : (
          <div className="space-y-4">
            {visible.map((r) => (
              <StrategyCard
                key={r.strategy.id}
                row={r}
                isBest={best?.strategy.id === r.strategy.id}
                defaultOpen={strategies.length === 1}
                onDelete={deleteStrategy}
                onSave={saveStrategy}
                onDuplicate={duplicateStrategy}
              />
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div
          className={`pf-toast fixed left-1/2 bottom-24 md:bottom-6 z-50 rounded-xl border px-4 py-2.5 text-sm shadow-2xl backdrop-blur-xl ${
            toast.type === 'error' ? 'border-red-400/40 bg-red-950/80 text-red-200' : 'border-white/10 bg-neutral-900/90 text-neutral-100'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </AppShell>
  );
}
