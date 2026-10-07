import { render, waitFor, act } from '@testing-library/react';
import { makeYouth, makeFutures } from './__fixtures__/syntheticSurveys';
import { clearlyAhead, clearlyAheadOnScale, shareInWords, ageAt, ageBand, bandAgesInText, median } from './claims';
import surveyRelishJSON from '../getsurvey/surveyRelishData';

jest.setTimeout(240000);

const R = r => r.responses || r;

beforeAll(() => {
  global.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 50, height: 12 });
  window.SVGElement.prototype.getComputedTextLength = () => 50;
  global.Image = class { set src(_v) { setTimeout(() => this.onerror && this.onerror(), 0); } };
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

// rendering
const textBlocks = root => {
  const picked = [];
  const walk = el => {
    if ([...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) {
      let b = el;
      while (b.parentElement && ['STRONG', 'EM', 'SPAN', 'B', 'I', 'A', 'SUP'].includes(b.tagName)) b = b.parentElement;
      if (!picked.includes(b)) picked.push(b);
    }
    [...el.children].forEach(walk);
  };
  walk(root);
  return picked.filter(b => !picked.some(o => o !== b && o.contains(b)))
    .map(b => b.textContent.replace(/\s+/g, ' ').trim()).filter(t => t.length > 1);
};

async function renderStory(youth) {
  global.fetch = url => {
    const u = String(url);
    if (u.includes('surveyType=youth')) return Promise.resolve({ ok: true, json: () => Promise.resolve(youth) });
    if (u.includes('manifest.json')) return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    return Promise.resolve({ ok: false, json: () => Promise.reject(new Error('not in test')) });
  };
  const Story = (await import('./story3')).default;
  let utils;
  await act(async () => { utils = render(<Story />); });
  await waitFor(() => expect(utils.container.textContent).toMatch(/About the data/), { timeout: 30000 });
  const blocks = textBlocks(utils.container);
  utils.unmount();
  return blocks;
}

async function renderReveal(records) {
  const { computeFuturesInsights, HopeGapSection, RelevanceSection, PeopleSection } = await import('./FuturesRadar');
  const ins = computeFuturesInsights(records);
  const utils = render(<div><HopeGapSection ins={ins} /><RelevanceSection ins={ins} /><PeopleSection ins={ins} records={records} /></div>);
  const blocks = textBlocks(utils.container);
  utils.unmount();
  return blocks;
}

// Numbers in the copy are rounded; allow one point either way at the margin.
const ahead = (a, b) => clearlyAhead(a + 1, b);                 // "a clearly ahead" is plausible
const close = (a, b) => !clearlyAhead(a - 1, b) && !clearlyAhead(b - 1, a);
const verdicts = { ahead: (a, b) => ahead(a, b), behind: (a, b) => ahead(b, a), close };

// [regex capturing two numbers, expected relation of the first to the second]
const PAIRS = [
  [/(\d+)% of them said “[^”]+”, ahead of “[^”]+” \((\d+)%\)/, 'ahead'],
  [/“[^”]+” \((\d+)%\) and “[^”]+” \((\d+)%\) are neck and neck/, 'close'],
  [/for others \((\d+)%\) more than for themselves \((\d+)%\)/, 'ahead'],
  [/for others \((\d+)%\) less than for themselves \((\d+)%\)/, 'behind'],
  [/for others \((\d+)%\) about as often as for themselves \((\d+)%\)/, 'close'],
  [/\((\d+)%\) leads, ahead of [a-z ]+ \((\d+)%\)/, 'ahead'],
  [/\((\d+)%\) and [a-z ]+ \((\d+)%\) lead together/, 'close'],
  [/price \((\d+)%\) overtakes taste \((\d+)%\)/, 'ahead'],
  [/price \((\d+)%\) rivals taste \((\d+)%\)/, 'close'],
  [/price \((\d+)%\) climbs, though it stays behind taste \((\d+)%\)/, 'behind'],
  [/Neck and neck\. Parents and family taught (\d+) of them; the internet taught (\d+)/, 'close'],
  [/Family still leads\. Parents and family taught (\d+) of them; the internet taught (\d+)/, 'ahead'],
  [/overtaken the family\. Parents and family taught (\d+) of them; the internet taught (\d+)/, 'behind'],
  [/lived abroad, (\d+)% describe their food culture as a mix; among those who never left, (\d+)%\. Every suitcase/, 'ahead'],
  [/(\d+)% of women call the kitchen their zone, against (\d+)% of men/, null], // relation from the lead-in, below
];

function checkBlocks(blocks) {
  const problems = [];
  const all = blocks.join('\n');
  const flag = (msg, text) => problems.push(`${msg}\n      ${text.slice(0, 220)}`);

  blocks.forEach((t, i) => {
    if (/\b(NaN|undefined|Infinity|null)\b/.test(t)) flag('broken value', t);
    if (/\bexactly (equal|the same|\d)/i.test(t)) flag('"exactly" is not allowed for data', t);
    if (/\b1 (people|castaways|countries|respondents)\b/.test(t)) flag('singular/plural', t);
    (t.match(/\b(\d{3,})%/g) || []).forEach(m => { if (parseInt(m, 10) > 100 && !/more than 100%/.test(t)) flag('percentage above 100', t); });
    const quoted = (t.match(/“[^”]+”/g) || []).filter(q => q.length > 8);
    if (new Set(quoted).size !== quoted.length) flag('the same item is named twice in one sentence', t);

    PAIRS.forEach(([re, rel]) => {
      const m = t.match(re);
      if (!m || !rel) return;
      const a = +m[1], b = +m[2];
      if (!verdicts[rel](a, b)) flag(`says "${rel}" but the numbers are ${a} vs ${b}`, t);
    });

    // gender confidence: "splits" needs a clear gap, "barely differs" a small one
    const z = t.match(/(\d+)% of women call the kitchen their zone, against (\d+)% of men/);
    if (z) {
      const [a, b] = [+z[1], +z[2]];
      if (/barely differs/.test(t) && !close(a, b)) flag(`"barely differs" but ${a} vs ${b}`, t);
      if (/splits by gender/.test(t) && close(a, b) && !ahead(a, b) && !ahead(b, a)) flag(`"splits" but ${a} vs ${b}`, t);
    }
    // no gender comparison when one group is missing from the sample
    if (/women/.test(t) && /\bmen\b/.test(t) && /(more often than women|gap survives|splits by gender|men lead|gap between women and men)/.test(t)
      && (!/[1-9]\d*% of women/.test(all) || !/[1-9]\d*% of men/.test(all))) flag('compares women and men with an empty group', t);
    // "more than half" / "about half"
    const h = t.match(/That's (\d+)%, (more than half|about half|nearly half)/);
    if (h) {
      const p = +h[1];
      if (h[2] === 'more than half' && !ahead(p, 50)) flag(`"more than half" at ${p}%`, t);
      if (h[2] !== 'more than half' && Math.abs(p - 50) > 6) flag(`"${h[2]}" at ${p}%`, t);
    }
    // income trends on the 0–100 index: 5-point margin
    [[/home meals (rise with income|fall as income rises|hold steady everywhere) \((\d+) → (\d+)\)/, 'rise with income', 'fall as income rises'],
     [/eating out (climbs with the pay cheque|falls as income rises|holds steady across incomes) \((\d+) → (\d+)\)/, 'climbs with the pay cheque', 'falls as income rises']]
      .forEach(([re, up, down]) => {
        const m = t.match(re);
        if (!m) return;
        const lo = +m[2], hi = +m[3];
        const want = hi - lo >= 5 ? up : lo - hi >= 5 ? down : 'steady';
        if (want === 'steady' ? !/steady/.test(m[1]) : m[1] !== want) {
          if (Math.abs(Math.abs(hi - lo) - 5) > 1) flag(`trend "${m[1]}" but ${lo} → ${hi}`, t);
        }
      });
    // title + body pairs: daily cooking, household "me", long stays
    const daily = t.match(/^(\d+)% of women cook every single day\. (\d+)% of men do the same\.$/);
    if (daily) {
      const [a, b] = [+daily[1], +daily[2]];
      const body = blocks[i + 1] || '';
      if (/gap survives/.test(body) && !ahead(a, b)) flag(`"gap survives" but ${a} vs ${b}`, body);
      if (/the two are close/.test(body) && !close(a, b)) flag(`"close" but ${a} vs ${b}`, body);
      if (/men lead on daily cooking/.test(body) && !ahead(b, a)) flag(`"men lead" but ${a} vs ${b}`, body);
    }
    const me = t.match(/“Me,” say (\d+)% of women\./);
    if (me) {
      const body = blocks[i + 1] || '';
      const m2 = body.match(/Men answer “me” (\d+)%/);
      if (m2) {
        const [a, b] = [+me[1], +m2[1]];
        if (/still political/.test(body) && !ahead(a, b)) flag(`"still political" but ${a} vs ${b}`, body);
        if (/gap between women and men is small/.test(body) && !close(a, b)) flag(`"small gap" but ${a} vs ${b}`, body);
      }
    }
    const stay = t.match(/over a year, (\d+)% say their eating changed “a lot” or “completely”, versus (\d+)%/);
    if (stay) {
      const [a, b] = [+stay[1], +stay[2]];
      const title = blocks[i - 1] || '';
      if (/palate gives in/.test(title) && !ahead(a, b)) flag(`"palate gives in" but ${a} vs ${b}`, title);
      if (/barely changes the palate/.test(title) && !close(a, b)) flag(`"barely changes" but ${a} vs ${b}`, title);
    }
  });
  // ch. 14: minority / about half / majority of respondents follow food creators
  const fol = all.match(/\((\d+) of (\d+)\),? (?:follow food creators online|they also travel down a screen)/);
  if (fol) {
    const [c, N] = [+fol[1], +fol[2]];
    if (/A minority cooks from the feed/.test(all) && !clearlyAhead(N - c, c)) flag(`"minority" but ${c} of ${N}`, all.match(/.*A minority.*/)[0]);
    if (/Half the table follows the feed/.test(all) && (clearlyAhead(c, N - c) || clearlyAhead(N - c, c))) flag(`"half" but ${c} of ${N}`, 'Half the table follows the feed');
    if (/The new cookbook is a feed/.test(all) && !clearlyAhead(c, N - c)) flag(`"new cookbook" but ${c} of ${N}`, 'The new cookbook is a feed');
  } else if (/follow food creators online/.test(all)) flag('ch. 14 lede without its counts', 'follow food creators online');
  return { problems, text: all };
}

// Independent checks from the raw data: gardens and the pizza ranking.
function oracle(raw, text) {
  const problems = [];
  const rs = raw.map(R);
  const byCountry = {};
  const total = {};
  rs.forEach(r => {
    const cs = (Array.isArray(r.connected_cuisines) ? r.connected_cuisines : []).filter(c => c !== 'other');
    cs.forEach(c => { total[c] = (total[c] || 0) + 1; });
    const c = r.country_live || r.country_birth;
    if (c && cs.length) (byCountry[c] = byCountry[c] || []).push(cs);
  });
  const top = Object.entries(total).sort((a, b) => b[1] - a[1])[0]?.[0];
  const gardens = Object.values(byCountry).filter(p => p.length >= 2).map(p => {
    const counts = {};
    p.forEach(cs => cs.forEach(c => { counts[c] = (counts[c] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([c]) => c);
  });
  const everywhere = gardens.length > 0 && gardens.every(g => g.includes(top));
  if (/One petal grows in every garden/.test(text) && !everywhere) problems.push(`"every garden" but ${top} is missing from some gardens`);
  if (/Spoiler: nobody does/.test(text) && !everywhere) problems.push('"nobody does" but some gardens lack the top cuisine');
  return problems;
}

// scenarios
const opt = (name, re) => {
  let hit = null;
  const walk = els => (els || []).forEach(el => { if (!hit && el.name === name) hit = el; walk(el.elements); });
  surveyRelishJSON.pages.forEach(p => walk(p.elements));
  return (hit.choices || []).map(c => (typeof c === 'object' ? c.value : c)).find(v => re.test(v));
};
const W = (name, pairs) => ({ [name]: Object.fromEntries(pairs.map(([re, w]) => [opt(name, re), w])) });

const CLEAR = {           // obvious leaders everywhere
  ...W('why_not_reasons', [[/too long/, 8], [/prefer other/, 2]]),
  ...W('influences_on_cooking', [[/parents/i, 10], [/^internet/i, 2]]),
  ...W('help_improve_options', [[/tips and tricks/i, 10], [/video/i, 3]]),
  ...W('lived_abroad', [[/^Yes$/, 4], [/^No$/, 1]]),
  ...W('feel_in_kitchen', [[/my zone/i, 6]]),
  ...W('dishes_reflect', [[/^No$/, 2], [/^Yes$/, 1]]),
  iconic: { Pizza: 8 },
  ...W('follow_social_media', [[/^Yes$/, 4], [/^No$/, 1]]),
};
const TIED = {            // leaders level or reversed
  ...W('why_not_reasons', [[/too long/, 5], [/prefer other/, 5]]),
  ...W('influences_on_cooking', [[/parents/i, 5], [/^internet/i, 5]]),
  ...W('help_improve_options', [[/tips and tricks/i, 5], [/video/i, 5]]),
  ...W('lived_abroad', [[/^Yes$/, 1], [/^No$/, 1]]),
  ...W('dishes_reflect', [[/^No$/, 1], [/^Yes$/, 1]]),
  iconic: { Pizza: 2, Paella: 2 },
  ...W('follow_social_media', [[/^Yes$/, 1], [/^No$/, 1]]),
};
const FEW_FOLLOW = W('follow_social_media', [[/^Yes$/, 1], [/^No$/, 3]]);   // creators reach a minority
const SCENARIOS = { clear: makeYouth(320, CLEAR, 7), tied: makeYouth(320, TIED, 13), mixed: makeYouth(320, {}, 21), fewFollow: makeYouth(320, FEW_FOLLOW, 29) };

const variants = raw => ({
  whole: raw,
  half: raw.filter((_, i) => i % 2),
  women: raw.filter(r => R(r).gender === 'Female'),
  men: raw.filter(r => R(r).gender === 'Male'),
  three: raw.slice(0, 3),
  two: raw.slice(0, 2),
  one: raw.slice(0, 1),
});

const seen = new Set();   // which wording branches the scenarios reached
const BRANCHES = [/neck and neck/, /ahead of “/, /Neck and neck\. Parents/, /Family still leads/, /about half of them/, /more than half of them/,
  /A minority cooks from the feed/, /Half the table follows the feed/, /The new cookbook is a feed/];

describe('S1 copy agrees with its own numbers (synthetic data)', () => {
  const cases = Object.entries(SCENARIOS).flatMap(([s, raw]) => Object.entries(variants(raw)).map(([v, d]) => [`${s} · ${v}`, d]));
  test.each(cases)('%s', async (_, data) => {
    const blocks = await renderStory(data);
    const { problems, text } = checkBlocks(blocks);
    BRANCHES.forEach(b => { if (b.test(text)) seen.add(b.source); });
    expect([...problems, ...oracle(data, text)]).toEqual([]);
  });
  test('the scenarios reach both wordings of the key claims', () => {
    expect(BRANCHES.map(b => b.source).filter(b => !seen.has(b))).toEqual([]);
  });
});

describe('S2 reveal copy agrees with the ratings (synthetic data)', () => {
  const mean = (rs, k) => rs.reduce((s, r) => s + r[k], 0) / rs.length;
  const CENTRES = {
    politicsLeads: { politics: 5.6, economy: 4.6, culture: 3.2 },
    level: { politics: 5.0, economy: 5.0, culture: 3.2 },
    cultureTop: { culture: 5.7, politics: 4.2, economy: 4.2 },
    worldHopeful: { future_world: 3.6, future_personal: 2.0 },
  };
  test.each(Object.entries(CENTRES))('%s', async (_, centres) => {
    const recs = makeFutures(160, centres);
    const blocks = await renderReveal(recs);
    const text = blocks.join('\n');
    const rel = ['economy', 'politics', 'culture', 'security', 'ecosystem', 'technology']
      .map(k => [k, mean(recs, k)]).sort((a, b) => b[1] - a[1]);
    const label = k => k[0].toUpperCase() + k.slice(1);
    const [[k1, m1], [k2, m2]] = rel;
    if (clearlyAheadOnScale(m1, m2, 1, 6)) expect(text).toContain(`${label(k1)} writes the future.`);
    else expect(text).toContain(`${label(k1)} and ${label(k2)} write the future.`);
    const opt4 = k => Math.round(100 * recs.filter(r => r[k] >= 3).length / recs.length);
    const personal = opt4('future_personal');
    const others = Math.max(opt4('future_world'), opt4('future_europe'), opt4('future_country'));
    if (/Hope lives close to home/.test(text)) expect(clearlyAhead(personal, others)).toBe(true);
    expect(checkBlocks(blocks).problems).toEqual([]);
  });
});

describe('claims.js helpers', () => {
  test('margin rule', () => {
    expect(clearlyAhead(63, 62)).toBe(false);
    expect(clearlyAhead(120, 100)).toBe(true);
    expect(clearlyAheadOnScale(5.03, 4.985, 1, 6)).toBe(false);
    expect(clearlyAheadOnScale(4.73, 4.32, 1, 6)).toBe(true);
  });
  test('shares in words never overstate', () => {
    expect(shareInWords(51.3)).toBe('about half');
    expect(shareInWords(30)).toBe('nearly a third');
    expect(shareInWords(88)).toBe('nearly nine in ten');
    expect(shareInWords(5)).toBe(null);
    expect(shareInWords(71)).toBe('nearly three quarters');
  });
  test('age at the time of the answer, not today', () => {
    expect(ageAt(2003, '2025-12-09T12:00:00Z')).toBe(22);
    expect(ageAt(2003, null)).toBe(null);
    expect(median([30, 20, 25])).toBe(25);
  });
  test('cards show an age band, never the exact age', () => {
    expect([17, 18, 24, 25, 34, 35, 68].map(ageBand)).toEqual(['under 18', '18–24', '18–24', '25–34', '25–34', '35+', '35+']);
    expect(ageBand(null)).toBe(null);
    expect(ageBand(NaN)).toBe(null);
  });
  test('exact ages inside the card texts become the band', () => {
    expect(bandAgesInText('A 45-year-old Italian woman cooks.', '35+')).toBe('A 35+ year-old Italian woman cooks.');
    expect(bandAgesInText('She is a 22-year-old cook', '18–24')).toBe('She is an 18–24 year-old cook');
    expect(bandAgesInText('A 27-year-old', null)).toBe('A 25–34 year-old');
    expect(bandAgesInText('A respondent born in 1958 who cooks', '35+')).toBe('A respondent in the 35+ age band who cooks');
    expect(bandAgesInText('In 2050 she is aged 52.', '35+')).toBe('In 2050 she is aged 35+.');
    expect(/\d{2}[- ]year/.test(bandAgesInText('48-year-old', '35+'))).toBe(false);
  });
});
