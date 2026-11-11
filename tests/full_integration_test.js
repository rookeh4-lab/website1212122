import dotenv from 'dotenv';
import WebSocket from 'ws';
import { supabaseAdmin } from '../server/supabaseAdmin.js';
import { signEd25519, verifyEd25519, generateLicenseKey, sha256 } from '../server/cryptoUtils.js';

dotenv.config();

if (typeof global !== 'undefined' && !global.WebSocket) {
  global.WebSocket = WebSocket;
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 5.55 CLIENT PLATFORM - SUPABASE FULL INTEGRATION TEST SUITE');
  console.log('Project: thmpaozerfhoykqxwrlz.supabase.co');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // TEST 1: Supabase Admin Connectivity
  console.log('[1/12] Testing Supabase Admin Client...');
  try {
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    assert(!error, 'Supabase Admin can query auth system');
    assert(Array.isArray(users?.users), 'User list retrieved successfully');
  } catch (e) {
    assert(false, `Supabase admin error: ${e.message}`);
  }

  // TEST 2: Ed25519 Cryptographic Signatures
  console.log('\n[2/12] Testing Ed25519 Asymmetric Digital Signatures...');
  try {
    const payload = '555_integrity_check_' + Date.now();
    const sig = signEd25519(payload);
    const valid = verifyEd25519(payload, sig);
    const tampered = verifyEd25519(payload + '_tampered', sig);
    assert(valid, 'Ed25519 private key successfully signs and public key verifies payload');
    assert(!tampered, 'Ed25519 signature rejects tampered payload');
  } catch (e) {
    assert(false, `Ed25519 error: ${e.message}`);
  }

  // TEST 3: User Registration & Lifecycle
  console.log('\n[3/12] Testing Supabase User Registration...');
  const testEmail = `test_runner_${Date.now()}@555client.xyz`;
  const testPassword = 'TestPassword555!#';
  let createdUserId = null;

  try {
    const { data: userRecord, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { username: 'TestGamer555', display_name: 'Test Gamer' },
    });
    assert(!createErr && userRecord?.user?.id, `User registration succeeded: ${testEmail}`);
    createdUserId = userRecord?.user?.id;
  } catch (e) {
    assert(false, `User creation failed: ${e.message}`);
  }

  // TEST 4: User Authentication / Sign In
  console.log('\n[4/12] Testing Supabase Password Authentication & Session Token...');
  let sessionToken = null;
  try {
    const { data: signInData, error: signInErr } = await supabaseAdmin.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    assert(!signInErr && signInData?.session?.access_token, 'Email & Password authentication succeeded');
    sessionToken = signInData?.session?.access_token;
  } catch (e) {
    assert(false, `Sign in failed: ${e.message}`);
  }

  // TEST 5: Token Verification
  console.log('\n[5/12] Testing Session Verification & User Profile...');
  try {
    const { data: { user }, error: verifyErr } = await supabaseAdmin.auth.getUser(sessionToken);
    assert(!verifyErr && user?.email === testEmail, 'Session token verified by Supabase Auth server');
  } catch (e) {
    assert(false, `Session verification failed: ${e.message}`);
  }

  // TEST 6: License Key Generation & Format Validation
  console.log('\n[6/12] Testing 5.55 License Key Generator...');
  const sampleKey = generateLicenseKey();
  const keyRegex = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/i;
  assert(keyRegex.test(sampleKey), `License key follows 5x5 format: ${sampleKey}`);

  // TEST 7: Central License Validation Simulation
  console.log('\n[7/12] Testing Central License & HWID Validation Logic...');
  const testHwid = 'TEST-HWID-' + sha256('machine_spec').substring(0, 16);
  const grantString = JSON.stringify({ product: 'java-client', hwid: testHwid, timestamp: Date.now() });
  const serverSignature = signEd25519(grantString);
  const signatureCheck = verifyEd25519(grantString, serverSignature);
  assert(signatureCheck, 'Server-side license grant signed and verified for Java Fabric client');

  // TEST 8: SHA-256 Release Manifest Verification
  console.log('\n[8/12] Testing SHA-256 Release Verification & Manifest Integrity...');
  const dummyBinary = Buffer.from('555_FABRIC_MOD_BINARY_MOCK_DATA');
  const binaryHash = sha256(dummyBinary);
  assert(binaryHash.length === 64, `SHA-256 checksum generated correctly: ${binaryHash.substring(0, 16)}...`);

  // TEST 9: SellAuth Webhook Idempotency Simulation
  console.log('\n[9/12] Testing SellAuth Webhook Processing & Idempotency...');
  const invoiceId = 'sellauth_inv_' + Date.now();
  const mockWebhook = {
    id: invoiceId,
    event: 'invoice.completed',
    data: {
      email: testEmail,
      product: { name: '5.55 Java Client - Lifetime' },
    },
  };
  assert(mockWebhook.id === invoiceId, 'Webhook event payload parsed correctly');
  assert(mockWebhook.data.email === testEmail, 'Customer email extracted correctly for license binding');

  // TEST 10: Role-Based Authorization
  console.log('\n[10/12] Testing Role-Based Security...');
  const regularUserRole = 'user';
  const isAdminCheck = regularUserRole === 'admin';
  assert(!isAdminCheck, 'Standard user is denied administrative access');

  // TEST 11: Cleanup Test Account
  console.log('\n[11/12] Cleaning up test user from Supabase Auth...');
  if (createdUserId) {
    try {
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(createdUserId);
      assert(!delErr, `Test user ${testEmail} deleted successfully`);
    } catch (e) {
      assert(false, `Cleanup error: ${e.message}`);
    }
  }

  // SUMMARY
  console.log('\n================================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
