// routes/logRoute.js
import express from 'express';
import { logEvent, logBatch, getStoryInteractions } from '../controllers/logController.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { requireAdmin } from '../middleware/security.js';

const router = express.Router();

router.post('/log', writeLimiter, logEvent);
router.post('/log-batch', writeLimiter, logBatch);
// evaluation-session /story interactions for the story dashboard (read-only,
// admin-only: it is study telemetry)
router.get('/story-interactions', requireAdmin, getStoryInteractions);

export default router;
