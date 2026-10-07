// Colours, helpers and layout pieces shared by the two data stories.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { storylog } from '../../eval/evalTelemetry';

export const C = {
  bg: '#FFF9F0', bgWarm: '#FFF0E1', bgSage: '#F0EBE0', bgTerra: '#F5E6D8', card: '#FFFFFF',
  coral: '#C84B31', coralSoft: 'rgba(200,75,49,0.10)', coralGlow: 'rgba(200,75,49,0.25)',
  herb: '#5A7A3A', herbSoft: 'rgba(90,122,58,0.10)',
  turmeric: '#C49A2A', turmericSoft: 'rgba(196,154,42,0.12)',
  berry: '#8E4162', blue: '#2E86AB',
  ink: '#3D2B1F',
  text: '#3D2B1F', textM: 'rgba(61,43,31,0.60)', textL: 'rgba(61,43,31,0.35)',
  font: "'Lato', sans-serif", fontTitle: "'Merriweather', serif",
};

export const GEO_NAME_MAP = {
  'United States of America': 'United States', 'Bosnia and Herz.': 'Bosnia and Herzegovina',
  'Macedonia': 'North Macedonia', 'Cabo Verde': 'Cape Verde', 'Dem. Rep. Congo': 'DR Congo',
  'Central African Rep.': 'Central African Republic', 'S. Sudan': 'South Sudan',
  'Côte d\'Ivoire': 'Ivory Coast', 'Dominican Rep.': 'Dominican Republic',
  'Eq. Guinea': 'Equatorial Guinea', 'eSwatini': 'Eswatini', 'Solomon Is.': 'Solomon Islands',
  'Czech Rep.': 'Czech Republic',
};
export function geoToSurvey(geoName) { return GEO_NAME_MAP[geoName] || geoName; }

export const COUNTRY_CENTROID = {
  Italy:[12.5,42.8], Spain:[-3.7,40.4], Portugal:[-8.0,39.5], France:[2.4,46.2],
  Germany:[10.4,51.1], Greece:[22.0,39.0], Turkey:[35.0,39.0], 'United Kingdom':[-2.5,54.5],
  Netherlands:[5.3,52.1], Belgium:[4.5,50.6], Austria:[14.6,47.5],
  Japan:[138,36], China:[104,35], India:[79,22], Thailand:[100,15], Korea:[128,36], Vietnam:[108,14],
  Mexico:[-102,23], Peru:[-75,-10], USA:[-97,38], Brazil:[-53,-10],
  Morocco:[-7,32], Lebanon:[35.8,33.9], 'Middle East':[44,32], 'North Africa':[8,30],
  Iran:[53,32], Syria:[38,35], Egypt:[30,26], Ethiopia:[40,9], Ukraine:[31,49],
  Poland:[19.1,51.9], Romania:[24.9,45.9], Hungary:[19.5,47.2], Croatia:[16.5,44.5],
  Bulgaria:[25.5,42.7], Denmark:[9.5,56.3], Sweden:[17.6,62.2], Finland:[25.7,64.0],
  Ireland:[-8.2,53.4], Norway:[10.2,61.5], Czechia:[15.5,49.8],
  'Central Asia':[68,42], 'Southeast Asia':[110,5], 'Sri Lanka':[80.8,7.9],
  Russia:[37.6,55.8], 'United States':[-97,38], Canada:[-106,56], Argentina:[-65,-35],
  Colombia:[-74,4], Chile:[-71,-30], Australia:[134,-25], 'New Zealand':[174,-41],
  'South Africa':[25,-29], Nigeria:[8,10], Kenya:[38,0], Algeria:[3,28],
  Tunisia:[9.5,34], Angola:[18,-12], 'Cape Verde':[-24,16], Mozambique:[35,-18],
  Indonesia:[120,-5], Philippines:[122,13], Malaysia:[102,4], Singapore:[103.8,1.35],
  Cambodia:[105,12.5], Pakistan:[70,30], Bangladesh:[90,24],
  'South Korea':[128,36], Taiwan:[121,23.5], Israel:[35,31.5],
  'United Arab Emirates':[54,24], 'Saudi Arabia':[45,24],
  Slovakia:[19.7,48.7], Slovenia:[14.8,46.1], Lithuania:[24,55.2],
  Latvia:[24.6,56.9], Estonia:[25.5,58.6], Serbia:[21,44],
  'Bosnia and Herzegovina':[17.8,43.9], 'North Macedonia':[21.7,41.5],
  Albania:[20,41], Montenegro:[19.3,42.7], Kosovo:[21,42.6],
  Luxembourg:[6.1,49.6], Malta:[14.4,35.9], Iceland:[-19,65], Cyprus:[33.4,35.1],
  Switzerland:[8.2,46.8],
};

export const DISH_ORIGINS = {
  'carbonara':   { origin:'Italy',     since:'1950s',     note:'Much younger than you think: a post-WW2 invention.' },
  'pasta':       { origin:'Italy',     since:'Ancient',   note:'Likely independent origins, not imported from China.' },
  'pizza':       { origin:'Italy',     since:'1700s',     note:'Naples, but its soul (the tomato) was domesticated in Mesoamerica.' },
  'lasagna':     { origin:'Italy',     since:'Medieval',  note:'The modern tomato layers are a post-1500s rewrite.' },
  'risotto':     { origin:'Italy',     since:'14th c.',   note:'Italian technique on rice brought by Arab traders.' },
  'tiramisu':    { origin:'Italy',     since:'1960s',     note:'Far younger than most "traditions".' },
  'ragu':        { origin:'Italy',     since:'19th c.',   note:'Bolognese ragù was written down only around 1891.' },
  'bolognese':   { origin:'Italy',     since:'19th c.',   note:'The world\'s favourite "tradition" is a recent codification.' },
  'paella':      { origin:'Spain',     since:'19th c.',   note:'Valencia, with rice introduced by Muslim farmers.' },
  'tortilla':    { origin:'Spain',     since:'18th c.',   note:'It depends on the potato, which is from Peru.' },
  'gazpacho':    { origin:'Spain',     since:'16th c.',   note:'It needed the Mesoamerican tomato to become the cold soup we know.' },
  'jamon':       { origin:'Spain',     since:'Ancient',   note:'One of the oldest foods on this list.' },
  'bacalhau':    { origin:'Portugal',  since:'15th c.',   note:'A Portuguese obsession: caught off Norway and Newfoundland.' },
  'francesinha': { origin:'Portugal',  since:'1950s',     note:'Post-war Porto, inspired by the French croque-monsieur.' },
  'cozido':      { origin:'Portugal',  since:'18th c.',   note:'Its modern form requires potatoes from Peru.' },
  'pastel de nata':{ origin:'Portugal',since:'18th c.',   note:'Created by monks in Belém, Lisbon.' },
  'arroz de pato':{ origin:'Portugal', since:'19th c.',   note:'Portuguese, but rice itself arrived via North Africa.' },
  'croissant':   { origin:'Austria',   since:'1683',      note:'Invented in Vienna, not Paris.' },
  'schnitzel':   { origin:'Austria',   since:'19th c.',   note:'The Milanese cotoletta travelled north to Vienna.' },
  'moussaka':    { origin:'Greece',    since:'1920s',     note:'The béchamel layer was added by a French-trained chef in 1920.' },
  'gyros':       { origin:'Greece',    since:'1920s',     note:'A descendant of Ottoman kebab traditions.' },
  'souvlaki':    { origin:'Greece',    since:'Ancient',   note:'One of Europe\'s oldest continuously cooked dishes.' },
  'fish and chips':{ origin:'United Kingdom', since:'1860s', note:'Fried fish arrived with Sephardic Jewish exiles from Iberia.' },
  'couscous':    { origin:'North Africa', since:'Ancient', note:'Berber origin: Morocco, Algeria, Tunisia.' },
  'kebab':       { origin:'Turkey',    since:'Medieval',  note:'Ottoman kitchens, spread across Europe with the empire.' },
  'doner':       { origin:'Turkey',    since:'1970s',     note:'The modern vertical rotisserie was popularised in Berlin.' },
  'hummus':      { origin:'Middle East', since:'13th c.', note:'Levantine: Lebanon, Syria and Palestine all claim it.' },
  'falafel':     { origin:'Middle East', since:'Ancient', note:'Disputed between Egypt, Israel and Lebanon.' },
  'sushi':       { origin:'Japan',     since:'8th c.',    note:'It began as a way of preserving fish in fermented rice.' },
  'ramen':       { origin:'Japan',     since:'1900s',     note:'A Japanese reinvention of Chinese noodle soup.' },
  'curry':       { origin:'India',     since:'Ancient',   note:'The word "curry" is a British export: Indian cuisine never used it.' },
  'pad thai':    { origin:'Thailand',  since:'1940s',     note:'Invented as part of a nation-building campaign.' },
  'taco':        { origin:'Mexico',    since:'Ancient',   note:'Corn-based and pre-Columbian.' },
  'hamburger':   { origin:'Germany',   since:'19th c.',   note:'The Hamburg steak, reimagined as an American sandwich.' },
  'tomato':      { origin:'Mexico',    since:'16th c.',   note:'Before 1500, Europe had never seen a tomato.' },
  'potato':      { origin:'Peru',      since:'16th c.',   note:'Andean: it only reached European plates in the 1700s.' },
  'chocolate':   { origin:'Mexico',    since:'16th c.',   note:'An Aztec bitter drink, sweetened in Europe.' },
  'coffee':      { origin:'Ethiopia',  since:'15th c.',   note:'Discovered in Ethiopia, popularised via Yemen.' },
  'rice':        { origin:'China',     since:'Ancient',   note:'East Asian domestication; it reached Europe via the Arab world.' },
  'chili':       { origin:'Mexico',    since:'16th c.',   note:'All the heat on Earth traces back to the Americas.' },
  'paprika':     { origin:'Mexico',    since:'16th c.',   note:'Hungary\'s national spice has an American passport.' },
  'corn':        { origin:'Mexico',    since:'Ancient',   note:'Maize was domesticated 9,000 years ago in Mexico.' },
  'olive oil':   { origin:'Middle East', since:'Ancient', note:'Born in the eastern Mediterranean basin.' },
  'garlic':      { origin:'Central Asia', since:'Ancient', note:'Native to Central Asia, adopted everywhere.' },
  'onion':       { origin:'Central Asia', since:'Ancient', note:'One of the oldest cultivated vegetables.' },
  'wheat':       { origin:'Middle East', since:'Ancient', note:'The Fertile Crescent, more than 10,000 years ago.' },
  'sugar':       { origin:'India',     since:'Ancient',   note:'From the Indian subcontinent, via Arab traders.' },
  'cinnamon':    { origin:'Sri Lanka', since:'Ancient',   note:'Sri Lankan bark, among the oldest traded spices.' },
  'pepper':      { origin:'India',     since:'Ancient',   note:'Kerala: once worth its weight in gold.' },
  'banana':      { origin:'Southeast Asia', since:'Ancient', note:'Domesticated around Papua New Guinea.' },
  'lemon':       { origin:'India',     since:'Ancient',   note:'It originated in northeastern India and Myanmar.' },
  'orange':      { origin:'China',     since:'Ancient',   note:'Chinese origin, carried west by Arab traders.' },
};

export const normDish = (s) => s.toLowerCase().trim().replace(/[^a-zà-ú\s]/g, '').replace(/\s+/g, ' ').trim();

export const lookupOrigin = (rawName) => {
  const n = normDish(rawName);
  if (!n) return null;
  if (DISH_ORIGINS[n]) return DISH_ORIGINS[n];
  for (const key of Object.keys(DISH_ORIGINS)) {
    if (n.includes(key) || key.includes(n)) return DISH_ORIGINS[key];
  }
  return null;
};

export const splitMulti = v => {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean);
  const s = String(v).trim();
  if (s[0] === '[') { try { const p = JSON.parse(s); if (Array.isArray(p)) return p.map(x => String(x).trim()).filter(Boolean); } catch(_){} }
  return s.split(',').map(x => x.trim()).filter(Boolean);
};

export const valStr = v => (v && typeof v === 'object' && !Array.isArray(v)) ? '' : String(v || '').trim();

export const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

// Hooks

export function useIsMobile(breakpoint = 920) {
  const [mobile, setMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < breakpoint : false);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < breakpoint);
    // orientationchange too: some mobile browsers rotate without a reliable resize
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('orientationchange', onResize); };
  }, [breakpoint]);
  return mobile;
}

export function useIsPortrait() {
  const get = () => (typeof window !== 'undefined' ? window.innerHeight >= window.innerWidth : false);
  const [portrait, setPortrait] = useState(get);
  useEffect(() => {
    const on = () => setPortrait(window.innerHeight >= window.innerWidth);
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => { window.removeEventListener('resize', on); window.removeEventListener('orientationchange', on); };
  }, []);
  return portrait;
}

export function useStoryZoom() {
  const calc = () => (typeof window !== 'undefined'
    ? Math.min(Math.max(window.innerWidth / 1680, 1), 1.5) : 1);
  const [zoom, setZoom] = useState(calc);
  useEffect(() => {
    const onResize = () => setZoom(calc());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('orientationchange', onResize); };
  }, []);
  return zoom;
}

// A vh length that stays true to the real viewport under the story zoom.
export const zvh = n => `calc(${n}vh / var(--s3z, 1))`;

export function useOnScreen(options = { threshold: 0.35 }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setSeen(true); });
    }, options);
    obs.observe(el);
    return () => obs.disconnect();
  }, [seen]); // eslint-disable-line react-hooks/exhaustive-deps
  return [ref, seen];
}

// Tooltip & overlay

export function Tip({ mx, my, children }) {
  const flip = typeof window !== 'undefined' && mx > window.innerWidth - 300;
  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed', left: flip ? undefined : mx + 14, right: flip ? (window.innerWidth - mx + 14) : undefined,
      top: my - 10,
      background: 'rgba(61,43,31,0.94)', color: '#fff', borderRadius: 12,
      padding: '10px 16px', fontFamily: C.font, fontSize: 13,
      pointerEvents: 'none', zIndex: 9999, maxWidth: 270,
      boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
    }}>
      {children}
    </div>,
    document.body
  );
}

export function FullscreenOverlay({ onClose, children }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(255,249,240,0.97)', zIndex: 9998, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <button onClick={onClose}
        style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, background: 'rgba(61,43,31,0.8)', color: '#fff',
          border: 'none', borderRadius: 10, width: 38, height: 38, cursor: 'pointer', fontSize: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
        ✕
      </button>
      <div style={{ width: '95vw', maxHeight: '92vh' }}>
        {children}
      </div>
    </div>,
    document.body
  );
}

// Mobile rotate / "better on desktop" notice (portrait phones only)

export function StoryRotateNotice() {
  const isMobile = useIsMobile();
  const portrait = useIsPortrait();
  const [dismissed, setDismissed] = useState(false);
  if (!isMobile || !portrait || dismissed) return null;
  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', left: 12, right: 12, bottom: 'calc(12px + env(safe-area-inset-bottom))',
      zIndex: 9997, background: 'rgba(61,43,31,0.95)', color: '#fff', borderRadius: 16,
      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
      fontFamily: C.font, boxShadow: '0 8px 30px rgba(0,0,0,0.3)', animation: 's3fadein 0.5s ease both' }}>
      <span style={{ fontSize: 24, flexShrink: 0 }}>📱</span>
      <span style={{ fontSize: 13, lineHeight: 1.5, flex: 1 }}>
        Best enjoyed on a computer. On your phone it works right here in portrait, or turn it sideways
        for a wider side-by-side view.
      </span>
      <button onClick={() => setDismissed(true)} aria-label="Dismiss"
        style={{ background: 'rgba(255,255,255,0.14)', color: '#fff', border: 'none', borderRadius: 10,
          width: 32, height: 32, cursor: 'pointer', fontSize: 15, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        ✕
      </button>
    </div>,
    document.body
  );
}

// Animated number (counts up the first time it scrolls into view)

export function AnimatedNumber({ value, duration = 1400, decimals = 0, suffix = '', prefix = '', style }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf, t0 = null, poll = null, started = false;
    const animate = () => {
      const tick = t => {
        if (t0 === null) t0 = t;
        const p = Math.min((t - t0) / duration, 1);
        setDisplay(value * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const inView = () => {
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < (window.innerHeight || 0) * 0.95;
    };
    const cleanup = () => {
      window.removeEventListener('scroll', onScroll);
      if (poll) { clearInterval(poll); poll = null; }
    };
    const start = () => { if (started) return; started = true; cleanup(); animate(); };
    function onScroll() { if (inView()) start(); }
    if (inView()) start();
    else {
      window.addEventListener('scroll', onScroll, { passive: true });
      poll = setInterval(onScroll, 300); // safety net where scroll events are throttled/zoomed
    }
    return () => { cancelAnimationFrame(raf); cleanup(); };
  }, [value, duration]);
  return <span ref={ref} style={style}>{prefix}{display.toFixed(decimals)}{suffix}</span>;
}

function MobileFitStage({ refWidth = 720, children }) {
  const boxRef = useRef(null);
  const stageRef = useRef(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const box = boxRef.current, stage = stageRef.current;
    if (!box || !stage) return;
    const fit = () => {
      const bw = box.clientWidth, bh = box.clientHeight;
      const sw = stage.offsetWidth || refWidth, sh = stage.offsetHeight || 1;
      const s = Math.min(bw / sw, bh / sh);
      setScale(isFinite(s) && s > 0 ? Math.min(s, 1) : 1);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box); ro.observe(stage);
    window.addEventListener('resize', fit);
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  });
  return (
    <div ref={boxRef} style={{ width: '100%', height: '100%', display: 'flex',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div ref={stageRef} style={{ width: refWidth, flex: '0 0 auto',
        transform: `scale(${scale})`, transformOrigin: 'center center' }}>
        {children}
      </div>
    </div>
  );
}

function FitStage({ children }) {
  const boxRef = useRef(null);
  const stageRef = useRef(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const box = boxRef.current, stage = stageRef.current;
    if (!box || !stage) return undefined;
    const fit = () => {
      // offsetHeight is the untransformed layout height, so this can't feed back
      const bh = box.clientHeight, sh = stage.offsetHeight || 1;
      const s = bh / sh;
      setScale(isFinite(s) && s > 0 ? Math.min(s, 1) : 1);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box); ro.observe(stage);
    window.addEventListener('resize', fit);
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  });
  return (
    <div ref={boxRef} style={{ width: '100%', height: '100%', display: 'flex',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div ref={stageRef} style={{ width: '100%', transform: `scale(${scale})`,
        transformOrigin: 'center center' }}>
        {children}
      </div>
    </div>
  );
}

export function Scrolly({ steps, renderGraphic, side = 'left', graphicCol = '11fr 9fr', bg = 'transparent', stepVh = 92, lastStepVh }) {
  const isMobile = useIsMobile();
  const portrait = useIsPortrait();
  const [active, setActive] = useState(0);
  const [textOpen, setTextOpen] = useState(true);
  const stepRefs = useRef([]);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) setActive(Number(e.target.dataset.s3step));
      });
    }, { rootMargin: '-42% 0px -42% 0px', threshold: 0 });
    stepRefs.current.forEach(el => el && obs.observe(el));
    return () => obs.disconnect();
  }, [steps.length]);

  const stepsCol = (
    <div style={{ position: 'relative', zIndex: 2 }}>
      {steps.map((s, i) => (
        <div key={i} data-s3step={i} ref={el => { stepRefs.current[i] = el; }}
          style={{ minHeight: zvh(i === steps.length - 1 && lastStepVh ? lastStepVh : stepVh),
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: isMobile ? '0 14px' : '0 30px' }}>
          <div className={`s3-step-card ${i === active ? 'is-active' : ''}`}>{s}</div>
        </div>
      ))}
    </div>
  );

  const graphicBox = (
    <div style={{ position: 'sticky', top: 0, height: zvh(100), zIndex: 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px 28px', background: 'transparent', overflow: 'hidden' }}>
      <FitStage>{renderGraphic(active)}</FitStage>
    </div>
  );

  if (isMobile && portrait) {
    return (
      <div style={{ background: bg }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 3, height: '48dvh', background: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          padding: '8px 8px 4px', borderBottom: '1px solid rgba(61,43,31,0.08)',
          boxShadow: '0 6px 14px rgba(61,43,31,0.05)' }}>
          <MobileFitStage>{renderGraphic(active)}</MobileFitStage>
        </div>
        {stepsCol}
      </div>
    );
  }

  if (isMobile) {
    const mobToggle = (
      <button onClick={() => { setTextOpen(o => !o); requestAnimationFrame(() => window.dispatchEvent(new Event('resize'))); }}
        style={{ position: 'absolute', top: 10, right: 'max(10px, env(safe-area-inset-right))', zIndex: 6, background: C.coral, color: '#fff',
          border: 'none', borderRadius: 999, padding: '7px 14px', fontFamily: C.font, fontSize: 12.5,
          fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.18)' }}>
        {textOpen ? '⤢ Chart only' : '☰ Captions'}
      </button>
    );
    return (
      <div style={{ display: 'grid', background: bg, alignItems: 'start',
        gridTemplateColumns: textOpen ? '7fr 5fr' : '1fr 0px', transition: 'grid-template-columns 0.3s ease' }}>
        <div style={{ position: 'sticky', top: 0, height: '100dvh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', overflow: 'hidden', paddingTop: 8, paddingBottom: 0,
          paddingLeft: 'max(8px, env(safe-area-inset-left))', paddingRight: 'max(8px, env(safe-area-inset-right))' }}>
          {mobToggle}
          <MobileFitStage>{renderGraphic(active)}</MobileFitStage>
        </div>
        <div style={{ overflow: 'hidden', opacity: textOpen ? 1 : 0, transition: 'opacity 0.25s ease',
          paddingRight: 'env(safe-area-inset-right)' }}>
          {stepsCol}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: bg }}>
      <div style={{ display: 'grid',
        gridTemplateColumns: side === 'left' ? graphicCol : graphicCol.split(' ').reverse().join(' '),
        maxWidth: 1560, margin: '0 auto' }}>
        {side === 'left' ? <>{graphicBox}{stepsCol}</> : <>{stepsCol}{graphicBox}</>}
      </div>
    </div>
  );
}

// Chapter scaffolding

export function ChapterIntro({ id, num, act, title, lede, bg = C.bg, accent = C.coral }) {
  return (
    <div id={id} style={{ width: '100%', background: bg, padding: `${zvh(14)} 32px ${zvh(8)}`, textAlign: 'center' }}>
      <div className="s3-fade" style={{ display: 'inline-flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <span style={{ width: 44, height: 1, background: C.textL, display: 'inline-block' }} />
        <span style={{ fontFamily: C.font, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: C.textM }}>
          {act} · Chapter {num}
        </span>
        <span style={{ width: 44, height: 1, background: C.textL, display: 'inline-block' }} />
      </div>
      <h2 className="s3-fade" style={{ fontFamily: C.fontTitle, fontSize: 'clamp(30px, 4.6vw, 54px)',
        color: C.text, margin: '0 auto 18px', lineHeight: 1.18, maxWidth: 820 }}>
        {title(accent)}
      </h2>
      {lede && (
        <p className="s3-fade" style={{ fontFamily: C.font, fontSize: 'clamp(15px, 1.6vw, 18px)', color: C.textM,
          maxWidth: 640, margin: '0 auto', lineHeight: 1.8 }}>
          {lede}
        </p>
      )}
    </div>
  );
}

export function StepKicker({ children, accent = C.coral }) {
  return (
    <div style={{ fontFamily: C.font, fontSize: 10.5, fontWeight: 700, letterSpacing: 2.4,
      textTransform: 'uppercase', color: accent, marginBottom: 10 }}>
      {children}
    </div>
  );
}

export function StepTitle({ children }) {
  return (
    <div style={{ fontFamily: C.fontTitle, fontSize: 'clamp(19px, 1.9vw, 24px)', fontWeight: 700,
      color: C.text, lineHeight: 1.35, marginBottom: 10 }}>
      {children}
    </div>
  );
}

export function StepBody({ children }) {
  return (
    <div style={{ fontFamily: C.font, fontSize: 14.5, color: C.textM, lineHeight: 1.75 }}>
      {children}
    </div>
  );
}

export function StepHint({ children }) {
  return (
    <div style={{ marginTop: 14, padding: '9px 13px', borderRadius: 10, background: C.turmericSoft,
      fontFamily: C.font, fontSize: 12.5, color: C.text, lineHeight: 1.5, display: 'flex', gap: 8 }}>
      <span aria-hidden="true">✦</span>
      <span>{children}</span>
    </div>
  );
}

// Progress system: top bar + chapter rail (visual structuring + navigation)

export function ProgressSystem({ chapters }) {
  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState(null);
  const isMobile = useIsMobile(1100);
  // Reading telemetry (?eval=1 only): dwell time per chapter, using the same
  // "which chapter is active" boundary computed below for the rail highlight.
  const dwellRef = useRef({ id: null, since: null });

  useEffect(() => {
    let raf = null;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const h = document.documentElement;
        const denom = h.scrollHeight - h.clientHeight;
        setProgress(denom > 0 ? h.scrollTop / denom : 0);
        let current = null;
        chapters.forEach(c => {
          const el = document.getElementById(c.id);
          if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.55) current = c.id;
        });
        setActiveId(current);
        const d = dwellRef.current;
        if (current !== d.id) {
          if (d.id != null) storylog('phase_dwell', { phase: d.id, ms: Date.now() - d.since });
          dwellRef.current = { id: current, since: Date.now() };
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    const onHide = () => {
      const d = dwellRef.current;
      if (d.id != null) storylog('phase_dwell', { phase: d.id, ms: Date.now() - d.since });
      dwellRef.current = { id: null, since: null };
    };
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', onHide);
      if (raf) cancelAnimationFrame(raf);
      onHide();
    };
  }, [chapters]);

  const jump = id => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: 4, zIndex: 9000,
        background: 'rgba(61,43,31,0.07)' }}>
        <div style={{ height: '100%', width: '100%',
          background: `linear-gradient(90deg, ${C.coral}, ${C.turmeric}, ${C.herb})`,
          transform: `scaleX(${progress})`, transformOrigin: '0 50%', transition: 'transform 0.1s linear' }} />
      </div>
      {!isMobile && (
        <nav aria-label="Chapters" style={{ position: 'fixed', right: 16, top: '50%', transform: 'translateY(-50%)',
          zIndex: 9000, display: 'flex', flexDirection: 'column', gap: 9, alignItems: 'flex-end' }}>
          {chapters.map(ch => {
            const isActive = activeId === ch.id;
            return (
              <button key={ch.id} onClick={() => jump(ch.id)} className="s3-rail-dot"
                aria-label={ch.label}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
                  cursor: 'pointer', padding: 2 }}>
                <span className="s3-rail-label" style={{
                  fontFamily: C.font, fontSize: 10.5, fontWeight: 700, color: C.text,
                  background: 'rgba(255,249,240,0.92)', borderRadius: 7, padding: '3px 9px',
                  boxShadow: '0 1px 6px rgba(61,43,31,0.12)', whiteSpace: 'nowrap',
                  opacity: isActive ? 1 : 0, transition: 'opacity 0.2s',
                }}>
                  {ch.short || ch.label}
                </span>
                <span style={{ width: isActive ? 11 : 7, height: isActive ? 11 : 7, borderRadius: '50%',
                  background: isActive ? C.coral : 'rgba(61,43,31,0.22)',
                  border: isActive ? '2px solid rgba(200,75,49,0.3)' : 'none',
                  transition: 'all 0.25s', display: 'inline-block', flexShrink: 0 }} />
              </button>
            );
          })}
        </nav>
      )}
    </>
  );
}

// Guess-then-reveal slider (prediction boosts retention)

export function GuessSlider({ prompt, actual, accent = C.coral, onReveal, labelLow = '0%', labelHigh = '100%' }) {
  const [guess, setGuess] = useState(50);
  const [revealed, setRevealed] = useState(false);
  const diff = guess - actual;

  return (
    <div style={{ background: C.card, borderRadius: 20, padding: '26px 28px',
      boxShadow: '0 6px 30px rgba(61,43,31,0.08)', maxWidth: 620, margin: '0 auto' }}>
      <div style={{ fontFamily: C.font, fontSize: 11, fontWeight: 700, letterSpacing: 2,
        textTransform: 'uppercase', color: accent, marginBottom: 10 }}>
        Make a guess before you see the data
      </div>
      <div style={{ fontFamily: C.fontTitle, fontSize: 'clamp(16px, 1.8vw, 20px)', color: C.text,
        lineHeight: 1.5, marginBottom: 24 }}>
        {prompt}
      </div>

      <div style={{ position: 'relative', padding: '26px 0 6px' }}>
        {/* Guess bubble */}
        <div style={{ position: 'absolute', top: -6, left: `calc(${guess}% - 24px)`, width: 48,
          textAlign: 'center', fontFamily: C.fontTitle, fontSize: 21, fontWeight: 700,
          color: revealed ? C.textL : accent, transition: 'color 0.4s' }}>
          {guess}%
        </div>
        <input type="range" min={0} max={100} value={guess} disabled={revealed}
          onChange={e => setGuess(Number(e.target.value))}
          className="s3-range" aria-label="Your guess"
          style={{ width: '100%', accentColor: accent }} />
        {/* Actual marker after reveal */}
        <div style={{ position: 'absolute', bottom: 24, left: `calc(${revealed ? actual : guess}% - 1px)`,
          width: 3, height: 26, background: C.herb, borderRadius: 2,
          opacity: revealed ? 1 : 0, transition: 'left 1.1s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s' }} />
        <div style={{ position: 'absolute', bottom: 50, left: `calc(${revealed ? actual : guess}% - 30px)`, width: 60,
          textAlign: 'center', fontFamily: C.fontTitle, fontSize: 20, fontWeight: 700, color: C.herb,
          opacity: revealed ? 1 : 0, transition: 'left 1.1s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.6s 0.5s' }}>
          {actual}%
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: C.font,
          fontSize: 11, color: C.textL, marginTop: 2 }}>
          <span>{labelLow}</span><span>{labelHigh}</span>
        </div>
      </div>

      {!revealed ? (
        <button onClick={() => { setRevealed(true); storylog('guess_reveal', { guess, actual }); onReveal && onReveal(guess); }}
          style={{ marginTop: 14, background: accent, color: '#fff', border: 'none', borderRadius: 12,
            padding: '11px 26px', fontFamily: C.font, fontSize: 14, fontWeight: 700, cursor: 'pointer',
            boxShadow: `0 4px 16px ${C.coralGlow}` }}>
          Lock in my guess →
        </button>
      ) : (
        <div style={{ marginTop: 14, fontFamily: C.font, fontSize: 13.5, color: C.textM, lineHeight: 1.6 }}>
          {Math.abs(diff) <= 3
            ? <><strong style={{ color: C.herb }}>Impressive, almost exactly right.</strong> The real number is <strong style={{ color: C.herb }}>{actual}%</strong>.</>
            : <>The real number is <strong style={{ color: C.herb }}>{actual}%</strong>: you guessed {Math.abs(diff)} points too {diff > 0 ? 'high' : 'low'}. {diff > 0 ? 'Tradition is more alive than you thought.' : 'The gap is wider than it looks from the outside.'}</>}
        </div>
      )}
    </div>
  );
}

export function RecapQuiz({ questions, accent = C.coral }) {
  const [answers, setAnswers] = useState({});
  const answeredCount = Object.keys(answers).length;
  const correctCount = Object.entries(answers).filter(([qi, ai]) => questions[qi].correct === ai).length;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {questions.map((q, qi) => {
        const picked = answers[qi];
        const isAnswered = picked !== undefined;
        return (
          <div key={qi} style={{ background: C.card, borderRadius: 18, padding: '20px 24px', marginBottom: 16,
            boxShadow: '0 4px 20px rgba(61,43,31,0.06)', textAlign: 'left' }}>
            <div style={{ fontFamily: C.font, fontSize: 11, fontWeight: 700, color: C.textL, marginBottom: 8 }}>
              QUESTION {qi + 1} OF {questions.length}
            </div>
            <div style={{ fontFamily: C.fontTitle, fontSize: 17, color: C.text, lineHeight: 1.45, marginBottom: 14 }}>
              {q.q}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {q.options.map((opt, oi) => {
                let bg = C.bg, color = C.text, border = '1.5px solid rgba(61,43,31,0.15)';
                if (isAnswered && oi === q.correct) { bg = C.herb; color = '#fff'; border = `1.5px solid ${C.herb}`; }
                else if (isAnswered && oi === picked) { bg = `${accent}22`; color = accent; border = `1.5px solid ${accent}`; }
                else if (isAnswered) { color = C.textL; }
                return (
                  <button key={oi} disabled={isAnswered}
                    onClick={() => { setAnswers(a => ({ ...a, [qi]: oi })); storylog('quiz_answer', { q: qi, picked: oi, option: String(questions[qi].options[oi]), correct: questions[qi].correct === oi }); }}
                    style={{ background: bg, color, border, borderRadius: 22, padding: '8px 18px',
                      fontFamily: C.font, fontSize: 13.5, fontWeight: 600, cursor: isAnswered ? 'default' : 'pointer',
                      transition: 'all 0.25s' }}>
                    {opt}
                  </button>
                );
              })}
            </div>
            {isAnswered && (
              <div style={{ marginTop: 12, fontFamily: C.font, fontSize: 13, color: C.textM, lineHeight: 1.6 }}>
                {picked === q.correct ? '✓ ' : ''}{q.explain}
              </div>
            )}
          </div>
        );
      })}
      {answeredCount === questions.length && (
        <div style={{ fontFamily: C.fontTitle, fontSize: 18, color: C.text, marginTop: 8 }}>
          You remembered <span style={{ color: accent, fontWeight: 700 }}>{correctCount} of {questions.length}</span>
          {correctCount === questions.length ? '. The story stuck. 🌿' : '. Scroll back any time; the chapters will wait.'}
        </div>
      )}
    </div>
  );
}

// five-pointed star path (used by the small decorative EU flag)
const starPath = (cx, cy, R) => {
  let p = '';
  for (let k = 0; k < 5; k++) {
    const oa = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
    const ia = oa + Math.PI / 5;
    p += `${k ? 'L' : 'M'}${(cx + R * Math.cos(oa)).toFixed(2)},${(cy + R * Math.sin(oa)).toFixed(2)}`
       + `L${(cx + R * 0.382 * Math.cos(ia)).toFixed(2)},${(cy + R * 0.382 * Math.sin(ia)).toFixed(2)}`;
  }
  return p + 'Z';
};

// scroll-in wrapper: fades + lifts children the first time they enter the viewport
export function Fade({ children, delay = 0, y = 18, style }) {
  const [ref, seen] = useOnScreen({ threshold: 0.18 });
  return (
    <div ref={ref} style={{
      opacity: seen ? 1 : 0, transform: seen ? 'none' : `translateY(${y}px)`,
      transition: `opacity 0.8s ease ${delay}ms, transform 0.8s cubic-bezier(.2,.8,.2,1) ${delay}ms`,
      ...style }}>
      {children}
    </div>
  );
}

export function Starfield() {
  const stars = useMemo(() => Array.from({ length: 110 }, () => ({
    x: +(Math.random() * 100).toFixed(2), y: +(Math.random() * 100).toFixed(2),
    r: +(Math.random() * 0.22 + 0.05).toFixed(3),
    dur: +(Math.random() * 3.4 + 2.2).toFixed(2), delay: +(Math.random() * 5).toFixed(2),
    o: +(Math.random() * 0.55 + 0.25).toFixed(2),
  })), []);
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFE3BE"
          style={{ '--o': s.o, animation: `fr-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite` }} />
      ))}
    </svg>
  );
}

export function LiveBadge({ n, bump, dark = true, label = 'RESPONSES', stacked = false }) {
  const dot = (
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5C39',
      animation: 'fr-live 1.9s ease-out infinite', flexShrink: 0 }} />
  );
  const frame = {
    background: dark ? 'rgba(255,246,234,0.07)' : C.card,
    border: `1px solid ${dark ? 'rgba(255,227,190,0.28)' : 'rgba(61,43,31,0.14)'}`,
    borderRadius: 999, fontFamily: C.font, fontSize: 11.5, fontWeight: 800,
    letterSpacing: 1.6, color: dark ? '#FFE3BE' : C.text,
    animation: bump ? 'fr-bump 0.6s ease' : 'none',
  };

  if (stacked) {
    return (
      <span style={{ ...frame, display: 'inline-flex', flexDirection: 'column',
        alignItems: 'center', gap: 3, padding: '10px 22px', lineHeight: 1.25 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
          {dot} LIVE
        </span>
        <span style={{ whiteSpace: 'nowrap' }}>{n} {label} SO FAR</span>
      </span>
    );
  }

  return (
    <span style={{ ...frame, display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
      padding: '7px 15px' }}>
      {dot} LIVE · {n} {label} SO FAR
    </span>
  );
}

export function EUFlag({ height = 36 }) {
  const stars = [];
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 6;
    stars.push(starPath(13.5 + 6 * Math.cos(a), 9 + 6 * Math.sin(a), 2));
  }
  return (
    <svg viewBox="0 0 27 18" height={height} aria-label="Flag of the European Union"
      style={{ borderRadius: 3, boxShadow: '0 2px 8px rgba(61,43,31,0.25)', flexShrink: 0 }}>
      <rect width="27" height="18" fill="#003399" />
      {stars.map((d, i) => <path key={i} d={d} fill="#FFCC00" />)}
    </svg>
  );
}

export function OfficialEUBadge({ height = 40 }) {
  return (
    <img src="/EN_FundedbytheEU_RGB_POS.png" alt="Funded by the European Union" height={height}
      style={{ height, width: 'auto', display: 'block', flexShrink: 0 }} />
  );
}

export function SectionHead({ kicker, title, lede, accent = C.coral }) {
  return (
    <Fade>
      <div style={{ textAlign: 'center', maxWidth: 780, margin: '0 auto', padding: '0 22px' }}>
        <div style={{ fontFamily: C.font, fontSize: 11.5, letterSpacing: 3.2, textTransform: 'uppercase',
          color: accent, fontWeight: 800 }}>{kicker}</div>
        <h2 style={{ fontFamily: C.fontTitle, fontSize: 'clamp(26px,3.8vw,42px)', color: C.ink,
          margin: '14px 0 0', lineHeight: 1.22 }}>{title}</h2>
        {lede && (
          <p style={{ fontFamily: C.font, fontSize: 'clamp(14.5px,1.5vw,16.5px)', color: C.textM,
            lineHeight: 1.75, maxWidth: 660, margin: '16px auto 0' }}>{lede}</p>
        )}
      </div>
    </Fade>
  );
}

export const nuggetStyle = {
  fontFamily: C.font, fontSize: 12.5, fontWeight: 600, color: C.text,
  background: C.card, border: '1px solid rgba(61,43,31,0.10)', borderRadius: 999,
  padding: '8px 15px', boxShadow: '0 3px 12px rgba(61,43,31,0.06)',
};
export const linkBtnStyle = {
  fontFamily: C.font, fontSize: 12.5, fontWeight: 700, color: C.coral, background: 'none',
  border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline',
  textUnderlineOffset: 3,
};
export const btnStyle = primary => ({
  fontFamily: C.font, fontSize: 14, fontWeight: 700, textDecoration: 'none', cursor: 'pointer',
  padding: '11px 21px', borderRadius: 999, transition: 'all 0.2s ease', display: 'inline-block',
  background: primary ? C.coral : 'transparent', color: primary ? '#fff' : C.coral,
  border: `1.5px solid ${primary ? C.coral : 'rgba(200,75,49,0.5)'}`,
  boxShadow: primary ? `0 8px 22px ${C.coralGlow}` : 'none',
});
