// Normalises free-text values that are not yet in the mapping files.
// Usage: npm run normalize:backfill [-- --apply]   (dry run without --apply)
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { loadPublicResponses } from '../controllers/responseController.js';
import { NORMALIZERS, normalizeValues, rawValuesOf } from '../controllers/ingredientNormalizer.js';

dotenv.config();
const apply = process.argv.includes('--apply');

function pending(state, records) {
  const mapping = state.cache?.mapping || {};
  const values = new Map();       // raw value -> responses using it
  let responses = 0;
  for (const r of records) {
    let hit = false;
    for (const f of state.fields) {
      for (const v of rawValuesOf(state, r[f])) {
        if (v in mapping) continue;
        values.set(v, (values.get(v) || 0) + 1);
        hit = true;
      }
    }
    if (hit) responses++;
  }
  return { values, responses };
}

async function main() {
  await mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/relish');
  const feeds = {};
  for (const t of ['youth', 'futures', 'visions']) feeds[t] = await loadPublicResponses(t);
  await mongoose.disconnect();

  const rows = [];
  for (const state of NORMALIZERS) {
    await normalizeValues(state, []);              // loads the mapping file
    const records = state.survey.flatMap(t => feeds[t]);
    const before = pending(state, records);
    let result = { ok: 0, failed: 0 };
    if (apply && before.values.size) result = await normalizeValues(state, [...before.values.keys()]);
    const after = pending(state, records);
    rows.push({ field: state.key, before, after, result });
  }

  console.log(`\n${apply ? 'Backfill' : 'Dry run (use --apply to normalise)'} — ${new Date().toISOString()}`);
  console.log('field            pending values (responses)   resolved   still pending (responses)');
  for (const { field, before, after } of rows) {
    console.log(`${field.padEnd(16)} ${String(before.values.size).padStart(6)} (${String(before.responses).padStart(3)})`
      + `                ${String(before.values.size - after.values.size).padStart(6)}`
      + `     ${String(after.values.size).padStart(6)} (${String(after.responses).padStart(3)})`);
  }
  const tot = k => rows.reduce((s, r) => s + r[k].values.size, 0);
  console.log(`total            ${String(tot('before')).padStart(6)}                      ${String(tot('before') - tot('after')).padStart(6)}     ${String(tot('after')).padStart(6)}`);
  for (const { field, after } of rows) {
    if (after.values.size) console.log(`  still pending in ${field}: ${[...after.values.keys()].slice(0, 15).map(v => JSON.stringify(v)).join(', ')}`);
  }
  if (!apply) for (const { field, before } of rows) {
    if (before.values.size) console.log(`  ${field}: ${[...before.values.keys()].slice(0, 12).map(v => JSON.stringify(v)).join(', ')}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
