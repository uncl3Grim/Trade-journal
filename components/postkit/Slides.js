'use client';

import { forwardRef } from 'react';
import { shortSymbol } from '../../lib/postKit';

// Every slide is designed at 360 x 640 (9:16). Exporting at 3x gives 1080 x 1920 (HD),
// 6x gives 2160 x 3840 (4K). Important content stays in the upper ~80% so TikTok's
// caption and buttons never cover it.

const C = { green: '#34d399', red: '#fb7185', indigo: '#818cf8', text: '#ffffff', muted: '#94a3b8', faint: '#64748b', card: 'rgba(255,255,255,0.06)', line: 'rgba(255,255,255,0.10)' };
const HEAD = { fontFamily: 'var(--font-heading), system-ui, sans-serif' };
const tone = (v) => (v > 0 ? C.green : v < 0 ? C.red : C.text);

const Frame = forwardRef(function Frame({ d, s, children }, ref) {
  return (
    <div
      ref={ref}
      style={{
        width: 360,
        height: 640,
        position: 'relative',
        overflow: 'hidden',
        color: C.text,
        background: 'linear-gradient(180deg,#0b0d1a 0%,#05060c 100%)',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 22%, rgba(99,102,241,0.22), rgba(99,102,241,0) 62%)' }} />
      <div style={{ position: 'relative', padding: '30px 26px 0 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: C.muted, fontWeight: 600, textTransform: 'uppercase' }}>{s.series}</div>
        <div style={{ ...HEAD, fontSize: 14, fontWeight: 700, color: C.indigo }}>Day {d.dayN}</div>
      </div>
      <div style={{ position: 'absolute', top: 64, bottom: 130, left: 26, right: 26, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>{children}</div>
      <div style={{ position: 'absolute', left: 26, right: 26, bottom: 18, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.faint }}>
        <span>{s.handle ? `@${s.handle.replace(/^@/, '')}` : ''}</span>
        <span>Not financial advice</span>
      </div>
    </div>
  );
});

const Label = ({ children }) => <div style={{ fontSize: 12, color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600 }}>{children}</div>;

function Tile({ label, value, color }) {
  return (
    <div style={{ flex: 1, background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: '10px 10px 11px' }}>
      <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</div>
      <div style={{ ...HEAD, fontSize: 20, fontWeight: 700, marginTop: 3, color: color || C.text }}>{value}</div>
    </div>
  );
}

export const SummarySlide = forwardRef(function SummarySlide({ d, f, s }, ref) {
  const noTrades = d.n === 0;
  const word = d.scope === 'day' ? 'day' : 'week';
  const verdict = noTrades ? `No trades this ${word}` : d.rangePnl > 0 ? `Green ${word}` : d.rangePnl < 0 ? `Red ${word}` : `Flat ${word}`;
  const balance = f.showMoney && d.hasStart ? `${f.plainMoney(d.start)}  →  ${f.plainMoney(d.balanceNow)}` : d.totalPct !== null ? `${f.pct(d.totalPct)} since day 1` : null;
  return (
    <Frame ref={ref} d={d} s={s}>
      <div>
        <Label>{d.scope === 'day' ? 'Today' : 'This week'} · {d.periodLabel}</Label>
        <div style={{ ...HEAD, fontSize: noTrades ? 40 : 58, lineHeight: 1.05, fontWeight: 800, marginTop: 16, color: noTrades ? C.text : tone(d.rangePnl) }}>
          {noTrades ? '—' : f.range(d.rangePnl)}
        </div>
        <div style={{ marginTop: 10, fontSize: 16, color: C.text, fontWeight: 600 }}>{verdict}</div>
        {balance && <div style={{ marginTop: 8, fontSize: 14, color: C.muted }}>{balance}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 40 }}>
        <Tile label="Win rate" value={d.winRate === null ? '—' : `${d.winRate}%`} />
        <Tile label="Trades" value={d.n} />
        <Tile label={d.process !== null ? 'Process' : 'Days'} value={d.process !== null ? `${d.process}%` : d.tradingDays} color={d.process !== null ? (d.process >= 80 ? C.green : '#fbbf24') : undefined} />
      </div>
    </Frame>
  );
});

export const EquitySlide = forwardRef(function EquitySlide({ d, f, s }, ref) {
  const W = 308;
  const H = 250;
  const pts = d.curve;
  const vs = pts.map((p) => p.v);
  const min = Math.min(...vs, 0);
  const max = Math.max(...vs, 0);
  const span = max - min || 1;
  const x = (i) => (pts.length === 1 ? 0 : (i / (pts.length - 1)) * W);
  const y = (v) => 10 + (1 - (v - min) / span) * (H - 20);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  const last = pts[pts.length - 1];
  const up = last.v >= 0;
  const color = up ? C.green : C.red;
  const big = f.showMoney && d.hasStart ? f.plainMoney(d.balanceNow) : d.totalPct !== null ? f.pct(d.totalPct) : f.money(d.totalPnl);
  return (
    <Frame ref={ref} d={d} s={s}>
      <div>
        <Label>Equity curve · since day 1</Label>
        <div style={{ ...HEAD, fontSize: 46, fontWeight: 800, marginTop: 12, color }}>{big}</div>
        <div style={{ marginTop: 4, fontSize: 14, color: C.muted }}>
          {f.showMoney && d.hasStart ? `${f.total(d.totalPnl)} from ${f.plainMoney(d.start)}` : `${d.n === 0 && pts.length === 1 ? 'No trades yet' : `${pts.length - 1} trades`}`}
        </div>
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ marginTop: 24, display: 'block' }}>
        <defs>
          <linearGradient id="eqfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.30" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.18)" strokeDasharray="4 5" />
        <path d={area} fill="url(#eqfill)" />
        <path d={line} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(pts.length - 1)} cy={y(last.v)} r="5" fill={color} />
      </svg>
    </Frame>
  );
});

function TradeCard({ title, t, f, d, color }) {
  const sym = shortSymbol(t?.symbol);
  const date = t ? new Date(t.exit_time || t.entry_time) : null;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: '16px 16px 18px', marginTop: 14 }}>
      <Label>{title}</Label>
      {t ? (
        <>
          <div style={{ ...HEAD, fontSize: 36, fontWeight: 800, marginTop: 10, color }}>{f.range(Number(t.pnl) || 0)}</div>
          <div style={{ marginTop: 6, fontSize: 14, color: C.text, fontWeight: 600 }}>
            {sym} <span style={{ color: C.muted, fontWeight: 500 }}>· {t.direction}</span>
          </div>
          <div style={{ marginTop: 2, fontSize: 12, color: C.muted }}>{date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</div>
        </>
      ) : (
        <div style={{ marginTop: 12, fontSize: 14, color: C.muted }}>Not enough trades</div>
      )}
    </div>
  );
}

export const BestWorstSlide = forwardRef(function BestWorstSlide({ d, f, s }, ref) {
  return (
    <Frame ref={ref} d={d} s={s}>
      <div>
        <Label>{d.scope === 'day' ? 'Today' : 'This week'}'s trades</Label>
        <TradeCard title="Best trade" t={d.best} f={f} d={d} color={C.green} />
        <TradeCard title="Worst trade" t={d.worst} f={f} d={d} color={C.red} />
      </div>
    </Frame>
  );
});

export const ProcessSlide = forwardRef(function ProcessSlide({ d, f, s }, ref) {
  const p = d.process;
  const R = 66;
  const CIRC = 2 * Math.PI * R;
  const ringColor = p === null ? C.faint : p >= 80 ? C.green : p >= 60 ? '#fbbf24' : C.red;
  const green = d.rangePnl > 0;
  const msg =
    p === null
      ? 'Log rule adherence on your trades to unlock this.'
      : green && p < 80
      ? "Profit isn't proof of process."
      : green
      ? 'Green and clean.'
      : p >= 80
      ? 'Red, but clean. That still counts.'
      : 'Red and sloppy. Fix the process first.';
  return (
    <Frame ref={ref} d={d} s={s}>
      <div>
        <Label>Process over P&amp;L · {d.periodLabel}</Label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 26, position: 'relative' }}>
        <svg width="172" height="172" viewBox="0 0 172 172">
          <circle cx="86" cy="86" r={R} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="14" />
          {p !== null && (
            <circle cx="86" cy="86" r={R} fill="none" stroke={ringColor} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${(p / 100) * CIRC} ${CIRC}`} transform="rotate(-90 86 86)" />
          )}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ ...HEAD, fontSize: 44, fontWeight: 800, color: ringColor }}>{p === null ? '—' : `${p}%`}</div>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1, textTransform: 'uppercase' }}>process</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>{msg}</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>
          {d.ratedCount > 0 ? `Plan followed on ${d.followed} of ${d.ratedCount} rated trade${d.ratedCount === 1 ? '' : 's'}` : 'No rated trades yet'}
        </div>
        {d.n > 0 && (
          <div style={{ display: 'inline-block', marginTop: 14, padding: '6px 12px', borderRadius: 999, background: C.card, border: `1px solid ${C.line}`, fontSize: 13 }}>
            P&amp;L <span style={{ color: tone(d.rangePnl), fontWeight: 700 }}>{f.range(d.rangePnl)}</span>
          </div>
        )}
      </div>
    </Frame>
  );
});

export const MistakesSlide = forwardRef(function MistakesSlide({ d, f, s }, ref) {
  const maxCost = Math.max(...d.mistakes.map((m) => m.cost), 1);
  return (
    <Frame ref={ref} d={d} s={s}>
      <div>
        <Label>Mistakes · {d.periodLabel}</Label>
        {d.mistakes.length > 0 ? (
          <div style={{ marginTop: 16 }}>
            {d.mistakes.map((m) => (
              <div key={m.key} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: '13px 14px', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {m.label} <span style={{ color: C.muted, fontWeight: 500, fontSize: 13 }}>×{m.count}</span>
                  </div>
                  <div style={{ ...HEAD, fontSize: 18, fontWeight: 800, color: m.cost > 0 ? C.red : C.muted }}>{m.cost > 0 ? f.range(-m.cost) : f.range(0)}</div>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', marginTop: 10 }}>
                  <div style={{ height: 6, borderRadius: 3, width: `${Math.max(6, (m.cost / maxCost) * 100)}%`, background: C.red }} />
                </div>
              </div>
            ))}
            <div style={{ fontSize: 13, color: C.muted, marginTop: 14 }}>
              {d.mistakeFree} of {d.n} trade{d.n === 1 ? '' : 's'} were mistake-free
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <div style={{ ...HEAD, fontSize: 40, fontWeight: 800, color: d.ratedCount > 0 ? C.green : C.muted }}>{d.ratedCount > 0 ? 'Clean' : '—'}</div>
            <div style={{ marginTop: 12, fontSize: 15, fontWeight: 600 }}>{d.ratedCount > 0 ? 'No mistakes tagged' : 'Tag mistakes on your trades'}</div>
            <div style={{ marginTop: 6, fontSize: 13, color: C.muted }}>{d.ratedCount > 0 ? `${d.ratedCount} trades rated this period` : 'Mark rule slips in the journal to see their cost here.'}</div>
          </div>
        )}
      </div>
    </Frame>
  );
});

export const SLIDE_COMPONENTS = {
  summary: SummarySlide,
  equity: EquitySlide,
  bestworst: BestWorstSlide,
  process: ProcessSlide,
  mistakes: MistakesSlide,
};
