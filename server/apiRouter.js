import express from 'express';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin, authenticateToken, requireAuth, requireAdmin } from './supabaseAdmin.js';
import {
  signEd25519,
  sha256,
  generateLicenseKey,
  generateToken,
  verifySellAuthWebhook,
  signPortalToken,
} from './cryptoUtils.js';

const router = express.Router();
router.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://thmpaozerfhoykqxwrlz.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_obBunwnFtclwda77bynVZw_1jsL_pnx';

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
// 1. HEALTH & INTROSPECTION
// ==============================================================================
router.get('/health', (req, res) => {
  res.json({
    status: 'online',
    platform: '5.55 Client Licensing System',
    timestamp: new Date().toISOString(),
  });
});

// ==============================================================================
// 2. AUTH VERIFICATION & USER ENDPOINTS
// ==============================================================================

// POST /api/auth/verify
router.post('/auth/verify', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false, error: 'No Bearer token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const authResult = await authenticateToken(token);
    if (!authResult) {
      return res.status(401).json({ valid: false, error: 'Invalid or expired token' });
    }

    const { user, profile, isPortalKey, portalLicenseId } = authResult;

    if (profile?.banned_at) {
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
    return res.status(500).json({ valid: false, error: err.message });
  }
});

// POST /api/auth/register (Instant verified registration without broken email redirects)
router.post('/auth/register', async (req, res) => {
  const { email, password, username } = req.body;
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

    return res.json({
      success: true,
      session: sessionData,
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
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/discord-sync (Verify Discord OAuth token server-side & mint Supabase session)
router.post('/auth/discord-sync', async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken || typeof accessToken !== 'string') {
    return res.status(400).json({ success: false, error: 'Discord access token is required.' });
  }

  try {
    // 1. Verify token directly with Discord API
    const discordRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!discordRes.ok) {
      return res.status(401).json({ success: false, error: 'Invalid or expired Discord OAuth token.' });
    }

    const discordUser = await discordRes.json();
    if (!discordUser?.id) {
      return res.status(401).json({ success: false, error: 'Unable to verify Discord profile.' });
    }

    const discordId = String(discordUser.id);
    const uname = discordUser.username || `discord_${discordId.slice(0, 6)}`;
    const dname = discordUser.global_name || uname;
    const avatarExt = discordUser.avatar?.startsWith('a_') ? 'gif' : 'png';
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.${avatarExt}?size=256`
      : null;

    // 2. Match existing profile by discord_id or verified Discord email
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
        return res.status(403).json({ success: false, error: `Account suspended: ${byDiscord.ban_reason || 'Terms violation'}` });
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
          return res.status(403).json({ success: false, error: `Account suspended: ${byEmail.ban_reason || 'Terms violation'}` });
        }
        targetUserId = byEmail.id;
        targetEmail = byEmail.email;
        targetRole = byEmail.role || 'user';
      }
    }

    // 3. Create Supabase Auth account if none matched yet
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

    // 4. Sync profile row
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

    // 5. Issue genuine Supabase Auth session
    const sessionData = await createSupabaseSessionForEmail(targetEmail);

    return res.json({
      success: true,
      token: sessionData.access_token,
      session: sessionData,
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
    console.error('[DiscordSync Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Discord authentication failed.' });
  }
});

// POST /api/auth/key-login (Log into web dashboard cleanly with a license key without consuming HWID slot)
router.post('/auth/key-login', async (req, res) => {
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
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// 2B. C++ CLIENT UNIFIED LOGIN & REFRESH ENDPOINTS
// ==============================================================================

// POST /api/auth/client-login
router.post('/auth/client-login', async (req, res) => {
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
    console.error('[ClientLogin Error]:', err);
    return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
});

// POST /api/auth/client-refresh (Refresh session using stored refresh_token)
router.post('/auth/client-refresh', async (req, res) => {
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
    return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
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
    return res.status(500).json({ error: err.message });
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
    const formatted = (licenses || []).map((lic) => ({
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
    }));

    return res.json({ licenses: formatted, orders: [] });
  } catch (err) {
    return res.status(500).json({ error: err.message, licenses: [] });
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
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/licenses/reset-hwid
router.post('/licenses/reset-hwid', requireAuth, async (req, res) => {
  const { licenseKey, resetKey } = req.body;
  if (!licenseKey) return res.status(400).json({ success: false, error: 'licenseKey required' });
  if (!resetKey || !resetKey.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Admin HWID Reset Key required. Please contact client administration or staff to obtain an authorized reset key.',
    });
  }

  const cleanLicKey = licenseKey.trim().toUpperCase();
  const cleanResetKey = resetKey.trim().toUpperCase();

  try {
    // 1. Verify reset key in audit_logs
    const { data: resetEntries, error: rkErr } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('action', 'HWID_RESET_KEY')
      .order('created_at', { ascending: false });

    if (rkErr) throw rkErr;

    const activeResetEntry = resetEntries?.find(
      (entry) =>
        entry.metadata?.reset_key?.toUpperCase() === cleanResetKey &&
        entry.metadata?.status === 'active'
    );

    if (!activeResetEntry) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or already used HWID Reset Key. Please request a valid reset key from an administrator.',
      });
    }

    // 2. Verify license ownership
    let licQuery = supabaseAdmin
      .from('licenses')
      .select('id, user_id')
      .eq('license_key', cleanLicKey);

    if (req.isPortalKey && req.portalLicenseId) {
      licQuery = licQuery.eq('id', req.portalLicenseId);
    } else {
      licQuery = licQuery.eq('user_id', req.user.id);
    }

    const { data: license, error: licErr } = await licQuery.maybeSingle();

    if (licErr || !license) {
      return res.status(404).json({ success: false, error: 'License not found on your account' });
    }

    // 3. Mark the reset key as used
    await supabaseAdmin
      .from('audit_logs')
      .update({
        metadata: {
          ...activeResetEntry.metadata,
          status: 'used',
          used_at: new Date().toISOString(),
          used_by: license.user_id || req.user.id,
          used_by_email: req.user.email || cleanLicKey,
          license_key: cleanLicKey,
        },
      })
      .eq('id', activeResetEntry.id);

    // 4. Delete devices for this license
    await supabaseAdmin.from('devices').delete().eq('license_id', license.id);

    // 5. Audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: license.user_id || (req.isPortalKey ? null : req.user.id),
      action: 'HWID_RESET',
      entity_type: 'license',
      entity_id: license.id,
      metadata: {
        reset_key: cleanResetKey,
        used_by_email: req.user.email || cleanLicKey,
      },
    });

    return res.json({
      success: true,
      message: 'HWID successfully reset! Your hardware binding has been cleared. You can now launch on your new PC.',
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
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
    return res.status(500).json({ success: false, error: err.message });
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
    return res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 3. CENTRAL LICENSE REDEMPTION & HWID VALIDATION API
// Used by Website Download Page, Java Fabric Client, and C++ Client Loader
// ==============================================================================

// POST /api/licenses/redeem (Public website redemption for download authorization)
router.post('/licenses/redeem', async (req, res) => {
  const { license_key } = req.body;
  if (!license_key) {
    return res.status(400).json({
      valid: false,
      error: 'MISSING_KEY',
      message: 'Please enter your license key.',
    });
  }

  const cleanKey = license_key.trim().toUpperCase();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

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

    // Find active release for this product
    const { data: activeRelease } = await supabaseAdmin
      .from('client_releases')
      .select('id')
      .eq('product_id', product.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Generate short-lived download token (15 mins)
    const token = generateToken(32);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Use license.user_id, or fallback to the master admin user ID if the license is not yet claimed to an account
    const tokenUserId = license.user_id || 'db2e8e63-3e6f-49b0-b39a-bd9179766f49';
    const releaseId = activeRelease?.id || 'bf797864-4ce8-4953-ba10-9fe6e7a0dd61';

    const { error: tokenInsertErr } = await supabaseAdmin.from('download_tokens').insert({
      license_id: license.id,
      user_id: tokenUserId,
      release_id: releaseId,
      token,
      expires_at: expiresAt,
      ip_address: clientIp,
    });

    if (tokenInsertErr) {
      console.error('[DownloadToken Insert Error]:', tokenInsertErr);
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
      version: '1.2.0',
      expires_at: expiresAt,
    });
  } catch (err) {
    console.error('[RedeemKey Error]:', err);
    return res.status(500).json({ valid: false, error: 'SERVER_ERROR', message: err.message });
  }
});

// POST /api/licenses/validate
router.post('/licenses/validate', async (req, res) => {
  const { license_key, hwid, client_type = 'java', mc_version } = req.body;

  if (!license_key || !hwid) {
    return res.status(400).json({
      valid: false,
      error: 'Missing license_key or hwid in request body',
    });
  }

  const cleanKey = license_key.trim().toUpperCase();
  const cleanHwid = hwid.trim();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

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

    // 5. First activation transition from UNUSED to ACTIVE
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

    // 6. Device check & registration
    const { data: existingDevice } = await supabaseAdmin
      .from('devices')
      .select('*')
      .eq('license_id', license.id)
      .eq('hwid', cleanHwid)
      .maybeSingle();

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
          message: `Maximum allowed devices (${license.max_devices}) registered. Unbind old device in dashboard first.`,
          registeredCount: currentDevices,
          maxDevices: license.max_devices,
        });
      }

      // Register new device
      await supabaseAdmin.from('devices').insert({
        license_id: license.id,
        user_id: license.user_id,
        hwid: cleanHwid,
        client_type: client_type === 'cpp' ? 'cpp' : 'java',
        ip_address: clientIp,
        device_name: req.body.device_name || `PC-${cleanHwid.substring(0, 8)}`,
      });
    }

    // 6. Record heartbeat session
    const sessionToken = generateToken(16);
    const sessionExpiry = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(); // 6 hours

    await supabaseAdmin.from('sessions').insert({
      user_id: license.user_id,
      license_id: license.id,
      device_id: existingDevice?.id || (await supabaseAdmin.from('devices').select('id').eq('license_id', license.id).eq('hwid', cleanHwid).single()).data?.id,
      session_token: sessionToken,
      client_type,
      mc_version: mc_version || '1.21.4',
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

    return res.json({
      valid: true,
      license_id: license.id,
      product_slug: product.slug,
      product_name: product.name,
      platform: product.platform,
      expires_at: license.expires_at,
      session_token: sessionToken,
      timestamp,
      signature,
    });
  } catch (err) {
    console.error('[ValidateLicense Error]:', err);
    return res.status(500).json({ valid: false, error: err.message });
  }
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
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/devices/remove
router.post('/api/devices/remove', requireAuth, async (req, res) => {
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
    return res.status(500).json({ error: err.message });
  }
});

// Alias for devices remove at /devices/remove
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
    return res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 4. PRODUCTS & RELEASES MANIFEST
// ==============================================================================

// GET /api/products
router.get('/products', async (req, res) => {
  try {
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('price_usd', { ascending: true });

    if (error) throw error;
    return res.json({ products: products || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
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
        version: '1.2.0',
        channel,
        min_mc_version: '1.21.0',
        max_mc_version: '1.21.4',
        file_type: prod.slug === 'java-client' ? 'jar' : 'exe',
        sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        signature: signEd25519('555_client_release_1.2.0'),
        changelog: 'Initial 5.55 Client stable release with full bypass support.',
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
    return res.status(500).json({ error: err.message });
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

    const { data: license, error: licErr } = await licQuery.maybeSingle();

    if (licErr || !license) {
      return res.status(403).json({
        authorized: false,
        error: `You do not own an active license for ${product_slug}.`,
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

    return res.json({
      authorized: true,
      token,
      download_url: `/api/downloads/file/${token}`,
      expires_at: expiresAt,
      version: release?.version || '1.21.11',
      sha256: release?.sha256 || '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      signature: release?.signature || signEd25519('555_release_manifest_token'),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/downloads/file/:token
router.get('/downloads/file/:token', async (req, res) => {
  const { token } = req.params;

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

    // Mark as used
    await supabaseAdmin
      .from('download_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenRecord.id);

    // Increment download count
    if (tokenRecord.release_id) {
      try {
        await supabaseAdmin.rpc('increment_download_count', { release_id: tokenRecord.release_id });
      } catch (countErr) {
        // Non-critical, ignore
      }
    }

    // Redirect to short-lived signed Supabase Storage URL (avoids hosting static executables directly)
    const candidateStorageKeys = [
      tokenRecord.client_releases?.storage_path?.replace(/^releases\//, ''),
      'SyndicateLoader.exe',
    ].filter(Boolean);

    for (const storageKey of candidateStorageKeys) {
      const { data: signedUrlData } = await supabaseAdmin.storage
        .from('releases')
        .createSignedUrl(storageKey, 300, { download: 'SyndicateLoader.exe' });
      if (signedUrlData?.signedUrl) {
        return res.redirect(signedUrlData.signedUrl);
      }
    }

    // Fallback: Check local executable path during local development
    const candidatePaths = [
      'c:\\Users\\devim\\Downloads\\syndicate injectable\\release\\SyndicateLoader.exe',
      path.resolve(process.cwd(), 'release', 'SyndicateLoader.exe'),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          res.setHeader('Content-Disposition', 'attachment; filename="SyndicateLoader.exe"');
          res.setHeader('Content-Type', 'application/vnd.microsoft.portable-executable');
          const fileBuf = fs.readFileSync(p);
          return res.send(fileBuf);
        } catch (readErr) {
          console.error('[Download file read error]:', readErr);
        }
      }
    }

    return res.status(404).json({ error: 'Release binary currently unavailable. Contact support on Discord.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 5.1 ONE-LINE POWERSHELL BOOTSTRAPPER (irm https://www.555client.xyz/dl/:key | iex)
// ==============================================================================

const handlePowerShellLaunch = async (req, res) => {
  const { key } = req.params;
  const rawParam = (key || '').trim();

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

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

      // Query active licenses for user
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
        return res.send(`Write-Host "[5.55 Client] Error: No active 5.55 Client license found for account (${userEmail})." -ForegroundColor Red; return`);
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

    // Generate short-lived signed binary URL from Supabase Storage
    const { data: signedLoader } = await supabaseAdmin.storage
      .from('releases')
      .createSignedUrl('SyndicateLoader.exe', 3600);

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
      `$targetAssets = "$targetDir\\assets";`,
      `if (!(Test-Path $targetAssets)) { New-Item -ItemType Directory -Path $targetAssets -Force | Out-Null };`,
      `$keyDir = "$env:APPDATA\\SyndicateClient";`,
      `if (!(Test-Path $keyDir)) { New-Item -ItemType Directory -Path $keyDir -Force | Out-Null };`,
      `if ("${userEmail}") { Set-Content -Path "$keyDir\\email.txt" -Value "${userEmail}" -Force; Set-Content -Path "$targetDir\\email.txt" -Value "${userEmail}" -Force };`,
      `if ("${license.license_key}") { Set-Content -Path "$keyDir\\license.txt" -Value "${license.license_key}" -Force };`,
      `$vidPath = "$targetAssets\\bg.mp4";`,
      `$vidUrl = "https://www.555client.xyz/assets/bg.mp4";`,
      `if (!(Test-Path $vidPath)) { Write-Host " [*] Downloading visual assets..." -ForegroundColor Cyan; try { if (Get-Command curl.exe -ErrorAction SilentlyContinue) { & curl.exe -sL "$vidUrl" -o "$vidPath" } else { (New-Object System.Net.WebClient).DownloadFile("$vidUrl", "$vidPath") } } catch {} };`,
      `$exePath = "$targetDir\\SyndicateLoader.exe";`,
      `$dlUrl = "${loaderDownloadUrl}";`,
      `$needsDownload = $true;`,
      `if (Test-Path $exePath) { try { if ((Get-Item $exePath).Length -ge 5500000) { $needsDownload = $false } } catch {} };`,
      `if ($needsDownload) { Write-Host " [*] Downloading latest 5.55 Client..." -ForegroundColor Cyan; try { if (Get-Command curl.exe -ErrorAction SilentlyContinue) { & curl.exe -sL "$dlUrl" -o "$exePath" } else { (New-Object System.Net.WebClient).DownloadFile("$dlUrl", "$exePath") } } catch { try { Invoke-WebRequest -Uri "$dlUrl" -OutFile "$exePath" -UseBasicParsing -MaximumRedirection 5 } catch {} } };`,
      `if (Test-Path $exePath) { Write-Host " [✓] 5.55 Client starting..." -ForegroundColor Green; Start-Process -FilePath "$exePath" -ArgumentList "--email ${userEmail}" -WorkingDirectory "$targetDir" } else { Write-Host " [!] Error: Failed to start loader executable." -ForegroundColor Red };`,
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

  // 1. Signature Verification
  if (webhookSecret && signature) {
    const isValid = verifySellAuthWebhook(req.body, signature, webhookSecret);
    if (!isValid) {
      console.warn('[SellAuth Webhook] Signature verification failed!');
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
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

    return res.status(500).json({ error: err.message });
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
    return res.status(500).json({ error: err.message });
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
    return res.status(500).json({ error: err.message });
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
    return res.status(500).json({ error: err.message });
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
    return res.status(500).json({ error: err.message });
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
    return res.status(500).json({ error: err.message });
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
    return res.status(500).json({ error: err.message });
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
    return res.status(500).json({ error: err.message });
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
    return res.status(500).json({ error: err.message });
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
    return res.status(500).json({ error: err.message });
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

    for (let i = 0; i < num; i++) {
      const p1 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const p2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const resetKey = `555R-${p1}-${p2}`;

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
            note: (note || '').trim(),
          },
        })
        .select()
        .single();

      if (error) {
        console.error('[hwid-reset-keys/create] Insert error:', error);
      }
      if (!error && data) {
        createdKeys.push(resetKey);
      }
    }

    return res.json({ success: true, count: createdKeys.length, keys: createdKeys });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
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
    return res.status(500).json({ success: false, error: err.message });
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
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
