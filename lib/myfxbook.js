const BASE_URL = 'https://www.myfxbook.com/api';

export async function myfxbookLogin(email, password) {
  const url = `${BASE_URL}/login.json?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
  const res = await fetch(url);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error('MyFXBook login: non-JSON response', text.slice(0, 300));
    throw new Error('MyFXBook login returned an unexpected response');
  }

  console.error('MyFXBook login response', data);

  if (data.error) {
    throw new Error(`Login failed: ${data.message || 'unknown error'}`);
  }
  if (!data.session) {
    throw new Error('Login succeeded but no session token was returned');
  }
  return data.session;
}

export async function myfxbookGetAccounts(session) {
  const url = `${BASE_URL}/get-my-accounts.json?session=${encodeURIComponent(session)}`;
  const res = await fetch(url);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error('MyFXBook get-accounts: non-JSON response', text.slice(0, 300));
    throw new Error('MyFXBook accounts lookup returned an unexpected response');
  }

  console.error('MyFXBook get-accounts response', data);

  if (data.error) {
    throw new Error(`Accounts lookup failed: ${data.message || 'unknown error'}`);
  }
  return data.accounts || [];
}

export async function myfxbookGetHistory(session, accountId) {
  const url = `${BASE_URL}/get-history.json?session=${encodeURIComponent(session)}&id=${accountId}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) {
    console.error('MyFXBook get-history failed', data);
    throw new Error(data.message || 'Failed to fetch MyFXBook history');
  }
  return data.history || [];
}

export function parseMyfxbookDate(str) {
  if (!str) return null;
  const [datePart, timePart] = str.split(' ');
  const [month, day, year] = datePart.split('/').map(Number);
  const [hour, minute] = (timePart || '00:00').split(':').map(Number);
  const d = new Date(year, month - 1, day, hour, minute);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
