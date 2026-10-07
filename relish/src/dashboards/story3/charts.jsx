// Charts used by The Borrowed Plate: maps, bubbles, flowers, radars, sankey and more.
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { storylog } from '../../eval/evalTelemetry';
import { createPortal } from 'react-dom';
import * as d3 from 'd3';
import { C, COUNTRY_CENTROID, geoToSurvey, Tip, AnimatedNumber, useOnScreen, cap } from './shared';

// World map with cinematic zoom

export const MAP_W = 820, MAP_H = 470;
const MAP_VIEW_TOP = 84, MAP_VIEW_H = 422;
const MAP_VIEW_CY = MAP_VIEW_TOP + MAP_VIEW_H / 2;
const SKIP_COUNTRIES = new Set(['Antarctica']);

export function useProjection() {
  return useMemo(() => {
    const projection = d3.geoNaturalEarth1().center([15, 30]).scale(175).translate([MAP_W / 2, MAP_H / 2]);
    const pathGen = d3.geoPath().projection(projection);
    return { projection, pathGen };
  }, []);
}

export const ccoord = name => COUNTRY_CENTROID[name] || null;

const hashStr = s => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
const mulberry32 = a => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export function scatterInCountries(geoData, byCountry = {}, color, {
  maxPerCountry = 7, spreadDeg = 3.6, tries = 60, rMin = 1.5, rGain = 1.3,
} = {}) {
  if (!geoData) return [];
  const featureOf = {};
  geoData.features.forEach(f => { featureOf[geoToSurvey(f.properties?.name)] = f; });

  const max = Math.max(...Object.values(byCountry), 1);
  const dots = [];
  Object.keys(byCountry).sort().forEach(cn => {
    const n = byCountry[cn];
    const anchor = ccoord(cn);
    const feat = featureOf[cn];
    if (!n || !anchor || !feat) return;
    const t = n / max;
    const rnd = mulberry32(hashStr(cn));
    for (let i = 0; i < Math.min(n, maxPerCountry); i++) {
      let pt = null;
      for (let k = 0; k < tries && !pt; k++) {
        const ang = rnd() * Math.PI * 2;
        const rad = Math.sqrt(rnd()) * spreadDeg;      // uniform over the disc
        const lat = anchor[1] + Math.sin(ang) * rad;
        // widen longitude with latitude so the disc stays visually round
        const lon = anchor[0] + (Math.cos(ang) * rad) / Math.max(0.35, Math.cos(lat * Math.PI / 180));
        if (d3.geoContains(feat, [lon, lat])) pt = [lon, lat];
      }
      if (!pt && d3.geoContains(feat, anchor)) pt = anchor;   // last resort
      if (pt) dots.push({ at: pt, color, noRing: true, r: rMin + t * rGain, opacity: 0.32 + t * 0.5 });
    }
  });
  return dots;
}

function arcPathBetween(p1, p2) {
  const [x1, y1] = p1, [x2, y2] = p2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  // perpendicular, bowing upward
  let px = -dy / len, py = dx / len;
  if (py > 0) { px = -px; py = -py; }
  const bow = Math.min(len * 0.28, 90);
  const qx = mx + px * bow, qy = my + py * bow;
  return { d: `M ${x1},${y1} Q ${qx},${qy} ${x2},${y2}`, len, cp: [qx, qy] };
}

const bezAt = (t, p0, c, p1) => {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0],
    u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]];
};

const ZOOM_MIN = 1, ZOOM_MAX = 8;
const WORLD_FRAME = { center: [15, 30], scale: 1 };
const MAP_RECT = [[0, MAP_VIEW_TOP], [MAP_W, MAP_VIEW_TOP + MAP_VIEW_H]];

function ZoomableSvg({ target, hint, children }) {
  const ref = useRef(null);
  const zoomRef = useRef(null);
  const [t, setT] = useState(target);
  const [wheelNudge, setWheelNudge] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const sel = d3.select(el);
    const zoom = d3.zoom()
      .scaleExtent([ZOOM_MIN, ZOOM_MAX])
      .extent(MAP_RECT)
      .translateExtent(MAP_RECT)
      .filter(ev => {
        // one finger scrolls the page; two fingers pinch the map
        if (ev.type === 'touchstart') return ev.touches && ev.touches.length > 1;
        // a plain wheel scrolls the page; Ctrl/⌘ + wheel (or a trackpad pinch) zooms
        if (ev.type === 'wheel') return ev.ctrlKey || ev.metaKey;
        return !ev.button;
      })
      .on('zoom', ev => setT(ev.transform));
    zoomRef.current = zoom;
    sel.call(zoom).call(zoom.transform, target);
    let nudgeTimer = null, nudged = false;
    const onWheel = ev => {
      if (ev.ctrlKey || ev.metaKey) { ev.preventDefault(); return; }
      if (nudged) return;
      nudged = true;
      setWheelNudge(true);
      clearTimeout(nudgeTimer);
      nudgeTimer = setTimeout(() => setWheelNudge(false), 1400);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      sel.on('.zoom', null);
      el.removeEventListener('wheel', onWheel);
      clearTimeout(nudgeTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = ref.current;
    if (!el || !zoomRef.current) return;
    d3.select(el).transition().duration(1350).ease(d3.easeCubicOut)
      .call(zoomRef.current.transform, target);
  }, [target]);

  const by = k => {
    const el = ref.current;
    if (!el || !zoomRef.current) return;
    d3.select(el).transition().duration(220).call(zoomRef.current.scaleBy, k);
  };
  const back = () => {
    const el = ref.current;
    if (!el || !zoomRef.current) return;
    d3.select(el).transition().duration(320).call(zoomRef.current.transform, target);
  };
  const moved = Math.abs(t.k - target.k) > 0.001
    || Math.abs(t.x - target.x) > 0.5 || Math.abs(t.y - target.y) > 0.5;

  const btn = (label, onClick, title) => (
    <button onClick={onClick} title={title} aria-label={title}
      style={{ width: 30, height: 30, borderRadius: 9, border: 'none', cursor: 'pointer',
        background: 'rgba(255,249,240,0.92)', color: C.text, fontFamily: C.font,
        fontSize: label === '⟲' ? 14 : 17, fontWeight: 700, lineHeight: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 10px rgba(61,43,31,0.22)', backdropFilter: 'blur(4px)' }}>
      {label}
    </button>
  );

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={ref} viewBox={`0 ${MAP_VIEW_TOP} ${MAP_W} ${MAP_VIEW_H}`}
        style={{ width: '100%', height: 'auto', display: 'block',
          cursor: 'grab', touchAction: 'pan-y' }}>
        <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
          {children(t.k)}
        </g>
      </svg>
      <div style={{ position: 'absolute', left: 8, bottom: 8, zIndex: 3, display: 'flex', gap: 6 }}>
        {btn('+', () => by(1.6), 'Zoom in')}
        {btn('−', () => by(1 / 1.6), 'Zoom out')}
        {moved && btn('⟲', back, "Back to the chapter's view")}
      </div>
      <div aria-hidden="true" style={{ position: 'absolute', left: '50%', top: '50%', zIndex: 4,
        transform: 'translate(-50%, -50%)', pointerEvents: 'none',
        opacity: wheelNudge ? 1 : 0, transition: 'opacity 0.25s',
        background: 'rgba(40,28,18,0.82)', color: '#fff', borderRadius: 10, padding: '8px 14px',
        fontFamily: C.font, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
        Use Ctrl/⌘ + scroll to zoom
      </div>
      {hint && (
        <div style={{ position: 'absolute', right: 8, bottom: 8, zIndex: 3, pointerEvents: 'none',
          background: 'rgba(255,249,240,0.86)', borderRadius: 8, padding: '4px 9px',
          fontFamily: C.font, fontSize: 10.5, color: C.textM, backdropFilter: 'blur(4px)' }}>
          {hint}
        </div>
      )}
    </div>
  );
}

export function StoryMap({ geoData, view = { center: [15, 30], scale: 1 }, fills = {}, arcs = [],
  dots = [], stepKey = 0, onCountryHover, onCountryLeave, defaultFill = '#EDE5D4', defaultStroke = '#DCD3BE' }) {
  const { projection, pathGen } = useProjection();
  const [fs, setFs] = useState(false);
  useEffect(() => {
    if (!fs) return undefined;
    const onKey = e => { if (e.key === 'Escape') setFs(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fs]);

  const countryPaths = useMemo(() => {
    if (!geoData) return [];
    return geoData.features
      .filter(f => !SKIP_COUNTRIES.has(f.properties?.name))
      .map((f, i) => ({
        key: i, name: geoToSurvey(f.properties?.name), d: pathGen(f),
      }));
  }, [geoData, pathGen]);

  const resolve = pt => Array.isArray(pt) ? projection(pt) : (ccoord(pt) ? projection(ccoord(pt)) : null);

  const renderedArcs = useMemo(() => arcs.map((a, i) => {
    const p1 = resolve(a.from), p2 = resolve(a.to);
    if (!p1 || !p2) return null;
    const { d, len, cp } = arcPathBetween(p1, p2);
    return { ...a, i, d, len, cp, p1, p2 };
  }).filter(Boolean), [arcs, projection]); // eslint-disable-line react-hooks/exhaustive-deps

  const TRAIL_LAG = [0, 0.05, 0.11];
  const TRAIL_OPACITY = [0.95, 0.5, 0.24];
  const dotsRef = useRef([]);
  useEffect(() => {
    const dots = renderedArcs.filter(a => !a.noDot);
    if (!dots.length) return undefined;
    let raf;
    const t0 = performance.now();
    const tick = now => {
      const elapsed = (now - t0) / 1000;
      dots.forEach(a => {
        const els = dotsRef.current[a.i];
        if (!els) return;
        const dur = 2.2 + (a.i % 3) * 0.5;
        const begin = 0.2 + a.i * 0.12;
        let t = (elapsed - begin) / dur;
        if (t < 0) { els.forEach && els.forEach(e => e && (e.style.opacity = '0')); return; }
        t -= Math.floor(t);
        (els.forEach ? els : [els]).forEach((e, k) => {
          if (!e) return;
          const tk = t - (TRAIL_LAG[k] || 0);
          if (tk < 0) { e.style.opacity = '0'; return; }
          const [x, y] = bezAt(tk, a.p1, a.cp, a.p2);
          e.setAttribute('cx', x);
          e.setAttribute('cy', y);
          e.style.opacity = String(TRAIL_OPACITY[k] ?? 0.9);
        });
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [renderedArcs]); // eslint-disable-line react-hooks/exhaustive-deps

  const frameFor = vw => {
    const k = Math.min(Math.max(vw.scale || 1, ZOOM_MIN), ZOOM_MAX);
    const c = projection(vw.center || [15, 30]);
    return d3.zoomIdentity.translate(MAP_W / 2 - k * c[0], MAP_VIEW_CY - k * c[1]).scale(k);
  };
  const target = useMemo(() => frameFor(view),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view.scale, view.center && view.center[0], view.center && view.center[1]]);
  const worldTarget = useMemo(() => frameFor(WORLD_FRAME),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []);

  const body = s => (
      <g>
        {countryPaths.map(cp => {
          const f = fills[cp.name];
          return (
            <path key={cp.key} d={cp.d}
              fill={f?.fill || defaultFill}
              stroke={f?.stroke || defaultStroke}
              strokeWidth={(f?.sw || 0.45) / s}
              style={{ transition: 'fill 0.6s, stroke 0.6s', cursor: onCountryHover && f ? 'pointer' : 'default' }}
              onMouseEnter={e => onCountryHover && onCountryHover(cp.name, e)}
              onMouseMove={e => onCountryHover && onCountryHover(cp.name, e)}
              onMouseLeave={() => onCountryLeave && onCountryLeave(cp.name)}
            />
          );
        })}

        {/* travel threads */}
        <g key={`arcs-${stepKey}`} style={{ pointerEvents: 'none' }}>
          {renderedArcs.map(a => (
            <g key={a.i}>
              <path d={a.d} fill="none" stroke={a.color || C.coral} strokeWidth={(a.width || 1.6) / s}
                strokeDasharray={a.dashed ? `${5 / s},${4 / s}` : `${a.len}`}
                strokeDashoffset={a.dashed ? 0 : a.len}
                opacity={a.opacity ?? 0.75}
                style={a.dashed ? {} : { animation: `s3draw 1.4s ease ${0.15 + a.i * 0.12}s forwards` }} />
              {!a.noDot && [0, 1, 2].map(k => (
                <circle key={k}
                  ref={el => { if (!Array.isArray(dotsRef.current[a.i])) dotsRef.current[a.i] = []; dotsRef.current[a.i][k] = el; }}
                  r={(k === 0 ? 4.4 : k === 1 ? 3 : 2) / s} fill={a.color || C.coral}
                  stroke={k === 0 ? 'rgba(255,249,240,0.9)' : 'none'} strokeWidth={(k === 0 ? 1.2 : 0) / s}
                  style={{ opacity: 0 }} />
              ))}
              {/* static arrowhead at the destination so direction reads even before the comet arrives */}
              {!a.noDot && (() => {
                const ang = Math.atan2(a.p2[1] - a.cp[1], a.p2[0] - a.cp[0]) * 180 / Math.PI;
                const h = 6 / s;
                return (
                  <path d={`M0,${-h * 0.6} L${h},0 L0,${h * 0.6} Z`} fill={a.color || C.coral}
                    opacity={a.opacity ?? 0.75}
                    transform={`translate(${a.p2[0]},${a.p2[1]}) rotate(${ang})`} />
                );
              })()}
              {a.n != null && (() => {
                const pc = a.countAt === 'to' ? a.p2 : a.p1;
                return (
                <g>
                  <circle cx={pc[0]} cy={pc[1]} r={(3 + Math.min(a.n, 6)) / s} fill={a.endColor || C.herb} opacity={0.9} />
                  {a.label && (
                    <text x={pc[0]} y={pc[1] - 9 / s} textAnchor="middle"
                      style={{ fontFamily: C.font, fontSize: 9.5 / s, fill: C.text, fontWeight: 700,
                        paintOrder: 'stroke', stroke: 'rgba(255,249,240,0.85)', strokeWidth: 2.5 / s }}>
                      {a.label}
                    </text>
                  )}
                </g>
                );
              })()}
            </g>
          ))}
        </g>

        {/* markers */}
        {dots.map((dot, i) => {
          const p = resolve(dot.at);
          if (!p) return null;
          return (
            <g key={`dot-${i}`} style={{ pointerEvents: 'none' }}>
              <circle cx={p[0]} cy={p[1]} r={(dot.r || 6.5) / s} fill={dot.color || C.coral}
                opacity={dot.opacity ?? 1}
                stroke={dot.noRing ? 'none' : 'rgba(255,249,240,0.95)'}
                strokeWidth={dot.noRing ? 0 : 1.6 / s} />
              {dot.pulse && (
                <circle cx={p[0]} cy={p[1]} r={(dot.r || 6) / s} fill="none" stroke={dot.color || C.coral} strokeWidth={1 / s} opacity={0.5}>
                  <animate attributeName="r" from={(dot.r || 6) / s} to={(dot.r || 6) * 3.2 / s} dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from={0.6} to={0} dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              {dot.label && (
                <text x={p[0]} y={p[1] + (dot.labelBelow ? 16 / s : -10 / s)} textAnchor="middle"
                  style={{ fontFamily: C.font, fontSize: 11 / s, fill: dot.color || C.coral, fontWeight: 700,
                    paintOrder: 'stroke', stroke: 'rgba(255,249,240,0.9)', strokeWidth: 3 / s }}>
                  {dot.label}
                </text>
              )}
            </g>
          );
        })}
      </g>
  );

  const svg = (hint, tgt) => (
    <ZoomableSvg target={tgt} hint={hint}>{body}</ZoomableSvg>
  );

  const fsBtn = (onClick, big) => (
    <button onClick={onClick} title={big ? 'Close fullscreen' : 'View map fullscreen'}
      aria-label={big ? 'Close fullscreen' : 'View map fullscreen'}
      style={{ position: 'absolute', top: big ? 14 : 8, right: big ? 14 : 8, zIndex: 3,
        height: 34, width: big ? 'auto' : 34, padding: big ? '0 14px' : 0, borderRadius: 10, cursor: 'pointer',
        border: 'none', background: big ? C.coral : 'rgba(255,249,240,0.92)', color: big ? '#fff' : C.text,
        fontFamily: C.font, fontSize: big ? 13 : 16, fontWeight: 700, lineHeight: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        boxShadow: '0 2px 10px rgba(61,43,31,0.22)', backdropFilter: 'blur(4px)', transition: 'all 0.18s' }}
      onMouseEnter={e => { if (!big) { e.currentTarget.style.background = C.coral; e.currentTarget.style.color = '#fff'; } }}
      onMouseLeave={e => { if (!big) { e.currentTarget.style.background = 'rgba(255,249,240,0.92)'; e.currentTarget.style.color = C.text; } }}>
      {big ? '✕ Close' : '⤢'}
    </button>
  );

  return (
    <div style={{ position: 'relative' }}>
      {svg('drag to pan · Ctrl/⌘ + scroll or +/− to zoom · ⤢ for a bigger map', target)}
      {fsBtn(() => setFs(true), false)}
      {fs && createPortal(
        <div onClick={() => setFs(false)} role="dialog" aria-modal="true"
          style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(40,28,18,0.93)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'min(5vw, 40px)',
            animation: 's3fadein 0.28s ease both' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ position: 'relative', width: `min(95vw, calc(86vh * ${MAP_W / MAP_VIEW_H}))`, maxHeight: '92vh', overflow: 'auto',
              background: C.bg, borderRadius: 18, padding: '18px 18px 12px', boxShadow: '0 24px 90px rgba(0,0,0,0.55)' }}>
            {svg('drag to pan · Ctrl/⌘ + scroll or +/− to zoom · double-click to zoom in', worldTarget)}
            {fsBtn(() => setFs(false), true)}
            <div style={{ textAlign: 'center', marginTop: 8, fontFamily: C.font, fontSize: 12, color: C.textL }}>
              A bigger look at the map · press Esc or click outside to close
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// People wall (100 person glyphs, icon-array statistic)

export function PersonGlyph({ fill, size = 13, delay = 0 }) {
  const t = { transition: `fill 0.4s ease ${delay}ms` };
  return (
    <svg width={size} height={size * 1.55} viewBox="0 0 20 32" style={{ display: 'block' }}>
      <circle cx="10" cy="6" r="5" fill={fill} style={t} />
      <path d="M3 14 C3 12 7 11 10 11 C13 11 17 12 17 14 L17 26 C17 27 16 28 15 28 L5 28 C4 28 3 27 3 26 Z"
        fill={fill} style={t} />
    </svg>
  );
}

export function PeopleWall({ pct, accent = C.coral, active = true, cols = 20 }) {
  const filled = Math.round(pct);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 4, maxWidth: 460 }}>
      {Array.from({ length: 100 }).map((_, i) => {
        const isOn = active && i < filled;
        return (
          <PersonGlyph key={i} fill={isOn ? accent : 'rgba(61,43,31,0.13)'} size={14}
            delay={isOn ? i * 14 : 0} />
        );
      })}
    </div>
  );
}

export const WHY_NOT_COLORS = [C.coral, C.turmeric, C.herb, C.berry, '#5B8FB9', '#8B6B3D', 'rgba(61,43,31,0.35)'];

export function WhyNotBars({ data, n, examples = [] }) {
  const [hov, setHov] = useState(null);
  const isOther = lbl => /^other\b/i.test(lbl || '');
  // data arrives sorted largest → smallest
  const bars = data.map((d, i) => ({ ...d, i, color: WHY_NOT_COLORS[i % WHY_NOT_COLORS.length] }));
  const active = hov != null ? bars[hov] : null;
  const otherBar = bars.find(b => isOther(b.label));
  const showExamples = examples.length > 0 && active && isOther(active.label);
  // hover on desktop, tap on touch (tap again to close)
  const handlers = i => ({
    onMouseEnter: () => setHov(i),
    onMouseLeave: () => setHov(null),
    onClick: () => setHov(h => (h === i ? null : i)),
  });

  return (
   <div>
    <div style={{ fontFamily: C.font, fontSize: 12, color: C.textL, textAlign: 'center', marginBottom: 14, lineHeight: 1.5 }}>
      % of the {n === 1 ? '1 person' : `${n} people`} who said “No” and gave at least one reason
    </div>
    <div role="list" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 560, margin: '0 auto' }}>
      {bars.map(b => (
        <div key={b.i} role="listitem" {...handlers(b.i)}
          aria-label={`${b.label}: ${b.pct}% (${b.count} of ${n} people)`}
          style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 9.5em) 1fr 2.8em', alignItems: 'center',
            columnGap: 10, cursor: 'pointer',
            opacity: hov == null || hov === b.i ? 1 : 0.35, transition: 'opacity 0.25s' }}>
          <span style={{ fontFamily: C.font, fontSize: 12.5, color: C.text, lineHeight: 1.25 }}>
            {b.label}
            {isOther(b.label) && examples.length > 0 && (
              <span style={{ display: 'block', color: C.textL, fontSize: 10.5, fontStyle: 'italic' }}>hover for examples</span>
            )}
          </span>
          <div style={{ height: 14, borderRadius: 7, background: 'rgba(61,43,31,0.07)', overflow: 'hidden' }}>
            <div style={{ width: `${b.pct}%`, height: '100%', borderRadius: 7, background: b.color,
              transition: 'width 0.6s cubic-bezier(.2,.8,.2,1)' }} />
          </div>
          <span style={{ fontFamily: C.font, fontSize: 12, fontWeight: 700, color: b.color, textAlign: 'right', whiteSpace: 'nowrap' }}>
            {b.pct}%
          </span>
        </div>
      ))}
    </div>
    <div style={{ fontFamily: C.font, fontSize: 11.5, color: C.textL, textAlign: 'center', marginTop: 12,
      fontStyle: 'italic', lineHeight: 1.5 }}>
      {bars.reduce((t, x) => t + x.count, 0) > n
        ? 'Each person could pick several reasons, so the bars add up to more than 100%.'
        : 'Each person could pick several reasons.'}
    </div>

    {examples.length > 0 && otherBar && (
      <div style={{ minHeight: 58, marginTop: 12, transition: 'opacity 0.25s',
        opacity: showExamples ? 1 : 0, pointerEvents: 'none' }}>
        <div style={{ background: C.bgWarm, borderRadius: 12, padding: '10px 14px',
          borderLeft: `3px solid ${otherBar.color}` }}>
          <div style={{ fontFamily: C.font, fontSize: 10.5, fontWeight: 800, letterSpacing: 1,
            textTransform: 'uppercase', color: otherBar.color, marginBottom: 6 }}>
            In their own words · “Other”
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {examples.slice(0, 3).map((ex, i) => (
              <div key={i} style={{ fontFamily: C.font, fontSize: 12, color: C.textM, lineHeight: 1.45, fontStyle: 'italic' }}>
                “{ex}”
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
   </div>
  );
}

const BUBBLE_MIN_R = 13, BUBBLE_MAX_R = 42;
const RADIAL_W = 780, RADIAL_INNER = 52, RADIAL_MAX = 328;

export function computeBubbleNodes(respondents, dishIcons) {
  const stats = {};
  respondents.forEach(r => {
    const iconicSet = new Set(r.iconicDishes.map(d => d?.toLowerCase()));
    [0, 1, 2].forEach(idx => {
      const dish = r.regularDishes[idx];
      if (!dish) return;
      if (!stats[dish]) stats[dish] = { count: 0, iconic: 0, selfPrep: 0, selfPrepTotal: 0 };
      stats[dish].count++;
      if (iconicSet.has(dish.toLowerCase())) stats[dish].iconic++;
      const sp = r.dishSelfPrepare[idx];
      if (sp === 'Yes' || sp === 'No') {
        stats[dish].selfPrepTotal++;
        if (sp === 'Yes') stats[dish].selfPrep++;
      }
    });
  });
  const data = Object.entries(stats)
    .map(([name, s]) => ({
      name, count: s.count,
      iconicPct: s.count > 0 ? Math.round(s.iconic / s.count * 100) : 0,
      selfPrepPct: s.selfPrepTotal > 0 ? Math.round(s.selfPrep / s.selfPrepTotal * 100) : 0,
      iconFile: dishIcons[name] || null,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 36);

  const W = RADIAL_W, cx = W / 2, cy = W / 2;
  if (!data.length) return { nodes: [], svgW: W, svgH: W, cx, cy, maxIconic: 40, innerR: RADIAL_INNER, Rmax: RADIAL_MAX };

  const maxCount = data[0].count;
  const maxIconic = Math.ceil(Math.max(...data.map(d => d.iconicPct), 10) / 10) * 10;

  const nodes = data.map(d => {
    const r = BUBBLE_MIN_R + Math.sqrt(d.count / maxCount) * (BUBBLE_MAX_R - BUBBLE_MIN_R);
    return { ...d, r, ringW: 5, outerR: r + 7,
      targetD: RADIAL_INNER + (1 - d.iconicPct / maxIconic) * (RADIAL_MAX - RADIAL_INNER) };
  });

  const GOLD = Math.PI * (3 - Math.sqrt(5));
  const placed = [];
  [...nodes].sort((a, b) => b.iconicPct - a.iconicPct || b.count - a.count).forEach((n, i) => {
    let angle = i * GOLD, d = n.targetD, tries = 0;
    const hits = (x, y) => placed.some(p => Math.hypot(x - p.x, y - p.y) < (n.outerR + p.outerR + 3));
    let x = cx + Math.cos(angle) * d, y = cy + Math.sin(angle) * d;
    while (hits(x, y) && tries < 600) { tries++; angle += 0.45; d += 0.9; x = cx + Math.cos(angle) * d; y = cy + Math.sin(angle) * d; }
    n.x = x; n.y = y; n.dist = d;
    placed.push(n);
  });

  return { nodes, svgW: W, svgH: W, cx, cy, maxIconic, innerR: RADIAL_INNER, Rmax: RADIAL_MAX };
}

const prepArc = (cx, cy, r, pct) => {
  if (pct <= 0) return '';
  const ringR = r + 6;
  const startA = -Math.PI / 2;
  const sweep = (Math.min(pct, 100) / 100) * Math.PI * 2;
  const endA = startA + sweep;
  const large = sweep > Math.PI ? 1 : 0;
  const x1 = cx + ringR * Math.cos(startA), y1 = cy + ringR * Math.sin(startA);
  const x2 = cx + ringR * Math.cos(endA), y2 = cy + ringR * Math.sin(endA);
  if (pct >= 100) {
    return `M${x1},${y1} A${ringR},${ringR} 0 1 1 ${cx - ringR * Math.cos(startA)},${cy - ringR * Math.sin(startA)} A${ringR},${ringR} 0 1 1 ${x1},${y1}`;
  }
  return `M${x1},${y1} A${ringR},${ringR} 0 ${large} 1 ${x2},${y2}`;
};

// mode: 'intro' | 'popular' | 'iconic' | 'rings' | 'explore'
export function BubbleSwarm({ bubbles, mode = 'explore' }) {
  const { nodes, svgW, svgH, cx, cy, innerR, Rmax } = bubbles;
  const [tooltip, setTooltip] = useState(null);

  const { highlightSet, callouts, showRings } = useMemo(() => {
    if (!nodes.length) return { highlightSet: null, callouts: [], showRings: false };
    if (mode === 'popular') {
      const top = [...nodes].sort((a, b) => b.count - a.count).slice(0, 3);
      return {
        highlightSet: new Set(top.map(n => n.name)),
        callouts: top.map(n => ({ node: n, text: `${cap(n.name)} · ${n.count} eat it` })),
        showRings: false,
      };
    }
    if (mode === 'iconic') {
      const top = [...nodes].filter(n => n.count >= 4).sort((a, b) => b.iconicPct - a.iconicPct).slice(0, 3);
      return {
        highlightSet: new Set(top.map(n => n.name)),
        callouts: top.map(n => ({ node: n, text: `${cap(n.name)} · ${n.iconicPct}% iconic` })),
        showRings: false,
      };
    }
    if (mode === 'rings') {
      const eligible = [...nodes].filter(n => n.count >= 4);
      const pizza = eligible.find(n => /pizza/i.test(n.name));
      const staple = [...eligible].filter(n => n !== pizza && !/pizza/i.test(n.name))
        .sort((a, b) => b.selfPrepPct - a.selfPrepPct)[0];
      const picks = [staple, pizza].filter(Boolean);
      return {
        highlightSet: null,
        callouts: picks.map(n => ({ node: n, text: `${cap(n.name)} · ${n.selfPrepPct}% self-cooked` })),
        showRings: true,
      };
    }
    return { highlightSet: null, callouts: [], showRings: mode === 'explore' };
  }, [nodes, mode]);

  if (!nodes.length) return null;

  const calloutNames = new Set(callouts.map(c => c.node.name));
  const guideRings = [0, 0.5, 1].map(f => innerR + f * (Rmax - innerR));

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', overflow: 'visible', margin: '0 auto',
          maxHeight: 'calc(90vh / var(--s3z, 1))' }}>
        <defs>
          {nodes.map((n, i) => n.iconFile ? (
            <clipPath key={i} id={`s3clip-${i}`}><circle cx={n.x} cy={n.y} r={n.r} /></clipPath>
          ) : null)}
        </defs>

        {/* concentric guides: centre = most iconic, rim = least */}
        {guideRings.map((rr, i) => (
          <circle key={i} cx={cx} cy={cy} r={rr} fill="none"
            stroke="rgba(61,43,31,0.09)" strokeWidth={1} strokeDasharray="3,6" />
        ))}
        <line x1={cx} y1={cy} x2={cx} y2={cy - Rmax} stroke="rgba(61,43,31,0.10)" strokeWidth={1} strokeDasharray="2,6" />
        <text x={cx} y={cy - 3} textAnchor="middle"
          style={{ fontFamily: C.font, fontSize: 12.5, fontWeight: 800, letterSpacing: 1,
            fill: mode === 'iconic' ? C.turmeric : 'rgba(61,43,31,0.5)' }}>
          MORE ICONIC
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle"
          style={{ fontFamily: C.font, fontSize: 9.5, fill: 'rgba(61,43,31,0.38)' }}>
          identity core
        </text>
        <text x={cx} y={cy - Rmax - 10} textAnchor="middle"
          style={{ fontFamily: C.font, fontSize: 10.5, fontWeight: 600, fill: 'rgba(61,43,31,0.4)' }}>
          ← everyday fuel · rarely called iconic
        </text>

        {nodes.map((n, i) => {
          const dim = highlightSet && !highlightSet.has(n.name);
          const showLabel = n.r >= 23 && !calloutNames.has(n.name);
          return (
            <g key={n.name}
              onMouseEnter={e => setTooltip({ ...n, mx: e.clientX, my: e.clientY })}
              onMouseMove={e => setTooltip(prev => prev ? { ...prev, mx: e.clientX, my: e.clientY } : null)}
              onMouseLeave={() => setTooltip(null)}
              style={{ cursor: 'pointer',
                opacity: dim ? 0.16 : 1, filter: dim ? 'grayscale(0.9)' : 'none',
                transition: 'opacity 0.6s, filter 0.6s' }}>
              {n.selfPrepPct > 0 && (
                <path d={prepArc(n.x, n.y, n.r, n.selfPrepPct)} fill="none" stroke={C.herb}
                  strokeWidth={n.ringW} strokeLinecap="round" opacity={showRings ? 0.8 : 0.16}
                  style={{ transition: 'opacity 0.6s' }} />
              )}
              {n.iconFile ? (
                <>
                  <circle cx={n.x} cy={n.y} r={n.r} fill="#f5f0e8" />
                  <image href={`/icons/dishes_v2/${n.iconFile}`} x={n.x - n.r} y={n.y - n.r}
                    width={n.r * 2} height={n.r * 2} clipPath={`url(#s3clip-${i})`}
                    preserveAspectRatio="xMidYMid slice" opacity={0.9} />
                  <circle cx={n.x} cy={n.y} r={n.r} fill="none" stroke="rgba(61,43,31,0.12)" strokeWidth={1} />
                </>
              ) : (
                <>
                  <circle cx={n.x} cy={n.y} r={n.r} fill={`${C.turmeric}22`} stroke={`${C.turmeric}44`} strokeWidth={1} />
                  {n.r > 18 && (
                    <text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="middle"
                      style={{ fontFamily: C.font, fontSize: Math.min(n.r * 0.4, 10), fill: C.text, pointerEvents: 'none' }}>
                      {cap(n.name.length > 9 ? n.name.slice(0, 8) + '…' : n.name)}
                    </text>
                  )}
                </>
              )}
              {showLabel && (
                <text x={n.x} y={n.y + n.r + 11} textAnchor="middle"
                  style={{ fontFamily: C.font, fontSize: 10.5, fontWeight: 700, fill: C.text,
                    pointerEvents: 'none', paintOrder: 'stroke', stroke: 'rgba(255,249,240,0.92)', strokeWidth: 3 }}>
                  {cap(n.name.length > 14 ? n.name.slice(0, 13) + '…' : n.name)}
                </text>
              )}
              <circle cx={n.x} cy={n.y} r={n.outerR} fill="transparent" />
            </g>
          );
        })}

        {(() => {
          const usedY = { L: [], R: [] };
          return callouts.map((cinfo, i) => {
            const n = cinfo.node;
            const toRight = n.x < svgW - 230;
            const side = toRight ? 'R' : 'L';
            let ly = n.y;
            usedY[side].forEach(y => { if (Math.abs(ly - y) < 19) ly = y + 19; });
            usedY[side].push(ly);
            const lx = toRight ? n.x + n.outerR + 12 : n.x - n.outerR - 12;
            const elbowX = toRight ? n.x + n.outerR + 4 : n.x - n.outerR - 4;
            return (
              <g key={`call-${i}`} style={{ pointerEvents: 'none', animation: `s3fadein 0.7s ease ${0.3 + i * 0.18}s both` }}>
                <path d={`M${toRight ? n.x + n.outerR + 1 : n.x - n.outerR - 1},${n.y} Q${elbowX},${n.y} ${elbowX},${ly} L${lx},${ly}`}
                  fill="none" stroke={C.ink} strokeWidth={1} opacity={0.45} />
                <text x={lx + (toRight ? 3 : -3)} y={ly + 4} textAnchor={toRight ? 'start' : 'end'}
                  style={{ fontFamily: C.font, fontSize: 12.5, fontWeight: 700, fill: C.ink,
                    paintOrder: 'stroke', stroke: 'rgba(255,240,225,0.92)', strokeWidth: 3.5 }}>
                  {cap(cinfo.text)}
                </text>
              </g>
            );
          });
        })()}
      </svg>

      {tooltip && (
        <Tip mx={tooltip.mx} my={tooltip.my}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{cap(tooltip.name)}</div>
          <div>n={tooltip.count} eat it most weeks</div>
          <div style={{ marginTop: 4, opacity: 0.85 }}>
            <span style={{ color: '#f0c060', fontWeight: 700 }}>{tooltip.iconicPct}%</span> also call it iconic
          </div>
          <div style={{ opacity: 0.85 }}>
            <span style={{ color: '#8fcf6a', fontWeight: 700 }}>{tooltip.selfPrepPct}%</span> cook it themselves
          </div>
        </Tip>
      )}
    </div>
  );
}

export function ThreeWaySummary({ identifyPct, selfPct, othersPct, lastMonthPct }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(raf);
  }, []);
  const bars = [
    { label: 'Cook it for themselves', pct: selfPct, color: C.herb },
    { label: 'Cook or order it for others', pct: othersPct, color: C.coral },
    { label: 'Eaten in the last month', pct: lastMonthPct, color: C.turmeric },
  ];
  return (
    <div style={{ background: C.card, borderRadius: 24, padding: '26px 26px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.06)', maxWidth: 540, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 6, fontFamily: C.fontTitle, fontSize: 20, color: C.text }}>
        The dishes they call iconic: claimed, cooked, eaten
      </div>
      <p style={{ textAlign: 'center', fontFamily: C.font, fontSize: 13.5, color: C.textM, margin: '0 0 22px', lineHeight: 1.6 }}>
        <strong style={{ color: C.coral, fontSize: 17 }}>{identifyPct}%</strong> say their iconic dishes truly reflect
        what they eat. But watch <em>who</em> they actually cook them for.
      </p>
      {bars.map((b, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: C.font, fontSize: 13.5, color: C.text, marginBottom: 5 }}>
            <span>{b.label}</span><span style={{ fontWeight: 800, color: b.color }}>{b.pct}%</span>
          </div>
          <div style={{ height: 13, borderRadius: 7, background: 'rgba(61,43,31,0.08)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: on ? `${b.pct}%` : '0%', background: b.color, borderRadius: 7,
              transition: `width 1.1s cubic-bezier(0.22,1,0.36,1) ${i * 0.15}s` }} />
          </div>
        </div>
      ))}
      <div style={{ marginTop: 16, padding: '12px 16px', background: C.bgSage, borderRadius: 12,
        fontFamily: C.font, fontSize: 13, color: C.textM, lineHeight: 1.6, textAlign: 'center' }}>
        The twist: this generation cooks its iconic dishes <strong style={{ color: C.coral }}>for other people
        more often than for itself</strong> ({othersPct}% vs {selfPct}%). Identity food is something you
        <em> host</em> with, not just something you eat.
      </div>
    </div>
  );
}

// Cuisine flower (one country, petals = cuisines)

export const CUISINE_COLORS = {
  Italian:'#E6261F', French:'#2659C4', Spanish:'#F2B701', Japanese:'#7D2E8C',
  Mexican:'#3FA535', Indian:'#F26B21', Chinese:'#D6359A', Thai:'#16C0D6',
  Portuguese:'#0E7C5B', British:'#A8B400', American:'#8A8D91', Korean:'#F2769D',
  Irish:'#5E7A1A', German:'#9A5B2E', Danish:'#15357A', Greek:'#7FBEEB',
  Vietnamese:'#74B33A', Turkish:'#B83227', Brazilian:'#12A19A', Lebanese:'#C98A3A',
  Arabic:'#368DD9', Peruvian:'#D9366C',
};
// Any other cuisine. Must be hex: the petal fill appends an alpha to it.
const OTHER_CUISINE_COLOR = '#A39686';

export function CuisineFlower({ country, cuisineData, ownCuisine, size = 200, highlightCuisine = null, sub, sprout = true }) {
  const [hovered, setHovered] = useState(null);
  const cx = size / 2, cy = size / 2;
  const maxVal = Math.max(...cuisineData.map(d => d.count), 1);
  const n = cuisineData.length;
  const angleStep = (2 * Math.PI) / Math.max(n, 1);
  const sproutStyle = i => sprout ? {
    transformBox: 'view-box', transformOrigin: `${cx}px ${cy}px`,
    animation: `s3sprout 0.7s cubic-bezier(0.34, 1.45, 0.64, 1) ${0.12 + i * 0.06}s both`,
  } : {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        {cuisineData.map((d, i) => {
          const angle = -Math.PI / 2 + i * angleStep;
          const minR = size * 0.15, maxR = size * 0.42;
          const ratio = Math.sqrt(d.count / maxVal);
          const petalR = minR + ratio * (maxR - minR);
          const petalW = Math.max(8, angleStep * petalR * 0.55);
          const isOwn = d.cuisine === ownCuisine;
          const isHov = hovered === i;
          const isFocus = highlightCuisine && d.cuisine === highlightCuisine;
          const isMuted = highlightCuisine && !isFocus;
          const tipX = cx + Math.cos(angle) * petalR;
          const tipY = cy + Math.sin(angle) * petalR;
          const perpAngle = angle + Math.PI / 2;
          const baseSpread = petalW * 0.4;
          const bx1 = cx + Math.cos(perpAngle) * baseSpread, by1 = cy + Math.sin(perpAngle) * baseSpread;
          const bx2 = cx - Math.cos(perpAngle) * baseSpread, by2 = cy - Math.sin(perpAngle) * baseSpread;
          const cpDist = petalR * 0.65;
          const cp1x = bx1 + Math.cos(angle) * cpDist + Math.cos(perpAngle) * petalW * 0.15;
          const cp1y = by1 + Math.sin(angle) * cpDist + Math.sin(perpAngle) * petalW * 0.15;
          const cp2x = bx2 + Math.cos(angle) * cpDist - Math.cos(perpAngle) * petalW * 0.15;
          const cp2y = by2 + Math.sin(angle) * cpDist - Math.sin(perpAngle) * petalW * 0.15;
          const petalPath = `M${bx1},${by1} Q${cp1x},${cp1y} ${tipX},${tipY} Q${cp2x},${cp2y} ${bx2},${by2} Z`;
          const color = CUISINE_COLORS[d.cuisine] || OTHER_CUISINE_COLOR;

          return (
            <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer', ...sproutStyle(i) }}>
              <path d={petalPath}
                fill={isHov || isFocus ? color : `${color}${isOwn ? 'dd' : '99'}`}
                stroke={isOwn ? color : 'none'} strokeWidth={isOwn ? 1.5 : 0}
                strokeDasharray={isOwn ? '3,2' : 'none'}
                opacity={isMuted ? 0.14 : 1}
                style={{ transition: 'fill 0.25s, opacity 0.5s', filter: isHov ? 'brightness(1.1)' : 'none' }} />
              {/* every petal is named; with a highlighted cuisine, only that one */}
              {(isHov || isFocus || !highlightCuisine) && (
                <text x={cx + Math.cos(angle) * (petalR + 8)} y={cy + Math.sin(angle) * (petalR + 8)}
                  textAnchor={Math.cos(angle) > 0.3 ? 'start' : Math.cos(angle) < -0.3 ? 'end' : 'middle'}
                  dominantBaseline={Math.sin(angle) > 0.3 ? 'hanging' : Math.sin(angle) < -0.3 ? 'auto' : 'middle'}
                  style={{ fontFamily: C.font, fontSize: isHov || isFocus ? 9.5 : 7.5,
                    fill: isHov || isFocus ? color : C.textM,
                    opacity: hovered !== null && !isHov ? 0.35 : 1,
                    fontWeight: isHov || isFocus ? 700 : 500, pointerEvents: 'none', transition: 'all 0.2s' }}>
                  {d.cuisine}{(isHov || isFocus) ? ` ${d.pct}%` : ''}
                </text>
              )}
            </g>
          );
        })}
        <g style={sprout ? { transformBox: 'view-box', transformOrigin: `${cx}px ${cy}px`,
          animation: 's3sprout 0.4s cubic-bezier(0.34, 1.45, 0.64, 1) both' } : {}}>
          <circle cx={cx} cy={cy} r={7} fill={C.text} />
          <circle cx={cx} cy={cy} r={4} fill={C.card} />
        </g>
      </svg>
      <div style={{ fontFamily: C.fontTitle, fontSize: 13.5, fontWeight: 700, color: C.text, textAlign: 'center',
        marginTop: -Math.round(size * 0.10) }}>
        {country}
      </div>
      <div style={{ fontFamily: C.font, fontSize: 10, color: C.textL, textAlign: 'center' }}>
        {sub != null ? sub : `${cuisineData.reduce((s, d) => s + d.count, 0)} connections`}
      </div>
    </div>
  );
}

// Dual radar (eat vs buy priorities)

export function DualRadar({ axes, size = 420, showEat = true, showBuy = true, highlightAxes = null }) {
  const [hovered, setHovered] = useState(null);
  const cx = size / 2, cy = size / 2;
  const r = size * 0.32;
  const n = axes.length;
  if (!n) return null;
  const maxVal = 100;
  const scale = v => Math.sqrt(v / maxVal);
  const getPoint = (i, val) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const dist = scale(val) * r;
    return [cx + dist * Math.cos(angle), cy + dist * Math.sin(angle)];
  };
  const rings = [25, 50, 75, 100];
  const polyStyle = visible => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'scale(1)' : 'scale(0.55)',
    transformOrigin: `${cx}px ${cy}px`,
    transition: 'opacity 0.9s ease, transform 1.1s cubic-bezier(0.22, 1, 0.36, 1)',
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible', maxWidth: '100%' }}>
      {rings.map(v => (
        <polygon key={v} points={axes.map((_, i) => getPoint(i, v).join(',')).join(' ')}
          fill="none" stroke="rgba(61,43,31,0.07)" strokeWidth={1} />
      ))}
      {axes.map((_, i) => {
        const [x, y] = getPoint(i, maxVal);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(61,43,31,0.05)" strokeWidth={1} />;
      })}
      <polygon points={axes.map((a, i) => getPoint(i, a.eatPct).join(',')).join(' ')}
        fill={`${C.turmeric}18`} stroke={C.turmeric} strokeWidth={2.5} style={polyStyle(showEat)} />
      <polygon points={axes.map((a, i) => getPoint(i, a.buyPct).join(',')).join(' ')}
        fill={`${C.herb}18`} stroke={C.herb} strokeWidth={2.5} strokeDasharray="6,3" style={polyStyle(showBuy)} />
      {axes.map((a, i) => {
        const [ex, ey] = getPoint(i, a.eatPct);
        const [bx, by] = getPoint(i, a.buyPct);
        const [lx, ly] = getPoint(i, maxVal * 1.18);
        const [hx, hy] = getPoint(i, maxVal * 0.95);
        const angle = (360 * i) / n - 90;
        const isBottom = angle > 0 && angle < 180;
        const isRight = angle > -90 && angle < 90;
        const anchor = Math.abs(angle + 90) < 15 || Math.abs(angle - 90) < 15 ? 'middle' : isRight ? 'start' : 'end';
        const baseline = isBottom ? 'hanging' : 'auto';
        const valY = isBottom ? 22 : -12;
        const isSpot = highlightAxes && highlightAxes.includes(a.label);
        const isActive = hovered === i || isSpot;
        const isDimmed = (hovered !== null && hovered !== i) || (highlightAxes && !isSpot);
        return (
          <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            style={{ cursor: 'pointer' }}>
            <circle cx={hx} cy={hy} r={28} fill="transparent" />
            <circle cx={ex} cy={ey} r={isActive ? 7 : 3.5} fill={C.turmeric}
              opacity={!showEat ? 0 : isDimmed ? 0.3 : 1} style={{ transition: 'all 0.3s' }} />
            <circle cx={bx} cy={by} r={isActive ? 7 : 3.5} fill={C.herb}
              opacity={!showBuy ? 0 : isDimmed ? 0.3 : 1} style={{ transition: 'all 0.3s' }} />
            {isActive && showEat && (
              <circle cx={ex} cy={ey} r={7} fill="none" stroke={C.turmeric} strokeWidth={1.5} opacity={0.4}>
                <animate attributeName="r" from={7} to={16} dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" from={0.5} to={0} dur="1s" repeatCount="indefinite" />
              </circle>
            )}
            <text x={lx} y={ly} textAnchor={anchor} dominantBaseline={baseline}
              style={{ fontFamily: C.font, fontSize: isActive ? 13.5 : 10.5,
                fill: isDimmed ? 'rgba(61,43,31,0.2)' : isSpot ? C.coral : C.text,
                fontWeight: 700, transition: 'all 0.3s' }}>
              {a.label}
            </text>
            <text x={lx} y={ly + valY} textAnchor={anchor} dominantBaseline={baseline}
              style={{ fontFamily: C.font, fontSize: 10.5, opacity: isActive ? 1 : 0,
                transition: 'opacity 0.3s', pointerEvents: 'none' }}>
              {showEat && a.eatPct > 0 && <tspan fill={C.turmeric} fontWeight={700}>{a.eatPct}%</tspan>}
              {showEat && showBuy && a.eatPct > 0 && a.buyPct > 0 && <tspan fill="rgba(61,43,31,0.25)"> / </tspan>}
              {showBuy && a.buyPct > 0 && <tspan fill={C.herb} fontWeight={700}>{a.buyPct}%</tspan>}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function RadialRace({ rows, series, size = 340, visible = true, highlight = null }) {
  const [hovered, setHovered] = useState(null);
  const uid = useMemo(() => 'rr' + Math.random().toString(36).slice(2, 8), []);
  const isPair = series.length === 2;
  const cx = size / 2, cy = size / 2;
  const n = rows.length;
  const trackWidth = Math.min(22, (size * 0.35) / n);
  const trackGap = 4;
  const outerR = size / 2 - 14;
  const startAngle = -Math.PI / 2;
  const maxAngle = Math.PI * 1.6;
  const maxScale = Math.max(...rows.flatMap(d => d.values), 1);

  const litSet = useMemo(() => {
    if (hovered !== null) return new Set([hovered]);
    if (!highlight || !highlight.length) return null;
    return new Set(rows.map((d, i) => highlight.includes(d.label) ? i : -1).filter(i => i >= 0));
  }, [hovered, highlight, rows]);

  const arcPath = (r, a0, a1) => {
    if (a1 - a0 < 0.001) return '';
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    return `M${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)} A${r},${r} 0 ${large} 1 ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)}`;
  };

  const bandPath = (r, a0, a1, w) => {
    if (a1 - a0 < 0.001) return '';
    const ro = r + w / 2, ri = r - w / 2, rc = w / 2;
    const pt = (rad, a) => `${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`;
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    return [
      `M${pt(ri, a0)}`,
      `A${rc},${rc} 0 0 1 ${pt(ro, a0)}`,        // round start cap (bulges outward)
      `A${ro},${ro} 0 ${large} 1 ${pt(ro, a1)}`, // outer edge
      `A${rc},${rc} 0 0 1 ${pt(ri, a1)}`,        // round end cap (bulges outward)
      `A${ri},${ri} 0 ${large} 0 ${pt(ri, a0)}`, // inner edge back
      'Z',
    ].join(' ');
  };

  const endA = startAngle + maxAngle;
  const innermostR = outerR - (Math.min(n, Math.floor((outerR - 20) / (trackWidth + trackGap)) + 1) - 1) * (trackWidth + trackGap);
  const capInner = Math.max(innermostR - trackWidth / 2 - 5, 12);
  const capOuter = outerR + trackWidth / 2 + 7;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block', margin: '0 auto', overflow: 'visible', maxWidth: '100%' }}>
      {isPair && (
        <defs>
          {series.map((s, si) => (
            <pattern key={si} id={`${uid}-h${si}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill={s.color} opacity="0.20" />
              <line x1="0" y1="0" x2="0" y2="6" stroke={s.color} strokeWidth="2.6" />
            </pattern>
          ))}
        </defs>
      )}
      {rows.map((d, i) => {
        const r = outerR - i * (trackWidth + trackGap);
        if (r < 20) return null;
        const bgPath = arcPath(r, startAngle, startAngle + maxAngle);
        const entries = d.values.map((v, si) => ({ v, color: series[si].color, si }))
          .sort((a, b) => b.v - a.v);
        const trackY = cy - r;
        const isLit = litSet ? litSet.has(i) : false;
        const isDimmed = litSet ? !litSet.has(i) : false;

        return (
          <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            style={{ cursor: 'pointer', opacity: isDimmed ? 0.28 : 1, transition: 'opacity 0.3s' }}>
            <path d={bgPath} fill="none" stroke="rgba(61,43,31,0.08)" strokeWidth={trackWidth} strokeLinecap="round" />
            {entries.map((en, j) => {
              if (en.v <= 0) return null;
              const angle = (en.v / maxScale) * maxAngle;
              const len = r * angle;
              const hatch = isPair && j === 1;
              if (hatch) {
                // smaller value: hatched fill + a solid outline in its own colour
                return (
                  <path key={j} d={bandPath(r, startAngle, startAngle + angle, trackWidth)}
                    fill={`url(#${uid}-h${en.si})`} stroke={en.color} strokeWidth={1.8} strokeLinejoin="round"
                    style={{ opacity: visible ? 1 : 0, transition: `opacity 0.7s ease ${0.12 * i + 0.25}s` }} />
                );
              }
              return (
                <path key={j} d={arcPath(r, startAngle, startAngle + angle)} fill="none"
                  stroke={en.color}
                  strokeWidth={trackWidth} strokeLinecap="round"
                  strokeDasharray={len + 2}
                  strokeDashoffset={visible ? 0 : len + 2}
                  style={{ transition: `stroke-dashoffset 1.2s cubic-bezier(0.34, 1, 0.5, 1) ${0.12 * i + 0.08 * j}s` }} />
              );
            })}
            <path d={bgPath} fill="none" stroke="transparent" strokeWidth={trackWidth + 10} />
            <text x={cx - trackWidth / 2 - 6} y={trackY} textAnchor="end" dominantBaseline="middle"
              style={{ fontFamily: C.font, fontSize: isLit ? 11.5 : 10, fill: C.text,
                fontWeight: isLit ? 700 : 600, transition: 'all 0.25s' }}>
              {d.label}
            </text>
            {isLit && (
              <text x={size - 4} y={trackY} textAnchor="end" dominantBaseline="middle"
                style={{ fontFamily: C.font, fontSize: 10.5 }}>
                {d.values.map((v, si) => (
                  <React.Fragment key={si}>
                    {si > 0 && <tspan fill={C.textL}> · </tspan>}
                    <tspan fill={series[si].color} fontWeight={700}>{v}%</tspan>
                  </React.Fragment>
                ))}
              </text>
            )}
          </g>
        );
      })}
      <g style={{ pointerEvents: 'none' }}>
        <line x1={cx + capInner * Math.cos(endA)} y1={cy + capInner * Math.sin(endA)}
          x2={cx + capOuter * Math.cos(endA)} y2={cy + capOuter * Math.sin(endA)}
          stroke="rgba(61,43,31,0.45)" strokeWidth={1.3} strokeDasharray="4,3" />
        <text x={cx + (capOuter + 6) * Math.cos(endA)} y={cy + (capOuter + 6) * Math.sin(endA)}
          textAnchor="end" dominantBaseline="middle"
          style={{ fontFamily: C.font, fontSize: 9.5, fill: C.textM, fontWeight: 700 }}>
          {maxScale}% = full track
        </text>
      </g>
    </svg>
  );
}

export function ChartLegend({ items, style }) {
  return (
    <div style={{ display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap', ...style }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 18, height: 4, borderRadius: 2, background: it.color,
            backgroundImage: it.dashed ? `repeating-linear-gradient(90deg, ${it.color} 0 6px, transparent 6px 9px)` : 'none' }} />
          <span style={{ fontFamily: C.font, fontSize: 11.5, fontWeight: 700, color: it.color }}>{it.name}</span>
        </div>
      ))}
    </div>
  );
}

const pctLabel = (count, total) => {
  if (!total || count <= 0) return '0%';
  const p = (count / total) * 100;
  if (p >= 1) return `${Math.round(p)}%`;
  if (p >= 0.1) return `${p.toFixed(1)}%`;
  return '<0.1%';
};

// Sankey: living situation → who cooks → where food comes from → method

export const SANKEY_COLS = [
  { key: 'living', label: 'Who you live with', field: 'livingWith',
    items: [
      { key: 'Alone', short: 'Alone', icon: '🧑' },
      { key: 'Parents', short: 'Parents', icon: '🏠' },
      { key: 'Friends and roommates', short: 'Friends', icon: '🧑‍🤝‍🧑' },
      { key: 'Partner', short: 'Partner', icon: '❤️' },
    ]},
  { key: 'who', label: 'Who cooks', field: 'householdResponsibility',
    items: [
      { key: 'Myself', short: 'Myself', icon: '🍳' },
      { key: 'My parents', short: 'Parents', icon: '👵' },
      { key: 'My partner', short: 'Partner', icon: '💑' },
      { key: 'Another family member', short: 'Other family', icon: '👪' },
    ]},
  { key: 'where', label: 'Where food is bought', field: 'foodPurchasePlaces',
    items: [
      { key: 'Supermarket', short: 'Supermarket', icon: '🛒' },
      { key: 'Local grocery store', short: 'Local store', icon: '🏪' },
      { key: 'Fresh food market', short: 'Market', icon: '🍎' },
      { key: 'Online store or delivery apps', short: 'Online', icon: '📱' },
    ]},
  { key: 'how', label: 'How they cook', field: 'approachCooking',
    items: [
      { key: 'I rely on memory and experience', short: 'Memory', icon: '🧠' },
      { key: 'I improvise as I go', short: 'Improvise', icon: '🎲' },
      { key: 'I follow written recipes', short: 'Recipes', icon: '📖' },
      { key: 'I watch recipe videos', short: 'Videos', icon: '🎬' },
    ]},
];

const SANKEY_PALETTE = [C.turmeric, C.coral, C.herb, C.berry];

export function computeDominantPath(respondents) {
  const match = (r, ci, key) => {
    const vals = r[SANKEY_COLS[ci].field] || [];
    const arr = Array.isArray(vals) ? vals : [vals];
    return arr.some(v => v && v.includes(key));
  };
  let best = { count: -1, path: {} };
  SANKEY_COLS[0].items.forEach(a => {
    SANKEY_COLS[1].items.forEach(b => {
      SANKEY_COLS[2].items.forEach(c => {
        SANKEY_COLS[3].items.forEach(dd => {
          const count = respondents.filter(r =>
            match(r, 0, a.key) && match(r, 1, b.key) && match(r, 2, c.key) && match(r, 3, dd.key)).length;
          if (count > best.count) best = { count, path: { 0: a.key, 1: b.key, 2: c.key, 3: dd.key } };
        });
      });
    });
  });
  return best;
}

export function FlowSankey({ respondents, stage = 'build', dominant, onPathChange }) {
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [selectedPath, setSelectedPath] = useState({}); // { colIdx: [itemKey, ...] }
  const [multiMode, setMultiMode] = useState(false);
  const totalResp = respondents.length || 1;
  const interactive = stage === 'build';

  useEffect(() => {
    if (stage === 'auto' && dominant) {
      setSelectedPath(Object.fromEntries(Object.entries(dominant.path).map(([ci, k]) => [ci, [k]])));
    }
    if (stage === 'build') setSelectedPath({});
  }, [stage, dominant]);

  const togglePath = (ci, itemKey, e) => {
    if (!interactive) return;
    const multi = multiMode || (e && (e.shiftKey || e.ctrlKey || e.metaKey));
    setSelectedPath(prev => {
      const next = { ...prev };
      const cur = next[ci] ? [...next[ci]] : [];
      const has = cur.includes(itemKey);
      if (multi) {
        const updated = has ? cur.filter(k => k !== itemKey) : [...cur, itemKey];
        if (updated.length) next[ci] = updated; else delete next[ci];
      } else if (has && cur.length === 1) {
        delete next[ci];
      } else {
        next[ci] = [itemKey];
      }
      onPathChange && onPathChange(next);
      return next;
    });
  };

  const selectedEntries = Object.entries(selectedPath).map(([ci, keys]) => [parseInt(ci), keys]).sort((a, b) => a[0] - b[0]);
  const hasSelection = selectedEntries.length > 0;

  const pathMatchCount = useMemo(() => {
    if (!selectedEntries.length) return 0;
    return respondents.filter(r => selectedEntries.every(([ci, keys]) => {
      const vals = r[SANKEY_COLS[ci].field] || [];
      const arr = Array.isArray(vals) ? vals : [vals];
      return keys.every(key => arr.some(v => v && v.includes(key)));
    })).length;
  }, [respondents, selectedPath]); // eslint-disable-line react-hooks/exhaustive-deps

  // log each completed 4-column path once (reading telemetry, ?eval=1 only)
  const loggedPathRef = useRef('');
  useEffect(() => {
    if (!interactive || Object.keys(selectedPath).length !== SANKEY_COLS.length) return;
    const key = JSON.stringify(selectedPath);
    if (key === loggedPathRef.current) return;
    loggedPathRef.current = key;
    const label = SANKEY_COLS.map((col, ci) => (selectedPath[ci] || [])
      .map(k => col.items.find(it => it.key === k)?.short || k).join('+')).join(' > ');
    storylog('pipeline_path', { path: label, matches: pathMatchCount });
  }, [selectedPath, pathMatchCount, interactive]); // eslint-disable-line react-hooks/exhaustive-deps

  const sankeyData = useMemo(() => {
    const flows = [];
    for (let ci = 0; ci < SANKEY_COLS.length - 1; ci++) {
      const colA = SANKEY_COLS[ci], colB = SANKEY_COLS[ci + 1];
      const counts = {};
      respondents.forEach(r => {
        const valsA = r[colA.field] || [], valsB = r[colB.field] || [];
        const arrA = Array.isArray(valsA) ? valsA : [valsA];
        const arrB = Array.isArray(valsB) ? valsB : [valsB];
        colA.items.forEach(a => {
          if (!arrA.some(v => v && v.includes(a.key))) return;
          colB.items.forEach(b => {
            if (!arrB.some(v => v && v.includes(b.key))) return;
            const k = `${a.key}>${b.key}`;
            counts[k] = (counts[k] || 0) + 1;
          });
        });
      });
      Object.entries(counts).forEach(([k, count]) => {
        const [from, to] = k.split('>');
        flows.push({ colIdx: ci, from, to, count });
      });
    }
    const nodeSizes = {}, nodeCounts = {};
    SANKEY_COLS.forEach((col, ci) => {
      col.items.forEach(item => {
        const key = `${ci}:${item.key}`;
        const asSource = flows.filter(f => f.colIdx === ci && f.from === item.key).reduce((s, f) => s + f.count, 0);
        const asTarget = flows.filter(f => f.colIdx === ci - 1 && f.to === item.key).reduce((s, f) => s + f.count, 0);
        nodeSizes[key] = Math.max(asSource, asTarget, 1);
        nodeCounts[key] = respondents.filter(r => {
          const vals = r[col.field] || [];
          const arr = Array.isArray(vals) ? vals : [vals];
          return arr.some(v => v && v.includes(item.key));
        }).length;
      });
    });
    return { flows, nodeSizes, nodeCounts };
  }, [respondents]);

  const W = 900, H = 500;
  const colW = 110, nodeGap = 12, colPad = 40;
  const colXs = useMemo(() =>
    SANKEY_COLS.map((_, i) => colPad + i * ((W - 2 * colPad - colW) / (SANKEY_COLS.length - 1))), []);

  const nodeLayout = useMemo(() => {
    const layout = {};
    SANKEY_COLS.forEach((col, ci) => {
      const totalSize = col.items.reduce((s, item) => s + (sankeyData.nodeSizes[`${ci}:${item.key}`] || 1), 0);
      const totalGap = (col.items.length - 1) * nodeGap;
      const availH = H - 60 - totalGap;
      let y = 30;
      col.items.forEach((item, ii) => {
        const size = sankeyData.nodeSizes[`${ci}:${item.key}`] || 1;
        const count = sankeyData.nodeCounts[`${ci}:${item.key}`] || 0;
        const h = Math.max(18, (size / totalSize) * availH);
        layout[`${ci}:${item.key}`] = { x: colXs[ci], y, h, size, count,
          color: SANKEY_PALETTE[ii % SANKEY_PALETTE.length], short: item.short, icon: item.icon };
        y += h + nodeGap;
      });
    });
    return layout;
  }, [sankeyData, colXs]);

  const flowPaths = useMemo(() => {
    const sourceOffsets = {}, targetOffsets = {};
    Object.keys(nodeLayout).forEach(k => { sourceOffsets[k] = 0; targetOffsets[k] = 0; });
    return sankeyData.flows
      .sort((a, b) => b.count - a.count)
      .map(f => {
        const srcKey = `${f.colIdx}:${f.from}`, tgtKey = `${f.colIdx + 1}:${f.to}`;
        const src = nodeLayout[srcKey], tgt = nodeLayout[tgtKey];
        if (!src || !tgt) return null;
        const srcH = (f.count / src.size) * src.h;
        const tgtH = (f.count / tgt.size) * tgt.h;
        const y0 = src.y + sourceOffsets[srcKey];
        const y1 = tgt.y + targetOffsets[tgtKey];
        sourceOffsets[srcKey] += srcH;
        targetOffsets[tgtKey] += tgtH;
        const x0 = src.x + colW, x1 = tgt.x;
        const mx = (x0 + x1) / 2;
        const d = `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1} L${x1},${y1 + tgtH} C${mx},${y1 + tgtH} ${mx},${y0 + srcH} ${x0},${y0 + srcH} Z`;
        return { ...f, d, color: src.color };
      })
      .filter(Boolean);
  }, [sankeyData, nodeLayout]);

  return (
    <div style={{ position: 'relative' }}>
      {interactive && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          flexWrap: 'wrap', marginBottom: 14 }}>
          <button onClick={() => setMultiMode(m => !m)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer',
              fontFamily: C.font, fontSize: 12.5, fontWeight: 700, borderRadius: 999, padding: '7px 15px',
              border: `1.5px solid ${multiMode ? C.coral : 'rgba(61,43,31,0.2)'}`,
              background: multiMode ? C.coral : 'transparent', color: multiMode ? '#fff' : C.text,
              transition: 'all 0.2s' }}>
            <span style={{ fontSize: 14 }}>{multiMode ? '☑' : '☐'}</span> Combine options
          </button>
          <span style={{ fontFamily: C.font, fontSize: 12, color: C.textM, maxWidth: 380, textAlign: 'left' }}>
            {multiMode
              ? 'Now pick two or more boxes in a column to find the people who chose all of them (e.g. Myself and Parents).'
              : 'Turn this on (or Shift-click a box) to combine options in a column — people who answered both.'}
          </span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: `0 ${colPad * 100 / W}%`, marginBottom: 8 }}>
        {SANKEY_COLS.map((col, i) => (
          <div key={i} style={{ width: `${colW * 100 / W}%`, textAlign: 'center', fontFamily: C.font,
            fontSize: 10.5, fontWeight: 700, color: 'rgba(61,43,31,0.4)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {col.label}
          </div>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
        <defs>
          <filter id="s3-sankey-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="rgba(61,43,31,0.35)" />
          </filter>
        </defs>
        {flowPaths.map((f, i) => {
          const fromSel = !!selectedPath[f.colIdx]?.includes(f.from);
          const toSel = !!selectedPath[f.colIdx + 1]?.includes(f.to);
          const onPath = fromSel && toSel;
          const touchesSelected = fromSel || toSel;
          const isFlowHovered = tooltip?.type === 'flow' && tooltip.from === f.from && tooltip.to === f.to && tooltip.colIdx === f.colIdx;
          const isNodeHighlighted = hovered === f.from || hovered === f.to;
          let fill, stroke = 'none', strokeWidth = 0.5;
          if (onPath) { fill = `${f.color}99`; stroke = f.color; strokeWidth = 2; }
          else if (hasSelection && touchesSelected) { fill = `${f.color}44`; }
          else if (hasSelection) { fill = 'rgba(61,43,31,0.02)'; }
          else if (isFlowHovered) { fill = `${f.color}55`; stroke = f.color; strokeWidth = 1.5; }
          else if (isNodeHighlighted) { fill = `${f.color}22`; stroke = `${f.color}80`; }
          else { fill = `${f.color}22`; }
          return (
            <path key={i} d={f.d} fill={fill} stroke={stroke} strokeWidth={strokeWidth}
              style={{ transition: 'fill 0.4s, stroke 0.4s', cursor: 'pointer' }}
              onMouseEnter={e => setTooltip({ type: 'flow', from: f.from, to: f.to, colIdx: f.colIdx, count: f.count, color: f.color, mx: e.clientX, my: e.clientY })}
              onMouseMove={e => setTooltip(prev => prev ? { ...prev, mx: e.clientX, my: e.clientY } : null)}
              onMouseLeave={() => setTooltip(null)} />
          );
        })}
        {Object.entries(nodeLayout).map(([key, node]) => {
          const [ciStr, itemKey] = key.split(':');
          const ci = parseInt(ciStr);
          const isHovered = hovered === itemKey;
          const isSelected = !!selectedPath[ci]?.includes(itemKey);
          const isColDimmed = selectedPath[ci] !== undefined && !isSelected;
          const pct = pctLabel(node.count, totalResp);
          const ex = isSelected ? 7 : 0, ey = isSelected ? 4 : 0;
          const rx = node.x - ex, ry = node.y - ey;
          const rw = colW + 2 * ex, rh = node.h + 2 * ey;
          return (
            <g key={key} onClick={(e) => togglePath(ci, itemKey, e)}
              onMouseEnter={e => { setHovered(itemKey); setTooltip({ type: 'node', name: node.short, count: node.count, pct, colLabel: SANKEY_COLS[ci]?.label, color: node.color, mx: e.clientX, my: e.clientY }); }}
              onMouseMove={e => setTooltip(prev => prev ? { ...prev, mx: e.clientX, my: e.clientY } : null)}
              onMouseLeave={() => { setHovered(null); setTooltip(null); }}
              style={{ cursor: interactive ? 'pointer' : 'default', opacity: isColDimmed ? 0.35 : 1, transition: 'opacity 0.3s' }}>
              <rect x={rx} y={ry} width={rw} height={rh} rx={8}
                fill={(isSelected || isHovered) ? node.color : `${node.color}cc`}
                stroke={isSelected ? '#fff' : 'none'} strokeWidth={isSelected ? 2.5 : 0}
                filter={isSelected ? 'url(#s3-sankey-glow)' : 'none'}
                style={{ transition: 'all 0.25s' }} />
              {rh > 44 && node.icon && (
                <text x={rx + rw / 2} y={ry + rh / 2 - 12} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontSize: Math.min(isSelected ? 24 : 20, rh * 0.3), pointerEvents: 'none' }}>
                  {node.icon}
                </text>
              )}
              {rh > 20 && (
                <text x={rx + rw / 2} y={ry + rh / 2 + (rh > 44 && node.icon ? 8 : 0)} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontFamily: C.font, fontSize: Math.min(isSelected ? 12.5 : 11, rh * 0.4), fill: '#fff', fontWeight: 700, pointerEvents: 'none' }}>
                  {node.short}
                </text>
              )}
              {rh > 50 && (
                <text x={rx + rw / 2} y={ry + rh / 2 + (node.icon ? 22 : 13)} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontFamily: C.font, fontSize: 9, fill: 'rgba(255,255,255,0.7)', pointerEvents: 'none' }}>
                  {node.count}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Path summary (only when the reader is in control) */}
      {interactive && (
        <div style={{ marginTop: 20, minHeight: 90 }}>
          {hasSelection ? (
            <div style={{ background: C.card, borderRadius: 16, padding: '18px 22px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ fontFamily: C.font, fontSize: 11, fontWeight: 700, color: C.textL, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  Your path
                </div>
                <button onClick={() => setSelectedPath({})}
                  style={{ background: 'none', border: `1px solid ${C.textL}`, borderRadius: 8, padding: '4px 12px',
                    fontFamily: C.font, fontSize: 11, color: C.textM, cursor: 'pointer' }}>
                  Clear
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {SANKEY_COLS.map((col, ci) => {
                  const sel = selectedPath[ci];
                  return (
                    <React.Fragment key={ci}>
                      {ci > 0 && <span style={{ color: C.textL, fontSize: 16 }}>→</span>}
                      {sel && sel.length ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                          {sel.map((skey, ki) => {
                            const node = nodeLayout[`${ci}:${skey}`];
                            return (
                              <React.Fragment key={skey}>
                                {ki > 0 && <span style={{ color: C.textL, fontSize: 11, fontWeight: 700 }}>and</span>}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: node?.color || C.textL,
                                  color: '#fff', borderRadius: 20, padding: '6px 14px', fontFamily: C.font, fontSize: 13, fontWeight: 700 }}>
                                  <span>{node?.icon}</span>{node?.short}
                                </div>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ border: `1.5px dashed ${C.textL}`, borderRadius: 20, padding: '6px 14px',
                          fontFamily: C.font, fontSize: 12, color: C.textL }}>
                          {col.label}?
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: C.fontTitle, fontSize: 34, fontWeight: 700, color: C.coral }}>
                  {pathMatchCount}
                </span>
                <span style={{ fontFamily: C.font, fontSize: 14, color: C.textM }}>
                  of {respondents.length} share {selectedEntries.length === SANKEY_COLS.length ? 'this exact food life' : 'this path so far'}
                  <span style={{ fontWeight: 700, color: C.text }}> ({pctLabel(pathMatchCount, totalResp)})</span>
                  {selectedEntries.length === SANKEY_COLS.length && pathMatchCount / totalResp < 0.04 &&
                    <span>, a rare combination.</span>}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', fontFamily: C.font, fontSize: 13.5, color: C.textM, padding: '18px 0' }}>
              👆 Click one box in each column to build your own path.
            </div>
          )}
        </div>
      )}

      {tooltip && (
        <Tip mx={tooltip.mx} my={tooltip.my}>
          {tooltip.type === 'node' ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{tooltip.name}</div>
              <div><span style={{ color: tooltip.color, fontWeight: 700 }}>{tooltip.count}</span> respondents ({tooltip.pct})</div>
              <div style={{ marginTop: 2, opacity: 0.6, fontSize: 11 }}>{tooltip.colLabel}</div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                {tooltip.from} <span style={{ opacity: 0.5 }}>→</span> {tooltip.to}
              </div>
              <div><span style={{ color: tooltip.color, fontWeight: 700 }}>{tooltip.count}</span> respondents</div>
            </>
          )}
        </Tip>
      )}
    </div>
  );
}

// Sticky-note board for food creators

export const PLATFORM_META = {
  instagram: { icon: '📸', color: '#E1306C', label: 'Instagram' },
  tiktok: { icon: '🎵', color: '#1A1A1A', label: 'TikTok' },
  youtube: { icon: '▶️', color: '#FF0000', label: 'YouTube' },
  website: { icon: '🌐', color: '#5A7A3A', label: 'Website' },
  unknown: { icon: '📱', color: '#888888', label: 'Social' },
};

const NOTE_COLORS = ['#FFF9C4', '#FFECB3', '#FFE0B2', '#F8E8D0', '#E8F5E9', '#FFF3E0', '#F3E5F5', '#E0F2F1'];

export function StickyNoteBoard({ channels }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', padding: '20px 10px' }}>
      {channels.map((ch, i) => {
        const pi = PLATFORM_META[ch.platform] || PLATFORM_META.unknown;
        const hasUrl = ch.url && ch.url.startsWith('http');
        const initial = (ch.display_name || '?')[0].toUpperCase();
        const noteColor = NOTE_COLORS[i % NOTE_COLORS.length];
        const rot = (((i * 7 + 3) % 11) - 5) * 0.7;
        const note = (
          <div style={{
            width: 155, padding: '14px 14px 12px', background: noteColor,
            borderRadius: '2px 2px 3px 3px',
            boxShadow: '2px 3px 8px rgba(61,43,31,0.15), 0 1px 2px rgba(61,43,31,0.08)',
            fontFamily: C.font, cursor: hasUrl ? 'pointer' : 'default',
            transition: 'all 0.3s ease', transform: `rotate(${rot}deg)`, position: 'relative',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'rotate(0deg) translateY(-6px) scale(1.05)';
              e.currentTarget.style.boxShadow = '4px 8px 20px rgba(61,43,31,0.2)';
              e.currentTarget.style.zIndex = '10';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = `rotate(${rot}deg)`;
              e.currentTarget.style.boxShadow = '2px 3px 8px rgba(61,43,31,0.15), 0 1px 2px rgba(61,43,31,0.08)';
              e.currentTarget.style.zIndex = '1';
            }}>
            <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
              width: 36, height: 12, background: 'rgba(200,190,170,0.55)', borderRadius: 1 }} />
            <div style={{ position: 'absolute', top: 6, right: 8, fontFamily: C.font, fontSize: 10,
              fontWeight: 700, color: i < 3 ? C.berry : 'rgba(61,43,31,0.25)' }}>
              #{i + 1}
            </div>
            <div style={{ marginTop: 6 }}>
              {ch.avatar_local ? (
                <img src={`/images/channel_avatars/${ch.key}.jpg`} alt="" loading="lazy" decoding="async" style={{
                  width: 52, height: 52, borderRadius: '50%', objectFit: 'cover',
                  border: '3px solid rgba(255,255,255,0.8)', boxShadow: '0 2px 6px rgba(61,43,31,0.12)' }}
                  onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
              ) : null}
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${pi.color}15`,
                alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700,
                color: pi.color, border: '3px solid rgba(255,255,255,0.8)', fontFamily: C.fontTitle,
                display: ch.avatar_local ? 'none' : 'flex' }}>
                {initial}
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(61,43,31,0.85)', textAlign: 'center',
              lineHeight: 1.2, maxWidth: '100%', overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {ch.display_name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, color: pi.color }}>{pi.icon}</span>
              <span style={{ fontSize: 10, color: 'rgba(61,43,31,0.4)', fontWeight: 600 }}>{pi.label}</span>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(61,43,31,0.35)', fontStyle: 'italic' }}>
              {ch.mentions} {ch.mentions === 1 ? 'mention' : 'mentions'}
            </div>
          </div>
        );
        return hasUrl ? (
          <a key={ch.key} href={ch.url} target="_blank" rel="noopener noreferrer"
            onClick={() => storylog('feed_channel', { channel: ch.display_name || ch.key })}
            style={{ textDecoration: 'none', color: 'inherit' }}>
            {note}
          </a>
        ) : <div key={ch.key}>{note}</div>;
      })}
    </div>
  );
}

// Sustainability: head-to-head comparison + portion explorer

export function PortionDuel({ items, ingredientIcons, nameA = 'Beef', nameB = 'Tofu', visible = true }) {
  const a = items.find(i => i.name === nameA);
  const b = items.find(i => i.name === nameB);
  if (!a || !b) return null;
  const maxKm = Math.max(a.car_km, b.car_km);
  const ratio = b.co2 > 0 ? Math.round(a.co2 / b.co2) : 0;

  const row = (item, color) => {
    const iconFile = ingredientIcons[item.name] || item.icon;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 86, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {iconFile && <img src={`/icons/ingredients/${iconFile}`} alt={item.name} loading="lazy" decoding="async"
            style={{ width: 46, height: 46, objectFit: 'contain' }} />}
          <span style={{ fontFamily: C.font, fontSize: 12, fontWeight: 700, color: C.text }}>{item.name}</span>
          <span style={{ fontFamily: C.font, fontSize: 9.5, color: C.textL }}>{item.portion_g}g serving</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ height: 22, borderRadius: 11, background: 'rgba(61,43,31,0.06)', overflow: 'hidden', position: 'relative' }}>
            <div style={{ height: '100%', borderRadius: 11, background: color,
              width: visible ? `${Math.max(item.car_km / maxKm * 100, 3)}%` : '0%',
              transition: 'width 1.4s cubic-bezier(0.22, 1, 0.36, 1) 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8 }}>
              <span style={{ fontSize: 13 }}>🚗</span>
            </div>
          </div>
          <div style={{ fontFamily: C.fontTitle, fontSize: 18, fontWeight: 700, color, marginTop: 5 }}>
            {visible ? <AnimatedNumber value={item.car_km} decimals={1} suffix=" km" /> : '0 km'}
            <span style={{ fontFamily: C.font, fontSize: 11, color: C.textM, fontWeight: 400 }}> of driving, per serving</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: C.card, borderRadius: 20, padding: '26px 28px',
      boxShadow: '0 6px 30px rgba(61,43,31,0.08)', display: 'flex', flexDirection: 'column', gap: 22 }}>
      {row(a, C.coral)}
      {row(b, C.herb)}
      <div style={{ textAlign: 'center', padding: '12px 16px', background: C.bgSage, borderRadius: 12,
        fontFamily: C.font, fontSize: 14, color: C.textM }}>
        Same protein, very different footprint:{' '}
        <span style={{ fontFamily: C.fontTitle, fontSize: 19, fontWeight: 700, color: C.coral }}>{ratio}×</span>{' '}
        the climate cost. <span style={{ opacity: 0.7 }}>(CO₂e per protein-equivalent serving)</span>
      </div>
    </div>
  );
}

const fmtLand = v => `${v >= 10 ? v.toFixed(1) : v >= 1 ? v.toFixed(2) : v.toFixed(3)} m²`;

const EXPLORER_METRICS = [
  { key: 'car_km', label: 'Driving equivalent', icon: '🚗', color: C.coral,
    format: v => v < 1 ? `${(v * 1000).toFixed(0)} m` : `${v.toFixed(1)} km` },
  { key: 'bottles', label: 'Water bottles (1.5L)', icon: '💧', color: C.blue,
    format: v => v < 1 ? `${(v * 1.5).toFixed(1)} L` : `${v.toFixed(0)} bottles` },
  { key: 'land', label: 'Land used', icon: '🌍', color: C.herb, format: fmtLand },
];
const NUTRI_METRICS = [
  { key: 'kcal', label: 'Energy', icon: '🔥', color: C.turmeric, format: v => `${Math.round(v)} kcal` },
  { key: 'protein_g', label: 'Protein', icon: '💪', color: C.berry, format: v => `${v} g` },
];

export function PortionExplorer({ items, ingredientIcons }) {
  const [picked, setPicked] = useState(() => items.length ? [items[0].name] : []);
  const toggle = name => {
    if (!picked.includes(name)) storylog('portion_pick', { ingredient: name });
    setPicked(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name].slice(-2));
  };
  const sel = picked.map(nm => items.find(i => i.name === nm)).filter(Boolean);
  const DUO = [C.coral, C.herb];

  const iconOf = it => ingredientIcons[it.name] || it.icon;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ fontFamily: C.font, fontSize: 11.5, color: C.textM, textAlign: 'center', marginBottom: 10 }}>
        Tap an ingredient to inspect it · tap a <strong>second</strong> to compare them
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center', marginBottom: 16 }}>
        {items.map(item => {
          const pickIdx = picked.indexOf(item.name);
          const isSel = pickIdx >= 0;
          const selColor = DUO[pickIdx] || C.coral;
          const iconFile = iconOf(item);
          return (
            <button key={item.name} onClick={() => toggle(item.name)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '6px 5px', borderRadius: 12, border: isSel ? `2px solid ${selColor}` : '2px solid transparent',
                background: isSel ? `${selColor}15` : C.card, cursor: 'pointer', width: 60,
                boxShadow: isSel ? '0 2px 12px rgba(61,43,31,0.18)' : '0 1px 4px rgba(0,0,0,0.04)',
                transition: 'all 0.2s' }}>
              {iconFile && <img src={`/icons/ingredients/${iconFile}`} alt={item.name} loading="lazy" decoding="async"
                style={{ width: 26, height: 26, objectFit: 'contain', borderRadius: 6 }} />}
              <span style={{ fontFamily: C.font, fontSize: 9, fontWeight: 600,
                color: isSel ? selColor : C.text, textAlign: 'center', lineHeight: 1.2 }}>
                {item.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* single inspect */}
      {sel.length === 1 && (() => {
        const it = sel[0];
        return (
          <div style={{ background: C.card, borderRadius: 20, padding: '26px 30px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
              {iconOf(it) && (
                <img src={`/icons/ingredients/${iconOf(it)}`} alt={it.name} loading="lazy" decoding="async"
                  style={{ width: 60, height: 60, objectFit: 'contain', borderRadius: 12 }} />
              )}
              <div>
                <div style={{ fontFamily: C.fontTitle, fontSize: 23, fontWeight: 700, color: C.text }}>{it.name}</div>
                <div style={{ fontFamily: C.font, fontSize: 13, color: C.textM }}>
                  One serving: <span style={{ fontWeight: 700 }}>{it.portion_g}g</span>
                  <span style={{ opacity: 0.5 }}> · {it.category}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {EXPLORER_METRICS.map(m => {
                const val = it[m.key];
                const maxVal = Math.max(...items.map(d => d[m.key] || 0));
                const pct = maxVal > 0 ? Math.min((val / maxVal) * 100, 100) : 0;
                return (
                  <div key={m.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <span style={{ fontFamily: C.font, fontSize: 13, color: C.textM }}>
                        <span style={{ fontSize: 16, marginRight: 6 }}>{m.icon}</span>{m.label}
                      </span>
                      <span style={{ fontFamily: C.fontTitle, fontSize: 19, fontWeight: 700, color: m.color }}>
                        {m.format(val)}
                      </span>
                    </div>
                    <div style={{ height: 12, borderRadius: 6, background: 'rgba(61,43,31,0.06)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 6, background: m.color,
                        width: `${Math.max(pct, 1.5)}%`, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {(it.kcal != null) && (
              <div style={{ marginTop: 18, padding: '11px 16px', background: C.bgWarm, borderRadius: 12,
                fontFamily: C.font, fontSize: 13.5, color: C.textM, textAlign: 'center' }}>
                🍽 The serving feeds you back{' '}
                <strong style={{ color: C.turmeric }}>{it.kcal} kcal</strong> and{' '}
                <strong style={{ color: C.berry }}>{it.protein_g} g protein</strong>
              </div>
            )}
            {it.co2 > 0.05 && (() => {
              const lowest = [...items].sort((x, y) => x.co2 - y.co2)[0];
              if (lowest.name === it.name) return null;
              const ratio = Math.round(it.co2 / lowest.co2);
              if (ratio <= 1) return null;
              return (
                <div style={{ marginTop: 12, padding: '13px 18px', background: C.bgSage, borderRadius: 12, textAlign: 'center' }}>
                  <span style={{ fontFamily: C.font, fontSize: 14, color: C.textM }}>
                    One serving of <span style={{ fontWeight: 700, color: C.coral }}>{it.name}</span> emits as much CO₂ as{' '}
                    <span style={{ fontWeight: 700, color: C.herb, fontSize: 18 }}>{ratio}</span> servings of{' '}
                    <span style={{ fontWeight: 700, color: C.herb }}>{lowest.name}</span>
                  </span>
                </div>
              );
            })()}
            <div style={{ marginTop: 14, fontFamily: C.font, fontSize: 9, color: C.textL, textAlign: 'right' }}>
              Footprints: Clark et al. (2022) / Poore &amp; Nemecek (2018) · nutrition: typical values per serving
            </div>
          </div>
        );
      })()}

      {/* head-to-head */}
      {sel.length === 2 && (() => {
        const [a, b] = sel;
        const rows = [...EXPLORER_METRICS, ...NUTRI_METRICS];
        const hi = a.co2 >= b.co2 ? a : b, lo = a.co2 >= b.co2 ? b : a;
        const ratio = lo.co2 > 0 ? (hi.co2 / lo.co2) : 0;
        return (
          <div style={{ background: C.card, borderRadius: 20, padding: '18px 24px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', marginBottom: 12 }}>
              {[a, b].map((it, i) => (
                <div key={it.name} style={{ display: 'flex', alignItems: 'center', gap: 10,
                  flexDirection: i === 0 ? 'row' : 'row-reverse', textAlign: i === 0 ? 'left' : 'right' }}>
                  {iconOf(it) && <img src={`/icons/ingredients/${iconOf(it)}`} alt={it.name} loading="lazy" decoding="async"
                    style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 10 }} />}
                  <div>
                    <div style={{ fontFamily: C.fontTitle, fontSize: 18, fontWeight: 700, color: DUO[i] }}>{it.name}</div>
                    <div style={{ fontFamily: C.font, fontSize: 11, color: C.textM }}>{it.portion_g}g serving</div>
                  </div>
                </div>
              ))}
              <div style={{ gridColumn: 2, gridRow: 1, fontFamily: C.fontTitle, fontSize: 15, color: C.textL, padding: '0 14px' }}>
                vs
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rows.map(m => {
                const va = a[m.key], vb = b[m.key];
                if (va == null || vb == null) return null;
                const mx = Math.max(va, vb, 1e-9);
                return (
                  <div key={m.key}>
                    <div style={{ fontFamily: C.font, fontSize: 11.5, color: C.textM, textAlign: 'center', marginBottom: 3 }}>
                      <span style={{ marginRight: 5 }}>{m.icon}</span>{m.label}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, alignItems: 'center' }}>
                      {[{ v: va, col: m.color, right: true }, { v: vb, col: m.color, right: false }].map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8,
                          flexDirection: s.right ? 'row-reverse' : 'row' }}>
                          <div style={{ flex: 1, height: 11, borderRadius: 6, background: 'rgba(61,43,31,0.06)',
                            overflow: 'hidden', display: 'flex', justifyContent: s.right ? 'flex-end' : 'flex-start' }}>
                            <div style={{ height: '100%', borderRadius: 6, background: s.col,
                              width: `${Math.max((s.v / mx) * 100, 1.5)}%`, transition: 'width 0.5s ease' }} />
                          </div>
                          <span style={{ fontFamily: C.fontTitle, fontSize: 13.5, fontWeight: 700, color: s.col,
                            minWidth: 74, textAlign: s.right ? 'right' : 'left' }}>
                            {m.format(s.v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {ratio > 1.5 && (
              <div style={{ marginTop: 11, padding: '10px 14px', background: C.bgSage, borderRadius: 12,
                fontFamily: C.font, fontSize: 13.5, color: C.textM, textAlign: 'center' }}>
                Per serving, <strong style={{ color: C.coral }}>{hi.name}</strong> carries{' '}
                <strong style={{ fontSize: 17 }}>{ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)}×</strong>{' '}
                the climate cost of <strong style={{ color: C.herb }}>{lo.name}</strong>
              </div>
            )}
            <div style={{ marginTop: 8, fontFamily: C.font, fontSize: 9, color: C.textL, textAlign: 'right' }}>
              Footprints: Clark et al. (2022) / Poore &amp; Nemecek (2018) · nutrition: typical values per serving
            </div>
          </div>
        );
      })()}

      {sel.length === 0 && (
        <div style={{ fontFamily: C.font, fontSize: 13, color: C.textL, textAlign: 'center', padding: 30 }}>
          Pick an ingredient above to weigh it.
        </div>
      )}
    </div>
  );
}

// Big stat block

export function BigStat({ value, suffix = '%', label, accent = C.coral, decimals = 0 }) {
  const [ref, seen] = useOnScreen({ threshold: 0.5 });
  return (
    <div ref={ref} style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: C.fontTitle, fontSize: 'clamp(46px, 6vw, 76px)', fontWeight: 700,
        color: accent, lineHeight: 1 }}>
        {seen ? <AnimatedNumber value={value} decimals={decimals} suffix={suffix} /> : `0${suffix}`}
      </div>
      <div style={{ fontFamily: C.font, fontSize: 13.5, color: C.textM, marginTop: 8, lineHeight: 1.5, maxWidth: 240, margin: '8px auto 0' }}>
        {label}
      </div>
    </div>
  );
}
