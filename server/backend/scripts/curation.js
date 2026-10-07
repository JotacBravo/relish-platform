// Applies the operator verdicts recorded in /food_visions_2050?curate=1 to story_cards.json.
// Usage: npm run curation -- [status | apply [--regen] | clear-regen | reset --yes]
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = process.env.STATIC_DATA_DIR || path.resolve(__dirname, '../../../dummy-data/static');
const DATA_DIR = path.join(STATIC_DIR, 'data');
const CARDS_PATH = path.join(DATA_DIR, 'story_cards.json');
const IMAGES_SCRIPT = path.resolve(__dirname, '../../../processing/s2_generation/generate_story_images.py');

async function readVerdicts() {
  await mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/relish');
  const rows = await mongoose.connection.db.collection('story_curation').find({}).toArray();
  await mongoose.disconnect();
  return Object.fromEntries(rows.map((r) => [r.storyIndex, r.verdict]));
}

const loadCards = () => JSON.parse(fs.readFileSync(CARDS_PATH, 'utf8'));
const saveCards = (cards) => fs.writeFileSync(CARDS_PATH, JSON.stringify(cards, null, 2) + '\n');

async function showStatus() {
  const verdicts = Object.values(await readVerdicts());
  const count = (v) => verdicts.filter((x) => x === v).length;
  console.log(`Recorded verdicts: ${verdicts.length} (keep ${count('keep')}, new image ${count('regen')}, hide ${count('hide')})`);
  const cards = loadCards();
  console.log(`In story_cards.json: ${cards.filter((c) => c.hidden).length} hidden, ${cards.filter((c) => c.needs_new_image).length} awaiting a new image`);
}

// keep: no change; regen: needs_new_image; hide: hidden (left out of the deck).
async function apply(withRegen) {
  const verdicts = await readVerdicts();
  const cards = loadCards();
  const byIndex = new Map(cards.map((c) => [c.story_index, c]));
  const regen = [];
  let hidden = 0, kept = 0;
  for (const [idx, verdict] of Object.entries(verdicts)) {
    const card = byIndex.get(Number(idx));
    if (!card) continue;
    if (verdict === 'hide') {
      card.hidden = true;
      delete card.needs_new_image;
      hidden++;
    } else if (verdict === 'regen') {
      delete card.hidden;
      card.needs_new_image = true;
      regen.push(Number(idx));
    } else {
      delete card.hidden;
      delete card.needs_new_image;
      kept++;
    }
  }
  saveCards(cards);
  console.log(`Applied: ${kept} kept, ${regen.length} to repaint, ${hidden} hidden.`);
  if (!regen.length) return;

  const args = [IMAGES_SCRIPT, '--force', '--indices', regen.join(',')];
  if (!withRegen) {
    console.log(`To repaint them: RELISH_DATA_DIR=${DATA_DIR} python3 ${args.join(' ')}`);
    console.log('Then: npm run curation -- clear-regen');
    return;
  }
  const res = spawnSync(process.env.PYTHON || 'python3', args, {
    stdio: 'inherit',
    env: { ...process.env, RELISH_DATA_DIR: DATA_DIR },
  });
  if (res.status === 0) {
    clearRegen(regen);
  } else {
    console.log('Image generation failed; needs_new_image flags left in place.');
  }
}

function clearRegen(only = null) {
  const cards = loadCards();
  let n = 0;
  cards.forEach((c) => {
    if (c.needs_new_image && (!only || only.includes(c.story_index))) { delete c.needs_new_image; n++; }
  });
  saveCards(cards);
  console.log(`Cleared needs_new_image on ${n} card(s).`);
}

async function reset() {
  await mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/relish');
  const r = await mongoose.connection.db.collection('story_curation').deleteMany({});
  await mongoose.disconnect();
  console.log(`Deleted ${r.deletedCount} verdicts.`);
}

const [cmd = 'status', ...flags] = process.argv.slice(2);
if (cmd === 'status') await showStatus();
else if (cmd === 'apply') await apply(flags.includes('--regen'));
else if (cmd === 'clear-regen') clearRegen();
else if (cmd === 'reset' && flags.includes('--yes')) await reset();
else {
  console.log('Usage: npm run curation -- [status | apply [--regen] | clear-regen | reset --yes]');
  process.exit(1);
}
