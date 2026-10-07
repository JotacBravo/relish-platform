// Generates the invented demo data (fixed seed). Usage: node dummy-data/generate.js
// Writes responses/*.json and static/** (except static/data/sentiment.json).
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SURVEY_DIR = path.join(ROOT, 'relish', 'src', 'getsurvey');
const OUT_RESPONSES = path.join(__dirname, 'responses');
const OUT_DATA = path.join(__dirname, 'static', 'data');
const OUT_IMAGES = path.join(__dirname, 'static', 'images', 'story_cards_web');

// Helpers
// Loads a survey definition file (an ES module that exports one object).
function loadSurvey(file) {
  const src = fs.readFileSync(path.join(SURVEY_DIR, file), 'utf8');
  const name = src.match(/const (\w+)\s*=/)[1];
  const ctx = {};
  vm.runInNewContext(src.replace(/export default\s+\w+;?/, '') + `;this.out = ${name};`, ctx);
  return ctx.out;
}

function findQuestion(def, name) {
  let hit = null;
  const walk = els => (els || []).forEach(el => {
    if (!hit && el.name === name && el.type !== 'panel') hit = el;
    walk(el.elements);
    walk(el.templateElements);
  });
  def.pages.forEach(p => walk(p.elements));
  if (!hit) throw new Error(`question ${name} not found`);
  return hit;
}

const options = (def, name) => (findQuestion(def, name).choices || []).map(c => (typeof c === 'object' ? c.value : c));

// Deterministic random numbers (mulberry32).
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = rng(2050);
const chance = p => R() < p;
const int = (lo, hi) => lo + Math.floor(R() * (hi - lo + 1));

// One value; weights is { value: weight } or [[regex, weight], ...]; others weigh 1.
function pick(values, weights = {}) {
  const w = values.map(v => {
    if (Array.isArray(weights)) {
      const hit = weights.find(([re]) => re.test(v));
      return hit ? hit[1] : 1;
    }
    return weights[v] ?? 1;
  });
  let x = R() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < values.length; i++) { x -= w[i]; if (x <= 0) return values[i]; }
  return values[values.length - 1];
}
function pickMany(values, k, weights) {
  const out = new Set();
  for (let guard = 0; out.size < Math.min(k, values.length) && guard < 300; guard++) out.add(pick(values, weights));
  return [...out];
}
const weighted = obj => [Object.keys(obj), obj];
const pickFrom = obj => pick(...weighted(obj));

function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

// Builds a normalisation file ({ mapping, counts, top }) from raw → canonical pairs.
function normalisationFile(pairs) {
  const mapping = {};
  pairs.forEach(([raw, canonical]) => { mapping[raw] = canonical; });
  const counts = {};
  Object.values(mapping).forEach(v => (Array.isArray(v) ? v : [v]).forEach(n => { if (n) counts[n] = (counts[n] || 0) + 1; }));
  return { mapping, counts, top: Object.entries(counts).sort((a, b) => b[1] - a[1]) };
}

// Same format as normalize_social_accounts.py, with the lowercase keys the dashboard looks up.
function socialAccountsFile(pairs) {
  const mapping = {};
  pairs.forEach(([raw, canonical]) => { mapping[raw] = canonical; });
  const compact = v => v.toLowerCase().replace(/[._\s-]/g, '');
  Object.entries({ ...mapping }).forEach(([raw, canonical]) => {
    [raw.toLowerCase(), compact(raw)].forEach(f => { if (f && !(f in mapping)) mapping[f] = canonical; });
  });
  [...new Set(Object.values(mapping).filter(v => typeof v === 'string'))].forEach(name => {
    [name, name.toLowerCase(), compact(name)].forEach(f => { if (f && !(f in mapping)) mapping[f] = name; });
  });
  return { mapping, counts: {}, top: [] };
}

// Picks one spelling of a canonical answer and records the pair.
function variant(table, canonical, pairs, asList = false) {
  const spellings = table[canonical] || [canonical];
  const raw = spellings[int(0, spellings.length - 1)];
  pairs.push([raw, asList ? [canonical] : canonical]);
  return raw;
}

// Vocabularies (all invented or generic)
const COUNTRIES = { Portugal: 20, Spain: 18, Italy: 16, France: 12, Germany: 12, Ireland: 8, 'United Kingdom': 8, Denmark: 6 };
const OWN_CUISINE = {
  Portugal: 'Portuguese', Spain: 'Spanish', Italy: 'Italian', France: 'French', Germany: 'German',
  Ireland: 'Irish', 'United Kingdom': 'British', Denmark: 'Danish',
};

const ICONIC = {
  Portugal: ['Bacalhau', 'Francesinha', 'Cozido', 'Pastel de Nata', 'Arroz de Pato', 'Pizza'],
  Spain: ['Paella', 'Tortilla', 'Gazpacho', 'Jamon', 'Pizza'],
  Italy: ['Pizza', 'Carbonara', 'Lasagna', 'Risotto', 'Tiramisu', 'Pasta'],
  France: ['Croissant', 'Pizza', 'Pasta', 'Tiramisu'],
  Germany: ['Schnitzel', 'Doner', 'Pizza', 'Pasta'],
  Ireland: ['Fish and Chips', 'Pizza', 'Curry', 'Hamburger'],
  'United Kingdom': ['Fish and Chips', 'Curry', 'Pizza', 'Hamburger'],
  Denmark: ['Pizza', 'Pasta', 'Hamburger', 'Sushi'],
};
const ICONIC_SPELLINGS = {
  Pizza: ['Pizza', 'pizza', 'Pizza Margherita', 'pizza napoletana'],
  Bacalhau: ['Bacalhau', 'bacalhau', 'Bacalhau à Brás'],
  'Fish and Chips': ['Fish and Chips', 'fish & chips', 'Fish and chips'],
  Paella: ['Paella', 'paella', 'Paella valenciana'],
  Tortilla: ['Tortilla', 'Tortilla de patatas'],
  Carbonara: ['Carbonara', 'Pasta carbonara'],
  Doner: ['Doner', 'Döner kebab'],
};

const EVERYDAY = ['Pasta', 'Pizza', 'Salad', 'Rice', 'Carbonara', 'Soup', 'Omelette', 'Curry', 'Chicken and Rice',
  'Noodles', 'Burger', 'Stew', 'Lentils', 'Sandwich', 'Fried Rice', 'Risotto', 'Couscous', 'Tacos', 'Salmon'];
const EVERYDAY_WEIGHT = { Pasta: 10, Pizza: 5, Salad: 5, Rice: 4, Carbonara: 3, Soup: 3, Omelette: 3, Curry: 2 };
const EVERYDAY_SPELLINGS = {
  Pasta: ['Pasta', 'pasta', 'Pasta with tomato sauce'],
  Salad: ['Salad', 'salad', 'Green salad'],
  Omelette: ['Omelette', 'Omelet'],
  'Chicken and Rice': ['Chicken and Rice', 'chicken with rice'],
};
// Share of people who cook each everyday dish themselves.
const SELF_COOKED = { Pizza: 0.35, Burger: 0.4, Tacos: 0.5, Sandwich: 0.7 };

const INGREDIENTS = {
  Portugal: ['Olive Oil', 'Bacalhau', 'Potato', 'Garlic', 'Sardine', 'Rice'],
  Spain: ['Olive Oil', 'Rice', 'Garlic', 'Tomato', 'Paprika', 'Ham'],
  Italy: ['Tomato', 'Pasta', 'Olive Oil', 'Basil', 'Parmesan', 'Mozzarella'],
  France: ['Butter', 'Cheese', 'Bread', 'Wine', 'Garlic', 'Cream'],
  Germany: ['Potato', 'Sausage', 'Cabbage', 'Bread', 'Pork', 'Mustard'],
  Ireland: ['Potato', 'Butter', 'Lamb', 'Cabbage', 'Salmon', 'Bread'],
  'United Kingdom': ['Potato', 'Beef', 'Fish', 'Cheese', 'Bread', 'Egg'],
  Denmark: ['Potato', 'Pork', 'Fish', 'Butter', 'Bread', 'Cabbage'],
};
const INGREDIENT_SPELLINGS = {
  'Olive Oil': ['Olive Oil', 'olive oil', 'Extra virgin olive oil'],
  Potato: ['Potato', 'potatoes', 'Potatoes'],
  Tomato: ['Tomato', 'tomatoes'],
  Garlic: ['Garlic', 'garlic'],
};

const ISLAND = { Pasta: 8, Pizza: 7, Sushi: 4, Rice: 4, Lasagna: 3, Fish: 3, Burger: 2, Paella: 2, Curry: 2, Soup: 1 };
const ISLAND_SPELLINGS = { Pasta: ['Pasta', 'pasta', 'Spaghetti'], Pizza: ['Pizza', 'pizza'], Sushi: ['Sushi', 'sushi'] };

const IMPACT_TEXT = [
  'I started cooking more vegetables', 'I eat dinner later now', 'I learned to cook with spices',
  'I buy fresh food at markets', 'I eat less meat than before', 'I cook more for friends',
];

// Food creators named by respondents (invented, no real accounts).
const CHANNELS = {
  weeknight_kitchen: { name: 'Weeknight Kitchen', platform: 'youtube', spellings: ['Weeknight Kitchen', 'weeknight kitchen'], weight: 6 },
  green_pot_diaries: { name: 'Green Pot Diaries', platform: 'instagram', spellings: ['Green Pot Diaries', 'green pot diaries'], weight: 5 },
  nonnas_notebook: { name: "Nonna's Notebook", platform: 'tiktok', spellings: ["Nonna's Notebook", 'nonnas notebook'], weight: 5 },
  five_euro_feasts: { name: 'Five Euro Feasts', platform: 'youtube', spellings: ['Five Euro Feasts'], weight: 4 },
  plant_plate_lab: { name: 'Plant Plate Lab', platform: 'instagram', spellings: ['Plant Plate Lab', 'plant plate lab'], weight: 4 },
  one_pan_studio: { name: 'One Pan Studio', platform: 'tiktok', spellings: ['One Pan Studio'], weight: 3 },
  market_mornings: { name: 'Market Mornings', platform: 'instagram', spellings: ['Market Mornings'], weight: 3 },
  spice_atlas: { name: 'Spice Atlas', platform: 'youtube', spellings: ['Spice Atlas'], weight: 2 },
  bread_and_butter: { name: 'Bread and Butter Club', platform: 'tiktok', spellings: ['Bread and Butter Club'], weight: 2 },
  sea_to_table: { name: 'Sea to Table', platform: 'youtube', spellings: ['Sea to Table'], weight: 1 },
};

const INSTITUTIONS = {
  'University of Lisbon': ['University of Lisbon', 'Universidade de Lisboa', 'ULisboa'],
  'University of Milan': ['University of Milan', 'Università degli Studi di Milano'],
  'University of Alicante': ['University of Alicante', 'Universidad de Alicante'],
  'Durham University': ['Durham University'],
  'Roskilde University': ['Roskilde University'],
  'University College Cork': ['University College Cork', 'UCC'],
  'University of Gastronomic Sciences': ['University of Gastronomic Sciences'],
  'Sorbonne University': ['Sorbonne University', 'Sorbonne Université'],
  'Technical University of Munich': ['Technical University of Munich', 'TU Munich'],
};
const INSTITUTION_IN = {
  Portugal: 'University of Lisbon', Italy: 'University of Milan', Spain: 'University of Alicante',
  'United Kingdom': 'Durham University', Denmark: 'Roskilde University', Ireland: 'University College Cork',
  France: 'Sorbonne University', Germany: 'Technical University of Munich',
};
const NATIONALITY_SPELLINGS = {
  Portuguese: ['Portuguese', 'portuguese', 'Portugal'],
  Spanish: ['Spanish', 'spanish', 'Spain'],
  Italian: ['Italian', 'italian'],
  French: ['French', 'french'],
  German: ['German', 'german'],
  Irish: ['Irish'],
  British: ['British', 'English'],
  Danish: ['Danish'],
};

// Youth survey
function youthResponses(def, n, pairs) {
  const q = name => options(def, name);
  const rows = [];
  for (let i = 0; i < n; i++) {
    const birth = pickFrom(COUNTRIES);
    const moved = chance(0.15);
    const live = moved ? pickFrom(COUNTRIES) : birth;
    const gender = pick(q('gender'), [[/^Female$/, 55], [/^Male$/, 40]]);
    const socioeconomic = pick(q('socioeconomic'), [[/^Middle/, 6], [/^Low/, 2], [/^High/, 1]]);
    const abroad = chance(0.45) ? 'Yes' : 'No';
    const period = abroad === 'Yes' ? pick(q('longest_period_abroad')) : null;
    const longStay = period && /More than/i.test(period);
    const reflect = chance(0.72) ? 'Yes' : 'No';
    const confident = chance(0.6);
    const follows = chance(0.6) ? 'Yes' : 'No';

    const r = {
      gender,
      age: pick(q('age'), [[/^18 to 25/, 65], [/^26 to 30/, 15], [/^31 to 35/, 8]]),
      country_birth: birth,
      country_live: live,
      current_situation: pick(q('current_situation'), [[/student/i, 5]]),
      socioeconomic,
      living_with: pickMany(q('living_with'), 1, [[/^Parents/, 4], [/Friends/, 3]]),
      lived_abroad: abroad,
      dietary_preferences: pick(q('dietary_preferences'), [[/Flexitarian/, 3], [/Vegetarian/, 2], [/Vegan/, 1], [/No /i, 8]]),
      food_priorities: pickMany(q('food_priorities'), 3, [[/Taste/, 8], [/Health/, 6], [/Afford/, 4], [/hunger/i, 3]]),
      eating_habits: {
        simple_home: pick(['never', 'rarely', 'sometimes', 'frequently'], { frequently: 6, sometimes: 3 }),
        elaborate_home: pick(['never', 'rarely', 'sometimes', 'frequently'], { sometimes: 4, rarely: 3 }),
        pre_made: pick(['never', 'rarely', 'sometimes', 'frequently'], { sometimes: 3, rarely: 3 }),
        eat_out: pick(['never', 'rarely', 'sometimes', 'frequently'],
          /^High/.test(socioeconomic) ? { frequently: 4, sometimes: 4 } : /^Low/.test(socioeconomic) ? { rarely: 4, never: 2 } : { sometimes: 4, rarely: 2 }),
        family_meals: pick(['never', 'rarely', 'sometimes', 'frequently'], { sometimes: 3, frequently: 2 }),
      },
      food_purchase_places: pickMany(q('food_purchase_places'), 2, [[/^Supermarket/, 8], [/grocery/i, 3]]),
      stocked_food_items: pickMany(q('stocked_food_items'), 7, [[/^Rice/, 9], [/^Eggs/, 7], [/^Fresh fruit/, 6], [/^Dairy/, 5], [/^Fresh vegetables/, 5]]),
      household_responsibility: pickMany(q('household_responsibility'), chance(0.3) ? 2 : 1,
        gender === 'Female' ? [[/^Myself/, 6], [/parents/i, 3]] : [[/^Myself/, 5], [/parents/i, 4]]),
      buying_influences: pickMany(q('buying_influences'), 3, [[/^Price/, 7], [/Health/, 6], [/Taste/, 6], [/Quality/, 4]]),
      desert_island_food: variant(ISLAND_SPELLINGS, pickFrom(ISLAND), pairs.island),
      connected_cuisines: pickMany(q('connected_cuisines'), 3, [[/^Italian/, 9], [new RegExp(`^${OWN_CUISINE[live]}`), 8], [/^Japanese/, 3], [/^Mexican/, 3]]),
      influences_on_cooking: pickMany(q('influences_on_cooking'), 3, [[/parents/i, 7], [/^Internet/, 7], [/social media/i, 6], [/self-taught/i, 3]]),
      top_food_preferences: pickMany(q('top_food_preferences'), 3, [[/^Home-cooked/, 10], [/^Traditional/, 5], [/^International/, 3], [/^Fine dining/, 0.4], [/^Brunch/, 0.8]]),
      describe_food_culture: pick(q('describe_food_culture'), [[/mix|fusion/i, 9], [/personal|family/i, 6], [/^National/i, 3], [/broader/i, 3], [/^Regional/i, 2]]),
      dishes_reflect: reflect,
      how_often_cook: pick(q('how_often_cook'), gender === 'Female' ? [[/^Every day/, 5], [/Five|Four|Six/, 3]] : [[/^Every day/, 3], [/Five|Four|Six/, 3]]),
      feel_in_kitchen: pick(q('feel_in_kitchen'), confident ? [[/my zone/i, 5], [/figure it out/i, 4]] : [[/not confident/i, 4], [/someone else/i, 2], [/overwhelmed/i, 1]]),
      approach_cooking: pickMany(q('approach_cooking'), 2, [[/memory/i, 5], [/improvise/i, 4]]),
      cooking_style_description: pickMany(q('cooking_style_description'), 2,
        confident ? [[/^Experimental/, 5], [/^Traditional/, 4], [/^Comforting/, 4]] : [[/^Survival/, 6], [/^Comforting/, 3]]),
      improve_skills: chance(0.86) ? 'Yes' : 'No',
      help_improve_options: pickMany(q('help_improve_options'), 2, [[/tips and tricks/i, 6], [/video/i, 5], [/meal plans/i, 4]]),
      follow_social_media: follows,
    };

    if (abroad === 'Yes') {
      r.country_abroad = pick(Object.keys(COUNTRIES).filter(c => c !== birth));
      r.longest_period_abroad = period;
      r.impact_on_eating = pick(q('impact_on_eating'), longStay ? [[/^A lot/, 5], [/^Completely/, 2], [/^Somewhat/, 3]] : [[/^Little/, 4], [/^Somewhat/, 4], [/^Not at all/, 2]]);
      r.specify_impact = IMPACT_TEXT[int(0, IMPACT_TEXT.length - 1)];
    }
    if (/^Regional/i.test(r.describe_food_culture)) r.specify_region = pick(['Catalonia', 'Sicily', 'Bavaria', 'Algarve', 'Galicia', 'Tuscany']);
    if (/broader/i.test(r.describe_food_culture)) r.specify_area = pick(['Mediterranean', 'Mediterranean', 'Atlantic', 'Nordic']);

    const own = ICONIC[birth];
    [1, 2, 3].forEach(k => {
      r[`iconic_dish_${k}`] = variant(ICONIC_SPELLINGS, own[int(0, own.length - 1)], pairs.iconic);
      r[`iconic_dish_${k}_self`] = chance(0.55) ? 'Yes' : 'No';
      r[`iconic_dish_${k}_others`] = chance(0.68) ? 'Yes' : 'No';
      r[`iconic_dish_${k}_last_month`] = chance(0.45) ? 'Yes' : 'No';
      const dish = pick(EVERYDAY, EVERYDAY_WEIGHT);
      r[`dish_${k}`] = variant(EVERYDAY_SPELLINGS, dish, pairs.everyday);
      r[`dish_${k}_self_prepare`] = chance(SELF_COOKED[dish] ?? 0.85) ? 'Yes' : 'No';
      r[`ingredient_${k}`] = variant(INGREDIENT_SPELLINGS, pick(INGREDIENTS[birth], { [INGREDIENTS[birth][0]]: 3 }), pairs.ingredients, true);
    });

    if (reflect === 'No') {
      r.why_not_reasons = pickMany(q('why_not_reasons'), int(1, 2), [[/too long/i, 6], [/prefer other/i, 4]]);
    } else {
      r.iconic_dishes_how_often = pick(q('iconic_dishes_how_often'), [[/^Occasionally/, 5], [/^Regularly/, 3], [/^Rarely/, 2]]);
      r.iconic_dishes_where = pickMany(q('iconic_dishes_where'), 2, [[/^I cook them at home/i, 6], [/grandparents/i, 4], [/^At a restaurant/i, 3]]);
    }
    if (follows === 'Yes') {
      const keys = Object.keys(CHANNELS);
      const named = pickMany(keys, int(1, 2), Object.fromEntries(keys.map(k => [k, CHANNELS[k].weight])));
      r.list_social_accounts = named.map(k => {
        const s = CHANNELS[k].spellings[int(0, CHANNELS[k].spellings.length - 1)];
        pairs.social.push([s, CHANNELS[k].name]);
        return s;
      }).join(', ');
    }
    rows.push(r);
  }
  return rows;
}

// Futures survey
// Rating near a centre: triangular noise of ±2.2 (one draw), rounded and kept on the scale.
const around = (centre, lo, hi) => {
  const t = R();
  const x = t < 0.5 ? Math.sqrt(2 * t) - 1 : 1 - Math.sqrt(2 * (1 - t));
  return Math.max(lo, Math.min(hi, Math.round(centre + x * 2.2)));
};

function demographics(def, pairs) {
  const country = pickFrom(COUNTRIES);
  const nationality = OWN_CUISINE[country];
  const institution = chance(0.85) ? INSTITUTION_IN[country] : 'University of Gastronomic Sciences';
  return {
    birth_year: int(1996, 2006),
    gender: pick(options(def, 'gender'), [[/^Female$/, 55], [/^Male$/, 40]]),
    nationality: variant(NATIONALITY_SPELLINGS, nationality, pairs.nationality),
    residence_country: country,
    institution: variant(INSTITUTIONS, institution, pairs.institution),
    program: pick(options(def, 'program'), [[/Bachelor/i, 5], [/Master/i, 3]]),
    field_of_study: pick(options(def, 'field_of_study')),
  };
}

function futuresResponses(def, n, pairs) {
  const centres = {
    future_world: 2.1, future_europe: 2.4, future_country: 2.4, future_personal: 3.2,
    economy: 5.0, politics: 4.9, technology: 4.9, ecosystem: 4.7, security: 4.6, culture: 4.2,
  };
  return Array.from({ length: n }, () => {
    const r = demographics(def, pairs);
    ['future_world', 'future_europe', 'future_country', 'future_personal'].forEach(k => { r[k] = around(centres[k], 1, 4); });
    ['economy', 'politics', 'culture', 'security', 'ecosystem', 'technology'].forEach(k => { r[k] = around(centres[k], 1, 6); });
    return r;
  });
}

// Visions survey: the 2050 stories (all fictional)
const STORIES = [
  { country: 'Portugal', nationality: 'Portuguese', gender: 'Female', born: 2003, tone: 'quiet joy',
    title: 'Sunday Bread, Shared Ovens', hook: "The neighbourhood oven still smells like my grandmother's kitchen.",
    themes: ['#communitymeals', '#homecooking', '#slowfood', '#familytable'],
    scene: 'Neighbours holding bowls of dough outside a shared brick oven on a narrow street, morning light.',
    summary: 'A young woman in Portugal bakes bread in a shared neighbourhood oven every Sunday and eats it slowly with her flatmates. Weekdays are rushed canteen meals, which makes the Sunday ritual feel precious.',
    text: 'In my typical day in 2050 I wake up early on Sunday and walk to the shared oven at the end of our street. Every building has a slot, and today is ours. I bring the dough I left rising overnight and talk with the neighbours while it bakes. Most weekdays I eat quick meals from the canteen at work, but Sunday is different. We bring the bread home, open a tin of sardines, slice tomatoes from the balcony and eat slowly with my flatmates. It feels like the oldest thing we still do, and I like that.' },
  { country: 'Italy', nationality: 'Italian', gender: 'Male', born: 2001, tone: 'mixed feelings',
    title: 'Pasta Printed to Order', hook: 'The printer makes perfect pasta, but I still knead it myself on Fridays.',
    themes: ['#printedfood', '#foodtech', '#nostalgia', '#homecooking'],
    scene: 'A compact food printer extruding fresh pasta next to a wooden board dusted with flour.',
    summary: 'An Italian man uses a food printer for quick protein-rich pasta on weekdays but makes it by hand on Fridays as his father taught him. He finds the printed version practical yet tasteless.',
    text: 'In 2050 my kitchen has a food printer that makes fresh pasta in any shape in two minutes. It is useful when I come home late from the lab. The flour cartridges are made from insects and lentils, so it is cheap and healthy, and the app counts the protein for me. Still, on Fridays I switch it off and make tagliatelle by hand like my father taught me, because it is the only time I really cook. My friends say I am being romantic. Maybe, but the printed pasta never tastes like anything I remember.' },
  { country: 'Spain', nationality: 'Spanish', gender: 'Female', born: 2002, tone: 'hopeful optimism',
    title: 'Rooftop Paella, City Rice', hook: "Half of tonight's paella grew on our own roof.",
    themes: ['#urbanfarming', '#communitymeals', '#localfood', '#homegrown'],
    scene: 'A large paella pan on a rooftop garden at sunset, long tables and planter boxes around it.',
    summary: 'A Spanish woman with a shorter working week cooks paella for her whole building floor using vegetables and rice grown on their rooftop. Shared cooking keeps expensive food affordable and sociable.',
    text: 'In my day in 2050 I finish work at four, because most of us work shorter weeks now. I go up to the rooftop garden of our building, where we grow tomatoes, beans, peppers and even a small rice tray in water boxes. Tonight it is my turn to cook for the whole floor, so I make a big paella with what we picked and a little chicken from the cooperative. Fourteen people eat together at long tables. Food costs more than before, but sharing it makes it cheaper and much more fun.' },
  { country: 'France', nationality: 'French', gender: 'Male', born: 2000, tone: 'pragmatic ambivalence',
    title: 'Nutrition Plan, Cheese Exception', hook: 'My health app plans every meal, except the cheese I refuse to give up.',
    themes: ['#personalizednutrition', '#foodtech', '#convenience', '#foodasjoy'],
    scene: 'A phone showing a meal plan beside a small piece of cheese and a slice of bread on a market paper.',
    summary: "A Frenchman follows a nutrition app that plans meals from his health data and feels more energetic, but keeps eating real cheese in the evening despite the app's warnings.",
    text: 'My day in 2050 starts with a message from my nutrition app telling me what I need to eat today based on my sleep and my blood sugar. Breakfast is a green shake, lunch is a bowl delivered to the office, all calculated. It works, I have more energy than my parents had at my age. But in the evening I buy a small piece of real cheese from the market and eat it with bread, and the app shows a little red warning. I accept the warning. Some things are not data.' },
  { country: 'Germany', nationality: 'German', gender: 'Female', born: 1999, tone: 'serene acceptance',
    title: 'Cultivated Meat, Weekly Market', hook: 'The schnitzel is grown in a tank now, and nobody at the table minds.',
    themes: ['#labgrownmeat', '#familytable', '#localfood', '#homecooking'],
    scene: 'A mother and son breading schnitzel at a kitchen counter, vegetables from the market in a basket.',
    summary: 'A German mother buys cultivated meat and market vegetables on Saturdays and cooks schnitzel with her son. She accepts the shift away from animal meat because the shared kitchen routine stayed the same.',
    text: 'In 2050 meat from animals is rare and expensive, so most of what we eat is cultivated or plant based. On Saturdays I go to the weekly market with my son and we buy vegetables, potatoes and a box of cultivated pork for schnitzel. It tastes almost the same as the one my mother made. We cook together and he breads the slices with too much flour, which is my favourite part. I do not miss the old way much. The food changed, but the kitchen did not.' },
  { country: 'Ireland', nationality: 'Irish', gender: 'Male', born: 2003, tone: 'dystopian dread',
    title: 'Rations, Rain and Potatoes', hook: 'We queue for the weekly box and hope the potatoes survived the floods.',
    themes: ['#scarcity', '#climateanxiety', '#worried2050', '#homecooking'],
    scene: 'A long queue in the rain outside a council building, people holding cardboard food boxes.',
    summary: 'A young Irishman lives on weekly council food boxes after floods destroy harvests, cooking soup on limited energy for himself and his sister. He feels the boxes shrinking and the queues growing.',
    text: 'In my day in 2050 the weather decides what we eat. After another wet summer half the harvest is gone, so food comes in a weekly box from the council. Potatoes, oats, some frozen fish if we are lucky. I cook soup for my sister and me on a small induction plate because energy is limited in the evening. Restaurants are for rich people now. I try not to think about it too much, but every year the box gets smaller and the queue gets longer.' },
  { country: 'United Kingdom', nationality: 'British', gender: 'Female', born: 2004, tone: 'quiet joy',
    title: 'Robot Chef, Human Dessert', hook: 'The robot cooks dinner, but dessert is still my job.',
    themes: ['#robotcooks', '#smartkitchen', '#nostalgia', '#foodasjoy'],
    scene: 'A kitchen robot arm stirring a pot of curry while a young woman takes an apple crumble out of the oven.',
    summary: "A British woman relies on a cooking robot programmed with her grandmother's recipes for weeknight dinners, and keeps baking desserts herself at the weekend with apples from a community orchard.",
    text: "In 2050 our flat has a cooking robot that prepares dinner while I am still on the train home. It follows recipes from my grandmother's notebook that I scanned years ago, so the curry tastes like hers. I come home, the table is set, and my partner and I eat together without stress. The robot does not do desserts well, so on weekends I bake a crumble with apples from the community orchard. It is small, but it makes the evening feel like ours." },
  { country: 'Denmark', nationality: 'Danish', gender: 'Male', born: 2002, tone: 'serene acceptance',
    title: 'Eating Alone, Eating Well', hook: 'I eat alone most nights, and the food is good enough to make it fine.',
    themes: ['#eatingalone', '#slowfood', '#communitymeals', '#sustainability'],
    scene: 'A small apartment table with one bowl of stew, rye bread and a radio by the window at dusk.',
    summary: 'A Danish man living alone cooks simple one-pot dinners and joins a weekly dinner club in his building. He sees food in 2050 as small sustainable habits rather than big family meals.',
    text: 'In 2050 I live alone in a small apartment in Copenhagen and work from home most days. Lunch is rye bread with smoked fish and vegetables from a subscription box. For dinner I usually cook a simple stew in one pot while listening to the radio. Once a week there is a dinner club in the building where everyone brings something. Eating alone does not bother me. I think food in 2050 is less about big families and more about small habits you can keep.' },
  { country: 'Portugal', nationality: 'Brazilian', gender: 'Female', born: 2001, tone: 'warm nostalgia',
    title: 'Two Kitchens, One Feijoada', hook: 'My feijoada is half Brazilian, half Portuguese, and fully mine.',
    themes: ['#traditionalfood', '#familytable', '#plantbased', '#nostalgia'],
    scene: 'A crowded kitchen with a big pot of black beans, kale on the counter and a birthday table behind.',
    summary: "A Brazilian woman in Porto cooks a hybrid feijoada for her daughter's birthday, mixing Brazilian beans with Portuguese kale and less meat, while neighbours bring pastries.",
    text: "In 2050 I have lived in Porto for twenty years, but I still cook like my mother in São Paulo on special days. Today is my daughter's birthday, so I spend the morning making feijoada with black beans, smoked tofu instead of so much pork, and Portuguese kale from the market. My neighbours bring pastéis de nata. The kitchen is loud and full of two languages. Every year the recipe changes a little, and I think that is how traditions survive." },
  { country: 'Italy', nationality: 'Italian', gender: 'Female', born: 2000, tone: 'defiant resilience',
    title: "Grandmother's Garden Stays", hook: 'They offered us vertical farm vegetables, we kept the old garden instead.',
    themes: ['#homegrown', '#traditionalfood', '#familytable', '#slowfood'],
    scene: 'Cousins picking tomatoes in a sunny garden with the city skyline far away.',
    summary: "An Italian woman and her cousins keep tending their grandmother's garden outside Milan instead of relying on vertical farms, making tomato sauce together each August.",
    text: 'In 2050 most vegetables in Milan come from vertical farms inside old office buildings. They are clean and cheap, but my family kept my grandmother\'s garden outside the city. Every weekend I take the train there and work the soil with my cousins. We grow tomatoes, zucchini and basil, and we make sauce together in August. People think it is inefficient. For us it is a way of saying that food is not only a product.' },
  { country: 'Spain', nationality: 'Spanish', gender: 'Male', born: 2004, tone: 'anxious unease',
    title: 'Water Bills Decide Dinner', hook: 'Every recipe now starts with how much water it costs.',
    themes: ['#scarcity', '#climateanxiety', '#worried2050', '#plantbased'],
    scene: 'A phone screen showing the water cost of a meal next to a bowl of chickpeas in a dry, bright kitchen.',
    summary: 'A Spanish man in Valencia plans meals around a strict water allowance, reserving rice dishes for celebrations and eating mostly chickpeas and vegetables. He worries about future droughts.',
    text: 'In my day in 2050 the water allowance in Valencia is strict, and the app shows the water cost of every meal before I cook. Rice became expensive after the long droughts, so paella is only for celebrations. Most days I eat chickpeas, bread and vegetables that need little water. I am not hungry, but I am always counting. Sometimes I worry about what my children will eat if the droughts keep getting worse.' },
  { country: 'France', nationality: 'French', gender: 'Female', born: 2002, tone: 'hopeful optimism',
    title: 'Canteen That Teaches Cooking', hook: 'Our school canteen became the place where everyone learns to cook.',
    themes: ['#communitymeals', '#sustainability', '#localfood', '#foodasjoy'],
    scene: 'Students in aprons serving a lentil gratin to classmates in a bright school canteen.',
    summary: 'A French teacher describes a school canteen where students cook lunch for everyone with a chef each week, learning where food comes from. She sees cooking skills returning.',
    text: 'In 2050 I work as a teacher, and the best part of my day is lunch. Our school canteen is also a kitchen class: every week a different group of students cooks for everyone with a chef. Today they made a lentil and vegetable gratin and a fruit tart. The kids know where every ingredient comes from and how much it costs. When I was young most people my age could not cook at all. Now it feels like cooking is coming back.' },
  { country: 'Germany', nationality: 'Turkish', gender: 'Male', born: 2001, tone: 'quiet joy',
    title: 'Night Shift, Warm Lentils', hook: "After the night shift, my mother's lentil soup is waiting in the shared fridge.",
    themes: ['#familytable', '#homecooking', '#traditionalfood', '#foodasjoy'],
    scene: 'A man eating lentil soup by a window at sunrise, a handwritten note on the table.',
    summary: 'A man working night shifts in Berlin eats the lentil soup his mother leaves in the shared fridge, and cooks for her on his days off in return.',
    text: 'In 2050 I work night shifts at the hospital in Berlin. When I come home at seven in the morning, my mother has left a pot of red lentil soup in the shared fridge of our building, with a note. I heat it, add lemon and chili, and eat it by the window while the city wakes up. On my days off I cook for her in return, usually something quick like pasta with vegetables. It is a small exchange, but it keeps us close.' },
  { country: 'Ireland', nationality: 'Irish', gender: 'Female', born: 2002, tone: 'serene acceptance',
    title: 'Seaweed on Every Plate', hook: 'Seaweed was a curiosity; now it is in almost everything I cook.',
    themes: ['#localfood', '#sustainability', '#homecooking', '#plantbased'],
    scene: 'Seaweed lines on a grey sea near the coast, a pot of stew with kelp on a stove inside a cottage.',
    summary: 'An Irish woman working on a seaweed farm near Galway cooks with seaweed in most dishes and sees it as a local, low-impact food.',
    text: 'In 2050 seaweed farming is one of the biggest jobs on the west coast, and I work on one of the farms near Galway. We eat it in soups, breads and even desserts. For dinner I make a stew with potatoes, carrots and kelp, and fish when the quota allows. My friends from the city laugh that everything tastes like the sea. I like it. It feels local and it does not need much land or water.' },
  { country: 'United Kingdom', nationality: 'British', gender: 'Male', born: 1998, tone: 'pragmatic ambivalence',
    title: 'Meal Pods and Real Pubs', hook: 'Weekdays are meal pods; Fridays are still for the pub.',
    themes: ['#convenience', '#foodasfuel', '#communitymeals', '#plantbased'],
    scene: 'A stack of sealed meal pods on an office desk, and a busy pub table with pies on a Friday night.',
    summary: 'A British man eats delivered meal pods during the week for efficiency and meets friends at the pub on Fridays, feeling weekday food has become fuel while weekends keep its social side.',
    text: 'My typical day in 2050 is efficient. Breakfast and lunch are meal pods delivered every morning, balanced for my training plan, and I barely think about food. It saves time and money. On Friday nights though, I meet friends at the pub, which now serves mostly plant-based pies and chips. We sit for hours. I sometimes feel that food during the week has become fuel, and the weekend is where it is still about people.' },
  { country: 'Denmark', nationality: 'Danish', gender: 'Female', born: 2003, tone: 'hopeful optimism',
    title: 'Zero-Waste Kitchen Club', hook: 'Our building throws away nothing, not even the carrot tops.',
    themes: ['#sustainability', '#communitymeals', '#homecooking', '#foodasjoy'],
    scene: 'Volunteers in a shared kitchen filling jars with pickles and pesto, crates of leftovers on the floor.',
    summary: "A Danish woman volunteers in her building's zero-waste kitchen club, turning residents' leftovers into soups, pickles and bread, which lowers food bills.",
    text: 'In 2050 our building in Aarhus runs a zero-waste kitchen club. Leftovers from every flat go into a shared kitchen where volunteers turn them into soups, pickles and bread for the next day. Today I helped make carrot top pesto and a big pot of vegetable soup. It sounds strict, but it feels like a game, and food bills are much lower. I think my generation learned to be creative because we had to.' },
  { country: 'Portugal', nationality: 'Portuguese', gender: 'Male', born: 2000, tone: 'mixed feelings',
    title: 'Bacalhau Became a Luxury', hook: 'Cod is so rare now that Christmas bacalhau feels like a treasure.',
    themes: ['#traditionalfood', '#scarcity', '#familytable', '#nostalgia'],
    scene: 'A family table at Christmas with one dish of salt cod, potatoes and olive oil at the centre.',
    summary: 'A Portuguese man eats mostly beans, rice and cultivated fish because real fish is rare, but his family still buys one real piece of bacalhau each Christmas. He accepts the change but feels a loss.',
    text: 'In my day in 2050 fish is expensive because the oceans are protected for most of the year. I eat mostly beans, rice and vegetables, and sometimes cultivated fish that tastes fine but not the same. At Christmas my whole family still buys one real piece of bacalhau and cooks it the old way with potatoes and olive oil. It is the most expensive meal of the year. I understand why things changed, but I feel something was lost.' },
  { country: 'Italy', nationality: 'Albanian', gender: 'Female', born: 2004, tone: 'quiet joy',
    title: 'Student Kitchen, Many Flags', hook: 'Six students, six countries, one very crowded stove.',
    themes: ['#communitymeals', '#familytable', '#foodasjoy', '#homecooking'],
    scene: 'Six students around a small kitchen table full of different dishes, steam rising from a pie.',
    summary: 'An Albanian student in Bologna shares a kitchen with five international flatmates who take turns cooking for everyone, mixing dishes from many countries.',
    text: 'In 2050 I study in Bologna and share a kitchen with five students from different countries. Every evening someone cooks for everyone, so I eat Albanian, Mexican, Korean and Italian food in the same week. Tonight I made byrek with spinach and cheese, and my Korean flatmate added kimchi on the side. It is chaotic and the kitchen is always dirty, but these dinners are the best part of my day.' },
  { country: 'Spain', nationality: 'Spanish', gender: 'Female', born: 1999, tone: 'defiant resilience',
    title: 'Tortilla Against the Algorithm', hook: "The app says insects; I say my mother's tortilla.",
    themes: ['#traditionalfood', '#foodtech', '#familytable', '#slowfood'],
    scene: 'A thick potato omelette on a plate, friends reaching for slices around a small table.',
    summary: "A Spanish woman resists the city's insect-protein meal plan on Sundays by making her mother's potato tortilla with farm eggs for friends.",
    text: 'In 2050 the city recommends insect protein for every meal and gives discounts if you follow the plan. I tried it, and the insect burgers are fine, but on Sundays I make a tortilla de patatas with real eggs from a small farm near Madrid, even though they cost more. My friends come over and we eat it warm with bread. I do not want an algorithm to decide every part of my food.' },
  { country: 'France', nationality: 'French', gender: 'Male', born: 2003, tone: 'serene acceptance',
    title: 'Vertical Farm Breakfast', hook: 'Strawberries in January, grown three floors below my office.',
    themes: ['#urbanfarming', '#smartkitchen', '#sustainability', '#eatingalone'],
    scene: 'Rows of strawberries and lettuce under purple lights in an office basement.',
    summary: "A Frenchman eats fruit and salads grown in his office's basement vertical farm and cooks simple pasta at home in the evening while calling his parents.",
    text: 'In 2050 I work in a building that has a vertical farm in the basement. Every morning I pick up fruit and greens grown downstairs: strawberries, lettuce, herbs. Breakfast is yoghurt with fruit at my desk, and lunch is a salad from the same farm. It is not very romantic, but it is fresh and there is almost no transport. In the evening I cook simple pasta at home and call my parents while I eat.' },
  { country: 'Germany', nationality: 'German', gender: 'Female', born: 2002, tone: 'warm nostalgia',
    title: 'Christmas Cookies, Same Tin', hook: 'Every December I bake from the same tin my grandmother used.',
    themes: ['#nostalgia', '#traditionalfood', '#familytable', '#robotcooks'],
    scene: 'An old blue biscuit tin full of star-shaped cookies on a floury table, two siblings laughing.',
    summary: "A German woman and her brother bake Christmas cookies by hand from their grandmother's recipes each December, letting the kitchen robot only clean up.",
    text: "In 2050 almost everything in my kitchen is automated, but in December I bake Christmas cookies by hand from my grandmother's recipes. The flour is from a regional mill and the butter is plant based now, but the tin is the same old blue tin. My brother and I spend a whole weekend baking and arguing about the right shape. The robot cleans up afterwards, which is the only help we accept." },
  { country: 'Ireland', nationality: 'Polish', gender: 'Male', born: 2001, tone: 'mixed feelings',
    title: 'Pierogi in a Small Flat', hook: 'I fold pierogi on a table the size of a laptop.',
    themes: ['#eatingalone', '#convenience', '#traditionalfood', '#nostalgia'],
    scene: 'A tiny studio kitchen, a young man folding dumplings on a very small table.',
    summary: "A Polish man in a tiny Dublin flat eats mostly ready meals but makes and freezes his grandmother's pierogi once a month. He feels housing shaped his cooking more than technology.",
    text: 'In 2050 I live in Dublin in a very small flat, like most young people. The kitchen is one induction plate and a tiny fridge. Most days I eat ready meals or noodles. But once a month I fold pierogi with potato and cheese like my grandmother in Kraków, on a table the size of a laptop. I freeze them and eat them for weeks. Housing changed how we cook more than technology did.' },
  { country: 'United Kingdom', nationality: 'Indian', gender: 'Female', born: 2000, tone: 'hopeful optimism',
    title: 'Spices From Four Continents', hook: 'I order spices from four continents and grow the coriander myself.',
    themes: ['#homecooking', '#homegrown', '#foodasjoy', '#localfood'],
    scene: 'A windowsill with pots of coriander and chili, a pan of chickpea curry and flatbread below.',
    summary: 'A woman in Leeds cooks varied dishes each evening with spices from a farmer cooperative and herbs from her windowsill, seeing food as more connected despite scarcer ingredients.',
    text: 'In 2050 I live in Leeds and cook something different every evening. I order spices from a cooperative that works directly with farmers in India and Morocco, and I grow coriander and chilies on my windowsill. Tonight I made a chickpea curry with rice and fresh flatbread. Cooking is my break from work. I think food in 2050 is more connected than ever, even if some ingredients are harder to get.' },
  { country: 'Denmark', nationality: 'Danish', gender: 'Male', born: 1997, tone: 'pragmatic ambivalence',
    title: 'Smart Fridge Knows Best', hook: 'My fridge orders the groceries before I notice they are missing.',
    themes: ['#smartkitchen', '#familytable', '#convenience', '#sustainability'],
    scene: 'A family of four eating fish cakes and salad, a fridge screen glowing in the background.',
    summary: "A Danish father lets his smart fridge order groceries and plan family dinners, which cuts waste and improves his children's diet, though he misses spontaneous shopping.",
    text: 'In my day in 2050 the fridge tracks everything and orders groceries automatically from a local shop. It plans dinners for my family of four based on what we have, so we waste almost nothing. Tonight it suggested fish cakes with potatoes and salad. It is convenient and my kids eat better than I did. Still, sometimes I miss walking through a supermarket and buying something just because it looked good.' },
];

function visionsResponses(def, pairs) {
  return STORIES.map(s => {
    const institution = INSTITUTION_IN[s.country];
    return {
      birth_year: s.born,
      gender: s.gender,
      nationality: variant(NATIONALITY_SPELLINGS, s.nationality, pairs.nationality),
      residence_country: s.country,
      institution: variant(INSTITUTIONS, institution, pairs.institution),
      program: pick(options(def, 'program'), [[/Bachelor/i, 5], [/Master/i, 3]]),
      field_of_study: pick(options(def, 'field_of_study')),
      day_in_life_2050: s.text,
    };
  });
}

// One card per story, in the same order as the visions responses (Index = story_index).
function storyCards(visions) {
  return STORIES.map((s, i) => ({
    story_index: i + 1,
    story_text: s.text,
    nationality: visions[i].nationality,
    residence_country: s.country,
    gender: s.gender,
    birth_year: s.born,
    title: s.title,
    swipe_hook: s.hook,
    image_prompt: s.scene,
    bio: s.hook,
    emotional_tone: s.tone,
    themes: s.themes,
    summary: s.summary,
    card_version: 2,
    relevant: true,
  }));
}

// Write everything
function asDocs(type, rows, startMonth) {
  return rows.map((responses, i) => {
    const day = new Date(Date.UTC(2026, startMonth, 1) + i * 14 * 3600 * 1000);
    return { surveyType: type, createdAt: day.toISOString(), responses };
  });
}

function main() {
  const youthDef = loadSurvey('surveyRelishData.js');
  const futuresDef = loadSurvey('surveyFutureData.js');
  const visionsDef = loadSurvey('surveyVisionsData.js');

  const pairs = { iconic: [], everyday: [], ingredients: [], island: [], social: [], institution: [], nationality: [] };
  const youth = youthResponses(youthDef, 240, pairs);
  const futures = futuresResponses(futuresDef, 150, pairs);
  const visions = visionsResponses(visionsDef, pairs);

  writeJSON(path.join(OUT_RESPONSES, 'youth_responses.json'), asDocs('youth', youth, 0));
  writeJSON(path.join(OUT_RESPONSES, 'futures_responses.json'), asDocs('futures', futures, 1));
  writeJSON(path.join(OUT_RESPONSES, 'visions_responses.json'), asDocs('visions', visions, 2));

  writeJSON(path.join(OUT_DATA, 'dishes_normalized.json'), normalisationFile(pairs.iconic));
  writeJSON(path.join(OUT_DATA, 'regular_dishes_normalized.json'), normalisationFile(pairs.everyday));
  writeJSON(path.join(OUT_DATA, 'ingredients_normalized.json'), normalisationFile(pairs.ingredients));
  writeJSON(path.join(OUT_DATA, 'desert_island_normalized.json'), normalisationFile(pairs.island));
  writeJSON(path.join(OUT_DATA, 'social_accounts_normalized.json'), socialAccountsFile(pairs.social));
  writeJSON(path.join(OUT_DATA, 'institutions_normalized.json'), normalisationFile(pairs.institution));
  writeJSON(path.join(OUT_DATA, 'nationalities_normalized.json'), normalisationFile(pairs.nationality));
  writeJSON(path.join(OUT_DATA, 'story_cards.json'), storyCards(visions));

  // Creators named by more than one respondent appear in the story.
  const mentions = {};
  youth.forEach(r => String(r.list_social_accounts || '').split(',').map(x => x.trim()).filter(Boolean).forEach(raw => {
    const key = Object.keys(CHANNELS).find(k => CHANNELS[k].spellings.includes(raw));
    if (key) mentions[key] = (mentions[key] || 0) + 1;
  }));
  const channels = {};
  Object.entries(CHANNELS).forEach(([key, c]) => {
    channels[key] = { platform: c.platform, display_name: c.name, url: '', mentions: mentions[key] || 0, avatar_local: false };
  });
  writeJSON(path.join(OUT_DATA, 'social_channels.json'), { channels });

  // The demo cards have no illustrations.
  writeJSON(path.join(OUT_IMAGES, 'manifest.json'), { indices: [] });

  console.log(`youth ${youth.length}, futures ${futures.length}, visions ${visions.length} responses; ${STORIES.length} story cards`);
}

main();
