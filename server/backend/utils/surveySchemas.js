// Shape check for survey submissions: known field names, simple value types and
// size limits. It keeps junk out of the database; it does not authenticate anyone.

// Allowed field names per survey (from relish/src/getsurvey/*.js).
// SurveyJS "<field>-Comment" fields are accepted automatically.
const FIELDS = {
  youth: [
    'about_project','about_you','age','approach_cooking','buying_influences','connected_cuisines',
    'connection_with_food','cooking_experience','cooking_style','cooking_style_description','country_abroad',
    'country_birth','country_live','current_situation','describe_food_culture','desert_island_food',
    'dietary_preferences','dish_1','dish_1_self_prepare','dish_2','dish_2_self_prepare','dish_3',
    'dish_3_self_prepare','dishes_reflect','eating_habits','email','feel_in_kitchen','follow_social_media',
    'food_culture','food_culture_broader','food_culture_national','food_culture_region','food_habits',
    'food_priorities','food_purchase_places','gender','help_improve_cooking','help_improve_options',
    'household_responsibility','how_often_cook','iconic_dish_1','iconic_dish_1_last_month','iconic_dish_1_others',
    'iconic_dish_1_self','iconic_dish_2','iconic_dish_2_last_month','iconic_dish_2_others','iconic_dish_2_self',
    'iconic_dish_3','iconic_dish_3_last_month','iconic_dish_3_others','iconic_dish_3_self','iconic_dishes',
    'iconic_dishes_frequency','iconic_dishes_how_often','iconic_dishes_where','iconic_ingredients','impact_details',
    'impact_on_eating','improve_cooking_skills','improve_skills','influences_on_cooking','ingredient_1',
    'ingredient_2','ingredient_3','list_social_accounts','lived_abroad','lived_abroad_details','living_with',
    'longest_period_abroad','project_info','regular_dishes','risks_benefits_institutional_contact',
    'prolific_id','select_country','show_more_info','social_media_accounts','socioeconomic','specify_area','specify_impact',
    'specify_region','stocked_food_items','top_food_preferences','why_not_dishes','why_not_reasons',
  ],
  futures: [
    'birth_year','culture','economy','ecosystem','email','field_of_study','future_country','future_europe',
    'future_outlook','future_personal','future_world','gender','institution','intro_text','nationality',
    'participant_info','politics','program','relevance_factors','relevance_instructions','residence_country',
    'prolific_id','risks_benefits_institutional_contact','security','show_more_info','study_info','technology',
  ],
  visions: [
    'about_project','birth_year','day_in_life_2050','email','example_text','field_of_study','gender',
    'institution','intro_text','nationality','participant_info','program','residence_country',
    'prolific_id','risks_benefits_institutional_contact','show_example','show_more_info','study_info',
  ],
};

const ALLOWED = Object.fromEntries(Object.entries(FIELDS).map(([type, list]) => [type, new Set(list)]));

const LIMITS = {
  maxFields: 250,
  maxUnknown: 12,
  maxKeyLen: 128,
  maxStrLen: 20000,
  maxArray: 200,
  maxDepth: 4,
};

const KEY_RE = /^[\w-]+$/;

function isValidValue(v, depth) {
  if (v === null) return true;
  const t = typeof v;
  if (t === 'string') return v.length <= LIMITS.maxStrLen;
  if (t === 'number') return Number.isFinite(v);
  if (t === 'boolean') return true;
  if (depth >= LIMITS.maxDepth) return false;
  if (Array.isArray(v)) {
    return v.length <= LIMITS.maxArray && v.every((el) => isValidValue(el, depth + 1));
  }
  if (t === 'object') {
    const keys = Object.keys(v);
    if (keys.length > LIMITS.maxFields) return false;
    return keys.every((k) => k.length <= LIMITS.maxKeyLen && isValidValue(v[k], depth + 1));
  }
  return false;
}

// Returns null when the submission is acceptable, otherwise a short reason.
export function validateResponses(surveyType, responses) {
  if (!responses || typeof responses !== 'object' || Array.isArray(responses)) {
    return 'responses must be an object';
  }
  const allowed = ALLOWED[surveyType];
  if (!allowed) return 'unknown surveyType';

  const keys = Object.keys(responses);
  if (keys.length < 1 || keys.length > LIMITS.maxFields) return 'unexpected number of fields';

  let known = 0;
  let unknown = 0;
  for (const key of keys) {
    if (key.length > LIMITS.maxKeyLen || !KEY_RE.test(key)) return 'invalid field name';
    const base = key.endsWith('-Comment') ? key.slice(0, -'-Comment'.length) : key;
    if (allowed.has(base)) known++;
    else unknown++;
    if (!isValidValue(responses[key], 1)) return 'invalid field value';
  }

  if (known === 0) return 'submission does not match the survey schema';
  if (unknown > LIMITS.maxUnknown) return 'too many unrecognised fields';
  return null;
}
