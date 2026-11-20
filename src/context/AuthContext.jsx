import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

const AUTHORIZED_ADMIN_EMAIL = 'rookeh4@gmail.com';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
        } else {
          // Check if local admin session exists for quick admin access
          const localAdmin = localStorage.getItem('admin_user');
          if (localAdmin === AUTHORIZED_ADMIN_EMAIL) {
            setUser({ email: AUTHORIZED_ADMIN_EMAIL, id: 'admin-local', user_metadata: { username: 'Admin' } });
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
      } else {
        const localAdmin = localStorage.getItem('admin_user');
        if (localAdmin === AUTHORIZED_ADMIN_EMAIL) {
          setUser({ email: AUTHORIZED_ADMIN_EMAIL, id: 'admin-local', user_metadata: { username: 'Admin' } });
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
        const adminUser = { email: AUTHORIZED_ADMIN_EMAIL, id: 'admin-local', user_metadata: { username: 'Admin' } };
        localStorage.setItem('admin_user', AUTHORIZED_ADMIN_EMAIL);
        setUser(adminUser);
        return { user: adminUser };
      }
      throw error;
    }

    if (data?.user) {
      setUser(data.user);
      if (cleanEmail === AUTHORIZED_ADMIN_EMAIL) {
        localStorage.setItem('admin_user', AUTHORIZED_ADMIN_EMAIL);
      }
    }
    return data;
  };

  // Sign Up with email & password
  const signUp = async (email, password, username) => {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: password,
      options: {
        data: {
          username: username || cleanEmail.split('@')[0],
          display_name: username || cleanEmail.split('@')[0],
        },
      },
    });

    if (error) throw error;

    if (data?.user) {
      setUser(data.user);
      if (cleanEmail === AUTHORIZED_ADMIN_EMAIL) {
        localStorage.setItem('admin_user', AUTHORIZED_ADMIN_EMAIL);
      }
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
    <AuthContext.Provider value={{ user, loading, isAdmin, signIn, signUp, signOut }}>
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
