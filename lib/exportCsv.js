export function tradesToCsv(trades) {
  const headers = ['symbol', 'direction', 'entry_price', 'exit_price', 'size', 'entry_time', 'exit_time', 'pnl', 'notes'];
  const rows = trades.map((t) =>
    headers
      .map((h) => {
        const v = t[h] ?? '';
        const str = String(v).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export function downloadCsv(csvString, filename) {
  const blob = new Blob([csvString], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
