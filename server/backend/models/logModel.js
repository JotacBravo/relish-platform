// models/logModel.js
import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
  surveyType: { type: String, required: true },
  sessionId: { type: String, required: true },
  eventType: {
    type: String,
    required: true,
    enum: ['survey_started', 'page_changed', 'question_answered', 'survey_completed', 'survey_abandoned', 'error',
      // reading telemetry, only in evaluation sessions (relish/src/eval/evalTelemetry.js, ?eval=1)
      'eval_session_start', 'eval_scroll', 'eval_interaction', 'eval_end']
  },
  pageNumber: Number,
  questionName: String,
  answer: mongoose.Schema.Types.Mixed,
  timeSpent: Number, // seconds
  userAgent: String,
  ipAddress: String,
  timestamp: { type: Date, default: Date.now }
});

// The most frequent query: one session's events in one survey, in order.
logSchema.index({ surveyType: 1, sessionId: 1, timestamp: 1 });
logSchema.index({ eventType: 1 });

export default mongoose.model("SurveyLog", logSchema);