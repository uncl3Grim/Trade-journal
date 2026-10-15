'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { addDays, format, parseISO } from 'date-fns';
import { supabase } from '../../../../lib/supabaseClient';
import { applyAccountFilter, computeActiveAccountId } from '../../../../lib/accountFilter';
import { rMultiple } from '../../../../lib/tradeMath';
import { formatMoney } from '../../../../lib/format';
import { useDayNote } from '../../../../lib/useDayNote';
import AppShell from '../../../../components/AppShell';
import DailyRecap from '../../../../components/DailyRecap';
import TradeSummaryCard from '../../../../components/TradeSummaryCard';
import { useToast } from '../../../../components/profile/ui';
import DayHero from '../../../../components/day/DayHero';
import TradesTab from '../../../../components/day/TradesTab';
import TradeForm from '../../../../components/day/TradeForm';
import NoteTab from '../../../../components/day/NoteTab';
import GalleryTab from '../../../../components/day/GalleryTab';
import Lightbox from '../../../../components/day/Lightbox';
import { ListGlyph, PlusGlyph, NoteGlyph, ImageGlyph } from '../../../../components/day/DayIcons';
import { emptyForm, isQuickEntryTrade, toLocalInput, tradeImages } from '../../../../components/day/dayShared';

const DEFAULT_ACCOUNT_FILTER = { allSelected: true, selectedIds: [], includeManual: false };
const SWAP_MS = 170;

const TABS = [
  { key: 'trades', label: 'Trades', blurb: 'Everything you took today.', icon: ListGlyph },
  { key: 'log', label: 'Log trade', blurb: 'Add a trade, or edit one you already logged.', icon: PlusGlyph },
  { key: 'note', label: 'Daily note', blurb: 'How the day felt, and what you learned.', icon: NoteGlyph },
  { key: 'gallery', label: 'Screenshots', blurb: 'Every chart screenshot from today.', icon: ImageGlyph },
];

export default function DayEditPage() {
  const router = useRouter();
  const params = useParams();
  const [notify, toastNode] = useToast();

  const [user, setUser] = useState(null);
  const [trades, setTrades] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [defaultRiskAmount, setDefaultRiskAmount] = useState(null);
  const [accountFilter, setAccountFilter] = useState(DEFAULT_ACCOUNT_FILTER);
  const [loadedFor, setLoadedFor] = useState(null); // which date the trades on screen belong to

  const [showDailyRecap, setShowDailyRecap] = useState(false);
  const [viewingTrade, setViewingTrade] = useState(null);
  const [lightbox, setLightbox] = useState(null); // { items, index }

  // trade form (lives here so a half-filled form survives switching tabs)
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [quickMode, setQuickMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const dateStr = params.date;
  const date = dateStr ? parseISO(dateStr) : null;
  const validDate = !!date && !isNaN(date.getTime());

  const activeAccountId = computeActiveAccountId(accountFilter);
  const dayNote = useDayNote({ userId: user?.id, dateStr: validDate ? dateStr : null, accountId: activeAccountId, notify });

  // ---------- auth + reference data ----------
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tj_account_filter');
      if (saved) setAccountFilter(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/login');
      else setUser(session.user);
    });
  }, [router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('broker_connections')
      .select('id, broker_server, broker_type, mt5_login, starting_balance, daily_loss_limit_pct, max_loss_limit_pct, profit_target_pct, status, last_synced_at')
      .order('created_at', { ascending: true })
      .then(({ data }) => setAccounts(data || []));
    supabase
      .from('strategies')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }) => setStrategies(data || []));
    supabase
      .from('user_settings')
      .select('default_risk_amount')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setDefaultRiskAmount(data?.default_risk_amount ?? null));
  }, [user]);

  // ---------- trades for this day ----------
  const loadTrades = useCallback(async () => {
    if (!user || !validDate) return;
    // The calendar buckets trades by the viewer's LOCAL day, so query the
    // same local-day window as real instants. A bare "YYYY-MM-DDT00:00:00"
    // string is read by Postgres as UTC and drops/misplaces trades near midnight.
    const dayStart = parseISO(dateStr); // local midnight
    const nextDayStart = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + 1);
    let query = supabase
      .from('trades')
      .select('*')
      .gte('entry_time', dayStart.toISOString())
      .lt('entry_time', nextDayStart.toISOString())
      .order('entry_time', { ascending: true });
    query = applyAccountFilter(query, accountFilter);
    const { data, error } = await query;
    if (!error) setTrades(data || []);
    setLoadedFor(dateStr);
  }, [user, dateStr, validDate, accountFilter]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  // ---------- stats + screenshots ----------
  const stats = useMemo(() => {
    const net = trades.reduce((s, t) => s + Number(t.pnl || 0), 0);
    const wins = trades.filter((t) => Number(t.pnl) > 0).length;
    const decided = trades.filter((t) => Number(t.pnl) !== 0).length;
    const rVals = trades.map((t) => rMultiple(t, defaultRiskAmount)).filter((r) => r !== null);
    return {
      count: trades.length,
      net,
      winRate: decided ? Math.round((wins / decided) * 100) : null,
      totalR: rVals.length ? rVals.reduce((a, b) => a + b, 0) : null,
    };
  }, [trades, defaultRiskAmount]);

  const galleryItems = useMemo(
    () =>
      trades.flatMap((t) =>
        tradeImages(t).map((url) => ({
          url,
          caption: `${t.symbol} ${t.direction}`,
          sub: formatMoney(Number(t.pnl || 0)),
          pnl: Number(t.pnl || 0),
        }))
      ),
    [trades]
  );

  // ---------- tabs (same direction-aware swap as the Profile page) ----------
  const [shown, setShown] = useState('trades');
  const [phase, setPhase] = useState('in');
  const [dir, setDir] = useState('fwd');
  const swapTimer = useRef();

  const select = useCallback(
    (key) => {
      if (key === shown) return;
      const from = TABS.findIndex((t) => t.key === shown);
      const to = TABS.findIndex((t) => t.key === key);
      setDir(to > from ? 'fwd' : 'back');
      setPhase('out');
      clearTimeout(swapTimer.current);
      swapTimer.current = setTimeout(() => {
        setShown(key);
        setPhase('in');
        try {
          history.replaceState(null, '', `#${key}`);
        } catch {}
      }, SWAP_MS);
    },
    [shown]
  );

  useEffect(() => () => clearTimeout(swapTimer.current), []);

  // Land on the right tab once a day's trades arrive: an empty day opens straight on "Log trade".
  const settledFor = useRef(null);
  useEffect(() => {
    if (loadedFor !== dateStr || settledFor.current === dateStr) return;
    const first = settledFor.current === null;
    settledFor.current = dateStr;
    const hash = first ? window.location.hash.replace('#', '') : '';
    if (TABS.some((t) => t.key === hash)) {
      setShown(hash);
      return;
    }
    setShown((cur) => (trades.length === 0 ? 'log' : cur === 'log' && !editingId ? 'trades' : cur));
  }, [loadedFor, dateStr, trades.length, editingId]);

  const navRef = useRef(null);
  const btnRefs = useRef({});
  const [pill, setPill] = useState(null);
  const measure = useCallback(() => {
    const el = btnRefs.current[shown];
    if (!el) return;
    setPill({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight });
  }, [shown]);
  // re-measure when badge counts / the "Edit trade" label change a tab's width
  useLayoutEffect(measure, [measure, stats.count, galleryItems.length, editingId]);
  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  useEffect(() => {
    const nav = navRef.current;
    const el = btnRefs.current[shown];
    if (!nav || !el || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollTo({ left: el.offsetLeft - (nav.clientWidth - el.offsetWidth) / 2, behavior: 'smooth' });
  }, [shown]);

  // ---------- trade form ----------
  const resetForm = useCallback(() => {
    setEditingId(null);
    setQuickMode(false);
    setFormError('');
    setForm({ ...emptyForm, entry_time: `${dateStr}T09:30`, account_id: activeAccountId || '' });
  }, [dateStr, activeAccountId]);

  // a fresh blank form whenever the day or selected account changes
  useEffect(() => {
    resetForm();
  }, [resetForm]);

  function startEdit(trade) {
    const quick = isQuickEntryTrade(trade);
    let outcome = 'win';
    let rMultipleVal = '';
    if (quick) {
      const risk = Number(trade.risk_amount);
      const pnlNum = Number(trade.pnl);
      outcome = pnlNum > 0 ? 'win' : pnlNum < 0 ? 'loss' : 'breakeven';
      rMultipleVal = risk ? Math.abs(pnlNum / risk).toFixed(2) : '';
    }
    setEditingId(trade.id);
    setQuickMode(quick);
    setFormError('');
    setForm({
      symbol: trade.symbol,
      direction: trade.direction,
      entry_price: trade.entry_price,
      exit_price: trade.exit_price ?? '',
      size: trade.size,
      entry_time: toLocalInput(trade.entry_time),
      exit_time: toLocalInput(trade.exit_time),
      pnl: trade.pnl,
      stop_loss: trade.stop_loss ?? '',
      take_profit: trade.take_profit ?? '',
      risk_amount: trade.risk_amount ?? '',
      tags: Array.isArray(trade.tags) ? trade.tags.join(', ') : '',
      emotion: trade.emotion ?? '',
      notes: trade.notes ?? '',
      account_id: trade.broker_connection_id ?? '',
      rule_adherence: trade.rule_adherence ?? '',
      setup_type: trade.setup_type ?? '',
      strategy_id: trade.strategy_id ?? '',
      outcome,
      r_multiple: rMultipleVal,
    });
    select('log');
  }

  function cancelEdit() {
    resetForm();
    select('trades');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    const tagsArray = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    let entryPrice, exitPrice, size, pnl, riskAmount, stopLoss, takeProfit;

    if (quickMode) {
      const riskUsed = form.risk_amount !== '' ? parseFloat(form.risk_amount) : defaultRiskAmount;
      if (form.outcome !== 'breakeven' && (!riskUsed || isNaN(riskUsed))) {
        const msg = 'Enter a risk amount (or set a default in Profile → Trading) so P&L can be calculated.';
        setFormError(msg);
        notify(msg, 'error');
        return;
      }
      const rVal = form.outcome === 'breakeven' ? 0 : parseFloat(form.r_multiple) || 0;
      const sign = form.outcome === 'win' ? 1 : form.outcome === 'loss' ? -1 : 0;

      entryPrice = 0; // not tracked in quick mode: P&L is driven by R × risk, not price
      // 0, not null: the rest of the app treats exit_price !== null as "closed".
      // null here would silently drop every quick-entry trade from the stats.
      exitPrice = 0;
      size = form.size === '' ? 0 : parseFloat(form.size);
      stopLoss = null;
      takeProfit = null;
      riskAmount = riskUsed || null;
      pnl = sign * rVal * (riskUsed || 0);
    } else {
      entryPrice = parseFloat(form.entry_price);
      exitPrice = form.exit_price === '' ? null : parseFloat(form.exit_price);
      size = parseFloat(form.size);
      stopLoss = form.stop_loss === '' ? null : parseFloat(form.stop_loss);
      takeProfit = form.take_profit === '' ? null : parseFloat(form.take_profit);
      riskAmount = form.risk_amount === '' ? null : parseFloat(form.risk_amount);
      pnl = form.pnl === '' ? 0 : parseFloat(form.pnl);
    }

    setSaving(true);

    const payload = {
      user_id: user.id,
      symbol: form.symbol.toUpperCase(),
      direction: form.direction,
      entry_price: entryPrice,
      exit_price: exitPrice,
      size,
      entry_time: form.entry_time ? new Date(form.entry_time).toISOString() : null,
      exit_time: form.exit_time ? new Date(form.exit_time).toISOString() : null,
      pnl,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      risk_amount: riskAmount,
      tags: tagsArray.length ? tagsArray : null,
      emotion: form.emotion || null,
      notes: form.notes,
      broker_connection_id: form.account_id || null,
      rule_adherence: form.rule_adherence || null,
      setup_type: form.setup_type || null,
      strategy_id: form.strategy_id || null,
      // Only stamp `source` for quick-entry saves so editing a CSV-imported
      // trade doesn't overwrite its existing 'csv_import' tag.
      ...(quickMode ? { source: 'quick_entry' } : {}),
    };

    const res = editingId
      ? await supabase.from('trades').update(payload).eq('id', editingId)
      : await supabase.from('trades').insert(payload);

    setSaving(false);
    if (res.error) {
      setFormError(res.error.message);
      notify(res.error.message, 'error');
      return;
    }

    notify(editingId ? 'Trade updated' : 'Trade added');
    resetForm();
    await loadTrades();
    select('trades');
  }

  // ---------- render ----------
  function renderPanel() {
    switch (shown) {
      case 'trades':
        return (
          <TradesTab
            trades={trades}
            userId={user.id}
            defaultRiskAmount={defaultRiskAmount}
            notify={notify}
            onChanged={loadTrades}
            onEdit={startEdit}
            onView={setViewingTrade}
            onOpenImages={(items, index) => setLightbox({ items, index })}
            onAdd={() => select('log')}
          />
        );
      case 'log':
        return (
          <TradeForm
            form={form}
            setForm={setForm}
            editingId={editingId}
            quickMode={quickMode}
            setQuickMode={setQuickMode}
            accounts={accounts}
            strategies={strategies}
            defaultRiskAmount={defaultRiskAmount}
            saving={saving}
            error={formError}
            onSubmit={handleSubmit}
            onCancel={cancelEdit}
          />
        );
      case 'note':
        return <NoteTab dayNote={dayNote} hasAccount={!!activeAccountId} />;
      case 'gallery':
        return <GalleryTab items={galleryItems} onOpen={(items, index) => setLightbox({ items, index })} onGoTrades={() => select('trades')} />;
      default:
        return null;
    }
  }

  if (!validDate) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-4 py-6 text-sm text-neutral-400">Invalid date.</div>
      </AppShell>
    );
  }

  const active = TABS.find((t) => t.key === shown);
  const badge = { trades: stats.count, gallery: galleryItems.length };
  const goDay = (n) => router.push(`/journal/day/${format(addDays(date, n), 'yyyy-MM-dd')}`);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <DayHero
          date={date}
          stats={stats}
          onPrev={() => goDay(-1)}
          onNext={() => goDay(1)}
          onRecap={() => setShowDailyRecap(true)}
          onBack={() => router.push('/journal')}
        />

        <div className="md:grid md:grid-cols-[220px_1fr] md:gap-8">
          <nav
            ref={navRef}
            aria-label="Day sections"
            className="relative flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 mb-5 md:mb-0 md:sticky md:top-6 md:self-start"
          >
            {pill && (
              <span
                className="pf-pill-bg absolute rounded-xl bg-white/10 border border-white/10 pointer-events-none"
                style={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height }}
              />
            )}
            {TABS.map((t) => {
              const Icon = t.icon;
              const on = shown === t.key;
              const count = badge[t.key];
              return (
                <button
                  key={t.key}
                  ref={(el) => (btnRefs.current[t.key] = el)}
                  onClick={() => select(t.key)}
                  aria-current={on ? 'page' : undefined}
                  className={`pf-navitem relative z-10 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm whitespace-nowrap flex-shrink-0 ${
                    on ? 'text-neutral-50' : 'text-neutral-500 hover:text-neutral-200'
                  }`}
                >
                  <Icon size={18} className={`pf-navicon ${on ? 'is-on' : ''}`} />
                  {t.key === 'log' && editingId ? 'Edit trade' : t.label}
                  {count > 0 && (
                    <span className="ml-auto text-[11px] tabular-nums rounded-full bg-white/10 border border-white/10 px-1.5 py-0.5 text-neutral-300">{count}</span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="min-w-0">
            <div className={phase === 'out' ? `pf-out-${dir}` : `pf-in-${dir}`}>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-neutral-100">{shown === 'log' && editingId ? 'Edit trade' : active.label}</h2>
                <p className="text-sm text-neutral-500">{active.blurb}</p>
              </div>
              {user && loadedFor === dateStr ? renderPanel() : <div className="skeleton h-64 !bg-white/5" />}
            </div>
          </div>
        </div>
      </div>

      {toastNode}

      <TradeSummaryCard trade={viewingTrade} defaultRiskAmount={defaultRiskAmount} onClose={() => setViewingTrade(null)} />

      {lightbox && (
        <Lightbox
          items={lightbox.items}
          index={Math.min(lightbox.index, lightbox.items.length - 1)}
          onIndex={(i) => setLightbox((l) => ({ ...l, index: i }))}
          onClose={() => setLightbox(null)}
        />
      )}

      {showDailyRecap && (
        <DailyRecap trades={trades} date={date} defaultRiskAmount={defaultRiskAmount} onClose={() => setShowDailyRecap(false)} userId={user?.id} />
      )}
    </AppShell>
  );
}
