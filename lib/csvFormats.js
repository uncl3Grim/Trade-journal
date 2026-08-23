function toISO(dateStr) {
  if (!dateStr) return null;
  const normalized = dateStr.trim().replace(' ', 'T');
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function detectFormat(headers) {
  const h = headers.map((x) => x.trim().toLowerCase());
  const hasPositionId = h.includes('position id');
  const hasAvgFillPrice = h.includes('avg fill price');
  const hasSide = h.includes('side');
  if (hasPositionId && hasAvgFillPrice && hasSide) return 'order_level';

  const hasSymbol = h.includes('symbol');
  const hasEntryPrice = h.includes('entry_price');
  if (hasSymbol && hasEntryPrice) return 'template';

  return 'unknown';
}

// Converts order-level exports (TradingView/Alchemy Markets style — one row
// per order, grouped by Position ID) into one row per completed trade.
export function convertOrderLevelRows(rows) {
  const byPosition = {};
  for (const r of rows) {
    const pid = (r['Position ID'] || '').trim();
    if (!pid) continue;
    if (!byPosition[pid]) byPosition[pid] = [];
    byPosition[pid].push(r);
  }

  const trades = [];
  for (const pid in byPosition) {
    const orders = byPosition[pid].slice().sort((a, b) => (a['Update Time'] > b['Update Time'] ? 1 : -1));

    let entryRow = null;
    let exitRow = null;
    for (const r of orders) {
      if (r['Status'] !== 'Filled') continue;
      const hasPnl = (r['Closed P&L'] || '').trim() !== '' || (r['Net Closed P&L'] || '').trim() !== '';
      if (!hasPnl && !entryRow) {
        entryRow = r;
      } else if (hasPnl) {
        exitRow = r;
      }
    }

    if (!entryRow) continue;

    const symbol = (entryRow['Symbol'] || '').replace('.R', '').trim();
    const direction = entryRow['Side'] === 'Buy' ? 'long' : 'short';
    const entry_price = entryRow['Avg Fill Price'];
    const entry_time = toISO(entryRow['Update Time']);
    const size = entryRow['Filled Qty'];

    let exit_price = '';
    let exit_time = '';
    let pnl = '0';
    if (exitRow) {
      exit_price = exitRow['Avg Fill Price'];
      exit_time = toISO(exitRow['Update Time']);
      const net = (exitRow['Net Closed P&L'] || '').trim();
      const closed = (exitRow['Closed P&L'] || '').trim();
      pnl = net || closed || '0';
    }

    trades.push({ symbol, direction, entry_price, exit_price, size, entry_time, exit_time, pnl, notes: '' });
  }

  trades.sort((a, b) => (a.entry_time || '').localeCompare(b.entry_time || ''));
  return trades;
}
