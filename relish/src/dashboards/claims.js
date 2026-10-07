// Wording rules for sentences written from live data. An order or a "more than" is only
// stated when the gap is at least 10% of the leader (counts) or 5% of the scale (means).
export const COUNT_MARGIN = 0.10;
export const MIN_GROUP = 10;
export const SCALE_MARGIN = 0.05;

const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

// counts / percentages
export const clearlyAhead = (a, b) => num(a) > num(b) && num(a) - num(b) >= COUNT_MARGIN * Math.abs(num(a));
// 'ahead' | 'behind' | 'close'
export const compareCounts = (a, b) => (clearlyAhead(a, b) ? 'ahead' : clearlyAhead(b, a) ? 'behind' : 'close');

// means on a [lo, hi] rating scale
export const clearlyAheadOnScale = (a, b, lo, hi) => num(a) > num(b) && num(a) - num(b) >= SCALE_MARGIN * (hi - lo);
export const compareOnScale = (a, b, lo, hi) => (clearlyAheadOnScale(a, b, lo, hi) ? 'ahead'
  : clearlyAheadOnScale(b, a, lo, hi) ? 'behind' : 'close');

const FRACTIONS = [
  [10, 'one in ten'], [20, 'one in five'], [25, 'a quarter'], [100 / 3, 'a third'],
  [40, 'two in five'], [50, 'half'], [60, 'three in five'], [200 / 3, 'two thirds'],
  [75, 'three quarters'], [80, 'four in five'], [90, 'nine in ten'],
];
export function shareInWords(pct) {
  const p = num(pct);
  if (p <= 0 || p >= 100) return null;
  let best = null;
  FRACTIONS.forEach(([v, w]) => {
    const rel = (p - v) / v;
    if (Math.abs(rel) <= COUNT_MARGIN + 1e-9 && (!best || Math.abs(rel) < Math.abs(best.rel))) best = { v, w, rel };
  });
  if (!best) return null;
  return `${best.rel < 0 ? 'nearly' : 'about'} ${best.w}`;
}

// Share in words, or "{pct}%" when no fraction fits.
export const shareText = pct => shareInWords(pct) || `${Math.round(num(pct))}%`;

// "1 person" / "2 people"
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function ageAt(birthYear, respondedAt) {
  const y = Number(birthYear);
  const d = respondedAt ? new Date(respondedAt) : null;
  if (!Number.isFinite(y) || !d || Number.isNaN(d.getTime())) return null;
  const age = d.getFullYear() - y;
  return age >= 10 && age <= 100 ? age : null;
}

// Age band shown on cards instead of the exact age.
export function ageBand(age) {
  if (!Number.isFinite(age)) return null;
  if (age < 18) return 'under 18';
  if (age <= 24) return '18–24';
  if (age <= 34) return '25–34';
  return '35+';
}

// Replaces exact ages in generated card texts with the age band.
export function bandAgesInText(text, band) {
  if (typeof text !== 'string') return text;
  const of = n => band || ageBand(Number(n));
  const art = b => (/^(18|un)/.test(b) ? 'an' : 'a');
  return text
    .replace(/\b(?:(a|an)\s+)?(\d{2})[- ]year[- ]old\b/gi, (m, a, n) => {
      const b = of(n);
      if (!b) return m;
      if (!a) return `${b} year-old`;
      const t = art(b);
      return `${a[0] === 'A' ? t[0].toUpperCase() + t.slice(1) : t} ${b} year-old`;
    })
    .replace(/\baged (\d{2})\b(?![-–]\d)/gi, (m, n) => { const b = of(n); return b ? `aged ${b}` : m; })
    .replace(/\bborn in ((?:19|20)\d\d)\b/gi, (m, y) => {
      const b = band || ageBand(new Date().getFullYear() - Number(y));
      return b ? `in the ${b} age band` : m;
    });
}

export const median = values => {
  const v = values.filter(x => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : null;
};
