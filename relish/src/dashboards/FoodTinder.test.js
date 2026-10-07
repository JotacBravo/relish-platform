// Food Visions 2050 renders with mocked data: hero, card anatomy, deck, insights and the ratings game.
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FoodTinder from './FoodTinder';

const mkCard = i => ({
  story_index: i,
  story_text: `Story text number ${i} describing a day of cooking and eating in 2050.`,
  nationality: 'Testland', residence_country: ['Spain', 'Italy', 'Portugal'][i % 3],
  gender: i % 2 ? 'Female' : 'Male', birth_year: 1998 + (i % 10),
  title: `Vision ${i}`, swipe_hook: `An inspired hook for story ${i}.`,
  bio: `Bio ${i}`, summary: `Summary of story ${i}.`,
  emotional_tone: ['quiet joy', 'serene acceptance', 'mixed feelings', 'dystopian dread'][i % 4],
  themes: ['#homecooking', '#smartkitchen', '#foodtech'],
  image_prompt: `A scene for story ${i}.`, card_version: 2,
});
const CARDS = Array.from({ length: 12 }, (_, i) => mkCard(i + 1));

// same shape as dummy-data/static/data/sentiment.json
const SENTIMENT = {
  n_total: 12, n_analyzed: 11, n_sentences: 60,
  sentence_polarity: { positive: { n: 26, pct: 43.9 }, neutral: { n: 28, pct: 45.9 }, negative: { n: 6, pct: 10.2 } },
  sentence_compound_mean: 0.17,
  sentence_compound_histogram: Array.from({ length: 10 }, (_, i) => ({ lo: -1 + 0.2 * i, hi: -1 + 0.2 * (i + 1), n: i })),
  doc_polarity_by_sentence: { positive: { n: 7, pct: 63.6 }, neutral: { n: 3, pct: 27.3 }, negative: { n: 1, pct: 9.1 } },
  saturation: {
    doc_level: { positive: { n: 10, pct: 91.7 }, neutral: { n: 0, pct: 2.1 }, negative: { n: 1, pct: 6.2 } },
    sentence_level: { positive: { n: 26, pct: 43.9 }, neutral: { n: 28, pct: 45.9 }, negative: { n: 6, pct: 10.2 } },
  },
  emotions: [
    { key: 'trust', mean_share: 48, docs_with_pct: 95 },
    { key: 'joy', mean_share: 40, docs_with_pct: 94 },
    { key: 'anticipation', mean_share: 38, docs_with_pct: 93 },
    { key: 'surprise', mean_share: 11, docs_with_pct: 72 },
    { key: 'fear', mean_share: 11, docs_with_pct: 69 },
    { key: 'sadness', mean_share: 9, docs_with_pct: 67 },
    { key: 'disgust', mean_share: 7, docs_with_pct: 58 },
    { key: 'anger', mean_share: 6, docs_with_pct: 54 },
  ],
  agreement: { cohens_kappa: 0.16, observed_agreement: 0.6, strength: 'slight', n: 11 },
  per_doc: Array.from({ length: 11 }, (_, i) => ({
    i: i + 1, polarity: (i % 3 === 0 ? 'negative' : 'positive'),
    mean_sentence_compound: (i % 3 === 0 ? -0.3 : 0.4), doc_compound: (i % 3 === 0 ? -0.5 : 0.9),
    n_sentences: 5, sent_pos: 2, sent_neu: 2, sent_neg: 1, emotions: {},
  })),
};

const mkFutureRec = i => ({
  Index: i, createdAt: '2025-12-08T10:00:00.000Z', birth_year: 1998 + (i % 10),
  gender: i % 2 ? 'Female' : 'Male', nationality: 'x', residence_country: ['Spain', 'Italy', 'Portugal'][i % 3],
  future_world: 1 + (i % 4), future_europe: 1 + (i % 4), future_country: 1 + (i % 4), future_personal: 1 + (i % 4),
  economy: 1 + (i % 6), politics: 1 + (i % 6), culture: 1 + (i % 6),
  security: 1 + (i % 6), ecosystem: 1 + (i % 6), technology: 1 + (i % 6),
});

beforeEach(() => {
  global.IntersectionObserver = class {
    observe() {} unobserve() {} disconnect() {}
  };
  window.HTMLElement.prototype.scrollIntoView = () => {};
  global.Image = class {
    set src(_v) { setTimeout(() => this.onerror && this.onerror(), 0); }
  };
  global.fetch = (url) => {
    if (String(url).includes('/data/story_cards.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(CARDS) });
    }
    if (String(url).includes('/api/tinder/config')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ likesEnabled: false }) });
    }
    if (String(url).includes('/api/tinder/scores')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }
    if (String(url).includes('surveyType=visions')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(CARDS.map(c => ({ Index: c.story_index }))) });
    }
    if (String(url).includes('surveyType=futures')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(Array.from({ length: 9 }, (_, i) => mkFutureRec(i))) });
    }
    if (String(url).includes('/data/sentiment.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(SENTIMENT) });
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve(null) });
  };
});

test('loads live data and mounts hero, anatomy, deck, both chapters and every insight section', async () => {
  const { unmount } = render(<FoodTinder />);

  await screen.findByText(/picture the future/i);
  expect(screen.getAllByText(/LIVE · 12 STORIES SO FAR/i).length).toBeGreaterThan(0);

  expect(screen.getByText(/The inspired caption/i)).toBeInTheDocument();
  expect(screen.getByText(/The illustration/i)).toBeInTheDocument();
  expect(screen.getByText(/The summary/i)).toBeInTheDocument();
  expect(screen.queryByText('The mood')).not.toBeInTheDocument();
  expect(screen.queryByText(/legenda inspirada/i)).not.toBeInTheDocument();

  expect(screen.getByText(/Four ways to react to a card/i)).toBeInTheDocument();
  expect(screen.getByText(/Example card · not live/i)).toBeInTheDocument();
  ['Swipe left', 'Swipe up', 'Swipe right', 'Tap the card'].forEach(g => {
    expect(screen.getAllByText(new RegExp(g, 'i')).length).toBeGreaterThan(0);
  });
  expect(screen.queryByText(/just a preview/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Skip the tour/i)).not.toBeInTheDocument();
  await waitFor(() => expect(screen.getAllByText(/^Vision \d+$/).length).toBeGreaterThan(0));

  expect(screen.getByText(/The people behind the stories/i)).toBeInTheDocument();
  expect(screen.queryByText(/The sentiment of the stories/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Polarity distribution/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/What they imagine\./i)).not.toBeInTheDocument();

  expect(screen.getByText(/Chapter 2/i)).toBeInTheDocument();
  await screen.findByText(/How hopeful do they feel about tomorrow/i, {}, { timeout: 4000 });
  expect(screen.getByText(/How hopeful are they/i)).toBeInTheDocument();

  // the two-survey country comparison at the end
  expect(screen.getByText(/Where they answered from/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Food stories/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Futures ratings/i).length).toBeGreaterThan(0);

  expect(screen.getAllByText(/RELISH, Reframing European gastronomy/i).length).toBeGreaterThan(0);

  // about modal (Visions/cards methodology)
  fireEvent.click(screen.getAllByText(/About the data/i)[0]);
  await screen.findByText(/How a story becomes a card/i);

  unmount();
});

test('?curate=1 asks for the admin token and records verdicts, not public swipes', async () => {
  const posts = [];
  const baseFetch = global.fetch;
  global.fetch = (url, init) => {
    if (init && init.method === 'POST') posts.push({ url: String(url), init });
    if (String(url).includes('/api/tinder/curation')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ 1: 'hide' }) });
    }
    if (String(url).includes('/api/tinder/curate')) return Promise.resolve({ ok: true, status: 200 });
    return baseFetch(url, init);
  };
  window.history.pushState({}, '', '/food_visions_2050?curate=1');
  try {
    const { unmount } = render(<FoodTinder />);
    await screen.findByText('Curation mode');
    fireEvent.change(screen.getByPlaceholderText('Admin token'), { target: { value: 'test-token' } });
    fireEvent.click(screen.getByText(/Start reviewing/));
    await screen.findByText('CURATION');
    await screen.findByText(/1 \/ 12 judged/);
    // stories come in index order; swipe left on the first card = hide
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    await waitFor(() => expect(posts.some(p => p.url.includes('/api/tinder/curate'))).toBe(true));
    const sent = posts.find(p => p.url.includes('/api/tinder/curate'));
    expect(sent.init.headers.Authorization).toBe('Bearer test-token');
    expect(JSON.parse(sent.init.body)).toEqual({ storyIndex: 1, verdict: 'hide' });
    expect(posts.some(p => p.url.includes('/api/tinder/swipe'))).toBe(false);
    unmount();
  } finally {
    window.history.pushState({}, '', '/');
    sessionStorage.clear();
  }
});
