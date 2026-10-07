import { getSurveyModel, SURVEY_TYPES } from '../models/responseModel.js';
import { validateResponses } from '../utils/surveySchemas.js';
import {
  checkAndNormalizeIngredients, checkAndNormalizeDishes, checkAndNormalizeRegularDishes,
  checkAndNormalizeDesertIsland, checkAndNormalizeSocialAccounts, checkAndNormalizeAffiliations,
} from './ingredientNormalizer.js';

// POST /api/survey/complete — stores one survey submission.
export const saveResponse = async (req, res) => {
  try {
    const { surveyType, responses } = req.body;

    if (!SURVEY_TYPES.includes(surveyType)) {
      return res.status(400).json({ error: `surveyType must be one of: ${SURVEY_TYPES.join(', ')}` });
    }
    if (validateResponses(surveyType, responses)) {
      return res.status(400).json({ error: 'Invalid survey submission.' });
    }

    const SurveyModel = getSurveyModel(surveyType);
    const response = await new SurveyModel({ responses, surveyType }).save();

    // Free-text values not yet in the normalisation tables go to the model in
    // the background, after the answer is stored: a failure there never blocks
    // a submission.
    if (surveyType === 'youth') {
      checkAndNormalizeIngredients(responses);
      checkAndNormalizeDishes(responses);
      checkAndNormalizeRegularDishes(responses);
      checkAndNormalizeDesertIsland(responses);
      checkAndNormalizeSocialAccounts(responses);
    }
    if (surveyType === 'futures' || surveyType === 'visions') {
      checkAndNormalizeAffiliations(responses);
    }

    res.json({ success: true, id: response._id, surveyType });
  } catch (error) {
    console.error('Error saving response:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
