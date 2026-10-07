// Every answer text the story looks for must exist in the survey definition.
import surveyRelishJSON from './surveyRelishData';
import surveyFutureJSON from './surveyFutureData';
import { ANSWER_MATCHERS } from '../dashboards/story3/scenes';
import { OUTLOOK_AXES, RELEVANCE_AXES } from '../dashboards/FuturesRadar';

const fold = s => String(s).replace(/[’‘´`]/g, "'");

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
const values = list => (list || []).map(c => (c && typeof c === 'object' ? c.value : c)).map(fold);
function choiceValues(q) {
  if (q.type === 'boolean') return [fold(q.valueTrue ?? 'true'), fold(q.valueFalse ?? 'false')];
  const v = values(q.choices);
  if (q.hasOther || q.showOtherItem) v.push('other');
  return v;
}
const found = (vals, m) => (m instanceof RegExp ? vals.some(v => m.test(v)) : vals.includes(fold(m)));

describe('option texts the youth story looks for exist in the youth survey', () => {
  test.each(ANSWER_MATCHERS.map(m => [m.q, m]))('%s', (name, m) => {
    const q = findQuestion(surveyRelishJSON, name);
    expect(q).toBeTruthy();
    const missing = [];
    if (m.rows) {
      const rows = values(q.rows), cols = values(q.columns);
      m.rows.forEach(r => { if (!rows.includes(fold(r))) missing.push(`row ${r}`); });
      (m.columns || []).forEach(c => { if (!cols.includes(fold(c))) missing.push(`column ${c}`); });
    } else {
      const vals = choiceValues(q);
      (m.match || []).forEach(x => { if (!found(vals, x)) missing.push(String(x)); });
      (m.prefix || []).forEach(p => { if (!vals.some(v => v.startsWith(fold(p)))) missing.push(`${p}…`); });
    }
    expect(missing).toEqual([]);
  });
});

test('questions the futures reveal reads exist in the futures survey', () => {
  const missing = [...OUTLOOK_AXES, ...RELEVANCE_AXES].map(a => a.key).filter(k => !findQuestion(surveyFutureJSON, k));
  expect(missing).toEqual([]);
});
