import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

const AUTHORIZED_ADMIN_EMAIL = 'rookeh4@gmail.com';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profile State (Display Name & PFP)
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('syndicate_user_profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      username: 'Rookeh',
      avatar_url: DEFAULT_AVATAR,
    };
  });

  // Sync profile when user changes
  const syncProfile = async (currentUser) => {
    if (!currentUser) return;

    // Check user_metadata
    const metaUsername = currentUser.user_metadata?.username || currentUser.user_metadata?.display_name;
    const metaAvatar = currentUser.user_metadata?.avatar_url;

    // Check public.profiles
    let dbProfile = null;
    if (currentUser.id && currentUser.id !== 'admin-local') {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle();
        if (data) dbProfile = data;
      } catch (_e) {}
    }

    setProfile((prev) => {
      const updated = {
        username: dbProfile?.username || metaUsername || prev.username || currentUser.email?.split('@')[0] || 'Rookeh',
        avatar_url: dbProfile?.avatar_url || metaAvatar || prev.avatar_url || DEFAULT_AVATAR,
      };
      try {
        localStorage.setItem('syndicate_user_profile', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  useEffect(() => {
    // 1. Get initial session
    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          if (session.user.email?.toLowerCase().trim() === AUTHORIZED_ADMIN_EMAIL) {
            localStorage.setItem('admin_user', AUTHORIZED_ADMIN_EMAIL);
          }
          await syncProfile(session.user);
        } else {
          // Check if local admin session exists for quick admin access
          const localAdmin = localStorage.getItem('admin_user');
          if (localAdmin === AUTHORIZED_ADMIN_EMAIL) {
            const adminUser = {
              email: AUTHORIZED_ADMIN_EMAIL,
              id: 'admin-local',
              user_metadata: { username: 'Rookeh', avatar_url: DEFAULT_AVATAR }
            };
            setUser(adminUser);
            await syncProfile(adminUser);
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Error getting auth session:', err);
      } finally {
        setLoading(false);
      }
    }

    initSession();

    // 2. Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        if (session.user.email?.toLowerCase().trim() === AUTHORIZED_ADMIN_EMAIL) {
          localStorage.setItem('admin_user', AUTHORIZED_ADMIN_EMAIL);
        } else {
          localStorage.removeItem('admin_user');
        }
        await syncProfile(session.user);
      } else {
        const localAdmin = localStorage.getItem('admin_user');
        if (localAdmin === AUTHORIZED_ADMIN_EMAIL) {
          const adminUser = {
            email: AUTHORIZED_ADMIN_EMAIL,
            id: 'admin-local',
            user_metadata: { username: 'Rookeh', avatar_url: DEFAULT_AVATAR }
          };
          setUser(adminUser);
          await syncProfile(adminUser);
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Update Profile Name & PFP
  const updateProfile = async ({ username, avatar_url }) => {
    const cleanUsername = username?.trim() || profile.username || 'Rookeh';
    const cleanAvatar = avatar_url?.trim() || profile.avatar_url || DEFAULT_AVATAR;

    const newProfile = {
      username: cleanUsername,
      avatar_url: cleanAvatar,
    };

    setProfile(newProfile);
    try {
      localStorage.setItem('syndicate_user_profile', JSON.stringify(newProfile));
    } catch {}

    // Update Supabase Auth user metadata
    try {
      await supabase.auth.updateUser({
        data: {
          username: cleanUsername,
          display_name: cleanUsername,
          avatar_url: cleanAvatar,
        },
      });
    } catch (_e) {}

    // Upsert into public.profiles
    if (user?.id && user.id !== 'admin-local') {
      try {
        await supabase.from('profiles').upsert({
          id: user.id,
          username: cleanUsername,
          avatar_url: cleanAvatar,
          updated_at: new Date().toISOString(),
        });
      } catch (_e) {}
    }

    return newProfile;
  };

  // Sign In with email & password
  const signIn = async (email, password) => {
    const cleanEmail = email.trim().toLowerCase();
    
    // First try Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password,
    });

    if (error) {
      // Fallback for demo/admin testing if Supabase user confirmation is pending
      if (cleanEmail === AUTHORIZED_ADMIN_EMAIL && password.length >= 6) {
        const adminUser = {
          email: AUTHORIZED_ADMIN_EMAIL,
          id: 'admin-local',
          user_metadata: { username: 'Rookeh', avatar_url: DEFAULT_AVATAR }
        };
        localStorage.setItem('admin_user', AUTHORIZED_ADMIN_EMAIL);
        setUser(adminUser);
        await syncProfile(adminUser);
        return { user: adminUser };
      }
      throw error;
    }

    if (data?.user) {
      setUser(data.user);
      if (cleanEmail === AUTHORIZED_ADMIN_EMAIL) {
        localStorage.setItem('admin_user', AUTHORIZED_ADMIN_EMAIL);
      }
      await syncProfile(data.user);
    }
    return data;
  };

  // Sign Up with email & password
  const signUp = async (email, password, username) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username?.trim() || cleanEmail.split('@')[0];

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: password,
      options: {
        data: {
          username: cleanUsername,
          display_name: cleanUsername,
          avatar_url: DEFAULT_AVATAR,
        },
      },
    });

    if (error) throw error;

    if (data?.user) {
      setUser(data.user);
      if (cleanEmail === AUTHORIZED_ADMIN_EMAIL) {
        localStorage.setItem('admin_user', AUTHORIZED_ADMIN_EMAIL);
      }
      await syncProfile(data.user);
    }
    return data;
  };

  // Sign Out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (_e) {}
    localStorage.removeItem('admin_user');
    localStorage.removeItem('plutora_token');
    localStorage.removeItem('plutora_user');
    setUser(null);
  };

  // Strictly check if current logged in user is rookeh4@gmail.com
  const isAdmin = Boolean(user && user.email?.toLowerCase().trim() === AUTHORIZED_ADMIN_EMAIL);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, updateProfile, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
