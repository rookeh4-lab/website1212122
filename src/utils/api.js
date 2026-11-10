export const API_BASE = '/api';

export const auth = {
  getToken() {
    return localStorage.getItem('plutora_token') || null;
  },
  setToken(t) {
    localStorage.setItem('plutora_token', t);
  },
  clear() {
    localStorage.removeItem('plutora_token');
    localStorage.removeItem('plutora_user');
  },
  async getProfile() {
    const token = this.getToken();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          localStorage.setItem('plutora_user', JSON.stringify(data.user));
        }
        return data;
      }
      if (res.status === 401) {
        this.clear();
        return null;
      }
    } catch {
      // Fallback
    }

    const cached = localStorage.getItem('plutora_user');
    if (cached) {
      try {
        return { user: JSON.parse(cached) };
      } catch {}
    }

    // Default mock user profile if token exists (e.g. tested via UI)
    return {
      user: {
        id: 'user_demo',
        username: '555User',
        email: localStorage.getItem('plutora_user_email') || 'user@example.com',
        avatar: null
      }
    };
  }
};

export function copyText(text) {
  if (navigator?.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
  return Promise.resolve();
}
