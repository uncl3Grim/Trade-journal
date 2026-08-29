import { createClient } from '@supabase/supabase-js';
import { getAccountStatus, getHistoricalTrades } from '../../../../lib/metaapi';
import { myfxbookLogin, myfxbookGetHistory, parseMyfxbookDate } from '../../../../lib/myfxbook';

async function syncMt5(connection) {
  const status = await getAccountStatus(connection.metaapi_account_id);
  if (status.connectionStatus !== 'CONNECTED') {
    throw new Error(
      `Account not ready yet (status: ${status.connectionStatus || status.state}). Try again in a minute.`
    );
  }

  const endTime = new Date().toISOString();
  const startTime = new Date(0).toISOString();
  const mt5Trades = await getHistoricalTrades(connection.metaapi_account_id, startTime, endTime);

  return (mt5Trades || [])
    .filter((t) => t.type === 'DEAL_TYPE_BUY' || t.type === 'DEAL_TYPE_SELL')
    .map((t) => ({
      symbol: t.symbol,
      direction: t.type === 'DEAL_TYPE_BUY' ? 'long' : 'short',
      entry_price: t.openPrice ?? t.price,
      exit_price: t.closePrice ?? null,
      size: t.volume,
      entry_time: t.openTime ?? t.time,
      exit_time: t.closeTime ?? null,
      pnl: t.profit ?? 0,
      // MetaApi field name for the position/order ticket — verify against a
      // real payload; falls back gracefully to time-based matching if absent.
      ticket: t.positionId ?? t.orderId ?? t.id ?? t.ticket ?? null,
      source: 'mt5_sync',
    }));
}

async function syncMyfxbook(connection) {
  const session = await myfxbookLogin(connection.myfxbook_email, connection.myfxbook_password);
  const history = await myfxbookGetHistory(session, connection.myfxbook_account_id);

  return (history || []).map((t) => ({
    symbol: t.symbol,
    direction: (t.action || '').toLowerCase().includes('sell') ? 'short' : 'long',
    entry_price: t.openPrice,
    exit_price: t.closePrice,
    size: parseFloat(t.sizing?.value) || null,
    entry_time: parseMyfxbookDate(t.openTime),
    exit_time: parseMyfxbookDate(t.closeTime),
    pnl: t.profit ?? 0,
    stop_loss: t.sl || null,
    take_profit: t.tp || null,
    // MyFXBook's own trade id — verify field name against a real API
    // payload; falls back gracefully to time-based matching if absent.
    ticket: t.id ?? t.ticket ?? t.openOrderId ?? null,
    source: 'myfxbook_sync',
  }));
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }
    const userId = userData.user.id;

    const { connectionId } = await request.json();
    if (!connectionId) {
      return Response.json({ error: 'Missing connectionId' }, { status: 400 });
    }

    const { data: connection, error: connError } = await supabase
      .from('broker_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (connError || !connection) {
      return Response.json({ error: 'Broker connection not found' }, { status: 404 });
    }

    const rawRows =
      connection.broker_type === 'myfxbook'
        ? await syncMyfxbook(connection)
        : await syncMt5(connection);

    const validRows = rawRows
      .filter((r) => r.entry_time && r.symbol)
      .map((r) => {
        const { ticket, ...rest } = r;
        return {
          ...rest,
          user_id: userId,
          broker_connection_id: connectionId,
          ...(ticket ? { broker_ticket: String(ticket) } : {}),
        };
      });

    // A trade's own broker ticket is the true identity when present;
    // otherwise symbol+time is the identity. The table enforces BOTH as
    // separate unique constraints, so a ticketed row can silently collide
    // with an existing ticket-less row (or vice versa) on the OTHER
    // constraint, which a single ON CONFLICT target can't catch. Look up
    // existing rows for THIS connection only (so a sync never touches or
    // matches trades belonging to a different account) and split into
    // explicit insert/update.
    const { data: existingRows, error: existingError } = await supabase
      .from('trades')
      .select('id, symbol, entry_time, broker_ticket')
      .eq('user_id', userId)
      .eq('broker_connection_id', connectionId);
    if (existingError) {
      return Response.json({ error: existingError.message }, { status: 500 });
    }

    const byTicket = new Map();
    const bySymbolTime = new Map();
    for (const row of existingRows || []) {
      if (row.broker_ticket) byTicket.set(row.broker_ticket, row.id);
      bySymbolTime.set(`${row.symbol}||${row.entry_time}`, row.id);
    }

    const seen = new Map();
    for (const r of validRows) {
      const existingId =
        (r.broker_ticket && byTicket.get(r.broker_ticket)) ||
        bySymbolTime.get(`${r.symbol}||${r.entry_time}`) ||
        null;
      const key = existingId ? `id:${existingId}` : `new:${r.broker_ticket || `${r.symbol}||${r.entry_time}`}`;
      seen.set(key, existingId ? { ...r, id: existingId } : r);
    }
    const finalRows = Array.from(seen.values());
    const toInsert = finalRows.filter((r) => !r.id);
    const toUpdate = finalRows.filter((r) => r.id);

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from('trades').insert(toInsert);
      if (insertError) {
        return Response.json({ error: insertError.message }, { status: 500 });
      }
    }

    if (toUpdate.length > 0) {
      const { error: updateError } = await supabase
        .from('trades')
        .upsert(toUpdate, { onConflict: 'id' });
      if (updateError) {
        return Response.json({ error: updateError.message }, { status: 500 });
      }
    }

    await supabase
      .from('broker_connections')
      .update({ status: 'connected', last_synced_at: new Date().toISOString() })
      .eq('id', connectionId);

    return Response.json({ success: true, tradesSynced: toInsert.length + toUpdate.length });
  } catch (err) {
    return Response.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
