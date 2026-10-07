// Reading telemetry is off for public visitors and on only with ?eval=1.
import { initEvalTelemetry, evalog, storylog } from './evalTelemetry';

const go = url => window.history.replaceState(null, '', url);
const sent = () => global.fetch.mock.calls.flatMap(([, init]) => JSON.parse(init.body).events);

beforeEach(() => { global.fetch = jest.fn().mockResolvedValue({ ok: true }); });
afterEach(() => { delete global.fetch; document.body.innerHTML = ''; });

test('without ?eval=1 nothing is recorded and no code is shown', () => {
  go('/the_borrowed_plate');
  const stop = initEvalTelemetry('story');
  evalog('eval_interaction', { t: 'x' });
  storylog('quiz_answer', { q: 1 });
  stop();
  expect(global.fetch).not.toHaveBeenCalled();
  expect(document.getElementById('relish-eval-badge')).toBeNull();
});

test('a ?pid= address alone does not turn telemetry on', () => {
  go('/the_borrowed_plate?pid=P-1');
  const stop = initEvalTelemetry('story');
  evalog('eval_interaction', { t: 'x' });
  stop();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('with ?eval=1 a six-character code is shown and the events are sent with it', () => {
  go('/food_visions_2050?eval=1');
  const stop = initEvalTelemetry('futures');
  const badge = document.getElementById('relish-eval-badge');
  expect(badge).not.toBeNull();
  const code = badge.querySelector('strong').textContent;
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  storylog('swipe', { dir: 'right' });
  stop();
  const events = sent();
  expect(events.length).toBeGreaterThanOrEqual(2);
  events.forEach(e => {
    expect(e.surveyType).toBe('eval_telemetry');
    expect(e.sessionId).toBe(code);
    expect(e.questionName).toBe('futures');
  });
  expect(events.map(e => e.eventType)).toEqual(expect.arrayContaining(['eval_session_start', 'eval_interaction']));
  expect(document.getElementById('relish-eval-badge')).toBeNull();
});
