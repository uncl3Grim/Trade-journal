'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { computeLimitInsights, levelOf } from '../../lib/limitInsights';
import { hasTrackedRules } from '../../lib/dailyLimit';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const usd = (n) => {
  const a = Math.abs(Number(n) || 0);
  return `${n < 0 ? '-' : ''}$${a.toLocaleString('en-US', { maximumFractionDigits: a >= 1000 ? 0 : 2 })}`;
};
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${usd(Math.abs(n))}`;
const dayLabel = (key) => format(parseISO(key), 'EEE, MMM d');
const plural = (n, one, many) => (n === 1 ? one : many);

const LEVEL = {
  ok: { hex: '#34d399', text: 'text-emerald-300', chip: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200', bar: 'bg-emerald-400' },
  warn: { hex: '#fbbf24', text: 'text-amber-300', chip: 'border-amber-400/30 bg-amber-500/10 text-amber-200', bar: 'bg-amber-400' },
  danger: { hex: '#fb923c', text: 'text-orange-300', chip: 'border-orange-400/30 bg-orange-500/10 text-orange-200', bar: 'bg-orange-400' },
  breach: { hex: '#fb7185', text: 'text-rose-300', chip: 'border-rose-400/40 bg-rose-500/15 text-rose-200', bar: 'bg-rose-400' },
  none: { hex: '#a3a3a3', text: 'text-neutral-300', chip: 'border-white/10 bg-white/5 text-neutral-300', bar: 'bg-neutral-400' },
};

const STATUS = {
  safe: { label: 'On track', lv: 'ok', msg: 'Every limit is healthy. Keep your risk consistent.' },
  caution: { label: 'Careful', lv: 'warn', msg: 'A limit is getting used up. Trade smaller or step away.' },
  danger: { label: 'Danger zone', lv: 'danger', msg: "You're close to a limit. Consider stopping for today." },
  breached: { label: 'Limit hit', lv: 'breach', msg: 'A limit has been reached. Stop, close the charts and review.' },
  target: { label: 'Target hit', lv: 'ok', msg: 'Profit target reached. Check minimum days and consistency before you wrap up.' },
};

function useCountUp(target, ms = 1000) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf;
    const t0 = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      setV(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function useMounted() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return on;
}

// ---------------------------------------------------------------------------
// small building blocks
// ---------------------------------------------------------------------------
function Card({ title, right, children, delay = 0, className = '' }) {
  return (
    <section
      className={`animate-fade-in-up rounded-2xl border border-neutral-800/60 bg-white/[0.04] backdrop-blur-md p-4 ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {(title || right) && (
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-neutral-100">{title}</h3>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

function Money({ value, className = '' }) {
  const v = useCountUp(value);
  return <span className={`tabular-nums ${className}`}>{usd(Math.round(v * 100) / 100)}</span>;
}

function Bar({ pct, level, tick }) {
  const on = useMounted();
  return (
    <div className="relative h-2.5 rounded-full bg-white/10 overflow-hidden">
      <div
        className={`h-full rounded-full ${LEVEL[level]?.bar || LEVEL.none.bar}`}
        style={{ width: `${on ? Math.max(0, Math.min(100, pct)) : 0}%`, transition: 'width 1000ms cubic-bezier(.2,.8,.2,1)' }}
      />
      {tick ? <span className="absolute top-0 bottom-0 w-px bg-white/60" style={{ left: `${tick}%` }} /> : null}
    </div>
  );
}

function Ring({ pct, hex, title, sub, size = 92, stroke = 9, delay = 0 }) {
  const on = useMounted();
  const shown = useCountUp(pct);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="flex flex-col items-center text-center animate-pop-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={hex}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={on ? c * (1 - p / 100) : c}
            style={{ transition: 'stroke-dashoffset 1100ms cubic-bezier(.2,.8,.2,1), stroke 400ms', filter: `drop-shadow(0 0 6px ${hex}66)` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-semibold tabular-nums text-neutral-50">{Math.round(shown)}%</span>
        </div>
      </div>
      <div className="text-xs font-medium text-neutral-200 mt-2">{title}</div>
      <div className="text-[11px] text-neutral-500 leading-tight">{sub}</div>
    </div>
  );
}

function Empty({ title, body, cta, onClick }) {
  return (
    <div className="animate-fade-in-up rounded-3xl border border-neutral-800/60 bg-white/[0.04] backdrop-blur-md p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" fill="currentColor" fillOpacity="0.16" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      </div>
      <h3 className="font-heading text-lg font-semibold text-neutral-50">{title}</h3>
      <p className="text-sm text-neutral-400 mt-1.5 max-w-sm mx-auto leading-relaxed">{body}</p>
      {cta && (
        <button onClick={onClick} className="mt-5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25">
          {cta}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// hero
// ---------------------------------------------------------------------------
function ModeToggle({ mode, onChange }) {
  const trailing = mode === 'trailing';
  return (
    <div>
      <div className="relative grid grid-cols-2 rounded-xl border border-white/10 bg-black/30 p-0.5 text-xs font-medium">
        <span
          className="absolute top-0.5 bottom-0.5 rounded-lg bg-white/15"
          style={{ width: 'calc(50% - 2px)', left: trailing ? '50%' : '2px', transition: 'left 350ms cubic-bezier(.34,1.56,.64,1)' }}
        />
        <button onClick={() => onChange('static')} className={`relative z-10 py-1.5 ${!trailing ? 'text-neutral-50' : 'text-neutral-400'}`}>
          Static
        </button>
        <button onClick={() => onChange('trailing')} className={`relative z-10 py-1.5 ${trailing ? 'text-neutral-50' : 'text-neutral-400'}`}>
          Trailing
        </button>
      </div>
      <p className="text-[11px] text-neutral-500 mt-1.5 leading-relaxed">
        {trailing
          ? 'Trailing: the floor rises with your best balance, so profit you build can be lost. Most prop firms use this.'
          : 'Static: the floor stays fixed at your starting balance minus the limit.'}
      </p>
    </div>
  );
}

function Hero({ ins, account, onModeChange }) {
  const st = STATUS[ins.status];
  const lv = LEVEL[st.lv];
  const label = ins.status === 'breached' ? (ins.cfg.isProp ? 'Rule breached' : 'Limit hit') : st.label;
  const bal = useCountUp(ins.balance);
  return (
    <div className="pf-hero relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4 sm:p-5">
      <div className="pf-glow pointer-events-none absolute -top-20 -left-16 h-56 w-56 rounded-full blur-3xl opacity-30" style={{ background: lv.hex, transition: 'background 600ms' }} />
      <div className="pf-glow pf-glow-b pointer-events-none absolute -bottom-24 -right-10 h-56 w-56 rounded-full blur-3xl opacity-20" style={{ background: '#6366f1' }} />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-base font-semibold text-neutral-50 truncate">{account.broker_server}</h2>
              <span className="flex-shrink-0 rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] text-neutral-300">{ins.cfg.isProp ? 'Prop firm' : 'Personal'}</span>
            </div>
            <div className="text-xs text-neutral-400 mt-0.5">Started at {usd(ins.start)}</div>
          </div>
          <span className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${lv.chip}`}>
            <span className="relative flex h-2 w-2">
              <span className="tr-ping absolute inline-flex h-full w-full rounded-full opacity-70" style={{ background: lv.hex }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: lv.hex }} />
            </span>
            {label}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
          <div className="text-3xl font-semibold tabular-nums text-neutral-50">{usd(Math.round(bal * 100) / 100)}</div>
          <div className={`pb-1 text-sm font-medium tabular-nums ${ins.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {signed(ins.profit)} · {ins.profitPct >= 0 ? '+' : ''}
            {ins.profitPct.toFixed(2)}%
          </div>
        </div>
        <p className="mt-2 text-sm text-neutral-300 leading-relaxed">{st.msg}</p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            { k: 'Best balance', v: usd(ins.peak) },
            { k: ins.floor !== null ? 'Breach floor' : 'Trading days', v: ins.floor !== null ? usd(ins.floor) : String(ins.tradingDays) },
            { k: 'Closed trades', v: String(ins.closedCount) },
          ].map((s) => (
            <div key={s.k} className="rounded-xl border border-white/10 bg-black/20 px-2 py-2">
              <div className="text-[10px] uppercase tracking-wider text-neutral-500">{s.k}</div>
              <div className="text-sm font-semibold tabular-nums text-neutral-100 mt-0.5">{s.v}</div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <ModeToggle mode={ins.trailing ? 'trailing' : 'static'} onChange={onModeChange} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// rings row
// ---------------------------------------------------------------------------
function Rings({ ins }) {
  const items = [];
  const { cfg } = ins;
  if (cfg.dailyPct) {
    const lv = levelOf(ins.today.used);
    items.push({ key: 'd', pct: ins.today.used, hex: LEVEL[lv].hex, title: 'Daily loss', sub: `${usd(ins.today.low)} of ${usd(ins.today.limit)}` });
  }
  if (cfg.maxPct) {
    const lv = levelOf(ins.maxUsed);
    items.push({ key: 'm', pct: ins.maxUsed, hex: LEVEL[lv].hex, title: ins.trailing ? 'Trailing DD' : 'Static DD', sub: `${usd(ins.currentDD)} of ${usd(ins.maxLimit)}` });
  }
  if (cfg.weeklyPct && ins.weekly) {
    const lv = levelOf(ins.weekly.used);
    items.push({ key: 'w', pct: ins.weekly.used, hex: LEVEL[lv].hex, title: 'Weekly loss', sub: `${usd(ins.weekly.loss)} of ${usd(ins.weekly.limit)}` });
  }
  if (ins.target) {
    items.push({ key: 't', pct: Math.min(100, ins.target.progress), hex: ins.target.hit ? '#34d399' : '#818cf8', title: 'Profit target', sub: ins.target.hit ? 'Reached' : `${usd(ins.target.remaining)} to go` });
  }
  if (cfg.consPct && ins.consistency.used !== null) {
    const lv = levelOf(ins.consistency.used);
    items.push({ key: 'c', pct: Math.min(100, ins.consistency.used), hex: LEVEL[lv].hex, title: 'Best-day share', sub: `${Math.round(ins.consistency.bestPct)}% vs ${cfg.consPct}% cap` });
  }
  if (!items.length) return null;
  return (
    <Card className="!p-4">
      <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((it, i) => (
          <Ring key={it.key} {...it} delay={i * 90} />
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// equity chart with the breach floor
// ---------------------------------------------------------------------------
function EquityChart({ ins }) {
  const pts = ins.points;
  const W = 340;
  const H = 150;
  const P = 10;
  if (pts.length < 2) {
    return <p className="text-sm text-neutral-500 py-6 text-center">Close a few trades and your balance curve shows up here.</p>;
  }
  const targetLevel = ins.target ? ins.start + ins.target.dollars : null;
  const vals = [...pts.map((p) => p.bal), ...pts.map((p) => p.floor).filter((v) => v !== null), ins.start];
  if (targetLevel) vals.push(targetLevel);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const pad = (hi - lo) * 0.1 || 1;
  const y = (v) => H - P - ((v - (lo - pad)) / (hi + pad - (lo - pad))) * (H - 2 * P);
  const x = (i) => P + (i / (pts.length - 1)) * (W - 2 * P);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.bal).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts.length - 1).toFixed(1)} ${H - P} L${x(0).toFixed(1)} ${H - P} Z`;
  const hasFloor = pts.some((p) => p.floor !== null);
  const floorLine = hasFloor ? pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.floor).toFixed(1)}`).join(' ') : null;
  const last = pts[pts.length - 1];
  const up = last.bal >= ins.start;
  const col = up ? '#34d399' : '#fb7185';

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Balance curve with breach floor">
        <defs>
          <linearGradient id="lv-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity="0.35" />
            <stop offset="100%" stopColor={col} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={P} x2={W - P} y1={y(ins.start)} y2={y(ins.start)} stroke="rgba(255,255,255,0.18)" strokeDasharray="2 4" />
        {targetLevel && <line x1={P} x2={W - P} y1={y(targetLevel)} y2={y(targetLevel)} stroke="#34d399" strokeOpacity="0.6" strokeDasharray="5 4" />}
        <path d={area} fill="url(#lv-area)" className="animate-fade-in-up" style={{ animationDelay: '700ms' }} />
        {floorLine && <path d={floorLine} fill="none" stroke="#fb7185" strokeWidth="1.5" strokeDasharray="5 4" strokeOpacity="0.9" />}
        <path d={line} pathLength="1" className="tr-draw" fill="none" stroke={col} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(pts.length - 1)} cy={y(last.bal)} r="4" fill={col} className="animate-pop-in" style={{ animationDelay: '900ms' }} />
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: col }} /> Balance</span>
        {hasFloor && <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-rose-400" /> Breach floor ({ins.trailing ? 'trailing' : 'static'})</span>}
        {targetLevel && <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-emerald-400" /> Target</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TODAY tab
// ---------------------------------------------------------------------------
function TodayPanel({ ins, onSetup }) {
  const t = ins.today;
  const dailyLv = levelOf(t.used);
  const maxLv = levelOf(ins.maxUsed);
  const room = ins.floor !== null ? Math.max(0, ins.balance - ins.floor) : null;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card title="Room left today" delay={0}>
        {ins.cfg.dailyPct ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <Money value={t.left} className={`text-2xl font-semibold ${LEVEL[dailyLv].text}`} />
              <span className="text-xs text-neutral-500 pb-1">of {usd(t.limit)} daily limit</span>
            </div>
            <div className="mt-3">
              <Bar pct={t.used} level={dailyLv} tick={60} />
            </div>
            <p className="mt-3 text-xs text-neutral-400 leading-relaxed">
              Worst point today: <b className="text-neutral-200">{usd(t.low)}</b> down. Today is {signed(t.pnl)} so far.
              {t.lossesLeft !== null && (
                <> At your average loss of {usd(t.avgLoss)}, that is about <b className="text-neutral-200">{t.lossesLeft}</b> more {plural(t.lossesLeft, 'loss', 'losses')}.</>
              )}
            </p>
            <div className="mt-3 rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-100 leading-relaxed">
              Pro tip: set your own stop at about 60% of the limit ({usd(t.buffer60)}). It leaves a buffer for slippage and open trades. The white tick on the bar marks it.
            </div>
          </>
        ) : (
          <button onClick={onSetup} className="text-left text-sm text-neutral-400 hover:text-neutral-200">
            No daily loss limit yet. Tap to set one on the Broker page.
          </button>
        )}
      </Card>

      <Card title={ins.trailing ? 'Distance to the trailing floor' : 'Distance to the static floor'} delay={90}>
        {ins.cfg.maxPct ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <Money value={room} className={`text-2xl font-semibold ${LEVEL[maxLv].text}`} />
              <span className="text-xs text-neutral-500 pb-1">of room left</span>
            </div>
            <div className="mt-3">
              <Bar pct={ins.maxUsed} level={maxLv} tick={60} />
            </div>
            <p className="mt-3 text-xs text-neutral-400 leading-relaxed">
              Balance {usd(ins.balance)}, floor <b className="text-neutral-200">{usd(ins.floor)}</b>. You are {usd(ins.currentDD)} below your {ins.trailing ? 'best balance' : 'starting balance'}.
              {ins.trailing && ' If you grow the account, this floor moves up with you.'}
            </p>
          </>
        ) : (
          <button onClick={onSetup} className="text-left text-sm text-neutral-400 hover:text-neutral-200">
            No max drawdown yet. Tap to set one on the Broker page.
          </button>
        )}
      </Card>

      <Card title="Balance curve" className="md:col-span-2" delay={180}>
        <EquityChart ins={ins} />
      </Card>

      {ins.weekly && (
        <Card title="This week" delay={270}>
          <div className="flex items-end justify-between gap-3">
            <Money value={ins.weekly.left} className={`text-xl font-semibold ${LEVEL[levelOf(ins.weekly.used)].text}`} />
            <span className="text-xs text-neutral-500 pb-1">left of {usd(ins.weekly.limit)}</span>
          </div>
          <div className="mt-3">
            <Bar pct={ins.weekly.used} level={levelOf(ins.weekly.used)} />
          </div>
          <p className="mt-2 text-xs text-neutral-400">Week so far: {signed(ins.weekly.pnl)} (Monday to today).</p>
        </Card>
      )}

      {(ins.target || ins.cfg.consPct || ins.cfg.minDays || ins.cfg.challengeDays) && (
        <Card title="Challenge progress" delay={360}>
          <div className="space-y-3">
            {ins.target && (
              <div>
                <div className="flex justify-between text-xs text-neutral-400 mb-1">
                  <span>Profit target</span>
                  <span className="tabular-nums">{signed(ins.profit)} of {usd(ins.target.dollars)}</span>
                </div>
                <Bar pct={Math.min(100, ins.target.progress)} level={ins.target.hit ? 'ok' : 'none'} />
              </div>
            )}
            {ins.cfg.consPct && (
              <p className="text-xs text-neutral-400 leading-relaxed">
                {ins.consistency.bestPct === null
                  ? `Consistency: no profit yet. Your best day must stay under ${ins.cfg.consPct}% of total profit.`
                  : ins.consistency.compliant
                  ? `Consistency OK: best day ${usd(ins.consistency.bestDay)} is ${Math.round(ins.consistency.bestPct)}% of profit (cap ${ins.cfg.consPct}%).`
                  : `Consistency over the cap: best day ${usd(ins.consistency.bestDay)} is ${Math.round(ins.consistency.bestPct)}% of profit. You need ${usd(ins.consistency.neededProfit)} total profit, about ${usd(ins.consistency.moreNeeded)} more.`}
              </p>
            )}
            {ins.cfg.minDays && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-neutral-400 mr-1">Trading days</span>
                {Array.from({ length: Math.min(ins.cfg.minDays, 14) }).map((_, i) => (
                  <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < ins.tradingDays ? 'bg-emerald-400' : 'bg-white/15'}`} />
                ))}
                <span className="text-xs text-neutral-500 ml-1 tabular-nums">{ins.tradingDays}/{ins.cfg.minDays}</span>
              </div>
            )}
            {ins.cfg.challengeDays && (
              <p className="text-xs text-neutral-400">
                {ins.time.daysLeft === null
                  ? `Time limit: ${ins.cfg.challengeDays} days, starting at your first trade.`
                  : ins.time.daysLeft < 0
                  ? 'Time limit passed.'
                  : `Time left: ${ins.time.daysLeft} ${plural(ins.time.daysLeft, 'day', 'days')} (day ${ins.time.elapsed} of ${ins.cfg.challengeDays}).`}
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CLOSE CALLS tab
// ---------------------------------------------------------------------------
function heatColor(h) {
  if (h >= 100) return '#fb7185';
  if (h >= 60) return '#fb923c';
  if (h >= 30) return '#fbbf24';
  return 'rgba(52,211,153,0.55)';
}

function DangerStrip({ ins, onOpenDay }) {
  if (!ins.strip.length) return null;
  return (
    <Card title="Your last trading days" right={<span className="text-[11px] text-neutral-500">{ins.heatBasis === 'limit' ? 'Colour = daily limit used' : 'Colour = loss vs a 5% reference'}</span>} delay={90}>
      <div className="flex flex-wrap gap-1.5">
        {ins.strip.map((s, i) => (
          <button
            key={s.day}
            onClick={() => onOpenDay?.(s.day)}
            title={`${dayLabel(s.day)} · ${signed(s.pnl)} · ${s.trades} ${plural(s.trades, 'trade', 'trades')}${s.heat ? ` · ${Math.round(s.heat)}%` : ''}`}
            aria-label={`${dayLabel(s.day)}, ${signed(s.pnl)}`}
            className="tr-pop-cell h-5 w-5 rounded-md"
            style={{ background: heatColor(s.heat || 0), animationDelay: `${Math.min(i, 40) * 14}ms` }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-500">
        {[
          ['rgba(52,211,153,0.55)', 'Calm'],
          ['#fbbf24', '30%+'],
          ['#fb923c', '60%+'],
          ['#fb7185', 'Breach'],
        ].map(([c, l]) => (
          <span key={l} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded" style={{ background: c }} />{l}</span>
        ))}
        <span>Tap a square to open that day.</span>
      </div>
    </Card>
  );
}

function CallRow({ r, used, kind, onOpen, delay }) {
  const lv = levelOf(used);
  const detail =
    kind === 'daily'
      ? `Down ${usd(r.lowLoss)} of ${usd(r.dailyLimit)} · ${r.trades} ${plural(r.trades, 'trade', 'trades')}`
      : `Drawdown hit ${usd(r.ddPeak)} · ${r.trades} ${plural(r.trades, 'trade', 'trades')}`;
  return (
    <button
      onClick={() => onOpen?.(r.day)}
      className="animate-fade-in-up w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-left"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-neutral-100">{dayLabel(r.day)}</span>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${LEVEL[lv].chip}`}>{Math.round(used)}%</span>
      </div>
      <div className="mt-2"><Bar pct={used} level={lv} /></div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-neutral-400">
        <span>{detail}</span>
        {r.broke > 0 && <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-amber-200">{r.broke} off-plan</span>}
      </div>
    </button>
  );
}

function CallsPanel({ ins, onOpenDay }) {
  const none = !ins.dailyCalls.length && !ins.ddCalls.length;
  const habits = [
    { key: 'q', n: ins.quick.length, label: 'Quick re-entries after a loss', note: 'Opened within 15 min of a loss closing. A classic revenge-trade sign.' },
    { key: 'o', n: ins.overTrades.length, label: 'Days over your trade cap', note: ins.cfg.maxTrades ? `More than ${ins.cfg.maxTrades} trades in a day.` : '' },
    { key: 'r', n: ins.riskViolations.length, label: 'Trades over your risk cap', note: ins.cfg.riskPct ? `Risked more than ${ins.cfg.riskPct}% of balance.` : '' },
    { key: 'w', n: ins.cfg.isProp ? ins.weekend.length : 0, label: 'Trades held over a weekend', note: 'Some prop firms ban this.' },
  ].filter((h) => (h.key === 'q' || (h.key === 'o' && ins.cfg.maxTrades) || (h.key === 'r' && ins.cfg.riskPct) || (h.key === 'w' && ins.cfg.isProp)));

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          { k: 'Breaches', v: ins.breachDays, lv: ins.breachDays ? 'breach' : 'ok' },
          { k: 'Close calls', v: ins.closeCallDays, lv: ins.closeCallDays ? 'warn' : 'ok' },
          { k: 'Calm days', v: ins.cleanDays, lv: 'ok' },
        ].map((s, i) => (
          <div key={s.k} className="animate-fade-in-up rounded-2xl border border-neutral-800/60 bg-white/[0.04] p-3 text-center" style={{ animationDelay: `${i * 70}ms` }}>
            <div className={`text-2xl font-semibold tabular-nums ${LEVEL[s.lv].text}`}>{s.v}</div>
            <div className="text-[11px] text-neutral-400 mt-0.5">{s.k}</div>
          </div>
        ))}
      </div>

      <DangerStrip ins={ins} onOpenDay={onOpenDay} />

      {none ? (
        <Card delay={180}>
          <p className="text-sm text-neutral-300">No day has used 60% or more of a limit yet. That is exactly what we want to see.</p>
          <p className="text-xs text-neutral-500 mt-1">When one does, it shows up here with the date, how close it got and whether you broke your plan that day.</p>
        </Card>
      ) : (
        <>
          {ins.dailyCalls.length > 0 && (
            <Card title="Daily limit near misses" right={<span className="text-[11px] text-neutral-500">60%+ of the limit</span>} delay={180}>
              <div className="space-y-2">
                {ins.dailyCalls.slice(0, 12).map((r, i) => (
                  <CallRow key={r.day} r={r} used={r.dailyUsed} kind="daily" onOpen={onOpenDay} delay={i * 50} />
                ))}
              </div>
            </Card>
          )}
          {ins.ddCalls.length > 0 && (
            <Card title={`${ins.trailing ? 'Trailing' : 'Static'} drawdown near misses`} right={<span className="text-[11px] text-neutral-500">60%+ of the limit</span>} delay={270}>
              <div className="space-y-2">
                {ins.ddCalls.slice(0, 12).map((r, i) => (
                  <CallRow key={r.day} r={r} used={r.ddUsed} kind="dd" onOpen={onOpenDay} delay={i * 50} />
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      <Card title="Habits to watch" delay={360}>
        <div className="space-y-2">
          {habits.map((h) => (
            <div key={h.key} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm text-neutral-200">{h.label}</div>
                {h.note && <div className="text-[11px] text-neutral-500">{h.note}</div>}
              </div>
              <span className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold tabular-nums ${h.n ? LEVEL.warn.chip : LEVEL.ok.chip}`}>{h.n}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RULES tab
// ---------------------------------------------------------------------------
const RULE_STYLE = {
  ok: { ring: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300', icon: 'M5 12l5 5 9-10' },
  warn: { ring: 'border-amber-400/40 bg-amber-500/15 text-amber-300', icon: 'M12 7v6M12 17h.01' },
  bad: { ring: 'border-rose-400/40 bg-rose-500/15 text-rose-300', icon: 'M7 7l10 10M17 7L7 17' },
  info: { ring: 'border-indigo-400/40 bg-indigo-500/15 text-indigo-300', icon: 'M12 8h.01M11 12h1v5h1' },
  na: { ring: 'border-white/15 bg-white/5 text-neutral-400', icon: 'M7 12h10' },
};

function RuleRow({ rule, delay }) {
  const s = RULE_STYLE[rule.status] || RULE_STYLE.na;
  return (
    <div className="animate-fade-in-up flex items-start gap-3 py-2.5" style={{ animationDelay: `${delay}ms` }}>
      <span className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border ${s.ring}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={s.icon} />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-neutral-100">{rule.label}</span>
          <span className="flex-shrink-0 text-xs font-semibold tabular-nums text-neutral-200">{rule.value}</span>
        </div>
        <div className="text-[11px] text-neutral-500 leading-snug mt-0.5">{rule.detail}</div>
      </div>
    </div>
  );
}

const GROUPS = ['Loss limits', 'Discipline', 'Challenge'];

function RulesPanel({ ins, onSetup }) {
  let n = 0;
  return (
    <div className="grid gap-3">
      {GROUPS.map((g) => {
        const list = ins.rules.filter((r) => r.group === g);
        if (!list.length) return null;
        return (
          <Card key={g} title={g} delay={n * 60}>
            <div className="divide-y divide-white/5">
              {list.map((r) => (
                <RuleRow key={r.key} rule={r} delay={(n++) * 45} />
              ))}
            </div>
          </Card>
        );
      })}

      {ins.missing.length > 0 && (
        <Card title="Rules you have not set" right={<button onClick={onSetup} className="text-xs font-medium text-indigo-300">Set up</button>} delay={200}>
          <div className="space-y-2">
            {ins.missing.map((m) => (
              <div key={m.key} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white/30" />
                <div>
                  <span className="text-sm text-neutral-200">{m.label}</span>
                  <span className="block text-[11px] text-neutral-500">{m.hint}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="How this is measured" delay={260}>
        <ul className="space-y-2 text-xs text-neutral-400 leading-relaxed">
          <li>Only <b className="text-neutral-200">closed trades</b> count. Most prop firms also count floating losses on open trades, so keep a buffer.</li>
          <li>Days are grouped by when a trade was <b className="text-neutral-200">opened</b>, in your local time. Firms reset the day at a fixed server time, so the edges can differ.</li>
          <li><b className="text-neutral-200">Static</b> drawdown never moves. <b className="text-neutral-200">Trailing</b> follows your best closed balance. Some firms trail by end-of-day or lock the floor once you reach your starting balance. That is not modelled here.</li>
          <li>Rules vary by firm and plan. Treat this as your safety net, then check your firm's own rules for the final word.</li>
        </ul>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// page
// ---------------------------------------------------------------------------
const TABS = [
  { key: 'today', label: 'Today' },
  { key: 'calls', label: 'Close calls' },
  { key: 'rules', label: 'Rules' },
];

export default function LimitsView({ trades, account, ddMode, onModeChange, onOpenDay, onSetup }) {
  const ins = useMemo(() => (account ? computeLimitInsights(trades, account, ddMode) : null), [trades, account, ddMode]);
  const [tab, setTab] = useState('today');
  const [dir, setDir] = useState('fwd');

  function go(next) {
    if (next === tab) return;
    setDir(TABS.findIndex((t) => t.key === next) > TABS.findIndex((t) => t.key === tab) ? 'fwd' : 'back');
    setTab(next);
  }

  if (!account) {
    return <Empty title="Pick one account" body="Limits are tracked per account. Use the account switcher above to choose a single account." />;
  }
  if (!ins) {
    return <Empty title="Add a starting balance" body="Limits are percentages of your starting balance, so add it first on the Broker page." cta="Open Broker" onClick={onSetup} />;
  }
  if (!hasTrackedRules(account)) {
    return (
      <Empty
        title="Set your rules"
        body="Add a daily loss limit, max drawdown and any other rules. You get live gauges, close-call history and a rules checklist. Works on prop firm and personal accounts."
        cta="Set up rules"
        onClick={onSetup}
      />
    );
  }

  return (
    <div className="grid gap-3">
      <Hero ins={ins} account={account} onModeChange={onModeChange} />
      <Rings ins={ins} />

      <div className="flex gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => go(t.key)}
            className={`flex-shrink-0 whitespace-nowrap rounded-xl border px-4 py-1.5 text-sm font-medium transition-all duration-300 ease-bouncy ${
              tab === t.key
                ? 'border-transparent bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25 scale-[1.03]'
                : 'border-neutral-800/60 bg-white/[0.04] text-neutral-400 hover:text-neutral-100'
            }`}
          >
            {t.label}
            {t.key === 'calls' && ins.callCount > 0 && (
              <span className="ml-2 rounded-full bg-white/20 px-1.5 py-0.5 text-[11px] tabular-nums">{ins.callCount}</span>
            )}
          </button>
        ))}
      </div>

      <div key={tab} className={dir === 'fwd' ? 'pf-in-fwd' : 'pf-in-back'}>
        {tab === 'today' && <TodayPanel ins={ins} onSetup={onSetup} />}
        {tab === 'calls' && <CallsPanel ins={ins} onOpenDay={onOpenDay} />}
        {tab === 'rules' && <RulesPanel ins={ins} onSetup={onSetup} />}
      </div>
    </div>
  );
}
