const PROVISIONING_URL = 'https://mt-provisioning-api-v1.agiliumtrade.ai';
const METASTATS_URL = 'https://metastats-api-v1.agiliumtrade.ai';

function headers() {
  return {
    'auth-token': process.env.METAAPI_TOKEN,
    'Content-Type': 'application/json',
  };
}

export async function createMetaApiAccount({ login, investorPassword, server, name }) {
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

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to create MetaApi account');
  }
  return data;
}

export async function getAccountStatus(accountId) {
  const res = await fetch(`${PROVISIONING_URL}/users/current/accounts/${accountId}`, {
    headers: headers(),
  });
  const data = await res.json();
  if (!res.ok) {
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
    throw new Error(data.message || 'Failed to deploy account');
  }
}

export async function getHistoricalTrades(accountId, startTime, endTime) {
  const url = `${METASTATS_URL}/users/current/accounts/${accountId}/historical-trades/${startTime}/${endTime}`;
  const res = await fetch(url, { headers: headers() });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch trade history');
  }
  return data;
}
