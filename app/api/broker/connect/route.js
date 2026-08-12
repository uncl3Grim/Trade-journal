import { createClient } from '@supabase/supabase-js';
import { createMetaApiAccount, deployAccount } from '../../../../lib/metaapi';

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

    const { server, login, investorPassword } = await request.json();
    if (!server || !login || !investorPassword) {
      return Response.json({ error: 'Missing server, login, or investor password' }, { status: 400 });
    }

    const account = await createMetaApiAccount({
      login,
      investorPassword,
      server,
      name: `Trade Journal - ${login}`,
    });

    await deployAccount(account.id);

    const { error: insertError } = await supabase.from('broker_connections').insert({
      user_id: userId,
      broker_server: server,
      mt5_login: login,
      metaapi_account_id: account.id,
      status: 'deploying',
    });

    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 });
    }

    return Response.json({ success: true, accountId: account.id });
  } catch (err) {
    return Response.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
