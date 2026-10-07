import { TinderSwipe, TinderScore, StoryCuration } from '../models/tinderModel.js';

// Points per swipe: they decide how often a story comes back in the deck.
const POINTS = { like: 1, superlike: 3, nope: -1 };

// Swipes are stored unless LIKES_ENABLED=false.
const likesEnabled = () => process.env.LIKES_ENABLED !== 'false';

// GET /api/tinder/config
export const getTinderConfig = (req, res) => {
  res.json({ likesEnabled: likesEnabled() });
};

// POST /api/tinder/swipe  { storyIndex, action }
export const recordSwipe = async (req, res) => {
  try {
    if (!likesEnabled()) {
      return res.status(202).json({ ok: false, likesEnabled: false });
    }
    const storyIndex = Number(req.body?.storyIndex);
    const action = String(req.body?.action || '');
    if (!Number.isInteger(storyIndex) || !(action in POINTS)) {
      return res.status(400).json({ error: 'storyIndex (integer) and action (like|superlike|nope) are required' });
    }
    await TinderSwipe.create({ storyIndex, action });
    const score = await TinderScore.findOneAndUpdate(
      { storyIndex },
      { $inc: { points: POINTS[action], [`${action}s`]: 1 }, $set: { updatedAt: new Date() } },
      { upsert: true, new: true },
    );
    res.json({ ok: true, likesEnabled: true, storyIndex, points: score.points });
  } catch (error) {
    console.error('Error recording swipe:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// GET /api/tinder/scores — { storyIndex: { likes, superlikes, nopes, points } }
export const getScores = async (req, res) => {
  try {
    const out = {};
    (await TinderScore.find({}).lean()).forEach((s) => {
      out[s.storyIndex] = { likes: s.likes || 0, superlikes: s.superlikes || 0, nopes: s.nopes || 0, points: s.points || 0 };
    });
    res.json(out);
  } catch (error) {
    console.error('Error reading scores:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Operator curation (admin only): one verdict per story, applied to
// story_cards.json by scripts/curation.js.
const VERDICTS = new Set(['keep', 'regen', 'hide']);

// POST /api/tinder/curate  { storyIndex, verdict }
export const recordCuration = async (req, res) => {
  try {
    const storyIndex = Number(req.body?.storyIndex);
    const verdict = String(req.body?.verdict || '');
    if (!Number.isInteger(storyIndex) || storyIndex < 0 || !VERDICTS.has(verdict)) {
      return res.status(400).json({ error: 'storyIndex (integer) and verdict (keep|regen|hide) are required' });
    }
    await StoryCuration.findOneAndUpdate(
      { storyIndex },
      { $set: { verdict, updatedAt: new Date() } },
      { upsert: true, new: true }
    );
    res.json({ ok: true, storyIndex, verdict });
  } catch (error) {
    console.error('Error recording curation:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// GET /api/tinder/curation -> { storyIndex: verdict }
export const getCuration = async (req, res) => {
  try {
    const all = await StoryCuration.find({}).lean();
    const out = {};
    all.forEach((c) => { out[c.storyIndex] = c.verdict; });
    res.json(out);
  } catch (error) {
    console.error('Error reading curation:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
