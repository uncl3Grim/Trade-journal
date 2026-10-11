'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { fetchAllRows } from '../../lib/fetchAll';
import { tradesToCsv, downloadCsv } from '../../lib/exportCsv';
import { Card, PrimaryButton } from './ui';
import { DownloadGlyph } from './ProfileIcons';

export default function DataPanel({ userId, notify }) {
  const [count, setCount] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('trades')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .then(({ count: c }) => setCount(c ?? 0));
  }, [userId]);

  async function exportAll() {
    setBusy(true);
    const { data, error } = await fetchAllRows(() =>
      supabase.from('trades').select('*').eq('user_id', userId).order('id')
    );
    setBusy(false);
    if (error) return notify(error.message, 'error');
    if (!data.length) return notify('No trades to export yet', 'error');
    downloadCsv(tradesToCsv(data), `trade-journal-${new Date().toISOString().slice(0, 10)}.csv`);
    notify(`Exported ${data.length} trades`);
  }

  return (
    <div className="pf-stagger space-y-4">
      <Card title="Export" hint="Download every trade in your journal as a CSV file.">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-black/20 border border-white/10 px-4 py-3 mb-4">
          <div>
            <div className="text-xs text-neutral-500">Trades in your journal</div>
            <div className="text-2xl font-heading font-semibold text-neutral-100 tabular-nums">
              {count === null ? <span className="skeleton inline-block w-12 h-7 !bg-white/10" /> : count.toLocaleString()}
            </div>
          </div>
          <DownloadGlyph size={26} className="text-neutral-600" />
        </div>
        <PrimaryButton onClick={exportAll} disabled={busy || count === 0}>
          {busy ? 'Preparing…' : 'Export trades (CSV)'}
        </PrimaryButton>
      </Card>
    </div>
  );
}
