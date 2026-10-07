import mongoose from 'mongoose';

// The three surveys. Each one is stored in its own collection: <type>_responses.
export const SURVEY_TYPES = ['youth', 'futures', 'visions'];

const responseSchema = new mongoose.Schema({
  responses: Object,
  surveyType: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export function getSurveyModel(surveyType) {
  const name = `${surveyType}_responses`;
  return mongoose.models[name] || mongoose.model(name, responseSchema, name);
}
