import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  supabaseAdmin,
  isSupabaseConfigured,
  parseCookies,
  extractRequestToken,
  authenticateToken,
  requireAuth,
  requireAdmin,
} from './supabaseAdmin.js';
import {
  signEd25519,
  sha256,
  generateLicenseKey,
  generateToken,
  verifySellAuthWebhook,
  signPortalToken,
  createClientToken,
  getPublicKeySpkiDerBase64,
} from './cryptoUtils.js';

const router = express.Router();
router.use(express.json({
  limit: '50mb',
  verify: (req, _res, buf) => {
    if (!req.rawBody) req.rawBody = buf.toString('utf8');
  },
}));

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://thmpaozerfhoykqxwrlz.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_obBunwnFtclwda77bynVZw_1jsL_pnx';
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1557993745884905512';

const ALLOWED_OAUTH_ORIGINS = new Set([
  'https://www.555client.xyz',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

const ALLOWED_CALLBACK_PATHS = new Set([
  '/login',
  '/api/auth/discord/callback',
]);

const SESSION_COOKIE_NAME = '555_session';
const OAUTH_TX_COOKIE_NAME = 'discord_oauth_tx';

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function isHttpsRequest(req) {
  const proto = req.headers['x-forwarded-proto'];
  if (typeof proto === 'string' && proto.split(',')[0].trim() === 'https') return true;
  if (req.secure) return true;
  const host = String(req.headers.host || '').toLowerCase();
  return host.endsWith('555client.xyz');
}

function appendCookie(req, res, name, value, { maxAgeSeconds = 86400 } = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isHttpsRequest(req)) {
    parts.push('Secure');
  }
  res.append('Set-Cookie', parts.join('; '));
}

function clearCookie(req, res, name) {
  appendCookie(req, res, name, '', { maxAgeSeconds: 0 });
}

function getOAuthStateSecret() {
  const base =
    process.env.OAUTH_STATE_SECRET ||
    process.env.PORTAL_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';
  if (!base) return null;
  return crypto.createHash('sha256').update(`oauth-tx:${base}`).digest();
}

function signOAuthTransaction(payload) {
  const secret = getOAuthStateSecret();
  if (!secret) {
    throw new Error('OAuth state signing key not configured');
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyOAuthTransaction(cookieValue) {
  try {
    const secret = getOAuthStateSecret();
    if (!secret || !cookieValue || typeof cookieValue !== 'string') return null;
    const dot = cookieValue.indexOf('.');
    if (dot <= 0) return null;
    const encoded = cookieValue.slice(0, dot);
    const sig = cookieValue.slice(dot + 1);
    const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!parsed?.exp || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function resolveAllowedOrigin(req) {
  const requested = typeof req.query?.origin === 'string' ? req.query.origin.trim() : '';
  if (requested) {
    try {
      const u = new URL(requested);
      const origin = u.hostname === '555client.xyz' ? 'https://www.555client.xyz' : u.origin;
      if (ALLOWED_OAUTH_ORIGINS.has(origin)) return origin;
    } catch {
      return null;
    }
    return null;
  }
  const host = String(req.headers.host || '').toLowerCase();
  if (host === '555client.xyz' || host === 'www.555client.xyz') {
    return 'https://www.555client.xyz';
  }
  if (host.startsWith('localhost:') || host.startsWith('127.0.0.1:')) {
    return `http://${host}`;
  }
  return 'https://www.555client.xyz';
}

function isValidCallbackUri(uri) {
  try {
    const parsed = new URL(uri);
    const origin = parsed.hostname === '555client.xyz' ? 'https://www.555client.xyz' : parsed.origin;
    return ALLOWED_OAUTH_ORIGINS.has(origin) && ALLOWED_CALLBACK_PATHS.has(parsed.pathname);
  } catch {
    return false;
  }
}

// Lightweight per-IP sliding window rate limiter
const rateBuckets = new Map();
function createRateLimiter({ windowMs = 60_000, max = 30, name = 'default' } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${name}:${getClientIp(req)}`;
    let bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      rateBuckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      const retrySec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retrySec));
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMITED',
        message: 'Too many requests. Please wait a moment and try again.',
      });
    }
    if (rateBuckets.size > 5000) {
      for (const [k, v] of rateBuckets) {
        if (v.resetAt <= now) rateBuckets.delete(k);
      }
    }
    return next();
  };
}

const rateLimitAuth = createRateLimiter({ windowMs: 60_000, max: 30, name: 'auth' });
const rateLimitRedeem = createRateLimiter({ windowMs: 60_000, max: 25, name: 'redeem' });
const rateLimitValidate = createRateLimiter({ windowMs: 60_000, max: 90, name: 'validate' });
const rateLimitReset = createRateLimiter({ windowMs: 60_000, max: 15, name: 'reset' });
const rateLimitTrial = createRateLimiter({ windowMs: 3600_000, max: 12, name: 'trial' });

function serverError(res, label, err, extra = {}) {
  console.error(`[${label}]`, err?.message || err);
  return res.status(500).json({ ...extra, error: 'Internal server error' });
}

// Guard database-backed endpoints when server env vars are missing
router.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (!isSupabaseConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'SERVER_UNCONFIGURED',
      message: 'Server environment configuration is incomplete.',
    });
  }
  return next();
});

// Helper: Issue a real Supabase Auth session for any verified user email via admin magiclink + OTP verify
async function createSupabaseSessionForEmail(email) {
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkErr || !linkData?.properties?.hashed_token) {
    throw new Error(linkErr?.message || 'Could not generate authentication link');
  }

  const verifyRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'magiclink',
      token_hash: linkData.properties.hashed_token,
    }),
  });

  const sessionData = await verifyRes.json();
  if (!verifyRes.ok || !sessionData?.access_token) {
    throw new Error(sessionData?.error_description || sessionData?.msg || 'Failed to verify authentication session');
  }

  return sessionData;
}

// ==============================================================================
// 1. HEALTH, STATUS & REAL STATS
// ==============================================================================
router.get('/health', async (_req, res) => {
  if (!isSupabaseConfigured()) {
    return res.status(503).json({
      status: 'degraded',
      db: 'unconfigured',
      platform: '5.55 Client Licensing System',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const { error } = await supabaseAdmin.from('products').select('id').limit(1);
    if (error) {
      return res.status(503).json({
        status: 'degraded',
        db: 'error',
        platform: '5.55 Client Licensing System',
        timestamp: new Date().toISOString(),
      });
    }
    return res.json({
      status: 'online',
      db: 'connected',
      platform: '5.55 Client Licensing System',
      timestamp: new Date().toISOString(),
    });
  } catch {
    return res.status(503).json({
      status: 'degraded',
      db: 'error',
      platform: '5.55 Client Licensing System',
      timestamp: new Date().toISOString(),
    });
  }
});

router.get('/stats', async (_req, res) => {
  try {
    const activeCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [usersRes, licRes, launchesRes, recentDevicesRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('licenses').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseAdmin.from('audit_logs').select('id', { count: 'exact', head: true }).eq('action', 'CLIENT_LOGIN_SUCCESS'),
      supabaseAdmin.from('devices').select('id', { count: 'exact', head: true }).gte('last_seen_at', activeCutoff),
    ]);

    return res.json({
      liveUsers: recentDevicesRes.count ?? 0,
      totalLaunches: launchesRes.count ?? 0,
      totalUsers: usersRes.count ?? 0,
      totalLicenses: licRes.count ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return serverError(res, 'Stats Error', err);
  }
});

// ==============================================================================
// 2. AUTH VERIFICATION & USER ENDPOINTS
// ==============================================================================

// POST /api/auth/verify
router.post('/auth/verify', async (req, res) => {
  const token = extractRequestToken(req);
  if (!token) {
    return res.status(401).json({ valid: false, error: 'Authentication token required' });
  }

  try {
    const authResult = await authenticateToken(token);
    if (!authResult) {
      clearCookie(req, res, SESSION_COOKIE_NAME);
      return res.status(401).json({ valid: false, error: 'Invalid or expired token' });
    }

    const { user, profile, isPortalKey, portalLicenseId } = authResult;

    if (profile?.banned_at) {
      clearCookie(req, res, SESSION_COOKIE_NAME);
      return res.status(403).json({
        valid: false,
        error: 'Account suspended',
        reason: profile.ban_reason,
      });
    }

    let licenseCount = 0;
    if (isPortalKey && portalLicenseId) {
      licenseCount = 1;
    } else {
      const { count } = await supabaseAdmin
        .from('licenses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active');
      licenseCount = count || 0;
    }

    const emailStr = user.email || '';
    const isAdmin = !isPortalKey && (profile?.role === 'admin' || emailStr.toLowerCase() === 'rookeh4@gmail.com');

    return res.json({
      valid: true,
      user: {
        id: user.id,
        email: emailStr,
        discordId: profile?.discord_id || user.user_metadata?.discord_id || null,
        username: profile?.username || (emailStr ? emailStr.split('@')[0] : 'member'),
        displayName: profile?.display_name || profile?.username || (emailStr ? emailStr.split('@')[0] : '5.55 Member'),
        avatar: profile?.avatar_url || user.user_metadata?.avatar_url || null,
        avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || null,
        role: isAdmin ? 'admin' : 'user',
        isPortalKey: Boolean(isPortalKey),
        createdAt: profile?.created_at || user.created_at,
      },
      activeLicenses: licenseCount,
    });
  } catch (err) {
    return serverError(res, 'AuthVerify Error', err, { valid: false });
  }
});

// POST /api/auth/login (Email + Password login setting HttpOnly session cookie)
router.post('/auth/login', rateLimitAuth, async (req, res) => {
  const { email, password } = req.body || {};
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  try {
    const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: cleanEmail, password }),
    });
    const sessionData = await authRes.json();
    if (!authRes.ok || !sessionData?.access_token || !sessionData?.user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', sessionData.user.id)
      .maybeSingle();

    if (profile?.banned_at) {
      return res.status(403).json({
        success: false,
        error: `Account suspended: ${profile.ban_reason || 'Terms violation'}`,
      });
    }

    setSessionCookieSafe(req, res, sessionData.access_token);
    const isAdmin = profile?.role === 'admin' || cleanEmail === 'rookeh4@gmail.com';
    return res.json({
      success: true,
      session: {
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token,
        expires_in: sessionData.expires_in,
      },
      user: {
        id: sessionData.user.id,
        email: sessionData.user.email,
        discordId: profile?.discord_id || null,
        username: profile?.username || cleanEmail.split('@')[0],
        displayName: profile?.display_name || profile?.username || cleanEmail.split('@')[0],
        avatar: profile?.avatar_url || null,
        role: isAdmin ? 'admin' : 'user',
      },
    });
  } catch (err) {
    return serverError(res, 'AuthLogin Error', err, { success: false });
  }
});

// POST /api/auth/logout (Clear HttpOnly session & OAuth state cookies)
router.post('/auth/logout', (req, res) => {
  clearCookie(req, res, SESSION_COOKIE_NAME);
  clearCookie(req, res, OAUTH_TX_COOKIE_NAME);
  return res.json({ success: true });
});

function setSessionCookieSafe(req, res, token) {
  appendCookie(req, res, SESSION_COOKIE_NAME, token, { maxAgeSeconds: 60 * 60 * 24 });
}

// POST /api/auth/register (Instant verified registration)
router.post('/auth/register', rateLimitAuth, async (req, res) => {
  const { email, password, username } = req.body || {};
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanUser = (username || cleanEmail.split('@')[0] || 'member').trim().slice(0, 32);

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
  }

  try {
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        username: cleanUser,
        display_name: cleanUser,
      },
    });

    if (createErr) {
      const msg = createErr.message || 'Registration failed.';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered') || msg.toLowerCase().includes('exists')) {
        return res.status(409).json({ success: false, error: 'An account with this email already exists. Please sign in.' });
      }
      return res.status(400).json({ success: false, error: msg });
    }

    const userId = created.user.id;
    await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email: cleanEmail,
      username: cleanUser,
      display_name: cleanUser,
      role: cleanEmail === 'rookeh4@gmail.com' ? 'admin' : 'user',
      updated_at: new Date().toISOString(),
    });

    const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: cleanEmail, password }),
    });
    const sessionData = await authRes.json();

    if (!authRes.ok || !sessionData?.access_token) {
      return res.status(500).json({ success: false, error: 'Account created. Please sign in now.' });
    }

    setSessionCookieSafe(req, res, sessionData.access_token);

    return res.json({
      success: true,
      session: {
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token,
        expires_in: sessionData.expires_in,
      },
      token: sessionData.access_token,
      user: {
        id: userId,
        email: cleanEmail,
        username: cleanUser,
        displayName: cleanUser,
        role: cleanEmail === 'rookeh4@gmail.com' ? 'admin' : 'user',
      },
    });
  } catch (err) {
    return serverError(res, 'AuthRegister Error', err, { success: false });
  }
});

// GET /api/auth/discord/start (OAuth2 Authorization Code + PKCE + CSRF State)
router.get('/auth/discord/start', rateLimitAuth, (req, res) => {
  const origin = resolveAllowedOrigin(req);
  if (!origin) {
    return res.status(400).json({ success: false, error: 'Disallowed OAuth redirect origin.' });
  }

  const state = crypto.randomBytes(24).toString('base64url');
  const codeVerifier = crypto.randomBytes(48).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const redirectUri = `${origin}/login`;

  if (!isValidCallbackUri(redirectUri)) {
    return res.status(400).json({ success: false, error: 'Invalid callback URI.' });
  }

  try {
    const signedTx = signOAuthTransaction({
      state,
      codeVerifier,
      redirectUri,
      exp: Date.now() + 10 * 60 * 1000,
    });

    appendCookie(req, res, OAUTH_TX_COOKIE_NAME, signedTx, { maxAgeSeconds: 600 });

    const params = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: 'identify email',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return res.redirect(302, `https://discord.com/oauth2/authorize?${params.toString()}`);
  } catch (err) {
    return serverError(res, 'DiscordStart Error', err, { success: false });
  }
});

// Shared handler for POST /api/auth/discord/callback and GET /api/auth/discord/callback
async function handleDiscordCallback(req, res) {
  const isGet = req.method === 'GET';
  const code = isGet ? req.query?.code : req.body?.code;
  const state = isGet ? req.query?.state : req.body?.state;
  const oauthError = isGet ? req.query?.error : req.body?.error;

  const cookies = parseCookies(req.headers.cookie);
  const rawTx = cookies[OAUTH_TX_COOKIE_NAME];
  clearCookie(req, res, OAUTH_TX_COOKIE_NAME);

  const fail = (status, msg, errCode = 'oauth_failed') => {
    if (isGet) {
      return res.redirect(302, `/login?oauth_error=${encodeURIComponent(errCode)}`);
    }
    return res.status(status).json({ success: false, error: msg });
  };

  if (oauthError) {
    return fail(400, 'Discord authorization was cancelled or denied.', 'access_denied');
  }

  if (!code || typeof code !== 'string' || !state || typeof state !== 'string') {
    return fail(400, 'Missing Discord authorization code or CSRF state.', 'missing_params');
  }

  const tx = verifyOAuthTransaction(rawTx);
  if (!tx || !tx.state || !tx.codeVerifier || !tx.redirectUri) {
    return fail(403, 'OAuth session expired or invalid. Please click Continue with Discord again.', 'invalid_tx');
  }

  const stateBuf = Buffer.from(state, 'utf8');
  const expectedBuf = Buffer.from(String(tx.state), 'utf8');
  if (stateBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(stateBuf, expectedBuf)) {
    return fail(403, 'OAuth CSRF state validation failed.', 'csrf_mismatch');
  }

  if (!isValidCallbackUri(tx.redirectUri)) {
    return fail(400, 'Invalid OAuth callback URL.', 'invalid_redirect');
  }

  try {
    // 1. Exchange authorization code on the backend using PKCE verifier (+ client_secret if configured)
    const tokenParams = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      grant_type: 'authorization_code',
      code: code.trim(),
      redirect_uri: tx.redirectUri,
      code_verifier: tx.codeVerifier,
    });
    if (process.env.DISCORD_CLIENT_SECRET) {
      tokenParams.set('client_secret', process.env.DISCORD_CLIENT_SECRET);
    }

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams,
    });

    if (!tokenRes.ok) {
      return fail(401, 'Discord code exchange failed. Please sign in again.', 'token_exchange_failed');
    }

    const tokenData = await tokenRes.json();
    const discordAccessToken = tokenData?.access_token;
    if (!discordAccessToken) {
      return fail(401, 'Discord did not issue an access token.', 'missing_discord_token');
    }

    // 2. Fetch Discord profile strictly server-side (Discord token never leaves backend)
    const discordRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${discordAccessToken}` },
    });

    if (!discordRes.ok) {
      return fail(401, 'Unable to retrieve verified Discord profile.', 'discord_profile_failed');
    }

    const discordUser = await discordRes.json();
    if (!discordUser?.id) {
      return fail(401, 'Incomplete Discord profile response.', 'invalid_discord_profile');
    }

    const discordId = String(discordUser.id);
    const uname = discordUser.username || `discord_${discordId.slice(0, 6)}`;
    const dname = discordUser.global_name || uname;
    const avatarExt = discordUser.avatar?.startsWith('a_') ? 'gif' : 'png';
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.${avatarExt}?size=256`
      : null;

    // 3. Match existing profile by discord_id or verified Discord email
    let targetUserId = null;
    let targetEmail = null;
    let targetRole = 'user';

    const { data: byDiscord } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, banned_at, ban_reason')
      .eq('discord_id', discordId)
      .maybeSingle();

    if (byDiscord) {
      if (byDiscord.banned_at) {
        return fail(403, `Account suspended: ${byDiscord.ban_reason || 'Terms violation'}`, 'banned');
      }
      targetUserId = byDiscord.id;
      targetEmail = byDiscord.email;
      targetRole = byDiscord.role || 'user';
    } else if (discordUser.email && discordUser.verified) {
      const { data: byEmail } = await supabaseAdmin
        .from('profiles')
        .select('id, email, role, banned_at, ban_reason')
        .ilike('email', discordUser.email)
        .maybeSingle();

      if (byEmail) {
        if (byEmail.banned_at) {
          return fail(403, `Account suspended: ${byEmail.ban_reason || 'Terms violation'}`, 'banned');
        }
        targetUserId = byEmail.id;
        targetEmail = byEmail.email;
        targetRole = byEmail.role || 'user';
      }
    }

    // 4. Create Supabase Auth account if none matched yet
    if (!targetUserId) {
      const candidateEmail =
        discordUser.email && discordUser.verified
          ? discordUser.email.toLowerCase()
          : `discord_${discordId}@users.555client.xyz`;

      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: candidateEmail,
        email_confirm: true,
        password: generateToken(24),
        user_metadata: {
          discord_id: discordId,
          username: uname,
          display_name: dname,
          avatar_url: avatarUrl,
        },
      });

      if (createErr) {
        const { data: existingProf } = await supabaseAdmin
          .from('profiles')
          .select('id, email, role')
          .ilike('email', candidateEmail)
          .maybeSingle();

        if (existingProf) {
          targetUserId = existingProf.id;
          targetEmail = existingProf.email;
          targetRole = existingProf.role || 'user';
        } else {
          const { data: listed } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const authMatch = listed?.users?.find((u) => u.email?.toLowerCase() === candidateEmail);
          if (!authMatch) throw createErr;
          targetUserId = authMatch.id;
          targetEmail = authMatch.email;
        }
      } else {
        targetUserId = created.user.id;
        targetEmail = created.user.email;
      }
    }

    const finalRole = targetRole === 'admin' || targetEmail?.toLowerCase() === 'rookeh4@gmail.com' ? 'admin' : 'user';

    // 5. Sync profile row
    await supabaseAdmin.from('profiles').upsert({
      id: targetUserId,
      email: targetEmail,
      discord_id: discordId,
      username: uname,
      display_name: dname,
      avatar_url: avatarUrl,
      role: finalRole,
      updated_at: new Date().toISOString(),
    });

    // 6. Issue Supabase Auth session via HttpOnly cookie
    const sessionData = await createSupabaseSessionForEmail(targetEmail);
    setSessionCookieSafe(req, res, sessionData.access_token);

    if (isGet) {
      return res.redirect(302, '/dashboard');
    }

    return res.json({
      success: true,
      session: {
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token,
        expires_in: sessionData.expires_in,
      },
      user: {
        id: targetUserId,
        email: targetEmail,
        discordId,
        username: uname,
        displayName: dname,
        avatar: avatarUrl,
        role: finalRole,
      },
    });
  } catch (err) {
    return serverError(res, 'DiscordCallback Error', err, { success: false });
  }
}

router.get('/auth/discord/callback', rateLimitAuth, handleDiscordCallback);
router.post('/auth/discord/callback', rateLimitAuth, handleDiscordCallback);

// Deprecate insecure implicit Discord token sync
router.post('/auth/discord-sync', (_req, res) => {
  return res.status(410).json({
    success: false,
    error: 'Implicit OAuth flow has been retired. Use Discord Authorization Code flow at /api/auth/discord/start.',
  });
});

// POST /api/auth/key-login (Log into web dashboard cleanly with a license key without consuming HWID slot)
router.post('/auth/key-login', rateLimitAuth, async (req, res) => {
  const cleanKey = (req.body?.license_key || '').trim().toUpperCase();
  if (!cleanKey) {
    return res.status(400).json({ success: false, error: 'License key is required.' });
  }

  try {
    const { data: license, error: licErr } = await supabaseAdmin
      .from('licenses')
      .select('id, license_key, status, expires_at, user_id, products(slug, name)')
      .eq('license_key', cleanKey)
      .maybeSingle();

    if (licErr || !license) {
      return res.status(404).json({ success: false, error: 'Invalid license key.' });
    }
    if (license.status === 'revoked') {
      return res.status(403).json({ success: false, error: 'This license key has been revoked.' });
    }
    if (license.status === 'suspended') {
      return res.status(403).json({ success: false, error: 'This license key is currently suspended.' });
    }
    if (license.status === 'expired' || (license.expires_at && new Date(license.expires_at) < new Date())) {
      return res.status(403).json({ success: false, error: 'This license key has expired.' });
    }

    let ownerUsername = cleanKey.slice(0, 9);
    let maskedEmail = '';
    if (license.user_id) {
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('username, display_name, email')
        .eq('id', license.user_id)
        .maybeSingle();
      if (prof?.username || prof?.display_name) {
        ownerUsername = prof.display_name || prof.username;
      }
      if (prof?.email) {
        const [local, dom] = prof.email.split('@');
        maskedEmail = local && dom ? `${local.slice(0, 2)}***@${dom}` : '';
      }
    }

    const portalToken = signPortalToken({
      license_id: license.id,
      license_key: license.license_key,
      user_id: license.user_id || null,
      username: ownerUsername,
      display_name: ownerUsername,
      masked_email: maskedEmail,
    });

    setSessionCookieSafe(req, res, portalToken);

    return res.json({
      success: true,
      token: portalToken,
      user: {
        id: license.user_id || license.id,
        email: maskedEmail,
        username: ownerUsername,
        displayName: ownerUsername,
        role: 'user',
        isPortalKey: true,
      },
    });
  } catch (err) {
    return serverError(res, 'KeyLogin Error', err, { success: false });
  }
});

// ==============================================================================
// 2B. C++ CLIENT UNIFIED LOGIN & REFRESH ENDPOINTS
// ==============================================================================

// POST /api/auth/client-login
router.post('/auth/client-login', rateLimitAuth, async (req, res) => {
  const { email, password, hwid, device_name, client_type = 'cpp', mc_version = '1.21.11' } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_CREDENTIALS',
      message: 'Email and password are required',
    });
  }

  if (!hwid) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_HWID',
      message: 'Hardware ID (HWID) is required',
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanHwid = hwid.trim();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
    // 1. Authenticate with Supabase Auth endpoint directly (preserves supabaseAdmin service-role session)
    const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: cleanEmail, password }),
    });

    const authData = await authRes.json();
    if (!authRes.ok || !authData?.user) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: authData?.error_description || authData?.msg || 'Invalid email or password',
      });
    }

    const user = authData.user;

    // 2. Check ban status in profiles
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.banned_at) {
      return res.status(403).json({
        success: false,
        error: 'ACCOUNT_BANNED',
        message: `Account suspended: ${profile.ban_reason || 'Terms violation'}`,
      });
    }

    // 3. Query all user licenses with product details
    const { data: licenses, error: licErr } = await supabaseAdmin
      .from('licenses')
      .select('*, products(*)')
      .eq('user_id', user.id);

    if (licErr) throw licErr;

    if (!licenses || licenses.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'NO_LICENSE',
        message: 'No client license found on this account. Please purchase the 5.55 C++ Client first.',
      });
    }

    // Separate C++ vs Java licenses
    const cppLicenses = licenses.filter(
      (l) => l.products?.slug === 'cpp-client' || l.products?.platform === 'native' || l.products?.platform === 'both'
    );
    const javaLicenses = licenses.filter(
      (l) => l.products?.slug === 'java-client' || l.products?.platform === 'fabric'
    );

    if (cppLicenses.length === 0 && javaLicenses.length > 0) {
      return res.status(403).json({
        success: false,
        error: 'PRODUCT_MISMATCH',
        message: 'You own a Java Fabric client license, but do NOT have a C++ Client license. Each client requires its own entitlement.',
      });
    }

    if (cppLicenses.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'NO_CPP_LICENSE',
        message: 'No active C++ Client license found on this account.',
      });
    }

    // Find active C++ license
    const activeLicense = cppLicenses.find((l) => l.status === 'active');
    if (!activeLicense) {
      const revoked = cppLicenses.find((l) => l.status === 'revoked');
      if (revoked) {
        return res.status(403).json({
          success: false,
          error: 'LICENSE_REVOKED',
          message: 'Your C++ client license has been revoked.',
        });
      }
      return res.status(403).json({
        success: false,
        error: 'LICENSE_INACTIVE',
        message: `Your C++ client license is ${cppLicenses[0].status}.`,
      });
    }

    // Check expiration
    if (activeLicense.expires_at && new Date(activeLicense.expires_at) < new Date()) {
      await supabaseAdmin
        .from('licenses')
        .update({ status: 'expired' })
        .eq('id', activeLicense.id);

      return res.status(403).json({
        success: false,
        error: 'LICENSE_EXPIRED',
        message: 'Your C++ client license has expired.',
      });
    }

    // 4. Device check & registration
    const { data: existingDevice } = await supabaseAdmin
      .from('devices')
      .select('*')
      .eq('license_id', activeLicense.id)
      .eq('hwid', cleanHwid)
      .maybeSingle();

    let deviceRecordId = null;
    if (existingDevice) {
      deviceRecordId = existingDevice.id;
      await supabaseAdmin
        .from('devices')
        .update({
          last_seen_at: new Date().toISOString(),
          ip_address: clientIp,
        })
        .eq('id', existingDevice.id);
    } else {
      // Check device count limit
      const { count: currentDevices } = await supabaseAdmin
        .from('devices')
        .select('*', { count: 'exact', head: true })
        .eq('license_id', activeLicense.id);

      if ((currentDevices || 0) >= (activeLicense.max_devices || 1)) {
        return res.status(403).json({
          success: false,
          error: 'DEVICE_LIMIT_REACHED',
          message: 'Please reset HWID and try again',
          max_devices: activeLicense.max_devices,
          current_devices: currentDevices,
        });
      }

      // Register new device
      const { data: newDev, error: devErr } = await supabaseAdmin
        .from('devices')
        .insert({
          license_id: activeLicense.id,
          user_id: user.id,
          hwid: cleanHwid,
          client_type: 'cpp',
          ip_address: clientIp,
          device_name: device_name || `PC-${cleanHwid.substring(0, 8)}`,
        })
        .select()
        .single();

      if (devErr) throw devErr;
      deviceRecordId = newDev.id;
    }

    // 5. Create session token
    const sessionToken = generateToken(16);
    const sessionExpiry = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

    await supabaseAdmin.from('sessions').insert({
      user_id: user.id,
      license_id: activeLicense.id,
      device_id: deviceRecordId,
      session_token: sessionToken,
      client_type: 'cpp',
      mc_version,
      ip_address: clientIp,
      expires_at: sessionExpiry,
    });

    // 6. Cryptographically sign grant payload with Ed25519
    const timestamp = Date.now();
    const grantPayload = JSON.stringify({
      license_id: activeLicense.id,
      user_id: user.id,
      product: 'cpp-client',
      hwid: cleanHwid,
      timestamp,
      expires_at: activeLicense.expires_at,
    });
    const signature = signEd25519(grantPayload);

    // 7. Audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'CLIENT_LOGIN_SUCCESS',
      entity_type: 'license',
      entity_id: activeLicense.id,
      ip_address: clientIp,
      metadata: { hwid: cleanHwid, client_type: 'cpp', mc_version },
    });

    return res.json({
      success: true,
      session_token: sessionToken,
      access_token: authData.access_token || authData.session?.access_token,
      refresh_token: authData.refresh_token || authData.session?.refresh_token,
      expires_in: authData.expires_in || authData.session?.expires_in || 3600,
      user: {
        id: user.id,
        email: user.email,
        username: profile?.username || user.email.split('@')[0],
        displayName: profile?.display_name || user.email.split('@')[0],
        role: profile?.role || 'user',
      },
      license: {
        id: activeLicense.id,
        key: activeLicense.license_key,
        tier: activeLicense.license_type,
        status: activeLicense.status,
        expires_at: activeLicense.expires_at,
        max_devices: activeLicense.max_devices,
        product: '5.55 C++ Client',
      },
      grant: {
        signature,
        timestamp,
        hwid: cleanHwid,
      },
    });
  } catch (err) {
    return serverError(res, 'ClientLogin Error', err, { success: false, message: 'Internal server error' });
  }
});

// POST /api/auth/client-refresh (Refresh session using stored refresh_token)
router.post('/auth/client-refresh', rateLimitAuth, async (req, res) => {
  const { refresh_token, hwid, client_type = 'cpp' } = req.body;
  if (!refresh_token || !hwid) {
    return res.status(400).json({ success: false, error: 'refresh_token and hwid are required' });
  }

  const cleanHwid = hwid.trim();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
    const refreshRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token }),
    });

    const refreshData = await refreshRes.json();
    if (!refreshRes.ok || !refreshData?.user) {
      return res.status(401).json({ success: false, error: 'INVALID_REFRESH_TOKEN', message: 'Session expired, please log in again' });
    }

    const user = refreshData.user;

    // Check ban
    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (profile?.banned_at) {
      return res.status(403).json({ success: false, error: 'ACCOUNT_BANNED', message: profile.ban_reason });
    }

    // Verify C++ license
    const { data: license } = await supabaseAdmin
      .from('licenses')
      .select('*, products(*)')
      .eq('user_id', user.id)
      .eq('products.slug', 'cpp-client')
      .eq('status', 'active')
      .maybeSingle();

    if (!license) {
      return res.status(403).json({ success: false, error: 'NO_ACTIVE_LICENSE', message: 'No active C++ client license found' });
    }

    // Verify device
    const { data: device } = await supabaseAdmin
      .from('devices')
      .select('id')
      .eq('license_id', license.id)
      .eq('hwid', cleanHwid)
      .maybeSingle();

    if (!device) {
      return res.status(403).json({ success: false, error: 'DEVICE_NOT_REGISTERED', message: 'This device is no longer registered' });
    }

    // Update last seen
    await supabaseAdmin
      .from('devices')
      .update({ last_seen_at: new Date().toISOString(), ip_address: clientIp })
      .eq('id', device.id);

    // Sign new grant
    const timestamp = Date.now();
    const grantPayload = JSON.stringify({
      license_id: license.id,
      user_id: user.id,
      product: 'cpp-client',
      hwid: cleanHwid,
      timestamp,
      expires_at: license.expires_at,
    });
    const signature = signEd25519(grantPayload);
    const sessionToken = generateToken(16);

    return res.json({
      success: true,
      session_token: sessionToken,
      access_token: refreshData.access_token || refreshData.session?.access_token,
      refresh_token: refreshData.refresh_token || refreshData.session?.refresh_token,
      expires_in: refreshData.expires_in || refreshData.session?.expires_in || 3600,
      user: {
        id: user.id,
        email: user.email,
        username: profile?.username || user.email.split('@')[0],
        displayName: profile?.display_name || user.email.split('@')[0],
        role: profile?.role || 'user',
      },
      license: {
        id: license.id,
        key: license.license_key,
        tier: license.license_type,
        status: license.status,
        expires_at: license.expires_at,
        max_devices: license.max_devices,
        product: '5.55 C++ Client',
      },
      grant: {
        signature,
        timestamp,
        hwid: cleanHwid,
      },
    });
  } catch (err) {
    return serverError(res, 'ClientRefresh Error', err, { success: false, message: 'Internal server error' });
  }
});

// GET /api/user/profile
router.get('/user/profile', requireAuth, async (req, res) => {
  return res.json({
    profile: req.profile,
    user: {
      id: req.user.id,
      email: req.user.email,
      createdAt: req.user.created_at,
    },
  });
});

// POST /api/user/password (Set or change account password for loader sign-in)
router.post('/user/password', requireAuth, async (req, res) => {
  const { password } = req.body || {};
  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
  }
  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, { password });
    if (error) throw error;
    return res.json({ success: true, message: 'Password updated successfully. You can now use it in the loader.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/user/licenses
router.get('/user/licenses', requireAuth, async (req, res) => {
  try {
    const { data: licenses, error } = await supabaseAdmin
      .from('licenses')
      .select(`
        id,
        license_key,
        status,
        license_type,
        expires_at,
        max_devices,
        metadata,
        created_at,
        products (
          id,
          slug,
          name,
          platform,
          description
        ),
        devices (
          id,
          hwid,
          device_name,
          client_type,
          last_seen_at,
          registered_at
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({ licenses: licenses || [] });
  } catch (err) {
    return serverError(res, 'UserLicenses Error', err);
  }
});

// Alias: GET /api/licenses/my (Backward compatibility)
router.get('/licenses/my', requireAuth, async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('licenses')
      .select(`
        id,
        license_key,
        status,
        license_type,
        expires_at,
        max_devices,
        metadata,
        created_at,
        products (
          id,
          slug,
          name,
          platform,
          description
        ),
        devices (
          id,
          hwid,
          device_name,
          client_type,
          last_seen_at,
          registered_at
        )
      `);

    if (req.isPortalKey && req.portalLicenseId) {
      query = query.eq('id', req.portalLicenseId);
    } else {
      query = query.eq('user_id', req.user.id);
    }

    const { data: licenses, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Format for existing dashboard state
    const formatted = (licenses || []).map((lic) => {
      const lastReset = lic.metadata?.last_hwid_reset_at;
      let cooldownDaysRemaining = 0;
      if (lastReset) {
        const diffMs = Date.now() - new Date(lastReset).getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays < 30) {
          cooldownDaysRemaining = Math.max(1, Math.ceil(30 - diffDays));
        }
      }

      return {
        id: lic.id,
        key: lic.license_key,
        license_key: lic.license_key,
        name: lic.metadata?.name || lic.products?.name || '5.55 Client',
        product: lic.products?.slug,
        product_name: lic.products?.name,
        platform: lic.products?.platform,
        status: lic.status,
        tier: lic.license_type,
        expires_at: lic.expires_at,
        hwid: lic.devices?.[0]?.hwid || null,
        devices: lic.devices || [],
        max_devices: lic.max_devices,
        created_at: lic.created_at,
        metadata: lic.metadata || {},
        last_hwid_reset_at: lastReset || null,
        cooldown_days_remaining: cooldownDaysRemaining,
      };
    });

    return res.json({ licenses: formatted, orders: [] });
  } catch (err) {
    return serverError(res, 'UserBilling Error', err, { licenses: [] });
  }
});

// Alias: GET /api/auth/me
router.get('/auth/me', requireAuth, (req, res) => {
  const emailStr = req.user.email || '';
  const isAdmin = !req.isPortalKey && (req.profile?.role === 'admin' || emailStr.toLowerCase() === 'rookeh4@gmail.com');
  return res.json({
    user: {
      id: req.user.id,
      email: emailStr,
      discordId: req.profile?.discord_id || null,
      username: req.profile?.username || (emailStr ? emailStr.split('@')[0] : 'member'),
      displayName: req.profile?.display_name || req.profile?.username || (emailStr ? emailStr.split('@')[0] : '5.55 Member'),
      avatar: req.profile?.avatar_url || null,
      role: isAdmin ? 'admin' : 'user',
      isPortalKey: Boolean(req.isPortalKey),
      createdAt: req.profile?.created_at || req.user.created_at,
    },
  });
});

// POST /api/licenses/claim (Logged-in user claims/binds an unassigned key to their account)
router.post('/licenses/claim', requireAuth, async (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ success: false, error: 'License key is required' });

  const cleanKey = key.trim().toUpperCase();

  try {
    const { data: license, error: findErr } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('license_key', cleanKey)
      .maybeSingle();

    if (findErr || !license) {
      return res.status(404).json({ success: false, error: 'License key not found' });
    }

    if (license.status === 'revoked') {
      return res.status(403).json({ success: false, error: 'This license has been revoked' });
    }

    if (license.user_id && license.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'License is already registered to another account' });
    }

    if (license.user_id === req.user.id) {
      return res.json({ success: true, message: 'License is already active on your account' });
    }

    // Assign to current user
    const { error: updateErr } = await supabaseAdmin
      .from('licenses')
      .update({ user_id: req.user.id, status: 'active' })
      .eq('id', license.id);

    if (updateErr) throw updateErr;

    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'LICENSE_REDEEMED',
      entity_type: 'license',
      entity_id: license.id,
      metadata: { key: cleanKey },
    });

    return res.json({ success: true, message: 'License successfully claimed!' });
  } catch (err) {
    return serverError(res, 'ClaimLicense Error', err, { success: false });
  }
});

// POST /api/licenses/reset-hwid
router.post('/licenses/reset-hwid', rateLimitReset, requireAuth, async (req, res) => {
  const { licenseKey, licenseId, resetKey } = req.body;
  
  try {
    // 1. Verify license ownership by ID, key, or active user entitlement
    let licQuery = supabaseAdmin
      .from('licenses')
      .select('id, user_id, license_key, metadata, products(slug, name)');

    if (licenseId) {
      licQuery = licQuery.eq('id', licenseId);
    } else if (licenseKey) {
      licQuery = licQuery.eq('license_key', licenseKey.trim().toUpperCase());
    } else {
      licQuery = licQuery.eq('user_id', req.user.id).eq('status', 'active');
    }

    if (req.isPortalKey && req.portalLicenseId) {
      licQuery = licQuery.eq('id', req.portalLicenseId);
    } else if (!req.profile || req.profile.role !== 'admin') {
      licQuery = licQuery.eq('user_id', req.user.id);
    }

    const { data: license, error: licErr } = await licQuery.maybeSingle();

    if (licErr || !license) {
      return res.status(404).json({ success: false, error: 'License not found on your account' });
    }

    const cleanResetKey = (resetKey || '').trim().toUpperCase();
    const hasAdminResetKey = Boolean(cleanResetKey);

    // 2. Cooldown check: 1 free self-service reset every 30 days (1 month)
    const COOLDOWN_DAYS = 30;
    const lastResetAt = license.metadata?.last_hwid_reset_at;
    let isCooldownActive = false;
    let daysRemaining = 0;

    if (lastResetAt) {
      const diffMs = Date.now() - new Date(lastResetAt).getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays < COOLDOWN_DAYS) {
        isCooldownActive = true;
        daysRemaining = Math.max(1, Math.ceil(COOLDOWN_DAYS - diffDays));
      }
    }

    // If cooldown is active and user has not provided an admin override key
    if (isCooldownActive && !hasAdminResetKey) {
      return res.status(429).json({
        success: false,
        cooldown: true,
        daysRemaining,
        error: `Machine reset cooldown active. You can reset your machine once every 1 month (30 days). Next reset available in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`,
      });
    }

    // 3. If an admin reset key was supplied, validate and atomically consume it
    if (hasAdminResetKey) {
      const { data: activeResetEntry, error: rkErr } = await supabaseAdmin
        .from('audit_logs')
        .select('id, metadata')
        .eq('action', 'HWID_RESET_KEY')
        .filter('metadata->>reset_key', 'eq', cleanResetKey)
        .filter('metadata->>status', 'eq', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (rkErr) throw rkErr;

      if (!activeResetEntry) {
        return res.status(403).json({
          success: false,
          error: 'Invalid or already used HWID Reset Key. Please request a valid reset key from an administrator.',
        });
      }

      const { data: consumedRow, error: consumeErr } = await supabaseAdmin
        .from('audit_logs')
        .update({
          metadata: {
            ...activeResetEntry.metadata,
            status: 'used',
            used_at: new Date().toISOString(),
            used_by: license.user_id || req.user.id,
            used_by_email: req.user.email || 'customer',
            license_id: license.id,
          },
        })
        .eq('id', activeResetEntry.id)
        .filter('metadata->>status', 'eq', 'active')
        .select('id')
        .maybeSingle();

      if (consumeErr || !consumedRow) {
        return res.status(409).json({
          success: false,
          error: 'This HWID Reset Key has already been used.',
        });
      }
    }

    // 4. Delete bound devices for this license
    await supabaseAdmin.from('devices').delete().eq('license_id', license.id);

    // 5. Update license metadata with last reset timestamp
    const nowIso = new Date().toISOString();
    const updatedMetadata = {
      ...(license.metadata || {}),
      last_hwid_reset_at: nowIso,
      hwid_reset_count: ((license.metadata?.hwid_reset_count || 0) + 1),
    };

    await supabaseAdmin
      .from('licenses')
      .update({ metadata: updatedMetadata, updated_at: nowIso })
      .eq('id', license.id);

    // 6. Audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: license.user_id || (req.isPortalKey ? null : req.user.id),
      action: hasAdminResetKey ? 'HWID_RESET_ADMIN_KEY' : 'HWID_RESET_MONTHLY_SELF_SERVE',
      entity_type: 'license',
      entity_id: license.id,
      ip_address: getClientIp(req),
      metadata: {
        reset_key: cleanResetKey || 'MONTHLY_SELF_SERVE',
        used_by_email: req.user.email || 'customer',
        license_id: license.id,
      },
    });

    return res.json({
      success: true,
      message: 'Machine HWID successfully reset! Your hardware binding has been cleared. You can now launch on your new machine.',
      last_hwid_reset_at: nowIso,
    });
  } catch (err) {
    return serverError(res, 'ResetHWID Error', err, { success: false });
  }
});

// POST /api/licenses/update-name
router.post('/licenses/update-name', requireAuth, async (req, res) => {
  const { licenseKey, name } = req.body;
  if (!licenseKey || !name) {
    return res.status(400).json({ success: false, error: 'licenseKey and name required' });
  }

  try {
    let licQuery = supabaseAdmin
      .from('licenses')
      .select('id, metadata')
      .eq('license_key', licenseKey.trim().toUpperCase());

    if (req.isPortalKey && req.portalLicenseId) {
      licQuery = licQuery.eq('id', req.portalLicenseId);
    } else {
      licQuery = licQuery.eq('user_id', req.user.id);
    }

    const { data: license } = await licQuery.single();

    if (!license) return res.status(404).json({ success: false, error: 'License not found' });

    const newMetadata = { ...(license.metadata || {}), name: name.trim() };
    await supabaseAdmin
      .from('licenses')
      .update({ metadata: newMetadata })
      .eq('id', license.id);

    return res.json({ success: true, name: name.trim() });
  } catch (err) {
    return serverError(res, 'RenameLicense Error', err, { success: false });
  }
});

// GET /api/user/devices
router.get('/user/devices', requireAuth, async (req, res) => {
  try {
    const { data: devices, error } = await supabaseAdmin
      .from('devices')
      .select(`
        id,
        license_id,
        hwid,
        device_name,
        ip_address,
        client_type,
        last_seen_at,
        registered_at,
        licenses (
          license_key,
          products ( slug, name )
        )
      `)
      .eq('user_id', req.user.id)
      .order('last_seen_at', { ascending: false });

    if (error) throw error;
    return res.json({ devices: devices || [] });
  } catch (err) {
    return serverError(res, 'GetDevices Error', err);
  }
});

// ==============================================================================
// 3. CENTRAL LICENSE REDEMPTION & HWID VALIDATION API
// Used by Website Download Page, Java Fabric Client, and C++ Client Loader
// ==============================================================================

// POST /api/licenses/redeem (Public website redemption for download authorization)
router.post('/licenses/redeem', rateLimitRedeem, async (req, res) => {
  const { license_key } = req.body;
  if (!license_key) {
    return res.status(400).json({
      valid: false,
      error: 'MISSING_KEY',
      message: 'Please enter your license key.',
    });
  }

  const cleanKey = license_key.trim().toUpperCase();
  const clientIp = getClientIp(req);

  try {
    const { data: license, error: licErr } = await supabaseAdmin
      .from('licenses')
      .select('*, products(*)')
      .eq('license_key', cleanKey)
      .maybeSingle();

    if (licErr || !license) {
      return res.status(404).json({
        valid: false,
        error: 'INVALID_KEY',
        message: 'Invalid license key. Please check your key and try again.',
      });
    }

    if (license.status === 'revoked') {
      return res.status(403).json({
        valid: false,
        error: 'LICENSE_REVOKED',
        message: 'This license has been revoked.',
      });
    }

    if (license.status === 'suspended') {
      return res.status(403).json({
        valid: false,
        error: 'LICENSE_SUSPENDED',
        message: 'This license is currently suspended.',
      });
    }

    if (license.status === 'expired' || (license.expires_at && new Date(license.expires_at) < new Date())) {
      return res.status(403).json({
        valid: false,
        error: 'LICENSE_EXPIRED',
        message: 'Your license has expired.',
      });
    }

    const product = license.products;
    if (product.platform === 'fabric' || product.slug === 'java-client') {
      return res.status(403).json({
        valid: false,
        error: 'PRODUCT_MISMATCH',
        message: 'This license is for 5.55 Java Fabric Client. Please visit the Java download section.',
      });
    }

    // Find active release for this product dynamically
    const { data: activeRelease } = await supabaseAdmin
      .from('client_releases')
      .select('id, version, sha256, storage_path')
      .eq('product_id', product.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activeRelease) {
      return res.status(503).json({
        valid: false,
        error: 'RELEASE_UNAVAILABLE',
        message: 'No active client release is currently published.',
      });
    }

    // Resolve owning profile ID cleanly without hardcoded UUIDs
    let tokenUserId = license.user_id;
    if (!tokenUserId) {
      const { data: adminProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle();
      tokenUserId = adminProfile?.id || null;
    }

    if (!tokenUserId) {
      return res.status(403).json({
        valid: false,
        error: 'ACCOUNT_REQUIRED',
        message: 'Please sign in and claim this license key to download.',
      });
    }

    // Generate short-lived single-use download token (15 mins)
    const token = generateToken(32);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error: tokenInsertErr } = await supabaseAdmin.from('download_tokens').insert({
      license_id: license.id,
      user_id: tokenUserId,
      release_id: activeRelease.id,
      token,
      expires_at: expiresAt,
      ip_address: clientIp,
    });

    if (tokenInsertErr) {
      return serverError(res, 'DownloadToken Insert Error', tokenInsertErr, { valid: false });
    }

    // Record audit log (website redemption does NOT consume or activate the key)
    await supabaseAdmin.from('audit_logs').insert({
      user_id: license.user_id,
      action: 'KEY_REDEEMED_FOR_DOWNLOAD',
      entity_type: 'license',
      entity_id: license.id,
      ip_address: clientIp,
      metadata: { license_key: cleanKey, product: product.slug },
    });

    return res.json({
      valid: true,
      authorized: true,
      message: 'License verified successfully.',
      key: cleanKey,
      product_name: product.name,
      product_slug: product.slug,
      download_url: `/api/downloads/file/${token}`,
      token,
      file_name: 'SyndicateLoader.exe',
      file_size_bytes: 11772416,
      version: activeRelease.version || '1.21.11',
      sha256: activeRelease.sha256,
      expires_at: expiresAt,
    });
  } catch (err) {
    return serverError(res, 'RedeemKey Error', err, { valid: false, error: 'SERVER_ERROR' });
  }
});

// POST /api/licenses/validate
router.post('/licenses/validate', rateLimitValidate, async (req, res) => {
  const { license_key, hwid, client_type = 'java', mc_version } = req.body;

  if (!license_key || !hwid) {
    return res.status(400).json({
      valid: false,
      error: 'Missing license_key or hwid in request body',
    });
  }

  const cleanKey = license_key.trim().toUpperCase();
  const cleanHwid = hwid.trim();
  const clientIp = getClientIp(req);

  try {
    // 1. Fetch license + product details
    const { data: license, error: licErr } = await supabaseAdmin
      .from('licenses')
      .select('*, products(*)')
      .eq('license_key', cleanKey)
      .maybeSingle();

    if (licErr || !license) {
      return res.status(404).json({
        valid: false,
        error: 'INVALID_KEY',
        message: 'Invalid license key. Please check your key and try again.',
      });
    }

    // 2. Status checks
    if (license.status === 'revoked') {
      return res.status(403).json({
        valid: false,
        error: 'LICENSE_REVOKED',
        message: 'This license has been revoked.',
      });
    }

    if (license.status === 'suspended') {
      return res.status(403).json({
        valid: false,
        error: 'LICENSE_SUSPENDED',
        message: 'This license is currently suspended.',
      });
    }

    // 3. Expiration check
    if (license.status === 'expired' || (license.expires_at && new Date(license.expires_at) < new Date())) {
      await supabaseAdmin
        .from('licenses')
        .update({ status: 'expired' })
        .eq('id', license.id);

      return res.status(403).json({
        valid: false,
        error: 'LICENSE_EXPIRED',
        message: 'Your license has expired.',
        expired_at: license.expires_at,
      });
    }

    // 4. Product compatibility check
    const product = license.products;
    if (client_type === 'java' && product.platform === 'native') {
      return res.status(403).json({
        valid: false,
        error: 'PRODUCT_MISMATCH',
        message: 'This license is for the C++ Client only, not Java Fabric',
      });
    }
    if (client_type === 'cpp' && product.platform === 'fabric') {
      return res.status(403).json({
        valid: false,
        error: 'PRODUCT_MISMATCH',
        message: 'This license is for the Java Client only, not C++ Native',
      });
    }

    // 5. Device check & registration (before marking key active / first_activated_at)
    const { data: existingDevice } = await supabaseAdmin
      .from('devices')
      .select('*')
      .eq('license_id', license.id)
      .eq('hwid', cleanHwid)
      .maybeSingle();

    let activeDeviceId = existingDevice?.id || null;
    if (existingDevice) {
      // Update last seen
      await supabaseAdmin
        .from('devices')
        .update({
          last_seen_at: new Date().toISOString(),
          ip_address: clientIp,
        })
        .eq('id', existingDevice.id);
    } else {
      // Check device limit
      const { count: currentDevices } = await supabaseAdmin
        .from('devices')
        .select('*', { count: 'exact', head: true })
        .eq('license_id', license.id);

      if ((currentDevices || 0) >= (license.max_devices || 1)) {
        return res.status(403).json({
          valid: false,
          error: 'DEVICE_LIMIT_REACHED',
          message: 'Please reset HWID and try again',
          registeredCount: currentDevices,
          maxDevices: license.max_devices,
        });
      }

      // If auto_login is attempted after an HWID reset cleared devices, require fresh manual key login
      if (req.body?.auto_login === true) {
        return res.status(401).json({
          valid: false,
          error: 'HWID_RESET_REAUTH',
          message: 'HWID was reset. Please enter your license key again.',
        });
      }

      // Register new device
      const { data: insertedDevice, error: devInsertErr } = await supabaseAdmin
        .from('devices')
        .insert({
          license_id: license.id,
          user_id: license.user_id,
          hwid: cleanHwid,
          client_type: client_type === 'cpp' ? 'cpp' : 'java',
          ip_address: clientIp,
          device_name: req.body.device_name || `PC-${cleanHwid.substring(0, 8)}`,
        })
        .select('id')
        .single();
      if (devInsertErr) {
        throw devInsertErr;
      }
      activeDeviceId = insertedDevice?.id || null;
    }

    // 6. First activation transition from UNUSED to ACTIVE (only after device checks succeed)
    if (license.metadata?.key_state === 'UNUSED' || !license.metadata?.first_activated_at) {
      await supabaseAdmin
        .from('licenses')
        .update({
          metadata: {
            ...license.metadata,
            key_state: 'ACTIVE',
            first_activated_at: new Date().toISOString(),
          },
        })
        .eq('id', license.id);
    }

    // 7. Record heartbeat session
    const sessionToken = generateToken(16);
    const sessionExpiry = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(); // 6 hours

    await supabaseAdmin.from('sessions').insert({
      user_id: license.user_id,
      license_id: license.id,
      device_id: activeDeviceId,
      session_token: sessionToken,
      client_type,
      mc_version: mc_version || '1.21.11',
      ip_address: clientIp,
      expires_at: sessionExpiry,
    });

    // 7. Cryptographically sign grant payload with Ed25519
    const timestamp = Date.now();
    const grantPayload = JSON.stringify({
      license_id: license.id,
      product: product.slug,
      hwid: cleanHwid,
      timestamp,
      expires_at: license.expires_at,
    });
    const signature = signEd25519(grantPayload);

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: license.user_id,
      action: 'LICENSE_VALIDATED',
      entity_type: 'license',
      entity_id: license.id,
      ip_address: clientIp,
      metadata: { hwid: cleanHwid, client_type, mc_version },
    });

    // Resolve owner display name cleanly for the desktop loader profile badge
    let ownerUsername = 'Licensed User';
    if (license.user_id) {
      const { data: ownerProf } = await supabaseAdmin
        .from('profiles')
        .select('username, display_name')
        .eq('id', license.user_id)
        .maybeSingle();
      if (ownerProf?.display_name || ownerProf?.username) {
        ownerUsername = ownerProf.display_name || ownerProf.username;
      }
    }

    return res.json({
      valid: true,
      license_id: license.id,
      product_slug: product.slug,
      product_name: product.name,
      platform: product.platform,
      tier: license.license_type,
      license_type: license.license_type,
      username: ownerUsername,
      expires_at: license.expires_at,
      session_token: sessionToken,
      timestamp,
      signature,
    });
  } catch (err) {
    return serverError(res, 'ValidateLicense Error', err, { valid: false });
  }
});

// ==============================================================================
// 4.1 CLIENT VERIFICATION & AUTOMATIC HWID BINDING (FABRIC JAVA & C++ PROTOCOL)
// ==============================================================================

const handleClientVerification = async (req, res) => {
  const {
    licenseKey,
    deviceFingerprint,
    clientVersion = '1.0.0',
    minecraftVersion = '1.21.11',
    nonce,
    timestamp,
    sync = false,
  } = req.body || {};

  const cleanHwid = (deviceFingerprint || '').trim().toLowerCase();
  const rawKey = (licenseKey || '').trim().toUpperCase();
  const clientIp = getClientIp(req);

  if (!cleanHwid || cleanHwid.length < 8) {
    return res.status(400).json({
      valid: false,
      code: 'MISSING_HWID',
      errorCode: 'MISSING_HWID',
      message: 'Machine HWID (deviceFingerprint) is required.',
    });
  }

  try {
    let license = null;

    if (rawKey) {
      // 1. Look up license by key
      const { data: lic, error: licErr } = await supabaseAdmin
        .from('licenses')
        .select('*, products(*)')
        .eq('license_key', rawKey)
        .maybeSingle();

      if (licErr || !lic) {
        return res.status(401).json({
          valid: false,
          code: 'INVALID_KEY',
          errorCode: 'INVALID_KEY',
          message: 'Invalid or unknown license key.',
        });
      }
      license = lic;
    } else {
      // 2. Hardware-only lookup: find license bound to this HWID
      const { data: dev, error: devErr } = await supabaseAdmin
        .from('devices')
        .select('*, licenses(*, products(*))')
        .eq('hwid', cleanHwid)
        .order('last_seen_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dev && dev.licenses) {
        license = dev.licenses;
      } else {
        return res.status(401).json({
          valid: false,
          code: 'INVALID_KEY',
          errorCode: 'INVALID_KEY',
          message: 'No license key provided and machine hardware is not bound to any license.',
        });
      }
    }

    // Status checks
    if (license.status === 'revoked') {
      return res.status(403).json({
        valid: false,
        code: 'LICENSE_REVOKED',
        errorCode: 'LICENSE_REVOKED',
        message: 'This license has been revoked by administration.',
      });
    }

    if (license.status === 'suspended') {
      return res.status(403).json({
        valid: false,
        code: 'LICENSE_SUSPENDED',
        errorCode: 'LICENSE_SUSPENDED',
        message: 'This license is currently suspended.',
      });
    }

    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      return res.status(403).json({
        valid: false,
        code: 'LICENSE_EXPIRED',
        errorCode: 'LICENSE_EXPIRED',
        message: 'This license has expired.',
      });
    }

    // Check device binding in `devices` table for this license
    const { data: existingDevices, error: dErr } = await supabaseAdmin
      .from('devices')
      .select('*')
      .eq('license_id', license.id);

    if (dErr) throw dErr;

    const boundDevice = existingDevices && existingDevices.length > 0 ? existingDevices[0] : null;

    if (!boundDevice) {
      // FIRST LAUNCH! Automatically bind machine HWID to this license!
      const newDevice = {
        license_id: license.id,
        user_id: license.user_id,
        hwid: cleanHwid,
        device_name: `PC-${cleanHwid.substring(0, 8)}`,
        ip_address: clientIp,
        client_type: 'java',
        registered_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      };

      await supabaseAdmin.from('devices').insert(newDevice);

      // Update license metadata
      await supabaseAdmin
        .from('licenses')
        .update({
          updated_at: new Date().toISOString(),
          metadata: {
            ...(license.metadata || {}),
            key_state: 'ACTIVE',
            first_activated_at: new Date().toISOString(),
            last_activated_hwid: cleanHwid,
          },
        })
        .eq('id', license.id);
    } else {
      // Device already bound! Validate exact HWID match
      const existingHwid = boundDevice.hwid.toLowerCase();
      if (existingHwid !== cleanHwid) {
        // HWID MISMATCH - another PC is trying to use this jar / key!
        return res.status(403).json({
          valid: false,
          code: 'HWID_MISMATCH',
          errorCode: 'HWID_MISMATCH',
          message: 'Hardware ID mismatch. This license is bound to another PC. You can reset your HWID once per month on https://www.555client.xyz/dashboard.',
        });
      }

      // HWID matches: update heartbeat / last_seen_at
      await supabaseAdmin
        .from('devices')
        .update({
          last_seen_at: new Date().toISOString(),
          ip_address: clientIp || boundDevice.ip_address,
        })
        .eq('id', boundDevice.id);
    }

    // Load user profile details for client overlay / watermark
    let profile = null;
    if (license.user_id) {
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('id, email, username, display_name, avatar_url, role')
        .eq('id', license.user_id)
        .maybeSingle();
      profile = prof;
    }

    // Cryptographic Ed25519 token generation
    const requestNonce = nonce || crypto.randomUUID();
    const { authorizationToken, tokenPublicKey } = createClientToken({
      nonce: requestNonce,
      hwid: cleanHwid,
      licenseKey: license.license_key,
      durationSeconds: 7200,
    });

    const durationLabel = license.license_type === 'lifetime'
      ? 'Lifetime'
      : (license.expires_at ? `Expires ${license.expires_at.substring(0, 10)}` : 'Active');

    return res.json({
      valid: true,
      status: 'ACTIVE',
      authorizationToken,
      tokenPublicKey,
      licenseKey: license.license_key,
      duration: durationLabel,
      plan: durationLabel,
      tier: license.license_type,
      expiresAt: license.expires_at || null,
      user: {
        id: profile?.id || license.user_id || '555-user',
        username: profile?.username || profile?.email?.split('@')[0] || '555Client User',
        displayName: profile?.display_name || profile?.username || '5.55 Client',
        email: profile?.email || '',
        avatarUrl: profile?.avatar_url || 'https://www.555client.xyz/logo.png',
        role: profile?.role || 'Member',
        duration: durationLabel,
      },
    });
  } catch (err) {
    return serverError(res, 'ClientVerify Error', err, {
      valid: false,
      code: 'SERVER_ERROR',
      errorCode: 'SERVER_ERROR',
    });
  }
};

router.post(['/v1/client/verify', '/api/v1/client/verify'], handleClientVerification);
router.post(['/v1/client/register', '/api/v1/client/register'], handleClientVerification);

router.post(['/v1/client/heartbeat', '/api/v1/client/heartbeat'], async (req, res) => {
  const { authorizationToken, deviceFingerprint } = req.body || {};
  const cleanHwid = (deviceFingerprint || '').trim().toLowerCase();
  if (cleanHwid) {
    try {
      await supabaseAdmin
        .from('devices')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('hwid', cleanHwid);
    } catch {
      // Non-critical
    }
  }
  return res.json({ status: 'ACTIVE', ok: true });
});

// POST /api/devices/register
router.post('/devices/register', requireAuth, async (req, res) => {
  const { license_id, hwid, device_name, client_type = 'java' } = req.body;
  if (!license_id || !hwid) {
    return res.status(400).json({ error: 'license_id and hwid are required' });
  }

  try {
    const { data: license, error: licErr } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('id', license_id)
      .eq('user_id', req.user.id)
      .single();

    if (licErr || !license) {
      return res.status(404).json({ error: 'License not found or does not belong to you' });
    }

    const { count } = await supabaseAdmin
      .from('devices')
      .select('*', { count: 'exact', head: true })
      .eq('license_id', license.id);

    if ((count || 0) >= license.max_devices) {
      return res.status(400).json({
        error: `Device limit reached (${license.max_devices}). Remove an existing device first.`,
      });
    }

    const { data: newDev, error: devErr } = await supabaseAdmin
      .from('devices')
      .insert({
        license_id: license.id,
        user_id: req.user.id,
        hwid: hwid.trim(),
        device_name: device_name || 'My Device',
        client_type,
        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      })
      .select()
      .single();

    if (devErr) throw devErr;

    return res.json({ success: true, device: newDev });
  } catch (err) {
    return serverError(res, 'RegisterDevice Error', err);
  }
});

// POST /api/devices/remove
router.post('/devices/remove', requireAuth, async (req, res) => {
  const { device_id, license_id } = req.body;
  if (!device_id && !license_id) {
    return res.status(400).json({ error: 'device_id or license_id is required' });
  }

  try {
    let query = supabaseAdmin.from('devices').delete().eq('user_id', req.user.id);
    if (device_id) query = query.eq('id', device_id);
    else if (license_id) query = query.eq('license_id', license_id);

    const { error } = await query;
    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'DEVICE_UNBOUND',
      entity_type: 'device',
      entity_id: device_id || license_id,
      ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    });

    return res.json({ success: true, message: 'Device successfully removed' });
  } catch (err) {
    return serverError(res, 'RemoveDevice Error', err);
  }
});

// ==============================================================================
// 4. PRODUCTS & RELEASES MANIFEST
// ==============================================================================

// Helper: load persistent site settings from Supabase Storage bucket 'releases'
async function getSiteSettings() {
  try {
    const dl = await supabaseAdmin.storage.from('releases').download('config/site_settings.json');
    if (dl?.data) {
      const text = await dl.data.text();
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {
    // Ignore fallback
  }
  return {
    products: {
      'cpp-client': { on_hold: true, hold_message: '5.55 Injection is currently on hold while updates are being finalized.' },
      'java-client': { on_hold: false },
      'external': { on_hold: true, hold_message: '5.55 External is currently on hold.' }
    }
  };
}

// Helper: save persistent site settings to Supabase Storage bucket 'releases'
async function saveSiteSettings(settings) {
  try {
    const payload = Buffer.from(JSON.stringify(settings, null, 2));
    const { error } = await supabaseAdmin.storage
      .from('releases')
      .upload('config/site_settings.json', payload, {
        contentType: 'application/json',
        upsert: true,
      });
    return !error;
  } catch (e) {
    console.error('[saveSiteSettings] Error saving site settings:', e);
    return false;
  }
}

// GET /api/products
router.get('/products', async (req, res) => {
  try {
    const [{ data: products, error }, settings] = await Promise.all([
      supabaseAdmin
        .from('products')
        .select('*')
        .order('price_usd', { ascending: true }),
      getSiteSettings(),
    ]);

    if (error) throw error;

    const enriched = (products || []).map((p) => {
      const pConf = settings.products?.[p.slug] || {};
      return {
        ...p,
        on_hold: pConf.on_hold !== undefined ? Boolean(pConf.on_hold) : false,
        hold_message: pConf.hold_message || null,
      };
    });

    return res.json({ products: enriched });
  } catch (err) {
    return serverError(res, 'GetProducts Error', err);
  }
});

// GET /api/updates/:product/manifest
router.get('/updates/:product/manifest', async (req, res) => {
  const { product } = req.params;
  const channel = req.query.channel || 'stable';

  try {
    // Find product
    const { data: prod } = await supabaseAdmin
      .from('products')
      .select('id, slug, name')
      .eq('slug', product)
      .single();

    if (!prod) {
      return res.status(404).json({ error: `Product '${product}' not found` });
    }

    // Get latest active release
    const { data: release, error } = await supabaseAdmin
      .from('client_releases')
      .select('*')
      .eq('product_id', prod.id)
      .eq('channel', channel)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!release) {
      // Default fallback manifest for initial launch
      const sampleManifest = {
        product: prod.slug,
        name: prod.name,
        version: '1.21.11',
        channel,
        min_mc_version: '1.21.11',
        max_mc_version: '1.21.11',
        file_type: prod.slug === 'java-client' ? 'jar' : 'exe',
        sha256: null,
        signature: null,
        changelog: '5.55 Client release for Fabric 1.21.11.',
        updated_at: new Date().toISOString(),
      };
      return res.json(sampleManifest);
    }

    return res.json({
      product: prod.slug,
      name: prod.name,
      version: release.version,
      channel: release.channel,
      min_mc_version: release.min_mc_version,
      max_mc_version: release.max_mc_version,
      file_type: release.file_type,
      sha256: release.sha256,
      signature: release.signature,
      changelog: release.changelog,
      updated_at: release.created_at,
    });
  } catch (err) {
    return serverError(res, 'LatestUpdate Error', err);
  }
});

// ==============================================================================
// 5. DOWNLOAD & UPDATE AUTHORIZATION
// ==============================================================================

// POST /api/downloads/authorize
router.post('/downloads/authorize', requireAuth, async (req, res) => {
  const { product_slug, version } = req.body;
  if (!product_slug) {
    return res.status(400).json({ error: 'product_slug is required' });
  }

  try {
    // 1. Verify user owns an active license for this product
    let licQuery = supabaseAdmin
      .from('licenses')
      .select('id, user_id, status, expires_at, products!inner(id, slug, name)')
      .eq('products.slug', product_slug)
      .eq('status', 'active');

    if (req.isPortalKey && req.portalLicenseId) {
      licQuery = licQuery.eq('id', req.portalLicenseId);
    } else {
      licQuery = licQuery.eq('user_id', req.user.id);
    }

    const { data: candidateLicenses, error: licErr } = await licQuery.order('created_at', { ascending: false });
    if (licErr) throw licErr;

    const nowMs = Date.now();
    const license = (candidateLicenses || []).find(
      (l) => !l.expires_at || new Date(l.expires_at).getTime() > nowMs
    );

    if (!license) {
      return res.status(403).json({
        authorized: false,
        error: `You do not own an active, unexpired license for ${product_slug}.`,
      });
    }

    // 2. Fetch release
    let releaseQuery = supabaseAdmin
      .from('client_releases')
      .select('*')
      .eq('product_id', license.products.id)
      .eq('is_active', true);

    if (version) releaseQuery = releaseQuery.eq('version', version);
    else releaseQuery = releaseQuery.order('created_at', { ascending: false }).limit(1);

    const { data: release } = await releaseQuery.maybeSingle();

    // 3. Generate short-lived download token (15 mins)
    const token = generateToken(32);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    if (release) {
      await supabaseAdmin.from('download_tokens').insert({
        user_id: license.user_id || (req.isPortalKey ? null : req.user.id),
        license_id: license.id,
        release_id: release.id,
        token,
        expires_at: expiresAt,
        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      });
    }

    const isJar = release?.file_type === 'jar' || product_slug === 'java-client' || release?.storage_path?.endsWith('.jar');
    const resolvedFileName = isJar ? 'CrosshairAddons-2.2.0+1.21.11.jar' : (release?.file_name || 'SyndicateLoader.exe');
    const resolvedFileSize = isJar ? 16284469 : (release?.file_size_bytes || 11779072);

    return res.json({
      authorized: true,
      token,
      download_url: `/api/downloads/file/${token}`,
      file_name: resolvedFileName,
      file_size_bytes: resolvedFileSize,
      expires_at: expiresAt,
      version: release?.version || '1.21.11',
      sha256: release?.sha256 || null,
      signature: release?.signature || null,
    });
  } catch (err) {
    return serverError(res, 'AuthorizeDownload Error', err);
  }
});

// GET /api/downloads/file/:token
router.get('/downloads/file/:token', async (req, res) => {
  const { token } = req.params;

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, private');

  if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
    return res.status(400).json({ error: 'Invalid download token format' });
  }

  try {
    const { data: tokenRecord, error } = await supabaseAdmin
      .from('download_tokens')
      .select('*, client_releases(storage_path, version)')
      .eq('token', token)
      .maybeSingle();

    if (error || !tokenRecord) {
      return res.status(404).json({ error: 'Download token not found or already consumed' });
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Download token expired' });
    }

    if (tokenRecord.used_at) {
      return res.status(410).json({ error: 'Download token has already been used' });
    }

    // Atomically mark as used to prevent single-use token replay race conditions
    const { data: consumedToken } = await supabaseAdmin
      .from('download_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenRecord.id)
      .is('used_at', null)
      .select('id')
      .maybeSingle();

    if (!consumedToken) {
      return res.status(410).json({ error: 'Download token has already been used' });
    }

    // Increment download count
    if (tokenRecord.release_id) {
      try {
        await supabaseAdmin.rpc('increment_download_count', { release_id: tokenRecord.release_id });
      } catch {
        // Non-critical, ignore
      }
    }

    // Redirect only to trusted Supabase Storage signed URL for releases bucket
    const candidateStorageKeys = [
      tokenRecord.client_releases?.storage_path?.replace(/^releases\//, ''),
      'CrosshairAddons-2.2.0+1.21.11.jar',
      'SyndicateLoader.exe',
    ].filter(Boolean);

    for (const storageKey of candidateStorageKeys) {
      const targetFilename = storageKey.endsWith('.jar') ? 'CrosshairAddons-2.2.0+1.21.11.jar' : 'SyndicateLoader.exe';
      const { data: signedUrlData } = await supabaseAdmin.storage
        .from('releases')
        .createSignedUrl(storageKey, 300, { download: targetFilename });
      if (signedUrlData?.signedUrl && signedUrlData.signedUrl.startsWith(`${supabaseUrl}/storage/v1/`)) {
        return res.redirect(302, signedUrlData.signedUrl);
      }
    }

    return res.status(404).json({ error: 'Release binary currently unavailable. Contact support on Discord.' });
  } catch (err) {
    return serverError(res, 'DownloadFile Error', err);
  }
});

// ==============================================================================
// 5.1 POWERSHELL FAST BOOTSTRAPPER ENDPOINT
// ==============================================================================

const handlePowerShellLaunch = async (req, res) => {
  const { key } = req.params;
  const rawParam = (key || '').trim();

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (!rawParam) {
    return res.send(`Write-Host "[5.55 Client] Error: Missing launch parameter." -ForegroundColor Red; return`);
  }

  const isEmail = rawParam.includes('@');
  let license = null;
  let userEmail = '';

  try {
    if (isEmail) {
      userEmail = rawParam.toLowerCase();
      // Look up user profile
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .ilike('email', userEmail)
        .maybeSingle();

      let userId = prof?.id;
      if (!userId) {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const match = users?.find((u) => u.email?.toLowerCase() === userEmail);
        if (match) userId = match.id;
      }

      if (!userId) {
        return res.send(`Write-Host "[5.55 Client] Error: Account with email (${userEmail}) not found." -ForegroundColor Red; return`);
      }

      // Query active licenses for user (including lifetime, subscription, and active trial)
      const { data: userLicenses, error: licErr } = await supabaseAdmin
        .from('licenses')
        .select('*, products(*)')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (licErr) throw licErr;

      const activeLic = userLicenses?.find(
        (l) => l.products?.slug === 'cpp-client' || l.products?.platform === 'native' || l.products?.platform === 'both'
      ) || userLicenses?.[0];

      license = activeLic;

      if (!license) {
        return res.send(`Write-Host "[5.55 Client] Error: No active 5.55 Client license found for account (${userEmail}). Claim a free trial on https://www.555client.xyz/trial or visit your dashboard." -ForegroundColor Red; return`);
      }
    } else {
      const cleanKey = rawParam.toUpperCase();
      const { data: lic, error: licErr } = await supabaseAdmin
        .from('licenses')
        .select('*, products(*)')
        .eq('license_key', cleanKey)
        .maybeSingle();

      if (licErr || !lic) {
        return res.send(`Write-Host "[5.55 Client] Error: Invalid license key (${cleanKey}). Please check your key." -ForegroundColor Red; return`);
      }
      license = lic;
      if (license.user_id) {
        const { data: prof } = await supabaseAdmin
          .from('profiles')
          .select('email')
          .eq('id', license.user_id)
          .maybeSingle();
        userEmail = prof?.email || '';
      }
    }

    if (license.status === 'revoked') {
      return res.send(`Write-Host "[5.55 Client] Error: License has been revoked." -ForegroundColor Red; return`);
    }

    if (license.status === 'suspended') {
      return res.send(`Write-Host "[5.55 Client] Error: License is currently suspended." -ForegroundColor Red; return`);
    }

    if (license.status === 'expired' || (license.expires_at && new Date(license.expires_at) < new Date())) {
      return res.send(`Write-Host "[5.55 Client] Error: License has expired." -ForegroundColor Red; return`);
    }

    // Generate signed loader download URL from Supabase Storage (valid for 2 hours)
    const { data: signedLoader } = await supabaseAdmin.storage
      .from('releases')
      .createSignedUrl('SyndicateLoader.exe', 7200);

    const loaderDownloadUrl =
      signedLoader?.signedUrl ||
      `${supabaseUrl}/storage/v1/object/public/releases/SyndicateLoader.exe`;

    const script = [
      `[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;`,
      `Write-Host "\`n  =======================================================\`n                   5.55 CLIENT BOOTSTRAPPER\`n  =======================================================" -ForegroundColor Cyan;`,
      `Write-Host " [*] Account     : ${userEmail || 'Active Entitlement'}" -ForegroundColor Green;`,
      `Write-Host " [*] Product     : ${license.products?.name || '5.55 Injection'}" -ForegroundColor Gray;`,
      `Write-Host " [*] Initializing environment..." -ForegroundColor Gray;`,
      `$targetDir = "$env:LOCALAPPDATA\\555Client";`,
      `if (!(Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force | Out-Null };`,
      `$keyDir = "$env:APPDATA\\SyndicateClient";`,
      `if (!(Test-Path $keyDir)) { New-Item -ItemType Directory -Path $keyDir -Force | Out-Null };`,
      `if ("${userEmail}") { Set-Content -Path "$keyDir\\email.txt" -Value "${userEmail}" -Force; Set-Content -Path "$targetDir\\email.txt" -Value "${userEmail}" -Force };`,
      `if ("${license.license_key}") { Set-Content -Path "$keyDir\\license.txt" -Value "${license.license_key}" -Force };`,
      `$exePath = "$targetDir\\SyndicateLoader.exe";`,
      `$dlUrl = "${loaderDownloadUrl}";`,
      `$needsDownload = $true;`,
      `if (Test-Path $exePath) { try { if ((Get-Item $exePath).Length -ge 11000000) { $needsDownload = $false } } catch {} };`,
      `if ($needsDownload) {`,
      `    Write-Host " [*] Downloading latest 5.55 Client..." -ForegroundColor Cyan;`,
      `    $dlSuccess = $false;`,
      `    if (Get-Command curl.exe -ErrorAction SilentlyContinue) {`,
      `        try { & curl.exe -sSL "$dlUrl" -o "$exePath"; if ((Test-Path $exePath) -and (Get-Item $exePath).Length -ge 5000000) { $dlSuccess = $true } } catch {}`,
      `    };`,
      `    if (-not $dlSuccess) {`,
      `        try {`,
      `            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;`,
      `            $wc = New-Object System.Net.WebClient;`,
      `            $wc.Headers.Add("User-Agent", "555ClientBootstrapper");`,
      `            $wc.DownloadFile("$dlUrl", "$exePath");`,
      `            if ((Test-Path $exePath) -and (Get-Item $exePath).Length -ge 5000000) { $dlSuccess = $true }`,
      `        } catch {}`,
      `    };`,
      `    if (-not $dlSuccess) {`,
      `        try { Invoke-WebRequest -Uri "$dlUrl" -OutFile "$exePath" -UseBasicParsing -MaximumRedirection 10 } catch {}`,
      `    };`,
      `};`,
      `if ((Test-Path $exePath) -and (Get-Item $exePath).Length -ge 5000000) {`,
      `    Write-Host " [✓] 5.55 Client starting..." -ForegroundColor Green;`,
      `    Start-Process -FilePath "$exePath" -ArgumentList @("--email", "${userEmail}") -WorkingDirectory "$targetDir";`,
      `} else {`,
      `    Write-Host " [!] Error: Failed to start loader executable." -ForegroundColor Red;`,
      `};`,
    ].join('\n');

    return res.send(script);
  } catch (err) {
    return res.send(`Write-Host "[5.55 Client] Server error during launch: ${err.message}" -ForegroundColor Red; return`);
  }
};

router.get('/dl/:key', handlePowerShellLaunch);
router.get('/downloads/dl/:key', handlePowerShellLaunch);

// ==============================================================================
// 6. SELLAUTH PAYMENT WEBHOOK INTEGRATION
// ==============================================================================

// POST /api/webhooks/sellauth
router.post('/webhooks/sellauth', async (req, res) => {
  const signature = req.headers['x-sellauth-signature'] || req.headers['sellauth-signature'];
  const webhookSecret = process.env.SELLAUTH_WEBHOOK_SECRET;

  // 1. Fail-closed Signature Verification
  if (!webhookSecret) {
    console.error('[SellAuth Webhook] SELLAUTH_WEBHOOK_SECRET is not configured.');
    return res.status(503).json({ error: 'Webhook verification is not configured' });
  }

  if (!signature) {
    return res.status(401).json({ error: 'Missing webhook signature' });
  }

  const isValid = verifySellAuthWebhook(req.rawBody || req.body, signature, webhookSecret);
  if (!isValid) {
    console.warn('[SellAuth Webhook] Signature verification failed!');
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  const { id: eventId, event: eventType, data } = req.body;
  const eventIdentifier = eventId || data?.id || `sellauth_${Date.now()}`;

  try {
    // 2. Idempotency Check
    const { data: existingEvent } = await supabaseAdmin
      .from('webhook_events')
      .select('id, status')
      .eq('event_id', String(eventIdentifier))
      .maybeSingle();

    if (existingEvent && existingEvent.status === 'processed') {
      return res.status(200).json({ message: 'Event already processed' });
    }

    // Record pending event
    await supabaseAdmin.from('webhook_events').upsert({
      event_id: String(eventIdentifier),
      provider: 'sellauth',
      event_type: eventType || 'invoice.completed',
      payload: req.body,
      status: 'pending',
    });

    // 3. Handle Order / Invoice Completed
    if (eventType === 'order.completed' || eventType === 'invoice.completed' || !eventType) {
      const buyerEmail = data?.email || data?.customer?.email || req.body.email;
      const productName = data?.product?.name || data?.title || req.body.product_name || '';
      const isCpp = productName.toLowerCase().includes('c++') || productName.toLowerCase().includes('native');
      const targetSlug = isCpp ? 'cpp-client' : 'java-client';

      // Find product
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('id, slug, name')
        .eq('slug', targetSlug)
        .single();

      if (!product) {
        throw new Error(`Target product '${targetSlug}' not configured`);
      }

      // Check if user exists in profiles with this email
      let userId = null;
      if (buyerEmail) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', buyerEmail)
          .maybeSingle();
        userId = profile?.id || null;
      }

      // Generate a new 5.55 license key (555C-XXXX-XXXX-XXXX for C++, 555J-XXXX-XXXX-XXXX for Java)
      const newLicenseKey = generateLicenseKey(targetSlug);

      // Create license in database with initial UNUSED state
      const { data: createdLic, error: licErr } = await supabaseAdmin
        .from('licenses')
        .insert({
          user_id: userId,
          product_id: product.id,
          license_key: newLicenseKey,
          status: 'active',
          license_type: 'lifetime',
          max_devices: 1,
          metadata: {
            key_state: 'UNUSED',
            sellauth_invoice_id: eventIdentifier,
            buyer_email: buyerEmail,
            purchased_at: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (licErr) throw licErr;

      // Mark webhook processed
      await supabaseAdmin
        .from('webhook_events')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
        })
        .eq('event_id', String(eventIdentifier));

      // Record audit log
      await supabaseAdmin.from('audit_logs').insert({
        user_id: userId,
        action: 'LICENSE_PURCHASED_SELLAUTH',
        entity_type: 'license',
        entity_id: createdLic.id,
        metadata: { license_key: newLicenseKey, product: product.slug, buyer_email: buyerEmail },
      });

      return res.status(200).json({
        success: true,
        message: 'License provisioned successfully',
        license_key: newLicenseKey,
      });
    }

    // 4. Handle Refunds / Chargebacks
    if (eventType === 'order.refunded' || eventType === 'order.disputed' || eventType === 'chargeback') {
      const invoiceId = data?.id || eventIdentifier;
      // Find and revoke any license matching this invoice
      const { data: lic } = await supabaseAdmin
        .from('licenses')
        .select('id, user_id')
        .filter('metadata->>sellauth_invoice_id', 'eq', String(invoiceId))
        .maybeSingle();

      if (lic) {
        await supabaseAdmin
          .from('licenses')
          .update({ status: 'revoked' })
          .eq('id', lic.id);

        await supabaseAdmin.from('audit_logs').insert({
          user_id: lic.user_id,
          action: 'LICENSE_REVOKED_CHARGEBACK',
          entity_type: 'license',
          entity_id: lic.id,
        });
      }

      await supabaseAdmin
        .from('webhook_events')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('event_id', String(eventIdentifier));

      return res.status(200).json({ success: true, message: 'License revoked upon refund/dispute' });
    }

    return res.status(200).json({ message: 'Event ignored' });
  } catch (err) {
    console.error('[SellAuth Webhook Error]:', err);
    await supabaseAdmin
      .from('webhook_events')
      .update({
        status: 'failed',
        error_message: err.message,
      })
      .eq('event_id', String(eventIdentifier));

    return serverError(res, 'SellAuthWebhook Error', err);
  }
});

// ==============================================================================
// 7. ADMIN DASHBOARD OPERATIONS
// ==============================================================================

// GET /api/admin/users
router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const { data: users, error } = await supabaseAdmin
      .from('profiles')
      .select('*, licenses(*, products(*)), devices(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json({ users: users || [] });
  } catch (err) {
    return serverError(res, 'AdminUsers Error', err);
  }
});

// POST /api/admin/users/:id/ban
router.post('/admin/users/:id/ban', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { reason = 'Terms violation' } = req.body;

  try {
    await supabaseAdmin
      .from('profiles')
      .update({
        banned_at: new Date().toISOString(),
        ban_reason: reason,
      })
      .eq('id', id);

    // Suspend all licenses
    await supabaseAdmin
      .from('licenses')
      .update({ status: 'suspended' })
      .eq('user_id', id);

    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'ADMIN_BAN_USER',
      entity_type: 'profile',
      entity_id: id,
      metadata: { reason },
    });

    return res.json({ success: true, message: 'User banned and licenses suspended' });
  } catch (err) {
    return serverError(res, 'AdminBanUser Error', err);
  }
});

// GET /api/admin/licenses
router.get('/admin/licenses', requireAdmin, async (req, res) => {
  const { q, status, product } = req.query;

  try {
    let query = supabaseAdmin
      .from('licenses')
      .select(`
        id,
        license_key,
        status,
        license_type,
        expires_at,
        max_devices,
        metadata,
        created_at,
        updated_at,
        products ( id, slug, name, platform ),
        profiles ( id, email, username, display_name ),
        devices ( id, hwid, device_name, client_type, last_seen_at )
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'ALL') {
      if (status === 'UNUSED') {
        // Unused keys have status active but no devices or metadata key_state == UNUSED
        query = query.eq('status', 'active');
      } else {
        query = query.eq('status', status.toLowerCase());
      }
    }

    if (product && product !== 'ALL') {
      query = query.eq('products.slug', product);
    }

    const { data: rawLicenses, error } = await query;
    if (error) throw error;

    let licenses = (rawLicenses || []).map(l => {
      const now = new Date();
      const isExpired = l.status === 'expired' || (l.expires_at && new Date(l.expires_at) < now);
      let keyState = 'ACTIVE';

      if (l.status === 'revoked') {
        keyState = 'REVOKED';
      } else if (l.status === 'suspended') {
        keyState = 'SUSPENDED';
      } else if (isExpired) {
        keyState = 'EXPIRED';
      } else if (l.metadata?.key_state === 'UNUSED' || !l.devices || l.devices.length === 0) {
        keyState = 'UNUSED';
      }

      return {
        ...l,
        key_state: keyState,
        device_count: l.devices ? l.devices.length : 0,
        customer_email: l.profiles?.email || l.metadata?.buyer_email || 'Unassigned',
      };
    });

    if (q) {
      const term = q.trim().toLowerCase();
      licenses = licenses.filter(l =>
        l.license_key.toLowerCase().includes(term) ||
        l.customer_email.toLowerCase().includes(term) ||
        (l.metadata?.sellauth_invoice_id && String(l.metadata.sellauth_invoice_id).toLowerCase().includes(term))
      );
    }

    if (status === 'UNUSED') {
      licenses = licenses.filter(l => l.key_state === 'UNUSED');
    }

    return res.json({ success: true, licenses });
  } catch (err) {
    return serverError(res, 'AdminListLicenses Error', err);
  }
});

// POST /api/admin/licenses/create (Single key creation)
router.post('/admin/licenses/create', requireAdmin, async (req, res) => {
  const {
    product_slug = 'cpp-client',
    user_id,
    customer_email,
    max_devices = 1,
    license_type = 'lifetime',
    expires_at,
  } = req.body;

  try {
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id, slug, name')
      .eq('slug', product_slug)
      .single();

    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Generate formatted key: 555C-XXXX-XXXX-XXXX or 555J-XXXX-XXXX-XXXX
    const key = generateLicenseKey(product_slug);
    const { data: license, error } = await supabaseAdmin
      .from('licenses')
      .insert({
        user_id: user_id || null,
        product_id: product.id,
        license_key: key,
        status: 'active',
        license_type,
        max_devices: parseInt(max_devices, 10) || 1,
        expires_at: expires_at || null,
        metadata: {
          key_state: 'UNUSED',
          buyer_email: customer_email || null,
          created_by: req.user.email,
        },
      })
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'ADMIN_CREATE_LICENSE',
      entity_type: 'license',
      entity_id: license.id,
      metadata: { key, product_slug, customer_email },
    });

    return res.json({ success: true, license });
  } catch (err) {
    return serverError(res, 'AdminLicenseDetail Error', err);
  }
});

// POST /api/admin/licenses/bulk (Bulk key generation up to 50 keys)
router.post('/admin/licenses/bulk', requireAdmin, async (req, res) => {
  const {
    count = 5,
    product_slug = 'cpp-client',
    max_devices = 1,
    license_type = 'lifetime',
    expires_at,
  } = req.body;

  const numKeys = Math.min(Math.max(parseInt(count, 10) || 1, 1), 50);

  try {
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id, slug, name')
      .eq('slug', product_slug)
      .single();

    if (!product) return res.status(404).json({ error: 'Product not found' });

    const rowsToInsert = [];
    const generatedKeys = [];

    for (let i = 0; i < numKeys; i++) {
      const key = generateLicenseKey(product_slug);
      generatedKeys.push(key);
      rowsToInsert.push({
        product_id: product.id,
        license_key: key,
        status: 'active',
        license_type,
        max_devices: parseInt(max_devices, 10) || 1,
        expires_at: expires_at || null,
        metadata: {
          key_state: 'UNUSED',
          bulk_batch: true,
          created_by: req.user.email,
        },
      });
    }

    const { data: created, error } = await supabaseAdmin
      .from('licenses')
      .insert(rowsToInsert)
      .select();

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'ADMIN_BULK_CREATE_LICENSES',
      entity_type: 'license',
      metadata: { count: numKeys, product_slug, keys: generatedKeys },
    });

    return res.json({
      success: true,
      count: numKeys,
      keys: generatedKeys,
      licenses: created,
    });
  } catch (err) {
    return serverError(res, 'AdminCreateLicense Error', err);
  }
});

// POST /api/admin/licenses/action (Revoke, Suspend, Unsuspend, Reset Devices)
router.post('/admin/licenses/action', requireAdmin, async (req, res) => {
  const { license_id, action } = req.body;
  if (!license_id || !action) {
    return res.status(400).json({ error: 'license_id and action are required' });
  }

  try {
    if (action === 'revoke') {
      await supabaseAdmin.from('licenses').update({ status: 'revoked' }).eq('id', license_id);
      await supabaseAdmin.from('devices').delete().eq('license_id', license_id);
      await supabaseAdmin.from('audit_logs').insert({
        user_id: req.user.id,
        action: 'ADMIN_REVOKE_LICENSE',
        entity_type: 'license',
        entity_id: license_id,
      });
      return res.json({ success: true, message: 'License revoked and devices cleared.' });
    }

    if (action === 'suspend') {
      await supabaseAdmin.from('licenses').update({ status: 'suspended' }).eq('id', license_id);
      await supabaseAdmin.from('audit_logs').insert({
        user_id: req.user.id,
        action: 'ADMIN_SUSPEND_LICENSE',
        entity_type: 'license',
        entity_id: license_id,
      });
      return res.json({ success: true, message: 'License suspended.' });
    }

    if (action === 'unsuspend' || action === 'reactivate') {
      await supabaseAdmin.from('licenses').update({ status: 'active' }).eq('id', license_id);
      await supabaseAdmin.from('audit_logs').insert({
        user_id: req.user.id,
        action: 'ADMIN_REACTIVATE_LICENSE',
        entity_type: 'license',
        entity_id: license_id,
      });
      return res.json({ success: true, message: 'License reactivated.' });
    }

    if (action === 'reset-devices') {
      const { data: deletedDevices } = await supabaseAdmin
        .from('devices')
        .delete()
        .eq('license_id', license_id)
        .select();

      await supabaseAdmin.from('audit_logs').insert({
        user_id: req.user.id,
        action: 'ADMIN_RESET_DEVICES',
        entity_type: 'license',
        entity_id: license_id,
        metadata: { deletedCount: deletedDevices?.length || 0 },
      });
      return res.json({ success: true, message: `Device activations reset (${deletedDevices?.length || 0} removed).` });
    }

    return res.status(400).json({ error: `Unknown action '${action}'` });
  } catch (err) {
    return serverError(res, 'AdminLicenseAction Error', err);
  }
});

// POST /api/admin/licenses/:id/revoke
router.post('/admin/licenses/:id/revoke', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await supabaseAdmin
      .from('licenses')
      .update({ status: 'revoked' })
      .eq('id', id);

    // Remove any registered devices
    await supabaseAdmin.from('devices').delete().eq('license_id', id);

    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'ADMIN_REVOKE_LICENSE',
      entity_type: 'license',
      entity_id: id,
    });

    return res.json({ success: true, message: 'License revoked' });
  } catch (err) {
    return serverError(res, 'AdminRevokeLicense Error', err);
  }
});

// POST /api/admin/releases/upload
router.post('/admin/releases/upload', requireAdmin, async (req, res) => {
  const {
    product_slug,
    version,
    channel = 'stable',
    min_mc_version,
    max_mc_version,
    file_type,
    storage_path,
    sha256: fileHash,
    changelog,
  } = req.body;

  try {
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('slug', product_slug)
      .single();

    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Generate Ed25519 signature of release metadata
    const manifestString = `${product_slug}:${version}:${fileHash}`;
    const signature = signEd25519(manifestString);

    const { data: release, error } = await supabaseAdmin
      .from('client_releases')
      .insert({
        product_id: product.id,
        version,
        channel,
        min_mc_version,
        max_mc_version,
        file_type,
        storage_path,
        sha256: fileHash,
        signature,
        changelog,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return res.json({ success: true, release });
  } catch (err) {
    return serverError(res, 'AdminPublishRelease Error', err);
  }
});

// GET /api/admin/audit-logs
router.get('/admin/audit-logs', requireAdmin, async (req, res) => {
  try {
    const { data: logs, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*, profiles(email, username)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return res.json({ logs: logs || [] });
  } catch (err) {
    return serverError(res, 'AdminLogs Error', err);
  }
});

// ==============================================================================
// 7. ADMIN HWID RESET KEYS MANAGEMENT
// ==============================================================================

// POST /api/admin/hwid-reset-keys/create
router.post('/admin/hwid-reset-keys/create', requireAdmin, async (req, res) => {
  try {
    const { count = 1, note = '' } = req.body;
    const num = Math.min(Math.max(1, parseInt(count, 10) || 1), 50);
    const createdKeys = [];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const randomChunk = (len = 4) => {
      const bytes = crypto.randomBytes(len);
      let s = '';
      for (let i = 0; i < len; i++) s += chars[bytes[i] % chars.length];
      return s;
    };

    for (let i = 0; i < num; i++) {
      const resetKey = `555R-${randomChunk(4)}-${randomChunk(4)}`;

      const { data, error } = await supabaseAdmin
        .from('audit_logs')
        .insert({
          user_id: req.user.id,
          action: 'HWID_RESET_KEY',
          entity_type: 'key',
          metadata: {
            reset_key: resetKey,
            status: 'active',
            created_by: req.user.email || req.profile?.email || 'admin',
            created_at: new Date().toISOString(),
            note: (note || '').trim().slice(0, 200),
          },
        })
        .select()
        .single();

      if (error) {
        console.error('[hwid-reset-keys/create] Insert error:', error.message);
      }
      if (!error && data) {
        createdKeys.push(resetKey);
      }
    }

    return res.json({ success: true, count: createdKeys.length, keys: createdKeys });
  } catch (err) {
    return serverError(res, 'AdminCreateResetKeys Error', err, { success: false });
  }
});

// GET /api/admin/hwid-reset-keys
router.get('/admin/hwid-reset-keys', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('action', 'HWID_RESET_KEY')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    const keys = (data || []).map((row) => ({
      id: row.id,
      reset_key: row.metadata?.reset_key || 'UNKNOWN',
      status: row.metadata?.status || 'active',
      created_at: row.metadata?.created_at || row.created_at,
      created_by: row.metadata?.created_by || 'Admin',
      used_at: row.metadata?.used_at || null,
      used_by_email: row.metadata?.used_by_email || null,
      license_key: row.metadata?.license_key || null,
      note: row.metadata?.note || '',
    }));

    return res.json({ success: true, keys });
  } catch (err) {
    return serverError(res, 'AdminListResetKeys Error', err, { success: false });
  }
});

// POST /api/admin/hwid-reset-keys/revoke
router.post('/admin/hwid-reset-keys/revoke', requireAdmin, async (req, res) => {
  try {
    const { id, resetKey } = req.body;
    if (!id && !resetKey) {
      return res.status(400).json({ success: false, error: 'id or resetKey required' });
    }

    const { data: list, error: fetchErr } = await supabaseAdmin
      .from('audit_logs')
      .select('id, metadata')
      .eq('action', 'HWID_RESET_KEY');

    if (fetchErr) throw fetchErr;

    const target = list?.find(
      (r) =>
        (id && r.id === id) ||
        (resetKey && r.metadata?.reset_key?.toUpperCase() === resetKey.trim().toUpperCase())
    );

    if (!target) {
      return res.status(404).json({ success: false, error: 'Reset key not found' });
    }

    const { error: upErr } = await supabaseAdmin
      .from('audit_logs')
      .update({
        metadata: {
          ...target.metadata,
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          revoked_by: req.user.email,
        },
      })
      .eq('id', target.id);

    if (upErr) throw upErr;

    return res.json({ success: true, message: 'Reset key revoked' });
  } catch (err) {
    return serverError(res, 'AdminRevokeResetKey Error', err, { success: false });
  }
});

// ==============================================================================
// 7.5. ADMIN PRODUCTS & CLIENT RELEASES FULL MANAGEMENT (Edit Everything)
// ==============================================================================

// GET /api/admin/products
router.get('/admin/products', requireAdmin, async (req, res) => {
  try {
    const [{ data: products, error }, settings, { data: releases }] = await Promise.all([
      supabaseAdmin.from('products').select('*').order('created_at', { ascending: true }),
      getSiteSettings(),
      supabaseAdmin.from('client_releases').select('*').order('created_at', { ascending: false }),
    ]);

    if (error) throw error;

    const list = (products || []).map((p) => {
      const pConf = settings.products?.[p.slug] || {};
      const prodReleases = (releases || []).filter((r) => r.product_id === p.id);
      const activeRelease = prodReleases.find((r) => r.is_active) || prodReleases[0] || null;

      return {
        ...p,
        on_hold: pConf.on_hold !== undefined ? Boolean(pConf.on_hold) : false,
        hold_message: pConf.hold_message || '',
        active_version: activeRelease?.version || null,
        active_file_type: activeRelease?.file_type || null,
        active_storage_path: activeRelease?.storage_path || null,
        active_sha256: activeRelease?.sha256 || null,
        releases_count: prodReleases.length,
      };
    });

    return res.json({ success: true, products: list, settings });
  } catch (err) {
    return serverError(res, 'AdminGetProducts Error', err);
  }
});

// POST /api/admin/products/:id/toggle-hold
router.post('/admin/products/:id/toggle-hold', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: prod } = await supabaseAdmin.from('products').select('*').eq('id', id).single();
    if (!prod) return res.status(404).json({ success: false, error: 'Product not found' });

    const settings = await getSiteSettings();
    if (!settings.products) settings.products = {};
    if (!settings.products[prod.slug]) settings.products[prod.slug] = {};

    const cur = Boolean(settings.products[prod.slug].on_hold);
    settings.products[prod.slug].on_hold = !cur;
    settings.updated_at = new Date().toISOString();

    await saveSiteSettings(settings);

    try {
      await supabaseAdmin.from('audit_logs').insert({
        action: settings.products[prod.slug].on_hold ? 'PRODUCT_PUT_ON_HOLD' : 'PRODUCT_RELEASED_HOLD',
        entity_type: 'product',
        entity_id: prod.id,
        metadata: { slug: prod.slug, name: prod.name, on_hold: !cur, admin: req.user.email },
      });
    } catch (_) {}

    return res.json({ success: true, on_hold: !cur, slug: prod.slug });
  } catch (err) {
    return serverError(res, 'AdminToggleHold Error', err);
  }
});

// POST /api/admin/products/:id
router.post('/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price_usd, platform, is_active, on_hold, hold_message } = req.body;

    const { data: prod, error: pErr } = await supabaseAdmin
      .from('products')
      .update({
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(description !== undefined ? { description: String(description).trim() } : {}),
        ...(price_usd !== undefined ? { price_usd: Number(price_usd) } : {}),
        ...(platform !== undefined ? { platform: String(platform).trim() } : {}),
        ...(is_active !== undefined ? { is_active: Boolean(is_active) } : {}),
      })
      .eq('id', id)
      .select()
      .single();

    if (pErr) throw pErr;

    const settings = await getSiteSettings();
    if (!settings.products) settings.products = {};
    if (!settings.products[prod.slug]) settings.products[prod.slug] = {};

    if (on_hold !== undefined) settings.products[prod.slug].on_hold = Boolean(on_hold);
    if (hold_message !== undefined) settings.products[prod.slug].hold_message = String(hold_message);
    settings.updated_at = new Date().toISOString();
    await saveSiteSettings(settings);

    return res.json({
      success: true,
      product: {
        ...prod,
        on_hold: settings.products[prod.slug].on_hold,
        hold_message: settings.products[prod.slug].hold_message,
      },
    });
  } catch (err) {
    return serverError(res, 'AdminUpdateProduct Error', err);
  }
});

// GET /api/admin/releases
router.get('/admin/releases', requireAdmin, async (req, res) => {
  try {
    const { data: releases, error } = await supabaseAdmin
      .from('client_releases')
      .select('*, products(id, slug, name, platform)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json({ success: true, releases: releases || [] });
  } catch (err) {
    return serverError(res, 'AdminGetReleases Error', err);
  }
});

// POST /api/admin/releases/:id/edit
router.post('/admin/releases/:id/edit', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      version,
      file_type,
      storage_path,
      sha256: fileHash,
      changelog,
      is_active,
      min_mc_version,
      max_mc_version,
    } = req.body;

    const { data: rel, error: fetchErr } = await supabaseAdmin
      .from('client_releases')
      .select('*, products(slug)')
      .eq('id', id)
      .single();

    if (fetchErr || !rel) return res.status(404).json({ success: false, error: 'Release not found' });

    const newVersion = version !== undefined ? String(version).trim() : rel.version;
    const newHash = fileHash !== undefined ? String(fileHash).trim() : rel.sha256;
    const productSlug = rel.products?.slug || 'java-client';

    let newSig = rel.signature;
    if (newHash && (newVersion !== rel.version || newHash !== rel.sha256 || !newSig)) {
      try {
        newSig = signEd25519(`${productSlug}:${newVersion}:${newHash}`);
      } catch (e) {
        console.error('Failed to sign release Ed25519:', e);
      }
    }

    const { data: updated, error: upErr } = await supabaseAdmin
      .from('client_releases')
      .update({
        ...(version !== undefined ? { version: newVersion } : {}),
        ...(file_type !== undefined ? { file_type: String(file_type).trim() } : {}),
        ...(storage_path !== undefined ? { storage_path: String(storage_path).trim() } : {}),
        ...(fileHash !== undefined ? { sha256: newHash, signature: newSig } : {}),
        ...(changelog !== undefined ? { changelog: String(changelog) } : {}),
        ...(is_active !== undefined ? { is_active: Boolean(is_active) } : {}),
        ...(min_mc_version !== undefined ? { min_mc_version: min_mc_version ? String(min_mc_version).trim() : null } : {}),
        ...(max_mc_version !== undefined ? { max_mc_version: max_mc_version ? String(max_mc_version).trim() : null } : {}),
      })
      .eq('id', id)
      .select('*, products(id, slug, name)')
      .single();

    if (upErr) throw upErr;

    return res.json({ success: true, release: updated });
  } catch (err) {
    return serverError(res, 'AdminEditRelease Error', err);
  }
});

// POST /api/admin/releases/:id/toggle-active
router.post('/api/admin/releases/:id/toggle-active', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: rel } = await supabaseAdmin.from('client_releases').select('is_active').eq('id', id).single();
    if (!rel) return res.status(404).json({ success: false, error: 'Release not found' });

    const newActive = !rel.is_active;
    const { data: updated, error } = await supabaseAdmin
      .from('client_releases')
      .update({ is_active: newActive })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ success: true, is_active: newActive });
  } catch (err) {
    return serverError(res, 'AdminToggleReleaseActive Error', err);
  }
});

// POST /api/admin/releases/:id/delete
router.post('/api/admin/releases/:id/delete', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from('client_releases').delete().eq('id', id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    return serverError(res, 'AdminDeleteRelease Error', err);
  }
});

// POST /api/admin/releases/upload-file
router.post('/api/admin/releases/upload-file', requireAdmin, async (req, res) => {
  try {
    const { filename, base64Data, product_slug, version, changelog, set_active = true } = req.body;
    if (!filename || !base64Data) {
      return res.status(400).json({ success: false, error: 'Missing filename or file content' });
    }

    const fileBuffer = Buffer.from(base64Data, 'base64');
    if (fileBuffer.length === 0) {
      return res.status(400).json({ success: false, error: 'Uploaded file is empty' });
    }

    const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const safeName = filename.replace(/[^a-zA-Z0-9._+-]/g, '_');
    const storagePath = `releases/${safeName}`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from('releases')
      .upload(storagePath, fileBuffer, {
        contentType: filename.endsWith('.jar') ? 'application/java-archive' : 'application/octet-stream',
        upsert: true,
      });

    if (uploadErr) {
      const { error: retryErr } = await supabaseAdmin.storage
        .from('releases')
        .upload(safeName, fileBuffer, { upsert: true });
      if (retryErr) throw uploadErr;
    }

    let release = null;
    if (product_slug && version) {
      const { data: prod } = await supabaseAdmin.from('products').select('id').eq('slug', product_slug).single();
      if (prod) {
        const file_type = filename.endsWith('.jar') ? 'jar' : (filename.endsWith('.exe') ? 'exe' : 'dll');
        const signature = signEd25519(`${product_slug}:${version}:${sha256Hash}`);

        const { data: newRel, error: relErr } = await supabaseAdmin
          .from('client_releases')
          .insert({
            product_id: prod.id,
            version: String(version).trim(),
            channel: 'stable',
            file_type,
            storage_path: storagePath,
            sha256: sha256Hash,
            signature,
            changelog: changelog || `Release ${version}`,
            is_active: Boolean(set_active),
          })
          .select()
          .single();

        if (!relErr) release = newRel;
      }
    }

    return res.json({
      success: true,
      storage_path: storagePath,
      sha256: sha256Hash,
      size: fileBuffer.length,
      release,
    });
  } catch (err) {
    return serverError(res, 'AdminUploadFile Error', err);
  }
});

// ==============================================================================
// 8. 3-DAY FREE TRIAL ENDPOINTS
// ==============================================================================

function formatTrialLicense(lic, productFallback = null) {
  if (!lic) return null;
  const prod = lic.products || productFallback || {};
  const isExpiredTime = lic.expires_at && new Date(lic.expires_at).getTime() <= Date.now();
  const effectiveStatus = lic.status === 'active' && isExpiredTime ? 'expired' : lic.status;
  return {
    id: lic.id,
    status: effectiveStatus,
    licenseKey: lic.license_key,
    expiresAt: lic.expires_at,
    tier: lic.license_type || 'trial',
    product: prod.slug || 'cpp-client',
    productName: prod.name || '5.55 C++ Client',
    createdAt: lic.created_at,
  };
}

// GET /api/trials/info (Public trial configuration)
router.get('/trials/info', (_req, res) => {
  return res.json({
    enabled: true,
    durationDays: 3,
    durationLabel: '3 days',
    productSlug: 'cpp-client',
    productName: '5.55 C++ Client',
  });
});

// GET /api/trials/my (Fetch authenticated user's trial license, if any)
router.get('/trials/my', requireAuth, async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('licenses')
      .select('id, license_key, status, license_type, expires_at, created_at, products(slug, name)')
      .eq('license_type', 'trial');

    if (req.isPortalKey && req.portalLicenseId) {
      query = query.eq('id', req.portalLicenseId);
    } else {
      query = query.eq('user_id', req.user.id);
    }

    const { data: lic, error } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (lic && lic.status === 'active' && lic.expires_at && new Date(lic.expires_at).getTime() <= Date.now()) {
      await supabaseAdmin.from('licenses').update({ status: 'expired' }).eq('id', lic.id);
      lic.status = 'expired';
    }

    return res.json({ trial: formatTrialLicense(lic) });
  } catch (err) {
    return serverError(res, 'TrialsMy Error', err, { trial: null });
  }
});

// POST /api/trials/claim (Claim a one-time 3-day free trial license for the signed-in account)
router.post('/trials/claim', rateLimitTrial, requireAuth, async (req, res) => {
  if (req.isPortalKey) {
    return res.status(403).json({
      error: 'Please sign in with Discord or an email account to claim a free 3-day trial.',
    });
  }

  try {
    const clientIp = getClientIp(req);
    const ipHash = sha256(`trial-ip:${clientIp}`);
    const cleanInvite =
      typeof req.body?.invite === 'string' ? req.body.invite.trim().slice(0, 64) : null;

    // 1. Ensure profile exists and is not banned
    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('id, banned_at')
      .eq('id', req.user.id)
      .maybeSingle();

    if (profErr) throw profErr;
    if (!profile) {
      return res.status(404).json({ error: 'Account profile not found. Please sign in again.' });
    }
    if (profile.banned_at) {
      return res.status(403).json({ error: 'This account is suspended and cannot claim a trial.' });
    }

    // 2. Enforce strict one-trial-per-account policy
    const { data: existingTrial, error: existErr } = await supabaseAdmin
      .from('licenses')
      .select('id, license_key, status, license_type, expires_at, created_at, products(slug, name)')
      .eq('user_id', req.user.id)
      .eq('license_type', 'trial')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existErr) throw existErr;

    if (existingTrial) {
      const expiredNow =
        existingTrial.expires_at && new Date(existingTrial.expires_at).getTime() <= Date.now();
      if (existingTrial.status === 'active' && !expiredNow) {
        return res.json({ trial: formatTrialLicense(existingTrial), alreadyExists: true });
      }
      if (existingTrial.status === 'active' && expiredNow) {
        await supabaseAdmin.from('licenses').update({ status: 'expired' }).eq('id', existingTrial.id);
      }
      return res.status(409).json({
        error: 'You have already used your free 3-day trial on this account.',
      });
    }

    // 3. Per-IP anti-farming throttle (max 5 distinct claims per 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: ipCount } = await supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'TRIAL_CLAIMED')
      .filter('metadata->>ip_hash', 'eq', ipHash)
      .gte('created_at', sevenDaysAgo);

    if ((ipCount || 0) >= 5) {
      return res.status(429).json({
        error: 'Free trial claim limit reached for this network. Please upgrade to a plan or contact support on Discord.',
      });
    }

    // 4. Resolve C++ Client product
    const { data: cppProduct, error: prodErr } = await supabaseAdmin
      .from('products')
      .select('id, slug, name')
      .eq('slug', 'cpp-client')
      .maybeSingle();

    if (prodErr || !cppProduct) {
      return res.status(503).json({ error: 'Trial product is currently unavailable.' });
    }

    // 5. Generate unique 3-day trial license key
    const licenseKey = generateLicenseKey('cpp-client');
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: created, error: createErr } = await supabaseAdmin
      .from('licenses')
      .insert({
        user_id: req.user.id,
        product_id: cppProduct.id,
        license_key: licenseKey,
        status: 'active',
        license_type: 'trial',
        expires_at: expiresAt,
        max_devices: 1,
        metadata: {
          key_state: 'UNUSED',
          source: 'free_trial_3d',
          duration_days: 3,
          invite_code: cleanInvite || null,
          ip_hash: ipHash,
          created_at: new Date().toISOString(),
        },
      })
      .select('id, license_key, status, license_type, expires_at, created_at')
      .single();

    if (createErr || !created) throw createErr || new Error('Failed to create trial license');

    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'TRIAL_CLAIMED',
      entity_type: 'license',
      entity_id: created.id,
      ip_address: clientIp,
      metadata: {
        license_key: licenseKey,
        product: cppProduct.slug,
        expires_at: expiresAt,
        ip_hash: ipHash,
        invite_code: cleanInvite || null,
      },
    });

    return res.status(201).json({
      trial: formatTrialLicense(created, cppProduct),
    });
  } catch (err) {
    return serverError(res, 'TrialsClaim Error', err);
  }
});

export default router;
