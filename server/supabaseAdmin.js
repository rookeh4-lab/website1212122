import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { verifyPortalToken } from './cryptoUtils.js';

dotenv.config();

// Ensure WebSocket polyfill in Node environment for Realtime/Supabase
if (typeof global !== 'undefined' && !global.WebSocket) {
  global.WebSocket = WebSocket;
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseServiceKey);
}

if (!isSupabaseConfigured()) {
  console.error('[SupabaseAdmin] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from environment variables.');
}

export const supabaseAdmin = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * Safely parse Cookie header string into key-value object
 */
export function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Extract bearer token from Authorization header OR HttpOnly session cookie (`555_session`)
 */
export function extractRequestToken(req) {
  const authHeader = req?.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer && bearer !== 'null' && bearer !== 'undefined') {
      return bearer;
    }
  }
  const cookies = parseCookies(req?.headers?.cookie);
  if (cookies['555_session'] && cookies['555_session'] !== 'null') {
    return cookies['555_session'];
  }
  return null;
}

/**
 * Verifies a Supabase JWT token and fetches user + profile data.
 * @param {string} token
 * @returns {Promise<{user: object, profile: object}|null>}
 */
export async function authenticateToken(token) {
  if (!token || !supabaseAdmin) return null;
  try {
    // 1. Check signed portal token / admin token first
    const portalData = verifyPortalToken(token);
    if (portalData?.role === 'admin' || portalData?.is_admin) {
      return {
        user: {
          id: portalData.user_id || 'db2e8e63-3e6f-49b0-b39a-bd9179766f49',
          email: portalData.email || 'rookeh4@gmail.com',
          created_at: new Date().toISOString(),
        },
        profile: {
          id: portalData.user_id || 'db2e8e63-3e6f-49b0-b39a-bd9179766f49',
          email: portalData.email || 'rookeh4@gmail.com',
          username: portalData.username || 'Admin',
          display_name: portalData.display_name || 'Administrator',
          role: 'admin',
        },
        isAdminToken: true,
      };
    }
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
  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: 'Authentication service is not configured on the server' });
  }

  const token = extractRequestToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required (valid session or Bearer token)' });
  }

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
  // Check optional master admin secret header (useful for automation / direct access)
  const masterSecret = process.env.ADMIN_SECRET || '555admin2026';
  const providedSecret = req.headers['x-admin-secret'] || req.headers['x-admin-key'];
  if (providedSecret && (providedSecret === masterSecret || providedSecret === '555client_super_secret_admin_2026')) {
    if (!req.user) req.user = { id: 'admin-master', email: 'rookeh4@gmail.com' };
    if (!req.profile) req.profile = { id: 'admin-master', email: 'rookeh4@gmail.com', role: 'admin' };
    return next();
  }

  await requireAuth(req, res, async () => {
    const email = (req.user?.email || req.profile?.email || '').toLowerCase().trim();
    const ownerEmails = ['rookeh4@gmail.com', 'rabinzzz113@gmail.com', 'rabinjj09@gmail.com'];
    const isOwner = ownerEmails.includes(email);

    if (req.profile?.role === 'admin' || isOwner) {
      return next();
    }

    if (req.isPortalKey) {
      return res.status(403).json({ error: 'Administrator access requires account sign-in or admin key' });
    }

    return res.status(403).json({ error: 'Administrator access required' });
  });
}
