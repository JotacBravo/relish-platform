import { getSurveyModel, SURVEY_TYPES } from '../models/responseModel.js';
import { stripFields } from '../utils/privacy.js';

// Free-text fields that must contain a real answer (more than one character).
const TEXT_FIELDS = {
  youth: [
    'specify_impact', 'desert_island_food',
    'dish_1', 'dish_2', 'dish_3',
    'ingredient_1', 'ingredient_2', 'ingredient_3',
    'iconic_dish_1', 'iconic_dish_2', 'iconic_dish_3',
    'specify_region', 'specify_area', 'list_social_accounts',
  ],
  futures: ['nationality', 'institution'],
  visions: ['day_in_life_2050', 'nationality', 'institution'],
};

const isTrivialAnswer = (value) => typeof value === 'string' && value.trim().length <= 1;

const hasTrivialAnswer = (responses, surveyType) =>
  (TEXT_FIELDS[surveyType] || []).some((field) => responses[field] != null && isTrivialAnswer(responses[field]));

// Optional start date of the data collection (COLLECTION_START, ISO date).
// Earlier responses, e.g. from a pilot, are left out of the public feed.
const collectionStart = () => (process.env.COLLECTION_START ? new Date(process.env.COLLECTION_START) : null);

// The public feed of one survey: responses since COLLECTION_START, minus those
// with a trivial text answer, without direct identifiers. Also used by
// scripts/normalize-backfill.js, so it sees exactly what the pages see.
export async function loadPublicResponses(surveyType) {
  const start = collectionStart();
  const rows = await getSurveyModel(surveyType)
    .find(start ? { createdAt: { $gte: start } } : {})
    .sort({ createdAt: 1 })
    .lean();

  return rows
    .filter((row) => !hasTrivialAnswer(row.responses || {}, surveyType))
    .map((row, index) => ({
      Index: index + 1,
      createdAt: row.createdAt,
      ...stripFields(row.responses || {}),
    }));
}

// GET /api/survey/filtered?surveyType=… — public feed used by the visualisations.
export const getFilteredResponses = async (req, res) => {
  try {
    const { surveyType } = req.query;
    if (!SURVEY_TYPES.includes(surveyType)) {
      return res.status(400).json({ error: `surveyType must be one of: ${SURVEY_TYPES.join(', ')}` });
    }
    res.json(await loadPublicResponses(surveyType));
  } catch (error) {
    console.error('Error reading responses:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// GET /api/survey/filtered-stats?surveyType=… — how many responses the public feed leaves out (counts only).
export const getFeedStats = async (req, res) => {
  try {
    const { surveyType } = req.query;
    if (!SURVEY_TYPES.includes(surveyType)) {
      return res.status(400).json({ error: `surveyType must be one of: ${SURVEY_TYPES.join(', ')}` });
    }

    const start = collectionStart();
    const rows = await getSurveyModel(surveyType).find({}, { responses: 1, createdAt: 1 }).lean();
    const inPeriod = rows.filter((row) => !start || (row.createdAt && row.createdAt >= start));
    const trivial = inPeriod.filter((row) => hasTrivialAnswer(row.responses || {}, surveyType)).length;

    res.json({
      surveyType,
      shown: inPeriod.length - trivial,
      excluded_quality: trivial,
      excluded_before_start: rows.length - inPeriod.length,
      quality_rule: `a response is left out when any of these text answers has one character or less: ${(TEXT_FIELDS[surveyType] || []).join(', ') || 'none'}`,
    });
  } catch (error) {
    console.error('Error counting responses:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// GET /api/survey/export?surveyType=… — raw export, admin only.
export const exportResponses = async (req, res) => {
  try {
    const { surveyType } = req.query;
    if (!SURVEY_TYPES.includes(surveyType)) {
      return res.status(400).json({ error: `surveyType must be one of: ${SURVEY_TYPES.join(', ')}` });
    }
    res.json(await getSurveyModel(surveyType).find().sort({ createdAt: 1 }).lean());
  } catch (error) {
    console.error('Error exporting responses:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
