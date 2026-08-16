import { createClient } from '@supabase/supabase-js';
import { buildTradeSummary } from '../../../../lib/aiSummary';

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

    const { defaultRiskAmount } = await request.json();

    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .order('entry_time', { ascending: true });

    if (tradesError) {
      return Response.json({ error: tradesError.message }, { status: 500 });
    }
    if (!trades || trades.length === 0) {
      return Response.json({ error: 'No trades found to analyze yet.' }, { status: 400 });
    }

    const summary = buildTradeSummary(trades, defaultRiskAmount);

    const prompt = `You are a trading coach reviewing a trader's journal data. Below is a statistical summary of their trades (not the raw trade list). Give specific, actionable feedback: 2-3 clear strengths, 2-3 clear weaknesses/leaks, and 3 concrete suggestions to improve. Be direct and concise, use the actual numbers given. Do not add generic disclaimers.

Trading data summary:
${summary}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Anthropic API error', data);
      return Response.json({ error: data.error?.message || 'AI analysis failed' }, { status: 500 });
    }

    const text = data.content?.map((c) => c.text || '').join('\n') || 'No analysis returned.';

    return Response.json({ analysis: text });
  } catch (err) {
    console.error('AI analyze error', err);
    return Response.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
