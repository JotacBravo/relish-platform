// Dashboard for the youth food-culture survey.
import SurveyDashboard from './SurveyDashboard';

const charts = [

  // Section 1: About You
  {
    chartType: 'categorical',
    key: 'gender',
    title: 'Gender',
    description: 'Distribution of respondents by gender identity',
    type: 'pie'
  },
  {
    chartType: 'categorical',
    key: 'age',
    title: 'Age Group',
    description: 'Age range of respondents at the time of the survey',
    type: 'bar'
  },
  {
    chartType: 'map',
    key: 'country_birth',
    title: 'Country of Birth',
    description: 'The country where each respondent was born. Darker shading indicates more respondents; hover a country to see the count.',
  },
  {
    chartType: 'map',
    key: 'country_live',
    title: 'Country of Residence',
    description: 'The country where respondents currently live. Darker shading indicates more respondents; hover a country to see the count.',
  },
  {
    chartType: 'categorical',
    key: 'current_situation',
    title: 'Current Situation',
    description: 'Whether respondents are working, studying, both, or unemployed',
    type: 'bar'
  },
  {
    chartType: 'categorical',
    key: 'socioeconomic',
    title: 'Socioeconomic Background',
    description: 'Self-reported socioeconomic background of respondents',
    type: 'bar'
  },
  {
    chartType: 'categorical',
    key: 'living_with',
    title: 'Who They Live With',
    description: 'The people respondents share their home with: partners, family, friends, or alone',
    type: 'bar'
  },
  {
    chartType: 'categorical',
    key: 'lived_abroad',
    title: 'Have You Ever Lived Abroad?',
    description: 'Whether respondents have had the experience of living in another country',
    type: 'pie'
  },
  {
    chartType: 'map',
    key: 'country_abroad',
    title: 'Country Lived Abroad the Longest',
    description: 'Among those who lived abroad, the country where they spent the most time. Darker shading indicates more respondents; hover a country to see the count.',
  },
  {
    chartType: 'categorical',
    key: 'longest_period_abroad',
    title: 'Longest Period Lived Abroad',
    description: 'Duration of the longest stint abroad: under 6 months, 6–12 months, or over a year',
    type: 'bar'
  },
  {
    chartType: 'categorical',
    key: 'impact_on_eating',
    title: 'Did Living Abroad Change Your Way of Eating?',
    description: 'How much the experience of living abroad altered respondents\' eating habits: from "Not at all" to "Completely"',
    type: 'bar'
  },
  {
    chartType: 'wordcloud',
    keys: ['specify_impact'],
    title: 'How Living Abroad Changed Their Eating',
    description: 'Open-ended responses from those whose eating habits were impacted by living abroad. Larger words appear more frequently'
  },

  // Section 2: Connection with Food
  {
    chartType: 'categorical',
    key: 'dietary_preferences',
    title: 'Dietary Preferences or Restrictions',
    description: 'The dietary choices or restrictions respondents follow: from omnivore to vegan, halal, gluten-free, and more',
    type: 'bar'
  },
  {
    chartType: 'categorical',
    key: 'food_priorities',
    title: 'What Matters Most When Choosing What to Eat',
    description: 'Respondents selected up to 3 factors that matter most: such as health, taste, sustainability, affordability, or cultural identity',
    type: 'bar'
  },
  {
    chartType: 'matrix',
    key: 'eating_habits',
    title: 'How Often Do You Eat in These Ways?',
    description: 'Frequency of different eating habits: cooking at home, eating out, ordering takeout, or relying on family-cooked meals',
    rows: [
      { value: 'simple_home',    text: 'Simple recipes at home' },
      { value: 'elaborate_home', text: 'Elaborate recipes at home' },
      { value: 'pre_made',       text: 'Pre-made or takeout food' },
      { value: 'eat_out',        text: 'Eat out at restaurants or cafés' },
      { value: 'family_meals',   text: 'Meals made by family or friends' },
    ],
    columns: [
      { value: 'never',      text: 'Never' },
      { value: 'rarely',     text: 'Rarely' },
      { value: 'sometimes',  text: 'Sometimes' },
      { value: 'frequently', text: 'Frequently' },
    ],
  },
  {
    chartType: 'categorical',
    key: 'food_purchase_places',
    title: 'Where Do You Usually Buy Your Food?',
    description: 'Respondents selected up to 3 places: supermarkets, local stores, markets, specialist shops, online, or directly from producers',
    type: 'bar'
  },
  {
    chartType: 'categorical',
    key: 'stocked_food_items',
    title: 'Food Items Always Stocked at Home',
    description: 'The staple items respondents keep at home: from pantry staples like rice and legumes to fresh produce, dairy, and convenience foods',
    type: 'bar'
  },
  {
    chartType: 'categorical',
    key: 'household_responsibility',
    title: 'Who Is Responsible for Purchasing and Cooking?',
    description: 'Who handles grocery shopping and cooking in respondents\' households: themselves, a partner, parents, or someone else',
    type: 'bar'
  },
  {
    chartType: 'categorical',
    key: 'buying_influences',
    title: 'What Influences You Most When Buying Food?',
    description: 'Respondents selected up to 3 factors: including price, quality, health, origin, convenience, ethics, and brand',
    type: 'bar'
  },
  {
    chartType: 'wordcloud',
    keys: ['desert_island_food'],
    title: 'Desert Island Dish',
    description: '"You\'re stuck on a desert island and can only eat one dish, what would it be?" Open-ended answers shown as a word cloud'
  },
  {
    chartType: 'categorical',
    key: 'dish_1_self_prepare',
    title: 'Dish 1. Prepared by the Respondent?',
    description: 'Whether respondents prepare their first regularly eaten dish themselves',
    type: 'pie'
  },
  {
    chartType: 'categorical',
    key: 'dish_2_self_prepare',
    title: 'Dish 2. Prepared by the Respondent?',
    description: 'Whether respondents prepare their second regularly eaten dish themselves',
    type: 'pie'
  },
  {
    chartType: 'categorical',
    key: 'dish_3_self_prepare',
    title: 'Dish 3. Prepared by the Respondent?',
    description: 'Whether respondents prepare their third regularly eaten dish themselves',
    type: 'pie'
  },
  {
    chartType: 'wordcloud',
    keys: ['dish_1', 'dish_2', 'dish_3'],
    title: 'Dishes Regularly Eaten',
    description: 'The three dishes respondents named as part of their regular diet, combined into a single word cloud. Larger words appear more frequently'
  },
  {
    chartType: 'categorical',
    key: 'connected_cuisines',
    title: 'Cuisines Respondents Feel Most Connected To',
    description: 'Which national or regional cuisines respondents identify with most: spanning European, Asian, Latin American, and other traditions',
    type: 'bar'
  },
  {
    chartType: 'categorical',
    key: 'influences_on_cooking',
    title: 'Where Do You Get Inspiration for What You Cook?',
    description: 'Sources that shape respondents\' cooking and eating: family, social media, the internet, cookbooks, cultural background, and more',
    type: 'bar'
  },
  {
    chartType: 'categorical',
    key: 'top_food_preferences',
    title: 'Top 3 Preferred Food Styles or Types',
    description: 'Respondents selected up to 3 from options including comfort food, street food, fine dining, fast food, international cuisine, and healthy meals',
    type: 'bar'
  },

  // Section 3: Food Culture
  {
    chartType: 'categorical',
    key: 'describe_food_culture',
    title: 'How Would You Describe Your Food Culture?',
    description: 'Whether respondents identify their food culture as personal/family-based, regional, national, a broader geographic area, or a mix of influences',
    type: 'bar'
  },
  {
    chartType: 'wordcloud',
    keys: ['specify_region', 'select_country', 'specify_area'],
    title: 'Food Culture Reference Region, Country, or Area',
    description: 'The specific region, country, or geographic area respondents named when describing their food culture'
  },
  {
    chartType: 'wordcloud',
    keys: ['ingredient_1', 'ingredient_2', 'ingredient_3'],
    title: 'Iconic Ingredients from Their Food Culture',
    description: 'The three iconic ingredients respondents associated with their culinary or food culture, combined into one word cloud'
  },

  // Iconic Dish 1
  {
    chartType: 'wordcloud',
    keys: ['iconic_dish_1'],
    title: 'Iconic Dish 1. Names',
    description: 'First iconic dish from respondents\' culinary or food culture'
  },
  {
    chartType: 'categorical',
    key: 'iconic_dish_1_self',
    title: 'Iconic Dish 1. Do You Cook It for Yourself?',
    description: 'Whether respondents prepare their first iconic dish at home for themselves',
    type: 'pie'
  },
  {
    chartType: 'categorical',
    key: 'iconic_dish_1_others',
    title: 'Iconic Dish 1. Have You Cooked or Ordered It for Others?',
    description: 'Whether respondents have shared their first iconic dish by cooking or ordering it for others',
    type: 'pie'
  },
  {
    chartType: 'categorical',
    key: 'iconic_dish_1_last_month',
    title: 'Iconic Dish 1. Eaten in the Last Month?',
    description: 'Whether respondents ate their first iconic dish at least once in the past month',
    type: 'pie'
  },

  // Iconic Dish 2
  {
    chartType: 'wordcloud',
    keys: ['iconic_dish_2'],
    title: 'Iconic Dish 2. Names',
    description: 'Second iconic dish from respondents\' culinary or food culture'
  },
  {
    chartType: 'categorical',
    key: 'iconic_dish_2_self',
    title: 'Iconic Dish 2. Do You Cook It for Yourself?',
    description: 'Whether respondents prepare their second iconic dish at home for themselves',
    type: 'pie'
  },
  {
    chartType: 'categorical',
    key: 'iconic_dish_2_others',
    title: 'Iconic Dish 2. Have You Cooked or Ordered It for Others?',
    description: 'Whether respondents have shared their second iconic dish by cooking or ordering it for others',
    type: 'pie'
  },
  {
    chartType: 'categorical',
    key: 'iconic_dish_2_last_month',
    title: 'Iconic Dish 2. Eaten in the Last Month?',
    description: 'Whether respondents ate their second iconic dish at least once in the past month',
    type: 'pie'
  },

  // Iconic Dish 3
  {
    chartType: 'wordcloud',
    keys: ['iconic_dish_3'],
    title: 'Iconic Dish 3. Names',
    description: 'Third iconic dish from respondents\' culinary or food culture'
  },
  {
    chartType: 'categorical',
    key: 'iconic_dish_3_self',
    title: 'Iconic Dish 3. Do You Cook It for Yourself?',
    description: 'Whether respondents prepare their third iconic dish at home for themselves',
    type: 'pie'
  },
  {
    chartType: 'categorical',
    key: 'iconic_dish_3_others',
    title: 'Iconic Dish 3. Have You Cooked or Ordered It for Others?',
    description: 'Whether respondents have shared their third iconic dish by cooking or ordering it for others',
    type: 'pie'
  },
  {
    chartType: 'categorical',
    key: 'iconic_dish_3_last_month',
    title: 'Iconic Dish 3. Eaten in the Last Month?',
    description: 'Whether respondents ate their third iconic dish at least once in the past month',
    type: 'pie'
  },

  {
    chartType: 'categorical',
    key: 'dishes_reflect',
    title: 'Do These Iconic Dishes Reflect What You Actually Eat?',
    description: 'Whether respondents feel that the iconic dishes from their food culture match their everyday eating habits',
    type: 'pie'
  },
  {
    chartType: 'categorical',
    key: 'why_not_reasons',
    title: 'Why Don\'t You Eat These Iconic Dishes More Often?',
    description: 'Barriers cited by those who said iconic dishes don\'t reflect their diet: cost, skills, time, availability of ingredients, or preference',
    type: 'bar'
  },
  {
    chartType: 'categorical',
    key: 'iconic_dishes_how_often',
    title: 'How Often Do You Eat These Iconic Dishes?',
    description: 'Frequency of eating iconic cultural dishes: from weekly to only on special occasions or almost never. Only shown for those who said these dishes reflect what they eat',
    type: 'bar'
  },
  {
    chartType: 'categorical',
    key: 'iconic_dishes_where',
    title: 'Where Do You Usually Eat These Iconic Dishes?',
    description: 'Settings where respondents eat their iconic cultural dishes: at home, a family member\'s place, a restaurant, street food, or a canteen',
    type: 'bar'
  },

  // Section 4: Cooking Style
  {
    chartType: 'categorical',
    key: 'how_often_cook',
    title: 'How Often Do You Cook?',
    description: 'Cooking frequency, ranging from never to every single day',
    type: 'bar'
  },
  {
    chartType: 'categorical',
    key: 'feel_in_kitchen',
    title: 'How Do You Feel in the Kitchen?',
    description: 'Respondents\' self-reported confidence and comfort in the kitchen: from feeling overwhelmed to fully in control. Only shown for those who cook',
    type: 'bar'
  },
  {
    chartType: 'categorical',
    key: 'approach_cooking',
    title: 'What Is Your Approach When You Cook?',
    description: 'Whether respondents follow written recipes, watch video tutorials, rely on memory and experience, or improvise as they go',
    type: 'bar'
  },
  {
    chartType: 'categorical',
    key: 'cooking_style_description',
    title: 'How Would You Describe Your Cooking Style?',
    description: 'Self-described cooking style: traditional, experimental, survival mode, healthy, fusion, comforting, sustainable, and more',
    type: 'bar'
  },
  {
    chartType: 'categorical',
    key: 'improve_skills',
    title: 'Would You Like to Improve Your Cooking Skills?',
    description: 'Whether respondents express a desire to develop further in the kitchen',
    type: 'pie'
  },
  {
    chartType: 'categorical',
    key: 'help_improve_options',
    title: 'What Would Help You Improve Your Cooking Skills?',
    description: 'Support formats respondents find most useful: video tutorials, meal plans, cooking classes, apps, AI tools, or tips on nutrition. Only shown for those who want to improve',
    type: 'bar'
  },
  {
    chartType: 'categorical',
    key: 'follow_social_media',
    title: 'Do You Follow Food or Cooking Accounts on Social Media?',
    description: 'Whether respondents actively follow food, cooking, or nutrition content creators on social platforms',
    type: 'pie'
  },
  {
    chartType: 'categorical',
    key: 'list_social_accounts',
    title: 'Food & Cooking Accounts Followed on Social Media',
    description: 'Accounts named by respondents who follow food or cooking creators. Up to three accounts were listed per person',
    type: 'bar',
    orientation: 'horizontal',
    transform: (value) => {
        const str = String(value).trim();

        // Extract username from Instagram URLs
        const urlMatch = str.match(/instagram\.com\/([^?/\s]+)/i);
        if (urlMatch) return [urlMatch[1]];

        const cleaned = str
            .replace(/TikTok:\s*/gi, '')
            .replace(/Instagram:\s*/gi, '');

        // Split on semicolons, slashes, or commas (but not inside a single @handle)
        const parts = cleaned
            .split(/[;/]|\s*,\s*/)
            .flatMap(part => {
                // If a part contains multiple @handles, split on spaces between them
                const handles = part.match(/@\S+/g);
                if (handles && handles.length > 1) return handles;
                return [part];
            })
            .map(p => p.trim().replace(/^@/, ''))   // strip leading @
            .filter(p => p.length > 0 && p.length < 80);

        return parts;
    },
},
];

export default function YouthDashboard() {
  return (
    <SurveyDashboard
      surveyType="youth"
      pageTitle="Youth Food Culture & Cooking Habits"
      surveyLink="/survey_youth_food_culture"
      pageDescription="Welcome! Here you can find insights into the food habits, cultural traditions, and cooking experiences of young people from across Europe and beyond. This survey explores what shapes our meals, from daily routines and cooking styles to cultural identity and special occasions. This visualisation is part of the European project RELISH, Reframing European Gastronomy Legacy through Innovation, Sustainability and Heritage (reference 101177427), funded under the Horizon Europe programme (HORIZON-CL2-2024-HERITAGE-01)."
      charts={charts}
    />
  );
}