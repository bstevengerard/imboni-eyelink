/**
 * API client - all requests go to backend. Token from localStorage.
 */

/**
 * VITE_API_URL is the ONLY source of truth for backend base URL.
 * - If set: requests go to ${VITE_API_URL}
 * - If not set: requests go to relative paths (works with Vite proxy in dev)
 */
const BASE_URL = import.meta.env.VITE_API_URL || "https://imboni-eyelink-backend-9ezl.onrender.com";

function getToken(): string | null {
  return localStorage.getItem('token');
}

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  message?: string;
  unreadCount?: number;
  alreadyExists?: boolean;
};

async function request<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string> } = {}
): Promise<ApiResponse<T>> {
  const { params, ...fetchOptions } = options;
  const url = params
    ? `${BASE_URL}${path}?${new URLSearchParams(params).toString()}`
    : `${BASE_URL}${path}`;
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    ...fetchOptions,
    headers,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || res.statusText || 'Request failed');
  }
  return json as ApiResponse<T>;
}

export const api = {
   BASE_URL,
   getToken,
   setToken(token: string) {
    localStorage.setItem('token', token);
  },
  clearToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  setUser(user: object) {
    localStorage.setItem('user', JSON.stringify(user));
  },
  getUser(): { id: string | number; email: string; name: string; role: string } | null {
    const u = localStorage.getItem('user');
    if (!u || u === 'undefined' || u === 'null') {
      localStorage.removeItem('user');
      return null;
    }
    try {
      return JSON.parse(u);
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  },

  get: <T>(path: string, params?: Record<string, string>) =>
    request<T>(path, { method: 'GET', params }),
  post: <T>(path: string, body?: object) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: object) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: object) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  
  upload: async (path: string, formData: FormData): Promise<ApiResponse<{ url: string; filename: string }>> => {
    const token = getToken();
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      body: formData,
      headers,
    });
    
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.message || res.statusText || 'Upload failed');
    }
    return json as ApiResponse<{ url: string; filename: string }>;
  },
};

export default api;
