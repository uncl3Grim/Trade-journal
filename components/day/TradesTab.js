'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabaseClient';
import { rMultiple } from '../../lib/tradeMath';
import { formatMoney } from '../../lib/format';
import { getTradeSession } from '../../lib/session';
import { PrimaryButton, GhostButton } from '../profile/ui';
import { CameraGlyph, CloseGlyph, PlusGlyph } from './DayIcons';
import { RULE_OPTIONS, tradeImages } from './dayShared';

const MAX_SCREENSHOTS = 3;

const TONES = {
  sky: 'bg-sky-500/10 border-sky-400/20 text-sky-200',
  violet: 'bg-violet-500/10 border-violet-400/20 text-violet-200',
  indigo: 'bg-indigo-500/10 border-indigo-400/20 text-indigo-200',
  emerald: 'bg-emerald-500/10 border-emerald-400/20 text-emerald-200',
  amber: 'bg-amber-500/10 border-amber-400/20 text-amber-200',
  neutral: 'bg-white/5 border-white/10 text-neutral-400',
};

function Pill({ tone = 'neutral', children }) {
  return <span className={`text-[11px] px-2.5 py-1 rounded-full border capitalize ${TONES[tone]}`}>{children}</span>;
}

// Screenshots for one trade: tap a thumbnail to view it full screen.
function TradeShots({ trade, userId, notify, onChanged, onOpen }) {
  const [busy, setBusy] = useState(false);
  const urls = tradeImages(trade);

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const room = MAX_SCREENSHOTS - urls.length;
    if (room <= 0) {
      notify(`Max ${MAX_SCREENSHOTS} screenshots per trade.`, 'error');
      return;
    }
    const batch = files.slice(0, room);
    setBusy(true);
    try {
      const added = [];
      for (let i = 0; i < batch.length; i++) {
        const file = batch[i];
        const ext = (file.name.split('.').pop() || 'png').toLowerCase();
        const path = `${userId}/${trade.id}-${Date.now()}-${i}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('trade-screenshots').upload(path, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('trade-screenshots').getPublicUrl(path);
        added.push(data.publicUrl);
      }
      const { error } = await supabase.from('trades').update({ screenshot_urls: [...urls, ...added] }).eq('id', trade.id);
      if (error) throw error;
      notify(
        files.length > room
          ? `Added ${added.length}. The limit is ${MAX_SCREENSHOTS} per trade.`
          : added.length === 1
          ? 'Screenshot added'
          : `${added.length} screenshots added`
      );
      onChanged();
    } catch (err) {
      notify(err.message || 'Upload failed', 'error');
    }
    setBusy(false);
  }

  async function handleRemove(url) {
    const next = urls.filter((u) => u !== url);
    const patch = { screenshot_urls: next };
    if ('screenshot_url' in trade) patch.screenshot_url = null; // drop the older single-image column too
    const { error } = await supabase.from('trades').update(patch).eq('id', trade.id);
    if (error) {
      notify(error.message, 'error');
      return;
    }
    notify('Screenshot removed');
    onChanged();
  }

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {urls.map((url, i) => (
        <div key={url} className="relative">
          <button
            type="button"
            onClick={() => onOpen(urls, i)}
            aria-label={`View screenshot ${i + 1}`}
            className="pf-tile block rounded-xl overflow-hidden border border-white/10"
          >
            <img src={url} alt="Trade screenshot" className="h-20 w-20 object-cover" />
          </button>
          <button
            type="button"
            onClick={() => handleRemove(url)}
            aria-label="Remove screenshot"
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-neutral-900 border border-white/20 text-neutral-300 hover:text-rose-300 flex items-center justify-center"
          >
            <CloseGlyph size={11} />
          </button>
        </div>
      ))}
      {urls.length < MAX_SCREENSHOTS && (
        <label className="pf-drop cursor-pointer flex flex-col items-center justify-center gap-1 h-20 w-20 rounded-xl border border-dashed border-white/20 hover:border-indigo-400/60 hover:bg-white/5 text-neutral-500 hover:text-neutral-200 text-[11px]">
          {busy ? (
            <span className="pf-spinner" />
          ) : (
            <>
              <CameraGlyph size={18} />
              <span>
                Add {urls.length}/{MAX_SCREENSHOTS}
              </span>
            </>
          )}
          <input type="file" accept="image/*" multiple onChange={handleFiles} disabled={busy} className="hidden" />
        </label>
      )}
    </div>
  );
}

function TradeCard({ trade, userId, defaultRiskAmount, onEdit, onView, onChanged, notify, onOpenImages }) {
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);

  const pnl = Number(trade.pnl || 0);
  const r = rMultiple(trade, defaultRiskAmount);
  const isLong = trade.direction === 'long';
  const session = getTradeSession(trade.entry_time);
  const time = trade.entry_time && !isNaN(new Date(trade.entry_time)) ? format(new Date(trade.entry_time), 'h:mm a') : null;
  const rule = RULE_OPTIONS.find((o) => o.value === trade.rule_adherence);

  async function togglePin() {
    const next = !trade.pinned;
    const { error } = await supabase.from('trades').update({ pinned: next }).eq('id', trade.id);
    if (error) return notify(error.message, 'error');
    notify(next ? 'Trade pinned' : 'Trade unpinned');
    onChanged();
  }

  async function handleDelete() {
    setRemoving(true);
    const { error } = await supabase.from('trades').delete().eq('id', trade.id);
    setRemoving(false);
    if (error) return notify(error.message, 'error');
    notify('Trade deleted');
    onChanged();
  }

  return (
    <article className="pf-card rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onView} className="flex items-center gap-3 min-w-0 text-left" aria-label={`Open ${trade.symbol} trade card`}>
          <span
            className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${
              isLong ? 'bg-emerald-500/10 border-emerald-400/20 text-emerald-300' : 'bg-rose-500/10 border-rose-400/20 text-rose-300'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isLong ? <path d="M7 17L17 7M9 7h8v8" /> : <path d="M7 7l10 10M17 9v8H9" />}
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-neutral-50 truncate">{trade.symbol}</span>
            <span className="block text-xs text-neutral-500 capitalize">
              {trade.direction}
              {time ? ` · ${time}` : ''}
            </span>
          </span>
        </button>

        <div className="text-right flex-shrink-0">
          <div className={`text-lg font-semibold tabular-nums ${pnl > 0 ? 'text-emerald-400' : pnl < 0 ? 'text-rose-400' : 'text-neutral-400'}`}>
            {formatMoney(pnl)}
          </div>
          {r !== null && (
            <div className="text-xs text-neutral-500 tabular-nums">
              {r >= 0 ? '+' : ''}
              {r.toFixed(2)}R
            </div>
          )}
        </div>
      </div>

      {(session || trade.emotion || trade.setup_type || rule || trade.tags?.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {session && <Pill tone="sky">{session}</Pill>}
          {trade.emotion && <Pill tone="violet">{trade.emotion}</Pill>}
          {trade.setup_type && <Pill tone="indigo">{trade.setup_type}</Pill>}
          {rule && <Pill tone={trade.rule_adherence === 'followed_plan' ? 'emerald' : 'amber'}>{rule.label}</Pill>}
          {trade.tags?.map((tag) => (
            <Pill key={tag}>{tag}</Pill>
          ))}
        </div>
      )}

      {trade.notes && <p className="text-sm text-neutral-400 mt-3 whitespace-pre-wrap leading-relaxed">{trade.notes}</p>}

      <TradeShots trade={trade} userId={userId} notify={notify} onChanged={onChanged} onOpen={onOpenImages} />

      <div className="flex items-center gap-1 mt-4 pt-3 border-t border-white/10 text-xs">
        <button
          type="button"
          onClick={togglePin}
          className={`rounded-lg px-2.5 py-1.5 hover:bg-white/10 ${trade.pinned ? 'text-amber-300' : 'text-neutral-500 hover:text-neutral-200'}`}
        >
          {trade.pinned ? '★ Pinned' : '☆ Pin'}
        </button>
        <button type="button" onClick={onView} className="rounded-lg px-2.5 py-1.5 text-neutral-500 hover:text-neutral-200 hover:bg-white/10">
          Card
        </button>
        <button type="button" onClick={onEdit} className="rounded-lg px-2.5 py-1.5 text-indigo-300 hover:text-indigo-200 hover:bg-white/10">
          Edit
        </button>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="ml-auto rounded-lg px-2.5 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
        >
          Delete
        </button>
      </div>

      {confirming && (
        <div className="pf-swap mt-3 rounded-xl border border-rose-400/30 bg-rose-500/5 p-3">
          <p className="text-sm text-neutral-200">Delete this {trade.symbol} trade?</p>
          <p className="text-xs text-neutral-400 mt-0.5 mb-3">This can't be undone.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={removing}
              className="rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white px-4 py-2 text-sm font-medium"
            >
              {removing ? 'Deleting…' : 'Yes, delete'}
            </button>
            <GhostButton type="button" onClick={() => setConfirming(false)} className="!py-2">
              Keep it
            </GhostButton>
          </div>
        </div>
      )}
    </article>
  );
}

export default function TradesTab({ trades, userId, defaultRiskAmount, onEdit, onView, onChanged, notify, onOpenImages, onAdd }) {
  if (trades.length === 0) {
    return (
      <div className="pf-card rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-10 text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-500/15 border border-indigo-400/20 text-indigo-300 flex items-center justify-center mb-4">
          <PlusGlyph size={22} />
        </div>
        <p className="text-neutral-100 font-medium">No trades on this day</p>
        <p className="text-sm text-neutral-500 mt-1 mb-5">Log one now, or switch accounts to see trades from another account.</p>
        <PrimaryButton onClick={onAdd}>Log a trade</PrimaryButton>
      </div>
    );
  }

  return (
    <div className="pf-stagger space-y-3">
      {trades.map((t) => (
        <TradeCard
          key={t.id}
          trade={t}
          userId={userId}
          defaultRiskAmount={defaultRiskAmount}
          notify={notify}
          onChanged={onChanged}
          onEdit={() => onEdit(t)}
          onView={() => onView(t)}
          onOpenImages={(urls, i) =>
            onOpenImages(
              urls.map((url) => ({ url, caption: `${t.symbol} ${t.direction}`, sub: formatMoney(Number(t.pnl || 0)) })),
              i
            )
          }
        />
      ))}
    </div>
  );
}
