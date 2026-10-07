// Runs the API with a temporary in-memory MongoDB filled with the dummy data.
// No MongoDB installation is needed; everything is discarded when it stops.
// Usage: npm run demo
import 'dotenv/config';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { loadDummyData } from './seed.js';

const PORT = process.env.PORT || 5000;

// The demo never writes to dummy-data: normalisation stays off unless an API key
// is given and NORMALIZER_DISABLED=0 is set explicitly.
if (process.env.NORMALIZER_DISABLED !== '0' || !process.env.ANTHROPIC_API_KEY) {
  process.env.NORMALIZER_DISABLED = '1';
}
const HOST = process.env.HOST || '127.0.0.1';

const mongod = await MongoMemoryServer.create();
await mongoose.connect(mongod.getUri());
await loadDummyData(mongoose.connection.db);

const { default: app } = await import('../app.js');
app.listen(PORT, HOST, () => {
  console.log(`Demo API running on http://${HOST}:${PORT} (in-memory database, dummy data)`);
});

async function stop() {
  await mongoose.disconnect();
  await mongod.stop();
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
