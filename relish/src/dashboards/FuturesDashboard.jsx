// Dashboard for the future perspectives survey (ratings).
import SurveyDashboard from './SurveyDashboard';
import { normaliseNationality } from './nationality';

const OUTLOOK_LABELS = ['1', '2', '3', '4'];
const OUTLOOK_LABEL_MAP = {
  '1': '1 — Very pessimistic',
  '4': '4 — Very optimistic',
};

const RELEVANCE_LABELS = ['1', '2', '3', '4', '5', '6'];
const RELEVANCE_LABEL_MAP = {
  '1': '1 — Entirely Irrelevant',
  '6': '6 — Extremely Relevant',
};

const charts = [

  // Participant Profile
  {
    chartType: 'categorical',
    key: 'gender',
    title: 'Gender',
    description: 'Distribution of respondents by gender identity',
    type: 'pie'
  },
  {
    chartType: 'categorical',
    key: 'birth_year',
    title: 'Year of Birth',
    description: 'Spread of birth years across the respondent group',
    type: 'bar',
    numeric: true,
    orientation: 'horizontal'
  },
  {
    chartType: 'categorical',
    key: 'nationality',
    title: 'Nationality',
    description: 'Nationalities represented among respondents. Spellings and country names are folded onto one nationality; the few respondents who named more than one are counted under each.',
    type: 'bar',
    orientation: 'horizontal',
    transform: normaliseNationality,
  },
  {
    chartType: 'map',
    key: 'residence_country',
    title: 'Country of Residence',
    description: 'The country where respondents currently live. Darker shading indicates more respondents; hover a country to see the count.',
  },
  {
    chartType: 'categorical',
    key: 'institution',
    title: 'Institution',
    description: 'Home or host institutions attended by respondents. Spellings, languages, acronyms and faculties are folded onto one name per institution; answers naming no institution ("N/A", "student", "exchange programme") are left out.',
    type: 'bar',
    orientation: 'horizontal'
  },
  {
    chartType: 'categorical',
    key: 'program',
    title: 'Current Academic Program',
    description: 'Level of study at the time of the survey: Bachelor\'s, Master\'s, or Doctoral',
    type: 'bar'
  },
  {
    chartType: 'categorical',
    key: 'field_of_study',
    title: 'Main Field of Study',
    description: 'The broad academic discipline respondents are enrolled in',
    type: 'bar'
  },

  // Future Outlook (scale 1–4: Very pessimistic → Very optimistic)
  {
    chartType: 'categorical',
    key: 'future_world',
    title: 'Outlook on the Future of the World',
    description: 'How respondents feel about the direction of the world as a whole',
    type: 'bar',
    numeric: true,
    forceLabels: OUTLOOK_LABELS,
    forceLabelMap: OUTLOOK_LABEL_MAP,
  },
  {
    chartType: 'categorical',
    key: 'future_europe',
    title: 'Outlook on the Future of Europe',
    description: 'Sentiment about Europe\'s future trajectory',
    type: 'bar',
    numeric: true,
    forceLabels: OUTLOOK_LABELS,
    forceLabelMap: OUTLOOK_LABEL_MAP,
  },
  {
    chartType: 'categorical',
    key: 'future_country',
    title: 'Outlook on the Future of Their Country of Origin',
    description: 'How respondents perceive the future of the country they are from',
    type: 'bar',
    numeric: true,
    forceLabels: OUTLOOK_LABELS,
    forceLabelMap: OUTLOOK_LABEL_MAP,
  },
  {
    chartType: 'categorical',
    key: 'future_personal',
    title: 'Outlook on Their Own Personal Future',
    description: 'Respondents\' sense of optimism or pessimism about their individual future',
    type: 'bar',
    numeric: true,
    forceLabels: OUTLOOK_LABELS,
    forceLabelMap: OUTLOOK_LABEL_MAP,
  },

  // Relevance of Factors (scale 1–6: Entirely Irrelevant → Extremely Relevant)
  {
    chartType: 'diverging',
    title: 'Relevance of Six Factors in Defining the Future',
    description: 'All six factors together, ordered by mean rating (most relevant first). Ratings 1–3 extend left of the centre line, 4–6 right; the totals at each end add up the three levels on that side.',
    items: [
      { key: 'economy', label: 'Economy' },
      { key: 'politics', label: 'Politics' },
      { key: 'culture', label: 'Culture' },
      { key: 'security', label: 'Security' },
      { key: 'ecosystem', label: 'Ecosystem' },
      { key: 'technology', label: 'Technology' },
    ],
    levels: RELEVANCE_LABELS,
    levelLabels: { '1': '1 · Entirely irrelevant', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6 · Extremely relevant' },
    leftLabel: 'less relevant',
    rightLabel: 'more relevant',
    sort: 'mean',
  },
  {
    chartType: 'categorical',
    key: 'economy',
    title: 'Relevance of Economy in Defining the Future',
    description: 'Economy covers production, trade, industry, and financial systems, including GDP, unemployment, and inflation',
    type: 'bar',
    numeric: true,
    forceLabels: RELEVANCE_LABELS,
    forceLabelMap: RELEVANCE_LABEL_MAP,
  },
  {
    chartType: 'categorical',
    key: 'politics',
    title: 'Relevance of Politics in Defining the Future',
    description: 'Politics refers to governance, institutions, power dynamics, and how laws and resources are allocated',
    type: 'bar',
    numeric: true,
    forceLabels: RELEVANCE_LABELS,
    forceLabelMap: RELEVANCE_LABEL_MAP,
  },
  {
    chartType: 'categorical',
    key: 'culture',
    title: 'Relevance of Culture in Defining the Future',
    description: 'Culture encompasses shared beliefs, values, customs, religion, art, language, and social norms',
    type: 'bar',
    numeric: true,
    forceLabels: RELEVANCE_LABELS,
    forceLabelMap: RELEVANCE_LABEL_MAP,
  },
  {
    chartType: 'categorical',
    key: 'security',
    title: 'Relevance of Security in Defining the Future',
    description: 'Security covers internal safety (crime, law enforcement) and external defence (foreign relations, threats)',
    type: 'bar',
    numeric: true,
    forceLabels: RELEVANCE_LABELS,
    forceLabelMap: RELEVANCE_LABEL_MAP,
  },
  {
    chartType: 'categorical',
    key: 'ecosystem',
    title: 'Relevance of Ecosystem in Defining the Future',
    description: 'Ecosystem includes biodiversity, pollution, conservation, and the relationship between human activity and natural environments',
    type: 'bar',
    numeric: true,
    forceLabels: RELEVANCE_LABELS,
    forceLabelMap: RELEVANCE_LABEL_MAP,
  },
  {
    chartType: 'categorical',
    key: 'technology',
    title: 'Relevance of Technology in Defining the Future',
    description: 'Technology refers to tools, machines, and methods that apply scientific knowledge and how they interact with other social factors',
    type: 'bar',
    numeric: true,
    forceLabels: RELEVANCE_LABELS,
    forceLabelMap: RELEVANCE_LABEL_MAP,
  },
];

export default function FuturesDashboard() {
  return (
    <SurveyDashboard
      surveyType="futures"
      pageTitle="Youth Perspectives on the Future"
      surveyLink="/survey_future_perspectives"
      pageDescription="Welcome! Here you can find insights into how people, most of them university students in Europe, perceive and speculate about the future. This survey explores general outlooks on the world, Europe, and personal trajectories, as well as the factors respondents consider most relevant in shaping what's to come. This visualisation is part of the European project RELISH, Reframing European Gastronomy Legacy through Innovation, Sustainability and Heritage (reference 101177427), funded under the Horizon Europe programme (HORIZON-CL2-2024-HERITAGE-01)."
      charts={charts}
    />
  );
}