// Express app: middleware, API routes and the static files the visualisations read.
// server.js connects to MongoDB and starts listening; tests import this file directly.
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import surveyRouter from './routes/surveyRoute.js';
import tinderRouter from './routes/tinderRoute.js';
import logRouter from './routes/logRoute.js';
import { securityHeaders, corsOptions, sanitizeBody } from './middleware/security.js';
import { globalLimiter } from './middleware/rateLimit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = process.env.STATIC_DATA_DIR || path.resolve(__dirname, '../../dummy-data/static');

const app = express();
app.disable('x-powered-by');

// Only set this when running behind a reverse proxy (number of proxy hops).
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));

app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(express.json({ limit: '256kb' }));
app.use(sanitizeBody);
app.use('/api', globalLimiter);

app.use('/api/survey', surveyRouter);
app.use('/api/survey', logRouter);
app.use('/api/tinder', tinderRouter);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// Pre-computed files used by the dashboards and stories (normalisation tables,
// story cards, sentiment profiles, ...).
app.use('/data', express.static(path.join(STATIC_DIR, 'data')));
app.use('/images', express.static(path.join(STATIC_DIR, 'images')));

// Errors raised before a controller (malformed JSON, a body over 256 kB, ...):
// the client gets a short message, the details stay in the server log.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (status >= 500) console.error('Unhandled error:', err);
  const message = status === 413 ? 'Request body too large.' : status < 500 ? 'Bad request.' : 'Internal server error.';
  res.status(status).json({ error: message });
});

export default app;
