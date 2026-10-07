// Synthetic survey answers for the tests, drawn from the survey definitions with a fixed seed.
import surveyRelishJSON from '../../getsurvey/surveyRelishData';
import surveyFutureJSON from '../../getsurvey/surveyFutureData';

// deterministic PRNG (mulberry32)
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function findQuestion(def, name) {
  let hit = null;
  const walk = els => (els || []).forEach(el => {
    if (hit) return;
    if (el.name === name && el.type !== 'panel') hit = el;
    walk(el.elements); walk(el.templateElements);
  });
  (def.pages || []).forEach(p => walk(p.elements));
  return hit;
}
const optionValues = (def, name) => {
  const q = findQuestion(def, name);
  if (!q) throw new Error(`no question ${name} in the survey definition`);
  return (q.choices || []).map(c => (c && typeof c === 'object' ? c.value : c));
};

// pick one value; weights: { value: weight } (missing values weigh `base`)
function pick(r, values, weights = {}, base = 1) {
  const w = values.map(v => (weights[v] ?? base));
  const total = w.reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (let i = 0; i < values.length; i++) { x -= w[i]; if (x <= 0) return values[i]; }
  return values[values.length - 1];
}
// pick k distinct values
function pickMany(r, values, k, weights = {}, base = 1) {
  const out = new Set();
  let guard = 0;
  while (out.size < Math.min(k, values.length) && guard++ < 200) out.add(pick(r, values, weights, base));
  return [...out];
}

const COUNTRIES = ['Portugal', 'Spain', 'Italy', 'France', 'Germany', 'Ireland', 'United Kingdom', 'Denmark'];
const ICONIC = ['Pizza', 'Paella', 'Lasagna', 'Fish and chips', 'Pasta', 'Bacalhau', 'Risotto', 'Tortilla'];
const EVERYDAY = ['Pasta', 'Pizza', 'Salad', 'Rice', 'Soup', 'Carbonara', 'Omelette', 'Curry'];
const INGREDIENTS = ['Potato', 'Olive oil', 'Tomato', 'Garlic', 'Rice', 'Cheese', 'Onion', 'Pasta'];
const ISLAND = ['Pasta', 'Pizza', 'Sushi', 'Rice', 'Lasagna', 'Fish', 'Burger', 'Paella'];

function youthRespondent(r, i, w) {
  const q = name => optionValues(surveyRelishJSON, name);
  const one = name => (typeof w[name] === 'function' ? w[name](r, i) : pick(r, q(name), w[name]));
  const many = (name, k) => (typeof w[name] === 'function' ? w[name](r, i) : pickMany(r, q(name), k, w[name]));
  const free = (list, name) => (typeof w[name] === 'function' ? w[name](r, i) : pick(r, list, w[name]));
  const reflect = one('dishes_reflect');
  const abroad = one('lived_abroad');
  const country = typeof w.country === 'function' ? w.country(r, i) : pick(r, COUNTRIES, w.country);
  const habits = {};
  ['simple_home', 'elaborate_home', 'pre_made', 'eat_out', 'family_meals'].forEach(k => {
    habits[k] = pick(r, ['never', 'rarely', 'sometimes', 'frequently'], (w.eating_habits || {})[k]);
  });
  const culture = one('describe_food_culture');
  return {
    Index: i + 1,
    age: one('age'), gender: one('gender'), socioeconomic: one('socioeconomic'),
    country_birth: country, country_live: country,
    ingredient_1: free(INGREDIENTS, 'ingredient'), ingredient_2: free(INGREDIENTS, 'ingredient'), ingredient_3: free(INGREDIENTS, 'ingredient'),
    iconic_dish_1: free(ICONIC, 'iconic'), iconic_dish_2: free(ICONIC, 'iconic'), iconic_dish_3: free(ICONIC, 'iconic'),
    dish_1: free(EVERYDAY, 'everyday'), dish_2: free(EVERYDAY, 'everyday'), dish_3: free(EVERYDAY, 'everyday'),
    dish_1_self_prepare: one('dish_1_self_prepare'), dish_2_self_prepare: one('dish_2_self_prepare'), dish_3_self_prepare: one('dish_3_self_prepare'),
    iconic_dish_1_self: one('iconic_dish_1_self'), iconic_dish_2_self: one('iconic_dish_2_self'), iconic_dish_3_self: one('iconic_dish_3_self'),
    iconic_dish_1_others: one('iconic_dish_1_others'), iconic_dish_2_others: one('iconic_dish_2_others'), iconic_dish_3_others: one('iconic_dish_3_others'),
    iconic_dish_1_last_month: one('iconic_dish_1_last_month'), iconic_dish_2_last_month: one('iconic_dish_2_last_month'), iconic_dish_3_last_month: one('iconic_dish_3_last_month'),
    dishes_reflect: reflect,
    why_not_reasons: reflect === 'No' ? many('why_not_reasons', 2) : [],
    iconic_dishes_where: reflect === 'Yes' ? many('iconic_dishes_where', 2) : [],
    iconic_dishes_how_often: reflect === 'Yes' ? one('iconic_dishes_how_often') : '',
    desert_island_food: free(ISLAND, 'island'),
    describe_food_culture: culture,
    specify_region: /^regional/i.test(culture) ? 'Catalonia' : '',
    specify_area: /broader/i.test(culture) ? 'Mediterranean' : '',
    feel_in_kitchen: one('feel_in_kitchen'),
    cooking_style_description: many('cooking_style_description', 2),
    influences_on_cooking: many('influences_on_cooking', 3),
    stocked_food_items: many('stocked_food_items', 6),
    improve_skills: one('improve_skills'),
    help_improve_options: many('help_improve_options', 2),
    how_often_cook: one('how_often_cook'),
    household_responsibility: many('household_responsibility', 1),
    eating_habits: habits,
    lived_abroad: abroad,
    country_abroad: abroad === 'Yes' ? pick(r, COUNTRIES) : '',
    longest_period_abroad: abroad === 'Yes' ? one('longest_period_abroad') : '',
    impact_on_eating: abroad === 'Yes' ? one('impact_on_eating') : '',
    connected_cuisines: many('connected_cuisines', 3),
    living_with: many('living_with', 1),
    food_priorities: many('food_priorities', 3),
    buying_influences: many('buying_influences', 3),
    approach_cooking: many('approach_cooking', 2),
    follow_social_media: one('follow_social_media'),
    food_purchase_places: many('food_purchase_places', 2),
    dietary_preferences: one('dietary_preferences'),
    top_food_preferences: many('top_food_preferences', 3),
  };
}

export function makeYouth(n, weights = {}, seed = 7) {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => youthRespondent(r, i, weights));
}

const OUTLOOK = ['future_world', 'future_europe', 'future_country', 'future_personal'];
const RELEVANCE = ['economy', 'politics', 'culture', 'security', 'ecosystem', 'technology'];
export function makeFutures(n, centres = {}, seed = 11) {
  const r = rng(seed);
  const fields = optionValues(surveyFutureJSON, 'gender');
  const around = (c, lo, hi) => Math.max(lo, Math.min(hi, Math.round(c + (r() * 2 - 1))));
  return Array.from({ length: n }, (_, i) => {
    const rec = {
      Index: i + 1, createdAt: `2025-${String(1 + (i % 12)).padStart(2, '0')}-15T10:00:00.000Z`,
      birth_year: 1995 + (i % 10), gender: pick(r, fields), residence_country: pick(r, COUNTRIES),
      field_of_study: pick(r, ['Engineering', 'Economics', 'Design', 'Biology', 'Law']),
    };
    OUTLOOK.forEach(k => { rec[k] = around(centres[k] ?? 2.5, 1, 4); });
    RELEVANCE.forEach(k => { rec[k] = around(centres[k] ?? 4.5, 1, 6); });
    return rec;
  });
}
