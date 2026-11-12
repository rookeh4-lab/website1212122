import 'dotenv/config';
import WebSocket from 'ws';
global.WebSocket = WebSocket;

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_BASE = process.env.TEST_API_BASE || 'https://www.555client.xyz/api';

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required to run tests.');
}

const sbAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

async function runTests() {
  console.log('================================================================');
  console.log('555 CLIENT — FULL PRODUCTION INTEGRATION TEST SUITE');
  console.log('Live Target API:', API_BASE);
  console.log('Supabase Project:', SUPABASE_URL);
  console.log('================================================================\n');

  const testSuffix = Date.now();
  const testPassword = 'TestPassword555!';

  // Helper: Create or ensure user in Supabase Auth
  async function ensureUser(email) {
    const { data: list } = await sbAdmin.auth.admin.listUsers();
    let user = list.users.find(u => u.email === email);
    if (!user) {
      const { data: created, error } = await sbAdmin.auth.admin.createUser({
        email,
        password: testPassword,
        email_confirm: true,
      });
      if (error) throw error;
      user = created.user;
    } else {
      await sbAdmin.auth.admin.updateUserById(user.id, { password: testPassword });
    }
    return user;
  }

  // Get products
  const { data: products } = await sbAdmin.from('products').select('*');
  const cppProduct = products.find(p => p.slug === 'cpp-client');
  const javaProduct = products.find(p => p.slug === 'java-client');

  const results = [];

  async function postApi(endpoint, body) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  // --------------------------------------------------------------------------
  // TEST 1: Invalid email
  // --------------------------------------------------------------------------
  {
    const res = await postApi('/auth/client-login', {
      email: `nonexistent_${testSuffix}@domain.invalid`,
      password: 'AnyPassword123!',
      hwid: 'hwid_invalid_email_test',
    });
    const pass = res.status === 401 && res.data.error === 'INVALID_CREDENTIALS';
    results.push({ test: 'Case 3: Invalid email', pass, details: res.data });
    console.log(`[TEST 3] Invalid email: ${pass ? 'PASS' : 'FAIL'} (HTTP ${res.status}: ${res.data.message || res.data.error})`);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Incorrect password
  // --------------------------------------------------------------------------
  {
    const user = await ensureUser(`user_pwdtest_${testSuffix}@555client.xyz`);
    const res = await postApi('/auth/client-login', {
      email: user.email,
      password: 'WrongPassword999!',
      hwid: 'hwid_wrong_pwd_test',
    });
    const pass = res.status === 401 && res.data.error === 'INVALID_CREDENTIALS';
    results.push({ test: 'Case 4: Incorrect password', pass, details: res.data });
    console.log(`[TEST 4] Incorrect password: ${pass ? 'PASS' : 'FAIL'} (HTTP ${res.status}: ${res.data.message || res.data.error})`);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Valid website account WITHOUT a license
  // --------------------------------------------------------------------------
  {
    const user = await ensureUser(`user_nolicense_${testSuffix}@555client.xyz`);
    // Ensure no licenses for this user
    await sbAdmin.from('licenses').delete().eq('user_id', user.id);

    const res = await postApi('/auth/client-login', {
      email: user.email,
      password: testPassword,
      hwid: 'hwid_nolicense_test',
    });
    const pass = res.status === 403 && (res.data.error === 'NO_LICENSE' || res.data.error === 'NO_CPP_LICENSE');
    results.push({ test: 'Case 2: Valid account without license', pass, details: res.data });
    console.log(`[TEST 2] Valid account without license: ${pass ? 'PASS' : 'FAIL'} (HTTP ${res.status}: ${res.data.message})`);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Java-only license attempting to access C++ client
  // --------------------------------------------------------------------------
  {
    const user = await ensureUser(`user_javaonly_${testSuffix}@555client.xyz`);
    await sbAdmin.from('licenses').delete().eq('user_id', user.id);
    await sbAdmin.from('licenses').insert({
      user_id: user.id,
      product_id: javaProduct.id,
      license_key: `555JA-${testSuffix}-JAVA-ONLY`,
      status: 'active',
      license_type: 'lifetime',
    });

    const res = await postApi('/auth/client-login', {
      email: user.email,
      password: testPassword,
      hwid: 'hwid_javaonly_test',
    });
    const pass = res.status === 403 && res.data.error === 'PRODUCT_MISMATCH';
    results.push({ test: 'Case 18: Java-only license attempting to access C++', pass, details: res.data });
    console.log(`[TEST 18] Java-only license accessing C++: ${pass ? 'PASS' : 'FAIL'} (HTTP ${res.status}: ${res.data.message})`);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Expired C++ license
  // --------------------------------------------------------------------------
  {
    const user = await ensureUser(`user_expired_${testSuffix}@555client.xyz`);
    await sbAdmin.from('licenses').delete().eq('user_id', user.id);
    await sbAdmin.from('licenses').insert({
      user_id: user.id,
      product_id: cppProduct.id,
      license_key: `555EX-${testSuffix}-EXPIRED`,
      status: 'active',
      license_type: 'subscription',
      expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // expired yesterday
    });

    const res = await postApi('/auth/client-login', {
      email: user.email,
      password: testPassword,
      hwid: 'hwid_expired_test',
    });
    const pass = res.status === 403 && res.data.error === 'LICENSE_EXPIRED';
    results.push({ test: 'Case 6: Expired license', pass, details: res.data });
    console.log(`[TEST 6] Expired license: ${pass ? 'PASS' : 'FAIL'} (HTTP ${res.status}: ${res.data.message})`);
  }

  // --------------------------------------------------------------------------
  // TEST 6: Revoked C++ license
  // --------------------------------------------------------------------------
  {
    const user = await ensureUser(`user_revoked_${testSuffix}@555client.xyz`);
    await sbAdmin.from('licenses').delete().eq('user_id', user.id);
    await sbAdmin.from('licenses').insert({
      user_id: user.id,
      product_id: cppProduct.id,
      license_key: `555RV-${testSuffix}-REVOKED`,
      status: 'revoked',
      license_type: 'lifetime',
    });

    const res = await postApi('/auth/client-login', {
      email: user.email,
      password: testPassword,
      hwid: 'hwid_revoked_test',
    });
    const pass = res.status === 403 && res.data.error === 'LICENSE_REVOKED';
    results.push({ test: 'Case 7: Revoked license', pass, details: res.data });
    console.log(`[TEST 7] Revoked license: ${pass ? 'PASS' : 'FAIL'} (HTTP ${res.status}: ${res.data.message})`);
  }

  // --------------------------------------------------------------------------
  // TEST 7: Valid account with active C++ license (New Device Registration)
  // --------------------------------------------------------------------------
  let validRefreshToken = null;
  let validHwid = `hwid_valid_active_${testSuffix}`;
  let validLicenseKey = `555OK-${testSuffix}-ACTIVE-CPP`;

  {
    const user = await ensureUser(`user_validcpp_${testSuffix}@555client.xyz`);
    await sbAdmin.from('licenses').delete().eq('user_id', user.id);
    const { data: lic } = await sbAdmin.from('licenses').insert({
      user_id: user.id,
      product_id: cppProduct.id,
      license_key: validLicenseKey,
      status: 'active',
      license_type: 'lifetime',
      max_devices: 1,
    }).select().single();

    const res = await postApi('/auth/client-login', {
      email: user.email,
      password: testPassword,
      hwid: validHwid,
      device_name: 'Test-PC-1',
    });

    const hasToken = !!res.data.session_token && !!res.data.access_token;
    const hasSignature = !!res.data.grant?.signature;
    const pass = res.status === 200 && res.data.success && hasToken && hasSignature;
    validRefreshToken = res.data.refresh_token;

    // Check device record in public.devices
    const { data: dev } = await sbAdmin.from('devices').select('*').eq('license_id', lic.id).eq('hwid', validHwid).maybeSingle();
    const devRegistered = !!dev && dev.client_type === 'cpp';

    results.push({ test: 'Case 1: Valid account with active C++ license', pass, details: res.data });
    results.push({ test: 'Case 9: New device registration', pass: devRegistered, details: dev });
    console.log(`[TEST 1] Valid C++ account login: ${pass ? 'PASS' : 'FAIL'} (Token: ${res.data.session_token?.slice(0, 8)}..., Sig: ${res.data.grant?.signature?.slice(0, 16)}...)`);
    console.log(`[TEST 9] New device registration in DB: ${devRegistered ? 'PASS' : 'FAIL'} (Device ID: ${dev?.id})`);
  }

  // --------------------------------------------------------------------------
  // TEST 8: Existing authorized device recognition
  // --------------------------------------------------------------------------
  {
    const res = await postApi('/auth/client-login', {
      email: `user_validcpp_${testSuffix}@555client.xyz`,
      password: testPassword,
      hwid: validHwid,
    });
    const pass = res.status === 200 && res.data.success === true;
    results.push({ test: 'Case 10: Existing authorized device recognition', pass, details: res.data });
    console.log(`[TEST 10] Existing authorized device: ${pass ? 'PASS' : 'FAIL'} (No error, re-authorized smoothly)`);
  }

  // --------------------------------------------------------------------------
  // TEST 9: Device limit reached
  // --------------------------------------------------------------------------
  {
    // Try logging in with a 2nd HWID when max_devices = 1
    const res = await postApi('/auth/client-login', {
      email: `user_validcpp_${testSuffix}@555client.xyz`,
      password: testPassword,
      hwid: `hwid_second_device_${testSuffix}`,
    });
    const pass = res.status === 403 && res.data.error === 'DEVICE_LIMIT_REACHED';
    results.push({ test: 'Case 8: Device limit reached', pass, details: res.data });
    console.log(`[TEST 8] Device limit reached: ${pass ? 'PASS' : 'FAIL'} (HTTP ${res.status}: ${res.data.message})`);
  }

  // --------------------------------------------------------------------------
  // TEST 10: Refresh token flow
  // --------------------------------------------------------------------------
  {
    const res = await postApi('/auth/client-refresh', {
      refresh_token: validRefreshToken,
      hwid: validHwid,
      client_type: 'cpp',
    });
    const pass = res.status === 200 && res.data.success && !!res.data.access_token && !!res.data.grant?.signature;
    results.push({ test: 'Case 12: Successful refresh token flow', pass, details: res.data });
    console.log(`[TEST 12] Refresh token flow: ${pass ? 'PASS' : 'FAIL'} (New Token: ${res.data.session_token?.slice(0, 8)}...)`);
  }

  // --------------------------------------------------------------------------
  // TEST 11: Invalid / expired refresh token
  // --------------------------------------------------------------------------
  {
    const res = await postApi('/auth/client-refresh', {
      refresh_token: 'invalid_dummy_refresh_token_9999',
      hwid: validHwid,
      client_type: 'cpp',
    });
    const pass = res.status === 401 && res.data.error === 'INVALID_REFRESH_TOKEN';
    results.push({ test: 'Case 11: Expired/invalid refresh token', pass, details: res.data });
    console.log(`[TEST 11] Invalid refresh token: ${pass ? 'PASS' : 'FAIL'} (HTTP ${res.status}: ${res.data.message})`);
  }

  // --------------------------------------------------------------------------
  // TEST 12: SellAuth Webhook Provisioning & Revocation
  // --------------------------------------------------------------------------
  {
    const webhookSecret = process.env.SELLAUTH_WEBHOOK_SECRET || '';
    const invoiceId = `inv_${testSuffix}`;
    const buyerEmail = `buyer_${testSuffix}@555client.xyz`;

    // 1. Simulate Completed Purchase of C++ Client
    const purchasePayload = {
      id: invoiceId,
      event: 'order.completed',
      data: {
        id: invoiceId,
        email: buyerEmail,
        product: { name: '5.55 C++ Client (Lifetime)' },
      },
    };

    let sigHeaders = {};
    if (webhookSecret) {
      const sig = crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(purchasePayload)).digest('hex');
      sigHeaders['x-sellauth-signature'] = sig;
    }

    const res = await fetch(`${API_BASE}/webhooks/sellauth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...sigHeaders },
      body: JSON.stringify(purchasePayload),
    });
    const data = await res.json();
    const createdKey = data.license_key;

    // Check in database
    const { data: licInDb } = await sbAdmin.from('licenses').select('*, products(*)').eq('license_key', createdKey).maybeSingle();
    const purchasePass = res.status === 200 && !!createdKey && licInDb?.status === 'active' && licInDb?.products?.slug === 'cpp-client';

    console.log(`[SELLAUTH PURCHASE] Auto-provisioned C++ license: ${purchasePass ? 'PASS' : 'FAIL'} (Key: ${createdKey})`);

    // 2. Simulate Chargeback / Refund
    const refundPayload = {
      id: `refund_${testSuffix}`,
      event: 'order.refunded',
      data: { id: invoiceId },
    };
    if (webhookSecret) {
      const sig2 = crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(refundPayload)).digest('hex');
      sigHeaders['x-sellauth-signature'] = sig2;
    }

    const res2 = await fetch(`${API_BASE}/webhooks/sellauth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...sigHeaders },
      body: JSON.stringify(refundPayload),
    });

    const { data: revokedLic } = await sbAdmin.from('licenses').select('*').eq('id', licInDb?.id).maybeSingle();
    const refundPass = res2.status === 200 && revokedLic?.status === 'revoked';

    console.log(`[SELLAUTH REFUND] Auto-revoked upon refund/dispute: ${refundPass ? 'PASS' : 'FAIL'} (Status: ${revokedLic?.status})`);
    results.push({ test: 'SellAuth: Purchase provisions C++ client', pass: purchasePass });
    results.push({ test: 'SellAuth: Refund revokes C++ client', pass: refundPass });
  }

  console.log('\n================================================================');
  console.log(`SUMMARY: ${results.filter(r => r.pass).length}/${results.length} INTEGRATION TESTS PASSED`);
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
