import { useDemoStore } from '@stores/useDemoStore';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('vectis_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 401) {
      const text = await res.text();
      throw new Error(`HTTP 401: ${text}`);
    }
    if (res.status === 403) {
      const text = await res.text();
      if (text.includes('Demo mode')) {
        useDemoStore.getState().showDemoToast();
        return new Promise<T>(() => {});
      }
      throw new Error(`HTTP 403: ${text}`);
    }
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  async get<T = unknown>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { ...getAuthHeaders() },
      credentials: 'include',
    });
    return handleResponse<T>(res);
  },

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async del<T = unknown>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
      credentials: 'include',
    });
    return handleResponse<T>(res);
  },
};
