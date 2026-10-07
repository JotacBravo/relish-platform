import './App.css';
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import LegacyRedirect from './LegacyRedirect';
import LEGACY_ROUTES from './legacyRoutes.json';

// Each page is loaded on demand.
const SurveyComponent = lazy(() => import('./getsurvey/Survey'));
const YouthDashboard = lazy(() => import('./dashboards/YouthDashboard'));
const FuturesDashboard = lazy(() => import('./dashboards/FuturesDashboard'));
const VisionsDashboard = lazy(() => import('./dashboards/VisionsDashboard'));
const BorrowedPlate = lazy(() => import('./dashboards/story3'));
const FoodTinder = lazy(() => import('./dashboards/FoodTinder'));

export const PAGES = [
  { group: 'Data stories', path: '/the_borrowed_plate', label: 'The Borrowed Plate', element: <BorrowedPlate /> },
  { group: 'Data stories', path: '/food_visions_2050', label: 'Food Visions 2050', element: <FoodTinder /> },
  { group: 'Dashboards', path: '/dashboard_youth_food_culture', label: 'Youth food culture', element: <YouthDashboard title="Youth Dashboard" /> },
  { group: 'Dashboards', path: '/dashboard_future_perspectives', label: 'Future perspectives', element: <FuturesDashboard title="Futures Dashboard" /> },
  { group: 'Dashboards', path: '/dashboard_food_visions_2050', label: 'Food visions 2050', element: <VisionsDashboard title="Futures Narratives Dashboard" /> },
  { group: 'Surveys', path: '/survey_youth_food_culture', label: 'Youth food culture', element: <SurveyComponent /> },
  { group: 'Surveys', path: '/survey_future_perspectives', label: 'Future perspectives', element: <SurveyComponent /> },
  { group: 'Surveys', path: '/survey_food_visions_2050', label: 'Food visions 2050', element: <SurveyComponent /> },
];

// The Prolific variant of each survey (asks for the Prolific ID, returns the
// participant to Prolific with the completion code). Not linked from the start page.
const PROLIFIC_PATHS = ['/youth_survey_prolific', '/futures_survey_prolific', '/futures_narratives_prolific'];

const RouteFallback = () => (
  <div style={{ minHeight: '100vh', background: '#FFF9F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ fontSize: 38, animation: 'app-route-spin 1.6s linear infinite' }}>🍳</div>
    <style>{'@keyframes app-route-spin { to { transform: rotate(360deg); } }'}</style>
  </div>
);

// Start page: links to every survey, dashboard and story.
function Home() {
  const groups = [...new Set(PAGES.map(p => p.group))];
  return (
    <div style={{ padding: '48px 28px', fontFamily: "'Lato', sans-serif", color: '#3D2B1F' }}>
      <img src="/Relish_Logo_Master_01.png" alt="RELISH" style={{ height: 56 }} />
      <h1 style={{ fontFamily: "'Merriweather', serif", fontSize: 26, margin: '24px 0 8px' }}>RELISH surveys, dashboards and data stories</h1>
      <p style={{ lineHeight: 1.6, color: '#6B5B4F', margin: '0 0 28px' }}>
        This copy runs on generated demo data. It contains no real survey responses.
      </p>
      {groups.map(g => (
        <div key={g} style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: 15, textTransform: 'uppercase', letterSpacing: 1.5, color: '#C84B31', margin: '0 0 8px' }}>{g}</h2>
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
            {PAGES.filter(p => p.group === g).map(p => (
              <li key={p.path}><Link to={p.path} style={{ color: '#3D2B1F' }}>{p.label}</Link> <code style={{ color: '#9A8B7F', fontSize: 12 }}>{p.path}</code></li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

const NotFound = () => (
  <div style={{ padding: '48px 28px', fontFamily: "'Lato', sans-serif", color: '#3D2B1F' }}>
    <h1 style={{ fontFamily: "'Merriweather', serif", fontSize: 24 }}>Page not found</h1>
    <p><Link to="/" style={{ color: '#3D2B1F' }}>See all surveys, dashboards and stories</Link></p>
  </div>
);

// Fixed label on every page: this copy runs on demo data.
const DemoBadge = () => (
  <div style={{ position: 'fixed', left: 10, bottom: 10, zIndex: 100000, pointerEvents: 'none', width: 'auto',
    background: 'rgba(61,43,31,0.82)', color: '#fff', borderRadius: 6, padding: '3px 8px',
    fontFamily: "'Lato', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 0.6 }}>
    DEMO DATA
  </div>
);

function App() {
  return (
    <div className="App">
      <Router>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            {PAGES.map(p => <Route key={p.path} path={p.path} element={p.element} />)}
            {PROLIFIC_PATHS.map(path => <Route key={path} path={path} element={<SurveyComponent />} />)}
            {/* Old public addresses → the current ones, keeping ?query and #fragment
                (relish/server.js answers them with a 301 before the app loads) */}
            {Object.entries(LEGACY_ROUTES).map(([from, to]) => (
              <Route key={from} path={from} element={<LegacyRedirect to={to} />} />
            ))}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
      <DemoBadge />
    </div>
  );
}

export default App;
