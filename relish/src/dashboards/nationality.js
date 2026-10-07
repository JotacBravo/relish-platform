// Folds free-text nationality answers into one demonym per country.
// lowercased answer -> canonical demonym
const ALIASES = {};
const alias = (canonical, ...variants) => {
  ALIASES[canonical.toLowerCase()] = canonical;
  variants.forEach(v => { ALIASES[v.toLowerCase()] = canonical; });
};

alias('Portuguese', 'portugal');
alias('German', 'germany', 'deutsch', 'deutsche');
alias('Italian', 'italy', 'italia');
alias('French', 'france', 'français', 'française', 'francaise', 'francais');
alias('British', 'uk', 'u.k.', 'united kingdom', 'great britain', 'england', 'english');
alias('Irish', 'ireland', 'irisj', 'black-irish');
alias('Spanish', 'spain', 'española', 'español', 'espanola', 'espanol');
alias('Danish', 'denmark');
alias('Thai', 'thailand');
alias('American', 'usa', 'u.s.a.', 'us', 'united states', 'united states of america');
alias('Dutch', 'netherlands', 'nl', 'holland');
alias('Ukrainian', 'ukraine');
alias('Bulgarian', 'bulgaria');
alias('Polish', 'poland');
alias('Slovak', 'slovakia', 'slovakian');
alias('Chinese', 'china');
alias('Georgian', 'georgia');
alias('Indian', 'india');
alias('Nigerian', 'nigeria');
alias('Norwegian', 'norway');
alias('Pakistani', 'pakistan');
alias('Tunisian', 'tunisia');
alias('Turkish', 'turkey', 'türkiye');
alias('Australian', 'australia');
alias('Austrian', 'austria');
alias('Belgian', 'belgium');
alias('Egyptian', 'egypt');
alias('Indonesian', 'indonesia');
alias('Romanian', 'romania');
alias('Russian', 'russia');
alias('Syrian', 'syria', 'syrien');
alias('Algerian', 'algeria');
alias('Brazilian', 'brazil', 'brazillian', 'brasil', 'brasilian');
alias('Czech', 'czechia', 'czech republic');
alias('Filipino', 'philippines', 'philippine');
alias('Hungarian', 'hungary');
alias('Israeli', 'israel');
alias('Kenyan', 'kenya');
alias('Libyan', 'libya');
alias('Malaysian', 'malaysia');
alias('Moroccan', 'morocco', 'marroquí', 'marroqui');
alias('Peruvian', 'peru');
alias('Iranian', 'iran', 'persian');
alias('Swiss', 'switzerland');
alias('Trinidadian', 'trinidad', 'trinidad and tobago');
alias('Uzbek', 'uzbekistan', 'uzbekistani');
alias('Vietnamese', 'vietnam');
alias('Zimbabwean', 'zimbabwe');
alias('Venezuelan', 'venezuela');
alias('Cape Verdean', 'capeverdean', 'cape verde', 'cabo verde');
alias('South African', 'south africa');
alias('Scottish', 'scotland');
alias('Welsh', 'wales');
alias('Greek', 'greece');
alias('Swedish', 'sweden');
alias('Finnish', 'finland');
alias('Croatian', 'croatia');
alias('Serbian', 'serbia');
alias('Lithuanian', 'lithuania');
alias('Latvian', 'latvia');
alias('Estonian', 'estonia');
alias('Slovenian', 'slovenia');
alias('Mexican', 'mexico');
alias('Colombian', 'colombia');
alias('Argentinian', 'argentina', 'argentine');
alias('Japanese', 'japan');
alias('Korean', 'korea', 'south korea');

const titleCase = s => s.replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

export function normaliseNationality(value, mapping = null) {
  const raw = String(value ?? '').trim();
  if (!raw) return [];

  const parts = raw
    .split(/\s*(?:,|\/|&|\+|\band\b|\be\b)\s*/i)
    .map(p => p.trim().replace(/[.]+$/, ''))
    .filter(Boolean);

  const out = [];
  let anyKnown = false;
  for (const p of parts) {
    const known = ALIASES[p.toLowerCase()];
    if (known) { anyKnown = true; out.push(known); continue; }
    const mapped = mapping ? mapping[p] : undefined;
    if (mapped === null) continue;                                  // judged junk
    if (typeof mapped === 'string' && mapped.trim()) { out.push(mapped.trim()); continue; }
    if (Array.isArray(mapped)) { mapped.filter(Boolean).forEach(m => out.push(String(m))); continue; }
    out.push(titleCase(p));
  }

  // whole-answer verdict, for answers that never split into known parts
  if (!anyKnown && mapping && raw in mapping) {
    const whole = mapping[raw];
    if (whole === null) return [];
    if (typeof whole === 'string' && whole.trim()) return [whole.trim()];
    if (Array.isArray(whole)) return [...new Set(whole.filter(Boolean).map(String))];
  }

  const seen = new Set();
  return out.filter(p => {
    if (seen.has(p)) return false;        // "German and German"
    seen.add(p);
    return true;
  });
}

export default normaliseNationality;
