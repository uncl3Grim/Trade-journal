'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabaseClient';
import AppShell from '../../components/AppShell';
import BrokerConnect from '../../components/BrokerConnect';
import ShareReport from '../../components/ShareReport';
import DrawdownLimitSelect from '../../components/DrawdownLimitSelect';
import { useToasts, ToastStack } from '../../components/Notice';
import { Collapse, Switch, fieldClass, primaryBtn, ghostBtn, dangerBtn } from '../../components/broker/ui';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const isLinked = (c) => c.broker_type !== 'csv' && c.broker_type !== 'manual';

const TYPE_META = {
  myfxbook: { label: 'MyFXBook', grad: 'from-sky-500 to-indigo-500' },
  csv: { label: 'CSV import', grad: 'from-cyan-500 to-sky-500' },
  manual: { label: 'Manual', grad: 'from-emerald-500 to-teal-500' },
};
const typeMeta = (c) => TYPE_META[c.broker_type] || { label: 'MT5', grad: 'from-indigo-500 to-violet-500' };

function statusInfo(c) {
  if (c.broker_type === 'csv') return { text: 'Imported from CSV', dot: 'bg-neutral-500' };
  if (c.broker_type === 'manual') return { text: 'Logged by hand', dot: 'bg-neutral-500' };
  if (c.status === 'connected') return { text: 'Connected', dot: 'bg-emerald-400' };
  if (c.status === 'deploying') return { text: 'Coming online', dot: 'bg-amber-400 animate-pulse' };
  return { text: c.status || 'Unknown', dot: 'bg-neutral-500' };
}

const money = (n) => `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function Chevron({ open }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 bk-chevron ${open ? 'is-open' : ''}`} aria-hidden="true">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  );
}

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

// ---------------------------------------------------------------------------
// Account detail sections
// ---------------------------------------------------------------------------
function SyncSection({ c, syncing, onSync }) {
  return (
    <Section
      title="Sync trades"
      hint={
        c.last_synced_at
          ? `Last synced ${format(new Date(c.last_synced_at), 'MMM d, h:mm a')}. Sync pulls in any trades closed since then.`
          : "Not synced yet. Sync pulls this account's trade history into your journal."
      }
    >
      <button onClick={onSync} disabled={syncing} className={`${primaryBtn} inline-flex items-center gap-2`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-4 h-4 ${syncing ? 'bk-spin' : ''}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M5.6 15A8 8 0 0019 12M18.4 9A8 8 0 005 12" />
        </svg>
        {syncing ? 'Syncing…' : 'Sync now'}
      </button>
    </Section>
  );
}

function NameSection({ c, onSaved, notify }) {
  const [value, setValue] = useState(c.broker_server);
  const [saving, setSaving] = useState(false);
  const dirty = value.trim() && value.trim() !== c.broker_server;

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('broker_connections').update({ broker_server: value.trim() }).eq('id', c.id);
    setSaving(false);
    if (error) return notify('error', `Couldn't rename: ${error.message}`);
    notify('success', 'Account renamed.');
    onSaved();
  }

  return (
    <Section title="Account name" hint="Shown everywhere you pick or filter accounts.">
      <div className="flex gap-2">
        <input aria-label="Account name" value={value} onChange={(e) => setValue(e.target.value)} className={`flex-1 ${fieldClass}`} />
        <button onClick={save} disabled={saving || !dirty} className={ghostBtn}>{saving ? 'Saving…' : 'Save name'}</button>
      </div>
    </Section>
  );
}

function BalanceSection({ c, onSaved, notify }) {
  const [value, setValue] = useState(c.starting_balance ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from('broker_connections')
      .update({ starting_balance: value === '' ? null : parseFloat(value) })
      .eq('id', c.id);
    setSaving(false);
    if (error) return notify('error', `Couldn't save balance: ${error.message}`);
    notify('success', 'Starting balance saved.');
    onSaved();
  }

  return (
    <Section title="Starting balance" hint="What the account held before your first trade. Used to work out balance and drawdown. Leave blank to skip.">
      <div className="flex gap-2">
        <input aria-label="Starting balance" type="number" step="any" placeholder="e.g. 10000" value={value} onChange={(e) => setValue(e.target.value)} className={`flex-1 ${fieldClass}`} />
        <button onClick={save} disabled={saving} className={ghostBtn}>{saving ? 'Saving…' : 'Save balance'}</button>
      </div>
    </Section>
  );
}

function RulesSection({ c, onSaved, notify }) {
  const [isPropFirm, setIsPropFirm] = useState(c.is_prop_firm ?? false);
  const [daily, setDaily] = useState(c.daily_loss_limit_pct ?? null);
  const [maxDd, setMaxDd] = useState(c.max_loss_limit_pct ?? null);
  const [target, setTarget] = useState(c.profit_target_pct ?? null);
  const [consistency, setConsistency] = useState(c.consistency_limit_pct ?? null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from('broker_connections')
      .update({
        is_prop_firm: isPropFirm,
        daily_loss_limit_pct: daily,
        max_loss_limit_pct: maxDd,
        profit_target_pct: target,
        consistency_limit_pct: consistency,
      })
      .eq('id', c.id);
    setSaving(false);
    if (error) return notify('error', `Couldn't save limits: ${error.message}`);
    notify('success', 'Limits saved.');
    onSaved();
  }

  return (
    <Section
      title="Loss limits"
      hint="Works on any account, including manual ones. Set each limit as a percent of the starting balance and it shows up as batteries on the Journal's Limits tab and while you log trades."
    >
      {!(Number(c.starting_balance) > 0) && (
        <p className="text-xs text-amber-300/90 mb-3">Add a starting balance above first, so limits can be worked out in dollars.</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <DrawdownLimitSelect label="Daily loss limit" value={daily} onChange={setDaily} />
        <DrawdownLimitSelect label="Max drawdown" value={maxDd} onChange={setMaxDd} />
        <DrawdownLimitSelect label="Profit target" value={target} onChange={setTarget} />
        <DrawdownLimitSelect label="Consistency limit" value={consistency} onChange={setConsistency} />
      </div>
      <div className="mt-4">
        <Switch
          checked={isPropFirm}
          onChange={setIsPropFirm}
          label="This is a prop firm account"
          hint="Only adds a Prop firm badge and labels the tab. The limits above work either way."
        />
      </div>
      <button onClick={save} disabled={saving} className={`${ghostBtn} mt-4`}>{saving ? 'Saving…' : 'Save limits'}</button>
    </Section>
  );
}

function RemoveSection({ c, removing, onRemove }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <Section title="Remove account">
      {!confirming ? (
        <button onClick={() => setConfirming(true)} className={dangerBtn}>Remove account…</button>
      ) : (
        <div className="bk-swap rounded-xl border border-red-500/30 bg-red-500/5 p-3">
          <p className="text-sm text-neutral-200">Remove {c.broker_server}?</p>
          <p className="text-xs text-neutral-400 mt-1 mb-3">Its trades stay in your journal but are no longer linked to an account.</p>
          <div className="flex gap-2">
            <button onClick={onRemove} disabled={removing} className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-sm font-semibold">
              {removing ? 'Removing…' : 'Yes, remove it'}
            </button>
            <button onClick={() => setConfirming(false)} className={ghostBtn}>Keep it</button>
          </div>
        </div>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// One account row. Click to select: the row lights up and its settings slide open.
// ---------------------------------------------------------------------------
function AccountRow({ c, index, selected, flash, syncing, removing, onSelect, onSync, onRemove, onSaved, notify }) {
  const meta = typeMeta(c);
  const status = statusInfo(c);
  // Don't load share links etc. for every account up front, only after first open.
  const [everOpened, setEverOpened] = useState(false);
  useEffect(() => {
    if (selected) setEverOpened(true);
  }, [selected]);

  return (
    <li
      className={`bk-row bk-swap rounded-2xl border border-neutral-800/60 bg-white/[0.03] ${selected ? 'is-selected' : 'hover:border-neutral-700'} ${flash ? 'bk-flash' : ''}`}
      style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}
    >
      <button
        onClick={onSelect}
        aria-expanded={selected}
        className="w-full flex items-center gap-3 p-4 text-left rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
      >
        <span className={`bk-avatar w-10 h-10 rounded-xl bg-gradient-to-br ${meta.grad} flex items-center justify-center text-white font-bold font-heading flex-shrink-0`}>
          {(c.broker_server || '?').trim().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-medium text-neutral-50 truncate">{c.broker_server}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-neutral-400 flex-shrink-0">{meta.label}</span>
            {c.is_prop_firm && <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 flex-shrink-0">Prop firm</span>}
          </span>
          <span className="flex items-center gap-2 text-xs text-neutral-500 mt-1 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-neutral-400">
              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              {status.text}
            </span>
            {isLinked(c) && c.mt5_login && <span>Login {c.mt5_login}</span>}
            {isLinked(c) && <span>{c.last_synced_at ? `Synced ${format(new Date(c.last_synced_at), 'MMM d, h:mm a')}` : 'Never synced'}</span>}
            {c.starting_balance != null && <span>Started at {money(c.starting_balance)}</span>}
          </span>
        </span>
        <span className="text-neutral-500 flex-shrink-0"><Chevron open={selected} /></span>
      </button>

      <Collapse open={selected}>
        {everOpened && (
          <div className="px-4 pb-4">
            <div className="border-t border-neutral-800/60 pt-4">
              {isLinked(c) && <SyncSection c={c} syncing={syncing} onSync={onSync} />}
              <NameSection c={c} onSaved={onSaved} notify={notify} />
              <BalanceSection c={c} onSaved={onSaved} notify={notify} />
              <RulesSection c={c} onSaved={onSaved} notify={notify} />
              <Section title="Share your track record" hint="Create a public, read-only link to this account's results. Revoke it any time.">
                <ShareReport connection={c} />
              </Section>
              <RemoveSection c={c} removing={removing} onRemove={onRemove} />
            </div>
          </div>
        )}
      </Collapse>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Launcher card: the two big buttons that open a panel
// ---------------------------------------------------------------------------
function Launcher({ active, onClick, icon, title, description, badge }) {
  return (
    <button
      onClick={onClick}
      aria-expanded={active}
      className={`bk-launcher ${active ? 'is-active' : 'hover:border-neutral-700'} relative text-left bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-4 sm:p-5 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60`}
    >
      <span className="flex items-start gap-3">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${active ? 'bg-indigo-500 text-white' : 'bg-white/[0.06] text-neutral-300'}`}>
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-heading font-semibold text-neutral-50">{title}</span>
            {badge != null && <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.08] text-neutral-300">{badge}</span>}
          </span>
          <span className="block text-sm text-neutral-400 mt-1 leading-snug">{description}</span>
        </span>
        <span className="text-neutral-500 mt-1"><Chevron open={active} /></span>
      </span>
    </button>
  );
}

const PlusIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
);
const ListIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h10" /></svg>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function BrokerPage() {
  const router = useRouter();
  const { toasts, notify, dismiss } = useToasts();
  const [user, setUser] = useState(null);
  const [connections, setConnections] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [panel, setPanel] = useState(null); // null | 'connect' | 'accounts'
  const [openCount, setOpenCount] = useState(0); // re-keys the list so rows stagger in each time it opens
  const [selectedId, setSelectedId] = useState(null);
  const [syncingId, setSyncingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [flashIds, setFlashIds] = useState([]);
  const knownIds = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/login');
      else setUser(session.user);
    });
  }, [router]);

  const loadConnections = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('broker_connections').select('*').order('created_at', { ascending: false });
    const rows = data || [];
    // Flash any account that wasn't there on the last load, so you can see what you just added.
    if (knownIds.current) {
      const fresh = rows.filter((r) => !knownIds.current.has(r.id)).map((r) => r.id);
      if (fresh.length) {
        setFlashIds(fresh);
        setTimeout(() => setFlashIds([]), 1200);
      }
    }
    knownIds.current = new Set(rows.map((r) => r.id));
    setConnections(rows);
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  function togglePanel(name) {
    setPanel((cur) => {
      const next = cur === name ? null : name;
      if (next === 'accounts') setOpenCount((n) => n + 1);
      return next;
    });
  }

  async function handleSync(id) {
    setSyncingId(id);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch('/api/broker/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ connectionId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      notify('success', data.tradesSynced === 1 ? 'Synced 1 trade.' : `Synced ${data.tradesSynced} trades.`);
      loadConnections();
    } catch (err) {
      notify('error', `Sync failed: ${err.message}`);
    }
    setSyncingId(null);
  }

  async function handleRemove(c) {
    setRemovingId(c.id);
    const { error } = await supabase.from('broker_connections').delete().eq('id', c.id);
    setRemovingId(null);
    if (error) return notify('error', `Couldn't remove ${c.broker_server}: ${error.message}`);
    notify('success', `${c.broker_server} removed.`);
    setSelectedId(null);
    loadConnections();
  }

  const count = connections.length;

  return (
    <AppShell>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading text-2xl font-bold text-neutral-50">Broker</h1>
            <p className="text-sm text-neutral-400 mt-1 max-w-md leading-relaxed">
              Add the accounts you trade, then manage each one's balance, rules and sharing.
            </p>
          </div>
          <button onClick={() => router.push('/journal')} className={`${ghostBtn} !py-2 flex-shrink-0`}>
            Back to journal
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Launcher
            active={panel === 'connect'}
            onClick={() => togglePanel('connect')}
            icon={PlusIcon}
            title="Connect an account"
            description="Link a broker, import a CSV, or create a manual account."
          />
          <Launcher
            active={panel === 'accounts'}
            onClick={() => togglePanel('accounts')}
            icon={ListIcon}
            title="Your accounts"
            badge={loaded ? count : null}
            description={!loaded ? 'Loading…' : count === 0 ? 'Nothing here yet.' : 'Sync, rename, set rules, or share.'}
          />
        </div>

        <Collapse open={panel === 'connect'}>
          <div className="pt-3">
            <div className="relative bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-4 sm:p-5 overflow-hidden">
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              <BrokerConnect
                userId={user?.id}
                onConnected={loadConnections}
                onImported={() => {
                  notify('success', 'Import finished. Your trades are on the calendar.');
                  loadConnections();
                }}
              />
            </div>
          </div>
        </Collapse>

        <Collapse open={panel === 'accounts'}>
          <div className="pt-3">
            {loaded && count === 0 ? (
              <div className="bg-white/[0.04] border border-neutral-800/60 rounded-2xl p-8 text-center bk-swap">
                <p className="text-neutral-100 font-medium">No accounts yet</p>
                <p className="text-sm text-neutral-500 mt-1 mb-4">Connect a broker, import a CSV, or create a manual account to get started.</p>
                <button onClick={() => togglePanel('connect')} className={primaryBtn}>Connect an account</button>
              </div>
            ) : (
              <ul key={openCount} className="space-y-3">
                {connections.map((c, i) => (
                  <AccountRow
                    key={c.id}
                    c={c}
                    index={i}
                    selected={selectedId === c.id}
                    flash={flashIds.includes(c.id)}
                    syncing={syncingId === c.id}
                    removing={removingId === c.id}
                    onSelect={() => setSelectedId((cur) => (cur === c.id ? null : c.id))}
                    onSync={() => handleSync(c.id)}
                    onRemove={() => handleRemove(c)}
                    onSaved={loadConnections}
                    notify={notify}
                  />
                ))}
              </ul>
            )}
          </div>
        </Collapse>
      </div>
    </AppShell>
  );
}
