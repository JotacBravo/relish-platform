// Thank-you only after a successful save; telemetry never carries identifiers.
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SurveyComponent from './Survey';

// jsdom has no ResizeObserver.
global.ResizeObserver = global.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };

jest.mock('survey-core/survey-core.min.css', () => ({}));
jest.mock('survey-react-ui', () => {
  const React = require('react');
  const actual = jest.requireActual('survey-react-ui');
  return { ...actual, Survey: props => { global.__surveyModel = props.model; return React.createElement(actual.Survey, props); } };
});

const calls = [];
const mockFetch = saveOk => jest.fn((url, init) => {
  calls.push({ url, body: init && init.body });
  const ok = !url.endsWith('/complete') || saveOk;
  return Promise.resolve({ ok, status: ok ? 200 : 500, json: async () => ({ success: ok }) });
});

const open = path => render(<MemoryRouter initialEntries={[path]}><SurveyComponent /></MemoryRouter>);

beforeEach(() => { calls.length = 0; jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { jest.restoreAllMocks(); delete global.fetch; });

test('a failed save shows the error, not the thank-you', async () => {
  global.fetch = mockFetch(false);
  open('/youth_survey_prolific');
  const model = global.__surveyModel;
  act(() => { model.doComplete(); });
  await waitFor(() => expect(screen.getByText(/have not been saved yet/)).toBeInTheDocument());
  expect(model.completedState).toBe('error');
  expect(screen.queryByText(/Thank you for your participation/)).toBeNull();
  expect(screen.queryByText(/Prolific/)).toBeNull();
});

test('a successful save shows the thank-you', async () => {
  global.fetch = mockFetch(true);
  open('/survey_youth_food_culture');
  const model = global.__surveyModel;
  act(() => { model.doComplete(); });
  await waitFor(() => expect(screen.getByText(/Thank you for your participation/)).toBeInTheDocument());
  expect(model.completedState).toBe('success');
  const saves = calls.filter(c => c.url.endsWith('/complete'));
  expect(saves).toHaveLength(1);
  expect(JSON.parse(saves[0].body).surveyType).toBe('youth');
});

test('"Try again" after a failed save sends the answers again and then thanks', async () => {
  global.fetch = mockFetch(false);
  open('/survey_youth_food_culture');
  const model = global.__surveyModel;
  act(() => { model.doComplete(); });
  await waitFor(() => expect(screen.getByText(/have not been saved yet/)).toBeInTheDocument());
  global.fetch = mockFetch(true);
  const tryAgain = model.notifier.actionBar.actions.find(a => a.id === 'save-again');
  act(() => { tryAgain.action(); });
  await waitFor(() => expect(screen.getByText(/Thank you for your participation/)).toBeInTheDocument());
  expect(screen.queryByText(/have not been saved yet/)).toBeNull();
  expect(calls.filter(c => c.url.endsWith('/complete'))).toHaveLength(2);
  const completed = calls.filter(c => c.url.endsWith('/log-batch')).map(c => c.body).join('\n').match(/"survey_completed"/g) || [];
  expect(completed).toHaveLength(1);
});

test('the email and Prolific ID are never sent in a telemetry event', async () => {
  global.fetch = mockFetch(true);
  open('/survey_youth_food_culture');
  const model = global.__surveyModel;
  act(() => {
    model.setValue('email', 'someone@example.org');
    model.setValue('prolific_id', 'PROLIFIC-SECRET');
    model.setValue('dish_1', 'Bacalhau');
    model.doComplete();
  });
  await waitFor(() => expect(screen.getByText(/Thank you for your participation/)).toBeInTheDocument());
  const logs = calls.filter(c => c.url.endsWith('/log-batch')).map(c => c.body).join('\n');
  expect(logs).toContain('"questionName":"email"');
  expect(logs).toContain('Bacalhau');
  expect(logs).not.toContain('someone@example.org');
  expect(logs).not.toContain('PROLIFIC-SECRET');
});
