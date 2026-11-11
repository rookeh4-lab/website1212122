import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { verifyPortalToken } from './cryptoUtils.js';

dotenv.config();

// Ensure WebSocket polyfill in Node environment for Realtime/Supabase
if (typeof global !== 'undefined' && !global.WebSocket) {
  global.WebSocket = WebSocket;
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://thmpaozerfhoykqxwrlz.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || Buffer.from('c2Jfc2VjcmV0X0VZcW5BdWxHTTRXbkRqVUhMSFlyZVFfd3lNQXRsOEg=', 'base64').toString('utf-8');

if (!supabaseServiceKey) {
  console.warn('[SupabaseAdmin] SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables.');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Verifies a Supabase JWT token and fetches user + profile data.
 * @param {string} token
 * @returns {Promise<{user: object, profile: object}|null>}
 */
export async function authenticateToken(token) {
  if (!token) return null;
  try {
    // 1. Check signed license-key portal token first
    const portalData = verifyPortalToken(token);
    if (portalData?.license_key) {
      return {
        user: {
          id: portalData.user_id || portalData.license_id,
          email: portalData.masked_email || '',
          created_at: new Date().toISOString(),
        },
        profile: {
          id: portalData.user_id || portalData.license_id,
          email: portalData.masked_email || '',
          username: portalData.username || portalData.license_key.slice(0, 9),
          display_name: portalData.display_name || portalData.license_key.slice(0, 9),
          role: 'user',
        },
        isPortalKey: true,
        portalLicenseId: portalData.license_id,
        portalLicenseKey: portalData.license_key,
      };
    }

    // 2. Standard Supabase Auth JWT
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;

    // Fetch user profile from public.profiles
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return { user, profile: profile || { id: user.id, email: user.email, role: 'user' } };
  } catch (err) {
    console.error('[SupabaseAdmin] Token auth error:', err.message);
    return null;
  }
}

/**
 * Express Middleware: Require Valid Supabase Authentication
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or invalid format (Bearer token required)' });
  }

  const token = authHeader.split(' ')[1];
  const authResult = await authenticateToken(token);

  if (!authResult) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }

  if (authResult.profile?.banned_at) {
    return res.status(403).json({
      error: 'Account suspended',
      reason: authResult.profile.ban_reason || 'Violation of terms of service',
    });
  }

  req.user = authResult.user;
  req.profile = authResult.profile;
  req.isPortalKey = Boolean(authResult.isPortalKey);
  req.portalLicenseId = authResult.portalLicenseId || null;
  req.portalLicenseKey = authResult.portalLicenseKey || null;
  next();
}

/**
 * Express Middleware: Require Admin Privileges
 */
export async function requireAdmin(req, res, next) {
  await requireAuth(req, res, async () => {
    if (req.isPortalKey) {
      return res.status(403).json({ error: 'Administrator access requires account sign-in' });
    }
    const isOwner = req.user?.email === 'rookeh4@gmail.com' || req.profile?.email === 'rookeh4@gmail.com';
    if (req.profile?.role !== 'admin' && !isOwner) {
      return res.status(403).json({ error: 'Administrator access required' });
    }
    next();
  });
}
