import crypto from 'crypto';

// Ed25519 keys loaded from environment variables, with deterministic PKCS#8 fallback
// derived from server-side secrets when ED25519_PRIVATE_KEY is omitted in hosting env.
const DEFAULT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEARd55FQilrg341RLIhPT3uNjimFGB283jN5YQYJJeH80=
-----END PUBLIC KEY-----
`;

const ED25519_PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');

const getDerivedPrivateKey = () => {
  const secret =
    process.env.GRANT_SIGNING_SECRET ||
    process.env.PORTAL_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    return null;
  }
  const seed = crypto
    .createHash('sha256')
    .update('555client-ed25519-grant-v1:')
    .update(secret)
    .digest();
  return crypto.createPrivateKey({
    key: Buffer.concat([ED25519_PKCS8_PREFIX, seed]),
    format: 'der',
    type: 'pkcs8',
  });
};

const getPrivateKey = () => {
  const raw = process.env.ED25519_PRIVATE_KEY;
  if (raw && raw.trim()) {
    return raw.replace(/\\n/g, '\n');
  }
  return getDerivedPrivateKey();
};

const getPublicKey = () => {
  const rawPub = process.env.ED25519_PUBLIC_KEY;
  if (rawPub && rawPub.trim()) {
    return rawPub.replace(/\\n/g, '\n');
  }
  const rawPriv = process.env.ED25519_PRIVATE_KEY;
  if (rawPriv && rawPriv.trim()) {
    return DEFAULT_PUBLIC_KEY.replace(/\\n/g, '\n');
  }
  const derivedPriv = getDerivedPrivateKey();
  if (derivedPriv) {
    return crypto.createPublicKey(derivedPriv);
  }
  return DEFAULT_PUBLIC_KEY.replace(/\\n/g, '\n');
};

/**
 * Sign data using Ed25519 private key
 * @param {string|Buffer} data
 * @returns {string} base64 signature
 */
export function signEd25519(data) {
  const privateKey = getPrivateKey();
  if (!privateKey) {
    throw new Error('ED25519_PRIVATE_KEY or server signing secret is not configured on the server');
  }
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
    const publicKey = getPublicKey();
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
    const cleanSig = String(signature).trim().replace(/^sha256=/i, '');
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expected = crypto
      .createHmac('sha256', secret)
      .update(raw)
      .digest('hex');
    if (cleanSig.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(cleanSig, 'utf-8'), Buffer.from(expected, 'utf-8'));
  } catch {
    return false;
  }
}

const getPortalSecret = () => {
  const base =
    process.env.PORTAL_SESSION_SECRET ||
    process.env.OAUTH_STATE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base) {
    throw new Error('Server signing secret is not configured');
  }
  return crypto.createHash('sha256').update(`kportal:${base}`).digest();
};

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
