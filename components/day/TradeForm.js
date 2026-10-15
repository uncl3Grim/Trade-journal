'use client';

import { formatMoney } from '../../lib/format';
import { Card, GhostButton, Inline, PrimaryButton, Segmented, inputCls } from '../profile/ui';
import { ChipGroup, Field, RULE_OPTIONS, SelectField, emotionOptions } from './dayShared';

export default function TradeForm({
  form,
  setForm,
  editingId,
  quickMode,
  setQuickMode,
  accounts,
  strategies,
  defaultRiskAmount,
  saving,
  error,
  onSubmit,
  onCancel,
}) {
  const set = (patch) => setForm({ ...form, ...patch });
  const num = (key, extra = {}) => ({
    type: 'number',
    step: 'any',
    value: form[key],
    onChange: (e) => set({ [key]: e.target.value }),
    className: inputCls,
    ...extra,
  });

  const riskUsed = form.risk_amount !== '' ? parseFloat(form.risk_amount) : defaultRiskAmount;
  const rVal = form.outcome === 'breakeven' ? 0 : parseFloat(form.r_multiple) || 0;
  const sign = form.outcome === 'win' ? 1 : form.outcome === 'loss' ? -1 : 0;
  const preview = riskUsed ? sign * rVal * riskUsed : null;

  return (
    <form onSubmit={onSubmit}>
      {editingId && (
        <div className="pf-swap flex items-center justify-between gap-3 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-3 mb-4">
          <span className="text-sm text-indigo-100">
            Editing <b className="font-semibold">{form.symbol || 'trade'}</b>. Nothing changes until you press Update.
          </span>
          <button type="button" onClick={onCancel} className="text-xs font-medium text-indigo-200 hover:text-white flex-shrink-0">
            Cancel
          </button>
        </div>
      )}

      <div className="pf-stagger space-y-4">
        <Card title="Trade" hint="What you traded and how you want to record it.">
          <div className="space-y-4">
            {accounts.length > 0 && (
              <Field label="Account">
                <SelectField value={form.account_id} onChange={(e) => set({ account_id: e.target.value })}>
                  <option value="">Manual (no account)</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.broker_server} ({a.mt5_login})
                    </option>
                  ))}
                </SelectField>
              </Field>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Symbol">
                <input
                  placeholder="e.g. EURUSD"
                  value={form.symbol}
                  onChange={(e) => set({ symbol: e.target.value })}
                  required
                  className={inputCls}
                />
              </Field>
              <Field label="Direction">
                <Segmented
                  value={form.direction}
                  onChange={(k) => set({ direction: k })}
                  options={[
                    { key: 'long', label: 'Long' },
                    { key: 'short', label: 'Short' },
                  ]}
                />
              </Field>
            </div>

            <Field
              label="Entry method"
              hint={quickMode ? 'Logging by result. No prices needed, P&L is worked out from R × risk.' : 'Logging with exact entry and exit prices.'}
            >
              <Segmented
                value={quickMode ? 'quick' : 'exact'}
                onChange={(k) => setQuickMode(k === 'quick')}
                options={[
                  { key: 'exact', label: 'Exact prices' },
                  { key: 'quick', label: 'Quick (Win/Loss + R)' },
                ]}
              />
            </Field>
          </div>
        </Card>

        <Card title="Result" hint={quickMode ? 'Pick the outcome and how many R it made or lost.' : 'Prices, size and the final P&L.'}>
          {quickMode ? (
            <div className="space-y-4">
              <Field label="Outcome">
                <Segmented
                  value={form.outcome}
                  onChange={(k) => set({ outcome: k })}
                  options={[
                    { key: 'win', label: 'Win' },
                    { key: 'loss', label: 'Loss' },
                    { key: 'breakeven', label: 'Breakeven' },
                  ]}
                />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="R multiple">
                  <input
                    {...num('r_multiple', { min: '0', placeholder: 'e.g. 2.5', disabled: form.outcome === 'breakeven', required: form.outcome !== 'breakeven' })}
                    className={`${inputCls} disabled:opacity-40`}
                  />
                </Field>
                <Field
                  label="Risk amount ($)"
                  hint={defaultRiskAmount ? `Leave blank to use your default ($${defaultRiskAmount}).` : 'Required so P&L can be calculated.'}
                >
                  <input {...num('risk_amount', { placeholder: defaultRiskAmount ? String(defaultRiskAmount) : 'e.g. 20' })} />
                </Field>
              </div>
              <Field label="Size / lots (optional)">
                <input {...num('size')} />
              </Field>
              <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-neutral-500 uppercase tracking-wider">P&L preview</span>
                <span className={`text-base font-semibold tabular-nums ${preview > 0 ? 'text-emerald-400' : preview < 0 ? 'text-rose-400' : 'text-neutral-300'}`}>
                  {preview !== null ? formatMoney(preview) : 'Enter a risk amount'}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Entry price">
                  <input {...num('entry_price', { required: true })} />
                </Field>
                <Field label="Exit price">
                  <input {...num('exit_price')} />
                </Field>
                <Field label="Stop loss">
                  <input {...num('stop_loss')} />
                </Field>
                <Field label="Take profit">
                  <input {...num('take_profit')} />
                </Field>
                <Field label="Size / lots">
                  <input {...num('size', { required: true })} />
                </Field>
                <Field label="P&L ($)">
                  <input {...num('pnl')} />
                </Field>
              </div>
              <Field
                label="Risk amount ($, optional)"
                hint={`Overrides your default${defaultRiskAmount ? ` ($${defaultRiskAmount})` : ''} and the price-based calculation.`}
              >
                <input {...num('risk_amount', { placeholder: defaultRiskAmount ? `Using default: ${defaultRiskAmount}` : 'e.g. 20' })} />
              </Field>
            </div>
          )}
        </Card>

        <Card title="Timing" hint="When the trade opened and closed, in your local time.">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Entry time">
              <input
                type="datetime-local"
                value={form.entry_time}
                onChange={(e) => set({ entry_time: e.target.value })}
                style={{ colorScheme: 'dark' }}
                className={inputCls}
              />
            </Field>
            <Field label="Exit time">
              <input
                type="datetime-local"
                value={form.exit_time}
                onChange={(e) => set({ exit_time: e.target.value })}
                style={{ colorScheme: 'dark' }}
                className={inputCls}
              />
            </Field>
          </div>
        </Card>

        <Card title="Review" hint="How the trade went, for your future self.">
          <div className="space-y-5">
            <Field label="Did you follow your plan?">
              <ChipGroup options={RULE_OPTIONS} value={form.rule_adherence} onChange={(v) => set({ rule_adherence: v })} />
            </Field>

            <Field label="How did you feel in the trade?" hint="Separate from the day's overall mood on the Daily note tab.">
              <ChipGroup options={emotionOptions} value={form.emotion} onChange={(v) => set({ emotion: v })} />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Setup type">
                <input
                  placeholder="e.g. breakout, reversal"
                  value={form.setup_type}
                  onChange={(e) => set({ setup_type: e.target.value })}
                  className={inputCls}
                />
              </Field>
              {strategies.length > 0 && (
                <Field label="Strategy">
                  <SelectField value={form.strategy_id} onChange={(e) => set({ strategy_id: e.target.value })}>
                    <option value="">None</option>
                    {strategies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </SelectField>
                </Field>
              )}
            </div>

            <Field label="Tags" hint="Separate with commas.">
              <input
                placeholder="e.g. breakout, trend-following"
                value={form.tags}
                onChange={(e) => set({ tags: e.target.value })}
                className={inputCls}
              />
            </Field>

            <Field label="Trade note">
              <textarea
                value={form.notes}
                onChange={(e) => set({ notes: e.target.value })}
                rows={4}
                placeholder="What was your setup, reasoning and execution?"
                className={`${inputCls} resize-y`}
              />
            </Field>

            <Inline kind="error">{error}</Inline>
          </div>
        </Card>
      </div>

      <div className="pf-savebar is-visible">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-neutral-900/80 backdrop-blur-xl px-4 py-3 shadow-2xl">
          <span className="text-sm text-neutral-300 truncate">{editingId ? `Editing ${form.symbol || 'trade'}` : 'New trade'}</span>
          <div className="flex gap-2 flex-shrink-0">
            {editingId && (
              <GhostButton type="button" onClick={onCancel} disabled={saving}>
                Cancel
              </GhostButton>
            )}
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update trade' : 'Add trade'}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </form>
  );
}
