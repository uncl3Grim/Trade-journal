export function applyAccountFilter(query, accountFilter) {
  const { allSelected, selectedIds, includeManual } = accountFilter;
  if (allSelected) return query;

  if (includeManual && selectedIds.length) {
    return query.or(`broker_connection_id.in.(${selectedIds.join(',')}),broker_connection_id.is.null`);
  }
  if (includeManual) {
    return query.is('broker_connection_id', null);
  }
  if (selectedIds.length) {
    return query.in('broker_connection_id', selectedIds);
  }
  return query.eq('id', '00000000-0000-0000-0000-000000000000');
}

// Returns the single active account id when exactly one specific account is
// selected, or null when viewing "All accounts" / multiple / manual — in
// which case daily notes fall back to a shared/general bucket.
export function computeActiveAccountId(accountFilter) {
  if (accountFilter.allSelected) return null;
  if (!accountFilter.includeManual && accountFilter.selectedIds.length === 1) {
    return accountFilter.selectedIds[0];
  }
  return null;
}
