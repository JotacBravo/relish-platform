import express from 'express';
import { getTinderConfig, recordSwipe, getScores, recordCuration, getCuration } from '../controllers/tinderController.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { requireAdmin } from '../middleware/security.js';

const tinderRouter = express.Router();

tinderRouter.get('/config', getTinderConfig);
tinderRouter.get('/scores', getScores);
tinderRouter.post('/swipe', writeLimiter, recordSwipe);

// Operator curation, kept apart from the public scores.
tinderRouter.post('/curate', requireAdmin, writeLimiter, recordCuration);
tinderRouter.get('/curation', requireAdmin, getCuration);

export default tinderRouter;
