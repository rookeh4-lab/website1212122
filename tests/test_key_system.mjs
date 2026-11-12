import 'dotenv/config';
import crypto from 'crypto';
import WebSocket from 'ws';
global.WebSocket = WebSocket;

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SELLAUTH_SECRET = process.env.SELLAUTH_WEBHOOK_SECRET;
const API_BASE = process.env.TEST_API_BASE || 'https://www.555client.xyz/api';

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required to run tests.');
}

const sbAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

async function runKeySystemTests() {
  console.log('================================================================');
  console.log('555 CLIENT — LICENSE KEY SYSTEM PRODUCTION TEST SUITE');
  console.log('Live Target API:', API_BASE);
  console.log('Supabase Project:', SUPABASE_URL);
  console.log('================================================================\n');

  const testSuffix = Date.now();
  const results = [];

  // Helper
  async function postApi(endpoint, body, headers = {}) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  // Fetch product IDs
  const { data: prods } = await sbAdmin.from('products').select('*');
  const cppProduct = prods.find(p => p.slug === 'cpp-client');
  const javaProduct = prods.find(p => p.slug === 'java-client');

  // --------------------------------------------------------------------------
  // TEST 1: Website Redemption - Invalid Key
  // --------------------------------------------------------------------------
  {
    const res = await postApi('/licenses/redeem', { license_key: '555C-INVALID-KEY-9999' });
    const pass = res.status === 404 && res.data.error === 'INVALID_KEY';
    results.push({ test: '1. Website Redemption: Invalid Key', pass, details: res.data });
    console.log(`[TEST 1] Invalid key redemption: ${pass ? 'PASS' : 'FAIL'} (HTTP ${res.status}: "${res.data.message}")`);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Website Redemption - Revoked Key
  // --------------------------------------------------------------------------
  {
    const key = `555C-REVOK-${testSuffix.toString().slice(-4)}-TEST`;
    await sbAdmin.from('licenses').insert({
      product_id: cppProduct.id,
      license_key: key,
      status: 'revoked',
    });

    const res = await postApi('/licenses/redeem', { license_key: key });
    const pass = res.status === 403 && res.data.error === 'LICENSE_REVOKED';
    results.push({ test: '2. Website Redemption: Revoked Key', pass, details: res.data });
    console.log(`[TEST 2] Revoked key redemption: ${pass ? 'PASS' : 'FAIL'} (HTTP ${res.status}: "${res.data.message}")`);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Website Redemption - Suspended Key
  // --------------------------------------------------------------------------
  {
    const key = `555C-SUSPD-${testSuffix.toString().slice(-4)}-TEST`;
    await sbAdmin.from('licenses').insert({
      product_id: cppProduct.id,
      license_key: key,
      status: 'suspended',
    });

    const res = await postApi('/licenses/redeem', { license_key: key });
    const pass = res.status === 403 && res.data.error === 'LICENSE_SUSPENDED';
    results.push({ test: '3. Website Redemption: Suspended Key', pass, details: res.data });
    console.log(`[TEST 3] Suspended key redemption: ${pass ? 'PASS' : 'FAIL'} (HTTP ${res.status}: "${res.data.message}")`);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Website Redemption - Expired Key
  // --------------------------------------------------------------------------
  {
    const key = `555C-EXPIR-${testSuffix.toString().slice(-4)}-TEST`;
    await sbAdmin.from('licenses').insert({
      product_id: cppProduct.id,
      license_key: key,
      status: 'active',
      expires_at: new Date(Date.now() - 3600000).toISOString(),
    });

    const res = await postApi('/licenses/redeem', { license_key: key });
    const pass = res.status === 403 && res.data.error === 'LICENSE_EXPIRED';
    results.push({ test: '4. Website Redemption: Expired Key', pass, details: res.data });
    console.log(`[TEST 4] Expired key redemption: ${pass ? 'PASS' : 'FAIL'} (HTTP ${res.status}: "${res.data.message}")`);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Website Redemption - Java Key Attempting C++ Loader Download
  // --------------------------------------------------------------------------
  {
    const key = `555J-JAVA1-${testSuffix.toString().slice(-4)}-TEST`;
    await sbAdmin.from('licenses').insert({
      product_id: javaProduct.id,
      license_key: key,
      status: 'active',
    });

    const res = await postApi('/licenses/redeem', { license_key: key });
    const pass = res.status === 403 && res.data.error === 'PRODUCT_MISMATCH';
    results.push({ test: '5. Website Redemption: Java Key Rejection', pass, details: res.data });
    console.log(`[TEST 5] Java key on C++ download: ${pass ? 'PASS' : 'FAIL'} (HTTP ${res.status}: "${res.data.message}")`);
  }

  // --------------------------------------------------------------------------
  // TEST 6: Website Redemption - Valid C++ Key (Generates Download Token)
  // --------------------------------------------------------------------------
  let validKey = `555C-VALID-${testSuffix.toString().slice(-4)}-TEST`;
  let downloadToken = null;
  {
    await sbAdmin.from('licenses').insert({
      product_id: cppProduct.id,
      license_key: validKey,
      status: 'active',
      metadata: { key_state: 'UNUSED' },
    });

    const res = await postApi('/licenses/redeem', { license_key: validKey });
    downloadToken = res.data.token;
    const pass = res.status === 200 && res.data.valid === true && !!downloadToken && res.data.file_name === 'SyndicateLoader.exe';
    results.push({ test: '6. Website Redemption: Valid C++ Key Download Grant', pass, details: res.data });
    console.log(`[TEST 6] Valid key redemption: ${pass ? 'PASS' : 'FAIL'} (Message: "${res.data.message}", Token: ${downloadToken?.slice(0, 8)}...)`);
  }

  // --------------------------------------------------------------------------
  // TEST 7: Download File Endpoint with Token
  // --------------------------------------------------------------------------
  {
    const res = await fetch(`${API_BASE}/downloads/file/${downloadToken}`);
    const pass = res.status === 200 || res.status === 302;
    results.push({ test: '7. Download File Delivery via Token', pass, details: { status: res.status } });
    console.log(`[TEST 7] Download token delivery: ${pass ? 'PASS' : 'FAIL'} (HTTP ${res.status})`);
  }

  // --------------------------------------------------------------------------
  // TEST 8: Re-using Expired / Consumed Download Token
  // --------------------------------------------------------------------------
  {
    const res = await fetch(`${API_BASE}/downloads/file/${downloadToken}`);
    const pass = res.status === 410 || res.status === 404;
    results.push({ test: '8. Consumed Download Token Rejection', pass, details: { status: res.status } });
    console.log(`[TEST 8] Consumed token rejected: ${pass ? 'PASS' : 'FAIL'} (HTTP ${res.status})`);
  }

  // --------------------------------------------------------------------------
  // TEST 9: Key Remains UNCONSUMED for Loader Activation after Download
  // --------------------------------------------------------------------------
  {
    const { data: licAfterDownload } = await sbAdmin.from('licenses').select('*').eq('license_key', validKey).single();
    const pass = licAfterDownload.status === 'active';
    results.push({ test: '9. Key Unconsumed After Website Redemption', pass });
    console.log(`[TEST 9] Key remains active for loader: ${pass ? 'PASS' : 'FAIL'} (Status: ${licAfterDownload.status})`);
  }

  // --------------------------------------------------------------------------
  // TEST 10: SellAuth Webhook - Rejects Unsigned + Generates Signed Key
  // --------------------------------------------------------------------------
  let sellAuthKey = null;
  {
    const invoiceId = `inv_test_${testSuffix}`;
    const unsignedRes = await postApi('/webhooks/sellauth', {
      id: invoiceId,
      event: 'order.completed',
      data: { id: invoiceId, email: `unsigned_${testSuffix}@555client.xyz` },
    });
    const rejectedUnsigned = unsignedRes.status === 401;
    results.push({ test: '10a. SellAuth Unsigned Rejection', pass: rejectedUnsigned, details: unsignedRes.data });
    console.log(`[TEST 10a] Unsigned webhook rejection: ${rejectedUnsigned ? 'PASS' : 'FAIL'} (Status: ${unsignedRes.status})`);

    if (!SELLAUTH_SECRET) {
      throw new Error('SELLAUTH_WEBHOOK_SECRET missing in environment.');
    }

    const payload = {
      id: invoiceId,
      event: 'order.completed',
      data: {
        id: invoiceId,
        email: `buyer_${testSuffix}@555client.xyz`,
        product: { name: '5.55 C++ Client Lifetime' },
      },
    };
    const sig = crypto.createHmac('sha256', SELLAUTH_SECRET).update(JSON.stringify(payload)).digest('hex');
    const res = await postApi('/webhooks/sellauth', payload, { 'x-sellauth-signature': sig });

    sellAuthKey = res.data.license_key;
    const formatMatch = /^555C-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(sellAuthKey || '');
    const pass = res.status === 200 && res.data.success && formatMatch;
    results.push({ test: '10b. SellAuth Webhook Key Generation', pass, details: res.data });
    console.log(`[TEST 10b] SellAuth auto-generation: ${pass ? 'PASS' : 'FAIL'} (Key: ${sellAuthKey}, Format: ${formatMatch ? '555C-XXXX-XXXX-XXXX' : 'INVALID'})`);
  }

  // --------------------------------------------------------------------------
  // TEST 11: SellAuth Webhook - Duplicate Webhook Delivery (Idempotency)
  // --------------------------------------------------------------------------
  {
    const invoiceId = `inv_test_${testSuffix}`;
    const dupPayload = {
      id: invoiceId,
      event: 'order.completed',
      data: { id: invoiceId, email: `buyer_${testSuffix}@555client.xyz` },
    };
    const dupSig = crypto.createHmac('sha256', SELLAUTH_SECRET).update(JSON.stringify(dupPayload)).digest('hex');
    const res = await postApi('/webhooks/sellauth', dupPayload, { 'x-sellauth-signature': dupSig });
    const pass = res.status === 200 && res.data.message === 'Event already processed';
    results.push({ test: '11. SellAuth Webhook Idempotency', pass, details: res.data });
    console.log(`[TEST 11] Duplicate webhook idempotency: ${pass ? 'PASS' : 'FAIL'} (Message: "${res.data.message}")`);
  }

  // --------------------------------------------------------------------------
  // TEST 12: SellAuth Webhook - Refund / Chargeback Revocation
  // --------------------------------------------------------------------------
  {
    const invoiceId = `inv_test_${testSuffix}`;
    const refundPayload = {
      id: `refund_${testSuffix}`,
      event: 'order.refunded',
      data: { id: invoiceId },
    };
    const refundSig = crypto.createHmac('sha256', SELLAUTH_SECRET).update(JSON.stringify(refundPayload)).digest('hex');
    const res = await postApi('/webhooks/sellauth', refundPayload, { 'x-sellauth-signature': refundSig });

    const { data: refundedLic } = await sbAdmin
      .from('licenses')
      .select('status')
      .eq('license_key', sellAuthKey)
      .single();

    const pass = refundedLic?.status === 'revoked';
    results.push({ test: '12. SellAuth Refund Auto-Revocation', pass, details: refundedLic });
    console.log(`[TEST 12] Refund auto-revocation: ${pass ? 'PASS' : 'FAIL'} (Status: ${refundedLic?.status})`);
  }

  console.log('\n================================================================');
  const allPass = results.every(r => r.pass);
  console.log(`SUMMARY: ${results.filter(r => r.pass).length}/${results.length} TESTS PASSED (${allPass ? '100% SUCCESS' : 'FAILURES DETECTED'})`);
  console.log('================================================================');
}

runKeySystemTests().catch(console.error);
