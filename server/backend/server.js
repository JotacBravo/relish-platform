import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';
import { retryPendingNormalizations } from './controllers/ingredientNormalizer.js';

// Without an API key the incremental normaliser stays off: no model calls and no
// writes to the normalisation tables. NORMALIZER_DISABLED set to 1 also turns it off.
if (!process.env.ANTHROPIC_API_KEY) {
  process.env.NORMALIZER_DISABLED = '1';
  console.log('Free-text normalisation is off (no ANTHROPIC_API_KEY).');
}

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '127.0.0.1';
const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/relish';

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log(`Connected to MongoDB at ${MONGO_URL}`);
    app.listen(PORT, HOST, () => {
      console.log(`API running on http://${HOST}:${PORT}`);
      // values whose normalisation failed before this start
      retryPendingNormalizations();
    });
  })
  .catch((error) => {
    console.error('Could not connect to MongoDB:', error.message);
    process.exit(1);
  });
