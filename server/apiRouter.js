import express from 'express';
import { supabaseAdmin, requireAuth, requireAdmin } from './supabaseAdmin.js';
import {
  signEd25519,
  sha256,
  generateLicenseKey,
  generateToken,
  verifySellAuthWebhook,
} from './cryptoUtils.js';

const router = express.Router();
router.use(express.json());

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
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ valid: false, error: 'Invalid or expired token' });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile?.banned_at) {
      return res.status(403).json({
        valid: false,
        error: 'Account suspended',
        reason: profile.ban_reason,
      });
    }

    // Fetch active licenses count
    const { count: licenseCount } = await supabaseAdmin
      .from('licenses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active');

    return res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        username: profile?.username || user.email.split('@')[0],
        displayName: profile?.display_name || user.email.split('@')[0],
        avatarUrl: profile?.avatar_url,
        role: profile?.role || 'user',
        createdAt: profile?.created_at || user.created_at,
      },
      activeLicenses: licenseCount || 0,
    });
  } catch (err) {
    return res.status(500).json({ valid: false, error: err.message });
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
    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authErr } = await supabaseAdmin.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (authErr || !authData?.user) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
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
          message: `Device limit reached (${activeLicense.max_devices}). Unbind your old device in the website dashboard before activating this machine.`,
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
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      expires_in: authData.session.expires_in,
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
    const { data: refreshData, error: refreshErr } = await supabaseAdmin.auth.refreshSession({
      refresh_token,
    });

    if (refreshErr || !refreshData?.user) {
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
      access_token: refreshData.session.access_token,
      refresh_token: refreshData.session.refresh_token,
      expires_in: refreshData.session.expires_in,
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
  return res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      username: req.profile?.username || req.user.email.split('@')[0],
      displayName: req.profile?.display_name || req.user.email.split('@')[0],
      avatar: req.profile?.avatar_url || null,
      role: req.profile?.role || 'user',
      createdAt: req.profile?.created_at || req.user.created_at,
    },
  });
});

// POST /api/licenses/redeem (Claim unassigned key)
router.post('/licenses/redeem', requireAuth, async (req, res) => {
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
  const { licenseKey } = req.body;
  if (!licenseKey) return res.status(400).json({ success: false, error: 'licenseKey required' });

  try {
    const { data: license } = await supabaseAdmin
      .from('licenses')
      .select('id')
      .eq('license_key', licenseKey.trim().toUpperCase())
      .eq('user_id', req.user.id)
      .single();

    if (!license) {
      return res.status(404).json({ success: false, error: 'License not found' });
    }

    // Delete devices
    await supabaseAdmin.from('devices').delete().eq('license_id', license.id);

    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'HWID_RESET',
      entity_type: 'license',
      entity_id: license.id,
    });

    return res.json({ success: true, message: 'HWID successfully reset!' });
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
    const { data: license } = await supabaseAdmin
      .from('licenses')
      .select('id, metadata')
      .eq('license_key', licenseKey.trim().toUpperCase())
      .eq('user_id', req.user.id)
      .single();

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
// 3. CENTRAL LICENSE & HWID VALIDATION API
// Used by Java Fabric Client, C++ Client, and Desktop Launcher
// ==============================================================================

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
      .single();

    if (licErr || !license) {
      return res.status(404).json({ valid: false, error: 'Invalid license key' });
    }

    // 2. Status check
    if (license.status !== 'active') {
      return res.status(403).json({
        valid: false,
        error: `License is ${license.status}`,
        status: license.status,
      });
    }

    // 3. Expiration check
    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      await supabaseAdmin
        .from('licenses')
        .update({ status: 'expired' })
        .eq('id', license.id);

      return res.status(403).json({
        valid: false,
        error: 'License has expired',
        expired_at: license.expires_at,
      });
    }

    // 4. Product compatibility check
    const product = license.products;
    if (client_type === 'java' && product.platform === 'native') {
      return res.status(403).json({
        valid: false,
        error: 'This license is for the C++ Client only, not Java Fabric',
      });
    }
    if (client_type === 'cpp' && product.platform === 'fabric') {
      return res.status(403).json({
        valid: false,
        error: 'This license is for the Java Client only, not C++ Native',
      });
    }

    // 5. Device check & registration
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
    const { data: license, error: licErr } = await supabaseAdmin
      .from('licenses')
      .select('id, status, expires_at, products!inner(id, slug, name)')
      .eq('user_id', req.user.id)
      .eq('products.slug', product_slug)
      .eq('status', 'active')
      .maybeSingle();

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
        user_id: req.user.id,
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
      version: release?.version || '1.2.0',
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
      .select('*, client_releases(*)')
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
      await supabaseAdmin.rpc('increment_download_count', { release_id: tokenRecord.release_id }).catch(() => {});
    }

    // Redirect to secure signed Supabase storage URL or serve file
    const storagePath = tokenRecord.client_releases?.storage_path;
    if (storagePath) {
      const { data: signedUrlData } = await supabaseAdmin.storage
        .from('releases')
        .createSignedUrl(storagePath, 300); // 5 min signed URL

      if (signedUrlData?.signedUrl) {
        return res.redirect(signedUrlData.signedUrl);
      }
    }

    // Fallback release file placeholder
    return res.send(`5.55 Client Binary Package (${tokenRecord.client_releases?.version || '1.2.0'}). Authenticated download verified.`);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

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

      // Generate a new 5.55 license key
      const newLicenseKey = generateLicenseKey();

      // Create license in database
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

// POST /api/admin/licenses/create
router.post('/admin/licenses/create', requireAdmin, async (req, res) => {
  const { product_slug, user_id, max_devices = 1, license_type = 'lifetime' } = req.body;

  try {
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id, slug')
      .eq('slug', product_slug)
      .single();

    if (!product) return res.status(404).json({ error: 'Product not found' });

    const key = generateLicenseKey();
    const { data: license, error } = await supabaseAdmin
      .from('licenses')
      .insert({
        user_id: user_id || null,
        product_id: product.id,
        license_key: key,
        status: 'active',
        license_type,
        max_devices,
      })
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'ADMIN_CREATE_LICENSE',
      entity_type: 'license',
      entity_id: license.id,
      metadata: { key, product_slug },
    });

    return res.json({ success: true, license });
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

export default router;
