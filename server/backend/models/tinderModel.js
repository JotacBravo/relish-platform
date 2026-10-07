import mongoose from 'mongoose';

// One document per swipe in the Food Visions 2050 deck.
const swipeSchema = new mongoose.Schema({
  storyIndex: { type: Number, required: true, index: true },
  action: { type: String, enum: ['like', 'superlike', 'nope'], required: true },
  createdAt: { type: Date, default: Date.now },
});

// Running totals per story, used to order the deck.
const scoreSchema = new mongoose.Schema({
  storyIndex: { type: Number, required: true, unique: true },
  likes: { type: Number, default: 0 },
  superlikes: { type: Number, default: 0 },
  nopes: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

export const TinderSwipe = mongoose.models.tinder_swipes || mongoose.model('tinder_swipes', swipeSchema, 'tinder_swipes');
export const TinderScore = mongoose.models.tinder_scores || mongoose.model('tinder_scores', scoreSchema, 'tinder_scores');

// Operator verdict per story (keep, new image, hide).
const curationSchema = new mongoose.Schema({
  storyIndex: { type: Number, required: true, unique: true },
  verdict: { type: String, enum: ['keep', 'regen', 'hide'], required: true },
  updatedAt: { type: Date, default: Date.now },
});

export const StoryCuration = mongoose.models.story_curation || mongoose.model('story_curation', curationSchema, 'story_curation');
