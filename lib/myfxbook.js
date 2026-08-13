const BASE_URL = 'https://www.myfxbook.com/api';

export async function myfxbookLogin(email, password) {
  const url = `${BASE_URL}/login.json?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) {
    throw new Error(data.message || 'MyFXBook login failed');
  }
  return data.session;
}

export async function myfxbookGetAccounts(session) {
  const url = `${BASE_URL}/get-my-accounts.json?session=${encodeURIComponent(session)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) {
    throw new Error(data.message || 'Failed to fetch MyFXBook accounts');
  }
  return data.accounts || [];
}

export async function myfxbookGetHistory(session, accountId) {
  const url = `${BASE_URL}/get-history.json?session=${encodeURIComponent(session)}&id=${accountId}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) {
    throw new Error(data.message || 'Failed to fetch MyFXBook history');
  }
  return data.history || [];
}

// MyFXBook dates come as "MM/DD/YYYY HH:mm" — convert to ISO
export function parseMyfxbookDate(str) {
  if (!str) return null;
  const [datePart, timePart] = str.split(' ');
  const [month, day, year] = datePart.split('/').map(Number);
  const [hour, minute] = (timePart || '00:00').split(':').map(Number);
  const d = new Date(year, month - 1, day, hour, minute);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
