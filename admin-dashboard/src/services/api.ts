const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const TOKEN_KEY = 'admin_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Thrown for non-2xx responses, carrying the HTTP status so callers can branch on 401/403. */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json();
      message = body.message || message;
    } catch {
      /* non-JSON error body */
    }
    // Expired/invalid session — drop the token so the app redirects to login.
    if (response.status === 401) {
      clearToken();
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return {} as T;
  }
  return response.json() as Promise<T>;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  subscriptionTier: string;
}

export interface Stats {
  totalUsers: number;
  activeSubscribers: number;
  totalRevenue: number;
  expensesLogged: number;
}

export const api = {
  async login(email: string, password: string): Promise<{ access_token: string }> {
    const result = await request<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(result.access_token);
    return result;
  },

  getCurrentUser(): Promise<AdminUser> {
    return request<AdminUser>('/auth/me');
  },

  logout(): void {
    clearToken();
  },

  getStats(): Promise<Stats> {
    return request<Stats>('/admin/stats');
  },

  getUsers(): Promise<{ users: any[]; total: number }> {
    return request('/admin/users');
  },

  getSubscribers(): Promise<{ subscribers: any[]; total: number }> {
    return request('/admin/subscribers');
  },

  getPayments(): Promise<{ payments: any[]; total: number }> {
    return request('/admin/payments');
  },
};
