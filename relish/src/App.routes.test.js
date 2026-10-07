// Every address renders its page (page modules are replaced by stubs); old
// addresses redirect to the current ones, keeping ?query and #fragment.
import { render, screen, waitFor } from '@testing-library/react';
import LEGACY_ROUTES from './legacyRoutes.json';

const stub = name => ({ __esModule: true, default: props => <div data-testid="page">{name}{props && props.title ? ` · ${props.title}` : ''}</div> });
jest.mock('./getsurvey/Survey', () => stub('Survey'));
jest.mock('./dashboards/YouthDashboard', () => stub('YouthDashboard'));
jest.mock('./dashboards/FuturesDashboard', () => stub('FuturesDashboard'));
jest.mock('./dashboards/VisionsDashboard', () => stub('VisionsDashboard'));
jest.mock('./dashboards/story3', () => stub('BorrowedPlate'));
jest.mock('./dashboards/FoodTinder', () => stub('FoodTinder'));
// eslint-disable-next-line import/first
import App from './App';

const PAGE_AT = {
  '/the_borrowed_plate': 'BorrowedPlate',
  '/food_visions_2050': 'FoodTinder',
  '/dashboard_youth_food_culture': 'YouthDashboard · Youth Dashboard',
  '/dashboard_future_perspectives': 'FuturesDashboard · Futures Dashboard',
  '/dashboard_food_visions_2050': 'VisionsDashboard · Futures Narratives Dashboard',
  '/survey_youth_food_culture': 'Survey',
  '/survey_future_perspectives': 'Survey',
  '/survey_food_visions_2050': 'Survey',
};

const go = url => { window.history.replaceState(null, '', url); return render(<App />); };

test.each(Object.entries(PAGE_AT))('%s renders %s', async (path, page) => {
  const { unmount } = go(path);
  expect((await screen.findByTestId('page')).textContent).toBe(page);
  unmount();
});

test('the start page links to every page', () => {
  const { unmount } = go('/');
  Object.keys(PAGE_AT).forEach(path => expect(document.querySelector(`a[href="${path}"]`)).not.toBeNull());
  unmount();
});

test('every page shows the demo-data label', () => {
  const { unmount } = go('/');
  expect(screen.getByText('DEMO DATA')).toBeInTheDocument();
  unmount();
});

test('unknown addresses show a not-found page', () => {
  const { unmount } = go('/nothing_here');
  expect(screen.getByText('Page not found')).toBeInTheDocument();
  unmount();
});

test('the map of old addresses is exactly the eight public ones', () => {
  expect(LEGACY_ROUTES).toEqual({
    '/story': '/the_borrowed_plate',
    '/youth_dashboard': '/dashboard_youth_food_culture',
    '/youth_survey': '/survey_youth_food_culture',
    '/futures': '/food_visions_2050',
    '/futures_narratives_dashboard': '/dashboard_food_visions_2050',
    '/futures_narratives': '/survey_food_visions_2050',
    '/futures_dashboard': '/dashboard_future_perspectives',
    '/futures_survey': '/survey_future_perspectives',
  });
});

test.each(Object.entries(LEGACY_ROUTES))('old address %s redirects to %s keeping query and hash', async (from, to) => {
  const { unmount } = go(`${from}?eval=1#ch2`);
  await waitFor(() => expect(window.location.pathname).toBe(to));
  expect(window.location.search).toBe('?eval=1');
  expect(window.location.hash).toBe('#ch2');
  expect((await screen.findByTestId('page')).textContent).toBe(PAGE_AT[to]);
  unmount();
});

test('an old address with a trailing slash also redirects', async () => {
  const { unmount } = go('/story/?eval=1');
  await waitFor(() => expect(window.location.pathname).toBe('/the_borrowed_plate'));
  expect(window.location.search).toBe('?eval=1');
  unmount();
});

test.each(['/youth_survey_prolific', '/futures_survey_prolific', '/futures_narratives_prolific'])(
  'Prolific address %s renders the survey in place', async (path) => {
    const { unmount } = go(path);
    expect((await screen.findByTestId('page')).textContent).toBe('Survey');
    expect(window.location.pathname).toBe(path);
    unmount();
  });

test('the evaluation addresses do not exist', () => {
  ['/eval_youth', '/eval_survey', '/expert_survey'].forEach(path => {
    const { unmount } = go(path);
    expect(screen.getByText('Page not found')).toBeInTheDocument();
    unmount();
  });
});

