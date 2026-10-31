'use client';

import { format } from 'date-fns';
import { computeAccountStats, formatHold } from '../lib/accountStats';
import { formatMoney } from '../lib/format';

const plain = (v) =>
  v === null || v === undefined || isNaN(v)
    ? '—'
    : `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const tone = (v) => (v > 0 ? 'text-emerald-400' : v < 0 ? 'text-rose-400' : 'text-neutral-100');
const pct = (v, d = 0) => (v === null || v === undefined || isNaN(v) ? '—' : `${v.toFixed(d)}%`);
const dayLabel = (d) => (d ? format(new Date(`${d.date}T00:00:00`), 'MMM d') : '');

const card = 'relative bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-4 sm:p-5 overflow-hidden';

function PairCard({ title, pair, emptyText }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-neutral-800/60 p-3.5 min-w-0">
      <div className="text-[11px] text-neutral-500">{title}</div>
      {pair ? (
        <>
          <div className="font-heading text-lg font-semibold text-neutral-50 mt-0.5 truncate">{pair.symbol}</div>
          <div className={`text-sm font-semibold tabular-nums ${tone(pair.pnl)}`}>{formatMoney(pair.pnl)}</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">
            {pair.n} trade{pair.n === 1 ? '' : 's'} · {pct(pair.winRate)} win
          </div>
        </>
      ) : (
        <div className="text-xs text-neutral-500 mt-2 leading-snug">{emptyText}</div>
      )}
    </div>
  );
}

function Tile({ label, value, sub, color = 'text-neutral-50' }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-neutral-800/60 px-3 py-2.5 min-w-0">
      <div className="text-[11px] text-neutral-500">{label}</div>
      <div className={`font-heading text-base font-semibold mt-0.5 tabular-nums truncate ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-neutral-500 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function BalanceCard({ account, stats, startingBalance }) {
  const hasBroker = account?.broker_type === 'myfxbook' && account.broker_balance !== null && account.broker_balance !== undefined;
  const calc = stats.calcBalance;

  if (!hasBroker) {
    return (
      <div className={card}>
        <div className="text-[11px] text-neutral-500">{calc !== null ? 'Journal balance' : 'Net P&L'}</div>
        <div className={`font-heading text-2xl font-bold tabular-nums mt-0.5 ${tone(calc !== null ? calc - startingBalance : stats.totalPnl)}`}>
          {calc !== null ? plain(calc) : formatMoney(stats.totalPnl)}
        </div>
        {calc !== null && (
          <div className="text-xs text-neutral-500 mt-1 tabular-nums">
            Started at {plain(Number(startingBalance))} · {formatMoney(stats.totalPnl)} ({pct(stats.returnPct, 1)})
          </div>
        )}
        {account?.broker_type === 'myfxbook' && (
          <div className="text-[11px] text-neutral-500 mt-2">Sync this account to compare with MyFXBook&apos;s balance.</div>
        )}
      </div>
    );
  }

  const broker = Number(account.broker_balance);
  const diff = calc !== null ? broker - calc : null;
  const ok = diff !== null && Math.abs(diff) < 1;
  const netDeposits = (Number(account.broker_deposits) || 0) - (Number(account.broker_withdrawals) || 0);
  const startGap = calc !== null ? netDeposits - Number(startingBalance) : null;
  const tradeGap = calc !== null ? broker - netDeposits - stats.totalPnl : null;

  return (
    <div className={card}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] text-neutral-500">MyFXBook balance</div>
          <div className="font-heading text-2xl font-bold text-neutral-50 tabular-nums mt-0.5">{plain(broker)}</div>
          {account.broker_equity !== null && account.broker_equity !== undefined && (
            <div className="text-[11px] text-neutral-500 mt-0.5 tabular-nums">Equity {plain(Number(account.broker_equity))}</div>
          )}
        </div>
        {diff !== null && (
          <span
            className={`flex-shrink-0 text-[11px] font-medium rounded-full px-2.5 py-1 border ${
              ok ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' : 'text-amber-300 border-amber-500/40 bg-amber-500/10'
            }`}
          >
            {ok ? 'Tallies' : `Off by ${plain(Math.abs(diff))}`}
          </span>
        )}
      </div>

      {calc !== null && (
        <div className="mt-3 rounded-xl bg-white/[0.03] border border-neutral-800/60 px-3 py-2.5 text-xs space-y-1">
          <Row label="Journal balance" value={plain(calc)} />
          <Row label="Starting balance" value={plain(Number(startingBalance))} />
          <Row label="Net trade results" value={formatMoney(stats.totalPnl)} />
        </div>
      )}

      {diff !== null && !ok && (
        <div className="mt-3 text-xs text-neutral-400 leading-relaxed space-y-1.5">
          <div className="text-neutral-300 font-medium">Why it may be off</div>
          {Math.abs(startGap) >= 1 && (
            <p>
              Your starting balance is {plain(Number(startingBalance))}, but MyFXBook shows net deposits of {plain(netDeposits)} ({plain(Math.abs(startGap))} {startGap > 0 ? 'more' : 'less'}). Deposits or withdrawals made later, or a different starting figure, cause this.
            </p>
          )}
          {Math.abs(tradeGap) >= 1 && (
            <p>
              Trade results differ by {plain(Math.abs(tradeGap))}. Usually a trade not synced yet, or a fee not captured. Press Sync, then check again.
            </p>
          )}
        </div>
      )}

      {account.broker_balance_at && (
        <div className="text-[11px] text-neutral-600 mt-3">Synced {format(new Date(account.broker_balance_at), 'MMM d, h:mm a')}</div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-neutral-500">{label}</span>
      <span className="text-neutral-200 tabular-nums">{value}</span>
    </div>
  );
}

export default function AccountSnapshot({ trades, account, startingBalance }) {
  const stats = computeAccountStats(trades, startingBalance);
  if (!stats) return null;

  return (
    <div className="mb-6 space-y-3">
      <BalanceCard account={account} stats={stats} startingBalance={startingBalance} />

      <div className="grid grid-cols-2 gap-3">
        <PairCard title="Best pair" pair={stats.bestPair} />
        <PairCard title="Worst pair" pair={stats.worstPair} emptyText="Only one pair traded so far." />
      </div>
      {stats.mostTraded && stats.pairCount > 1 && stats.mostTraded.symbol !== stats.bestPair?.symbol && (
        <div className="text-xs text-neutral-500 px-1">
          Most traded: <span className="text-neutral-300 font-medium">{stats.mostTraded.symbol}</span> ({stats.mostTraded.n} trades, {formatMoney(stats.mostTraded.pnl)})
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <Tile label="Net P&L" value={formatMoney(stats.totalPnl)} color={tone(stats.totalPnl)} sub={stats.returnPct !== null ? `${pct(stats.returnPct, 1)} return` : `${stats.n} trades`} />
        <Tile label="Win rate" value={pct(stats.winRate, 1)} sub={`${stats.wins}W · ${stats.losses}L`} />
        <Tile label="Profit factor" value={stats.profitFactor === null ? '—' : stats.profitFactor.toFixed(2)} />
        <Tile label="Expectancy" value={formatMoney(stats.expectancy)} color={tone(stats.expectancy)} sub="per trade" />
        <Tile label="Avg win / loss" value={`${plain(stats.avgWin)} / ${plain(stats.avgLoss)}`} />
        <Tile label="Best / worst trade" value={`${formatMoney(stats.bestTrade)} / ${formatMoney(stats.worstTrade)}`} />
        <Tile label="Best day" value={formatMoney(stats.bestDay?.pnl)} color={tone(stats.bestDay?.pnl)} sub={dayLabel(stats.bestDay)} />
        <Tile label="Worst day" value={formatMoney(stats.worstDay?.pnl)} color={tone(stats.worstDay?.pnl)} sub={dayLabel(stats.worstDay)} />
        <Tile label="Streaks" value={`${stats.maxWinStreak}W / ${stats.maxLossStreak}L`} sub="longest run" />
        <Tile label="Long" value={formatMoney(stats.long.pnl)} color={tone(stats.long.pnl)} sub={`${stats.long.n} trades · ${pct(stats.long.winRate)} win`} />
        <Tile label="Short" value={formatMoney(stats.short.pnl)} color={tone(stats.short.pnl)} sub={`${stats.short.n} trades · ${pct(stats.short.winRate)} win`} />
        <Tile label="Avg hold" value={formatHold(stats.avgHoldMs)} sub={`${stats.tradingDays} trading days`} />
        {stats.hasFees && <Tile label="Fees paid" value={formatMoney(stats.fees)} color={tone(stats.fees)} sub="commission + swap" />}
      </div>
    </div>
  );
}
