const PROVISIONING_URL = 'https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai';
const METASTATS_URL = 'https://metastats-api-v1.agiliumtrade.agiliumtrade.ai';

function headers() {
  return {
    'auth-token': process.env.METAAPI_TOKEN,
    'Content-Type': 'application/json',
  };
}

export async function createMetaApiAccount({ login, investorPassword, server, name }) {
  try {
    const res = await fetch(`${PROVISIONING_URL}/users/current/accounts`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        login,
        password: investorPassword,
        name: name || `Trade Journal - ${login}`,
        server,
        platform: 'mt5',
        magic: 0,
        manualTrades: true,
        quoteStreamingIntervalInSeconds: 2.5,
      }),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }

    if (!res.ok) {
      console.error('MetaApi createAccount failed', res.status, data);
      throw new Error(data.message || `MetaApi returned ${res.status}`);
    }
    return data;
  } catch (err) {
    console.error('MetaApi createAccount network error', {
      message: err.message,
      cause: err.cause ? String(err.cause) : undefined,
      hasToken: !!process.env.METAAPI_TOKEN,
    });
    throw new Error(
      `MetaApi request failed: ${err.message}${err.cause ? ` (${err.cause})` : ''}`
    );
  }
}

export async function getAccountStatus(accountId) {
  const res = await fetch(`${PROVISIONING_URL}/users/current/accounts/${accountId}`, {
    headers: headers(),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('MetaApi getAccountStatus failed', res.status, data);
    throw new Error(data.message || 'Failed to fetch account status');
  }
  return data;
}

export async function deployAccount(accountId) {
  const res = await fetch(`${PROVISIONING_URL}/users/current/accounts/${accountId}/deploy`, {
    method: 'POST',
    headers: headers(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.error('MetaApi deployAccount failed', res.status, data);
    throw new Error(data.message || 'Failed to deploy account');
  }
}

export async function getHistoricalTrades(accountId, startTime, endTime) {
  const url = `${METASTATS_URL}/users/current/accounts/${accountId}/historical-trades/${startTime}/${endTime}`;
  const res = await fetch(url, { headers: headers() });
  const data = await res.json();
  if (!res.ok) {
    console.error('MetaApi getHistoricalTrades failed', res.status, data);
    throw new Error(data.message || 'Failed to fetch trade history');
  }
  return data;
}
