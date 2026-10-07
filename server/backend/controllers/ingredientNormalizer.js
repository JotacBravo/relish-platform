import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { parseModelJson } from '../utils/modelJson.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Mapping files live in STATIC_DATA_DIR/data (served under /data).
const STATIC_DIR = process.env.STATIC_DATA_DIR || path.resolve(__dirname, '../../../dummy-data/static');
const OUT_DIR = process.env.NORMALIZER_OUTPUT_DIR || path.join(STATIC_DIR, 'data');
const ING_PATH = path.join(OUT_DIR, 'ingredients_normalized.json');
const DISH_PATH = path.join(OUT_DIR, 'dishes_normalized.json');
const REG_DISH_PATH = path.join(OUT_DIR, 'regular_dishes_normalized.json');
const DESERT_PATH = path.join(OUT_DIR, 'desert_island_normalized.json');
const INST_PATH = path.join(OUT_DIR, 'institutions_normalized.json');
const NAT_PATH = path.join(OUT_DIR, 'nationalities_normalized.json');
const SOCIAL_PATH = path.join(OUT_DIR, 'social_accounts_normalized.json');
// Icons drawn for new everyday dishes (only when GEMINI_API_KEY is set).
const ICONS_DIR = process.env.DISH_ICONS_DIR || path.resolve(__dirname, '../../../relish/public/icons/dishes');
const MANIFEST_PATH = path.join(ICONS_DIR, 'manifest.json');

const ING_SYSTEM = `You are a food/ingredient normalization expert. Normalize raw survey responses naming "iconic ingredients from their food culture."

RULES:
1. Title Case ("Olive Oil", "Black Pepper", "Soy Sauce")
2. Singular ("Potato" not "Potatoes", "Egg" not "Eggs")
3. Merge variants: "garlick"→"Garlic", "black-pepper"→"Black Pepper"
4. Split lists: "Lentils, onion and cumin" → ["Lentil", "Onion", "Cumin"]
5. Extract from descriptions: "greens such as kale or chard" → ["Kale", "Chard"]
6. Simplify parenthetical: "gochujang (chilli paste)" → "Gochujang"
7. Simplify qualifiers: "Organic Free-Range Eggs" → "Egg"
8. Dishes → null ("Pizza", "Paella", "chicken with lemon sauce")
9. Junk → null (gibberish, meta-commentary, descriptions)
10. Keep specificity: "Parmesan" stays, "Lamb" stays
11. Keep regional: "Za'atar", "Sauerkraut", "Miso"

Respond ONLY with a JSON object: { "raw_value": ["Normalized"] or null }`;

const DISH_SYSTEM = `You are a food/dish normalization expert. Normalize raw survey responses naming "iconic dishes from their food culture."

RULES:
1. Title Case for common names. Preserve original casing for foreign names ("Arroz de Pato", "Coq au Vin").
2. Merge variants: case, spelling ("tiramisù"/"tiramisu"→"Tiramisu", "shepherds pie"→"Shepherd's Pie")
3. ONE dish per entry — never return an array. Pick the main dish if multiple listed.
4. Simplify descriptions: "Roast Chicken with Potatoes, Carrots and Gravy" → "Roast Chicken"
5. Keep local name, drop translation: "Pierogi (dumplings)" → "Pierogi"
6. Fix typos: "Spagetti Bolognese" → "Spaghetti Bolognese"
7. Junk → null (gibberish, meta-commentary, single ingredients)
8. Generic dishes are valid: "Stew", "Curry", "Roast Dinner"

Respond ONLY with a JSON object: { "raw_value": "Normalized Dish" or null }`;

const REG_DISH_SYSTEM = `You are a food/dish normalization expert. Normalize raw survey responses naming "dishes they regularly eat."

RULES:
1. Title Case ("Chicken Stir Fry", "Lentil Soup"). Preserve foreign names ("Arroz de Pato").
2. Merge variants: case, spelling, plurals ("omelettes"→"Omelette", "curry chicken"→"Chicken Curry")
3. ONE dish per entry. Pick main dish if multiple listed.
4. Simplify descriptions. Remove parenthetical notes.
5. Fix punctuation: "Soup."→"Soup"
6. Generic OK: "Pasta", "Rice", "Salad", "Chicken" are valid everyday staples.
7. Junk → null (gibberish, meta-commentary)

Respond ONLY with a JSON object: { "raw_value": "Normalized Dish" or null }`;

const DESERT_SYSTEM = `You are a food/dish normalization expert. Normalize responses to "desert island dish" — one dish to eat forever.

RULES:
1. Title Case. Preserve foreign names.
2. Merge variants: case, spelling, punctuation ("sushi."→"Sushi", "ramen"/"Ramen"→"Ramen")
3. ONE dish: "Ramen or pizza"→"Ramen". Pick the first/main dish.
4. Simplify: "grilled salmon with potatoes"→"Salmon". Remove commentary.
5. Junk → null.
6. Generic OK: "Pasta", "Rice", "Fish" are valid.

Respond ONLY with a JSON object: { "raw_value": "Normalized Dish" or null }`;

// Institution and nationality are free text, so the same place arrives in many
// shapes (official name, English name, acronym, typos), mixed with answers that
// name none ("N/A", "Student", "asdf").
const INSTITUTION_SYSTEM = `You are a university/higher-education normalization expert. Normalize raw survey responses naming the "home or host institution" a student attends.

RULES:
1. CANONICAL NAME: return the institution's official English name when it has one ("Universidad de Montesol" → "University of Montesol", "Università degli Studi di Lagobello" → "University of Lagobello"). Otherwise keep the official local name ("Instituto Politécnico do Vale").
2. MERGE VARIANTS: spelling, case, accents, word order and language all fold onto that one canonical name ("universidad de montesol", "Universidad Montesol", "Univeristy of Montesol" → "University of Montesol").
3. FIX TYPOS: "Univeristy" → "University", "Techincal" → "Technical".
4. CASE: never return ALL CAPS for a full name ("RIVERBEND COLLEGE" → "Riverbend College").
5. ACRONYMS: expand when you are confident which institution is meant ("MIT" → "Massachusetts Institute of Technology", "LSE" → "London School of Economics and Political Science", "KTH" → "KTH Royal Institute of Technology"). If you are NOT confident, KEEP THE ACRONYM exactly as written. Never return null just because an acronym is unfamiliar or could mean several things.
6. ROLL UP FACULTIES to the parent institution, so counts are per institution ("Faculty of Law, University of Montesol" → "University of Montesol", "Escola de Artes da Universidade do Vale" → "University of Vale").
7. WORLDWIDE: institutions from any country are valid, not only European ones. Respondents include exchange students, so "University of Melbourne", "National University of Singapore" and "University of Buenos Aires" are all real institutions and must be kept.
8. JUNK → null ONLY when the answer names no institution at all: blanks, gibberish ("asdf"), refusals ("N/A", "No", "None", "Nothing"), bare generic words ("University", "College", "Student", "Home", "Exchange program", "studying"), a field of study ("Mechanical Engineering"), or a bare country/city ("France").
9. NEVER return null merely because you do not recognise the name. An unfamiliar but plausible institution name is kept, only tidied for case and typos. Losing a real respondent is far worse than an unmerged label.
10. Never invent an institution that is not in the answer.

Respond ONLY with a single JSON object. Each KEY must be one of the raw input strings, copied EXACTLY as given (same spelling, case, accents, punctuation). Each VALUE is the canonical name, or null.
Example input: ["universidad de montesol", "N/A", "RIVERBEND COLLEGE"]
Example output: {"universidad de montesol": "University of Montesol", "N/A": null, "RIVERBEND COLLEGE": "Riverbend College"}`;

const NATIONALITY_SYSTEM = `You are a nationality normalization expert. Normalize raw survey responses to "nationality".

RULES:
1. ENGLISH DEMONYM ADJECTIVE, Title Case: "Portugal" → "Portuguese", "Italiana" → "Italian", "polaco" → "Polish", "japan" → "Japanese".
2. MULTIPLE NATIONALITIES → an array in the order written: "Greek/Canadian" → ["Greek", "Canadian"], "Irish & Brazilian" → ["Irish", "Brazilian"].
3. REGIONAL AND STATELESS IDENTITIES ARE PRESERVED, NOT folded into the state: "Galician" stays "Galician", "Corsican" stays "Corsican", "Scottish" stays "Scottish", "Welsh" stays "Welsh". A respondent who chose a regional identity over the national one is data, not an error.
4. JUNK → null: gibberish ("qwerty"), blanks, refusals, and answers naming no nationality.
5. A language is not a nationality; drop it unless it is also the demonym the person clearly means.
6. Never guess a nationality that is not in the answer.

Respond ONLY with a single JSON object. Each KEY must be one of the raw input strings, copied EXACTLY as given (same spelling, case, accents, punctuation). Each VALUE is the demonym, a list of demonyms, or null.
Example input: ["Japan", "qwerty", "Greek/Canadian"]
Example output: {"Japan": "Japanese", "qwerty": null, "Greek/Canadian": ["Greek", "Canadian"]}`;

// Same rules as processing/normalization/normalize_social_accounts.py. The
// answer lists up to three accounts separated by commas; each account is
// normalised on its own.
const SOCIAL_SYSTEM = `You are a social media normalization expert. Normalize raw survey responses naming "food/cooking/nutrition accounts they follow on social media". Each entry is ONE account.

RULES:
1. Display name as the creator brands themselves, not the handle ("@greenpotdiaries" → "Green Pot Diaries").
2. Merge variants: case, spaces, dots, underscores, a leading "@" ("five.euro.feasts" → "Five Euro Feasts").
3. Drop platform wrappers and URLs ("TikTok: @onepanstudio" → "One Pan Studio", "spice atlas on youtube" → "Spice Atlas").
4. ONE account per entry — never return an array.
5. Unknown but plausible accounts are kept as written, without "@" or platform wrapper. Never null just because you do not know it.
6. Junk → null: a platform alone ("Instagram"), a kind of content ("cooking videos"), a hashtag, a refusal, gibberish.
7. Never invent an account that is not in the answer.

Respond ONLY with a JSON object: { "raw_value": "Account Name" or null }`;

// Normaliser state: each mapping file also lists `failed` values, retried with
// a growing delay and given up after MAX_ATTEMPTS (then shown raw).
const MAX_BATCH = 40;              // values per model call (max_tokens is 2048)
const MAX_ATTEMPTS = 6;
const BACKOFF_MS = [5, 15, 60, 180, 360].map(m => m * 60 * 1000);
// A value the model leaves out of an otherwise valid answer is retried this many
// times, then gets the field's old fallback (the raw text, capitalised).
const MISSING_ATTEMPTS = 3;

function createNormalizerState(filePath, def) {
  return {
    ...def, path: filePath, cache: null, mtime: 0, queue: [], timer: null, retryTimer: null, running: false,
    stats: { ok: 0, failed: 0, consecutiveFailures: 0, lastError: null, lastOkAt: null, lastFailAt: null },
  };
}

const capitalise = v => v.charAt(0).toUpperCase() + v.slice(1);

const ingState = createNormalizerState(ING_PATH, {
  key: 'ingredients', label: 'ingredient', system: ING_SYSTEM, survey: ['youth'],
  fields: ['ingredient_1', 'ingredient_2', 'ingredient_3'], list: true, fallback: v => [capitalise(v)],
});
const dishState = createNormalizerState(DISH_PATH, {
  key: 'dishes', label: 'iconic dish', system: DISH_SYSTEM, survey: ['youth'],
  fields: ['iconic_dish_1', 'iconic_dish_2', 'iconic_dish_3'], list: false, fallback: capitalise,
});
const regDishState = createNormalizerState(REG_DISH_PATH, {
  key: 'regular_dishes', label: 'regular dish', system: REG_DISH_SYSTEM, survey: ['youth'],
  fields: ['dish_1', 'dish_2', 'dish_3'], list: false, fallback: capitalise,
});
const desertState = createNormalizerState(DESERT_PATH, {
  key: 'desert_island', label: 'desert island dish', system: DESERT_SYSTEM, survey: ['youth'],
  fields: ['desert_island_food'], list: false, fallback: capitalise,
});
const instState = createNormalizerState(INST_PATH, {
  key: 'institutions', label: 'institution', system: INSTITUTION_SYSTEM, survey: ['futures', 'visions'],
  fields: ['institution'], list: false, fallback: v => v,
});
const natState = createNormalizerState(NAT_PATH, {
  key: 'nationalities', label: 'nationality', system: NATIONALITY_SYSTEM, survey: ['futures', 'visions'],
  fields: ['nationality'], list: true, fallback: v => v,
});
// One answer holds several accounts: split it the way SurveyDashboard.jsx does.
const splitAccounts = v => v.split(',').map(s => s.trim()).filter(Boolean);
const socialState = createNormalizerState(SOCIAL_PATH, {
  key: 'social_accounts', label: 'social media account', system: SOCIAL_SYSTEM, survey: ['youth'],
  fields: ['list_social_accounts'], list: false, fallback: v => v, split: splitAccounts,
});

// Every field, for the backfill script and the status endpoint.
export const NORMALIZERS = [ingState, dishState, regDishState, desertState, instState, natState, socialState];

// The raw values one answer field contributes (several for split fields).
export const rawValuesOf = (state, value) => {
  if (!value || typeof value !== 'string' || !value.trim()) return [];
  return state.split ? state.split(value) : [value.trim()];
};

function loadCache(state) {
  try {
    state.cache = JSON.parse(fs.readFileSync(state.path, 'utf-8'));
    state.mtime = fs.statSync(state.path).mtimeMs;
  } catch {
    state.cache = { mapping: {}, counts: {}, top: [] };
    state.mtime = 0;
  }
  if (!state.cache.mapping) state.cache.mapping = {};
  if (!state.cache.failed) state.cache.failed = {};
  return state.cache;
}

// Re-read the file when something else wrote it (an analysis/normalize_*.py
// run, a git checkout, the backfill script), so this process never writes back
// a stale copy over newer mappings.
function refreshCache(state) {
  let mtime = 0;
  try { mtime = fs.statSync(state.path).mtimeMs; } catch { /* missing file */ }
  if (!state.cache || mtime !== state.mtime) loadCache(state);
  return state.cache;
}

function saveCache(state) {
  if (!state.cache) return;
  state.cache.counts = {};
  for (const [, normed] of Object.entries(state.cache.mapping)) {
    if (normed === null) continue;
    const items = Array.isArray(normed) ? normed : [normed];
    items.forEach(n => { state.cache.counts[n] = (state.cache.counts[n] || 0) + 1; });
  }
  state.cache.top = Object.entries(state.cache.counts).sort((a, b) => b[1] - a[1]);
  if (state.cache.failed && !Object.keys(state.cache.failed).length) delete state.cache.failed;
  // write then rename: the pages read these files while they are being saved
  const tmp = `${state.path}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(state.cache, null, 2));
  fs.renameSync(tmp, state.path);
  state.mtime = fs.statSync(state.path).mtimeMs;
  if (!state.cache.failed) state.cache.failed = {};
}

// Model call
class NoApiKeyError extends Error {}

// The model's answer as text.
async function askModelApi(systemPrompt, userPrompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new NoApiKeyError('no ANTHROPIC_API_KEY');
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });
  if (message.stop_reason === 'max_tokens') throw new Error('answer cut off at max_tokens');
  return (message.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
}

let askModel = askModelApi;
// Tests replace the model with a stub returning text; pass nothing to restore it.
export function __setModelForTests(fn) { askModel = fn || askModelApi; }

const callModel = async (systemPrompt, userPrompt) => parseModelJson(await askModel(systemPrompt, userPrompt));

function sanitizeFilename(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function generateDishIcon(dishName) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return;
  const filename = sanitizeFilename(dishName) + '.png';
  const filepath = path.join(ICONS_DIR, filename);
  if (fs.existsSync(filepath)) return;

  const prompt = `Generate an image: A single flat vector icon of ${dishName}, centered on a pure white background. Minimal detail, soft rounded shapes, no outline, subtle shadows. Use the natural realistic colors of this specific food — vibrant and distinct. Top-down 3/4 view. No text, no plate, no utensils, no decoration. Square canvas, subject fills 80% of the frame.`;
  const payload = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
  });
  const url = `/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`;
  const req = https.request({ hostname: 'generativelanguage.googleapis.com', path: url, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
  }, (res) => {
    let body = '';
    res.on('data', chunk => { body += chunk; });
    res.on('end', () => {
      try {
        const result = JSON.parse(body);
        const parts = result.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData) {
            fs.mkdirSync(ICONS_DIR, { recursive: true });
            fs.writeFileSync(filepath, Buffer.from(part.inlineData.data, 'base64'));
            let manifest = {};
            try { manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')); } catch {}
            manifest[dishName] = filename;
            fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
            console.log(`[icon] Generated icon for "${dishName}"`);
            break;
          }
        }
      } catch (e) { console.error(`[icon] Parse error for "${dishName}":`, e.message); }
    });
  });
  req.on('error', e => console.error(`[icon] Request error for "${dishName}":`, e.message));
  req.write(payload);
  req.end();
}

// Alerts go to the error log and, at most hourly per field, to NORMALIZER_ALERT_WEBHOOK.
const lastAlert = {};
function raiseAlert(state, message) {
  const text = `[normalizer][ALERT] ${state.label}: ${message}`;
  console.error(text);
  const url = process.env.NORMALIZER_ALERT_WEBHOOK;
  if (!url || Date.now() - (lastAlert[state.key] || 0) < 3600 * 1000) return;
  lastAlert[state.key] = Date.now();
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
    .catch(err => console.error('[normalizer] alert webhook failed:', err.message));
}

function fieldTotals(state) {
  const failed = Object.values(state.cache.failed || {});
  const gaveUp = failed.filter(f => f.gave_up).length;
  return { retrying: failed.length - gaveUp, gaveUp };
}

const totalsText = state => {
  const t = fieldTotals(state);
  return `${t.retrying} waiting to retry, ${t.gaveUp} given up`;
};

// What the admin status endpoint shows (GET /api/survey/normalizer-status).
export function normalizerStatus() {
  return NORMALIZERS.map(state => {
    refreshCache(state);
    const mapping = state.cache.mapping;
    const failed = state.cache.failed || {};
    const t = fieldTotals(state);
    return {
      field: state.key,
      file: path.basename(state.path),
      mapped: Object.values(mapping).filter(v => v !== null).length,
      discarded: Object.values(mapping).filter(v => v === null).length,
      retrying: t.retrying,
      gave_up: t.gaveUp,
      failed_values: Object.entries(failed).slice(0, 50).map(([raw, f]) => ({ raw, ...f })),
      since_start: { ...state.stats },
    };
  });
}

function recordFailure(state, values, err) {
  refreshCache(state);
  const now = Date.now();
  const counts = !(err instanceof NoApiKeyError);   // no key: wait, don't burn attempts
  const newlyGaveUp = [];
  for (const raw of values) {
    const prev = state.cache.failed[raw] || { attempts: 0 };
    const attempts = prev.attempts + (counts ? 1 : 0);
    const gaveUp = attempts >= MAX_ATTEMPTS;
    if (gaveUp && !prev.gave_up) newlyGaveUp.push(raw);
    state.cache.failed[raw] = {
      attempts,
      last_error: String(err.message || err).slice(0, 200),
      last_attempt: new Date(now).toISOString(),
      next_retry: gaveUp ? null : new Date(now + BACKOFF_MS[Math.min(Math.max(attempts - 1, 0), BACKOFF_MS.length - 1)]).toISOString(),
      ...(gaveUp ? { gave_up: true } : {}),
    };
  }
  saveCache(state);
  state.stats.failed += values.length;
  state.stats.consecutiveFailures++;
  state.stats.lastError = String(err.message || err).slice(0, 200);
  state.stats.lastFailAt = new Date(now).toISOString();
  console.error(`[normalizer] FAILED ${values.length} ${state.label} value(s): ${state.stats.lastError} | ${totalsText(state)}`);
  if (newlyGaveUp.length) raiseAlert(state, `gave up on ${newlyGaveUp.length} value(s) after ${MAX_ATTEMPTS} attempts: ${newlyGaveUp.slice(0, 5).map(v => JSON.stringify(v)).join(', ')}`);
  else if (state.stats.consecutiveFailures >= 3) raiseAlert(state, `${state.stats.consecutiveFailures} failed batches in a row (${state.stats.lastError})`);
  scheduleRetry(state);
}

// A model value is usable when it is null, a string, or (for list fields) an
// array of strings. Single-dish fields get the first item of a stray array.
function cleanValue(state, v) {
  if (v === null) return { ok: true, v: null };
  if (typeof v === 'string' && v.trim()) return { ok: true, v: v.trim() };
  if (Array.isArray(v) && v.length && v.every(x => typeof x === 'string' && x.trim())) {
    return { ok: true, v: state.list ? v.map(x => x.trim()) : v[0].trim() };
  }
  return { ok: false };
}

// The model sometimes retypes a key with straight quotes or other spacing
// ("Olive’s oil" → "Olive's oil"); match on a folded form when the exact key
// is missing.
const foldKey = k => String(k).normalize('NFC').replace(/[‘’ʼ`´]/g, "'").replace(/[“”]/g, '"')
  .replace(/\s+/g, ' ').trim().toLowerCase();
function answerFor(result, raw) {
  if (Object.prototype.hasOwnProperty.call(result, raw)) return { found: true, v: result[raw] };
  const want = foldKey(raw);
  const k = Object.keys(result).find(x => foldKey(x) === want);
  return k === undefined ? { found: false } : { found: true, v: result[k] };
}

// Batch request: spells out the answer shape and lists the names already in
// use, so new answers reuse them instead of creating near-duplicates.
const VOCAB_MAX = 1500;
const vocabularyOf = state => (state.cache?.top || []).slice(0, VOCAB_MAX).map(([name]) => name);
const batchPrompt = (label, batch, vocabulary = []) => `Normalize these raw ${label} survey responses.
${vocabulary.length ? `
Names already used for this field (most frequent first). When a response means one of these, return that name EXACTLY as written here (same case and spelling); create a new name, following the rules, only when none of them fits:
${JSON.stringify(vocabulary)}
` : ''}
Answer with ONE JSON object: each key is one of the strings below, copied exactly as given (same spelling, case, accents, punctuation); each value is the normalized result for that string (or null), following the rules.

${JSON.stringify(batch)}`;

// Normalise one batch: returns { ok, failed } counts.
async function runBatch(state, batch) {
  refreshCache(state);
  const prompt = batchPrompt(state.label, batch, vocabularyOf(state));
  let result;
  try {
    result = await callModel(state.system, prompt);
  } catch (err) {
    recordFailure(state, batch, err);
    return { ok: 0, failed: batch.length };
  }
  refreshCache(state);
  const missing = [];
  let added = 0;
  for (const raw of batch) {
    const a = answerFor(result, raw);
    const got = a.found ? cleanValue(state, a.v) : { ok: false };
    if (got.ok) {
      state.cache.mapping[raw] = got.v;
      delete state.cache.failed[raw];
      added++;
    } else if ((state.cache.failed[raw]?.attempts || 0) + 1 >= MISSING_ATTEMPTS) {
      state.cache.mapping[raw] = state.fallback(raw);   // the old behaviour, now only as a last resort
      delete state.cache.failed[raw];
      console.warn(`[normalizer] ${state.label}: model kept omitting ${JSON.stringify(raw)}; stored the fallback`);
    } else {
      missing.push(raw);
    }
  }
  saveCache(state);
  state.stats.ok += added;
  state.stats.lastOkAt = new Date().toISOString();
  if (!missing.length) state.stats.consecutiveFailures = 0;
  console.log(`[normalizer] Normalized ${added}/${batch.length} new ${state.label}`
    + `${missing.length ? `, ${missing.length} missing from the answer` : ''} | ${totalsText(state)}`);
  if (missing.length) recordFailure(state, missing, new Error('value missing or malformed in the model answer'));
  if (state.key === 'regular_dishes') {
    for (const raw of batch) {
      const normed = state.cache.mapping[raw];
      if (normed && typeof normed === 'string') generateDishIcon(normed);
    }
  }
  return { ok: added, failed: missing.length };
}

async function processQueue(state) {
  if (state.queue.length === 0) return;
  if (state.running) { kick(state); return; }
  state.running = true;
  const values = [...new Set(state.queue)];
  state.queue = [];
  try {
    for (let i = 0; i < values.length; i += MAX_BATCH) await runBatch(state, values.slice(i, i + MAX_BATCH));
  } catch (err) {
    console.error(`[normalizer] ${state.label} queue error:`, err.message);
  } finally {
    state.running = false;
  }
}

function kick(state, delay = 2000) {
  if (state.timer) clearTimeout(state.timer);
  state.timer = setTimeout(() => processQueue(state), delay);
  state.timer.unref?.();
}

// Queue the failed values whose retry time has come; schedule the next check.
function retryDue(state) {
  refreshCache(state);
  const now = Date.now();
  const due = Object.entries(state.cache.failed || {})
    .filter(([raw, f]) => !f.gave_up && f.next_retry && Date.parse(f.next_retry) <= now && !(raw in state.cache.mapping))
    .map(([raw]) => raw);
  if (due.length) {
    console.log(`[normalizer] retrying ${due.length} ${state.label} value(s)`);
    state.queue.push(...due);
    kick(state, 100);
  }
  scheduleRetry(state);
}

function scheduleRetry(state) {
  if (state.retryTimer) clearTimeout(state.retryTimer);
  state.retryTimer = null;
  const next = Object.values(state.cache?.failed || {})
    .filter(f => !f.gave_up && f.next_retry).map(f => Date.parse(f.next_retry)).sort((a, b) => a - b)[0];
  if (!next || process.env.NORMALIZER_DISABLED === '1') return;
  const wait = Math.min(Math.max(next - Date.now(), 1000), 6 * 3600 * 1000);
  state.retryTimer = setTimeout(() => retryDue(state), wait);
  state.retryTimer.unref?.();
}

// Called once at start-up (server.js): picks up values that failed before a
// restart.
export function retryPendingNormalizations() {
  if (process.env.NORMALIZER_DISABLED === '1') return;
  NORMALIZERS.forEach(retryDue);
}

// Normalise a list of raw values now, outside the submission flow (the
// backfill script). Values already mapped are skipped. Returns counts.
export async function normalizeValues(state, values) {
  refreshCache(state);
  const todo = [...new Set(values.map(v => String(v).trim()).filter(Boolean))].filter(v => !(v in state.cache.mapping));
  let ok = 0, failed = 0;
  for (let i = 0; i < todo.length; i += MAX_BATCH) {
    const r = await runBatch(state, todo.slice(i, i + MAX_BATCH));
    ok += r.ok;
    failed += r.failed;
  }
  return { asked: todo.length, ok, failed };
}

function checkNewValues(state, responses) {
  // NORMALIZER_DISABLED=1 (tests, or no ANTHROPIC_API_KEY): no API calls, no writes.
  if (!responses || process.env.NORMALIZER_DISABLED === '1') return;
  refreshCache(state);

  const now = Date.now();
  const newValues = [];
  for (const key of state.fields) {
    for (const trimmed of rawValuesOf(state, responses[key])) {
      if (trimmed in state.cache.mapping) continue;
      // already failed: leave it to its retry schedule
      const f = state.cache.failed[trimmed];
      if (f && (f.gave_up || (f.next_retry && Date.parse(f.next_retry) > now))) continue;
      newValues.push(trimmed);
    }
  }

  if (newValues.length === 0) return;
  state.queue.push(...newValues);
  kick(state);
}

export function checkAndNormalizeIngredients(responses) { checkNewValues(ingState, responses); }
export function checkAndNormalizeDishes(responses) { checkNewValues(dishState, responses); }
export function checkAndNormalizeRegularDishes(responses) { checkNewValues(regDishState, responses); }
export function checkAndNormalizeDesertIsland(responses) { checkNewValues(desertState, responses); }
export function checkAndNormalizeSocialAccounts(responses) { checkNewValues(socialState, responses); }

// Futures + Visions demographics. Run on submission so a new answer is folded
// onto its canonical institution/nationality before it ever reaches a chart.
export function checkAndNormalizeAffiliations(responses) {
  checkNewValues(instState, responses);
  checkNewValues(natState, responses);
}
