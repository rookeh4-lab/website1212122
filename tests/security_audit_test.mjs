import 'dotenv/config';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import app from '../api/index.js';
import { signEd25519, verifyEd25519 } from '../server/cryptoUtils.js';

const ROOT = process.cwd();

function collectFiles(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      collectFiles(full, exts, out);
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

function runStaticSecurityScan() {
  const codeFiles = [
    ...collectFiles(path.join(ROOT, 'src'), ['.js', '.jsx', '.css']),
    ...collectFiles(path.join(ROOT, 'server'), ['.js', '.mjs']),
    ...collectFiles(path.join(ROOT, 'api'), ['.js']),
    ...collectFiles(path.join(ROOT, 'netlify'), ['.js']),
    ...collectFiles(path.join(ROOT, 'tests'), ['.js', '.mjs']),
  ];

  const secretPatterns = [
    { name: 'Hardcoded Supabase secret base64', re: /c2Jfc2VjcmV0X0VZcW5BdWxHTTRXbkRqVUhMSFlyZVFfd3lNQXRsOEg=/ },
    { name: 'Hardcoded sb_secret key', re: /sb_secret_[A-Za-z0-9_-]{16,}/ },
    { name: 'Hardcoded PEM private key', re: /-----BEGIN PRIVATE KEY-----/ },
    { name: 'Hardcoded DEFAULT_PRIVATE_KEY', re: /DEFAULT_PRIVATE_KEY/ },
    { name: 'Permissive CORS origin:true', re: /origin:\s*true/ },
  ];

  for (const file of codeFiles) {
    if (file.endsWith('security_audit_test.mjs')) continue;
    const content = fs.readFileSync(file, 'utf8');
    for (const pat of secretPatterns) {
      assert.equal(pat.re.test(content), false, `${pat.name} found in ${path.relative(ROOT, file)}`);
    }
  }

  const distFiles = [
    ...collectFiles(path.join(ROOT, 'src'), ['.js', '.jsx']),
    ...collectFiles(path.join(ROOT, 'dist'), ['.js', '.html']),
  ];

  const deceptivePatterns = [
    { name: 'Implicit OAuth response_type=token', re: /response_type=token/ },
    { name: 'Fake fallback key CLIENT-YNYK', re: /CLIENT-YNYK/ },
    { name: 'Fake trial fallback prefix 555-TRIAL-', re: /555-TRIAL-/ },
    { name: 'Personal PayPal recipient email', re: /dervidev@gmail\.com/i },
    { name: 'Fake PayPal gift memo list', re: /happy birthday %user%/i },
    { name: 'Fake HWID alert (Demo)', re: /initiated \(Demo\)/i },
    { name: 'Discord OAuth hash token listener', re: /hash\.includes\(['"]access_token=['"]\)/ },
    { name: 'Legacy direct /auth/discord-sync call', re: /\/auth\/discord-sync/ },
  ];

  for (const file of distFiles) {
    if (file.endsWith('security_audit_test.mjs')) continue;
    const content = fs.readFileSync(file, 'utf8');
    for (const pat of deceptivePatterns) {
      assert.equal(pat.re.test(content), false, `${pat.name} found in ${path.relative(ROOT, file)}`);
    }
  }
  console.log('[PASS] Static source + build artifact security & anti-deception scan');
}

async function runHttpSecurityTests() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Security headers & health
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.headers.get('x-powered-by'), null, 'X-Powered-By must be disabled');
    assert.equal(healthRes.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(healthRes.headers.get('x-frame-options'), 'DENY');
    assert.equal(healthRes.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    const healthJson = await healthRes.json();
    assert.equal(healthRes.status, 200, `Expected 200 from /api/health, got ${healthRes.status}: ${JSON.stringify(healthJson)}`);
    assert.equal(healthJson.status, 'online');
    assert.equal(healthJson.db, 'connected');
    console.log('[PASS] Security headers + /api/health DB connectivity');

    // 2. Strict CORS policy
    const badCors = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'https://evil-phishing-site.example' },
    });
    assert.equal(badCors.headers.get('access-control-allow-origin'), null, 'Untrusted Origin must not receive ACAO');

    const goodCors = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'https://www.555client.xyz' },
    });
    assert.equal(goodCors.headers.get('access-control-allow-origin'), 'https://www.555client.xyz');
    assert.equal(goodCors.headers.get('access-control-allow-credentials'), 'true');
    console.log('[PASS] Strict CORS allowlist');

    // 3. Real /api/stats without fake numbers
    const statsRes = await fetch(`${baseUrl}/api/stats`);
    assert.equal(statsRes.status, 200);
    const statsJson = await statsRes.json();
    assert.equal(typeof statsJson.totalUsers, 'number');
    assert.equal(typeof statsJson.totalLicenses, 'number');
    assert.equal(typeof statsJson.totalLaunches, 'number');
    console.log('[PASS] /api/stats returns verified numeric metrics');

    // 4. Discord OAuth Authorization Code + PKCE + Open Redirect Rejection + CSRF State
    const evilOriginRes = await fetch(
      `${baseUrl}/api/auth/discord/start?origin=${encodeURIComponent('https://evil.example')}`,
      { redirect: 'manual' }
    );
    assert.equal(evilOriginRes.status, 400, 'Untrusted origin query must be explicitly rejected (400)');

    const oauthStartRes = await fetch(
      `${baseUrl}/api/auth/discord/start?origin=${encodeURIComponent('https://www.555client.xyz')}`,
      { redirect: 'manual' }
    );
    assert.equal(oauthStartRes.status, 302);
    const location = oauthStartRes.headers.get('location') || '';
    const locUrl = new URL(location);
    assert.equal(locUrl.origin, 'https://discord.com');
    assert.equal(locUrl.pathname, '/oauth2/authorize');
    assert.equal(locUrl.searchParams.get('response_type'), 'code', 'Must use Authorization Code flow, never implicit token');
    assert.equal(locUrl.searchParams.get('code_challenge_method'), 'S256', 'Must enforce PKCE S256');
    assert.ok(locUrl.searchParams.get('code_challenge'), 'Must supply code_challenge');
    assert.equal(
      locUrl.searchParams.get('redirect_uri'),
      'https://www.555client.xyz/login',
      'Must redirect strictly to canonical allowlisted callback URL'
    );
    const txCookie = oauthStartRes.headers.get('set-cookie') || '';
    assert.match(txCookie, /discord_oauth_tx=/);
    assert.match(txCookie, /HttpOnly/i);
    assert.match(txCookie, /SameSite=Lax/i);
    console.log('[PASS] Discord OAuth2 Authorization Code + PKCE S256 + origin allowlist');

    // 5. CSRF State Mismatch & Legacy Implicit Sync Rejection
    const cbMismatch = await fetch(`${baseUrl}/api/auth/discord/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: txCookie.split(';')[0],
      },
      body: JSON.stringify({ code: 'fake_code', state: 'forged_state' }),
    });
    assert.equal(cbMismatch.status, 403);

    const legacySyncRes = await fetch(`${baseUrl}/api/auth/discord-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: 'fake' }),
    });
    assert.equal(legacySyncRes.status, 410);
    console.log('[PASS] Discord CSRF state mismatch (403) + deprecated implicit sync (410)');

    // 6. Fast PowerShell bootstrapper endpoint validation
    const dlUnknownRes = await fetch(`${baseUrl}/dl/nonexistent_audit_user@example.com`);
    assert.equal(dlUnknownRes.status, 200);
    const dlUnknownBody = await dlUnknownRes.text();
    assert.ok(dlUnknownBody.includes('Account with email (nonexistent_audit_user@example.com) not found') || dlUnknownBody.includes('5.55 Client'));

    const dlValidRes = await fetch(`${baseUrl}/dl/rookeh4@gmail.com`);
    assert.equal(dlValidRes.status, 200);
    const dlValidBody = await dlValidRes.text();
    assert.ok(dlValidBody.includes('5.55 CLIENT BOOTSTRAPPER'), 'Must serve bootstrapper script for valid account');
    console.log('[PASS] Fast PowerShell /dl/:key bootstrapper endpoint functional');

    // 7. Fail-closed SellAuth Webhook Signature Check (both unconfigured 503 & configured 401)
    const origSecret = process.env.SELLAUTH_WEBHOOK_SECRET;
    try {
      delete process.env.SELLAUTH_WEBHOOK_SECRET;
      const unconfiguredWh = await fetch(`${baseUrl}/api/webhooks/sellauth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'unconf_test', event: 'order.completed', data: {} }),
      });
      assert.equal(unconfiguredWh.status, 503, 'Must fail closed (503) if SELLAUTH_WEBHOOK_SECRET is unset');

      process.env.SELLAUTH_WEBHOOK_SECRET = 'audit_test_secret_value_for_hmac_verification';
      const unsignedWh = await fetch(`${baseUrl}/api/webhooks/sellauth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'unauth_test', event: 'order.completed', data: {} }),
      });
      assert.equal(unsignedWh.status, 401);

      const badSigWh = await fetch(`${baseUrl}/api/webhooks/sellauth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sellauth-signature': crypto.createHmac('sha256', 'wrong-secret').update('{}').digest('hex'),
        },
        body: JSON.stringify({ id: 'bad_sig_test', event: 'order.completed', data: {} }),
      });
      assert.equal(badSigWh.status, 401);
    } finally {
      if (origSecret !== undefined) process.env.SELLAUTH_WEBHOOK_SECRET = origSecret;
      else delete process.env.SELLAUTH_WEBHOOK_SECRET;
    }
    console.log('[PASS] SellAuth webhook fails closed (503 unconfigured / 401 missing or bad signature)');

    // 8. Download Token Format Validation & Nosniff Headers
    const badDl = await fetch(`${baseUrl}/api/downloads/file/not-a-valid-token`);
    assert.equal(badDl.status, 400);
    assert.equal(badDl.headers.get('x-content-type-options'), 'nosniff');
    assert.match(badDl.headers.get('cache-control') || '', /no-store/i);
    console.log('[PASS] Download endpoint enforces hex token format and nosniff/no-store headers');

    // 9. Auth verify & logout cookie hygiene
    const unauthVerify = await fetch(`${baseUrl}/api/auth/verify`, { method: 'POST' });
    assert.equal(unauthVerify.status, 401);
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST' });
    assert.equal(logoutRes.status, 200);
    const logoutCookie = logoutRes.headers.get('set-cookie') || '';
    assert.match(logoutCookie, /555_session=;/);
    assert.match(logoutCookie, /HttpOnly/i);
    console.log('[PASS] Auth verify rejects unauthenticated requests (401) + logout clears HttpOnly session cookie');

    // 10. Favicon & Brand Logo HTML/Asset checks for Google Search
    const indexHtml = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
    assert.match(indexHtml, /sizes="48x48"/, 'Built index.html must include >=48x48 favicon link for Google Search');
    assert.match(indexHtml, /sizes="96x96"/, 'Built index.html must include 96x96 favicon link');
    assert.match(indexHtml, /sizes="192x192"/, 'Built index.html must include 192x192 favicon link');
    for (const iconFile of ['favicon.ico', 'favicon-48x48.png', 'favicon-96x96.png', 'favicon-144x144.png', 'android-chrome-192x192.png']) {
      assert.equal(fs.existsSync(path.join(ROOT, 'dist', iconFile)), true, `Missing dist/${iconFile}`);
    }
    console.log('[PASS] Google Search >=48px favicon & structured brand logo assets verified in dist/');

    // 11. 3-Day Free Trial Endpoints + HWID Auto-Login/Reset Validation Flow
    const trialInfoRes = await fetch(`${baseUrl}/api/trials/info`);
    assert.equal(trialInfoRes.status, 200);
    const trialInfo = await trialInfoRes.json();
    assert.equal(trialInfo.enabled, true);
    assert.equal(trialInfo.durationDays, 3);

    const unauthTrialMy = await fetch(`${baseUrl}/api/trials/my`);
    assert.equal(unauthTrialMy.status, 401);
    const unauthTrialClaim = await fetch(`${baseUrl}/api/trials/claim`, { method: 'POST' });
    assert.equal(unauthTrialClaim.status, 401);

    const { supabaseAdmin } = await import('../server/supabaseAdmin.js');
    const testEmail = `trial_audit_${Date.now()}@555client.xyz`;
    const testPassword = `AuditPass!${Date.now()}`;
    const { data: createdUser, error: createUserErr } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { username: 'trial_audit_user' },
    });
    assert.ifError(createUserErr);
    const testUserId = createdUser.user.id;

    try {
      await supabaseAdmin.from('profiles').upsert({
        id: testUserId,
        email: testEmail,
        username: 'trial_audit_user',
        display_name: 'trial_audit_user',
        role: 'user',
      });

      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      });
      assert.equal(loginRes.status, 200);
      const loginJson = await loginRes.json();
      const accessToken = loginJson.session?.access_token || loginJson.token;
      assert.ok(accessToken, 'Test user login must return session token');

      const authHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      };

      const preTrialRes = await fetch(`${baseUrl}/api/trials/my`, { headers: authHeaders });
      assert.equal(preTrialRes.status, 200);
      assert.equal((await preTrialRes.json()).trial, null);

      const claimRes = await fetch(`${baseUrl}/api/trials/claim`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({}),
      });
      assert.equal(claimRes.status, 201);
      const claimed = (await claimRes.json()).trial;
      assert.ok(claimed?.licenseKey?.startsWith('555C-'), 'Trial key must use 555C- format');
      assert.equal(claimed.status, 'active');
      assert.equal(claimed.tier, 'trial');
      const daysRemaining = (Date.parse(claimed.expiresAt) - Date.now()) / (24 * 60 * 60 * 1000);
      assert.ok(daysRemaining > 2.9 && daysRemaining <= 3.05, 'Trial expiry must be ~3 days');

      // Manual key validation registers HWID-1 and returns tier + username
      const hwid1 = 'AUDIT_HWID_ONE_' + Date.now();
      const hwid2 = 'AUDIT_HWID_TWO_' + Date.now();
      const val1 = await fetch(`${baseUrl}/api/licenses/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: claimed.licenseKey, hwid: hwid1, client_type: 'cpp', mc_version: '1.21.11' }),
      });
      assert.equal(val1.status, 200);
      const val1Json = await val1.json();
      assert.equal(val1Json.valid, true);
      assert.equal(val1Json.tier, 'trial');
      assert.equal(val1Json.username, 'trial_audit_user');

      // Different HWID gets exact prompt message
      const val2 = await fetch(`${baseUrl}/api/licenses/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: claimed.licenseKey, hwid: hwid2, client_type: 'cpp' }),
      });
      assert.equal(val2.status, 403);
      const val2Json = await val2.json();
      assert.equal(val2Json.error, 'DEVICE_LIMIT_REACHED');
      assert.equal(val2Json.message, 'Please reset HWID and try again');

      // Same HWID auto_login succeeds without prompt
      const autoOk = await fetch(`${baseUrl}/api/licenses/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: claimed.licenseKey, hwid: hwid1, client_type: 'cpp', auto_login: true }),
      });
      assert.equal(autoOk.status, 200);

      // Simulate HWID reset -> next auto_login requires re-entering key
      await supabaseAdmin.from('devices').delete().eq('license_id', claimed.id);
      const autoAfterReset = await fetch(`${baseUrl}/api/licenses/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: claimed.licenseKey, hwid: hwid1, client_type: 'cpp', auto_login: true }),
      });
      assert.equal(autoAfterReset.status, 401);
      assert.equal((await autoAfterReset.json()).error, 'HWID_RESET_REAUTH');

      // Manual re-auth after reset binds cleanly again
      const manualAfterReset = await fetch(`${baseUrl}/api/licenses/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: claimed.licenseKey, hwid: hwid2, client_type: 'cpp', auto_login: false }),
      });
      assert.equal(manualAfterReset.status, 200);
      assert.equal((await manualAfterReset.json()).valid, true);
      console.log('[PASS] 3-Day Trial claim, License Key validate, HWID lock & post-reset reauth verified');
    } finally {
      await supabaseAdmin.from('audit_logs').delete().eq('user_id', testUserId);
      await supabaseAdmin.from('sessions').delete().eq('user_id', testUserId);
      await supabaseAdmin.from('devices').delete().eq('user_id', testUserId);
      await supabaseAdmin.from('licenses').delete().eq('user_id', testUserId);
      await supabaseAdmin.from('profiles').delete().eq('id', testUserId);
      await supabaseAdmin.auth.admin.deleteUser(testUserId);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function runEd25519FallbackTest() {
  const prevPriv = process.env.ED25519_PRIVATE_KEY;
  const prevPub = process.env.ED25519_PUBLIC_KEY;
  const prevGrantSecret = process.env.GRANT_SIGNING_SECRET;
  try {
    delete process.env.ED25519_PRIVATE_KEY;
    delete process.env.ED25519_PUBLIC_KEY;
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.PORTAL_SESSION_SECRET) {
      process.env.GRANT_SIGNING_SECRET = 'audit-fallback-test-secret';
    }
    const payload = JSON.stringify({ test: 'ed25519-fallback', ts: Date.now() });
    const sig = signEd25519(payload);
    assert.ok(sig && sig.length > 20, 'Fallback Ed25519 signing must produce signature');
    assert.equal(verifyEd25519(payload, sig), true, 'Fallback Ed25519 public key must verify derived signature');
    assert.equal(verifyEd25519(payload + 'tamper', sig), false, 'Tampered payload must fail Ed25519 verification');
    console.log('[PASS] Deterministic Ed25519 fallback signing when ED25519_PRIVATE_KEY is unset');
  } finally {
    if (prevPriv !== undefined) process.env.ED25519_PRIVATE_KEY = prevPriv;
    else delete process.env.ED25519_PRIVATE_KEY;
    if (prevPub !== undefined) process.env.ED25519_PUBLIC_KEY = prevPub;
    else delete process.env.ED25519_PUBLIC_KEY;
    if (prevGrantSecret !== undefined) process.env.GRANT_SIGNING_SECRET = prevGrantSecret;
    else delete process.env.GRANT_SIGNING_SECRET;
  }
}

async function main() {
  runStaticSecurityScan();
  runEd25519FallbackTest();
  await runHttpSecurityTests();
  console.log('\nALL SECURITY AUDIT CHECKS PASSED.');
}

main().catch((err) => {
  console.error('\nSECURITY AUDIT FAILED:', err);
  process.exit(1);
});
