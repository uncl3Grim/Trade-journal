function toISO(dateStr) {
  if (!dateStr) return null;
  const normalized = dateStr.trim().replace(' ', 'T');
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function parseMMDDYYYY(dateStr) {
  if (!dateStr) return null;
  const [datePart, timePart] = dateStr.trim().split(' ');
  const [month, day, year] = datePart.split('/').map(Number);
  const [hour, minute, second] = (timePart || '00:00:00').split(':').map(Number);
  const d = new Date(year, month - 1, day, hour, minute, second || 0);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function detectFormat(headers) {
  const h = headers.map((x) => x.trim().toLowerCase());
  if (h.includes('position id') && h.includes('avg fill price') && h.includes('side')) return 'order_level';
  if (h.includes('open date') && h.includes('close date') && h.includes('action') && h.includes('open price')) {
    return 'myfxbook_statement';
  }
  if (h.includes('symbol') && h.includes('entry_price')) return 'template';
  return 'unknown';
}

// TradingView/Alchemy Markets — one row per order, grouped by Position ID
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

// MyFXBook "Statement" export — one row per completed trade already
export function convertMyfxbookStatementRows(rows) {
  return rows
    .filter((r) => r['Symbol'] && r['Open Price'])
    .map((r) => {
      const sl = parseFloat(r['SL']);
      const tp = parseFloat(r['TP']);
      return {
        symbol: (r['Symbol'] || '').replace(/\.+$/, '').trim(),
        direction: (r['Action'] || '').toLowerCase() === 'sell' ? 'short' : 'long',
        entry_price: r['Open Price'],
        exit_price: r['Close Price'],
        size: r['Units/Lots'],
        entry_time: parseMMDDYYYY(r['Open Date']),
        exit_time: parseMMDDYYYY(r['Close Date']),
        pnl: r['Profit'],
        stop_loss: sl > 0 ? String(sl) : '',
        take_profit: tp > 0 ? String(tp) : '',
        notes: '',
      };
    })
    .sort((a, b) => (a.entry_time || '').localeCompare(b.entry_time || ''));
}
