// Supabase/PostgREST caps every response at the project's "max rows" setting
// (1000 by default), even when .range(0, 49999) asks for more. A query that
// needs every matching row has to page through them.
//
// buildQuery must return a fresh query each call AND include a stable order
// (e.g. .order('id')), otherwise pages can overlap or skip rows.
export async function fetchAllRows(buildQuery, pageSize = 1000) {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) return { data: rows, error };
    if (!data || data.length === 0) break;
    rows.push(...data);
    from += data.length; // advance by what we actually got, in case the server cap is lower than pageSize
  }
  return { data: rows, error: null };
}
