export function formatMoney(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const num = Number(value);
  const abs = Math.abs(num);
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sign = num < 0 ? '-' : num > 0 ? '+' : '';
  return `${sign}$${formatted}`;
}
