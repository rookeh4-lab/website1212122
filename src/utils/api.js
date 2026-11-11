import { supabase } from '../lib/supabaseClient';

export const API_BASE = '/api';

export const auth = {
  supabase,

  /**
   * Get current Supabase Auth access token
   */
  async getToken() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        localStorage.setItem('plutora_token', session.access_token);
        return session.access_token;
      }
    } catch {
      // Fallback
    }
    return localStorage.getItem('plutora_token') || null;
  },

  setToken(t) {
    if (t) localStorage.setItem('plutora_token', t);
    else localStorage.removeItem('plutora_token');
  },

  async clear() {
    localStorage.removeItem('plutora_token');
    localStorage.removeItem('plutora_user');
    try {
      await supabase.auth.signOut();
    } catch {}
  },

  /**
   * Real user profile retrieval from Supabase Auth + profiles table
   */
  async getProfile() {
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        // Try via stored token or backend verify
        const token = localStorage.getItem('plutora_token');
        if (token) {
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
        username: profile?.username || user.user_metadata?.username || user.email.split('@')[0],
        displayName: profile?.display_name || user.user_metadata?.display_name || user.email.split('@')[0],
        avatar: profile?.avatar_url || user.user_metadata?.avatar_url || null,
        role: profile?.role || 'user',
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
   * User Registration with Email and Password
   */
  async signUp(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0],
          display_name: username || email.split('@')[0],
        },
      },
    });
    if (error) throw error;
    if (data.session?.access_token) {
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
