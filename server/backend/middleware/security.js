// Admin authentication, security headers, CORS and input sanitisation.
import crypto from 'crypto';
import helmet from 'helmet';

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Bearer token check for admin-only endpoints (ADMIN_API_TOKEN).
// If no token is configured the endpoints stay closed.
export function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) {
    return res.status(503).json({ error: 'Admin access not configured.' });
  }
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  if (!token || !timingSafeEqual(token, expected)) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  next();
}

export const securityHeaders = helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// Allowed browser origins (ALLOWED_ORIGINS, comma-separated).
const DEFAULT_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : DEFAULT_ORIGINS;

export const corsOptions = {
  origin(origin, callback) {
    // Requests without an Origin header (same origin, curl) are allowed. Any
    // other origin gets no CORS headers, so a browser on that origin cannot
    // read the answer; the request itself is not turned into an error.
    callback(null, !origin || allowedOrigins.includes(origin));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Remove keys that start with '$' or contain '.' so request bodies cannot carry
// MongoDB operators.
function scrub(value) {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') {
    const clean = {};
    for (const [key, val] of Object.entries(value)) {
      if (key.startsWith('$') || key.includes('.')) continue;
      clean[key] = scrub(val);
    }
    return clean;
  }
  return value;
}

export function sanitizeBody(req, _res, next) {
  if (req.body && typeof req.body === 'object') req.body = scrub(req.body);
  next();
}
