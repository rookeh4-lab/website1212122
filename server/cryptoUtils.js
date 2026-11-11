import crypto from 'crypto';

// Ed25519 Keys from environment or fallback to existing platform keys
const DEFAULT_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIA/zYinPV3tUvHqTwJnznQXkRWkqw9SBgAZdbxGwdmSV
-----END PRIVATE KEY-----
`;

const DEFAULT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEARd55FQilrg341RLIhPT3uNjimFGB283jN5YQYJJeH80=
-----END PUBLIC KEY-----
`;

const privateKey = (process.env.ED25519_PRIVATE_KEY || DEFAULT_PRIVATE_KEY).replace(/\\n/g, '\n');
const publicKey = (process.env.ED25519_PUBLIC_KEY || DEFAULT_PUBLIC_KEY).replace(/\\n/g, '\n');

/**
 * Sign data using Ed25519 private key
 * @param {string|Buffer} data
 * @returns {string} base64 signature
 */
export function signEd25519(data) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8');
  const signature = crypto.sign(null, buffer, privateKey);
  return signature.toString('base64');
}

/**
 * Verify Ed25519 signature
 * @param {string|Buffer} data
 * @param {string} signatureBase64
 * @returns {boolean}
 */
export function verifyEd25519(data, signatureBase64) {
  try {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8');
    const signature = Buffer.from(signatureBase64, 'base64');
    return crypto.verify(null, buffer, publicKey, signature);
  } catch {
    return false;
  }
}

/**
 * Compute SHA-256 hex digest
 * @param {string|Buffer} data
 * @returns {string}
 */
export function sha256(data) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8');
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Generate formatted 5.55 license key: 555C-XXXX-XXXX-XXXX or 555J-XXXX-XXXX-XXXX
 * @param {string} productSlugOrPrefix - 'cpp-client' | 'java-client' | '555C' | '555J'
 * @returns {string}
 */
export function generateLicenseKey(productSlugOrPrefix = '555C') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Base32 unambiguous
  const getRandomChunk = (len) => {
    let res = '';
    const bytes = crypto.randomBytes(len);
    for (let i = 0; i < len; i++) {
      res += chars[bytes[i] % chars.length];
    }
    return res;
  };

  let prefix = '555C';
  if (productSlugOrPrefix === 'java-client' || productSlugOrPrefix === '555_JAVA' || productSlugOrPrefix === '555J') {
    prefix = '555J';
  } else if (productSlugOrPrefix === 'cpp-client' || productSlugOrPrefix === '555_CPP' || productSlugOrPrefix === '555C') {
    prefix = '555C';
  } else if (typeof productSlugOrPrefix === 'string' && productSlugOrPrefix.length > 0) {
    prefix = productSlugOrPrefix.slice(0, 4).toUpperCase();
  }

  const c1 = prefix.padEnd(4, 'C');
  const c2 = getRandomChunk(4);
  const c3 = getRandomChunk(4);
  const c4 = getRandomChunk(4);

  return `${c1}-${c2}-${c3}-${c4}`;
}

/**
 * Generate secure single-use download token
 * @returns {string}
 */
export function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Verify HMAC-SHA256 signature for SellAuth webhooks
 * @param {string} payload - Raw request body
 * @param {string} signature - Header signature
 * @param {string} secret - SellAuth webhook secret
 * @returns {boolean}
 */
export function verifySellAuthWebhook(payload, signature, secret) {
  if (!secret || !signature) return false;
  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

const getPortalSecret = () =>
  process.env.PORTAL_SESSION_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  privateKey;

/**
 * Sign a short-lived portal session token for license-key login
 */
export function signPortalToken(payloadObj, ttlSeconds = 24 * 60 * 60) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'KPORTAL' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ ...payloadObj, exp: Math.floor(Date.now() / 1000) + ttlSeconds })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', getPortalSecret()).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

/**
 * Verify a portal session token
 */
export function verifyPortalToken(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, sig] = parts;
    const headerObj = JSON.parse(Buffer.from(header, 'base64url').toString('utf-8'));
    if (headerObj?.typ !== 'KPORTAL') return null;
    const expected = crypto.createHmac('sha256', getPortalSecret()).update(`${header}.${payload}`).digest('base64url');
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (!data?.exp || data.exp * 1000 < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}
