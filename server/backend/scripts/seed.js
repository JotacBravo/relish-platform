// Loads the dummy responses (dummy-data/responses/*.json) into MongoDB.
// Usage: npm run seed   (uses MONGO_URL from .env)
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import mongoose from 'mongoose';
import { SURVEY_TYPES } from '../models/responseModel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESPONSES_DIR = process.env.DUMMY_RESPONSES_DIR || path.resolve(__dirname, '../../../dummy-data/responses');

// Replaces the response collections and the swipe scores with the dummy data.
export async function loadDummyData(db) {
  for (const type of SURVEY_TYPES) {
    const file = path.join(RESPONSES_DIR, `${type}_responses.json`);
    const docs = JSON.parse(fs.readFileSync(file, 'utf8'))
      .map((doc) => ({ ...doc, createdAt: new Date(doc.createdAt) }));
    const collection = db.collection(`${type}_responses`);
    await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs);
    console.log(`${type}_responses: ${docs.length} documents`);
  }
  await db.collection('tinder_scores').deleteMany({});
  await db.collection('tinder_swipes').deleteMany({});
}

async function main() {
  const url = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/relish';
  await mongoose.connect(url);
  await loadDummyData(mongoose.connection.db);
  await mongoose.disconnect();
  console.log(`Dummy data loaded into ${url}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('Seed failed:', error.message);
    process.exit(1);
  });
}
