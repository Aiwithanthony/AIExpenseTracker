const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const api = {
  async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('admin_token');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  },

  // Admin endpoints (to be implemented in backend)
  async getUsers() {
    return this.request('/admin/users');
  },

  async getSubscribers() {
    return this.request('/admin/subscribers');
  },

  async getPayments() {
    return this.request('/admin/payments');
  },

  async getStats() {
    return this.request('/admin/stats');
  },
};

