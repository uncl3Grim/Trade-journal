import { createClient } from '@supabase/supabase-js';
import { getAccountStatus, getHistoricalTrades } from '../../../../lib/metaapi';

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

    const status = await getAccountStatus(connection.metaapi_account_id);
    if (status.connectionStatus !== 'CONNECTED') {
      return Response.json(
        { error: `Account not ready yet (status: ${status.connectionStatus || status.state}). Try again in a minute.` },
        { status: 409 }
      );
    }

    const endTime = new Date().toISOString();
    const startTime = new Date(0).toISOString();
    const mt5Trades = await getHistoricalTrades(connection.metaapi_account_id, startTime, endTime);

    const rows = (mt5Trades || [])
      .filter((t) => t.type === 'DEAL_TYPE_BUY' || t.type === 'DEAL_TYPE_SELL')
      .map((t) => ({
        user_id: userId,
        symbol: t.symbol,
        direction: t.type === 'DEAL_TYPE_BUY' ? 'long' : 'short',
        entry_price: t.openPrice ?? t.price,
        exit_price: t.closePrice ?? null,
        size: t.volume,
        entry_time: t.openTime ?? t.time,
        exit_time: t.closeTime ?? null,
        pnl: t.profit ?? 0,
        source: 'mt5_sync',
      }));

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from('trades').upsert(rows, {
        onConflict: 'user_id,symbol,entry_time',
        ignoreDuplicates: true,
      });
      if (insertError) {
        return Response.json({ error: insertError.message }, { status: 500 });
      }
    }

    await supabase
      .from('broker_connections')
      .update({ status: 'connected', last_synced_at: new Date().toISOString() })
      .eq('id', connectionId);

    return Response.json({ success: true, tradesSynced: rows.length });
  } catch (err) {
    return Response.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
