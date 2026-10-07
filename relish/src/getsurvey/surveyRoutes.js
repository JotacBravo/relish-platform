import surveyRelishJSON from './surveyRelishData';
import surveyFutureJSON from './surveyFutureData';
import surveyVisionsJSON from './surveyVisionsData';

// Address -> survey. Unlisted addresses get an error page, never a default survey.

// Prolific variant: the same survey plus a page asking for the Prolific ID.
const withProlificId = def => {
  const json = JSON.parse(JSON.stringify(def));
  json.pages.splice(1, 0, { name: 'prolific_id', elements: [{ type: 'text', name: 'prolific_id', title: 'Please enter your Prolific ID', description: 'Required for payment processing. Find it in your Prolific account.', isRequired: true, placeholder: 'Your 24-character Prolific ID' }] });
  return json;
};

const YOUTH            = { definition: () => surveyRelishJSON,                  title: 'Youth Survey',   surveyType: 'youth',   isProlific: false };
const YOUTH_PROLIFIC   = { definition: () => withProlificId(surveyRelishJSON),  title: 'Youth Survey',   surveyType: 'youth',   isProlific: true };
const FUTURES          = { definition: () => surveyFutureJSON,                  title: 'Futures Survey', surveyType: 'futures', isProlific: false };
const FUTURES_PROLIFIC = { definition: () => withProlificId(surveyFutureJSON),  title: 'Futures Survey', surveyType: 'futures', isProlific: true };
const VISIONS          = { definition: () => surveyVisionsJSON,                 title: 'Visions Survey', surveyType: 'visions', isProlific: false };
const VISIONS_PROLIFIC = { definition: () => withProlificId(surveyVisionsJSON), title: 'Visions Survey', surveyType: 'visions', isProlific: true };

export const SURVEY_ROUTES = {
  '/survey_youth_food_culture':    YOUTH,
  '/youth_survey':                 YOUTH,
  '/youth_survey_prolific':        YOUTH_PROLIFIC,
  '/survey_future_perspectives':   FUTURES,
  '/futures_survey':               FUTURES,
  '/futures_survey_prolific':      FUTURES_PROLIFIC,
  '/survey_food_visions_2050':     VISIONS,
  '/futures_narratives':           VISIONS,
  '/futures_narratives_prolific':  VISIONS_PROLIFIC,
};

// Same matching as React Router: case-insensitive, trailing slash ignored.
export function surveyForPath(pathname) {
  const key = String(pathname || '').replace(/\/+$/, '').toLowerCase();
  return Object.prototype.hasOwnProperty.call(SURVEY_ROUTES, key) ? SURVEY_ROUTES[key] : null;
}
