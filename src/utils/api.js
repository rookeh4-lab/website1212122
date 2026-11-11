import { supabase } from '../lib/supabaseClient';

export const API_BASE = '/api';

export function isTokenExpired(token) {
  if (!token || typeof token !== 'string') return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    // Expired or expiring within 60 seconds
    return payload.exp * 1000 < (Date.now() + 60000);
  } catch {
    return true;
  }
}

export const auth = {
  supabase,

  /**
   * Get current Supabase Auth access token synchronously
   */
  getToken() {
    try {
      // 1. Check Supabase client persistent storage
      const raw = localStorage.getItem('555_supabase_auth_token');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.access_token && !isTokenExpired(parsed.access_token)) {
            localStorage.setItem('plutora_token', parsed.access_token);
            return parsed.access_token;
          }
        } catch {}
      }

      // 2. Check cached plutora_token
      const stored = localStorage.getItem('plutora_token');
      if (stored && stored !== 'undefined' && stored !== 'null' && !isTokenExpired(stored)) {
        return stored;
      }
    } catch {
      // Fallback
    }
    return null;
  },

  /**
   * Asynchronous token getter ensuring an active, unexpired session
   */
  async getAsyncToken() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        if (!isTokenExpired(session.access_token)) {
          localStorage.setItem('plutora_token', session.access_token);
          return session.access_token;
        }
        // Token is expired: perform active refresh
        const { data: refData, error: refErr } = await supabase.auth.refreshSession();
        if (!refErr && refData?.session?.access_token) {
          localStorage.setItem('plutora_token', refData.session.access_token);
          return refData.session.access_token;
        }
      } else {
        const { data: refData, error: refErr } = await supabase.auth.refreshSession();
        if (!refErr && refData?.session?.access_token) {
          localStorage.setItem('plutora_token', refData.session.access_token);
          return refData.session.access_token;
        }
      }
    } catch {
      // ignore
    }
    return this.getToken();
  },

  setToken(t) {
    if (t) localStorage.setItem('plutora_token', t);
    else localStorage.removeItem('plutora_token');
  },

  async clear() {
    localStorage.removeItem('plutora_token');
    localStorage.removeItem('plutora_user');
    localStorage.removeItem('555_supabase_auth_token');
    try {
      await supabase.auth.signOut();
    } catch {}
  },

  /**
   * Real user profile retrieval from Supabase Auth + profiles table (or Key Portal fallback)
   */
  async getProfile() {
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        const token = localStorage.getItem('plutora_token');
        if (token && !isTokenExpired(token)) {
          const res = await fetch(`${API_BASE}/auth/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.valid && data.user) {
              localStorage.setItem('plutora_user', JSON.stringify(data.user));
              return { user: data.user, role: data.user.role };
            }
          }
        }
        return null;
      }

      // Fetch profile from public.profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const resolvedUser = {
        id: user.id,
        email: user.email,
        discordId: profile?.discord_id || user.user_metadata?.discord_id || null,
        username: profile?.username || user.user_metadata?.username || user.email.split('@')[0],
        displayName: profile?.display_name || user.user_metadata?.display_name || profile?.username || user.email.split('@')[0],
        avatar: profile?.avatar_url || user.user_metadata?.avatar_url || null,
        role: (profile?.role === 'admin' || user.email?.toLowerCase() === 'rookeh4@gmail.com') ? 'admin' : (profile?.role || 'user'),
        createdAt: profile?.created_at || user.created_at,
        bannedAt: profile?.banned_at || null,
      };

      localStorage.setItem('plutora_user', JSON.stringify(resolvedUser));
      return { user: resolvedUser, role: resolvedUser.role };
    } catch (err) {
      console.error('[auth.getProfile] Error:', err);
      return null;
    }
  },

  /**
   * User Registration with Email and Password (verified & instant session)
   */
  async signUp(email, password, username) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        password,
        username: (username || '').trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || 'Registration failed.');
    }

    if (data.session?.access_token && data.session?.refresh_token) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      this.setToken(data.session.access_token);
    }
    return data;
  },

  /**
   * User Login with Email and Password
   */
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (data.session?.access_token) {
      this.setToken(data.session.access_token);
    }
    return data;
  },

  /**
   * Password Reset Email
   */
  async resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login?reset=true`,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Sign Out
   */
  async signOut() {
    await this.clear();
  },
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
