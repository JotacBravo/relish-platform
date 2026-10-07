// The chapters of The Borrowed Plate.
import { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react';
import { storylog } from '../../eval/evalTelemetry';
import {
  C, Tip, Scrolly, StepKicker, StepTitle, StepBody, StepHint,
  GuessSlider, RecapQuiz, AnimatedNumber, useOnScreen, useIsMobile, zvh, cap, LiveBadge,
} from './shared';
import { clearlyAhead, compareCounts, compareOnScale, shareText, plural, MIN_GROUP } from '../claims';
import {
  StoryMap, PersonGlyph, WhyNotBars, BubbleSwarm, computeBubbleNodes, ThreeWaySummary,
  CuisineFlower, DualRadar, RadialRace, ChartLegend, FlowSankey, computeDominantPath,
  SANKEY_COLS, StickyNoteBoard, PLATFORM_META, PortionDuel, PortionExplorer, BigStat, ccoord,
  scatterInCountries,
} from './charts';

function Cite({ n }) {
  return (
    <sup title="Full reference in the source list at the end of the story"
      style={{ color: C.coral, fontWeight: 700, fontSize: '0.66em', marginLeft: 1, cursor: 'help' }}>
      [{n}]
    </sup>
  );
}

// Small helper: re-trigger draw-on animations after a crossfade remount.
function Reveal({ children }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(raf);
  }, []);
  return children(on);
}

// HERO

const HERO_ICONS = ['pizza.png', 'pasta.png', 'salad.png', 'soup.png', 'carbonara.png', 'rice.png', 'burger.png', 'burrito.png'];

export function HeroScene({ stats, chapters, userCountry, setUserCountry, countryOptions }) {
  const isMobile = useIsMobile();
  return (
    <div style={{ width: '100%', minHeight: zvh(100),
      background: `linear-gradient(170deg, ${C.bgTerra} 0%, ${C.bgWarm} 55%, ${C.bg} 100%)`,
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      padding: '70px 30px 50px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>

      {/* establishing shot: drifting dishes */}
      {!isMobile && HERO_ICONS.map((ic, i) => (
        <img key={ic} src={`/icons/dishes_v2/${ic}`} alt="" aria-hidden="true"
          onError={e => { e.target.style.display = 'none'; }}
          style={{ position: 'absolute', width: 72 + (i % 3) * 22, opacity: 0.14,
            left: `${(i * 13 + 4) % 92}%`, top: `${(i * 29 + 8) % 84}%`,
            filter: 'saturate(0.9)', borderRadius: '50%',
            animation: `s3drift ${7 + (i % 4)}s ease-in-out ${i * 0.7}s infinite alternate` }} />
      ))}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.07,
        backgroundImage: `radial-gradient(circle at 20% 50%, ${C.coral} 0%, transparent 50%), radial-gradient(circle at 80% 30%, ${C.turmeric} 0%, transparent 50%)` }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 880 }}>
        <div style={{ fontSize: 11, fontFamily: C.font, color: 'rgba(61,43,31,0.35)',
          letterSpacing: 3, textTransform: 'uppercase', marginBottom: 22 }}>
          RELISH · A scrollytelling data story
        </div>
        <h1 style={{ fontFamily: C.fontTitle, fontSize: 'clamp(38px, 6.5vw, 78px)',
          color: C.text, margin: '0 0 22px', lineHeight: 1.12 }}>
          The Borrowed<br /><span style={{ color: C.coral }}>Plate</span>
        </h1>
        <p style={{ fontFamily: C.font, fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(61,43,31,0.6)',
          maxWidth: 640, lineHeight: 1.75, margin: '0 auto 18px' }}>
          We asked <strong style={{ color: C.text }}>{plural(stats.n, 'person', 'people')}</strong>, most of them young adults living in Europe, born in{' '}
          <strong style={{ color: C.text }}>{plural(stats.countries, 'country', 'countries')}</strong>, about their relationship with
          food, their relationship with cooking, and what they consider to be their culinary identity: what,
          when, where, and why they eat and cook what they do. The results were, to say the least, surprising.
          Get ready to savor them...
        </p>
        <div style={{ fontFamily: C.font, fontSize: 12.5, color: C.textL, marginBottom: 16 }}>
          ⏱ ~10 min · interactive · best enjoyed slowly, like a good meal
        </div>
        <div style={{ marginBottom: 34 }}>
          <LiveBadge n={stats.n} dark={false} label="RESPONSES" stacked />
        </div>

        <p style={{ fontFamily: C.font, fontSize: 13.5, color: C.textM, maxWidth: 560,
          margin: '0 auto 14px', lineHeight: 1.6 }}>
          Do you think that by completing the survey, you could change the results shown in this story?
        </p>
        <div style={{ marginBottom: 30 }}>
          <a href="/survey_youth_food_culture" target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.coral,
              color: '#fff', fontFamily: C.font, fontSize: 14, fontWeight: 700, textDecoration: 'none',
              borderRadius: 999, padding: '11px 24px', boxShadow: `0 3px 14px ${C.coralGlow}`,
              transition: 'transform 0.18s, box-shadow 0.18s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${C.coralGlow}`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 3px 14px ${C.coralGlow}`; }}>
            Add your answer to find out&nbsp;→
          </a>
        </div>

        {/* personalisation: tailors later chapters to the reader */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center',
          background: 'rgba(255,255,255,0.65)', borderRadius: 16, padding: '12px 18px',
          boxShadow: '0 2px 14px rgba(61,43,31,0.07)', marginBottom: 36 }}>
          <span style={{ fontFamily: C.font, fontSize: 13.5, color: C.textM }}>
            Make it personal: where are you from?
          </span>
          <select value={userCountry} onChange={e => { setUserCountry(e.target.value); if (e.target.value) storylog('home_country', { country: e.target.value }); }}
            style={{ padding: '7px 30px 7px 14px', border: `1.5px solid ${userCountry ? C.coral : 'rgba(61,43,31,0.25)'}`,
              borderRadius: 10, fontFamily: C.font, fontSize: 13, fontWeight: 600, outline: 'none',
              background: C.card, color: userCountry ? C.coral : C.text, cursor: 'pointer', appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%233D2B1F' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}>
            <option value="">I'd rather just read</option>
            {countryOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {userCountry && (
            <span style={{ fontFamily: C.font, fontSize: 12, color: C.herb, fontWeight: 600 }}>
              ✓ {userCountry} will be highlighted in the visuals
            </span>
          )}
          <div style={{ flexBasis: '100%', fontFamily: C.font, fontSize: 11.5, color: C.textL,
            marginTop: 2, textAlign: 'center', lineHeight: 1.5 }}>
            This only highlights your country in the visuals as you read; it doesn’t filter or change the data.
          </div>
        </div>

        {/* table of contents — visual structuring + random access */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 720, margin: '0 auto' }}>
          {chapters.map((ch, i) => (
            <button key={ch.id}
              onClick={() => document.getElementById(ch.id)?.scrollIntoView({ behavior: 'smooth' })}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.55)',
                border: '1px solid rgba(61,43,31,0.12)', borderRadius: 20, padding: '6px 14px',
                fontFamily: C.font, fontSize: 12, color: C.textM, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = C.card; e.currentTarget.style.color = C.coral; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.55)'; e.currentTarget.style.color = C.textM; }}>
              <span style={{ fontWeight: 700, color: C.turmeric }}>{i + 1}</span> {ch.short || ch.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 46 }}>
          <div style={{ width: 1, height: 56, background: 'rgba(61,43,31,0.18)', margin: '0 auto',
            animation: 's3pulse 2s ease-in-out infinite' }} />
          <div style={{ fontFamily: C.font, fontSize: 12, color: 'rgba(61,43,31,0.3)', marginTop: 10 }}>
            Scroll to taste the data
          </div>
        </div>
      </div>
    </div>
  );
}

// CHAPTER 1 — BORROWED DISHES (sticky map scrolly)

const WORLD_VIEW = { center: [15, 30], scale: 1 };

function findDish(dishData, key) {
  return dishData.find(d => d.name.toLowerCase().includes(key)) || null;
}

function OriginsGraphic({ geoData, dishData, step, userCountry }) {
  const pizza = useMemo(() => findDish(dishData, 'pizza'), [dishData]);
  const fishchips = useMemo(() => findDish(dishData, 'fish and chips') || findDish(dishData, 'fish'), [dishData]);
  const [mapTip, setMapTip] = useState(null);

  // explore-mode state
  const [countryFilter, setCountryFilter] = useState('');
  const [selName, setSelName] = useState(null);
  const explore = step >= 4;

  useEffect(() => {
    if (explore && userCountry && dishData.some(d => d.claimedBy.has(userCountry))) {
      setCountryFilter(prev => prev === '' ? userCountry : prev);
    }
  }, [explore, userCountry, dishData]);

  const filteredDishes = useMemo(() => {
    if (!countryFilter) return dishData;
    return dishData.filter(d => d.claimedBy.has(countryFilter))
      .map(d => ({ ...d, count: d.claimedBy.get(countryFilter) }))
      .sort((a, b) => b.count - a.count);
  }, [dishData, countryFilter]);

  const selected = useMemo(() =>
    filteredDishes.find(d => d.name === selName) || filteredDishes[0] || null,
  [filteredDishes, selName]);

  const countriesWithDishes = useMemo(() => {
    const m = {};
    dishData.forEach(d => [...d.claimedBy.entries()].forEach(([cn, n]) => { m[cn] = (m[cn] || 0) + n; }));
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([cn]) => cn);
  }, [dishData]);

  const conf = useMemo(() => {
    const dishClaimArcs = (dish, color = C.herb, max = 8) => {
      if (!dish) return [];
      const originName = dish.origin.origin;
      if (!ccoord(originName)) return [];
      return [...dish.claimedBy.entries()]
        .sort((a, b) => b[1] - a[1]).slice(0, max)
        .filter(([cn]) => ccoord(cn) && cn !== originName)
        .map(([cn, n]) => ({ from: cn, to: originName, color: C.coral, endColor: color, n, label: cn, opacity: 0.6 }));
    };
    const fills = {};
    const dots = [];
    let arcs = [];
    let view = WORLD_VIEW;

    if (step === 0 && pizza) {
      view = { center: [9, 44], scale: 2.5 };
      fills['Italy'] = { fill: `${C.coral}66`, stroke: C.coral, sw: 1 };
      [...pizza.claimedBy.keys()].forEach(cn => { if (cn !== 'Italy') fills[cn] = { fill: `${C.herb}45`, stroke: C.herb, sw: 0.7 }; });
      arcs = dishClaimArcs(pizza);
      dots.push({ at: 'Italy', color: C.coral, r: 5, pulse: true, label: 'Naples, 1700s', labelBelow: true });
    } else if (step === 1) {
      view = { center: [-32, 30], scale: 1.25 };
      fills['Mexico'] = { fill: `${C.coral}66`, stroke: C.coral, sw: 1 };
      fills['Italy'] = { fill: `${C.herb}50`, stroke: C.herb, sw: 0.8 };
      arcs = [{ from: 'Italy', to: 'Mexico', color: C.coral, width: 2.2, opacity: 0.85 }];
      dots.push({ at: 'Mexico', color: C.coral, r: 6, pulse: true, label: 'The tomato · Mesoamerica, 16th c.' });
      dots.push({ at: 'Italy', color: C.herb, r: 5, label: 'Italy', labelBelow: true });
    } else if (step === 2) {
      view = { center: [-6, 48], scale: 2.6 };
      fills['United Kingdom'] = { fill: `${C.herb}50`, stroke: C.herb, sw: 0.8 };
      fills['Portugal'] = { fill: `${C.coral}66`, stroke: C.coral, sw: 1 };
      arcs = [{ from: 'United Kingdom', to: 'Portugal', color: C.coral, width: 2, opacity: 0.85 }];
      if (fishchips) arcs.push(...dishClaimArcs(fishchips, C.herb, 4).map(a => ({ ...a, opacity: 0.3 })));
      dots.push({ at: 'Portugal', color: C.coral, r: 5, pulse: true, label: 'Fried fish, 16th c.' });
      dots.push({ at: 'United Kingdom', color: C.herb, r: 5, label: '“National dish”, 1860s' });
    } else if (step === 3) {
      view = { center: [-1, 37], scale: 2.5 };
      fills['Morocco'] = { fill: `${C.coral}66`, stroke: C.coral, sw: 1 };
      fills['Spain'] = { fill: `${C.herb}50`, stroke: C.herb, sw: 0.8 };
      arcs = [{ from: 'Spain', to: 'Morocco', color: C.coral, width: 2.2, opacity: 0.85 }];
      dots.push({ at: 'Morocco', color: C.coral, r: 5, pulse: true, label: 'Rice, via Al-Andalus' });
      dots.push({ at: 'Spain', color: C.herb, r: 5, label: 'Valencia, rice paddies', labelBelow: true });
    } else if (step >= 4 && selected) {
      view = WORLD_VIEW;
      const originName = selected.origin.origin;
      if (ccoord(originName)) fills[originName] = { fill: `${C.coral}70`, stroke: C.coral, sw: 1 };
      [...selected.claimedBy.keys()].forEach(cn => {
        if (cn !== originName) fills[cn] = { fill: `${C.herb}45`, stroke: C.herb, sw: 0.7 };
      });
      const entries = countryFilter
        ? [[countryFilter, selected.claimedBy.get(countryFilter) || 0]]
        : [...selected.claimedBy.entries()];
      arcs = entries.filter(([cn]) => ccoord(cn) && ccoord(originName) && cn !== originName)
        .map(([cn, n]) => ({ from: cn, to: originName, color: C.coral, n, label: cn, opacity: 0.6 }));
      dots.push({ at: originName, color: C.coral, r: 6, pulse: true, label: originName, labelBelow: true });
    }
    return { fills, arcs, dots, view };
  }, [step, pizza, fishchips, selected, countryFilter]);

  const handleHover = (name, e) => {
    if (!explore || !selected) return;
    const isOrigin = name === selected.origin.origin;
    const claims = selected.claimedBy.get(name);
    if (!isOrigin && !claims) { setMapTip(null); return; }
    setMapTip({ name, isOrigin, claims, mx: e.clientX, my: e.clientY });
  };

  return (
    <div>
      <div style={{ background: C.card, borderRadius: 16, padding: 12, boxShadow: '0 4px 24px rgba(61,43,31,0.08)' }}>
        <StoryMap geoData={geoData} view={conf.view} fills={conf.fills} arcs={conf.arcs}
          dots={conf.dots} stepKey={`${step}-${selected?.name}-${countryFilter}`}
          onCountryHover={explore ? handleHover : undefined}
          onCountryLeave={() => setMapTip(null)} />
      </div>

      {/* legend */}
      <div style={{ display: 'flex', gap: 18, marginTop: 8, fontSize: 11.5, fontFamily: C.font,
        color: C.textM, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: C.coral, marginRight: 5, verticalAlign: 'middle' }} />Where it came from</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: C.herb, marginRight: 5, verticalAlign: 'middle' }} />Who claims it today</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ color: C.coral, fontWeight: 800, fontSize: 14 }}>●→</span>
          each thread runs from who claims it back to where it came from
        </span>
      </div>
      <div style={{ marginTop: 5, textAlign: 'center', fontFamily: C.font, fontSize: 10.5, color: C.textL }}>
        Claims are numbered <span style={{ color: C.coral, fontWeight: 700 }}>[1–3]</span>; the full source list is at the end of the story.
      </div>

      {/* explore controls */}
      {explore && (
        <div style={{ marginTop: 10, animation: 's3fadein 0.6s ease both' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <select value={countryFilter}
              onChange={e => { setCountryFilter(e.target.value); setSelName(null); if (e.target.value) storylog('origins_country', { country: e.target.value }); }}
              style={{ flex: '0 0 200px', padding: '8px 28px 8px 12px', border: `1px solid rgba(61,43,31,0.2)`,
                borderRadius: 10, fontFamily: C.font, fontSize: 12.5, outline: 'none', background: C.card,
                color: C.text, cursor: 'pointer', appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%233D2B1F' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}>
              <option value="">All countries</option>
              {countriesWithDishes.map(cn => <option key={cn} value={cn}>{cn}</option>)}
            </select>
            {selected && (
              <div style={{ fontFamily: C.font, fontSize: 11.5, color: C.textM, lineHeight: 1.4 }}>
                <strong style={{ color: C.coral }}>{cap(selected.name)}</strong>: {selected.origin.origin}, {selected.origin.since}.{' '}
                <em>{selected.origin.note}</em>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxHeight: 92, overflowY: 'auto', paddingRight: 4 }}>
            {filteredDishes.map(d => {
              const isSel = selected?.name === d.name;
              return (
                <button key={d.name} onClick={() => { setSelName(d.name); storylog('origins_dish', { dish: cap(d.name) }); }}
                  style={{ border: 'none', borderRadius: 16, padding: '5px 12px', cursor: 'pointer',
                    background: isSel ? C.coral : C.card, color: isSel ? '#fff' : C.text,
                    fontFamily: C.font, fontSize: 11.5, fontWeight: 600,
                    boxShadow: isSel ? `0 2px 10px ${C.coralGlow}` : '0 1px 4px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s' }}>
                  {cap(d.name)} <span style={{ opacity: 0.65, fontSize: 10 }}>{d.count}×</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mapTip && selected && (
        <Tip mx={mapTip.mx} my={mapTip.my}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{mapTip.name}</div>
          {mapTip.isOrigin ? (
            <>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Birthplace of <strong style={{ color: '#ff9b85' }}>{cap(selected.name)}</strong> · {selected.origin.since}</div>
              <div style={{ fontStyle: 'italic', fontSize: 12, marginTop: 4, lineHeight: 1.45 }}>“{selected.origin.note}”</div>
            </>
          ) : (
            <div style={{ fontSize: 12 }}>
              <span style={{ color: '#8fcf6a', fontWeight: 700, fontSize: 16 }}>{mapTip.claims}</span>
              <span style={{ opacity: 0.75 }}> respondents here named </span>
              <strong style={{ color: '#ff9b85' }}>{cap(selected.name)}</strong>
              <span style={{ opacity: 0.75 }}> as one of “their” dishes</span>
            </div>
          )}
        </Tip>
      )}
    </div>
  );
}

// "Pizza tops the list" only while it clearly does (claims.js margin rule).
function pizzaRankSentence(dishData) {
  const pizza = dishData.find(d => /pizza/i.test(d.name));
  const [first, second] = dishData;
  if (!pizza) return 'Pizza is on the list.';
  if (first === pizza) {
    return !second || clearlyAhead(pizza.count, second.count)
      ? `Pizza tops the list, named ${pizza.count} times.`
      : `Pizza shares the top of the list with ${second.name.toLowerCase()}: ${pizza.count} and ${second.count} mentions.`;
  }
  return `Pizza is named ${pizza.count} times; ${first.name.toLowerCase()} leads the list with ${first.count}.`;
}

export function OriginsScene({ geoData, dishData, userCountry }) {
  const steps = [
    <div key={0}>
      <StepKicker>Exhibit A</StepKicker>
      <StepTitle>Start with an icon: pizza.</StepTitle>
      <StepBody>
        We asked our respondents which dishes feel personally iconic to them, from their own culture or
        upbringing. {pizzaRankSentence(dishData)}{' '}
        Fair enough: Naples shaped it in the 1700s.<Cite n={1} /> The green threads show every country that claims it today.
      </StepBody>
    </div>,
    <div key={1}>
      <StepKicker>But where did it really come from?</StepKicker>
      <StepTitle>Pizza's defining ingredient is Mesoamerican.</StepTitle>
      <StepBody>
        Before 1500, no tomato had ever touched European soil. The fruit that defines pizza, pasta al pomodoro
        and gazpacho was domesticated in Mesoamerica and crossed the Atlantic in the 16th century, then took
        two centuries to be trusted, having been suspected of being poisonous. Italy's red heart is an American immigrant.<Cite n={1} />
      </StepBody>
    </div>,
    <div key={2}>
      <StepKicker>Exhibit B</StepKicker>
      <StepTitle>Fish &amp; chips: Britain's national dish, fried by exiles.</StepTitle>
      <StepBody>
        The technique of frying fish in batter arrived in London with Sephardic Jewish families fleeing the
        Iberian Inquisition in the 16th century.<Cite n={2} /> Three hundred years later (and in Ireland by way of
        Italian settlers), Britain and Ireland wrapped them in newspaper, and they have become a much-loved
        heritage dish. Every cuisine absorbs ideas from somewhere else, then makes them its own.
      </StepBody>
    </div>,
    <div key={3}>
      <StepKicker>Exhibit C</StepKicker>
      <StepTitle>Paella is Spanish to the grain, but the grain came by sea.</StepTitle>
      <StepBody>
        Valencia made paella its own, yet its foundation, rice, is not native to Iberia. The Muslim farmers of
        Al-Andalus planted the first paddies in the wetlands south of Valencia over a thousand years ago,
        carrying a crop first domesticated in Asia.<Cite n={3} /> Spain's most iconic dish rests on an ingredient that
        arrived as an immigrant, then stayed to become the main course.
      </StepBody>
    </div>,
    <div key={4}>
      <StepKicker>Zoom out</StepKicker>
      <StepTitle>Trace every dish and the map becomes a web.</StepTitle>
      <StepBody>
        The {dishData.length} dishes our respondents named most as personally iconic tell one story together:
        cuisines have been crossing borders for centuries, long before anyone thought to map them. There is
        no pure national cuisine, only a shared, evolving conversation about what to eat.
      </StepBody>
      <StepHint>The map is now yours: pick any dish below it{userCountry ? `, or keep the ${userCountry} filter` : ' or filter by country'}, and follow the thread back to its source.</StepHint>
    </div>,
    <div key={5}>
      <StepKicker>Keep exploring</StepKicker>
      <StepTitle>Find a dish with a journey you didn't expect.</StepTitle>
      <StepBody>
        Hover the highlighted countries for details. When you're done playing cartographer, scroll on,
        because there's a more practical question waiting: do young people even <em>eat</em> these
        dishes any more?
      </StepBody>
    </div>,
  ];

  return (
    <Scrolly steps={steps} side="left" graphicCol="13fr 7fr" bg={C.bg} lastStepVh={110}
      renderGraphic={step => (
        <OriginsGraphic geoData={geoData} dishData={dishData} step={step} userCountry={userCountry} />
      )} />
  );
}

// CHAPTER 2 — THE REALITY CHECK (guess → reveal → why)

const WHY_NOT_SHORT = {
  'I prefer other types of food': 'Prefer other food',
  'They take too long to prepare': 'Too long to prepare',
  'I don\'t know how to prepare them': 'Don\'t know how',
  'No one cooks them for me': 'No one cooks them',
  'I can\'t find the ingredients': 'Can\'t find ingredients',
  'I can\'t afford them': 'Can\'t afford them',
  'I don\'t know where to find or eat them': 'Don\'t know where',
};

const normApos = s => String(s || '').replace(/[’‘´`]/g, "'");
const shortWhyNot = label => WHY_NOT_SHORT[normApos(label)] || (/^other$/i.test(label) ? 'Other' : label);

// Is lack of time one of the leading reasons (first, or level with the first)?
export const whyNotLeadIsTime = rows => {
  const [a, b] = rows;
  const lead = !a ? [] : (b && !clearlyAhead(a.count, b.count)) ? [a, b] : [a];
  return lead.some(r => /too long/i.test(r.label));
};

export function computeWhyNot(respondents) {
  const counts = {};
  let n = 0;
  respondents.forEach(r => {
    if (r.dishesReflect !== 'No' || !r.whyNotReasons.length) return;
    n++;
    new Set(r.whyNotReasons).forEach(reason => { counts[reason] = (counts[reason] || 0) + 1; });
  });
  const data = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({
    label: cap(shortWhyNot(label)), count,
    pct: n ? Math.round(count / n * 100) : 0,
  }));
  return { data, n };
}

export function RealityScene({ respondents, stats }) {

  const whyNot = useMemo(() => computeWhyNot(respondents), [respondents]);
  const whyNotData = whyNot.data;

  // Free-text behind the "Other" bar — a handful of concrete, legible examples.
  const otherExamples = useMemo(() => {
    const seen = new Set();
    return respondents
      .filter(r => r.dishesReflect === 'No'
        && r.whyNotReasons.some(x => /^other$/i.test(x))
        && r.whyNotComment && r.whyNotComment.length > 12)
      .map(r => r.whyNotComment.replace(/\s+/g, ' ').trim())
      .filter(c => c.length <= 120 && !seen.has(c.toLowerCase()) && seen.add(c.toLowerCase()))
      .slice(0, 8);
  }, [respondents]);

  const [topReason, secondReason] = whyNotData;
  const oneInN = stats.noPct > 0 ? Math.round(100 / stats.noPct) : 4;

  return (
    <div style={{ width: '100%', background: C.bgWarm, padding: '20px 24px 90px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        <div className="s3-fade" style={{ marginBottom: 36 }}>
          <GuessSlider
            prompt={<>Out of every 100 respondents, how many admitted that their country's iconic dishes <strong style={{ color: C.coral }}>don't reflect what they actually eat</strong>?</>}
            actual={stats.noPct}
            labelLow="0: everyone lives the tradition" labelHigh="100: nobody does" />
        </div>

        <p className="s3-fade" style={{ fontFamily: C.font, fontSize: 15.5, color: C.textM, lineHeight: 1.8,
          maxWidth: 640, margin: '0 auto 40px', textAlign: 'center' }}>
          Roughly one in {oneInN} is a quiet rebellion. But listen to their reasons and it sounds less like
          rejection and more like <em>friction</em>. Hover the bars to hear them out.
        </p>

        <div className="s3-fade" style={{ background: C.card, borderRadius: 20, padding: '26px 26px 20px',
          boxShadow: '0 4px 24px rgba(61,43,31,0.06)' }}>
          <div style={{ fontFamily: C.fontTitle, fontSize: 19, fontWeight: 700, color: C.text, marginBottom: 16, textAlign: 'center' }}>
            “Why not?” {whyNot.n} dissenters explain
          </div>
          <WhyNotBars data={whyNotData} n={whyNot.n} examples={otherExamples} />
          {topReason && (
            <div style={{ marginTop: 18, padding: '12px 18px', background: C.bgSage, borderRadius: 12,
              fontFamily: C.font, fontSize: 13.5, color: C.textM, textAlign: 'center', lineHeight: 1.6 }}>
              {!secondReason || clearlyAhead(topReason.count, secondReason.count) ? (
                <>The top answer isn't disdain: {topReason.pct}% of them said <strong style={{ color: C.coral }}>“{topReason.label.toLowerCase()}”</strong>
                {secondReason && <>, ahead of <strong style={{ color: C.coral }}>“{secondReason.label.toLowerCase()}”</strong> ({secondReason.pct}%)</>}.</>
              ) : (
                <>The top answers aren't disdain: <strong style={{ color: C.coral }}>“{topReason.label.toLowerCase()}”</strong> ({topReason.pct}%)
                and <strong style={{ color: C.coral }}>“{secondReason.label.toLowerCase()}”</strong> ({secondReason.pct}%) are neck and neck.</>
              )}
              {' '}Tradition doesn't lose to contempt.{' '}
              <strong style={{ color: C.text }}>{whyNotLeadIsTime(whyNotData) ? 'It loses to a busy Tuesday.' : 'It loses to everyday friction.'}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// CHAPTER 3 — THE EVERYDAY PLATE (bubble scrolly)

const WHERE_META = [
  { m: /^i cook them at home/i, icon: '🍳', short: 'they cook them at home' },
  { m: /parents.+grandparents|grandparents/i, icon: '👵', short: "at the (grand)parents' table" },
  { m: /^someone else cooks/i, icon: '🍲', short: 'someone else cooks them at home' },
  { m: /^at a restaurant/i, icon: '🍽️', short: 'at a restaurant' },
];
const PREF_SHORT = {
  'Home-cooked meals and comfort food': 'Home-cooked & comfort food',
  'Traditional family recipes': 'Traditional family recipes',
  'International cuisine and fusion cuisine': 'International & fusion',
  'Street food': 'Street food',
  'Sweet foods and desserts': 'Sweets & desserts',
  'Fast food': 'Fast food',
  'Healthy or fitness-focused meals': 'Healthy & fitness meals',
  'Snacks': 'Snacks',
  'Brunch-style meals': 'Brunch-style meals',
  'Fine dining or gourmet food': 'Fine dining & gourmet',
};
const WHERE_PHRASE = {
  'they cook them at home': 'mostly at home, cooked by themselves',
  "at the (grand)parents' table": "at the (grand)parents' table",
  'someone else cooks them at home': 'at home, cooked by someone else',
};

export function EverydayScene({ respondents, dishIcons }) {
  const bubbles = useMemo(() => computeBubbleNodes(respondents, dishIcons), [respondents, dishIcons]);
  const modes = ['intro', 'popular', 'iconic', 'rings', 'explore'];
  const top = bubbles.nodes[0];

  const iconicAgg = useMemo(() => {
    let sy = 0, st = 0, oy = 0, ot = 0, ly = 0, lt = 0;
    respondents.forEach(r => {
      (r.iconicSelf || []).forEach(v => { if (v === 'Yes' || v === 'No') { st++; if (v === 'Yes') sy++; } });
      (r.iconicOthers || []).forEach(v => { if (v === 'Yes' || v === 'No') { ot++; if (v === 'Yes') oy++; } });
      (r.iconicLastMonth || []).forEach(v => { if (v === 'Yes' || v === 'No') { lt++; if (v === 'Yes') ly++; } });
    });
    const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
    return { selfPct: pct(sy, st), othersPct: pct(oy, ot), lastMonthPct: pct(ly, lt) };
  }, [respondents]);
  const identifyPct = useMemo(() => {
    const t = respondents.filter(r => r.dishesReflect).length || 1;
    return Math.round(respondents.filter(r => r.dishesReflect === 'Yes').length / t * 100);
  }, [respondents]);

  const iconicContext = useMemo(() => {
    const wheres = WHERE_META.map(meta => ({
      ...meta,
      n: respondents.filter(r => (r.iconicWhere || []).some(v => meta.m.test(v))).length,
    })).sort((a, b) => b.n - a.n);
    const freq = key => respondents.filter(r => (r.iconicHowOften || '').startsWith(key)).length;
    return {
      wheres,
      occasional: freq('Occasionally'), weekly: freq('Regularly'),
      rare: freq('Rarely') + freq('Only on special occasions'),
      whereN: respondents.filter(r => r.iconicWhere?.length).length,
    };
  }, [respondents]);

  const prefs = useMemo(() => {
    const n = respondents.filter(r => r.topFoodPreferences?.length).length || 1;
    const counts = {};
    respondents.forEach(r => (r.topFoodPreferences || []).forEach(p => {
      if (PREF_SHORT[p]) counts[p] = (counts[p] || 0) + 1;
    }));
    const rows = Object.entries(counts)
      .map(([key, count]) => ({ label: PREF_SHORT[key], count, pct: Math.round(count / n * 100) }))
      .sort((a, b) => b.count - a.count);
    return { rows, n };
  }, [respondents]);
  const prefTop = prefs.rows[0], prefSecond = prefs.rows[1], prefLast = prefs.rows[prefs.rows.length - 1];
  const prefNextToLast = prefs.rows[prefs.rows.length - 2];
  const isComfort = row => /home-cooked/i.test(row?.label || '');
  const prefTopClear = prefTop && (!prefSecond || clearlyAhead(prefTop.count, prefSecond.count));
  const prefLastClear = prefLast && prefNextToLast && clearlyAhead(prefNextToLast.count, prefLast.count);

  // Copy for the dartboard steps, read off the same nodes the chart draws.
  const facts = useMemo(() => {
    const nodes = bubbles.nodes;
    const second = nodes[1];
    // "rim" = the outer half of the dartboard (iconic share below half the scale)
    const rim = nodes.filter(n => n.iconicPct < bubbles.maxIconic / 2).length;
    const rimPct = nodes.length ? Math.round(rim / nodes.length * 100) : 0;
    const eligible = nodes.filter(n => n.count >= 4);
    const pizza = eligible.find(n => /pizza/i.test(n.name));
    const mostIconic = [...eligible].sort((a, b) => b.iconicPct - a.iconicPct)[0];
    const staples = eligible.filter(n => n !== pizza).map(n => n.selfPrepPct).sort((a, b) => a - b);
    const stapleMedian = staples.length ? staples[Math.floor(staples.length / 2)] : 0;
    return {
      topClear: top && (!second || clearlyAhead(top.count, second.count)), second,
      rimPct, rimMost: clearlyAhead(rimPct, 50),
      pizza, pizzaIsMostIconic: pizza && mostIconic === pizza,
      pizzaOrderedIn: pizza && clearlyAhead(100 - pizza.selfPrepPct, pizza.selfPrepPct),
      stapleMedian, staplesHomemade: clearlyAhead(stapleMedian, 100 - stapleMedian),
    };
  }, [bubbles, top]);
  const rest = iconicContext.wheres.find(w => /restaurant/i.test(w.short));
  const homeAhead = rest ? iconicContext.wheres.filter(w => w !== rest && clearlyAhead(w.n, rest.n)) : [];
  const othersVsSelf = compareCounts(iconicAgg.othersPct, iconicAgg.selfPct);

  const swarmHeader = (
    <div style={{ maxWidth: 620, margin: '0 auto 6px' }}>
      <div style={{ fontFamily: C.fontTitle, fontSize: 19, color: C.text, textAlign: 'center', marginBottom: 8 }}>
        The everyday plate, as a dartboard
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap',
        fontFamily: C.font, fontSize: 11.5, color: C.textM }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 16, height: 16, borderRadius: '50%', background: `${C.turmeric}44`, border: `1px solid ${C.turmeric}` }} />
          size = how many eat it
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 15 }}>◎</span> closer to centre = more iconic
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 14, borderRadius: '50%', border: `3px solid ${C.herb}`, borderRightColor: 'transparent', borderBottomColor: 'transparent' }} />
          green ring = cook it themselves
        </span>
      </div>
    </div>
  );

  const steps = [
    <div key={0}>
      <StepKicker accent={C.turmeric}>The real menu</StepKicker>
      <StepTitle>So what actually fills the plate, week after week?</StepTitle>
      <StepBody>
        We asked every respondent for the three dishes they eat most often. These are the {bubbles.nodes.length} dishes
        named most across the survey: the bigger the bubble, the more people named it as an everyday meal.
        Forget the postcard, this is the kitchen counter.
      </StepBody>
    </div>,
    <div key={1}>
      <StepKicker accent={C.turmeric}>Comfort wins</StepKicker>
      <StepTitle>{!top ? 'The plate has no emperor yet.'
        : facts.topClear ? `${cap(top.name)} is the quiet emperor of Europe.`
          : `${cap(top.name)} and ${facts.second.name.toLowerCase()} share the throne.`}</StepTitle>
      <StepBody>
        Fast, cheap, endlessly adaptable: the biggest bubbles all share the same survival skills.
        Nobody's grandmother is offended; everybody's Tuesday is saved.
      </StepBody>
    </div>,
    <div key={2}>
      <StepKicker accent={C.turmeric}>The identity overlap</StepKicker>
      <StepTitle>The closer to the centre, the more “iconic” a dish also feels.</StepTitle>
      <StepBody>
        {facts.rimMost ? 'Most everyday dishes' : `${cap(shareText(facts.rimPct))} of the everyday dishes`} sit
        out near the rim: eaten constantly but rarely claimed. The three highlighted now, pulled toward the
        centre, manage to be both daily fuel <em>and</em> a badge of identity.
        {facts.rimMost ? ' The everyday plate and the identity plate are mostly different plates.' : ''}
      </StepBody>
    </div>,
    <div key={3}>
      <StepKicker accent={C.herb}>Who's at the stove</StepKicker>
      <StepTitle>The green ring: how many cook it with their own hands.</StepTitle>
      <StepBody>
        The fuller the ring, the more people cook that dish with their own hands.{' '}
        {facts.staplesHomemade && facts.pizzaOrderedIn ? (
          <>The split is sharp: everyday staples are mostly homemade, while{' '}
            {facts.pizzaIsMostIconic ? 'the most iconic dish of all, pizza,' : 'pizza'} is mostly ordered in
            (cooked at home by {facts.pizza.selfPrepPct}%). Autonomy follows convenience, not ceremony.</>
        ) : (
          <>{facts.staplesHomemade ? 'Everyday staples are mostly homemade' : 'Everyday staples are split between homemade and bought'}
            {facts.pizza ? <>; pizza is cooked at home by {facts.pizza.selfPrepPct}%</> : null}.</>
        )}
      </StepBody>
    </div>,
    <div key={4}>
      <StepKicker accent={C.turmeric}>Your turn</StepKicker>
      <StepTitle>Hover any bubble for its full story.</StepTitle>
      <StepBody>
        Three numbers per dish, all on one board: <strong>size</strong> is how many eat it,{' '}
        <strong>distance from the centre</strong> is how iconic it is perceived to be, and the{' '}
        <strong style={{ color: C.herb }}>green ring</strong> is how many cook it themselves. Find the dish
        you had for lunch and see how typical you really are.
      </StepBody>
    </div>,
    <div key={5}>
      <StepKicker accent={C.coral}>The three-way, in one view</StepKicker>
      <StepTitle>{othersVsSelf === 'ahead'
        ? <>Iconic ≠ everyday, but it <em>is</em> hospitality and special occasions.</>
        : <>Iconic ≠ everyday.</>}</StepTitle>
      <StepBody>
        Pull the three threads together. {identifyPct}% say their iconic dishes really do reflect what they
        eat, {othersVsSelf === 'ahead' ? 'yet' : 'and'} those same dishes get cooked <strong>for others</strong> ({iconicAgg.othersPct}%){' '}
        {othersVsSelf === 'ahead' ? 'more than' : othersVsSelf === 'behind' ? 'less than' : 'about as often as'}{' '}
        <strong>for themselves</strong> ({iconicAgg.selfPct}%).
        {othersVsSelf === 'ahead' ? " Identity food, it turns out, is something you mostly make when someone's coming over." : ''}
        {' '}And where does it happen? Look under the card:{' '}
        {homeAhead.length
          ? <>{homeAhead.map(w => WHERE_PHRASE[w.short] || w.short).join(' and ')}, clearly more often than in any restaurant.</>
          : <>at home and in restaurants about equally often.</>}
      </StepBody>
    </div>,
    <div key={6}>
      <StepKicker accent={C.turmeric}>The declared menu</StepKicker>
      <StepTitle>{!prefTop ? 'Ask them what they love.'
        : prefTopClear
          ? (isComfort(prefTop)
            ? `Ask them what they love, and comfort wins again: ${prefTop.pct}% say home-cooked.`
            : `Ask them what they love: ${prefTop.label.toLowerCase()} comes first, at ${prefTop.pct}%.`)
          : `Ask them what they love: ${prefTop.label.toLowerCase()} (${prefTop.pct}%) and ${prefSecond.label.toLowerCase()} (${prefSecond.pct}%) run level.`}</StepTitle>
      <StepBody>
        One last cross-check. The dartboard showed what they eat; this is what they <em>say</em> they
        prefer: {prefTop?.label.toLowerCase()} ({prefTop?.pct}%), then {prefSecond?.label.toLowerCase()}{' '}
        ({prefSecond?.pct}%).{' '}
        {prefLastClear
          ? <>{prefLast.label} trails the whole list at {prefLast.pct}%.</>
          : prefLast && prefNextToLast
            ? <>{prefLast.label} ({prefLast.pct}%) and {prefNextToLast.label.toLowerCase()} ({prefNextToLast.pct}%) share the bottom of the list.</>
            : null}
        {prefTopClear && isComfort(prefTop)
          ? (prefLastClear && /fine dining/i.test(prefLast.label)
            ? ' The observed plate and the declared palate agree: comfort first, spectacle last.'
            : ' The observed plate and the declared palate agree: comfort first.')
          : ''}
      </StepBody>
    </div>,
  ];

  return (
    <Scrolly steps={steps} side="left" graphicCol="13fr 7fr" bg={C.bgWarm} lastStepVh={115}
      renderGraphic={step => (
        step >= 6
          ? <div key="prefs" style={{ animation: 's3fadein 0.5s ease both', background: C.card,
              borderRadius: 24, padding: '26px 28px', maxWidth: 520, margin: '0 auto',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              <div style={{ fontFamily: C.fontTitle, fontSize: 19, color: C.text, textAlign: 'center', marginBottom: 4 }}>
                “Which types of food do you prefer?”
              </div>
              <div style={{ fontFamily: C.font, fontSize: 11.5, color: C.textM, textAlign: 'center', marginBottom: 16 }}>
                {prefs.n} respondents, up to three picks each
              </div>
              {prefs.rows.map((row, i) => (
                <div key={row.label} style={{ marginBottom: 9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: C.font,
                    fontSize: 12.5, color: C.text, marginBottom: 3 }}>
                    <span style={{ fontWeight: i === 0 ? 700 : 500 }}>{row.label}</span>
                    <strong style={{ color: i === 0 ? C.coral : C.textM }}>{row.pct}%</strong>
                  </div>
                  <div style={{ height: 9, borderRadius: 5, background: 'rgba(61,43,31,0.06)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 5,
                      width: `${Math.max(row.pct, 1.5)}%`,
                      background: i === 0 ? C.coral : i < 3 ? C.turmeric : 'rgba(61,43,31,0.28)',
                      transition: `width 0.8s cubic-bezier(0.22,1,0.36,1) ${0.1 + i * 0.06}s` }} />
                  </div>
                </div>
              ))}
            </div>
          : step >= 5
          ? <div style={{ animation: 's3fadein 0.5s ease both' }}>
              <ThreeWaySummary identifyPct={identifyPct} selfPct={iconicAgg.selfPct}
                othersPct={iconicAgg.othersPct} lastMonthPct={iconicAgg.lastMonthPct} />
              {/* where + how often the iconic dishes actually happen */}
              <div style={{ marginTop: 12, background: C.card, borderRadius: 16, padding: '14px 18px',
                boxShadow: '0 2px 14px rgba(61,43,31,0.06)', maxWidth: 560, margin: '12px auto 0' }}>
                <div style={{ fontFamily: C.font, fontSize: 10.5, fontWeight: 800, letterSpacing: 1.4,
                  textTransform: 'uppercase', color: C.textL, textAlign: 'center', marginBottom: 8 }}>
                  where these dishes actually happen
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 8 }}>
                  {iconicContext.wheres.map(w => (
                    <span key={w.short} style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: C.bgWarm, borderRadius: 999, padding: '4px 11px',
                      fontFamily: C.font, fontSize: 11.5, color: C.textM }}>
                      {w.icon} {w.short} <strong style={{ color: C.coral }}>{w.n}</strong>
                    </span>
                  ))}
                </div>
                <div style={{ fontFamily: C.font, fontSize: 11, color: C.textL, textAlign: 'center' }}>
                  How often: a few times a month ({iconicContext.occasional}) · weekly or more ({iconicContext.weekly}) · rarely or special occasions ({iconicContext.rare})
                </div>
              </div>
            </div>
          : <div>
              {swarmHeader}
              <BubbleSwarm bubbles={bubbles} mode={modes[Math.min(step, modes.length - 1)]} />
            </div>
      )} />
  );
}

const DISH_SPELLING = { lasagne: 'lasagna', spagetti: 'spaghetti' };
const normFood = s => {
  const n = String(s || '').toLowerCase().trim().replace(/[^a-zà-ú\s]/g, '').replace(/\s+/g, ' ').trim();
  return n.split(' ').map(w => DISH_SPELLING[w] || w).join(' ');
};

const MENU_CATS = {
  everyday: { label: 'Weekly staple', color: C.coral },
  iconic: { label: 'Their iconic dish', color: C.turmeric },
  borrowed: { label: 'Borrowed comfort', color: C.blue },
};
const MENU_STEP_TABS = ['all', 'everyday', 'iconic', 'borrowed', 'all'];

function buildIslandMenu(respondents, dishIcons) {
  const map = new Map();
  let ev = 0, ic = 0, ne = 0;
  respondents.forEach(r => {
    const di = normFood(r.desertIsland);
    if (!di) return;
    const reg = (r.regularDishes || []).filter(Boolean).map(normFood);
    const icd = (r.iconicDishes || []).map(normFood);
    const match = arr => arr.some(d => d && (d.includes(di) || di.includes(d)));
    const cat = match(reg) ? 'ev' : match(icd) ? 'ic' : 'ne';
    if (cat === 'ev') ev++; else if (cat === 'ic') ic++; else ne++;
    if (!map.has(di)) map.set(di, { key: di, count: 0, ev: 0, ic: 0, ne: 0 });
    const e = map.get(di);
    e.count++; e[cat]++;
  });
  const all = [...map.values()];
  const dishes = all.filter(d => d.count >= 2).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  const singles = all.filter(d => d.count === 1).map(d => cap(d.key));
  dishes.forEach(d => {
    d.cat = (d.ev >= d.ic && d.ev >= d.ne) ? 'everyday' : (d.ic >= d.ne) ? 'iconic' : 'borrowed';
    d.name = cap(d.key);
    d.iconFile = dishIcons[cap(d.key)] || dishIcons[d.key] || null;
  });
  const total = ev + ic + ne || 1;
  return {
    dishes, singles, ev, ic, ne, total,
    evPct: Math.round(ev / total * 100),
    icPct: Math.round(ic / total * 100),
    nePct: Math.round(ne / total * 100),
  };
}

// decorative palm frond for the menu corners
function PalmFrond({ style }) {
  return (
    <svg viewBox="0 0 120 90" width="104" height="78" aria-hidden="true"
      style={{ position: 'absolute', pointerEvents: 'none', ...style }}>
      {[-64, -38, -12, 14, 40].map((a, i) => (
        <path key={i} d="M8,82 q 48,-10 76,26" fill="none" stroke={C.herb} strokeWidth="7"
          strokeLinecap="round" transform={`rotate(${a} 8 82)`} opacity={0.5 - i * 0.045} />
      ))}
    </svg>
  );
}

function MenuCard({ island, step }) {
  const [userTab, setUserTab] = useState('all');
  const [order, setOrder] = useState('');
  const [tip, setTip] = useState(null);
  const explore = step >= 4;
  const tab = explore ? userTab : MENU_STEP_TABS[Math.min(step, MENU_STEP_TABS.length - 1)];

  const visible = tab === 'all' ? island.dishes : island.dishes.filter(d => d.cat === tab);
  const ordered = island.dishes.find(d => d.key === order) || null;
  const chefsPick = island.dishes[0];

  const TABS = [
    { key: 'all', label: `Full menu · ${island.dishes.length}`, color: C.herb },
    { key: 'everyday', label: `Weekly staples · ${island.evPct}%`, color: C.coral },
    { key: 'iconic', label: `Iconic · ${island.icPct}%`, color: C.turmeric },
    { key: 'borrowed', label: `Borrowed · ${island.nePct}%`, color: C.blue },
  ];
  const captions = {
    all: <>tagged by what each dish is to its castaways:{' '}
      <strong style={{ color: C.coral }}>●</strong> weekly staple ({island.evPct}%) ·{' '}
      <strong style={{ color: C.turmeric }}>●</strong> their iconic dish ({island.icPct}%) ·{' '}
      <strong style={{ color: C.blue }}>●</strong> borrowed ({island.nePct}%)</>,
    everyday: <><strong style={{ color: C.coral }}>{island.ev} castaways ({island.evPct}%)</strong> ordered a dish
      already among the three they eat most weeks</>,
    iconic: <><strong style={{ color: C.turmeric }}>{island.ic} castaways ({island.icPct}%)</strong> chose one of
      their own iconic dishes</>,
    borrowed: <><strong style={{ color: C.blue }}>{island.ne} castaways ({island.nePct}%)</strong> picked something
      from someone else's table</>,
  };

  const hover = (d, e) => setTip({ ...d, mx: e.clientX, my: e.clientY });

  return (
    <div style={{ position: 'relative', maxWidth: 660, margin: '0 auto' }}>
      <div style={{ position: 'relative', background: '#FFFBEE', border: '3px solid #B98A5A',
        borderRadius: 22, padding: 8, boxShadow: '0 10px 40px rgba(61,43,31,0.13)' }}>
        <PalmFrond style={{ top: -22, left: -16, transform: 'rotate(-14deg)' }} />
        <PalmFrond style={{ top: -22, right: -16, transform: 'scaleX(-1) rotate(-14deg)' }} />

        <div style={{ border: `1.5px dashed ${C.herb}66`, borderRadius: 15, padding: '16px 20px 12px' }}>

          {/* header */}
          <div style={{ textAlign: 'center', marginBottom: 4 }}>
            <div style={{ fontFamily: C.font, fontSize: 9.5, fontWeight: 800, letterSpacing: 3.4,
              textTransform: 'uppercase', color: C.herb }}>
              🌴 The Castaway · beach bar &amp; grill 🌴
            </div>
            <h3 style={{ fontFamily: C.fontTitle, fontSize: 24, color: C.text, margin: '5px 0 2px' }}>
              The Forever Menu
            </h3>
            <div style={{ fontFamily: C.font, fontSize: 10.5, color: C.textM, fontStyle: 'italic' }}>
              one dish each · forever · {island.total} covers served
            </div>
            <svg viewBox="0 0 220 12" width="170" height="9" style={{ marginTop: 4 }} aria-hidden="true">
              <path d="M0,6 q 13.75,-9 27.5,0 t 27.5,0 t 27.5,0 t 27.5,0 t 27.5,0 t 27.5,0 t 27.5,0 t 27.5,0"
                fill="none" stroke={C.blue} strokeWidth="2" opacity="0.5" />
            </svg>
          </div>

          {/* tabs (story-driven until the last step hands them over) */}
          <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap', margin: '8px 0 6px' }}>
            {TABS.map(t => {
              const isSel = tab === t.key;
              return (
                <button key={t.key}
                  onClick={() => { if (explore) { setUserTab(t.key); storylog('menu_tab', { tab: t.key }); } }}
                  style={{ border: `1.5px solid ${isSel ? t.color : 'rgba(61,43,31,0.16)'}`,
                    background: isSel ? t.color : 'transparent', color: isSel ? '#fff' : C.textM,
                    borderRadius: 999, padding: '4px 11px', fontFamily: C.font, fontSize: 11,
                    fontWeight: 700, cursor: explore ? 'pointer' : 'default',
                    opacity: explore || isSel ? 1 : 0.55, transition: 'all 0.25s' }}>
                  {t.label}
                </button>
              );
            })}
          </div>
          <p style={{ fontFamily: C.font, fontSize: 11, color: C.textM, textAlign: 'center',
            lineHeight: 1.5, margin: '0 auto 10px', maxWidth: 520, minHeight: 17 }}>
            {captions[tab]}
          </p>

          {/* the dishes — capped height so the card always fits the viewport */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            columnGap: 24, rowGap: 1, alignContent: 'start',
            maxHeight: zvh(44), overflowY: 'auto', paddingRight: 4 }}>
            {visible.map(d => {
              const cinfo = MENU_CATS[d.cat];
              const isOrder = order === d.key;
              const isChef = chefsPick && d.key === chefsPick.key;
              return (
                <button key={d.key}
                  onClick={() => { if (!explore) return; setOrder(isOrder ? '' : d.key); if (!isOrder) storylog('menu_order', { dish: d.name }); }}
                  onMouseEnter={e => hover(d, e)}
                  onMouseMove={e => setTip(prev => prev ? { ...prev, mx: e.clientX, my: e.clientY } : null)}
                  onMouseLeave={() => setTip(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', textAlign: 'left',
                    background: isOrder ? C.coralSoft : 'transparent', border: 'none',
                    borderRadius: 8, padding: '2.5px 6px', cursor: explore ? 'pointer' : 'default',
                    transition: 'background 0.2s', animation: 's3fadein 0.4s ease both' }}>
                  {d.iconFile
                    ? <img src={`/icons/dishes_v2/${d.iconFile}`} alt="" aria-hidden="true" loading="lazy" decoding="async"
                        onError={e => { e.target.style.display = 'none'; }}
                        style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    : <span style={{ width: 22, textAlign: 'center', fontSize: 12, flexShrink: 0 }}>🍽️</span>}
                  <span title={cinfo.label} style={{ width: 7, height: 7, borderRadius: '50%',
                    background: cinfo.color, flexShrink: 0 }} />
                  <span style={{ fontFamily: C.fontTitle, fontSize: 13.5, color: isOrder ? C.coral : C.text,
                    fontWeight: isOrder ? 700 : 400, whiteSpace: 'nowrap', overflow: 'hidden',
                    textOverflow: 'ellipsis' }}>
                    {d.name}
                  </span>
                  {isChef && tab === 'all' && (
                    <span style={{ fontFamily: C.font, fontSize: 8, fontWeight: 800, letterSpacing: 0.8,
                      color: '#fff', background: C.herb, borderRadius: 999, padding: '1.5px 7px',
                      textTransform: 'uppercase', flexShrink: 0 }}>
                      chef's pick
                    </span>
                  )}
                  <span aria-hidden="true" style={{ flex: 1, borderBottom: '2px dotted rgba(61,43,31,0.26)',
                    margin: '0 3px', transform: 'translateY(4px)', minWidth: 12 }} />
                  <span style={{ fontFamily: C.font, fontSize: 11.5, fontWeight: 800,
                    color: cinfo.color, whiteSpace: 'nowrap' }}>
                    ×{d.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* your order (explore only) — an empty plate that the chosen dish lands on */}
          {explore && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 6, animation: 's3fadein 0.4s ease both' }}>
              <div style={{ position: 'relative', width: 104, height: 104 }}>
                {/* the plate */}
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'radial-gradient(circle at 50% 40%, #ffffff 0%, #fbf4e6 60%, #efe4cf 100%)',
                  boxShadow: '0 6px 15px rgba(61,43,31,0.16), inset 0 0 0 1px rgba(61,43,31,0.05)' }} />
                <div style={{ position: 'absolute', inset: 13, borderRadius: '50%',
                  border: '2px dashed rgba(61,43,31,0.13)' }} />
                {/* the food (or an empty-plate hint) */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center' }}>
                  {ordered
                    ? (ordered.iconFile
                        ? <img key={ordered.key} src={`/icons/dishes_v2/${ordered.iconFile}`} alt={ordered.name} loading="lazy" decoding="async"
                            onError={e => { e.target.style.display = 'none'; }}
                            style={{ width: 74, height: 74, borderRadius: '50%', objectFit: 'cover',
                              animation: 's3plate 0.45s cubic-bezier(0.34,1.56,0.64,1) both' }} />
                        : <span key={ordered.key} style={{ fontSize: 38,
                            animation: 's3plate 0.45s cubic-bezier(0.34,1.56,0.64,1) both' }}>🍽️</span>)
                    : <span style={{ fontFamily: C.font, fontSize: 10, color: C.textL, fontStyle: 'italic',
                        textAlign: 'center', maxWidth: 70, lineHeight: 1.4 }}>your plate</span>}
                </div>
              </div>
              <div style={{ textAlign: 'center', fontFamily: C.font, fontSize: 12, color: C.textM, minHeight: 17 }}>
                {ordered
                  ? <>Your order: <strong style={{ color: C.coral }}>{ordered.name}</strong> · shared with{' '}
                      <strong style={{ color: C.herb }}>{ordered.count} castaway{ordered.count > 1 ? 's' : ''}</strong></>
                  : <>Tap a dish to place your own order.</>}
              </div>
            </div>
          )}

          {/* footer */}
          <div style={{ marginTop: 8, paddingTop: 7, borderTop: '1.5px dashed rgba(61,43,31,0.2)',
            textAlign: 'center', fontFamily: C.font, fontSize: 10, color: C.textL, lineHeight: 1.5 }}>
            Off the menu: {island.singles.length} one-of-a-kind requests · service included · every dish borrowed 🍹
          </div>
        </div>
      </div>

      {tip && (
        <Tip mx={tip.mx} my={tip.my}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{tip.name}</div>
          <div style={{ fontSize: 12 }}>
            <span style={{ color: '#ff9b85', fontWeight: 700, fontSize: 15 }}>{tip.count}</span>
            <span style={{ opacity: 0.8 }}> castaways packed it</span>
          </div>
          <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 2 }}>
            {tip.ev} already eat it most weeks · {tip.ic} call it iconic
          </div>
        </Tip>
      )}
    </div>
  );
}

export function DesertIslandScene({ respondents, dishIcons }) {
  const island = useMemo(() => buildIslandMenu(respondents, dishIcons), [respondents, dishIcons]);
  const top1 = island.dishes[0], top2 = island.dishes[1];
  const showOff = island.dishes.find(d => /lobster|truffle|caviar|oyster|champagne|wagyu/i.test(d.key));
  const borrowedTop = island.dishes.filter(d => d.cat === 'borrowed').slice(0, 3).map(d => d.name.toLowerCase());

  const steps = [
    <div key={0}>
      <StepKicker>Tonight's menu</StepKicker>
      <StepTitle>One dish each, forever: {island.total} orders placed.</StepTitle>
      <StepBody>
        Every survey answer becomes a line on the menu of a very strange beach restaurant:{' '}
        {island.dishes.length} dishes that at least two castaways ordered, ranked by popularity. The
        coloured dot on each line tags what the dish is to the person who packed it. If fantasy food
        were about showing off, the lobster would be at the top.
      </StepBody>
    </div>,
    <div key={1}>
      <StepKicker accent={C.coral}>Section one · weekly staples</StepKicker>
      <StepTitle>{island.evPct}% ordered a dish they already eat every week.</StepTitle>
      <StepBody>
        Flip the menu to the staples section and {shareText(island.evPct)} of the island stays home:{' '}
        {plural(island.ev, 'castaway', 'castaways')} packed one of the three dishes already on their own table most weeks. The apocalypse menu is
        the Tuesday menu.
      </StepBody>
    </div>,
    <div key={2}>
      <StepKicker accent={C.turmeric}>Section two · iconic dishes</StepKicker>
      <StepTitle>Another {island.icPct}% packed their own iconic dish.</StepTitle>
      <StepBody>
        {clearlyAhead(island.ev, island.ic) ? 'A smaller section' : clearlyAhead(island.ic, island.ev) ? 'A bigger section' : 'A section about as big'}:
        dishes their castaways had named as personally iconic. Not what they eat
        most, but what says “this is who I am”. Identity food, chosen for the last table on Earth.
      </StepBody>
    </div>,
    <div key={3}>
      <StepKicker accent={C.blue}>Section three · borrowed comfort</StepKicker>
      <StepTitle>The rest, {island.nePct}%, ordered from someone else's table.</StepTitle>
      <StepBody>
        And even here, almost nothing is exotic{borrowedTop.length ? `: ${borrowedTop.join(', ')}` : ''}. The continent's shared comfort
        dishes, borrowed one final time. The {island.singles.length} truly one-of-a-kind wishes live
        off-menu, in the small print at the bottom of the card.
      </StepBody>
    </div>,
    <div key={4}>
      <StepKicker accent={C.coral}>Your turn</StepKicker>
      <StepTitle>Place your order.</StepTitle>
      <StepBody>
        The tabs are yours now. Browse the sections, tap a dish to order it and see how many castaways
        you'd share the raft with, and hover any line for its full story. {showOff ? 'Barely any lobster' : 'No lobster anywhere'}:
        {top1 ? <> the island runs on <strong style={{ color: C.coral }}>{top1.name.toLowerCase()}</strong></> : null}
        {top2 ? <> and <strong style={{ color: C.coral }}>{top2.name.toLowerCase()}</strong></> : null}.
        {top1?.cat === 'everyday' ? " The dish you'd die with is the dish you already live with." : ''}
      </StepBody>
    </div>,
  ];

  return (
    <Scrolly steps={steps} side="left" graphicCol="12fr 8fr" bg={C.bg} lastStepVh={110}
      renderGraphic={step => <MenuCard island={island} step={step} />} />
  );
}

// CHAPTER 4 — CUISINE CRUSHES (flower garden scrolly)

const COUNTRY_TO_CUISINE = {
  'United Kingdom':'British','Ireland':'Irish','Spain':'Spanish','Germany':'German',
  'France':'French','Italy':'Italian','Portugal':'Portuguese','Denmark':'Danish',
};
const FIXED_FLOWERS = ['Portugal', 'Italy', 'United Kingdom', 'Spain', 'France', 'Denmark', 'Ireland'];

export function buildFlowers(respondents) {
  const countryPeople = {};
  respondents.forEach(r => {
    const c = r.country_live || r.country_birth;
    if (!c || !(r.connectedCuisines || []).filter(v => v !== 'other').length) return;
    if (!countryPeople[c]) countryPeople[c] = [];
    countryPeople[c].push(r);
  });
  const flowers = {};
  Object.entries(countryPeople).filter(([, p]) => p.length >= 2).forEach(([country, people]) => {
    const cuisineCounts = {};
    people.forEach(r => (r.connectedCuisines || []).forEach(cu => {
      if (cu === 'other') return;
      cuisineCounts[cu] = (cuisineCounts[cu] || 0) + 1;
    }));
    flowers[country] = {
      country,
      cuisineData: Object.entries(cuisineCounts)
        .map(([cuisine, count]) => ({ cuisine, count, pct: Math.round(count / people.length * 100) }))
        .sort((a, b) => b.count - a.count).slice(0, 10),
      ownCuisine: COUNTRY_TO_CUISINE[country],
      n: people.length,
    };
  });
  return flowers;
}

function buildEuropeFlower(respondents) {
  const cuisineCounts = {};
  let people = 0;
  respondents.forEach(r => {
    const cs = (r.connectedCuisines || []).filter(v => v !== 'other');
    if (!cs.length) return;
    people++;
    cs.forEach(cu => { cuisineCounts[cu] = (cuisineCounts[cu] || 0) + 1; });
  });
  return {
    country: 'All of Europe',
    cuisineData: Object.entries(cuisineCounts)
      .map(([cuisine, count]) => ({ cuisine, count, pct: people ? Math.round(count / people * 100) : 0 }))
      .sort((a, b) => b.count - a.count).slice(0, 10),
    ownCuisine: null,
    n: people,
  };
}

// How many country gardens (flowers) carry a petal for the given cuisine.
export function gardenReach(flowers, cuisine) {
  const all = Object.values(flowers);
  const without = all.filter(f => !f.cuisineData.some(d => d.cuisine === cuisine)).map(f => f.country).sort();
  return { total: all.length, withTop: all.length - without.length, without, all: all.length > 0 && !without.length };
}

function FlowerGardenGraphic({ flowers, europe, step, userCountry }) {
  const [pick, setPick] = useState('');
  const isMobile = useIsMobile();
  const heroCountry = (userCountry && flowers[userCountry]) ? userCountry : 'Portugal';
  const hero = flowers[heroCountry] || Object.values(flowers)[0];
  const fixed = FIXED_FLOWERS.filter(cn => flowers[cn]).map(cn => flowers[cn]);
  const others = Object.keys(flowers).filter(cn => !FIXED_FLOWERS.includes(cn)).sort();
  const pickFlower = pick && flowers[pick] ? flowers[pick] : null;

  const [heroRef, heroSeen] = useOnScreen({ threshold: 0.35 });

  // FLIP: carry the hero flower from its solo spot into its grid cell
  const heroBoxRef = useRef(null);
  const heroRectRef = useRef(null);
  const gridHeroRef = useRef(null);
  const flipDoneRef = useRef(false);
  const heroInGrid = fixed.some(fd => fd.country === heroCountry);

  useLayoutEffect(() => {
    if (step === 0 && heroBoxRef.current) {
      heroRectRef.current = heroBoxRef.current.getBoundingClientRect();
      flipDoneRef.current = false;
    }
  });

  useLayoutEffect(() => {
    if (step >= 1 && !flipDoneRef.current && heroRectRef.current && gridHeroRef.current) {
      flipDoneRef.current = true;
      const el = gridHeroRef.current;
      const from = heroRectRef.current;
      const to = el.getBoundingClientRect();
      if (!to.width) return;
      el.style.transformOrigin = 'top left';
      el.style.transition = 'none';
      el.style.zIndex = 5;
      el.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transition = 'transform 0.85s cubic-bezier(0.22, 1, 0.36, 1)';
        el.style.transform = 'none';
      }));
    }
  }, [step]);

  if (step === 0 && hero) {
    return (
      <div ref={heroRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
        opacity: heroSeen ? 1 : 0, transition: 'opacity 0.3s' }}>
        <div ref={heroBoxRef}>
          <CuisineFlower country={hero.country} cuisineData={hero.cuisineData} ownCuisine={hero.ownCuisine}
            size={isMobile ? 250 : 360} sub={`${hero.n} respondents · hover the petals`} sprout={heroSeen} />
        </div>
        {userCountry === hero.country && (
          <div style={{ marginTop: 6, fontFamily: C.font, fontSize: 12, fontWeight: 700, color: C.coral }}>
            ★ your country
          </div>
        )}
      </div>
    );
  }

  // Summary bloom: the whole continent as one flower.
  if (step === 2 && europe) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        animation: 's3fadein 0.6s ease both' }}>
        <div style={{ fontFamily: C.font, fontSize: 11, fontWeight: 800, letterSpacing: 2,
          textTransform: 'uppercase', color: C.coral }}>All of Europe, in one bloom</div>
        <CuisineFlower country={europe.country} cuisineData={europe.cuisineData} ownCuisine={null}
          size={isMobile ? 250 : 360} highlightCuisine={europe.cuisineData[0]?.cuisine}
          sub={`${europe.n} respondents · hover the petals`} />
      </div>
    );
  }

  const grid = (highlight) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
      columnGap: isMobile ? 10 : 22, rowGap: isMobile ? 18 : 30,
      animation: 's3fadein 0.6s ease both' }}>
      {fixed.map(fd => {
        const isHero = fd.country === heroCountry;
        return (
          <div key={fd.country} ref={isHero ? gridHeroRef : undefined} style={{ position: 'relative' }}>
            <CuisineFlower country={fd.country} cuisineData={fd.cuisineData}
              ownCuisine={fd.ownCuisine} size={isMobile ? 130 : 185} highlightCuisine={highlight}
              sprout={!(isHero && heroInGrid)}
              sub={highlight ? `${fd.cuisineData.find(d => d.cuisine === highlight)?.pct ?? 0}% feel the pull` : undefined} />
          </div>
        );
      })}
      {step >= 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          {pickFlower
            ? <CuisineFlower country={pickFlower.country} cuisineData={pickFlower.cuisineData}
                ownCuisine={pickFlower.ownCuisine} size={isMobile ? 130 : 185} />
            : <div style={{ width: isMobile ? 130 : 185, height: isMobile ? 130 : 185, borderRadius: '50%',
                border: `2px dashed ${C.textL}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: C.font, fontSize: 12, color: C.textL, textAlign: 'center' }}>
                  Plant another<br />flower
                </span>
              </div>}
          <select value={pick} onChange={e => { setPick(e.target.value); if (e.target.value) storylog('flower_pick', { country: e.target.value }); }}
            style={{ padding: '5px 24px 5px 10px', border: `1px solid rgba(61,43,31,0.25)`, borderRadius: 8,
              fontFamily: C.font, fontSize: 11.5, background: C.card, color: C.text, cursor: 'pointer',
              appearance: 'none', textAlign: 'center',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%233D2B1F' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
            <option value="">Choose a country</option>
            {others.map(cn => <option key={cn} value={cn}>{cn}</option>)}
          </select>
        </div>
      )}
    </div>
  );

  return grid(step === 1 ? 'Italian' : null);
}

export function CrushesScene({ respondents, stats, userCountry }) {
  const flowers = useMemo(() => buildFlowers(respondents), [respondents]);
  const europe = useMemo(() => buildEuropeFlower(respondents), [respondents]);
  const heroCountry = (userCountry && flowers[userCountry]) ? userCountry : 'Portugal';
  const garden = gardenReach(flowers, stats.topCuisineName);

  const steps = [
    <div key={0}>
      <StepKicker accent={C.berry}>A garden of appetites</StepKicker>
      <StepTitle>Every country is a flower; every petal, a cuisine it loves.</StepTitle>
      <StepBody>
        This is {heroCountry}{userCountry === heroCountry ? ' (your pick)' : ''}: each petal is a cuisine its
        young people say they feel <em>connected</em> to, sized by how many feel the pull. The dashed petal is
        their own national cuisine, and note that it rarely stands alone.
      </StepBody>
    </div>,
    <div key={1}>
      <StepKicker accent={C.coral}>The empire of the petal</StepKicker>
      <StepTitle>{!garden.total ? `The most loved petal: ${stats.topCuisineName}.`
        : `One petal grows in ${garden.all ? 'every garden' : `${garden.withTop} of ${garden.total} gardens`}: ${stats.topCuisineName}.`}</StepTitle>
      <StepBody>
        {stats.topCuisineCount} of {plural(stats.n, 'respondent', 'respondents')} {stats.n === 1 ? 'feels' : 'feel'} connected to {stats.topCuisineName} food
        {!garden.total ? '' : garden.all ? ', and it has a petal in every country garden on this page' : `, with a petal in ${garden.withTop} of the ${garden.total} country gardens on this page`}. Migration and exchange laid the base; since the 1950s,
        wave after wave of food fashion, carried first by cookbooks and TV and now by feeds, has been
        spreading the same tastes across the continent. It is the closest thing Europe has to a shared
        food identity.
      </StepBody>
    </div>,
    <div key={2}>
      <StepKicker accent={C.coral}>The whole continent</StepKicker>
      <StepTitle>Put everyone's answers together, and Europe blooms as one flower.</StepTitle>
      <StepBody>
        This single bloom is {europe.n === 1 ? 'one respondent' : `all ${europe.n} respondents`} at once: the longest petal, {europe.cuisineData[0]?.cuisine},
        is the cuisine the most respondents feel drawn to. A shared garden, grown from many separate gardens.
      </StepBody>
    </div>,
    <div key={3}>
      <StepKicker accent={C.berry}>Your turn</StepKicker>
      <StepTitle>Plant your own flower.</StepTitle>
      <StepBody>
        Pick any other country in the dropdown and compare its garden. Hover petals for exact percentages,
        and check whether anyone resists the {stats.topCuisineName} gravitational field.
        {garden.all ? ' (Spoiler: nobody does.)' : ` (Spoiler: ${garden.without.join(', ')} ${garden.without.length === 1 ? 'does' : 'do'}.)`}
      </StepBody>
    </div>,
  ];

  return (
    <Scrolly steps={steps} side="left" graphicCol="13fr 7fr" bg={C.bg}
      renderGraphic={step => <FlowerGardenGraphic flowers={flowers} europe={europe} step={step} userCountry={userCountry} />} />
  );
}

export const CULTURE_LEVELS = [
  { match: /personal|family/i, short: 'Personal & family', icon: '🏠', note: 'my kitchen, my people' },
  { match: /^regional/i, short: 'Regional', icon: '📍', note: 'Catalan, Sicilian, Bavarian…', examples: 'region' },
  { match: /^national/i, short: 'National', icon: '🗺️', note: 'Spanish, Italian, Japanese…' },
  { match: /broader/i, short: 'Broader area', icon: '🌊', note: 'Mediterranean, Atlantic, Nordic…', examples: 'area' },
  { match: /mix|fusion/i, short: 'A mix / fusion', icon: '🌍', note: 'a bit of everywhere' },
];

// fold the free-text region/area names (Catalan/Catalonia/Catalán → Catalonia…)
function foldPlaces(values) {
  const counts = {};
  values.filter(Boolean).forEach(raw => {
    let v = raw.trim();
    if (/^catal/i.test(v)) v = 'Catalonia';
    else if (/^mediterr/i.test(v)) v = 'Mediterranean';
    else v = cap(v.toLowerCase());
    counts[v] = (counts[v] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
}

const MED_COUNTRIES =['Portugal', 'Spain', 'France', 'Italy', 'Greece', 'Croatia', 'Malta', 'Cyprus',
  'Turkey', 'Morocco', 'Algeria', 'Tunisia', 'Albania', 'Montenegro', 'Slovenia', 'Bosnia and Herzegovina'];
const NORDIC_COUNTRIES = ['Denmark', 'Sweden', 'Norway', 'Finland', 'Iceland'];
const MOSAIC_PALETTE = [C.coral, C.turmeric, C.herb, C.berry, C.blue];

const MIX_TITLE = { ahead: 'Movement feeds the mix.', close: 'Movement barely moves the mix.', behind: 'Staying put feeds the mix.', na: 'Movement and the mix.' };
const MIX_CARD_TITLE = { ahead: 'Living abroad loosens the map', close: 'Living abroad barely changes the map', behind: 'Those who stayed mix more', na: 'Living abroad and the map' };
// abroad vs never-abroad, only with enough people on both sides
const mixCompare = zoom => (zoom.abroadN >= MIN_GROUP && zoom.homeN >= MIN_GROUP
  ? compareCounts(zoom.mixAbroadPct, zoom.mixHomePct) : 'na');

function CultureZoomGraphic({ geoData, zoom, respondentCountries, step }) {
  const [pick, setPick] = useState(null);
  const [tip, setTip] = useState(null);
  const showTwist = step >= 5;
  const level = CULTURE_LEVELS[Math.min(step, 4)];
  const levelData = zoom.levels[Math.min(step, 4)];

  // hover a country → how many of its respondents chose the current zoom level
  const onCountryHover = (name, e) => {
    const tot = zoom.countryTotals?.[name] || 0;
    if (!tot) { setTip(null); return; }
    setTip({ name, n: levelData?.byCountry?.[name] || 0, tot, mx: e.clientX, my: e.clientY });
  };
  const onCountryLeave = () => setTip(null);

  const conf = useMemo(() => {
    const fills = {};
    const dots = [];
    let view = { center: [8, 50], scale: 1.7 };
    if (step === 0) {
      view = { center: [2, 48.5], scale: 3.2 };
      respondentCountries.forEach(cn => {
        if (EUROPEAN_COUNTRIES.has(cn)) fills[cn] = { fill: 'rgba(61,43,31,0.05)', stroke: 'rgba(61,43,31,0.18)', sw: 0.4 };
      });
      dots.push(...scatterInCountries(geoData, zoom.levels[0]?.byCountry, C.coral));
    } else if (step === 1) {
      view = { center: [3, 47.5], scale: 2.6 };
      respondentCountries.forEach(cn => {
        if (EUROPEAN_COUNTRIES.has(cn)) fills[cn] = { fill: `${C.herb}1f`, stroke: `${C.herb}77`, sw: 0.5 };
      });
      dots.push(...scatterInCountries(geoData, zoom.levels[1]?.byCountry, C.coral, { maxPerCountry: 5, spreadDeg: 3.0 }));
    } else if (step === 2) {
      respondentCountries.forEach(cn => { fills[cn] = { fill: `${C.coral}55`, stroke: C.coral, sw: 0.7 }; });
    } else if (step === 3) {
      view = { center: [9, 46], scale: 1.9 };
      MED_COUNTRIES.forEach(cn => { fills[cn] = { fill: 'rgba(46,134,171,0.38)', stroke: 'rgba(46,134,171,0.75)', sw: 0.6 }; });
      NORDIC_COUNTRIES.forEach(cn => { fills[cn] = { fill: 'rgba(46,134,171,0.15)', stroke: 'rgba(46,134,171,0.4)', sw: 0.5 }; });
      dots.push({ at: [10, 37.2], color: C.blue, r: 5, pulse: true, label: `Mediterranean ×${zoom.medCount}`, labelBelow: true });
      dots.push({ at: [17, 62.5], color: C.blue, r: 4, label: 'Nordic / Baltic' });
    } else {
      // the mosaic: every country a different shard, because "a mix" has no geography
      [...EUROPEAN_COUNTRIES].forEach(cn => {
        const col = MOSAIC_PALETTE[(cn.charCodeAt(0) + cn.length) % MOSAIC_PALETTE.length];
        fills[cn] = { fill: `${col}52`, stroke: `${col}90`, sw: 0.5 };
      });
    }
    return { fills, dots, view };
  }, [step, zoom, respondentCountries, geoData]);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ opacity: showTwist ? 0.16 : 1, transition: 'opacity 0.7s',
        pointerEvents: showTwist ? 'none' : 'auto' }}>
        <div style={{ background: C.card, borderRadius: 16, padding: 12, boxShadow: '0 4px 24px rgba(61,43,31,0.08)' }}>
          <StoryMap geoData={geoData} view={conf.view} fills={conf.fills} arcs={[]} dots={conf.dots}
            stepKey={step} onCountryHover={onCountryHover} onCountryLeave={onCountryLeave} />
        </div>
        <div style={{ fontFamily: C.font, fontSize: 10.5, color: C.textL, textAlign: 'center',
          marginTop: 6, fontStyle: 'italic' }}>
          {step <= 1 && <>Each dot is one respondent, placed in their country; darker where more of them answered this way. · </>}
          Hover a country to see how many of its respondents chose this level.
        </div>

        {/* lens readout: which zoom level, how many live here */}
        <div key={Math.min(step, 4)} style={{ position: 'absolute', top: 24, left: 24, background: 'rgba(255,252,246,0.95)',
          borderRadius: 14, padding: '12px 18px', boxShadow: '0 4px 18px rgba(61,43,31,0.14)',
          borderLeft: `3px solid ${C.coral}`, animation: 's3fadein 0.5s ease both', maxWidth: 240 }}>
          <div style={{ fontFamily: C.font, fontSize: 10, fontWeight: 800, letterSpacing: 1.6,
            textTransform: 'uppercase', color: C.textL, marginBottom: 2 }}>
            zoom level {Math.min(step, 4) + 1} of 5
          </div>
          <div style={{ fontFamily: C.fontTitle, fontSize: 30, fontWeight: 700, color: C.coral, lineHeight: 1.1 }}>
            <AnimatedNumber value={levelData?.pct ?? 0} suffix="%" />
          </div>
          <div style={{ fontFamily: C.font, fontSize: 13.5, fontWeight: 700, color: C.text }}>
            {level.icon} {level.short}
          </div>
          <div style={{ fontFamily: C.font, fontSize: 11, color: C.textM }}>
            {levelData?.n ?? 0} of {zoom.total} · “{level.note}”
          </div>
        </div>
      </div>

      {tip && !showTwist && (
        <Tip mx={tip.mx} my={tip.my}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{tip.name}</div>
          <div style={{ fontSize: 12.5 }}>
            <span style={{ color: '#ffb38a', fontWeight: 700, fontSize: 15 }}>{tip.n}</span>
            <span style={{ opacity: 0.85 }}> of {tip.tot} chose {level.icon} {level.short.toLowerCase()}</span>
          </div>
        </Tip>
      )}

      {/* the migration twist + reader pick (crossfade, like the migrant impact card) */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: showTwist ? 1 : 0, transition: 'opacity 0.7s', pointerEvents: showTwist ? 'auto' : 'none' }}>
        <div style={{ background: C.card, borderRadius: 24, padding: '26px 28px', width: '100%', maxWidth: 520,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ fontFamily: C.fontTitle, fontSize: 19, color: C.text, textAlign: 'center', marginBottom: 16 }}>
            {MIX_CARD_TITLE[mixCompare(zoom)]}
          </div>
          {[
            { label: 'Lived in another country', pct: zoom.mixAbroadPct, n: zoom.abroadN, color: C.coral },
            { label: 'Never lived abroad', pct: zoom.mixHomePct, n: zoom.homeN, color: 'rgba(61,43,31,0.35)' },
          ].map((row, i) => (
            <div key={i} style={{ marginBottom: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: C.font,
                fontSize: 13, color: C.text, marginBottom: 4 }}>
                <span>{row.label} <span style={{ color: C.textL, fontSize: 11 }}>({row.n})</span></span>
                <strong style={{ color: row.color === C.coral ? C.coral : C.textM }}>{row.pct}% say “a mix”</strong>
              </div>
              <div style={{ height: 12, borderRadius: 6, background: 'rgba(61,43,31,0.07)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: showTwist ? `${row.pct}%` : 0, background: row.color,
                  borderRadius: 6, transition: `width 1s cubic-bezier(0.22,1,0.36,1) ${0.2 + i * 0.15}s` }} />
              </div>
            </div>
          ))}

          <div style={{ fontFamily: C.font, fontSize: 12.5, color: C.textM, textAlign: 'center', margin: '16px 0 10px' }}>
            And you? Where does <em>your</em> food culture live?
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            {zoom.levels.map((lv, i) => (
              <button key={lv.short}
                onClick={() => { setPick(i); storylog('culture_zoom_pick', { level: lv.short }); }}
                style={{ border: `1.5px solid ${pick === i ? C.coral : 'rgba(61,43,31,0.18)'}`,
                  background: pick === i ? C.coralSoft : C.bg, color: pick === i ? C.coral : C.textM,
                  borderRadius: 999, padding: '7px 13px', fontFamily: C.font, fontSize: 11.5, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.2s' }}>
                {lv.icon} {lv.short}
              </button>
            ))}
          </div>
          {pick != null && (
            <div style={{ marginTop: 10, fontFamily: C.font, fontSize: 13, color: C.text, textAlign: 'center',
              animation: 's3fadein 0.4s ease both' }}>
              You stand with <strong style={{ color: C.coral }}>{zoom.levels[pick].pct}%</strong> of this
              generation ({zoom.levels[pick].n} of {zoom.total}).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CultureZoomScene({ geoData, respondents }) {
  const zoom = useMemo(() => {
    const answered = respondents.filter(r => r.describeFoodCulture);
    const total = answered.length || 1;
    const countryOf = r => r.country_live || r.country_birth || null;
    const countryTotals = {};
    answered.forEach(r => { const c = countryOf(r); if (c) countryTotals[c] = (countryTotals[c] || 0) + 1; });
    const levels = CULTURE_LEVELS.map(lv => {
      const people = answered.filter(r => lv.match.test(r.describeFoodCulture));
      const byCountry = {};
      people.forEach(r => { const c = countryOf(r); if (c) byCountry[c] = (byCountry[c] || 0) + 1; });
      return { ...lv, n: people.length, pct: Math.round(people.length / total * 100), byCountry };
    });
    const abroad = answered.filter(r => r.livedAbroad === 'Yes');
    const home = answered.filter(r => r.livedAbroad !== 'Yes');
    const mixPct = ppl => Math.round(ppl.filter(r => /mix|fusion/i.test(r.describeFoodCulture)).length / (ppl.length || 1) * 100);
    const areaExamples = foldPlaces(respondents.map(r => r.specifyArea));
    return {
      total, levels, countryTotals,
      regionExamples: foldPlaces(respondents.map(r => r.specifyRegion)),
      areaExamples,
      medCount: areaExamples.find(([n]) => n === 'Mediterranean')?.[1] ?? 0,
      mixAbroadPct: mixPct(abroad), mixHomePct: mixPct(home),
      abroadN: abroad.length, homeN: home.length,
      nationalPct: levels.find(l => l.short === 'National')?.pct ?? 0,
      mixTotalPct: levels.find(l => l.short === 'A mix / fusion')?.pct ?? 0,
    };
  }, [respondents]);

  const respondentCountries = useMemo(() => {
    const s = new Set();
    respondents.forEach(r => { const c = r.country_live || r.country_birth; if (c) s.add(c); });
    return [...s];
  }, [respondents]);

  const lv = i => zoom.levels[i] || {};
  const leader = [...zoom.levels].sort((a, b) => b.n - a.n)[0] || {};
  const runnerUp = [...zoom.levels].sort((a, b) => b.n - a.n)[1] || {};
  const mixLeads = leader === lv(4) && clearlyAhead(lv(4).n, runnerUp.n);
  const nationBehind = zoom.levels.some(l => l !== lv(2) && clearlyAhead(l.n, lv(2).n));
  const nationUnderFifth = clearlyAhead(20, lv(2).pct);

  const steps = [
    <div key={0}>
      <StepKicker accent={C.herb}>Zoom level 1 · the table</StepKicker>
      <StepTitle>For {lv(0).pct}%, “my food culture” fits in one kitchen.</StepTitle>
      <StepBody>
        Start as close as the lens goes: the kitchen table. Every dot is one of the {lv(0).n} respondents
        who said their food culture is <strong>personal or family heritage</strong>: not a country's
        cuisine, but a specific fridge, a specific grandmother, a specific Sunday. There is no single
        table to point at, only thousands of them, scattered wherever these answers came from.
      </StepBody>
    </div>,
    <div key={1}>
      <StepKicker accent={C.herb}>Zoom level 2 · the region</StepKicker>
      <StepTitle>Pull back, and for {lv(1).pct}% the region appears first.</StepTitle>
      <StepBody>
        Catalan before Spanish, Sicilian before Italian.{' '}
        {clearlyAhead(lv(0).n, lv(1).n) ? 'A smaller scatter' : 'Another scatter'} ({plural(lv(1).n || 0, 'person', 'people')}),
        across the same map: their loyalty runs to a specific region inside the country rather
        than to the country itself, and it echoes the project's own question: is a cuisine national at
        all, or is the nation just the region's loudest neighbour?
      </StepBody>
    </div>,
    <div key={2}>
      <StepKicker accent={C.coral}>Zoom level 3 · the nation</StepKicker>
      <StepTitle>The nation, cookbooks' favourite unit: {nationBehind ? 'only ' : ''}{lv(2).pct}%.</StepTitle>
      <StepBody>
        {nationBehind ? 'Here is the surprise. ' : ''}The level every cookbook and tourism board promotes, and every “national
        dish” debate assumes, is the first answer of{' '}
        {nationUnderFifth ? 'fewer than one in five' : shareText(lv(2).pct)}.
        {nationBehind ? ' The country you were born in is not, apparently, the shape of your appetite.' : ''}
      </StepBody>
    </div>,
    <div key={3}>
      <StepKicker accent={C.blue}>Zoom level 4 · the sea</StepKicker>
      <StepTitle>{lv(3).pct}% skip borders entirely and name a sea.</StepTitle>
      <StepBody>
        “Mediterranean”, wrote {zoom.medCount} of them, plus Atlantic and Nordic voices: food cultures
        drawn by climate and coastline, not by parliaments. Olive oil doesn't stop at customs.
      </StepBody>
    </div>,
    <div key={4}>
      <StepKicker accent={C.berry}>Zoom level 5 · everywhere</StepKicker>
      <StepTitle>{mixLeads
        ? <>And the biggest group, {lv(4).pct}%, says: “a mix.”</>
        : leader === lv(4)
          ? <>“A mix” ({lv(4).pct}%) runs level with {runnerUp.short?.toLowerCase()} ({runnerUp.pct}%).</>
          : <>{lv(4).pct}% say: “a mix.”</>}</StepTitle>
      <StepBody>
        Zoom all the way out and the map shatters into a mosaic. {cap(shareText(lv(4).pct))} of our respondents say their
        food culture is a fusion with no single home, which is exactly what a childhood of pizza,
        ramen and grandmother's Sunday lunch produces.
      </StepBody>
    </div>,
    <div key={5}>
      <StepKicker accent={C.coral}>Why the map is dissolving</StepKicker>
      <StepTitle>{MIX_TITLE[mixCompare(zoom)]}</StepTitle>
      <StepBody>
        Among respondents who have lived abroad, {zoom.mixAbroadPct}% describe their food culture as a
        mix; among those who never left, {zoom.mixHomePct}%.
        {mixCompare(zoom) === 'ahead'
          ? ' Every suitcase from the Migrant Palate chapter is quietly redrawing this chart.'
          : mixCompare(zoom) === 'na' ? '' : ' Living abroad, on its own, does not seem to redraw this chart.'} Now pick your own zoom level and see whose side you're on.
      </StepBody>
    </div>,
  ];

  return (
    <Scrolly steps={steps} side="left" graphicCol="13fr 7fr" bg={C.bgWarm} lastStepVh={110}
      renderGraphic={step => (
        <CultureZoomGraphic geoData={geoData} zoom={zoom} respondentCountries={respondentCountries} step={step} />
      )} />
  );
}

// CHAPTER 5 — WHAT DRIVES THE PLATE (dual radar scrolly)

const UNIFIED_AXES = [
  { label: 'Price',       prose: 'price',        eat: ['Affordability'],                               buy: ['Price'] },
  { label: 'Convenience', prose: 'convenience',  eat: ['Convenience or ease of preparation'],          buy: ['Convenience or ease of preparation'] },
  { label: 'Social',      prose: 'socialising',  eat: ['Sharing / Socializing'],                       buy: [] },
  { label: 'Hunger',      prose: 'hunger',       eat: ['To satisfy hunger'],                           buy: [] },
  { label: 'Origin',      prose: 'origin',       eat: [],                                              buy: ['Origin / proximity'] },
  { label: 'Quality',     prose: 'quality',      eat: [],                                              buy: ['Quality'] },
  { label: 'Health',      prose: 'health',       eat: ['Health / Nutrition'],                          buy: ['Health / Nutrition'] },
  { label: 'Taste',       prose: 'taste',        eat: ['Taste and pleasure'],                          buy: ['Taste and Pleasure'] },
  { label: 'Ethics',      prose: 'ethics',       eat: ['Ethics / Animal Welfare / Labour Conditions'], buy: ['Ethics / Animal Welfare / Labour Conditions'] },
];

export function DriversScene({ respondents }) {
  const radarData = useMemo(() => {
    const eatCounts = {}, buyCounts = {};
    const eatTotal = respondents.filter(r => r.foodPriorities?.length > 0).length || 1;
    const buyTotal = respondents.filter(r => r.buyingInfluences?.length > 0).length || 1;
    respondents.forEach(r => {
      (r.foodPriorities || []).forEach(p => { eatCounts[p] = (eatCounts[p] || 0) + 1; });
      (r.buyingInfluences || []).forEach(b => { buyCounts[b] = (buyCounts[b] || 0) + 1; });
    });
    return UNIFIED_AXES.map(axis => ({
      label: axis.label,
      prose: axis.prose,
      hasEat: axis.eat.length > 0,
      hasBuy: axis.buy.length > 0,
      eatPct: Math.round(axis.eat.reduce((s, k) => s + (eatCounts[k] || 0), 0) / eatTotal * 100),
      buyPct: Math.round(axis.buy.reduce((s, k) => s + (buyCounts[k] || 0), 0) / buyTotal * 100),
    }));
  }, [respondents]);

  const quiet = useMemo(() => {
    const score = d => {
      const vals = [];
      if (d.hasEat) vals.push(d.eatPct);
      if (d.hasBuy) vals.push(d.buyPct);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : Infinity;
    };
    return [...radarData].sort((a, b) => score(a) - score(b)).slice(0, 2);
  }, [radarData]);
  const quietA = quiet[0], quietB = quiet[1];
  // "7% when eating, 6% when buying" / "11% when choosing what to eat"
  const quietNums = d => !d ? '' : (d.hasEat && d.hasBuy)
    ? `${d.eatPct}% when eating, ${d.buyPct}% when buying`
    : d.hasEat ? `${d.eatPct}% when choosing what to eat` : `${d.buyPct}% when buying`;

  const eatSorted = useMemo(() => [...radarData].sort((a, b) => b.eatPct - a.eatPct), [radarData]);
  const taste = eatSorted[0];
  const eatSecond = eatSorted[1];
  const eatThird = eatSorted[2];
  const price = radarData.find(d => d.label === 'Price');
  const tasteAxis = radarData.find(d => d.label === 'Taste');
  const eatLeadClear = taste && eatSecond && clearlyAhead(taste.eatPct, eatSecond.eatPct);
  const priceVsTaste = price && tasteAxis ? compareCounts(price.buyPct, tasteAxis.buyPct) : 'close';
  // the three values that speak loudest overall (same score as the quiet corner)
  const loudest = useMemo(() => {
    const score = d => { const v = []; if (d.hasEat) v.push(d.eatPct); if (d.hasBuy) v.push(d.buyPct); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : -1; };
    return [...radarData].sort((a, b) => score(b) - score(a)).slice(0, 3).map(d => d.prose);
  }, [radarData]);

  const steps = [
    <div key={0}>
      <StepKicker accent={C.turmeric}>Decision №1: the plate</StepKicker>
      <StepTitle>{eatLeadClear
        ? `Choosing what to eat starts with ${taste.prose}, then ${eatSecond.prose}.`
        : `Choosing what to eat: ${taste?.prose} and ${eatSecond?.prose}, neck and neck.`}</StepTitle>
      <StepBody>
        The golden shape maps what matters when deciding what to eat:{' '}
        {eatLeadClear
          ? <><strong>{taste?.label?.toLowerCase()}</strong> ({taste?.eatPct}%) leads, ahead of <strong>{eatSecond?.label?.toLowerCase()}</strong> ({eatSecond?.eatPct}%) and{' '}
            <strong>{eatThird?.label?.toLowerCase()}</strong> ({eatThird?.eatPct}%).</>
          : <><strong>{taste?.label?.toLowerCase()}</strong> ({taste?.eatPct}%) and <strong>{eatSecond?.label?.toLowerCase()}</strong> ({eatSecond?.eatPct}%) lead
            together, with <strong>{eatThird?.label?.toLowerCase()}</strong> ({eatThird?.eatPct}%) next.</>}
        {eatLeadClear && taste?.label === 'Taste'
          ? (eatSecond?.label === 'Health' ? ' Eating, it turns out, is still mostly about pleasure, with one eye on how good it is for you.' : ' Eating, it turns out, is still mostly about pleasure.')
          : ''}
      </StepBody>
    </div>,
    <div key={1}>
      <StepKicker accent={C.herb}>Decision №2: the till</StepKicker>
      <StepTitle>Walk into a supermarket, and the wallet starts talking.</StepTitle>
      <StepBody>
        The green dashed shape is the same people <em>buying</em> food: <strong>price</strong> ({price?.buyPct}%){' '}
        {priceVsTaste === 'ahead' ? 'overtakes' : priceVsTaste === 'close' ? 'rivals' : 'climbs, though it stays behind'}{' '}
        taste ({tasteAxis?.buyPct}%). Between the fork and the checkout, desire negotiates with budget, and the shape
        of the chart literally bends.
      </StepBody>
    </div>,
    <div key={2}>
      <StepKicker accent={C.coral}>The quiet corner</StepKicker>
      <StepTitle>
        The values <em style={{ color: C.coral }}>least</em> considered by this generation:{' '}
        <strong style={{ color: C.coral }}>{quietA?.prose}</strong> and{' '}
        <strong style={{ color: C.coral }}>{quietB?.prose}</strong>.
      </StepTitle>
      <StepBody>
        Look at the smallest spikes, not the biggest. <strong>{cap(quietA?.prose || '')}</strong> ({quietNums(quietA)})
        and <strong>{quietB?.prose}</strong> ({quietNums(quietB)}) sit at the chart's quiet edge: present,
        sincere, and rarely decisive. It's not a lack of good intentions, but a hierarchy of values
        where {loudest[0]}, {loudest[1]} and {loudest[2]} speak loudest.
      </StepBody>
    </div>,
    <div key={3}>
      <StepKicker accent={C.turmeric}>Your turn</StepKicker>
      <StepTitle>Hover each axis to compare both shapes.</StepTitle>
      <StepBody>
        Where do the two polygons disagree the most? That gap, between what we want at the table and what
        we choose at the till, is where most food decisions quietly happen.
      </StepBody>
    </div>,
  ];

  return (
    <Scrolly steps={steps} side="right" graphicCol="11fr 9fr" bg={C.bgSage}
      renderGraphic={step => (
        <div style={{ background: C.card, borderRadius: 24, padding: '28px 18px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)', maxWidth: 560, margin: '0 auto' }}>
          <ChartLegend items={[
            { color: C.turmeric, name: 'Choosing what to eat' },
            { color: C.herb, name: 'Buying food', dashed: true },
          ]} style={{ marginBottom: 6 }} />
          <DualRadar axes={radarData} size={430}
            showEat={true} showBuy={step >= 1}
            highlightAxes={step === 2 ? quiet.map(d => d.label) : null} />
        </div>
      )} />
  );
}

// CHAPTER 6 — THE POLITICS OF THE KITCHEN (radial races)

const COOK_FREQ_GROUPS = [
  { label: 'Every day', keys: ['Every day'] },
  { label: '4–6×/week', keys: ['Four days a week', 'Five days a week', 'Six days a week'] },
  { label: '1–3×/week', keys: ['Once a week', 'Twice a week', 'Three days a week'] },
  { label: 'Never', keys: ['Never'] },
];
const MERGED_HABITS = [
  { label: 'Home meal', keys: ['simple_home', 'elaborate_home'] },
  { label: 'Eat out', keys: ['eat_out'] },
  { label: 'Takeout / social', keys: ['pre_made', 'family_meals'] },
];

const FEEL_LEVELS = [
  { m: /my zone/i, short: 'My zone', icon: '🔥' },
  { m: /figure it out/i, short: "I'll figure it out", icon: '💪' },
  { m: /not confident/i, short: 'I manage', icon: '🌤️' },
  { m: /someone else/i, short: 'Someone else leads', icon: '🤝' },
  { m: /overwhelmed/i, short: 'Overwhelmed', icon: '🌀' },
];

export function KitchenScene({ respondents }) {
  const [feelPick, setFeelPick] = useState(null);

  const freqData = useMemo(() => {
    const females = respondents.filter(r => r.gender === 'Female');
    const males = respondents.filter(r => r.gender === 'Male');
    const fTotal = females.filter(r => r.howOftenCook).length || 1;
    const mTotal = males.filter(r => r.howOftenCook).length || 1;
    return COOK_FREQ_GROUPS.map(group => ({
      label: group.label,
      values: [
        Math.round(females.filter(r => group.keys.includes(r.howOftenCook)).length / fTotal * 100),
        Math.round(males.filter(r => group.keys.includes(r.howOftenCook)).length / mTotal * 100),
      ],
    })).filter(d => d.values.some(v => v > 0));
  }, [respondents]);

  const houseData = useMemo(() => {
    const compute = gender => {
      const filtered = respondents.filter(r => r.gender === gender);
      let myself = 0, others = 0;
      filtered.forEach(r => (r.householdResponsibility || []).forEach(v => {
        if (v === 'Myself') myself++; else others++;
      }));
      const total = myself + others || 1;
      return { myselfPct: Math.round(myself / total * 100), othersPct: Math.round(others / total * 100) };
    };
    const f = compute('Female'), m = compute('Male');
    return [
      { label: 'Myself', values: [f.myselfPct, m.myselfPct] },
      { label: 'Someone else', values: [f.othersPct, m.othersPct] },
    ];
  }, [respondents]);

  const incomeData = useMemo(() => {
    const W = { frequently: 2, sometimes: 1, rarely: -1, never: -2 };
    const byIncome = {
      Low: respondents.filter(r => r.socioeconomic === 'Low-income'),
      Middle: respondents.filter(r => r.socioeconomic === 'Middle-income'),
      High: respondents.filter(r => r.socioeconomic === 'High-income'),
    };
    return MERGED_HABITS.map(habit => ({
      label: habit.label,
      values: ['Low', 'Middle', 'High'].map(level => {
        let score = 0, counted = 0;
        byIncome[level].forEach(r => {
          if (!r.eatingHabits) return;
          let best = -2;
          habit.keys.forEach(k => {
            const v = r.eatingHabits[k];
            if (v && W[v] !== undefined && W[v] > best) best = W[v];
          });
          score += (best + 2); counted++;
        });
        return counted > 0 ? Math.round(score / (counted * 4) * 100) : 0;
      }),
    }));
  }, [respondents]);

  // feel_in_kitchen: confidence at the stove, by gender + overall (reader pick)
  const feelData = useMemo(() => {
    const females = respondents.filter(r => r.gender === 'Female' && r.feelInKitchen);
    const males = respondents.filter(r => r.gender === 'Male' && r.feelInKitchen);
    const fT = females.length || 1, mT = males.length || 1;
    return FEEL_LEVELS.map(lv => ({
      label: lv.short,
      values: [
        Math.round(females.filter(r => lv.m.test(r.feelInKitchen)).length / fT * 100),
        Math.round(males.filter(r => lv.m.test(r.feelInKitchen)).length / mT * 100),
      ],
    }));
  }, [respondents]);
  const feelOverall = useMemo(() => {
    const answered = respondents.filter(r => r.feelInKitchen);
    const t = answered.length || 1;
    return FEEL_LEVELS.map(lv => {
      const n = answered.filter(r => lv.m.test(r.feelInKitchen)).length;
      return { ...lv, n, pct: Math.round(n / t * 100) };
    });
  }, [respondents]);

  const everyDayF = freqData[0]?.values[0], everyDayM = freqData[0]?.values[1];
  const myselfF = houseData[0]?.values[0], myselfM = houseData[0]?.values[1];
  const zonePct = feelOverall[0]?.pct, lostPct = feelOverall[4]?.pct;
  const zoneF = feelData[0]?.values[0], zoneM = feelData[0]?.values[1];
  // compare women and men only when both groups are in the data
  const bothGenders = ['Female', 'Male'].every(g => respondents.filter(r => r.gender === g).length >= MIN_GROUP);
  const dailyGap = bothGenders ? compareCounts(everyDayF, everyDayM) : null;
  const houseGap = bothGenders ? compareCounts(myselfF, myselfM) : null;
  const zoneGap = bothGenders ? compareCounts(zoneF, zoneM) : null;
  const atEasePct = (feelOverall[0]?.pct || 0) + (feelOverall[1]?.pct || 0);
  // income trend per habit on its 0–100 score: rises / falls / steady (5-point margin)
  const incomeTrend = incomeData.map(h => ({ label: h.label, low: h.values[0], high: h.values[2],
    trend: compareOnScale(h.values[2], h.values[0], 0, 100) }));
  const TREND_EAT_OUT = { ahead: 'climbs with the pay cheque', behind: 'falls as income rises', close: 'holds steady across incomes' };
  const TREND_HOME = { ahead: 'rise with income', behind: 'fall as income rises', close: 'hold steady everywhere' };
  const eatOut = incomeTrend.find(h => h.label === 'Eat out');
  const homeMeal = incomeTrend.find(h => h.label === 'Home meal');
  const biggestMove = [...incomeTrend].sort((a, b) => Math.abs(b.high - b.low) - Math.abs(a.high - a.low))[0];
  const highN = respondents.filter(r => r.socioeconomic === 'High-income').length;

  const GENDER_SERIES = [{ color: C.coral, name: 'Women' }, { color: C.herb, name: 'Men' }];
  const INCOME_SERIES = [{ color: C.turmeric, name: 'Low income' }, { color: C.herb, name: 'Middle' }, { color: C.berry, name: 'High' }];

  const charts = [
    { title: <>How often do you <em style={{ color: C.turmeric }}>cook</em>?</>, data: freqData, series: GENDER_SERIES, size: 330, highlight: ['Every day'] },
    { title: <>Who <em style={{ color: C.turmeric }}>feeds the household</em>?</>, data: houseData, series: GENDER_SERIES, size: 270, highlight: ['Myself'] },
    { title: <>Habits by <em style={{ color: C.berry }}>income</em></>, data: incomeData, series: INCOME_SERIES, size: 300, highlight: ['Eat out'] },
    { title: <>How does the stove <em style={{ color: C.coral }}>feel</em>?</>, data: feelData, series: GENDER_SERIES, size: 330, highlight: ['My zone'] },
  ];

  const steps = [
    <div key={0}>
      <StepKicker>Old habits</StepKicker>
      <StepTitle>
        <span style={{ color: C.coral }}>{everyDayF}% of women</span> cook every single day.{' '}
        <span style={{ color: C.herb }}>{everyDayM}% of men</span> do the same.
      </StepTitle>
      <StepBody>
        Each track compares <strong style={{ color: C.coral }}>women</strong> and{' '}
        <strong style={{ color: C.herb }}>men</strong>.{' '}
        {dailyGap === 'ahead' ? 'The daily-cooking gap survives in a generation raised on equality: watch how the outer ring splits.'
          : dailyGap === 'close' ? 'On daily cooking the two are close: watch how little the outer ring splits.'
            : dailyGap === 'behind' ? 'Here men lead on daily cooking: watch how the outer ring splits.' : ''}
        {' '}Hover a track for exact numbers.
      </StepBody>
    </div>,
    <div key={1}>
      <StepKicker>The responsibility question</StepKicker>
      <StepTitle>“Who cooks in your household?” “Me,” say <span style={{ color: C.coral }}>{myselfF}% of women</span>.</StepTitle>
      <StepBody>
        <strong style={{ color: C.herb }}>Men</strong> answer “me” {myselfM}% of the time and point to someone
        else for the rest.{' '}
        {houseGap === 'ahead'
          ? 'The kitchen is still political: not in discourse or theory, but in who quietly turns up at the stove for the evening meal.'
          : houseGap === 'close'
            ? 'On this question the gap between women and men is small.'
            : houseGap === 'behind' ? 'On this question men answer “me” more often than women.' : ''}
      </StepBody>
    </div>,
    <div key={2}>
      <StepKicker>Follow the money</StepKicker>
      <StepTitle>{biggestMove && biggestMove.trend !== 'close'
        ? `${biggestMove.label === 'Eat out' ? 'Eating out' : biggestMove.label} ${biggestMove.trend === 'ahead' ? 'climbs' : 'falls'} with income.`
        : 'Income barely moves the menu.'}</StepTitle>
      <StepBody>
        Compare <strong style={{ color: C.turmeric }}>low</strong>, <strong style={{ color: C.herb }}>middle</strong> and{' '}
        <strong style={{ color: C.berry }}>high</strong> income: home meals {TREND_HOME[homeMeal?.trend || 'close']}{' '}
        ({homeMeal?.low} → {homeMeal?.high}), and <strong>eating out</strong> {TREND_EAT_OUT[eatOut?.trend || 'close']}{' '}
        ({eatOut?.low} → {eatOut?.high}).
        {eatOut?.trend === 'ahead' ? ' Freedom of choice, it turns out, comes with a price.' : ''}
        {highN < 50 ? ` Only ${plural(highN, 'respondent is', 'respondents are')} high-income, so read that end with care.` : ''}
      </StepBody>
    </div>,
    <div key={3}>
      <StepKicker accent={C.coral}>How it feels</StepKicker>
      <StepTitle>The kitchen is “my zone” for {zonePct}%. Only {lostPct}% feel lost in it.</StepTitle>
      <StepBody>
        Behind who cooks and how often, there's how it <em>feels</em>.{' '}
        {clearlyAhead(atEasePct, 50) ? 'Most of our respondents sound' : `${cap(shareText(atEasePct))} of our respondents sound`} at
        ease at the stove,{' '}
        {!zoneGap ? <>and {feelOverall[0]?.pct}% call it their zone.</>
          : zoneGap === 'close'
            ? <>and confidence barely differs by gender: {zoneF}% of women call the kitchen their zone, against {zoneM}% of men.</>
            : <>but the confidence splits by gender too: {zoneF}% of women call the kitchen their zone, against {zoneM}% of men.</>} Hover each track to compare all five answers, then pick your
        own under the chart and see how much company you have.
      </StepBody>
    </div>,
  ];

  return (
    <Scrolly steps={steps} side="right" graphicCol="11fr 9fr" bg={C.bgSage}
      renderGraphic={step => {
        const cfg = charts[Math.min(step, charts.length - 1)];
        return (
          <div key={step} style={{ background: C.card, borderRadius: 24, padding: '26px 20px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)', maxWidth: 520, margin: '0 auto',
            animation: 's3fadein 0.5s ease both' }}>
            <div style={{ fontFamily: C.fontTitle, fontSize: 20, color: C.text, textAlign: 'center', marginBottom: 6 }}>
              {cfg.title}
            </div>
            <ChartLegend items={cfg.series} style={{ marginBottom: 4 }} />
            <Reveal>{on => <RadialRace rows={cfg.data} series={cfg.series} size={cfg.size} visible={on} highlight={cfg.highlight} />}</Reveal>
            {step >= 3 && (
              <div style={{ marginTop: 6, textAlign: 'center' }}>
                <div style={{ fontFamily: C.font, fontSize: 12, color: C.textM, marginBottom: 8 }}>
                  And you? How does your kitchen feel?
                </div>
                <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {feelOverall.map((lv, i) => (
                    <button key={lv.short}
                      onClick={() => { setFeelPick(i); storylog('kitchen_feel_pick', { level: lv.short }); }}
                      style={{ border: `1.5px solid ${feelPick === i ? C.coral : 'rgba(61,43,31,0.18)'}`,
                        background: feelPick === i ? C.coralSoft : C.bg, color: feelPick === i ? C.coral : C.textM,
                        borderRadius: 999, padding: '6px 11px', fontFamily: C.font, fontSize: 11, fontWeight: 700,
                        cursor: 'pointer', transition: 'all 0.2s' }}>
                      {lv.icon} {lv.short}
                    </button>
                  ))}
                </div>
                {feelPick != null && (
                  <div style={{ marginTop: 8, fontFamily: C.font, fontSize: 12.5, color: C.text,
                    animation: 's3fadein 0.4s ease both' }}>
                    You stand with <strong style={{ color: C.coral }}>{feelOverall[feelPick].pct}%</strong> of
                    this generation ({feelOverall[feelPick].n} people).
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }} />
  );
}

const PANTRY_META = [
  { m: /^rice/i, short: 'Rice & pasta', emoji: '🍝' },
  { m: /^eggs/i, short: 'Eggs', emoji: '🥚' },
  { m: /^fresh fruit/i, short: 'Fresh fruit', emoji: '🍎' },
  { m: /^dairy/i, short: 'Dairy', emoji: '🥛' },
  { m: /^fresh vegetables/i, short: 'Fresh veg', emoji: '🥦' },
  { m: /^sauces/i, short: 'Sauces & spreads', emoji: '🫙' },
  { m: /^snacks/i, short: 'Snacks', emoji: '🍪' },
  { m: /^legumes/i, short: 'Legumes', emoji: '🫘' },
  { m: /^frozen proteins/i, short: 'Frozen protein', emoji: '🍗' },
  { m: /^plant/i, short: 'Plant-based', emoji: '🌱' },
  { m: /^frozen vegetables/i, short: 'Frozen veg', emoji: '🥕' },
  { m: /^nuts/i, short: 'Nuts & dried fruit', emoji: '🥜' },
];
const INFLUENCE_META = [
  { m: /parents/i, short: 'Parents & family' },
  { m: /^internet/i, short: 'Internet' },
  { m: /social media/i, short: 'Social media' },
  { m: /self-taught/i, short: 'Self-taught' },
  { m: /friends/i, short: 'Friends' },
  { m: /cultural background/i, short: 'Heritage' },
  { m: /cookbooks/i, short: 'Cookbooks' },
  { m: /restaurant/i, short: 'Restaurants' },
  { m: /classes/i, short: 'Classes' },
  { m: /community/i, short: 'Community' },
];
const HELP_META = [
  { m: /tips and tricks/i, l1: 'Tips on health,', l2: 'nutrition & cooking' },
  { m: /video tutorials/i, l1: 'Step-by-step', l2: 'video tutorials' },
  { m: /meal plans/i, l1: 'Weekly', l2: 'meal plans' },
  { m: /classes or workshops/i, l1: 'Classes &', l2: 'workshops' },
  { m: /mobile app/i, l1: 'A guided', l2: 'mobile app' },
  { m: /ai tool/i, l1: 'AI cooking', l2: 'advice' },
];

function buildCupboard(respondents) {
  const has = (arr, re) => (arr || []).some(v => re.test(v));
  const stockedN = respondents.filter(r => r.stockedFoodItems?.length).length || 1;
  const pantry = PANTRY_META.map(meta => {
    const n = respondents.filter(r => has(r.stockedFoodItems, meta.m)).length;
    return { ...meta, n, pct: Math.round(n / stockedN * 100) };
  }).sort((a, b) => b.n - a.n);

  const influences = INFLUENCE_META.map(meta => {
    const n = respondents.filter(r => has(r.influencesOnCooking, meta.m)).length;
    return { ...meta, n };
  }).sort((a, b) => b.n - a.n);

  const helpN = respondents.filter(r => r.helpImproveOptions?.length).length || 1;
  const helps = HELP_META.map(meta => {
    const n = respondents.filter(r => has(r.helpImproveOptions, meta.m)).length;
    return { ...meta, n, pct: Math.round(n / helpN * 100) };
  }).sort((a, b) => b.n - a.n);

  const improveAns = respondents.filter(r => r.improveSkills === 'Yes' || r.improveSkills === 'No');
  const improvePct = Math.round(improveAns.filter(r => r.improveSkills === 'Yes').length / (improveAns.length || 1) * 100);

  const daily = respondents.filter(r => r.howOftenCook === 'Every day' && r.approachCooking?.length);
  const dailyIntuition = Math.round(daily.filter(r => r.approachCooking.some(v => /memory|improvise/i.test(v))).length / (daily.length || 1) * 100);

  return { pantry, influences, helps, improvePct, dailyIntuition, stockedN, helpN };
}

const CUP_W = 840, CUP_H = 640;
const SHELF_YS = [215, 375];   // pantry boards (6 jars each)
const BOOK_Y = 540;            // book shelf board

function CupboardGraphic({ data, step }) {
  const [tip, setTip] = useState(null);
  const [mine, setMine] = useState(() => new Set());
  const explore = step >= 4;

  const pantryOp = step <= 1 || explore ? 1 : 0.18;
  const booksOp = step === 2 || explore ? 1 : (step <= 1 ? 0.3 : 0.18);
  const doorOp = step === 3 || explore ? 1 : 0.22;
  const top3 = new Set(data.pantry.slice(0, 3).map(p => p.short));

  const jarTints = ['#FBEFD9', '#F3E4CB', '#F8EAD4'];
  const bookCols = [C.coral, C.blue, C.berry, C.turmeric, C.herb];
  const noteCols = ['#FFF1B8', '#FFE0D0', '#E6F0D8'];
  const maxInf = data.influences[0]?.n || 1;

  const toggleMine = short => {
    if (!explore) return;
    setMine(prev => {
      const next = new Set(prev);
      if (next.has(short)) next.delete(short); else next.add(short);
      return next;
    });
    storylog('cupboard_tick', { item: short });
  };
  const mineArr = data.pantry.filter(p => mine.has(p.short));
  const mineAvg = mineArr.length ? Math.round(mineArr.reduce((s, p) => s + p.pct, 0) / mineArr.length) : 0;

  const hov = (e, payload) => setTip({ ...payload, mx: e.clientX, my: e.clientY });
  const move = e => setTip(prev => prev ? { ...prev, mx: e.clientX, my: e.clientY } : null);
  const out = () => setTip(null);

  return (
    <div style={{ position: 'relative', maxWidth: 780, margin: '0 auto' }}>
      <svg viewBox={`0 0 ${CUP_W} ${CUP_H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* wall + floor */}
        <rect x="0" y="0" width={CUP_W} height={CUP_H} fill="#FAF1E2" rx="18" />
        <rect x="0" y="598" width={CUP_W} height="42" fill="#E5D3B3" rx="8" />

        {/* cupboard body */}
        <rect x="28" y="34" width="562" height="570" rx="10" fill="#B9895A" />
        <rect x="44" y="50" width="530" height="538" rx="6" fill="#F9F0DE" />

        {/* pantry shelves */}
        <g style={{ opacity: pantryOp, transition: 'opacity 0.6s' }}>
          {SHELF_YS.map((sy, si) => (
            <g key={si}>
              {data.pantry.slice(si * 6, si * 6 + 6).map((p, i) => {
                const slotX = 52 + i * 87 + 43;
                const h = 26 + p.pct * 1.05;
                const w = 60;
                const yTop = sy - h;
                const isTop3 = top3.has(p.short);
                const ticked = mine.has(p.short);
                return (
                  <g key={p.short} onClick={() => toggleMine(p.short)}
                    onMouseEnter={e => hov(e, { kind: 'jar', ...p })} onMouseMove={move} onMouseLeave={out}
                    style={{ cursor: explore ? 'pointer' : 'default' }}>
                    <rect x={slotX - 16} y={yTop - 8} width="32" height="9" rx="3" fill="#C89B66" />
                    <rect x={slotX - w / 2} y={yTop} width={w} height={h} rx="9"
                      fill={jarTints[(si * 6 + i) % 3]}
                      stroke={ticked ? C.herb : (step === 1 && isTop3 ? C.coral : 'rgba(61,43,31,0.25)')}
                      strokeWidth={ticked || (step === 1 && isTop3) ? 3 : 1.2}
                      style={{ transition: 'stroke 0.4s, stroke-width 0.4s' }} />
                    <text x={slotX} y={yTop + 24} textAnchor="middle" style={{ fontSize: 20, pointerEvents: 'none' }}>
                      {p.emoji}
                    </text>
                    {h > 58 && (
                      <text x={slotX} y={sy - 10} textAnchor="middle" style={{ fontFamily: C.font, fontSize: 11.5,
                        fontWeight: 800, fill: C.ink, pointerEvents: 'none' }}>
                        {p.pct}%
                      </text>
                    )}
                    {ticked && (
                      <text x={slotX + w / 2 - 8} y={yTop + 14} textAnchor="middle"
                        style={{ fontFamily: C.font, fontSize: 13, fontWeight: 900, fill: C.herb, pointerEvents: 'none' }}>
                        ✓
                      </text>
                    )}
                  </g>
                );
              })}
              <rect x="44" y={sy} width="530" height="12" rx="3" fill="#C89B66" />
            </g>
          ))}
        </g>

        {/* the learning shelf: who taught them, as book spines */}
        <g style={{ opacity: booksOp, transition: 'opacity 0.6s' }}>
          {(() => {
            let x = 56;
            return data.influences.map((inf, i) => {
              const t = inf.n / maxInf;
              const w = 20 + t * 30;
              const h = 88 + t * 30;
              const el = (
                <g key={inf.short}
                  onMouseEnter={e => hov(e, { kind: 'book', ...inf })} onMouseMove={move} onMouseLeave={out}
                  style={{ cursor: 'default' }}>
                  <rect x={x} y={BOOK_Y - h} width={w} height={h + 4} rx="2.5"
                    fill={bookCols[i % bookCols.length]}
                    stroke={step === 2 && i < 3 ? '#FFF' : 'rgba(61,43,31,0.25)'}
                    strokeWidth={step === 2 && i < 3 ? 2 : 0.8}
                    opacity="0.92" style={{ transition: 'stroke 0.4s' }} />
                  <text transform={`translate(${x + w / 2 + 3.5}, ${BOOK_Y - h / 2}) rotate(-90)`}
                    textAnchor="middle" style={{ fontFamily: C.font, fontSize: 9.5, fontWeight: 700,
                    fill: '#FFF', pointerEvents: 'none' }}>
                    {inf.short} · {inf.n}
                  </text>
                </g>
              );
              x += w + 5;
              return el;
            });
          })()}
          <rect x="44" y={BOOK_Y} width="530" height="12" rx="3" fill="#C89B66" />
          <text x="60" y={BOOK_Y + 34} style={{ fontFamily: C.font, fontSize: 10.5, fontWeight: 800,
            letterSpacing: 1.6, textTransform: 'uppercase', fill: 'rgba(61,43,31,0.45)' }}>
            THE LEARNING SHELF · who taught them to cook
          </text>
        </g>

        {/* the door: ambitions */}
        <g style={{ opacity: doorOp, transition: 'opacity 0.6s' }}>
          <rect x="602" y="34" width="212" height="570" rx="10" fill="#A97C4F" />
          <rect x="612" y="44" width="192" height="550" rx="6" fill="#C69A6B" />
          <circle cx="618" cy="320" r="5" fill="#7A542F" />

          {/* the 'want to improve' badge */}
          <g onMouseEnter={e => hov(e, { kind: 'badge' })} onMouseMove={move} onMouseLeave={out}>
            <circle cx="708" cy="106" r="44" fill={C.coral} stroke="#FFF" strokeWidth="3" />
            <text x="708" y="102" textAnchor="middle" style={{ fontFamily: C.fontTitle, fontSize: 24,
              fontWeight: 800, fill: '#FFF' }}>{data.improvePct}%</text>
            <text x="708" y="118" textAnchor="middle" style={{ fontFamily: C.font, fontSize: 8.5,
              fontWeight: 700, fill: 'rgba(255,255,255,0.92)' }}>want to improve</text>
            <text x="708" y="128" textAnchor="middle" style={{ fontFamily: C.font, fontSize: 8.5,
              fontWeight: 700, fill: 'rgba(255,255,255,0.92)' }}>their cooking</text>
          </g>

          {/* post-its: what would help */}
          {(() => {
            const colY = [172, 172];
            return data.helps.map((hlp, i) => {
              const col = i % 2;
              const x = col === 0 ? 622 : 716;
              const h = 44 + hlp.pct * 0.42;
              const y = colY[col];
              colY[col] += h + 11;
              return (
                <g key={hlp.l1 + hlp.l2} transform={`translate(${x}, ${y}) rotate(${i % 2 ? 2 : -2})`}
                  onMouseEnter={e => hov(e, { kind: 'note', ...hlp })} onMouseMove={move} onMouseLeave={out}>
                  <rect width="82" height={h} rx="3" fill={noteCols[i % 3]}
                    stroke="rgba(61,43,31,0.18)" strokeWidth="0.8" />
                  <circle cx="41" cy="6" r="3" fill="rgba(61,43,31,0.28)" />
                  <text x="41" y="22" textAnchor="middle" style={{ fontFamily: C.font, fontSize: 8.4, fill: C.ink }}>{hlp.l1}</text>
                  <text x="41" y="32" textAnchor="middle" style={{ fontFamily: C.font, fontSize: 8.4, fill: C.ink }}>{hlp.l2}</text>
                  <text x="41" y={h - 8} textAnchor="middle" style={{ fontFamily: C.font, fontSize: 12,
                    fontWeight: 800, fill: C.coral }}>{hlp.pct}%</text>
                </g>
              );
            });
          })()}

          {/* the retired recipe book's note */}
          <g transform="translate(622, 526) rotate(1.5)"
            onMouseEnter={e => hov(e, { kind: 'recipe' })} onMouseMove={move} onMouseLeave={out}>
            <rect width="172" height="52" rx="4" fill="#FFFDF6" stroke="rgba(61,43,31,0.2)" />
            <text x="86" y="20" textAnchor="middle" style={{ fontFamily: C.fontTitle, fontSize: 9,
              fontStyle: 'italic', fill: C.textM }}>The daily cooks barely</text>
            <text x="86" y="32" textAnchor="middle" style={{ fontFamily: C.fontTitle, fontSize: 9,
              fontStyle: 'italic', fill: C.textM }}>open me any more</text>
            <text x="86" y="44" textAnchor="middle" style={{ fontFamily: C.font, fontSize: 7.5,
              fill: C.textL }}>· signed, the recipe book</text>
          </g>
        </g>
      </svg>

      {/* your-cupboard overlap readout */}
      {explore && (
        <div style={{ marginTop: 8, textAlign: 'center', fontFamily: C.font, fontSize: 13, color: C.textM,
          minHeight: 22, animation: 's3fadein 0.5s ease both' }}>
          {mine.size === 0
            ? <>Tap the jars you also keep at home and measure your own cupboard.</>
            : <>You keep <strong style={{ color: C.coral }}>{mine.size} of the 12 staples</strong>: the items
              you ticked sit in an average of <strong style={{ color: C.herb }}>{mineAvg}%</strong> of
              European kitchens.</>}
        </div>
      )}

      {tip && (
        <Tip mx={tip.mx} my={tip.my}>
          {tip.kind === 'jar' && (
            <>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{tip.short}</div>
              <div style={{ fontSize: 12 }}>always in <span style={{ color: '#ff9b85', fontWeight: 700 }}>{tip.pct}%</span> of kitchens ({tip.n} of {data.stockedN})</div>
            </>
          )}
          {tip.kind === 'book' && (
            <>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{tip.short}</div>
              <div style={{ fontSize: 12 }}><span style={{ color: '#8fcf6a', fontWeight: 700 }}>{tip.n}</span> say it taught them to cook</div>
            </>
          )}
          {tip.kind === 'note' && (
            <>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{tip.l1} {tip.l2}</div>
              <div style={{ fontSize: 12 }}><span style={{ color: '#ff9b85', fontWeight: 700 }}>{tip.n}</span> would find it helpful ({tip.pct}%)</div>
            </>
          )}
          {tip.kind === 'badge' && (
            <div style={{ fontSize: 12 }}>“Would you like to improve your cooking skills?” · <span style={{ color: '#ff9b85', fontWeight: 700 }}>{data.improvePct}%</span> said yes</div>
          )}
          {tip.kind === 'recipe' && (
            <div style={{ fontSize: 12 }}>Among people who cook every day, <span style={{ color: '#8fcf6a', fontWeight: 700 }}>{data.dailyIntuition}%</span> rely on memory and improvisation rather than recipes.</div>
          )}
        </Tip>
      )}
    </div>
  );
}

const STYLE_KEYS = ['Traditional / Classic', 'Comforting / Homestyle', 'Healthy / Balanced',
  'Experimental / Creative', 'Fusion', 'Survival / Quick / Simple', 'Chaotic / No rules',
  'Sustainable / Ethical', 'Trendy / Contemporary'];

export function KitchenSelfScene({ respondents }) {
  const data = useMemo(() => buildCupboard(respondents), [respondents]);
  const p0 = data.pantry[0], p1 = data.pantry[1], p2 = data.pantry[2];
  const fam = data.influences.find(i => i.short === 'Parents & family');
  const net = data.influences.find(i => i.short === 'Internet');
  const soc = data.influences.find(i => i.short === 'Social media');
  const helpName = h => h ? `“${h.l1} ${h.l2}”`.toLowerCase() : '';
  const [h0, h1, h2] = data.helps;
  const teach = fam && net ? compareCounts(fam.n, net.n) : 'close';
  const everydayTop = useMemo(() => computeBubbleNodes(respondents, {}).nodes.slice(0, 3).map(n => n.name.toLowerCase()), [respondents]);

  const styleCross = useMemo(() => {
    const isConfident = r => /my zone|figure it out/i.test(r.feelInKitchen || '');
    const withBoth = respondents.filter(r => r.feelInKitchen && r.cookingStyles?.length);
    const confident = withBoth.filter(isConfident);
    const unsure = withBoth.filter(r => !isConfident(r));
    const cT = confident.length || 1, uT = unsure.length || 1;
    const rows = STYLE_KEYS.map(k => {
      const c = Math.round(confident.filter(r => r.cookingStyles.includes(k)).length / cT * 100);
      const u = Math.round(unsure.filter(r => r.cookingStyles.includes(k)).length / uT * 100);
      const total = withBoth.filter(r => r.cookingStyles.includes(k)).length;
      return { label: k.split(' / ')[0], c, u, gap: c - u, total };
    }).sort((a, b) => b.total - a.total).slice(0, 7);
    const boldGap = [...rows].sort((a, b) => b.gap - a.gap)[0];
    const shyGap = [...rows].sort((a, b) => a.gap - b.gap)[0];
    const enough = confident.length >= MIN_GROUP && unsure.length >= MIN_GROUP;
    return { rows, boldGap: enough ? boldGap : null, shyGap: enough ? shyGap : null, cN: confident.length, uN: unsure.length };
  }, [respondents]);

  const steps = [
    <div key={0}>
      <StepKicker accent={C.turmeric}>The universal pantry</StepKicker>
      <StepTitle>{p0?.pct}% of kitchens keep the same first jar: {p0?.short.toLowerCase()}.</StepTitle>
      <StepBody>
        Every jar on these shelves is sized by how many of the {data.stockedN} households always have it
        at home. The top shelf: {p0?.short.toLowerCase()} ({p0?.pct}%),{' '}
        {p1?.short.toLowerCase()} ({p1?.pct}%), {p2?.short.toLowerCase()} ({p2?.pct}%).
        {p2 && clearlyAhead(p2.pct, 50) ? ' All three sit in most kitchens: people argue about recipes, not about what\'s in the cupboard.' : ''}
      </StepBody>
    </div>,
    <div key={1}>
      <StepKicker accent={C.coral}>The comfort backbone</StepKicker>
      <StepTitle>The dartboard chapter, explained from the shelf up.</StepTitle>
      <StepBody>
        Remember which dishes filled the everyday plate: {everydayTop.join(', ')}. The three highlighted jars
        are the raw material of many of the big bubbles in Chapter 3: cheap, patient ingredients that wait
        in the cupboard for a busy Tuesday.
      </StepBody>
    </div>,
    <div key={2}>
      <StepKicker accent={C.blue}>The learning shelf</StepKicker>
      <StepTitle>Who taught them to cook? Family: {fam?.n}. The internet: {net?.n}.</StepTitle>
      <StepBody>
        {teach === 'close' ? 'Neck and neck.' : teach === 'ahead' ? 'Family still leads.' : 'The internet has overtaken the family.'}{' '}
        Parents and family taught {fam?.n} of them; the internet taught {net?.n}, and social
        media another {soc?.n}.{' '}
        {teach === 'close'
          ? 'The thickest books on this shelf tell the transmission story of our era: the family cookbook now shares its shelf with the algorithm, at nearly equal thickness.'
          : teach === 'ahead'
            ? 'The family cookbook is still the thickest book on the shelf, with the algorithm behind it.'
            : 'The algorithm is now the thickest book on the shelf.'}
      </StepBody>
    </div>,
    <div key={3}>
      <StepKicker accent={C.berry}>The house style</StepKicker>
      <StepTitle>{styleCross.boldGap && clearlyAhead(styleCross.boldGap.c, styleCross.boldGap.u)
        ? 'Confidence changes what a kitchen dares to cook.' : 'Confidence barely changes what a kitchen cooks.'}</StepTitle>
      <StepBody>
        We also asked everyone to describe their own cooking style. Split the room by how they feel at
        the stove and {!styleCross.boldGap || !clearlyAhead(styleCross.boldGap.c, styleCross.boldGap.u)
          ? 'the menu barely shifts between the two groups.' : 'the menu shifts: '}
        {styleCross.boldGap && clearlyAhead(styleCross.boldGap.c, styleCross.boldGap.u) && <>the confident lean into{' '}
        <strong style={{ color: C.coral }}>{styleCross.boldGap?.label.toLowerCase()}</strong> cooking
        ({styleCross.boldGap?.c}% vs {styleCross.boldGap?.u}%)
        {styleCross.shyGap && clearlyAhead(styleCross.shyGap.u, styleCross.shyGap.c) && <>, while the less sure default to{' '}
          <strong>{styleCross.shyGap.label.toLowerCase()}</strong> ({styleCross.shyGap.u}% vs {styleCross.shyGap.c}%)</>}.
        {' '}Style, it seems, is something confidence buys.</>}
      </StepBody>
    </div>,
    <div key={4}>
      <StepKicker accent={C.herb}>The door of ambitions</StepKicker>
      <StepTitle>{data.improvePct}% want to be better cooks than they are.</StepTitle>
      <StepBody>
        This is not a generation that has given up on the kitchen. {cap(shareText(data.improvePct))} want to improve,
        and their wish list is pinned to the door:{' '}
        {h0 && h1 && !clearlyAhead(h0.n, h1.n)
          ? <>{helpName(h0)} and {helpName(h1)} top it almost level{h2 ? <>, then {helpName(h2)}</> : null}.</>
          : <>{helpName(h0)} come first{h1 ? <>, ahead of {helpName(h1)}{h2 ? <> and {helpName(h2)}</> : null}</> : null}.</>}
        {' '}The appetite to learn is there; it's the syllabus that moved.
      </StepBody>
    </div>,
    <div key={5}>
      <StepKicker accent={C.coral}>Your turn</StepKicker>
      <StepTitle>Audit your own cupboard.</StepTitle>
      <StepBody>
        Tap the jars you also keep at home and see how “standard issue” your kitchen really is. Then
        hover the books, the post-its, and the small note the recipe book left on the door.
      </StepBody>
    </div>,
  ];

  return (
    <Scrolly steps={steps} side="left" graphicCol="13fr 7fr" bg={C.bg} lastStepVh={110}
      renderGraphic={step => {
        const cupStep = step <= 2 ? step : step === 3 ? 2 : step - 1;
        const showStyles = step === 3;
        return (
          <div style={{ position: 'relative' }}>
            <div style={{ opacity: showStyles ? 0.14 : 1, transition: 'opacity 0.7s',
              pointerEvents: showStyles ? 'none' : 'auto' }}>
              <CupboardGraphic data={data} step={cupStep} />
            </div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', opacity: showStyles ? 1 : 0, transition: 'opacity 0.7s',
              pointerEvents: showStyles ? 'auto' : 'none' }}>
              <div style={{ background: C.card, borderRadius: 24, padding: '24px 26px', width: '100%',
                maxWidth: 520, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                <div style={{ fontFamily: C.fontTitle, fontSize: 19, color: C.text, textAlign: 'center', marginBottom: 4 }}>
                  “How would you describe your cooking?”
                </div>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontFamily: C.font,
                  fontSize: 11.5, color: C.textM, marginBottom: 14, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 11, height: 11, borderRadius: 3, background: C.coral }} />
                    confident at the stove ({styleCross.cN})
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 11, height: 11, borderRadius: 3, background: 'rgba(61,43,31,0.30)' }} />
                    still finding their feet ({styleCross.uN})
                  </span>
                </div>
                {styleCross.rows.map(row => (
                  <div key={row.label} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: C.font,
                      fontSize: 12, color: C.text, marginBottom: 3 }}>
                      <span style={{ fontWeight: 600 }}>{row.label}</span>
                      <span style={{ fontSize: 11.5 }}>
                        <strong style={{ color: C.coral }}>{row.c}%</strong>
                        <span style={{ color: C.textL }}> / </span>
                        <strong style={{ color: C.textM }}>{row.u}%</strong>
                      </span>
                    </div>
                    {[{ v: row.c, col: C.coral }, { v: row.u, col: 'rgba(61,43,31,0.30)' }].map((b, i) => (
                      <div key={i} style={{ height: 6, borderRadius: 3, background: 'rgba(61,43,31,0.05)',
                        overflow: 'hidden', marginBottom: 2 }}>
                        <div style={{ height: '100%', borderRadius: 3, background: b.col,
                          width: showStyles ? `${Math.max(b.v, 1)}%` : 0,
                          transition: 'width 0.9s cubic-bezier(0.22,1,0.36,1) 0.15s' }} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }} />
  );
}

// CHAPTER 7 — THE MIGRANT PALATE (map + impact crossfade)

const EUROPEAN_COUNTRIES = new Set([
  'Albania','Andorra','Austria','Belarus','Belgium','Bosnia and Herzegovina','Bulgaria',
  'Croatia','Cyprus','Czech Republic','Czechia','Denmark','Estonia','Finland','France',
  'Germany','Greece','Hungary','Iceland','Ireland','Italy','Kosovo','Latvia','Liechtenstein',
  'Lithuania','Luxembourg','Malta','Moldova','Monaco','Montenegro','Netherlands','North Macedonia',
  'Norway','Poland','Portugal','Romania','Russia','San Marino','Serbia','Slovakia','Slovenia',
  'Spain','Sweden','Switzerland','Turkey','Ukraine','United Kingdom','Vatican City',
]);
const DURATION_GROUPS = [
  { key: 'Less than 6 months', short: '< 6 months', color: '#7BA05B' },
  { key: 'Between 6 and 12 months', short: '6–12 months', color: '#2E86AB' },
  { key: 'More than 1 year', short: '> 1 year', color: '#C84B31' },
];
const IMPACT_ORDER = ['Completely', 'A lot', 'Somewhat', 'Little', 'Not at all'];

// rotating "in their words" card: cycles through short specify_impact quotes
function QuoteTicker({ quotes }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (quotes.length < 2) return undefined;
    const t = setInterval(() => setIdx(i => (i + 1) % quotes.length), 6000);
    return () => clearInterval(t);
  }, [quotes.length]);
  if (!quotes.length) return null;
  return (
    <div style={{ marginTop: 12, padding: '12px 16px', background: C.bgWarm, borderRadius: 12,
      textAlign: 'center', minHeight: 58 }}>
      <div style={{ fontFamily: C.font, fontSize: 9.5, fontWeight: 800, letterSpacing: 1.6,
        textTransform: 'uppercase', color: C.textL, marginBottom: 4 }}>
        in their words
      </div>
      <div key={idx} style={{ fontFamily: C.font, fontSize: 12.5, color: C.textM, fontStyle: 'italic',
        lineHeight: 1.55, animation: 's3fadein 0.6s ease both' }}>
        “{quotes[idx]}”
      </div>
    </div>
  );
}

function MigrantGraphic({ geoData, destinations, migrantByCountry, step, durationData, quotes }) {
  const [selIdx, setSelIdx] = useState(0);
  const [mapTip, setMapTip] = useState(null);
  const explore = step >= 3;
  const showImpact = step === 2;
  const selected = destinations[explore ? selIdx : 0] || null;

  const conf = useMemo(() => {
    const fills = {};
    let arcs = [], dots = [], view = WORLD_VIEW;
    if (step === 0) {
      view = { center: [14, 50], scale: 1.5 };
      const nets = Object.entries(migrantByCountry)
        .map(([c, v]) => ({ c, net: (v.wentTo || 0) - (v.cameFrom || 0), tot: (v.wentTo || 0) + (v.cameFrom || 0) }))
        .filter(x => EUROPEAN_COUNTRIES.has(x.c) && x.tot > 0);
      const maxNet = Math.max(...nets.map(x => Math.abs(x.net)), 1);
      nets.forEach(({ c, net }) => {
        if (net === 0) {
          fills[c] = { fill: 'rgba(140,140,120,0.16)', stroke: 'rgba(140,140,120,0.40)', sw: 0.5 };
          return;
        }
        const t = Math.sqrt(Math.abs(net) / maxNet);
        const a = 0.28 + 0.6 * t;
        const rgb = net > 0 ? '200,75,49' : '90,122,58';
        fills[c] = { fill: `rgba(${rgb},${a})`, stroke: `rgba(${rgb},${Math.min(1, a + 0.22)})`, sw: 0.7 };
      });
    } else if (selected) {
      view = { center: [8, 47], scale: 1.75 };
      fills[selected.country] = { fill: `${C.coral}55`, stroke: C.coral, sw: 1.4 };
      const maxO = Math.max(...Object.values(selected.origins), 1);
      Object.entries(selected.origins).forEach(([o, n]) => {
        if (o === selected.country) return;
        const t = 0.15 + 0.85 * (n / maxO);
        fills[o] = fills[o] || { fill: `rgba(90,122,58,${t * 0.5})`, stroke: `rgba(90,122,58,${t * 0.7})`, sw: 0.7 };
      });
      arcs = Object.entries(selected.origins)
        .filter(([o]) => o !== selected.country && ccoord(o) && ccoord(selected.country))
        .sort((a, b) => b[1] - a[1]).slice(0, 14)
        .map(([o, n]) => ({ from: o, to: selected.country, color: C.herb, n, opacity: 0.55 }));
      dots = [{ at: selected.country, color: C.coral, r: 6, pulse: true, label: selected.country }];
    }
    return { fills, arcs, dots, view };
  }, [step, selected, migrantByCountry]);

  const handleHover = (name, e) => {
    const info = migrantByCountry[name];
    if (!info || (!info.wentTo && !info.cameFrom)) { setMapTip(null); return; }
    setMapTip({ name, info, mx: e.clientX, my: e.clientY });
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* map layer */}
      <div style={{ opacity: showImpact ? 0 : 1, transition: 'opacity 0.7s', pointerEvents: showImpact ? 'none' : 'auto' }}>
        <div style={{ background: C.card, borderRadius: 16, padding: 12, boxShadow: '0 4px 24px rgba(61,43,31,0.08)' }}>
          <StoryMap geoData={geoData} view={conf.view} fills={conf.fills} arcs={conf.arcs} dots={conf.dots}
            stepKey={`${step}-${selected?.country}`}
            onCountryHover={handleHover} onCountryLeave={() => setMapTip(null)} />
        </div>
        {explore && (
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 5, maxHeight: 86, overflowY: 'auto',
            animation: 's3fadein 0.6s ease both' }}>
            {destinations.map((d, i) => {
              const isSel = i === selIdx;
              return (
                <button key={d.country} onClick={() => { setSelIdx(i); storylog('migrant_dest', { country: d.country }); }}
                  style={{ border: 'none', borderRadius: 16, padding: '5px 12px', cursor: 'pointer',
                    background: isSel ? C.coral : C.card, color: isSel ? '#fff' : C.text,
                    fontFamily: C.font, fontSize: 11.5, fontWeight: 600,
                    boxShadow: isSel ? `0 2px 10px ${C.coralGlow}` : '0 1px 4px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s' }}>
                  {d.country} <span style={{ opacity: 0.65, fontSize: 10 }}>{d.outsiders}</span>
                </button>
              );
            })}
          </div>
        )}
        {step === 0 && (
          <div style={{ marginTop: 10, display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap',
            fontFamily: C.font, fontSize: 12, color: C.textM }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 13, height: 13, borderRadius: 3, background: 'rgba(200,75,49,0.78)' }} /> drew more people in
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 13, height: 13, borderRadius: 3, background: 'rgba(90,122,58,0.78)' }} /> sent more people out
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 13, height: 13, borderRadius: 3, background: 'rgba(140,140,120,0.4)' }} /> evenly balanced
            </span>
          </div>
        )}
        {selected && step >= 1 && !showImpact && (
          <div style={{ marginTop: 8, fontFamily: C.font, fontSize: 12, color: C.textM, textAlign: 'center' }}>
            <strong style={{ color: C.coral }}>{selected.country}</strong> drew {selected.outsiders} of our respondents
            {Object.keys(selected.origins).length ? <>, mostly from {Object.entries(selected.origins).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([o]) => o).join(', ')}</> : null}
          </div>
        )}
      </div>

      {/* impact layer (crossfade) */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: showImpact ? 1 : 0, transition: 'opacity 0.7s', pointerEvents: showImpact ? 'auto' : 'none' }}>
        <div style={{ background: C.card, borderRadius: 24, padding: '24px 20px', width: '100%', maxWidth: 520,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ fontFamily: C.fontTitle, fontSize: 19, color: C.text, textAlign: 'center', marginBottom: 6 }}>
            “How much did living abroad <em style={{ color: C.coral }}>change</em> how you eat?”
          </div>
          <ChartLegend items={DURATION_GROUPS.map(g => ({ color: g.color, name: g.short }))} style={{ marginBottom: 4 }} />
          {showImpact && <Reveal>{on => (
            <RadialRace rows={durationData} size={330} visible={on}
              series={DURATION_GROUPS.map(g => ({ color: g.color, name: g.short }))} />
          )}</Reveal>}
          {showImpact && <QuoteTicker quotes={quotes?.featured || []} />}
        </div>
      </div>

      {mapTip && (() => {
        const mc = mapTip.info;
        const topOrigins = Object.entries(mc.topOrigins).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const topDests = Object.entries(mc.topDests).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const countryQuotes = quotes?.byDest?.[mapTip.name] || [];
        const quote = countryQuotes.length ? countryQuotes[mapTip.name.length % countryQuotes.length] : null;
        return (
          <Tip mx={mapTip.mx} my={mapTip.my}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 5 }}>{mapTip.name}</div>
            <div style={{ display: 'flex', gap: 14, marginBottom: 5 }}>
              {mc.wentTo > 0 && <div><span style={{ color: '#ff9b85', fontWeight: 700, fontSize: 17 }}>{mc.wentTo}</span><span style={{ fontSize: 11, opacity: 0.75 }}> moved here</span></div>}
              {mc.cameFrom > 0 && <div><span style={{ color: '#8fcf6a', fontWeight: 700, fontSize: 17 }}>{mc.cameFrom}</span><span style={{ fontSize: 11, opacity: 0.75 }}> left from here</span></div>}
            </div>
            {topOrigins.length > 0 && (
              <div style={{ fontSize: 11, marginBottom: 3 }}>
                <span style={{ opacity: 0.55, textTransform: 'uppercase', fontSize: 9.5, letterSpacing: 1 }}>arrived from </span>
                {topOrigins.map(([cn, n]) => `${cn} (${n})`).join(', ')}
              </div>
            )}
            {topDests.length > 0 && (
              <div style={{ fontSize: 11 }}>
                <span style={{ opacity: 0.55, textTransform: 'uppercase', fontSize: 9.5, letterSpacing: 1 }}>went to </span>
                {topDests.map(([cn, n]) => `${cn} (${n})`).join(', ')}
              </div>
            )}
            {quote && (
              <div style={{ fontSize: 11, marginTop: 5, opacity: 0.8, fontStyle: 'italic', lineHeight: 1.45 }}>
                “{quote}”
              </div>
            )}
          </Tip>
        );
      })()}
    </div>
  );
}

export function MigrantScene({ geoData, respondents, stats }) {
  const abroad = useMemo(() => respondents.filter(r => r.livedAbroad === 'Yes'), [respondents]);
  const home = useMemo(() => respondents.filter(r => r.livedAbroad !== 'Yes'), [respondents]);

  const destinations = useMemo(() => {
    const map = {};
    abroad.forEach(r => {
      const dest = r.countryAbroad;
      if (!dest) return;
      if (!map[dest]) map[dest] = { country: dest, origins: {}, outsiders: 0 };
      const origin = r.country_birth || 'Unknown';
      if (origin !== dest) {
        map[dest].outsiders++;
        map[dest].origins[origin] = (map[dest].origins[origin] || 0) + 1;
      }
    });
    return Object.values(map)
      .filter(d => EUROPEAN_COUNTRIES.has(d.country) && d.outsiders > 0)
      .sort((a, b) => b.outsiders - a.outsiders);
  }, [abroad]);

  const migrantByCountry = useMemo(() => {
    const info = {};
    abroad.forEach(r => {
      const dest = r.countryAbroad;
      const origin = r.country_birth || 'Unknown';
      if (dest) {
        if (!info[dest]) info[dest] = { wentTo: 0, cameFrom: 0, topOrigins: {}, topDests: {} };
        info[dest].wentTo++;
        info[dest].topOrigins[origin] = (info[dest].topOrigins[origin] || 0) + 1;
      }
      if (origin && origin !== 'Unknown') {
        if (!info[origin]) info[origin] = { wentTo: 0, cameFrom: 0, topOrigins: {}, topDests: {} };
        info[origin].cameFrom++;
        if (dest) info[origin].topDests[dest] = (info[origin].topDests[dest] || 0) + 1;
      }
    });
    home.forEach(r => {
      const c = r.country_live || r.country_birth;
      if (c && !info[c]) info[c] = { wentTo: 0, cameFrom: 0, topOrigins: {}, topDests: {} };
    });
    return info;
  }, [abroad, home]);

  const durationData = useMemo(() => {
    const groups = DURATION_GROUPS.map(g => {
      const people = abroad.filter(r => r.longestPeriodAbroad === g.key);
      return { people, total: people.length || 1 };
    });
    return IMPACT_ORDER.map(impact => ({
      label: impact,
      values: groups.map(g => Math.round(g.people.filter(r => r.impactOnEating === impact).length / g.total * 100)),
    }));
  }, [abroad]);

  const impactQuotes = useMemo(() => {
    const byDest = {};
    const featured = [];
    abroad.forEach(r => {
      const q = (r.specifyImpact || '').replace(/\s+/g, ' ').trim();
      if (q.length < 25 || q.length > 150) return;
      if (r.countryAbroad) (byDest[r.countryAbroad] = byDest[r.countryAbroad] || []).push(q);
      if (/completely|a lot/i.test(r.impactOnEating || '')) featured.push(q);
    });
    return { byDest, featured: featured.slice(0, 8) };
  }, [abroad]);

  const topDest = destinations[0];

  const steps = [
    <div key={0}>
      <StepKicker>A generation in motion</StepKicker>
      <StepTitle>{stats.abroadCount} of {stats.n} have already lived in another country.</StepTitle>
      <StepBody>
        That's {stats.abroadPct}%, {clearlyAhead(stats.abroadPct, 50) ? 'more than half of them' : `${shareText(stats.abroadPct)} of them`} carrying
        a palate across borders.
        Coral countries took in more of our respondents than they sent away; green ones sent out
        more than they drew. Hover any country to see who arrived and who left.
      </StepBody>
    </div>,
    <div key={1}>
      <StepKicker>The magnet</StepKicker>
      <StepTitle>{topDest ? topDest.country : 'One country'} pulls hardest.</StepTitle>
      <StepBody>
        {topDest ? `${plural(topDest.outsiders, 'respondent', 'respondents')} moved there` : 'Respondents converge'}: each thread is a
        person arriving with one set of recipes and leaving with another. Migration is Europe's biggest
        unplanned cooking school.
      </StepBody>
    </div>,
    <div key={2}>
      <StepKicker>Time is the ingredient</StepKicker>
      <StepTitle>{{ ahead: 'Stay a year, and the palate gives in.', close: 'Staying longer barely changes the palate.',
        behind: 'Short stays change the palate most.' }[compareCounts(stats.longStayHigh, stats.shortStayHigh)]}</StepTitle>
      <StepBody>
        Among those abroad for over a year, <strong style={{ color: C.coral }}>{stats.longStayHigh}%</strong> say
        their eating changed “a lot” or “completely”, versus <strong style={{ color: C.turmeric }}>{stats.shortStayHigh}%</strong> for
        stays under six months.
        {compareCounts(stats.longStayHigh, stats.shortStayHigh) === 'ahead' ? ' Taste, like language, has an immersion curve.' : ''}
      </StepBody>
    </div>,
    <div key={3}>
      <StepKicker>Your turn</StepKicker>
      <StepTitle>Trace any destination.</StepTitle>
      <StepBody>
        Pick a country below the map to see who moved there and from where; hover any country for its
        arrivals and departures. Find your own route, or the one you're still planning.
      </StepBody>
    </div>,
  ];

  return (
    <Scrolly steps={steps} side="left" graphicCol="13fr 7fr" bg={C.bg} lastStepVh={105}
      renderGraphic={step => (
        <MigrantGraphic geoData={geoData} destinations={destinations}
          migrantByCountry={migrantByCountry} step={step} durationData={durationData}
          quotes={impactQuotes} />
      )} />
  );
}

// CHAPTER 8 — THE FOOD PIPELINE (sankey scrolly)

export function PipelineScene({ respondents }) {
  const dominant = useMemo(() => computeDominantPath(respondents), [respondents]);
  const labels = useMemo(() => {
    const shorts = {};
    [0, 1, 2, 3].forEach(ci => {
      const it = SANKEY_COLS[ci].items.find(x => x.key === dominant.path[ci]);
      shorts[ci] = it ? it.short : '';
    });
    return shorts;
  }, [dominant]);

  const steps = [
    <div key={0}>
      <StepKicker accent={C.berry}>Follow the crowd</StepKicker>
      <StepTitle>The most travelled food life in Europe, in one line.</StepTitle>
      <StepBody>
        Living with <strong>{labels[0]}</strong> → <strong>{labels[1]}</strong> cook(s) → food from the{' '}
        <strong>{labels[2]}</strong> → cooked from <strong>{labels[3]?.toLowerCase()}</strong>.{' '}
        <strong style={{ color: C.coral }}>{plural(dominant.count, 'respondent', 'respondents')}</strong> {dominant.count === 1 ? 'follows' : 'share'} this exact path,
        the glowing route through the river. Every ribbon is people; thicker means more of them.
      </StepBody>
    </div>,
    <div key={1}>
      <StepKicker accent={C.berry}>Your turn</StepKicker>
      <StepTitle>Now build your own path.</StepTitle>
      <StepBody>
        Click one box per column (who you live with, who cooks, where the food comes from, how it's made)
        and find out how many of the {respondents.length} share your food life. Turn on{' '}
        <strong>Combine options</strong> (or Shift-click) to pick two boxes in the same column and find the
        people who answered both, like cooked by <strong>Myself</strong> and <strong>Parents</strong>.
        Under 4% counts as officially exotic.
      </StepBody>
    </div>,
  ];

  return (
    <Scrolly steps={steps} side="left" graphicCol="13fr 7fr" bg={C.bgTerra} stepVh={100} lastStepVh={120}
      renderGraphic={step => (
        <FlowSankey respondents={respondents} stage={step >= 1 ? 'build' : 'auto'} dominant={dominant} />
      )} />
  );
}

const PLURAL_FOLD = {
  potatoes: 'Potato', tomatoes: 'Tomato', onions: 'Onion', eggs: 'Egg',
  carrots: 'Carrot', peppers: 'Pepper', olives: 'Olive', beans: 'Bean',
};
const QUIZ_COUNTRY_ORDER = ['Portugal', 'Spain', 'France', 'Italy', 'Ireland', 'United Kingdom', 'Germany', 'Denmark'];
const QUIZ_MIN_N = 2;

// Most-named ingredients overall, with the same plural folding as the quiz.
function topIngredients(respondents, k) {
  const counts = {};
  respondents.forEach(r => (r.ingredients || []).forEach(raw => {
    const ing = PLURAL_FOLD[raw.toLowerCase()] || raw;
    counts[ing] = (counts[ing] || 0) + 1;
  }));
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, k).map(([n]) => n.toLowerCase());
}

function buildFlavourQuiz(respondents) {
  const per = {};
  respondents.forEach(r => {
    const c = r.country_birth || r.country_live;
    if (!c || !(r.ingredients || []).length) return;
    if (!per[c]) per[c] = { n: 0, counts: {} };
    per[c].n++;
    r.ingredients.forEach(raw => {
      const ing = PLURAL_FOLD[raw.toLowerCase()] || raw;
      per[c].counts[ing] = (per[c].counts[ing] || 0) + 1;
    });
  });
  const global = {};
  Object.values(per).forEach(p => Object.entries(p.counts).forEach(([k, v]) => { global[k] = (global[k] || 0) + v; }));

  const byName = {};
  Object.entries(per).filter(([, p]) => p.n >= QUIZ_MIN_N).forEach(([country, p]) => {
    // alphabetical tie-break keeps small-sample top-3s stable between visits
    const sorted = Object.entries(p.counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const top3 = sorted.slice(0, 3).map(([name, count]) => ({ name, count }));
    const nearTop = new Set(sorted.slice(0, 6).map(([name]) => name));
    const decoys = Object.entries(global).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .filter(([name]) => !nearTop.has(name)).slice(0, 3).map(([name]) => name);
    byName[country] = { country, n: p.n, top3, decoys,
      options: [...top3.map(t => t.name), ...decoys].sort() };
  });
  return [
    ...QUIZ_COUNTRY_ORDER.filter(c => byName[c]),
    ...Object.keys(byName).filter(c => !QUIZ_COUNTRY_ORDER.includes(c)).sort((a, b) => byName[b].n - byName[a].n),
  ].map(c => byName[c]);
}

export function FlavourQuizScene({ respondents, ingredientIcons }) {
  const quiz = useMemo(() => buildFlavourQuiz(respondents), [respondents]);
  const [ci, setCi] = useState(0);
  const [picks, setPicks] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const [scores, setScores] = useState({});

  if (!quiz.length) return null;
  const country = quiz[Math.min(ci, quiz.length - 1)];
  const correctSet = new Set(country.top3.map(t => t.name));
  const countOf = name => country.top3.find(t => t.name === name)?.count;

  const switchCountry = i => { setCi(i); setPicks([]); setRevealed(false); };
  const toggle = name => {
    if (revealed) return;
    setPicks(p => p.includes(name) ? p.filter(x => x !== name) : (p.length >= 3 ? p : [...p, name]));
  };
  const reveal = () => {
    const score = picks.filter(p => correctSet.has(p)).length;
    setRevealed(true);
    setScores(s => ({ ...s, [country.country]: score }));
    storylog('flavour_quiz', { country: country.country, score, picks });
  };

  const score = scores[country.country];
  const chipStyle = name => {
    const picked = picks.includes(name);
    const correct = correctSet.has(name);
    let bg = C.bg, border = 'rgba(61,43,31,0.16)', color = C.text, opacity = 1;
    if (!revealed) {
      if (picked) { bg = C.coralSoft; border = C.coral; color = C.coral; }
    } else if (correct && picked) { bg = C.herb; border = C.herb; color = '#fff'; }
    else if (correct) { bg = C.herbSoft; border = C.herb; color = C.text; }
    else if (picked) { bg = `${C.coral}18`; border = C.coral; color = C.coral; }
    else { opacity = 0.45; }
    return { bg, border, color, opacity };
  };

  return (
    <div style={{ width: '100%', background: C.bg, padding: '16px 24px 90px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        <div className="s3-fade" style={{ display: 'flex', gap: 7, justifyContent: 'center', alignItems: 'center',
          flexWrap: 'wrap', marginBottom: 22 }}>
          {quiz.map((q, i) => ({ q, i })).filter(({ q }) => QUIZ_COUNTRY_ORDER.includes(q.country)).map(({ q, i }) => {
            const done = scores[q.country] !== undefined;
            const isSel = i === ci;
            return (
              <button key={q.country} onClick={() => switchCountry(i)}
                style={{ border: 'none', borderRadius: 18, padding: '7px 15px', cursor: 'pointer',
                  background: isSel ? C.turmeric : C.card, color: isSel ? '#fff' : C.textM,
                  fontFamily: C.font, fontSize: 12.5, fontWeight: 700,
                  boxShadow: '0 1px 6px rgba(61,43,31,0.08)', transition: 'all 0.2s' }}>
                {q.country}{done ? ` · ${scores[q.country]}/3` : ''}
              </button>
            );
          })}
          {(() => {
            const extras = quiz.map((q, i) => ({ q, i })).filter(({ q }) => !QUIZ_COUNTRY_ORDER.includes(q.country));
            if (!extras.length) return null;
            const extraSelected = extras.find(({ i }) => i === ci);
            return (
              <select value={extraSelected ? String(ci) : ''}
                onChange={e => { if (e.target.value !== '') switchCountry(Number(e.target.value)); }}
                style={{ padding: '7px 26px 7px 13px', border: `1.5px solid ${extraSelected ? C.turmeric : 'rgba(61,43,31,0.2)'}`,
                  borderRadius: 18, fontFamily: C.font, fontSize: 12.5, fontWeight: 700,
                  background: extraSelected ? C.turmeric : C.card, color: extraSelected ? '#fff' : C.textM,
                  cursor: 'pointer', appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='${extraSelected ? '%23FFFFFF' : '%233D2B1F'}' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center' }}>
                <option value="">{extraSelected ? extraSelected.q.country : `More countries (${extras.length})…`}</option>
                {extras.map(({ q, i }) => (
                  <option key={q.country} value={i}>
                    {q.country}{scores[q.country] !== undefined ? ` · ${scores[q.country]}/3` : ''}
                  </option>
                ))}
              </select>
            );
          })()}
        </div>

        <div className="s3-fade" style={{ background: C.card, borderRadius: 22, padding: '26px 28px',
          boxShadow: '0 6px 30px rgba(61,43,31,0.08)' }}>
          <div style={{ fontFamily: C.font, fontSize: 11, fontWeight: 700, letterSpacing: 2,
            textTransform: 'uppercase', color: C.turmeric, marginBottom: 8, textAlign: 'center' }}>
            Guess the flavour signature
          </div>
          <div style={{ fontFamily: C.fontTitle, fontSize: 'clamp(17px, 2vw, 21px)', color: C.text,
            textAlign: 'center', lineHeight: 1.45, marginBottom: 4 }}>
            Which <strong style={{ color: C.turmeric }}>three ingredients</strong> did people from{' '}
            <strong style={{ color: C.coral }}>{country.country}</strong> name most?
          </div>
          <div style={{ fontFamily: C.font, fontSize: 11.5, color: C.textL, textAlign: 'center', marginBottom: 20 }}>
            pick 3 of the 6 · answered by {country.n} respondent{country.n > 1 ? 's' : ''} born there
            {country.n < 15 ? ' · small sample, season with a pinch of salt' : ''}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 9, marginBottom: 18 }}>
            {country.options.map(name => {
              const st = chipStyle(name);
              const icon = ingredientIcons[name];
              return (
                <button key={`${country.country}-${name}`} onClick={() => toggle(name)}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left',
                    border: `1.5px solid ${st.border}`, background: st.bg, color: st.color,
                    borderRadius: 13, padding: '9px 13px', fontFamily: C.font, fontSize: 13.5,
                    fontWeight: 700, cursor: revealed ? 'default' : 'pointer', opacity: st.opacity,
                    transition: 'all 0.25s' }}>
                  {icon
                    ? <img src={`/icons/ingredients/${icon}`} alt="" aria-hidden="true" loading="lazy" decoding="async"
                        onError={e => { e.target.style.display = 'none'; }}
                        style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    : <span style={{ width: 30, textAlign: 'center', fontSize: 17 }}>🥘</span>}
                  <span style={{ flex: 1 }}>{name}</span>
                  {revealed && correctSet.has(name) && (
                    <span style={{ fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>
                      ✓ {countOf(name)}×
                    </span>
                  )}
                  {revealed && !correctSet.has(name) && picks.includes(name) && <span>✕</span>}
                </button>
              );
            })}
          </div>

          {!revealed ? (
            <div style={{ textAlign: 'center' }}>
              <button onClick={reveal} disabled={picks.length !== 3}
                style={{ background: picks.length === 3 ? C.coral : 'rgba(61,43,31,0.15)',
                  color: '#fff', border: 'none', borderRadius: 12, padding: '11px 26px',
                  fontFamily: C.font, fontSize: 14, fontWeight: 700,
                  cursor: picks.length === 3 ? 'pointer' : 'default',
                  boxShadow: picks.length === 3 ? `0 4px 16px ${C.coralGlow}` : 'none', transition: 'all 0.25s' }}>
                {picks.length === 3 ? 'Reveal the signature →' : `Pick ${3 - picks.length} more`}
              </button>
            </div>
          ) : (
            <div style={{ fontFamily: C.font, fontSize: 13.5, color: C.textM, lineHeight: 1.65,
              textAlign: 'center', animation: 's3fadein 0.4s ease both' }}>
              {score === 3
                ? <><strong style={{ color: C.herb }}>Perfect palate: 3 of 3.</strong> You could pass for a local.</>
                : score === 0
                  ? <>0 of 3. {country.country}'s pantry keeps its secrets. Try a neighbour.</>
                  : <>You got <strong style={{ color: C.herb }}>{score} of 3</strong>. The missing{' '}
                    {3 - score === 1 ? 'one is' : 'ones are'} highlighted in green.</>}
              {quiz.length > 1 && <> Try another country above.</>}
            </div>
          )}
        </div>

        <p className="s3-fade" style={{ fontFamily: C.font, fontSize: 13.5, color: C.textM, lineHeight: 1.7,
          maxWidth: 560, margin: '22px auto 0', textAlign: 'center' }}>
          {cap(topIngredients(respondents, 4).join(', '))}: Europe's signatures overlap far more than its borders do.
          Hold that thought, because these same beloved ingredients are about to step on the scale.
        </p>
      </div>
    </div>
  );
}

// CHAPTER 9 — THE FOOD FEED

export function FeedScene({ respondents, stats }) {
  const [channelData, setChannelData] = useState(null);
  const [platform, setPlatform] = useState('all');

  useEffect(() => {
    fetch('/data/social_channels.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setChannelData(data); })
      .catch(() => {});
  }, []);

  const allChannels = useMemo(() => {
    if (!channelData?.channels) return [];
    return Object.entries(channelData.channels)
      .filter(([, ch]) => ch.platform !== 'skip' && ch.display_name && (ch.mentions || 0) >= 2)
      .map(([key, ch]) => ({ key, ...ch }))
      .sort((a, b) => (b.mentions || 0) - (a.mentions || 0));
  }, [channelData]);

  const platforms = useMemo(() => {
    const counts = {};
    allChannels.forEach(ch => { counts[ch.platform] = (counts[ch.platform] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [allChannels]);

  const visible = platform === 'all' ? allChannels : allChannels.filter(ch => ch.platform === platform);

  return (
    <div style={{ width: '100%', background: C.bgSage, padding: '10px 24px 90px' }}>
      <div style={{ maxWidth: 950, margin: '0 auto' }}>
        <div className="s3-fade" style={{ display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap', margin: '10px 0 30px' }}>
          <BigStat value={stats.followPct} label={`of respondents follow food creators (${stats.followCount} of ${stats.followN})`} accent={C.berry} />
          <BigStat value={allChannels.length} suffix="" label="creators were named by more than one person: the shared canon" accent={C.turmeric} />
        </div>

        <p className="s3-fade" style={{ fontFamily: C.font, fontSize: 15.5, color: C.textM, lineHeight: 1.8,
          maxWidth: 640, margin: '0 auto 26px', textAlign: 'center' }}>
          Grandmothers, themselves shaped by the food fashions of their own youth, used to have a monopoly
          on recipe transmission.{' '}
          {stats.followVsRest === 'behind'
            ? 'Among our respondents, only a minority has let these accounts in: for them, they are the new oral tradition, delivered digitally on a screen, thirty seconds at a time.'
            : stats.followVsRest === 'close'
              ? 'About half of our respondents now also learn from these accounts: the new oral tradition, delivered digitally on a screen, thirty seconds at a time.'
              : 'Now they compete with these accounts: the new oral tradition, delivered digitally on a screen, thirty seconds at a time.'}
          {' '}Click any note to visit a kitchen.
        </p>

        {platforms.length > 1 && (
          <div className="s3-fade" style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
            <button onClick={() => { setPlatform('all'); storylog('feed_platform', { platform: 'all' }); }}
              style={{ border: 'none', borderRadius: 18, padding: '7px 16px', cursor: 'pointer',
                fontFamily: C.font, fontSize: 12.5, fontWeight: 700,
                background: platform === 'all' ? C.ink : C.card, color: platform === 'all' ? '#fff' : C.textM,
                boxShadow: '0 1px 6px rgba(61,43,31,0.08)', transition: 'all 0.2s' }}>
              All ({allChannels.length})
            </button>
            {platforms.map(([p, count]) => {
              const meta = PLATFORM_META[p] || PLATFORM_META.unknown;
              const isSel = platform === p;
              return (
                <button key={p} onClick={() => { setPlatform(p); storylog('feed_platform', { platform: p }); }}
                  style={{ border: 'none', borderRadius: 18, padding: '7px 16px', cursor: 'pointer',
                    fontFamily: C.font, fontSize: 12.5, fontWeight: 700,
                    background: isSel ? meta.color : C.card, color: isSel ? '#fff' : C.textM,
                    boxShadow: '0 1px 6px rgba(61,43,31,0.08)', transition: 'all 0.2s' }}>
                  {meta.icon} {meta.label} ({count})
                </button>
              );
            })}
          </div>
        )}

        <div className="s3-fade">
          <StickyNoteBoard channels={visible} />
        </div>
      </div>
    </div>
  );
}

// CHAPTER 10 — THE PLATE & THE PLANET

const DIET_GROUPS = [
  { key: 'Flexitarian', color: C.turmeric },
  { key: 'Vegetarian', color: C.herb },
  { key: 'Vegan', color: C.berry },
];

export function PlanetScene({ sustainability, ingredientIcons, respondents = [] }) {
  const items = (sustainability?.ingredients || []).filter(i => ingredientIcons[i.name] || i.icon);
  const beef = items.find(i => i.name === 'Beef');

  const diet = useMemo(() => {
    const n = respondents.length || 1;
    const groups = DIET_GROUPS.map(g => ({
      ...g, n: respondents.filter(r => r.dietaryPreferences === g.key).length,
    }));
    const reducers = groups.reduce((s, g) => s + g.n, 0);
    // glyph counts per group, rounded but summing to the rounded total
    let acc = 0;
    const glyphGroups = groups.map(g => {
      const raw = g.n / n * 100;
      const count = Math.round(raw);
      acc += count;
      return { ...g, glyphs: count };
    });
    return { n, groups, reducers, reducersPct: Math.round(reducers / n * 100), glyphGroups, glyphTotal: acc };
  }, [respondents]);

  const steps = [
    <div key={0}>
      <StepKicker accent={C.herb}>Already at the table</StepKicker>
      <StepTitle>{diet.reducersPct}% eat less meat before anyone mentions the planet.</StepTitle>
      <StepBody>
        Every chapter so far was about culture; this one is about consequences. But the shift has quietly
        started: of the {plural(diet.n, 'respondent', 'respondents')}, {diet.groups[0]?.n} call themselves flexitarian,{' '}
        {diet.groups[1]?.n} vegetarian and {diet.groups[2]?.n} vegan. {diet.reducers} plates already
        drifting away from meat. Keep them in mind: the next two screens show what that drift is worth.
      </StepBody>
    </div>,
    <div key={1}>
      <StepKicker accent={C.herb}>The invisible ingredient</StepKicker>
      <StepTitle>One serving of beef = {beef ? beef.car_km.toFixed(0) : '30'} km of car travel.</StepTitle>
      <StepBody>
        Take the single most common swap on our respondents' plates: beef or tofu. The same amount of
        protein, very different climate costs.
      </StepBody>
    </div>,
    <div key={2}>
      <StepKicker accent={C.herb}>Your turn</StepKicker>
      <StepTitle>Weigh the ingredients they named most.</StepTitle>
      <StepBody>
        These are the {items.length} ingredients respondents named most often as core to their own
        cooking in the survey, not a full pantry. Tap one to see what a typical serving costs in driving,
        bottled water and land; tap a second to compare them head-to-head, including the calories and
        protein each serving feeds you back.
      </StepBody>
      <StepHint>Footprints are per typical serving, from Clark et al. (2022) and Poore &amp; Nemecek (2018), peer-reviewed, not vibes.</StepHint>
    </div>,
  ];

  return (
    <Scrolly steps={steps} side="left" graphicCol="11fr 9fr" bg={C.bgWarm} stepVh={100} lastStepVh={115}
      renderGraphic={step => (
        <div key={step >= 2 ? 'explore' : step === 1 ? 'duel' : 'diet'}
          style={{ animation: 's3fadein 0.5s ease both', maxWidth: 640, margin: '0 auto' }}>
          {step >= 2
            ? <PortionExplorer items={items} ingredientIcons={ingredientIcons} />
            : step === 1
            ? <Reveal>{on => <PortionDuel items={items} ingredientIcons={ingredientIcons} visible={on} />}</Reveal>
            : <div style={{ background: C.card, borderRadius: 24, padding: '26px 28px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
                <div style={{ fontFamily: C.fontTitle, fontSize: 19, color: C.text, textAlign: 'center', marginBottom: 4 }}>
                  100 plates, drawn to scale
                </div>
                <div style={{ fontFamily: C.font, fontSize: 11.5, color: C.textM, textAlign: 'center', marginBottom: 14 }}>
                  each figure is 1% of the {plural(diet.n, 'respondent', 'respondents')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(20, 1fr)', gap: 4,
                  maxWidth: 460, margin: '0 auto' }}>
                  {Array.from({ length: 100 }).map((_, i) => {
                    let fill = 'rgba(61,43,31,0.13)';
                    let acc = 0;
                    for (const g of diet.glyphGroups) {
                      if (i < acc + g.glyphs) { fill = g.color; break; }
                      acc += g.glyphs;
                    }
                    return <PersonGlyph key={i} fill={fill} size={14} delay={i < diet.glyphTotal ? i * 22 : 0} />;
                  })}
                </div>
                <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap',
                  marginTop: 14, fontFamily: C.font, fontSize: 11.5, color: C.textM }}>
                  {diet.groups.map(g => (
                    <span key={g.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 11, height: 11, borderRadius: '50%', background: g.color }} />
                      {g.key} · {g.n}
                    </span>
                  ))}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'rgba(61,43,31,0.13)' }} />
                    Everyone else
                  </span>
                </div>
              </div>}
        </div>
      )} />
  );
}

// EPILOGUE — WHAT STAYS

const STORY_SOURCES = [
  { group: 'Tomato & pizza', items: [
    { t: 'Carol Helstosky, Pizza: A Global History (Reaktion, 2008)' },
    { t: 'Clarissa Hyman, Tomato: A Global History (Reaktion, 2019)' },
    { t: 'Serin Quinn, “The Tomato-Chili Nexus: Reconstructing the Mesoamerican influence on Europe” (The Recipes Project, 2025)', u: 'https://recipes.hypotheses.org/26743' },
    { t: 'Massimo Montanari, A Short History of Spaghetti with Tomato Sauce (Europa, 2021)' },
  ] },
  { group: 'Pasta', items: [
    { t: 'Silvano Serventi & Françoise Sabban, Pasta: The Story of a Universal Food (Columbia UP, 2002)' },
  ] },
  { group: 'Fish & chips, potato & cod', items: [
    { t: 'Panikos Panayi, Fish & Chips: A Takeaway History (Reaktion, 2014)' },
    { t: 'John K. Walton, “Fish and Chips and the British Working Class, 1870–1930” (Journal of Social History, 1989)', u: 'https://doi.org/10.1353/jsh/23.2.243' },
    { t: 'Rebecca Earle, Feeding the People: The Politics of the Potato (Cambridge UP, 2020)' },
    { t: 'Mark Kurlansky, Cod: A Biography of the Fish That Changed the World (Walker, 1997)' },
  ] },
  { group: 'Paella & rice (Al-Andalus)', items: [
    { t: 'Andrew M. Watson, “The Arab Agricultural Revolution and Its Diffusion, 700–1100” (Journal of Economic History, 1974)' },
    { t: 'Thomas F. Glick, Islamic and Christian Spain in the Early Middle Ages (Princeton UP, 1979)' },
    { t: 'Lourdes March, The Paella (English ed., 1998) — on the Valencian dish and its ingredients' },
  ] },
  { group: 'Döner kebab (further reading)', items: [
    { t: 'Priscilla Mary Işın, Bountiful Empire: A History of Ottoman Cuisine (Reaktion, 2018)' },
    { t: 'Priscilla Mary Işın, “Ottoman Kebab Culture and the Rise of Döner Kebab” (Petits Propos Culinaires, 2020)', u: 'https://doi.org/10.1558/ppc.27891' },
    { t: 'Maren Möhring, “Döner Kebab and West German Consumer (Multi-)Cultures” (Brill, 2011)', u: 'https://doi.org/10.1163/9789042032293_009' },
    { t: 'Ayşe Çağlar, “McDoner: Döner Kebap and the Social Positioning Struggle of German Turks” (Routledge, 1999)' },
  ] },
];

function StorySources() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 16, textAlign: 'left' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer',
          fontFamily: C.font, fontSize: 12, fontWeight: 700, color: C.coral, background: 'transparent',
          border: `1px solid ${C.coral}55`, borderRadius: 999, padding: '6px 14px' }}>
        {open ? '▲' : '▼'} Sources &amp; further reading
      </button>
      {open && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14,
          animation: 's3fadein 0.4s ease both' }}>
          {STORY_SOURCES.map(sec => (
            <div key={sec.group}>
              <div style={{ fontFamily: C.font, fontSize: 10.5, fontWeight: 800, letterSpacing: 1.4,
                textTransform: 'uppercase', color: C.textM, marginBottom: 5 }}>{sec.group}</div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex',
                flexDirection: 'column', gap: 4 }}>
                {sec.items.map((it, i) => (
                  <li key={i} style={{ fontFamily: C.font, fontSize: 11.5, color: 'rgba(61,43,31,0.62)', lineHeight: 1.5 }}>
                    {it.u ? (
                      <a href={it.u} target="_blank" rel="noopener noreferrer"
                        style={{ color: C.berry, textDecoration: 'none' }}>{it.t} ↗</a>
                    ) : it.t}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div style={{ fontFamily: C.font, fontSize: 11, color: 'rgba(61,43,31,0.5)', lineHeight: 1.5 }}>
            Browse more food histories at the{' '}
            <a href="https://www.bloomsburyfoodlibrary.com/" target="_blank" rel="noopener noreferrer"
              style={{ color: C.berry, textDecoration: 'none' }}>Bloomsbury Food Library ↗</a>.
          </div>
        </div>
      )}
    </div>
  );
}

export function EpilogueScene({ stats }) {
  const quiz = [
    {
      q: 'Out of every 100 respondents, how many said their national dishes don\'t reflect what they eat?',
      options: stats.quizNoOptions.map(v => `${v}%`),
      correct: stats.quizNoCorrect,
      explain: `${stats.noPct}%: ${stats.whyNotSummary}`,
    },
    {
      q: stats.topInEveryGarden ? 'Which cuisine grows a petal in every country\'s flower?' : 'Which cuisine do the most respondents feel connected to?',
      options: stats.quizCuisineOptions,
      correct: stats.quizCuisineCorrect,
      explain: `${stats.topCuisineName}: ${stats.topCuisineCount} of ${stats.n} respondents feel connected to it${stats.topInEveryGarden ? ', with a petal in every country garden' : ''}.`,
    },
    {
      q: 'One serving of beef equals how much car travel?',
      options: stats.quizBeefOptions.map(v => `${v} km`),
      correct: stats.quizBeefCorrect,
      explain: `About ${stats.beefKm} km per serving (Clark et al. 2022). A protein-equivalent serving of tofu: about 7 km.`,
    },
  ];

  return (
    <div style={{ width: '100%', background: `linear-gradient(170deg, ${C.bg} 0%, ${C.bgTerra} 70%, ${C.bgWarm} 100%)`,
      padding: '90px 24px 70px', textAlign: 'center' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <div className="s3-fade" style={{ fontSize: 11, fontFamily: C.font, color: C.textL, letterSpacing: 3,
          textTransform: 'uppercase', marginBottom: 16 }}>
          Epilogue
        </div>
        <h2 className="s3-fade" style={{ fontFamily: C.fontTitle, fontSize: 'clamp(28px, 4.5vw, 50px)', color: C.text,
          margin: '0 0 18px', lineHeight: 1.2 }}>
          Before you go
        </h2>
        <p className="s3-fade" style={{ fontFamily: C.font, fontSize: 16, color: C.textM, maxWidth: 620,
          margin: '0 auto 44px', lineHeight: 1.8 }}>
          The plate our respondents inherit is borrowed from everywhere, short on time, unevenly shared
          at the stove, and heavier on the planet than it looks. What they cook next is still being decided,
          by them, three meals a day.
        </p>

        <div className="s3-fade" style={{ marginBottom: 60 }}>
          <h3 style={{ fontFamily: C.fontTitle, fontSize: 24, color: C.text, marginBottom: 8 }}>
            Prove it stuck 🍳
          </h3>
          <p style={{ fontFamily: C.font, fontSize: 14, color: C.textM, marginBottom: 24 }}>
            Three questions, no grades, just the satisfying click of remembering.
          </p>
          <RecapQuiz questions={quiz} />
        </div>

        <h2 className="s3-fade" style={{ fontFamily: C.fontTitle, fontSize: 'clamp(24px, 3.6vw, 38px)',
          color: C.text, margin: '0 0 14px', lineHeight: 1.35, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto' }}>
          Heritage is not what you inherit.<br />
          <span style={{ color: C.coral }}>It's what you choose to cook next.</span>
        </h2>

        <div className="s3-fade" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginTop: 34 }}>
          <a href="/dashboard_youth_food_culture" target="_blank" rel="noopener noreferrer" style={{
            fontFamily: C.font, fontSize: 13, fontWeight: 600, color: '#fff', background: C.herb,
            borderRadius: 10, padding: '12px 24px', textDecoration: 'none' }}>
            Explore the full survey →
          </a>
          <a href="/survey_youth_food_culture" target="_blank" rel="noopener noreferrer" style={{
            fontFamily: C.font, fontSize: 13, fontWeight: 600, color: '#fff', background: C.turmeric,
            borderRadius: 10, padding: '12px 24px', textDecoration: 'none' }}>
            Add your own answer →
          </a>
        </div>

        <div className="s3-fade" style={{ marginTop: 64, fontFamily: C.font, fontSize: 11.5, color: 'rgba(61,43,31,0.4)',
          lineHeight: 1.8, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto' }}>
          <strong>About the data.</strong> {stats.n} responses to the RELISH Youth Survey across {plural(stats.countries, 'country', 'countries')}
          {stats.ageText ? ` (${stats.ageText})` : ''}, self-reported. Dish origins compiled from the food-history scholarship listed below;
          environmental footprints from Clark et al. (2022) and Poore &amp; Nemecek (2018). Percentages are
          within-question and may not sum to 100.
          <StorySources />
          <div style={{ marginTop: 18 }}>
            <img src="/Relish_Logo_Master_01.png" alt="RELISH" loading="lazy" decoding="async" style={{ height: 24, opacity: 0.35, display: 'block', margin: '0 auto 10px' }} />
            RELISH: Reframing European Gastronomy Legacy through Innovation, Sustainability and Heritage
          </div>
        </div>
      </div>
    </div>
  );
}

const sankey = k => SANKEY_COLS.find(c => c.key === k).items.map(i => i.key);
const YES_NO = ['Yes', 'No'];
export const ANSWER_MATCHERS = [
  { q: 'dishes_reflect', match: YES_NO },
  { q: 'why_not_reasons', match: Object.keys(WHY_NOT_SHORT) },
  { q: 'iconic_dishes_where', match: WHERE_META.map(w => w.m) },
  { q: 'iconic_dishes_how_often', prefix: ['Occasionally', 'Regularly', 'Rarely', 'Only on special occasions'] },
  { q: 'top_food_preferences', match: Object.keys(PREF_SHORT) },
  { q: 'describe_food_culture', match: CULTURE_LEVELS.map(l => l.match) },
  { q: 'food_priorities', match: UNIFIED_AXES.flatMap(a => a.eat) },
  { q: 'buying_influences', match: UNIFIED_AXES.flatMap(a => a.buy) },
  { q: 'how_often_cook', match: COOK_FREQ_GROUPS.flatMap(g => g.keys) },
  { q: 'eating_habits', rows: MERGED_HABITS.flatMap(h => h.keys), columns: ['never', 'rarely', 'sometimes', 'frequently'] },
  { q: 'feel_in_kitchen', match: FEEL_LEVELS.map(l => l.m) },
  { q: 'socioeconomic', match: ['Low-income', 'Middle-income', 'High-income'] },
  { q: 'gender', match: ['Female', 'Male'] },
  { q: 'household_responsibility', match: sankey('who') },
  { q: 'living_with', match: sankey('living') },
  { q: 'food_purchase_places', match: sankey('where') },
  { q: 'approach_cooking', match: [...sankey('how'), /memory|improvise/i] },
  { q: 'stocked_food_items', match: PANTRY_META.map(p => p.m) },
  { q: 'influences_on_cooking', match: INFLUENCE_META.map(p => p.m) },
  { q: 'help_improve_options', match: HELP_META.map(p => p.m) },
  { q: 'cooking_style_description', match: STYLE_KEYS },
  { q: 'dietary_preferences', match: DIET_GROUPS.map(g => g.key) },
  { q: 'lived_abroad', match: ['Yes'] },
  { q: 'longest_period_abroad', match: DURATION_GROUPS.map(g => g.key) },
  { q: 'impact_on_eating', match: IMPACT_ORDER },
  { q: 'improve_skills', match: YES_NO },
  { q: 'follow_social_media', match: ['Yes'] },
  ...[1, 2, 3].flatMap(i => [
    { q: `dish_${i}_self_prepare`, match: YES_NO },
    { q: `iconic_dish_${i}_self`, match: YES_NO },
    { q: `iconic_dish_${i}_others`, match: YES_NO },
    { q: `iconic_dish_${i}_last_month`, match: YES_NO },
  ]),
];
