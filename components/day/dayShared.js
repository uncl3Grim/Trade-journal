'use client';

import { format } from 'date-fns';
import { Label, inputCls } from '../profile/ui';

export const EMOTIONS = ['disciplined', 'confident', 'hesitant', 'fomo', 'revenge', 'bored', 'anxious'];

export const RULE_OPTIONS = [
  { value: 'followed_plan', label: 'Followed plan' },
  { value: 'impulse_entry', label: 'Impulse entry' },
  { value: 'moved_stop', label: 'Moved stop' },
  { value: 'oversized', label: 'Oversized' },
  { value: 'other', label: 'Other deviation' },
];

export const emptyForm = {
  symbol: '',
  direction: 'long',
  entry_price: '',
  exit_price: '',
  size: '',
  entry_time: '',
  exit_time: '',
  pnl: '',
  stop_loss: '',
  take_profit: '',
  risk_amount: '',
  tags: '',
  emotion: '',
  notes: '',
  account_id: '',
  rule_adherence: '',
  setup_type: '',
  strategy_id: '',
  checklist: [],
  outcome: 'win',
  r_multiple: '',
};

// Quick-entry trades carry no real entry price and no exit price. They are
// recognised on edit by that combination plus an explicit risk_amount, which
// is what lets R and $ round-trip exactly.
export function isQuickEntryTrade(trade) {
  return (
    (!trade.entry_price || Number(trade.entry_price) === 0) &&
    (trade.exit_price === null || trade.exit_price === undefined || Number(trade.exit_price) === 0) &&
    !!trade.risk_amount
  );
}

// All screenshots for a trade (supports the older single-image column too).
export function tradeImages(trade) {
  return (trade.screenshot_urls?.length > 0 ? trade.screenshot_urls : trade.screenshot_url ? [trade.screenshot_url] : []).filter(Boolean);
}

// <input type="datetime-local"> wants the user's LOCAL clock time. The stored
// value is a UTC instant, so format it locally (slicing the ISO string would
// show UTC and quietly shift the trade's time every time it was edited).
export function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : format(d, "yyyy-MM-dd'T'HH:mm");
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-neutral-500 mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

export function SelectField({ value, onChange, children, ...rest }) {
  return (
    <select value={value} onChange={onChange} style={{ colorScheme: 'dark' }} className={inputCls} {...rest}>
      {children}
    </select>
  );
}

// A row of pill buttons. Tapping the active one clears it.
export function ChipGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? '' : o.value)}
            className={`pf-chip rounded-full border px-3.5 py-1.5 text-xs capitalize ${
              on
                ? 'is-active border-indigo-400/60 bg-indigo-500/20 text-indigo-100'
                : 'border-white/10 bg-white/5 text-neutral-400 hover:text-neutral-200 hover:bg-white/10'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export const emotionOptions = EMOTIONS.map((e) => ({ value: e, label: e }));
