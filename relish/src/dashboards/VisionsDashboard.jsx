// Dashboard for the Food Visions 2050 survey (written stories).
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SurveyDashboard from './SurveyDashboard';
import { normaliseNationality } from './nationality';

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
    numeric: true
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
];

// theme

const theme = {
  accent:    '#FF7F6F',
  textDark:  '#333333',
  textLight: '#666666',
  white:     '#ffffff',
  bgLight:   '#f2f2f2',
  shadow:    '0 4px 12px rgba(0,0,0,0.05)',
};

// Highlight helper

function HighlightedText({ text, query }) {
  if (!query.trim()) return <span>{text}</span>;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            style={{
              backgroundColor: '#FFE0A0',
              color: theme.textDark,
              borderRadius: '3px',
              padding: '0 2px',
            }}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// Date formatter

const formatDatePretty = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch (_) {
    return null;
  }
};

// Responses List

function ResponsesList() {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState(null);
  const [search, setSearch]       = useState('');
  const [tinderScores, setTinderScores] = useState({});

  useEffect(() => {
    axios.get('/api/survey/filtered?surveyType=visions')
      .then(res  => { setResponses(res.data); setLoading(false); })
      .catch(()  => setLoading(false));
    // Likes from the Food Visions 2050 deck, keyed by story Index
    axios.get('/api/tinder/scores')
      .then(res  => setTinderScores(res.data || {}))
      .catch(() => {});
  }, []);

  const filtered = responses.filter(r => {
    if (!r.day_in_life_2050) return false;
    if (!search.trim()) return true;
    return r.day_in_life_2050.toLowerCase().includes(search.toLowerCase());
  });

  const capitalizeStory = (text) => {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  return (
    <div style={{
      backgroundColor: theme.bgLight,
      padding: '0 20px 60px',
      fontFamily: "'Lato', sans-serif",
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        <div style={{ borderTop: `2px solid #e0e0e0`, marginBottom: '40px' }} />

        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{
            color: theme.textDark,
            fontSize: '24px',
            fontWeight: '700',
            margin: '0 0 8px 0',
            fontFamily: "'Merriweather', serif",
          }}>
            A Day in Life in 2050
          </h2>
          <p style={{
            color: theme.textLight,
            fontSize: '14px',
            margin: '0 0 24px 0',
            maxWidth: '560px',
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: '1.6',
          }}>
            Respondents were asked to imagine they are living in 2050 and write a short free essay, story, or diary entry about a day in their life, focusing on how they cook or eat.
          </p>

          <div style={{ position: 'relative', display: 'inline-block', width: '100%', maxWidth: '420px' }}>
            <input
              type="text"
              placeholder="Search responses..."
              value={search}
              onChange={e => { setSearch(e.target.value); setExpanded(null); }}
              style={{
                padding: '10px 36px 10px 16px',
                borderRadius: '8px',
                border: `1px solid ${theme.accent}`,
                fontSize: '14px',
                color: theme.textDark,
                width: '100%',
                outline: 'none',
                fontFamily: "'Lato', sans-serif",
                boxSizing: 'border-box',
                backgroundColor: theme.white,
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.textLight,
                  fontSize: '16px',
                  lineHeight: 1,
                  padding: 0,
                }}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {loading && (
          <p style={{ textAlign: 'center', color: theme.textLight, padding: '40px 0' }}>
            Loading responses...
          </p>
        )}

        {!loading && filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: theme.textLight, padding: '40px 0' }}>
            {search ? 'No responses match your search.' : 'No responses collected yet.'}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filtered.map((item, i) => {
            const rawText = capitalizeStory(item.day_in_life_2050 || '');
            const isOpen  = expanded === i;
            const preview = rawText.slice(0, 280);
            const hasMore = rawText.length > 280;
            const date    = formatDatePretty(item.createdAt);
            const score   = tinderScores[item.Index];
            const hasLove = score && (score.likes > 0 || score.superlikes > 0);

            return (
              <div
                key={i}
                style={{
                  backgroundColor: theme.white,
                  borderRadius: '12px',
                  boxShadow: theme.shadow,
                  border: '1px solid #eee',
                  padding: '20px 20px',
                  borderLeft: `4px solid ${theme.accent}`,
                  boxSizing: 'border-box',
                  width: '100%',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '12px',
                }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: theme.accent,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    flexShrink: 0,
                  }}>
                    #{i + 1}
                  </span>

                  {item.nationality && (
                    <span style={{
                      fontSize: '12px',
                      color: theme.textLight,
                      backgroundColor: theme.bgLight,
                      padding: '2px 10px',
                      borderRadius: '20px',
                      flexShrink: 0,
                    }}>
                      {item.nationality}
                    </span>
                  )}

                  {item.field_of_study && (
                    <span style={{
                      fontSize: '12px',
                      color: theme.textLight,
                      backgroundColor: theme.bgLight,
                      padding: '2px 10px',
                      borderRadius: '20px',
                      wordBreak: 'break-word',
                      maxWidth: '100%',
                    }}>
                      {item.field_of_study}
                    </span>
                  )}

                  {hasLove && (
                    <span
                      title="Likes and super likes received in the Food Futures swipe app"
                      style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#C84B31',
                        backgroundColor: 'rgba(200,75,49,0.08)',
                        padding: '2px 10px',
                        borderRadius: '20px',
                        flexShrink: 0,
                      }}
                    >
                      {score.likes > 0 && <>♥ {score.likes}</>}
                      {score.likes > 0 && score.superlikes > 0 && ' · '}
                      {score.superlikes > 0 && <>⭐ {score.superlikes}</>}
                    </span>
                  )}

                  <span style={{ flexGrow: 1 }} />

                  {date && (
                    <span style={{
                      fontSize: '12px',
                      color: theme.textLight,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <span style={{ opacity: 0.5 }}>📅</span> {date}
                    </span>
                  )}
                </div>

                <p style={{
                  fontSize: '14px',
                  color: theme.textDark,
                  lineHeight: '1.75',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  <HighlightedText
                    text={isOpen ? rawText : (hasMore ? preview : rawText)}
                    query={search}
                  />
                  {!isOpen && hasMore && (
                    <span style={{ color: theme.textLight }}>&hellip;</span>
                  )}
                </p>

                {hasMore && (
                  <button
                    onClick={() => setExpanded(isOpen ? null : i)}
                    style={{
                      marginTop: '10px',
                      background: 'none',
                      border: 'none',
                      color: theme.accent,
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: 0,
                      fontFamily: "'Lato', sans-serif",
                    }}
                  >
                    {isOpen ? 'Show less ▲' : 'Read more ▼'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {!loading && filtered.length > 0 && (
          <p style={{
            textAlign: 'center',
            color: theme.textLight,
            fontSize: '13px',
            marginTop: '32px',
          }}>
            Showing {filtered.length} of {responses.filter(r => r.day_in_life_2050).length} responses
          </p>
        )}
      </div>
    </div>
  );
}

// Dashboard

export default function VisionsDashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <SurveyDashboard
        surveyType="visions"
        pageTitle="Youth Visions of Food in 2050"
        surveyLink="/survey_food_visions_2050"
        pageDescription="Welcome! Here you can find imagined futures of food and cooking, written by young people from across Europe and beyond. Respondents were asked to speculate freely about a day in their life in 2050, how they might cook, eat, and relate to food, drawing on their own experiences, beliefs, and expectations. This visualisation is part of the European project RELISH, Reframing European Gastronomy Legacy through Innovation, Sustainability and Heritage (reference 101177427), funded under the Horizon Europe programme (HORIZON-CL2-2024-HERITAGE-01)."
        charts={charts}
      />
      <ResponsesList />
    </div>
  );
}