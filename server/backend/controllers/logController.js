// Survey and reading telemetry.
import SurveyLog from '../models/logModel.js';
import { anonymizeIp, scrubLogEvent } from '../utils/privacy.js';

// Largest batch accepted in one request.
const MAX_BATCH = 500;

export const logEvent = async (req, res) => {
  try {
    const { surveyType, sessionId, eventType, pageNumber, questionName, answer, timeSpent } = scrubLogEvent(req.body) || {};

    if (!surveyType || !sessionId || !eventType) {
      return res.status(400).json({
        error: 'Missing required fields: surveyType, sessionId, eventType'
      });
    }

    const userAgent = req.headers['user-agent'];
    // Only a keyed hash of the IP is stored.
    const ipAddress = anonymizeIp(req.ip || req.connection?.remoteAddress);

    const log = new SurveyLog({
      surveyType,
      sessionId,
      eventType,
      pageNumber,
      questionName,
      answer,
      timeSpent,
      userAgent,
      ipAddress
    });

    await log.save();

    res.json({ success: true, logId: log._id });
  } catch (error) {
    console.error('Error saving log:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Admin only: interactions recorded in /the_borrowed_plate during ?eval=1 sessions.
const STORY_READ_CAP = 50000;

export const getStoryInteractions = async (req, res) => {
  try {
    const rows = await SurveyLog.find({
      surveyType: 'eval_telemetry',
      eventType: 'eval_interaction',
      questionName: 'story',
    })
      .sort({ timestamp: 1 })
      .limit(STORY_READ_CAP)
      .select('sessionId answer timestamp -_id')
      .lean();
    res.json({ count: rows.length, capped: rows.length === STORY_READ_CAP, events: rows });
  } catch (error) {
    console.error('Error reading story interactions:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Several events in one request (the survey and the reading telemetry send batches).
export const logBatch = async (req, res) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'Events array is required' });
    }
    if (events.length > MAX_BATCH) {
      return res.status(413).json({ error: `Too many events (max ${MAX_BATCH}).` });
    }

    const userAgent = req.headers['user-agent'];
    const ipAddress = anonymizeIp(req.ip || req.connection?.remoteAddress);

    const logsToInsert = events
      .filter(event => event && typeof event === 'object')
      .map(event => ({
        ...scrubLogEvent(event),
        userAgent,
        ipAddress
      }));

    const result = logsToInsert.length ? await SurveyLog.insertMany(logsToInsert) : [];

    res.json({ success: true, count: result.length });
  } catch (error) {
    console.error('Error saving batch logs:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
