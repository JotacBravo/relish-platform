// Every public survey address, old and new, must resolve to the survey type it
// saves under. A miss must be an error, never the Youth survey.
import { SURVEY_ROUTES, surveyForPath } from './surveyRoutes';
import LEGACY_ROUTES from '../legacyRoutes.json';

const EXPECTED = {
  '/survey_youth_food_culture':   { surveyType: 'youth',   isProlific: false },
  '/youth_survey':                { surveyType: 'youth',   isProlific: false },
  '/youth_survey_prolific':       { surveyType: 'youth',   isProlific: true },
  '/survey_future_perspectives':  { surveyType: 'futures', isProlific: false },
  '/futures_survey':              { surveyType: 'futures', isProlific: false },
  '/futures_survey_prolific':     { surveyType: 'futures', isProlific: true },
  '/survey_food_visions_2050':    { surveyType: 'visions', isProlific: false },
  '/futures_narratives':          { surveyType: 'visions', isProlific: false },
  '/futures_narratives_prolific': { surveyType: 'visions', isProlific: true },
};

test.each(Object.entries(EXPECTED))('%s → %o', (path, want) => {
  const cfg = surveyForPath(path);
  expect(cfg).not.toBeNull();
  expect({ surveyType: cfg.surveyType, isProlific: cfg.isProlific }).toEqual(want);
  expect(cfg.definition().pages.length).toBeGreaterThan(0);
});

test('the table has exactly the expected addresses', () => {
  expect(Object.keys(SURVEY_ROUTES).sort()).toEqual(Object.keys(EXPECTED).sort());
});

test('each old survey address and its new one give the same survey', () => {
  Object.entries(LEGACY_ROUTES).filter(([from]) => surveyForPath(from)).forEach(([from, to]) => {
    expect(surveyForPath(to)).toBe(surveyForPath(from));
  });
});

test('trailing slash and case are tolerated, like the router', () => {
  expect(surveyForPath('/survey_future_perspectives/').surveyType).toBe('futures');
  expect(surveyForPath('/Futures_Survey').surveyType).toBe('futures');
});

test('unknown addresses resolve to nothing (error page), not Youth', () => {
  ['/', '/survey', '/survey_youth', '/futures_surveys', '/story', '/eval_survey', '/expert_survey', ''].forEach(p =>
    expect(surveyForPath(p)).toBeNull());
});

test.each(['/youth_survey_prolific', '/futures_survey_prolific', '/futures_narratives_prolific'])(
  '%s adds the Prolific ID page, without touching the base survey', (path) => {
    const pro = surveyForPath(path).definition();
    const base = surveyForPath(path.replace('_prolific', '')).definition();
    expect(pro.pages[1].name).toBe('prolific_id');
    expect(base.pages.some(p => p.name === 'prolific_id')).toBe(false);
    expect(pro.pages.length).toBe(base.pages.length + 1);
  });
