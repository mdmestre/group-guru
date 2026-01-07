export async function apiFetch(path: string, options: RequestInit = {}) {
  const base = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL) || 'http://localhost:3001';
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string,string> = {
    'Content-Type': 'application/json',
    ...(options.headers ? (options.headers as Record<string,string>) : {})
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(base + path, { ...options, headers });
  const text = await res.text();
  try { return JSON.parse(text); } catch (e) { return text; }
}

export function setAuthToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('auth_token', token);
  else localStorage.removeItem('auth_token');
}

export function setAuthUser(user: unknown | null) {
  if (typeof window === 'undefined') return;
  if (user) localStorage.setItem('auth_user', JSON.stringify(user));
  else localStorage.removeItem('auth_user');
}

export function getAuthUser() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('auth_user') || 'null'); } catch (e) { return null; }
}

async function request(path: string, options: RequestInit = {}) {
  return apiFetch(path, options);
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: unknown) =>
    request(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    }),
  put: (path: string, body?: unknown) =>
    request(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    }),
  delete: (path: string) =>
    request(path, { method: 'DELETE' })
};
