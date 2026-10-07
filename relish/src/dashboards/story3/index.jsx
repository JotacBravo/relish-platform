// The Borrowed Plate: a scrollytelling data story built on the youth food-culture survey.
import { useEffect, useMemo, useRef, useState } from 'react';
import * as topojson from 'topojson-client';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import sustainabilityPortions from '../data/sustainability_portions.json';
import { C, ChapterIntro, ProgressSystem, StoryRotateNotice, useStoryZoom, splitMulti, valStr, lookupOrigin, normDish } from './shared';
import { clearlyAhead, compareCounts, shareText } from '../claims';
import { initEvalTelemetry } from '../../eval/evalTelemetry';
import {
  HeroScene, OriginsScene, RealityScene, EverydayScene, DesertIslandScene,
  CrushesScene, CultureZoomScene, DriversScene, KitchenScene, KitchenSelfScene,
  MigrantScene, PipelineScene, FlavourQuizScene, FeedScene,
  PlanetScene, EpilogueScene,
  computeWhyNot, whyNotLeadIsTime, buildFlowers, gardenReach, CULTURE_LEVELS,
} from './scenes';

gsap.registerPlugin(ScrollTrigger);

const CHAPTERS = [
  { id: 's3-ch1', label: 'Borrowed Dishes', short: 'Borrowed Dishes' },
  { id: 's3-ch2', label: 'The Reality Check', short: 'Reality Check' },
  { id: 's3-ch3', label: 'The Everyday Plate', short: 'Everyday Plate' },
  { id: 's3-island', label: 'The Desert Island Test', short: 'Desert Island' },
  { id: 's3-ch4', label: 'Cuisine Crushes', short: 'Cuisine Crushes' },
  { id: 's3-zoom', label: 'Naming the Food Culture', short: 'Culture Zoom' },
  { id: 's3-ch5', label: 'What Drives the Plate', short: 'Drivers' },
  { id: 's3-ch6', label: 'Kitchen Politics', short: 'Kitchen Politics' },
  { id: 's3-kitchen2', label: 'Inside the Kitchen', short: 'In the Kitchen' },
  { id: 's3-ch7', label: 'The Migrant Palate', short: 'Migrant Palate' },
  { id: 's3-ch8', label: 'The Food Pipeline', short: 'Pipeline' },
  { id: 's3-flavour', label: 'The Flavour Signature', short: 'Flavour Quiz' },
  { id: 's3-ch9', label: 'The Plate & the Planet', short: 'Planet' },
  { id: 's3-ch10', label: 'The Food Feed', short: 'Food Feed' },
  { id: 's3-epilogue', label: 'What Stays', short: 'Epilogue' },
];

const GLOBAL_CSS = `
  @keyframes s3draw { to { stroke-dashoffset: 0; } }
  @keyframes s3pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
  @keyframes s3fadein { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
  @keyframes s3sprout { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  @keyframes s3drift {
    from { transform: translateY(0) rotate(-3deg); }
    to { transform: translateY(-22px) rotate(4deg); }
  }
  @keyframes s3spin { to { transform: rotate(360deg); } }
  @keyframes s3plate { from { transform: scale(0.2) translateY(-16px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }

  @keyframes fr-live { 0% { box-shadow: 0 0 0 0 rgba(255,92,57,0.55); } 70% { box-shadow: 0 0 0 9px rgba(255,92,57,0); } 100% { box-shadow: 0 0 0 0 rgba(255,92,57,0); } }
  @keyframes fr-bump { 0% { transform: scale(1); } 40% { transform: scale(1.12); } 100% { transform: scale(1); } }

  .s3-step-card {
    background: rgba(255, 252, 246, 0.94);
    backdrop-filter: blur(6px);
    border-radius: 18px;
    border-left: 3px solid rgba(61,43,31,0.08);
    padding: 24px 26px;
    max-width: 440px;
    width: 100%;
    box-shadow: 0 4px 18px rgba(61,43,31,0.06);
    opacity: 0.38;
    transform: translateY(8px);
    transition: opacity 0.45s ease, transform 0.45s ease, box-shadow 0.45s ease, border-color 0.45s ease;
  }
  .s3-step-card.is-active {
    opacity: 1;
    transform: translateY(0);
    border-left-color: ${C.coral};
    box-shadow: 0 10px 34px rgba(61,43,31,0.13);
  }

  .s3-rail-dot .s3-rail-label { pointer-events: none; }
  .s3-rail-dot:hover .s3-rail-label { opacity: 1 !important; }

  .s3-range {
    -webkit-appearance: none;
    appearance: none;
    height: 10px;
    border-radius: 6px;
    background: linear-gradient(90deg, ${C.coralSoft}, rgba(200,75,49,0.3));
    outline: none;
    cursor: pointer;
  }
  .s3-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 26px; height: 26px;
    border-radius: 50%;
    background: ${C.coral};
    border: 3px solid #fff;
    box-shadow: 0 2px 10px rgba(200,75,49,0.45);
    cursor: grab;
  }
  .s3-range:disabled::-webkit-slider-thumb { background: rgba(61,43,31,0.35); cursor: default; }
  .s3-range::-moz-range-thumb {
    width: 24px; height: 24px;
    border-radius: 50%;
    background: ${C.coral};
    border: 3px solid #fff;
    box-shadow: 0 2px 10px rgba(200,75,49,0.45);
    cursor: grab;
  }

  .s3-root * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }

  @media (prefers-reduced-motion: reduce) {
    .s3-root *, .s3-root *::before, .s3-root *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.15s !important;
    }
  }
`;

export default function RelishScrollStory3() {
  const [respondents, setRespondents] = useState([]);
  const [geoData, setGeoData] = useState(null);
  const [dishIcons, setDishIcons] = useState({});
  const [ingredientIcons, setIngredientIcons] = useState({});
  const [userCountry, setUserCountry] = useState('');
  const containerRef = useRef(null);
  const storyZoom = useStoryZoom();

  // Reading telemetry — active only with ?eval=1 (evaluation sessions).
  useEffect(() => initEvalTelemetry('story'), []);

  // data loading
  useEffect(() => {
    Promise.all([
      fetch('/api/survey/filtered?surveyType=youth').then(r => r.json()),
      fetch('/data/ingredients_normalized.json').then(r => r.json()).catch(() => null),
      fetch('/data/dishes_normalized.json').then(r => r.json()).catch(() => null),
      fetch('/data/regular_dishes_normalized.json').then(r => r.json()).catch(() => null),
      fetch('/icons/dishes_v2/manifest.json').then(r => r.json()).catch(() => ({})),
      fetch('/icons/ingredients/manifest.json').then(r => r.json()).catch(() => ({})),
    ]).then(([raw, ingNorm, dishNorm, regDishNorm, iconManifest, ingIconManifest]) => {
      const ingMap = ingNorm?.mapping || {};
      const dishMap = dishNorm?.mapping || {};
      const regDishMap = regDishNorm?.mapping || {};
      const normalizeIngredients = rawValues => {
        const result = [];
        rawValues.forEach(v => {
          if (!v) return;
          const mapped = ingMap[v];
          if (mapped === null) return;
          if (Array.isArray(mapped)) { mapped.forEach(m => result.push(m)); return; }
          const c = v.trim();
          if (c.length > 1 && c.length < 30) result.push(c.charAt(0).toUpperCase() + c.slice(1));
        });
        return result;
      };
      const normalizeDish = raw2 => {
        if (!raw2) return null;
        const mapped = dishMap[raw2];
        if (mapped === null) return null;
        if (typeof mapped === 'string') return mapped;
        return raw2.trim();
      };
      const normalizeRegDish = raw2 => {
        if (!raw2) return null;
        const mapped = regDishMap[raw2];
        if (mapped === null) return null;
        if (typeof mapped === 'string') return mapped;
        return raw2.trim();
      };
      const mapped = raw.map((r, i) => {
        const resp = r.responses || r;
        const rawIngs = [valStr(resp.ingredient_1), valStr(resp.ingredient_2), valStr(resp.ingredient_3)].filter(Boolean);
        const dish1 = normalizeDish(valStr(resp.iconic_dish_1));
        const dish2 = normalizeDish(valStr(resp.iconic_dish_2));
        const dish3 = normalizeDish(valStr(resp.iconic_dish_3));
        return {
          idx: i,
          country_birth: valStr(resp.country_birth),
          country_live: valStr(resp.country_live),
          ingredients: normalizeIngredients(rawIngs),
          iconicDishes: [dish1, dish2, dish3].filter(Boolean),
          regularDishes: [normalizeRegDish(valStr(resp.dish_1)) || null,
            normalizeRegDish(valStr(resp.dish_2)) || null,
            normalizeRegDish(valStr(resp.dish_3)) || null],
          dishesReflect: valStr(resp.dishes_reflect),
          whyNotReasons: splitMulti(resp.why_not_reasons),
          whyNotComment: valStr(resp['why_not_reasons-Comment']),
          desertIsland: valStr(resp.desert_island_food),
          describeFoodCulture: valStr(resp.describe_food_culture),
          specifyRegion: valStr(resp.specify_region),
          specifyArea: valStr(resp.specify_area),
          feelInKitchen: valStr(resp.feel_in_kitchen),
          cookingStyles: splitMulti(resp.cooking_style_description),
          influencesOnCooking: splitMulti(resp.influences_on_cooking),
          stockedFoodItems: splitMulti(resp.stocked_food_items),
          improveSkills: valStr(resp.improve_skills),
          helpImproveOptions: splitMulti(resp.help_improve_options),
          gender: valStr(resp.gender),
          socioeconomic: valStr(resp.socioeconomic),
          howOftenCook: valStr(resp.how_often_cook),
          householdResponsibility: splitMulti(resp.household_responsibility),
          dishSelfPrepare: [valStr(resp.dish_1_self_prepare), valStr(resp.dish_2_self_prepare), valStr(resp.dish_3_self_prepare)],
          iconicSelf: [valStr(resp.iconic_dish_1_self), valStr(resp.iconic_dish_2_self), valStr(resp.iconic_dish_3_self)],
          iconicOthers: [valStr(resp.iconic_dish_1_others), valStr(resp.iconic_dish_2_others), valStr(resp.iconic_dish_3_others)],
          iconicLastMonth: [valStr(resp.iconic_dish_1_last_month), valStr(resp.iconic_dish_2_last_month), valStr(resp.iconic_dish_3_last_month)],
          eatingHabits: (resp.eating_habits && typeof resp.eating_habits === 'object') ? resp.eating_habits : {},
          livedAbroad: valStr(resp.lived_abroad),
          countryAbroad: valStr(resp.country_abroad),
          longestPeriodAbroad: valStr(resp.longest_period_abroad),
          impactOnEating: valStr(resp.impact_on_eating),
          connectedCuisines: splitMulti(resp.connected_cuisines),
          livingWith: splitMulti(resp.living_with),
          foodPriorities: splitMulti(resp.food_priorities),
          approachCooking: splitMulti(resp.approach_cooking),
          followSocialMedia: valStr(resp.follow_social_media),
          foodPurchasePlaces: splitMulti(resp.food_purchase_places),
          buyingInfluences: splitMulti(resp.buying_influences),
          dietaryPreferences: valStr(resp.dietary_preferences),
          topFoodPreferences: splitMulti(resp.top_food_preferences),
          iconicWhere: splitMulti(resp.iconic_dishes_where),
          iconicHowOften: valStr(resp.iconic_dishes_how_often),
          specifyImpact: valStr(resp.specify_impact),
          age: valStr(resp.age),
          currentSituation: valStr(resp.current_situation),
        };
      });
      setRespondents(mapped);
      setDishIcons(iconManifest || {});
      setIngredientIcons(ingIconManifest || {});
    }).catch(err => console.error('Story3 load error:', err));

    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json')
      .then(r => r.json())
      .then(world => setGeoData(topojson.feature(world, world.objects.countries)))
      .catch(console.error);
  }, []);

  // scroll-reveal for prose blocks
  useEffect(() => {
    if (!containerRef.current || !respondents.length) return;
    const els = containerRef.current.querySelectorAll('.s3-fade');
    els.forEach(el => {
      gsap.fromTo(el,
        { opacity: 0, y: 36 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 86%', toggleActions: 'play none none reverse' } });
    });
    return () => ScrollTrigger.getAll().forEach(t => t.kill());
  }, [respondents]);

  // dishes with known origins (chapter 1)
  const dishData = useMemo(() => {
    const map = new Map();
    respondents.forEach(r => {
      r.iconicDishes.forEach((dish, idx) => {
        const origin = lookupOrigin(dish);
        if (!origin) return;
        const key = normDish(dish);
        if (!map.has(key)) {
          map.set(key, { name: dish, count: 0, origin, claimedBy: new Map() });
        }
        const entry = map.get(key);
        entry.count++;
        const claim = r.country_birth || r.country_live || 'Unknown';
        entry.claimedBy.set(claim, (entry.claimedBy.get(claim) || 0) + 1);
      });
    });
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 20);
  }, [respondents]);

  // narrative statistics (live numbers quoted in the copy & quiz)
  const stats = useMemo(() => {
    const n = respondents.length || 1;
    const reflectTotal = respondents.filter(r => r.dishesReflect).length || 1;
    const noCount = respondents.filter(r => r.dishesReflect === 'No').length;
    const noPct = Math.round(noCount / reflectTotal * 100);

    const birthCountries = new Set(respondents.map(r => r.country_birth).filter(Boolean));

    const followCount = respondents.filter(r => r.followSocialMedia === 'Yes').length;
    // Ch. 14: do food creators reach a minority, about half or a majority?
    const followN = respondents.filter(r => r.followSocialMedia).length;
    const followVsRest = compareCounts(followCount, followN - followCount);
    const abroad = respondents.filter(r => r.livedAbroad === 'Yes');

    const cuisineCounts = {};
    respondents.forEach(r => (r.connectedCuisines || []).forEach(cu => {
      if (cu && cu !== 'other') cuisineCounts[cu] = (cuisineCounts[cu] || 0) + 1;
    }));
    const cuisinesSorted = Object.entries(cuisineCounts).sort((a, b) => b[1] - a[1]);
    const [topCuisineName, topCuisineCount] = cuisinesSorted[0] || ['Italian', 0];

    const impactHigh = group => {
      const ppl = abroad.filter(r => r.longestPeriodAbroad === group);
      if (!ppl.length) return 0;
      return Math.round(ppl.filter(r => r.impactOnEating === 'Completely' || r.impactOnEating === 'A lot').length / ppl.length * 100);
    };
    const longStayHigh = impactHigh('More than 1 year');
    const shortStayHigh = impactHigh('Less than 6 months');

    const beefKm = Math.round(sustainabilityPortions.ingredients.find(i => i.name === 'Beef')?.car_km ?? 30);

    // why-not reasons, as in chapter 2 (people, margin rule)
    const whyNot = computeWhyNot(respondents).data;
    const [w1, w2] = whyNot;
    const whyNotSummary = !w1 ? ''
      : (!w2 || clearlyAhead(w1.count, w2.count)
        ? `their top reason was “${w1.label.toLowerCase()}”.`
        : `“${w1.label.toLowerCase()}” and “${w2.label.toLowerCase()}” were neck and neck as their top reasons.`)
      + (whyNotLeadIsTime(whyNot) ? ' Tradition loses to a busy Tuesday, not to contempt.' : ' Tradition loses to everyday friction, not to contempt.');

    // does the top cuisine really grow a petal in every country garden?
    const topInEveryGarden = gardenReach(buildFlowers(respondents), topCuisineName).all;

    // age bands as answered (the survey asks for a band, not a birth year)
    const ageCounts = {};
    respondents.forEach(r => { if (r.age) ageCounts[r.age] = (ageCounts[r.age] || 0) + 1; });
    const ageTotal = Object.values(ageCounts).reduce((a, b) => a + b, 0);
    const bandLo = b => /^over/i.test(b) ? 999 : parseInt(b, 10) || 0;
    const bands = Object.keys(ageCounts).sort((a, b) => bandLo(a) - bandLo(b));
    const topBand = Object.entries(ageCounts).sort((a, b) => b[1] - a[1])[0];
    const ageText = ageTotal && topBand
      ? `${Math.round(topBand[1] / ageTotal * 100)}% aged ${topBand[0].toLowerCase()}; ages from ${bands[0].replace(/ to .*/, '')} to ${bands[bands.length - 1].toLowerCase().replace(/^\d+ to /, '')}`
      : '';
    const stockedN = respondents.filter(r => r.stockedFoodItems?.length).length;
    const cultureAnswered = respondents.filter(r => r.describeFoodCulture);
    const national = CULTURE_LEVELS.find(l => l.short === 'National');
    const nationPct = cultureAnswered.length && national
      ? Math.round(cultureAnswered.filter(r => national.match.test(r.describeFoodCulture)).length / cultureAnswered.length * 100) : 0;

    const noOpts = [...new Set([noPct, ...[noPct - 15, noPct + 20, noPct + 38, noPct - 30, noPct - 40]
      .filter(v => v >= 1 && v <= 99 && v !== noPct).slice(0, 3)])].sort((a, b) => a - b);
    const cuisineOpts = cuisinesSorted.slice(0, 4).map(([cu]) => cu).sort();
    const beefOpts = [...new Set([3, 12, beefKm, 80])].sort((a, b) => a - b);

    return {
      n: respondents.length,
      countries: birthCountries.size,
      noCount, noPct,
      followCount, followN, followVsRest, followPct: followN ? Math.round(followCount / followN * 100) : 0,
      abroadCount: abroad.length, abroadPct: Math.round(abroad.length / n * 100),
      topCuisineName, topCuisineCount, topInEveryGarden, whyNotSummary, ageText, stockedN, nationPct,
      longStayHigh, shortStayHigh,
      beefKm,
      quizNoOptions: noOpts, quizNoCorrect: noOpts.indexOf(noPct),
      quizCuisineOptions: cuisineOpts, quizCuisineCorrect: Math.max(cuisineOpts.indexOf(topCuisineName), 0),
      quizBeefOptions: beefOpts, quizBeefCorrect: beefOpts.indexOf(beefKm),
    };
  }, [respondents]);

  const countryOptions = useMemo(() => {
    const counts = {};
    respondents.forEach(r => {
      const c = r.country_live || r.country_birth;
      if (c) counts[c] = (counts[c] || 0) + 1;
    });
    return Object.keys(counts).filter(c => counts[c] >= 2).sort();
  }, [respondents]);

  if (!respondents.length) {
    return (
      <div className="story-fullwidth" style={{ width: '100vw', height: '100vh', background: C.bg,
        display: 'flex', flexDirection: 'column', gap: 18, justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ fontSize: 44, animation: 's3spin 1.6s linear infinite' }}>🍳</div>
        <div style={{ fontFamily: C.font, color: C.textM, fontSize: 15 }}>Setting the table…</div>
        <style>{GLOBAL_CSS}</style>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="story-fullwidth s3-root" style={{ width: '100vw', overflowX: 'clip', background: C.bg }}>
      <style>{GLOBAL_CSS}</style>

      <ProgressSystem chapters={CHAPTERS} />
      <StoryRotateNotice />

      <div style={{ zoom: storyZoom, '--s3z': storyZoom }}>

      <HeroScene stats={stats} chapters={CHAPTERS} userCountry={userCountry}
        setUserCountry={setUserCountry} countryOptions={countryOptions} />

      {/* ACT I — THE MYTH */}
      <ChapterIntro id="s3-ch1" num={1} act="Act I · The Myth" bg={C.bg} accent={C.coral}
        title={a => <>Where do “your” dishes <em style={{ color: a }}>actually</em> come from?</>}
        lede="Everyone grows up with a few dishes that feel iconic to them, drawn from their family, regional or cultural traditions. We asked survey respondents, most of them young adults living in Europe, to name three, then traced each one back through history. Scroll slowly: you are about to see how interwoven every kitchen really is." />
      <OriginsScene geoData={geoData} dishData={dishData} userCountry={userCountry} />

      <ChapterIntro id="s3-ch2" num={2} act="Act I · The Myth" bg={C.bgWarm} accent={C.coral}
        title={a => <>Fine, the dishes are borrowed. But do they even <em style={{ color: a }}>eat</em> them?</>}
        lede="A national dish is a story a country tells about itself. Here's what happens when you ask the people who are supposed to be living that story, starting with your own hunch." />
      <RealityScene respondents={respondents} stats={stats} />

      {/* ACT II — THE EVERYDAY */}
      <ChapterIntro id="s3-ch3" num={3} act="Act II · The Everyday" bg={C.bgWarm} accent={C.turmeric}
        title={a => <>The dishes that <em style={{ color: a }}>actually fill</em> the plate</>}
        lede="Away from postcards and grandmothers' Sundays, this is what lands on the table week after week: three dishes per person, no judgement. The bigger the bubble, the more people named that dish." />
      <EverydayScene respondents={respondents} dishIcons={dishIcons} />

      <ChapterIntro id="s3-island" num={4} act="Act II · The Everyday" bg={C.bg} accent={C.coral}
        title={a => <>The <em style={{ color: a }}>desert island</em> test</>}
        lede="One dish, forever, no rescue in sight. We asked every respondent what they'd take, then printed the menu of a very strange beach restaurant. If identity food were really about showing off, this is where the lobster and the truffles would appear. Browse the full menu, or filter it by what each dish means to the person who packed it." />
      <DesertIslandScene respondents={respondents} dishIcons={dishIcons} />

      <ChapterIntro id="s3-ch4" num={5} act="Act II · The Everyday" bg={C.bg} accent={C.berry}
        title={a => <>Which cuisines do young hearts <em style={{ color: a }}>beat</em> for?</>}
        lede="Identity isn't only what you eat, it's what you long for. We asked which cuisines people feel connected to, and drew every country as a flower: one petal per cuisine, sized by devotion." />
      <CrushesScene respondents={respondents} stats={stats} userCountry={userCountry} />

      <ChapterIntro id="s3-zoom" num={6} act="Act II · The Everyday" bg={C.bgWarm} accent={C.herb}
        title={a => <>“My food culture is…” <em style={{ color: a }}>Zoom in or zoom out?</em></>}
        lede={`Chapter 1 chased national dishes; the flowers above were national gardens. But when we asked people to name their own food culture (Catalan? Spanish? Mediterranean? just my family's?), the nation was the first answer of only ${stats.nationPct}%.`} />
      <CultureZoomScene geoData={geoData} respondents={respondents} />

      <ChapterIntro id="s3-ch5" num={7} act="Act II · The Everyday" bg={C.bgSage} accent={C.turmeric}
        title={a => <>What <em style={{ color: a }}>really</em> decides a meal?</>}
        lede="Every meal is a negotiation between five-second pleasures and lifelong values. Two questions, what matters when you eat and what matters when you buy, drawn as one chart so the gap is impossible to miss." />
      <DriversScene respondents={respondents} />

      {/* ACT III — THE FORCES */}
      <ChapterIntro id="s3-ch6" num={8} act="Act III · The Forces" bg={C.bgSage} accent={C.coral}
        title={a => <>The politics of the <em style={{ color: a }}>kitchen</em></>}
        lede="Behind every meal there's logistics: who cooks it, how often, and what the budget allows. The data has opinions about all three." />
      <KitchenScene respondents={respondents} />

      <ChapterIntro id="s3-kitchen2" num={9} act="Act III · The Forces" bg={C.bg} accent={C.turmeric}
        title={a => <>Open this generation's <em style={{ color: a }}>cupboard</em></>}
        lede={`We know who cooks and how often. Now let's look inside the kitchen itself: what sits on the shelves of ${stats.stockedN === 1 ? "1 respondent's kitchen" : `${stats.stockedN} respondents' kitchens`}, who put the knowledge there, and what they wish they knew. Every jar, book and note below is drawn from their answers.`} />
      <KitchenSelfScene respondents={respondents} />

      <ChapterIntro id="s3-ch7" num={10} act="Act III · The Forces" bg={C.bgWarm} accent={C.herb}
        title={a => <>The <em style={{ color: a }}>migrant</em> palate</>}
        lede={`Erasmus, work, love: ${clearlyAhead(stats.abroadPct, 50) ? 'more than half' : shareText(stats.abroadPct)} of our respondents have lived somewhere else, and their suitcases came back full of recipes. Borders couldn't contain the dishes in Chapter 1; they can't contain the recipes our respondents carry home either.`} />
      <MigrantScene geoData={geoData} respondents={respondents} stats={stats} />

      <ChapterIntro id="s3-ch8" num={11} act="Act III · The Forces" bg={C.bgTerra} accent={C.berry}
        title={a => <>From front door to dinner plate: the <em style={{ color: a }}>pipeline</em></>}
        lede="Food follows a path through every household: who you live with → who cooks → where food is bought → how it's made. Four columns, four choices, and one very crowded route." />
      <PipelineScene respondents={respondents} />

      {/* ACT IV — TOMORROW */}
      <ChapterIntro id="s3-flavour" num={12} act="Act IV · Tomorrow" bg={C.bg} accent={C.turmeric}
        title={a => <>Can you guess a country's <em style={{ color: a }}>flavour signature</em>?</>}
        lede="We asked everyone to name the three ingredients most iconic to their food culture. Put together, each country gets a flavour signature: three ingredients that say 'home'. Before we weigh what those ingredients cost the planet, test yourself: can you guess them?" />
      <FlavourQuizScene respondents={respondents} ingredientIcons={ingredientIcons} />

      <ChapterIntro id="s3-ch9" num={13} act="Act IV · Tomorrow" bg={C.bgWarm} accent={C.herb}
        title={a => <>What the plate costs the <em style={{ color: a }}>planet</em></>}
        lede="A different kind of trace: not where dishes come from, but what they leave behind. Measured in units you can feel: kilometres driven, bottles of water, square metres of land." />
      <PlanetScene sustainability={sustainabilityPortions} ingredientIcons={ingredientIcons} respondents={respondents} />

      <ChapterIntro id="s3-ch10" num={14} act="Act IV · Tomorrow" bg={C.bgSage} accent={C.berry}
        title={a => (stats.followVsRest === 'behind'
          ? <>A minority cooks from the <em style={{ color: a }}>feed</em></>
          : stats.followVsRest === 'close'
            ? <>Half the table follows the <em style={{ color: a }}>feed</em></>
            : <>The new cookbook is a <em style={{ color: a }}>feed</em></>)}
        lede={stats.followVsRest === 'behind'
          ? `Recipes still travel mainly down generations: ${shareText(stats.followPct)} of our respondents (${stats.followCount} of ${stats.followN}) follow food creators online. For that minority the screen is a second teacher, recipes in under thirty seconds and with better lighting.`
          : stats.followVsRest === 'close'
            ? `About half of our respondents (${stats.followCount} of ${stats.followN}) follow food creators online. For them the screen has become a second teacher, recipes in under thirty seconds and with better lighting.`
            : `Recipes used to travel down generations. Now, for ${shareText(stats.followPct)} of our respondents (${stats.followCount} of ${stats.followN}), they also travel down a screen, often in under thirty seconds, but with better lighting. If the next chapter of European food is being written anywhere, it's here.`} />
      <FeedScene respondents={respondents} stats={stats} />

      <div id="s3-epilogue">
        <EpilogueScene stats={stats} />
      </div>

      </div>
    </div>
  );
}
