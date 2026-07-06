'use client';
// Client-side helper: attach token, call API, handle auth redirect.
export function getToken() {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(/ots_token=([^;]+)/);
  return m ? m[1] : '';
}
export function logout() {
  document.cookie = 'ots_token=; path=/; max-age=0';
  window.location.href = '/login';
}
export async function api(path, opts = {}) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (res.status === 401) { logout(); return null; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
export const money = (n) => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const pct = (n) => (Number(n) || 0).toFixed(1) + '%';
