// API tests with supertest and an in-memory MongoDB.
// Run with: npm test
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

process.env.ADMIN_API_TOKEN = 'test-admin-token';
process.env.NORMALIZER_DISABLED = '1';   // no model calls, no writes to the normalisation tables

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DUMMY = path.resolve(HERE, '../../../dummy-data/responses');

let mongod;
let app;
let validateResponses;
let loadDummyData;
const AUTH = { Authorization: 'Bearer test-admin-token' };
const collection = (name) => mongoose.connection.db.collection(name);

const youth = (extra = {}) => ({
  gender: 'Female', age: '18 to 25', country_birth: 'Portugal', dishes_reflect: 'Yes',
  dish_1: 'Pasta', ingredient_1: 'Potato', eating_habits: { simple_home: 'frequently' }, ...extra,
});
const PII_KEYS = ['email', 'prolific_id', 'prolific_pid'];
const allKeys = (o, keys = []) => {
  if (Array.isArray(o)) o.forEach((x) => allKeys(x, keys));
  else if (o && typeof o === 'object') Object.entries(o).forEach(([k, v]) => { keys.push(k.toLowerCase()); allKeys(v, keys); });
  return keys;
};
const submit = (surveyType, responses) => request(app).post('/api/survey/complete').send({ surveyType, responses });

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = (await import('../app.js')).default;
  ({ validateResponses } = await import('../utils/surveySchemas.js'));
  ({ loadDummyData } = await import('../scripts/seed.js'));
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('dummy data', () => {
  test('every dummy response passes the submission check', () => {
    for (const type of ['youth', 'futures', 'visions']) {
      const docs = JSON.parse(fs.readFileSync(path.join(DUMMY, `${type}_responses.json`), 'utf8'));
      assert.ok(docs.length > 0);
      docs.forEach((doc) => assert.equal(validateResponses(type, doc.responses), null));
    }
  });

  test('the seed script loads the dummy data and the public feed serves it', async () => {
    await loadDummyData(mongoose.connection.db);
    for (const type of ['youth', 'futures', 'visions']) {
      const docs = JSON.parse(fs.readFileSync(path.join(DUMMY, `${type}_responses.json`), 'utf8'));
      const res = await request(app).get(`/api/survey/filtered?surveyType=${type}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.length, docs.length);
      assert.equal(res.body[0].Index, 1);
    }
  });

  test('the static files used by the visualisations are served under /data and /images', async () => {
    for (const file of ['story_cards.json', 'sentiment.json', 'social_channels.json', 'dishes_normalized.json']) {
      assert.equal((await request(app).get(`/data/${file}`)).status, 200, file);
    }
    assert.equal((await request(app).get('/images/story_cards_web/manifest.json')).status, 200);
  });
});

describe('survey submissions (POST /api/survey/complete)', () => {
  test('a well-formed submission is saved', async () => {
    const before = await collection('youth_responses').countDocuments();
    const res = await submit('youth', youth());
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(await collection('youth_responses').countDocuments(), before + 1);
  });

  test('SurveyJS "-Comment" fields are accepted', async () => {
    assert.equal((await submit('youth', youth({ 'why_not_reasons-Comment': 'free text' }))).status, 200);
  });

  const rejected = [
    ['unknown survey type', () => request(app).post('/api/survey/complete').send({ surveyType: 'other', responses: youth() })],
    ['missing survey type', () => request(app).post('/api/survey/complete').send({ responses: youth() })],
    ['responses is an array', () => submit('youth', [youth()])],
    ['responses is a string', () => submit('youth', 'hello')],
    ['only unknown fields', () => submit('youth', { foo: 1, bar: 2 })],
    ['too many unknown fields', () => submit('youth', youth(Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`junk_${i}`, 1]))))],
    ['field name with invalid characters', () => submit('youth', youth({ 'bad name!': 'x' }))],
    ['field name too long', () => submit('youth', youth({ ['k'.repeat(129)]: 'x' }))],
    ['string longer than 20 000 characters', () => submit('youth', youth({ dish_2: 'x'.repeat(20001) }))],
    ['array longer than 200 items', () => submit('youth', youth({ food_priorities: Array(201).fill('Taste') }))],
    ['nesting deeper than 4 levels', () => submit('youth', youth({ eating_habits: { a: { b: { c: { d: 1 } } } } }))],
    ['more than 250 fields', () => submit('youth', youth(Object.fromEntries(Array.from({ length: 251 }, (_, i) => [`f${i}`, 1]))))],
  ];
  for (const [name, send] of rejected) {
    test(`rejects: ${name}`, async () => {
      const before = await collection('youth_responses').countDocuments();
      assert.equal((await send()).status, 400);
      assert.equal(await collection('youth_responses').countDocuments(), before);
    });
  }

  test('rejects bodies over 256 kB', async () => {
    assert.equal((await submit('visions', { day_in_life_2050: 'x'.repeat(300 * 1024) })).status, 413);
  });

  test('keys starting with $ or containing . never reach the database', async () => {
    const res = await request(app).post('/api/survey/complete').send({
      surveyType: 'youth',
      $where: 'sleep(1000)',
      responses: youth({ $where: 'x', 'a.b': 1, eating_habits: { $gt: '', 'x.y': 1, eat_out: 'rarely' } }),
    });
    assert.equal(res.status, 200);
    const doc = await collection('youth_responses').findOne({ _id: new mongoose.Types.ObjectId(res.body.id) });
    const keys = [];
    const walk = (o) => Object.entries(o || {}).forEach(([k, v]) => { keys.push(k); if (v && typeof v === 'object') walk(v); });
    walk(doc.responses);
    assert.deepEqual(keys.filter((k) => k.startsWith('$') || k.includes('.')), []);
    assert.equal(doc.responses.eating_habits.eat_out, 'rarely');
  });
});

describe('public feed (GET /api/survey/filtered)', () => {
  test('never exposes email addresses', async () => {
    await collection('futures_responses').insertMany([
      { surveyType: 'futures', createdAt: new Date(), responses: { gender: 'Male', nationality: 'Portuguese', institution: 'University A', email: 'a@example.org' } },
      { surveyType: 'futures', createdAt: new Date(), responses: { gender: 'Female', nationality: 'Spanish', institution: 'University B', Email: 'b@example.org' } },
    ]);
    const res = await request(app).get('/api/survey/filtered?surveyType=futures');
    assert.equal(res.status, 200);
    assert.equal(res.body.filter((row) => /^University [AB]$/.test(row.institution)).length, 2);
    res.body.forEach((row) => assert.ok(!Object.keys(row).some((k) => k.toLowerCase() === 'email')));
    assert.ok(!JSON.stringify(res.body).includes('@example.org'));
  });

  test('never exposes Prolific ids (prolific_id, Prolific_PID)', async () => {
    await collection('youth_responses').insertOne({
      surveyType: 'youth', createdAt: new Date(),
      responses: { gender: 'Female', dish_1: 'Synthetic Soup', prolific_id: 'SYNTH-PROLIFIC-1', Prolific_PID: 'SYNTH-PROLIFIC-2' },
    });
    const res = await request(app).get('/api/survey/filtered?surveyType=youth');
    assert.equal(res.status, 200);
    assert.ok(res.body.some((row) => row.dish_1 === 'Synthetic Soup'));
    assert.ok(!JSON.stringify(res.body).includes('SYNTH-PROLIFIC'));
    res.body.forEach((row) => assert.ok(!Object.keys(row).some((k) => k.toLowerCase().startsWith('prolific'))));
  });

  test('strips identifiers at any depth and in any case', async () => {
    await collection('youth_responses').insertOne({ surveyType: 'youth', createdAt: new Date(), responses: youth({
      dish_2: 'deep-strip-check', email: 'top@x.pt', Prolific_PID: 'PID-TOP', PROLIFIC_ID: 'P-TOP',
      eating_habits: { simple_home: 'frequently', Email: 'nested@x.pt', deeper: { prolific_pid: 'PID-DEEP' } },
      food_priorities: ['Taste', { prolific_id: 'P-ARRAY', label: 'kept' }],
    }) });
    const res = await request(app).get('/api/survey/filtered?surveyType=youth');
    const row = res.body.find((r) => r.dish_2 === 'deep-strip-check');
    assert.ok(row);
    assert.deepEqual(allKeys(res.body).filter((k) => PII_KEYS.includes(k)), []);
    for (const value of ['top@x.pt', 'PID-TOP', 'P-TOP', 'nested@x.pt', 'PID-DEEP', 'P-ARRAY']) {
      assert.ok(!JSON.stringify(res.body).includes(value), value);
    }
    assert.equal(row.eating_habits.simple_home, 'frequently');
    assert.deepEqual(row.food_priorities, ['Taste', { label: 'kept' }]);
  });

  test('stripFields keeps dates and ids, and walks arrays', async () => {
    const { stripFields } = await import('../utils/privacy.js');
    const when = new Date('2026-01-01T00:00:00Z');
    const id = new mongoose.Types.ObjectId();
    const out = stripFields({ when, id, list: [[{ EMAIL: 'x' }]], a: { b: { c: { Prolific_PID: 'y', d: 1 } } } });
    assert.equal(out.when, when);
    assert.equal(out.id, id);
    assert.deepEqual(out.list, [[{}]]);
    assert.deepEqual(out.a, { b: { c: { d: 1 } } });
  });

  test('drops trivial answers and honours COLLECTION_START', async () => {
    await collection('visions_responses').deleteMany({});
    await collection('visions_responses').insertMany([
      { surveyType: 'visions', createdAt: new Date('2025-01-01'), responses: { day_in_life_2050: 'Before the start date.', nationality: 'Italian', institution: 'Polimi' } },
      { surveyType: 'visions', createdAt: new Date('2026-02-01'), responses: { day_in_life_2050: 'x', nationality: 'Italian', institution: 'Polimi' } },
      { surveyType: 'visions', createdAt: new Date('2026-02-02'), responses: { day_in_life_2050: 'A real story about 2050.', nationality: 'Italian', institution: 'Polimi' } },
    ]);
    let res = await request(app).get('/api/survey/filtered?surveyType=visions');
    assert.deepEqual(res.body.map((r) => r.day_in_life_2050), ['Before the start date.', 'A real story about 2050.']);
    process.env.COLLECTION_START = '2026-01-01';
    try {
      res = await request(app).get('/api/survey/filtered?surveyType=visions');
      assert.deepEqual(res.body.map((r) => r.day_in_life_2050), ['A real story about 2050.']);
    } finally {
      delete process.env.COLLECTION_START;
    }
  });

  test('rejects an unknown survey type', async () => {
    assert.equal((await request(app).get('/api/survey/filtered?surveyType=secret')).status, 400);
  });

  test('filtered-stats counts what the feed leaves out, and nothing else', async () => {
    const counts = (b) => [b.shown, b.excluded_quality, b.excluded_before_start];
    let res = await request(app).get('/api/survey/filtered-stats?surveyType=visions');
    assert.equal(res.status, 200);
    assert.deepEqual(counts(res.body), [2, 1, 0]);
    process.env.COLLECTION_START = '2026-01-01';
    try {
      res = await request(app).get('/api/survey/filtered-stats?surveyType=visions');
      assert.deepEqual(counts(res.body), [1, 1, 1]);
    } finally {
      delete process.env.COLLECTION_START;
    }
    assert.ok(!JSON.stringify(res.body).includes('Polimi'));
    assert.equal((await request(app).get('/api/survey/filtered-stats?surveyType=secret')).status, 400);
  });
});

describe('admin export (GET /api/survey/export)', () => {
  const url = '/api/survey/export?surveyType=youth';
  test('401 without a token', async () => {
    assert.equal((await request(app).get(url)).status, 401);
  });
  test('401 with a wrong token', async () => {
    assert.equal((await request(app).get(url).set('Authorization', 'Bearer wrong')).status, 401);
  });
  test('200 with the admin token, including the raw documents', async () => {
    const res = await request(app).get(url).set(AUTH);
    assert.equal(res.status, 200);
    assert.ok(res.body.length > 0 && res.body[0].responses);
  });
  test('stays closed (503) when no admin token is configured', async () => {
    const saved = process.env.ADMIN_API_TOKEN;
    delete process.env.ADMIN_API_TOKEN;
    try {
      assert.equal((await request(app).get(url).set(AUTH)).status, 503);
    } finally {
      process.env.ADMIN_API_TOKEN = saved;
    }
  });
});

describe('Food Visions 2050 swipes (/api/tinder)', () => {
  test('swipes add points to a story', async () => {
    await request(app).post('/api/tinder/swipe').send({ storyIndex: 3, action: 'like' });
    await request(app).post('/api/tinder/swipe').send({ storyIndex: 3, action: 'superlike' });
    const scores = (await request(app).get('/api/tinder/scores')).body;
    assert.deepEqual(scores['3'], { likes: 1, superlikes: 1, nopes: 0, points: 4 });
  });

  test('rejects an invalid swipe', async () => {
    assert.equal((await request(app).post('/api/tinder/swipe').send({ storyIndex: 'x', action: 'love' })).status, 400);
  });

  test('LIKES_ENABLED=false stores nothing', async () => {
    process.env.LIKES_ENABLED = 'false';
    try {
      assert.deepEqual((await request(app).get('/api/tinder/config')).body, { likesEnabled: false });
      assert.equal((await request(app).post('/api/tinder/swipe').send({ storyIndex: 9, action: 'like' })).status, 202);
      assert.equal((await request(app).get('/api/tinder/scores')).body['9'], undefined);
    } finally {
      delete process.env.LIKES_ENABLED;
    }
  });
});

describe('story curation (/api/tinder/curate, /api/tinder/curation)', () => {
  test('admin only: 401 without the token, nothing stored', async () => {
    assert.equal((await request(app).post('/api/tinder/curate').send({ storyIndex: 1, verdict: 'hide' })).status, 401);
    assert.equal((await request(app).get('/api/tinder/curation')).status, 401);
    assert.equal(await collection('story_curation').countDocuments(), 0);
  });

  test('one verdict per story, separate from the public scores', async () => {
    const curate = (body) => request(app).post('/api/tinder/curate').set(AUTH).send(body);
    assert.equal((await curate({ storyIndex: 5, verdict: 'regen' })).status, 200);
    assert.equal((await curate({ storyIndex: 5, verdict: 'hide' })).status, 200);
    assert.equal((await curate({ storyIndex: 6, verdict: 'keep' })).status, 200);
    assert.equal((await curate({ storyIndex: 7, verdict: 'delete' })).status, 400);
    assert.deepEqual((await request(app).get('/api/tinder/curation').set(AUTH)).body, { 5: 'hide', 6: 'keep' });
    const scores = (await request(app).get('/api/tinder/scores')).body;
    assert.equal(scores['5'], undefined);
  });
});

describe('telemetry (/api/survey/log, /api/survey/log-batch)', () => {
  const event = (extra = {}) => ({ surveyType: 'youth', sessionId: 'synthetic-session', eventType: 'page_changed', pageNumber: 2, ...extra });

  test('stores a batch with a keyed hash of the IP, never the IP itself', async () => {
    const res = await request(app).post('/api/survey/log-batch').send({ events: [event(), event({ eventType: 'survey_completed' })] });
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 2);
    const docs = await collection('surveylogs').find({ sessionId: 'synthetic-session' }).toArray();
    assert.equal(docs.length, 2);
    docs.forEach((d) => assert.match(d.ipAddress, /^anon:[0-9a-f]{12}$/));
    assert.ok(!JSON.stringify(docs).includes('127.0.0.1'));
  });

  test('/log keeps the event but drops the answer to an identifier question', async () => {
    for (const questionName of ['email', 'prolific_id', 'Prolific_PID']) {
      const res = await request(app).post('/api/survey/log').send(event({ sessionId: 'tel-1', eventType: 'question_answered', questionName, answer: `${questionName}-SECRET@x.pt` }));
      assert.equal(res.status, 200);
    }
    const docs = await collection('surveylogs').find({ sessionId: 'tel-1' }).toArray();
    assert.equal(docs.length, 3);
    docs.forEach((d) => assert.ok(!('answer' in d), d.questionName));
    assert.ok(!JSON.stringify(docs).toLowerCase().includes('secret'));
  });

  test('/log-batch drops identifiers at any depth and keeps other answers', async () => {
    const ev = (extra) => event({ sessionId: 'tel-2', eventType: 'question_answered', ...extra });
    const res = await request(app).post('/api/survey/log-batch').send({ events: [
      ev({ questionName: 'prolific_id', answer: 'P-SECRET' }),
      ev({ questionName: 'EMAIL', answer: 'secret@x.pt' }),
      ev({ questionName: 'profile', answer: { email: 'secret@x.pt', nested: { Prolific_PID: 'PID-SECRET' }, city: 'Lisboa' } }),
      ev({ eventType: 'page_changed', email: 'secret@x.pt', prolific_id: 'P-SECRET', Prolific_PID: 'PID-SECRET' }),
      ev({ questionName: 'dish_1', answer: 'Bacalhau' }),
    ] });
    assert.equal(res.status, 200);
    const docs = await collection('surveylogs').find({ sessionId: 'tel-2' }).toArray();
    assert.equal(docs.length, 5);
    assert.ok(!JSON.stringify(docs).toLowerCase().includes('secret'));
    assert.deepEqual(allKeys(docs).filter((k) => PII_KEYS.includes(k)), []);
    assert.equal(docs.find((d) => d.questionName === 'dish_1').answer, 'Bacalhau');
    assert.equal(docs.find((d) => d.questionName === 'profile').answer.city, 'Lisboa');
  });

  test('rejects batches over 500 events', async () => {
    const res = await request(app).post('/api/survey/log-batch').send({ events: Array.from({ length: 501 }, () => ({ s: 1 })) });
    assert.equal(res.status, 413);
  });

  test('reading interactions are admin only', async () => {
    assert.equal((await request(app).get('/api/survey/story-interactions')).status, 401);
    const res = await request(app).get('/api/survey/story-interactions').set(AUTH);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.events));
  });
});

describe('errors, CORS and admin status', () => {
  test('malformed JSON gets a short message, no stack trace', async () => {
    const res = await request(app).post('/api/survey/complete').set('Content-Type', 'application/json').send('{bad json');
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: 'Bad request.' });
  });

  test('a body over 256 kB gets a short message, no stack trace', async () => {
    const res = await submit('visions', { day_in_life_2050: 'x'.repeat(300 * 1024) });
    assert.equal(res.status, 413);
    assert.deepEqual(res.body, { error: 'Request body too large.' });
  });

  test('a disallowed origin gets no CORS headers, and no error', async () => {
    const res = await request(app).get('/api/tinder/config').set('Origin', 'https://other.example');
    assert.equal(res.status, 200);
    assert.equal(res.headers['access-control-allow-origin'], undefined);
    const ok = await request(app).get('/api/tinder/config').set('Origin', 'http://localhost:3000');
    assert.equal(ok.headers['access-control-allow-origin'], 'http://localhost:3000');
  });

  test('a submission sent through a dev proxy (Origin rewritten) is saved', async () => {
    const res = await request(app).post('/api/survey/complete').set('Origin', 'http://127.0.0.1:5000')
      .send({ surveyType: 'youth', responses: youth() });
    assert.equal(res.status, 200);
  });

  test('unknown API paths get a JSON 404', async () => {
    const res = await request(app).get('/api/nothing-here');
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { error: 'Not found.' });
  });

  test('normalizer status is admin only and lists the seven fields', async () => {
    assert.equal((await request(app).get('/api/survey/normalizer-status')).status, 401);
    const res = await request(app).get('/api/survey/normalizer-status').set(AUTH);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.map((f) => f.field).sort(),
      ['desert_island', 'dishes', 'ingredients', 'institutions', 'nationalities', 'regular_dishes', 'social_accounts']);
  });
});
