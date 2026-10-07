// Normaliser tests: the model is a stub and the mapping files live in a temp
// directory (NORMALIZER_OUTPUT_DIR), so nothing reaches the API or analysis/output.
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseModelJson, stripCodeFence } from '../utils/modelJson.js';

const DIR = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'normalizer-test-'));
process.env.NORMALIZER_OUTPUT_DIR = DIR;
process.env.NORMALIZER_DISABLED = '1';       // no retry timers in tests
delete process.env.ANTHROPIC_API_KEY;
delete process.env.GEMINI_API_KEY;
delete process.env.NORMALIZER_ALERT_WEBHOOK;

let N;
const file = name => JSON.parse(fs.readFileSync(path.join(DIR, name), 'utf8'));
const state = key => N.NORMALIZERS.find(s => s.key === key);
const quietly = async fn => {
  const { error, log, warn } = console;
  const errors = [];
  console.error = (...a) => errors.push(a.join(' '));
  console.log = () => {};
  console.warn = () => {};
  try { await fn(); } finally { Object.assign(console, { error, log, warn }); }
  return errors;
};

before(async () => {
  N = await import('../controllers/ingredientNormalizer.js');
});
after(() => fs.rmSync(DIR, { recursive: true, force: true }));

describe('reading the model answer', () => {
  const obj = { 'fish and chips': 'Fish And Chips', 'N/A': null };
  const multi = JSON.stringify(obj, null, 2);

  test('plain JSON', () => assert.deepEqual(parseModelJson(multi), obj));
  test('```json block over several lines (the production failure)', () =>
    assert.deepEqual(parseModelJson('```json\n' + multi + '\n```'), obj));
  test('``` block without a language', () => assert.deepEqual(parseModelJson('```\n' + multi + '\n```'), obj));
  test('block on one line', () => assert.deepEqual(parseModelJson('```json {"a": "B"} ```'), { a: 'B' }));
  test('a sentence before and after the block', () =>
    assert.deepEqual(parseModelJson('Here you go:\n```json\n' + multi + '\n```\nLet me know.'), obj));
  test('prose around a bare object', () => assert.deepEqual(parseModelJson('Sure! ' + multi + ' Done.'), obj));
  test('a cut-off answer still fails, with a JSON error', () =>
    assert.throws(() => parseModelJson('```json\n{"a": "B", "c":'), SyntaxError));
  test('an array is not an answer', () => assert.throws(() => parseModelJson('["a"]'), /not a JSON object/));
  test('stripCodeFence leaves plain text alone', () => assert.equal(stripCodeFence(' {"a":1} '), '{"a":1}'));
});

describe('failed values are kept and retried', () => {
  test('a parse failure marks the values instead of dropping them', async () => {
    const s = state('dishes');
    N.__setModelForTests(async () => '```json\n{\n  "Bacalhau a bras": ');   // broken
    const errors = await quietly(() => N.normalizeValues(s, ['Bacalhau a bras', 'pastel de nata']));
    const f = file('dishes_normalized.json');
    assert.equal(f.mapping['Bacalhau a bras'], undefined);
    assert.equal(f.failed['Bacalhau a bras'].attempts, 1);
    assert.ok(f.failed['pastel de nata'].next_retry, 'has a retry time');
    assert.ok(errors.some(e => /FAILED 2 iconic dish/.test(e) && /2 waiting to retry/.test(e)), 'logged with counts');
  });

  test('the next attempt resolves them and clears the mark', async () => {
    const s = state('dishes');
    N.__setModelForTests(async (_sys, prompt) => {
      const values = JSON.parse(prompt.slice(prompt.lastIndexOf('\n\n') + 2));
      return '```json\n' + JSON.stringify(Object.fromEntries(values.map(v => [v, v.replace(/\b\w/g, c => c.toUpperCase())])), null, 2) + '\n```';
    });
    const r = await quietly(() => N.normalizeValues(s, ['Bacalhau a bras', 'pastel de nata']));
    assert.equal(r.length, 0);
    const f = file('dishes_normalized.json');
    assert.equal(f.mapping['Bacalhau a bras'], 'Bacalhau A Bras');
    assert.equal(f.failed, undefined, 'no failed values left');
    assert.equal(f.counts['Pastel De Nata'], 1);
  });

  test('a value the model leaves out is retried, then gets the fallback', async () => {
    const s = state('desert_island');
    N.__setModelForTests(async () => '{}');
    for (let i = 1; i < 3; i++) {
      await quietly(() => N.normalizeValues(s, ['sushi.']));
      assert.equal(file('desert_island_normalized.json').failed['sushi.'].attempts, i);
    }
    await quietly(() => N.normalizeValues(s, ['sushi.']));
    const f = file('desert_island_normalized.json');
    assert.equal(f.mapping['sushi.'], 'Sushi.');
    assert.equal(f.failed, undefined);
  });

  test('after six failures the value is given up on, with an alert', async () => {
    const s = state('institutions');
    N.__setModelForTests(async () => { throw new Error('overloaded'); });
    let errors = [];
    for (let i = 0; i < 6; i++) errors = errors.concat(await quietly(() => N.normalizeValues(s, ['Uni Lisboa'])));
    const f = file('institutions_normalized.json').failed['Uni Lisboa'];
    assert.equal(f.attempts, 6);
    assert.equal(f.gave_up, true);
    assert.equal(f.next_retry, null);
    assert.ok(errors.some(e => /\[ALERT\] institution: gave up on 1 value/.test(e)));
    const st = N.normalizerStatus().find(x => x.field === 'institutions');
    assert.equal(st.gave_up, 1);
    assert.equal(st.failed_values[0].raw, 'Uni Lisboa');
  });

  test('without an API key the values wait without using up attempts', async () => {
    N.__setModelForTests();      // the real call: no key in tests
    const s = state('nationalities');
    await quietly(() => N.normalizeValues(s, ['Portugal']));
    await quietly(() => N.normalizeValues(s, ['Portugal']));
    assert.equal(file('nationalities_normalized.json').failed.Portugal.attempts, 0);
  });

  test('a key retyped with straight quotes still matches', async () => {
    N.__setModelForTests(async () => '{"Olive\'s oil": ["Olive Oil"]}');
    await quietly(() => N.normalizeValues(state('ingredients'), ['Olive’s oil']));
    assert.deepEqual(file('ingredients_normalized.json').mapping['Olive’s oil'], ['Olive Oil']);
  });

  test('the batch request asks for one object keyed by the raw strings', async () => {
    let seen = '';
    N.__setModelForTests(async (_s, prompt) => { seen = prompt; return '{}'; });
    await quietly(() => N.normalizeValues(state('regular_dishes'), ['Toast']));
    assert.match(seen, /ONE JSON object: each key is one of the strings below/);
    assert.ok(seen.endsWith('["Toast"]'));
  });

  test('the request lists the names already used for the field', async () => {
    let seen = '';
    N.__setModelForTests(async (_s, prompt) => { seen = prompt; return '{"pastel de nata.": "Pastel De Nata"}'; });
    await quietly(() => N.normalizeValues(state('dishes'), ['pastel de nata.']));
    assert.match(seen, /Names already used for this field/);
    assert.ok(seen.includes('"Bacalhau A Bras"') && seen.includes('"Pastel De Nata"'), 'existing names are in the prompt');
  });

  test('a mapping written by another process is not overwritten', async () => {
    const s = state('ingredients');
    N.__setModelForTests(async () => '{"olive oil": ["Olive Oil"]}');
    await quietly(() => N.normalizeValues(s, ['olive oil']));
    const p = path.join(DIR, 'ingredients_normalized.json');
    const f = file('ingredients_normalized.json');
    f.mapping.garlic = ['Garlic'];                       // e.g. analysis/normalize_ingredients.py
    fs.writeFileSync(p, JSON.stringify(f));
    fs.utimesSync(p, new Date(), new Date(Date.now() + 5000));
    N.__setModelForTests(async () => '{"Tomatoes": ["Tomato"]}');
    await quietly(() => N.normalizeValues(s, ['Tomatoes']));
    const after = file('ingredients_normalized.json');
    assert.deepEqual(after.mapping.garlic, ['Garlic']);
    assert.deepEqual(after.mapping.Tomatoes, ['Tomato']);
    assert.deepEqual(after.mapping['olive oil'], ['Olive Oil']);
  });
});
