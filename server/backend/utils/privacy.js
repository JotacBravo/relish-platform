// Privacy helpers: IP pseudonymisation and removal of direct identifiers.
import crypto from 'crypto';

// Keyed hash (LOG_IP_SALT); without a key, a random one per process.
const IP_SALT = process.env.LOG_IP_SALT || crypto.randomBytes(32).toString('hex');

export function anonymizeIp(ip) {
  if (!ip) return 'anon:unknown';
  // ::ffff:127.0.0.1 -> 127.0.0.1
  const normalized = String(ip).replace(/^::ffff:/, '');
  const digest = crypto
    .createHmac('sha256', IP_SALT)
    .update(normalized)
    .digest('hex');
  // 12 hex characters = 48 bits.
  return `anon:${digest.slice(0, 12)}`;
}

// Never returned by the public feed nor stored in telemetry (case-insensitive).
export const PUBLIC_PII_FIELDS = ['email', 'prolific_id', 'prolific_pid'];

const isPlainObject = (v) =>
  !!v && typeof v === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(v));

// Copy of value without the given keys, at any depth.
export function stripFields(value, fields = PUBLIC_PII_FIELDS) {
  const blocked = new Set(fields.map((f) => f.toLowerCase()));
  const strip = (v) => {
    if (Array.isArray(v)) return v.map(strip);
    if (!isPlainObject(v)) return v;
    const out = {};
    for (const [key, val] of Object.entries(v)) {
      if (!blocked.has(key.toLowerCase())) out[key] = strip(val);
    }
    return out;
  };
  return strip(value);
}

// A telemetry event as stored: identifier keys dropped, and no answer for an
// identifier question.
export function scrubLogEvent(event) {
  if (!isPlainObject(event)) return event;
  const clean = stripFields(event);
  const blocked = new Set(PUBLIC_PII_FIELDS);
  if (typeof clean.questionName === 'string' && blocked.has(clean.questionName.toLowerCase())) {
    delete clean.answer;
  }
  return clean;
}
