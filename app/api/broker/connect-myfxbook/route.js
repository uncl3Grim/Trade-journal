import { createClient } from '@supabase/supabase-js';
import { myfxbookLogin, myfxbookGetAccounts } from '../../../../lib/myfxbook';

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

    const { email, password, accountId } = await request.json();
    if (!email || !password) {
      return Response.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const session = await myfxbookLogin(email, password);
    const accounts = await myfxbookGetAccounts(session);

    if (!accounts.length) {
      return Response.json(
        { error: 'No accounts found on this MyFXBook login. Make sure your MT5 account is added and synced on myfxbook.com first.' },
        { status: 404 }
      );
    }

    // Multiple accounts and no specific one chosen yet — ask the client to pick
    if (accounts.length > 1 && !accountId) {
      return Response.json({
        needsSelection: true,
        accounts: accounts.map((a) => ({
          id: a.id,
          name: a.name,
          server: a.serverName || 'MyFXBook',
        })),
      });
    }

    const account = accountId ? accounts.find((a) => String(a.id) === String(accountId)) : accounts[0];
    if (!account) {
      return Response.json({ error: 'Selected account not found' }, { status: 404 });
    }

    const { error: insertError } = await supabase.from('broker_connections').insert({
      user_id: userId,
      broker_type: 'myfxbook',
      broker_server: account.serverName || 'MyFXBook',
      mt5_login: String(account.accountId || account.id || ''),
      myfxbook_email: email,
      myfxbook_password: password,
      myfxbook_account_id: String(account.id),
      status: 'connected',
    });

    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 });
    }

    return Response.json({ success: true, accountName: account.name });
  } catch (err) {
    return Response.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
