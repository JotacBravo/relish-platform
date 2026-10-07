import express from 'express';
import { getFilteredResponses, getFeedStats, exportResponses } from '../controllers/responseController.js';
import { saveResponse } from '../controllers/surveyController.js';
import { normalizerStatus } from '../controllers/ingredientNormalizer.js';
import { requireAdmin } from '../middleware/security.js';
import { writeLimiter } from '../middleware/rateLimit.js';

const surveyRouter = express.Router();

surveyRouter.get('/filtered', getFilteredResponses);
surveyRouter.get('/filtered-stats', getFeedStats);
surveyRouter.post('/complete', writeLimiter, saveResponse);
surveyRouter.get('/export', requireAdmin, exportResponses);
surveyRouter.get('/normalizer-status', requireAdmin, (req, res) => res.json(normalizerStatus()));

export default surveyRouter;
