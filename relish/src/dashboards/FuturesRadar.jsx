// Future perspectives game: guess the average ratings, then compare with the answers.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  C, useOnScreen, AnimatedNumber, Fade, LiveBadge,
  SectionHead, nuggetStyle, btnStyle,
} from './story3/shared';
import { clearlyAhead, clearlyAheadOnScale, shareInWords, ageAt, median } from './claims';
import { evalog } from '../eval/evalTelemetry';

// axes & constants
export const OUTLOOK_AXES = [
  { key: 'future_world',    label: 'The World',     icon: '🌍' },
  { key: 'future_europe',   label: 'Europe',        icon: '🇪🇺' },
  { key: 'future_country',  label: 'Home Country',  icon: '🏠' },
  { key: 'future_personal', label: 'Personal Life', icon: '✨' },
];
export const RELEVANCE_AXES = [
  { key: 'economy',    label: 'Economy',    icon: '💶' },
  { key: 'politics',   label: 'Politics',   icon: '🏛️' },
  { key: 'culture',    label: 'Culture',    icon: '🎭' },
  { key: 'security',   label: 'Security',   icon: '🛡️' },
  { key: 'ecosystem',  label: 'Ecosystem',  icon: '🌿' },
  { key: 'technology', label: 'Technology', icon: '🤖' },
];
const ALL_AXES = [
  ...OUTLOOK_AXES.map(a => ({ ...a, min: 1, max: 4 })),
  ...RELEVANCE_AXES.map(a => ({ ...a, min: 1, max: 6 })),
];

const INITIAL_GUESS = {};
OUTLOOK_AXES.forEach(a => { INITIAL_GUESS[a.key] = 2.5; });
RELEVANCE_AXES.forEach(a => { INITIAL_GUESS[a.key] = 3.5; });

const GUESS_COLOR = C.coral;
const REAL_COLOR = C.blue;

const FIELD_GROUPS = [
  { match: 'Business',      label: 'Business & Law',     color: '#C84B31' },
  { match: 'Social',        label: 'Social Sciences',    color: '#2E86AB' },
  { match: 'Arts',          label: 'Arts & Humanities',  color: '#8E4162' },
  { match: 'Information',   label: 'ICT',                color: '#C49A2A' },
  { match: 'Health',        label: 'Health & Welfare',   color: '#5A7A3A' },
  { match: 'Natural',       label: 'Natural Sciences',   color: '#4A8A7B' },
  { match: 'Engineering',   label: 'Engineering',        color: '#A8632F' },
  { match: 'Services',      label: 'Services & Tourism', color: '#D9784F' },
  { match: 'Education',     label: 'Education',          color: '#7E86B8' },
];
const FIELD_OTHER = { label: 'Other', color: '#9A8C7D' };
const fieldGroup = v => FIELD_GROUPS.find(g => v && String(v).startsWith(g.match)) || FIELD_OTHER;

// stats helpers
const isNum = v => typeof v === 'number' && !isNaN(v);
const mean = arr => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const averages = members => {
  const out = {};
  ALL_AXES.forEach(a => { out[a.key] = mean(members.map(r => r[a.key]).filter(isNum)); });
  return out;
};
const fmtMonth = iso => new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

// geometry
const polar = (i, m, r, cx, cy) => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / m;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), cos: Math.cos(a), sin: Math.sin(a) };
};

// one-shot celebration burst above the score panel
function ConfettiBurst() {
  const pieces = useMemo(() => {
    const cols = [C.coral, C.turmeric, C.herb, C.blue, C.berry, '#E58F5A'];
    return Array.from({ length: 46 }, (_, i) => ({
      left: 8 + Math.random() * 84, dx: (Math.random() * 2 - 1) * 170,
      rot: (Math.random() * 2 - 1) * 640, dur: 1.2 + Math.random() * 1.0,
      delay: Math.random() * 0.18, w: 5 + Math.random() * 6, h: 7 + Math.random() * 8,
      c: cols[i % cols.length], round: Math.random() > 0.6,
    }));
  }, []);
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
      {pieces.map((p, i) => (
        <span key={i} style={{ position: 'absolute', left: `${p.left}%`, top: '18%',
          width: p.w, height: p.h, background: p.c, borderRadius: p.round ? 99 : 2,
          '--dx': `${p.dx}px`, '--rot': `${p.rot}deg`,
          animation: `fr-confetti ${p.dur}s cubic-bezier(.15,.55,.45,1) ${p.delay}s both` }} />
      ))}
    </div>
  );
}

// animated score gauge: ring sweeps + number counts up together
function ScoreRing({ value }) {
  const R = 62, CIRC = 2 * Math.PI * R;
  const [sweep, setSweep] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setSweep(value), 80);
    return () => clearTimeout(t);
  }, [value]);
  const col = value >= 70 ? C.herb : value >= 50 ? C.turmeric : C.coral;
  return (
    <div style={{ position: 'relative', width: 168, height: 168, margin: '0 auto' }}>
      <svg viewBox="0 0 168 168" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
        <circle cx="84" cy="84" r={R} fill="none" stroke="rgba(61,43,31,0.08)" strokeWidth="11" />
        <circle cx="84" cy="84" r={R} fill="none" stroke={col} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - sweep / 100)}
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center' }}>
        <AnimatedNumber value={value} duration={1500} suffix="%"
          style={{ fontFamily: C.fontTitle, fontSize: 42, fontWeight: 700, color: col, lineHeight: 1 }} />
        <span style={{ fontFamily: C.font, fontSize: 11.5, letterSpacing: 2, color: C.textM,
          textTransform: 'uppercase', marginTop: 5 }}>close</span>
      </div>
    </div>
  );
}

function AboutModal({ onClose, n, since }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const H = ({ children }) => (
    <div style={{ fontFamily: C.font, fontSize: 11.5, fontWeight: 800, letterSpacing: 2.2,
      textTransform: 'uppercase', color: C.coral, margin: '26px 0 8px' }}>{children}</div>
  );
  const P = ({ children, style }) => (
    <p style={{ fontFamily: C.font, fontSize: 14.5, color: C.text, lineHeight: 1.75, margin: '0 0 10px', ...style }}>{children}</p>
  );

  return ReactDOM.createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(29,18,7,0.62)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 18, animation: 'fr-fadein 0.25s ease' }}>
      <div role="dialog" aria-modal="true" aria-label="About this survey"
        style={{ background: C.bg, borderRadius: 24, maxWidth: 640, width: '100%', maxHeight: '86vh',
          overflowY: 'auto', padding: 'clamp(24px,4vw,40px)', boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
          animation: 'fr-pop 0.3s cubic-bezier(.2,.8,.2,1)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ fontFamily: C.fontTitle, fontSize: 24, fontWeight: 700, color: C.ink }}>
            About this survey
          </div>
          <button onClick={onClose} aria-label="Close"
            style={{ background: 'rgba(61,43,31,0.08)', border: 'none', borderRadius: 12, width: 38,
              height: 38, fontSize: 17, cursor: 'pointer', color: C.text, flexShrink: 0 }}>✕</button>
        </div>

        <H>A different, shorter RELISH survey</H>
        <P>Everything above this section comes from written stories. This part is live data from a second,
          much quicker instrument, the <strong>RELISH Futures Survey</strong>: <strong>{n} responses</strong>{' '}
          collected since {since}, and counting. It is a couple of minutes of ratings, no writing involved.</P>
        <P><strong>Outlook</strong>: “How do you feel about the future of…” the World, Europe, your
          country of origin, and your own personal life, each rated 1 (very pessimistic) to
          4 (very optimistic).</P>
        <P><strong>Relevance</strong>: how relevant Economy, Politics, Culture, Security, Ecosystem and
          Technology will be in defining the future, each rated 1 (entirely irrelevant) to
          6 (extremely relevant).</P>
        <P style={{ fontStyle: 'italic' }}>This copy runs on generated demo answers, not on real
          responses.</P>

        <H>Privacy</H>
        <P>Anonymous: no names or personal identifiers are collected, and answers are never linked to
          identities. Birth year is used only for age statistics.</P>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 22 }}>
          <a href="/survey_future_perspectives" target="_blank" rel="noopener noreferrer" style={btnStyle(true)}>
            Take the survey →</a>
          <a href="/dashboard_future_perspectives" style={btnStyle(false)}>Researcher dashboard</a>
        </div>
      </div>
    </div>,
    document.body
  );
}

function GuessRadar({ step, icon, title, caption, axes, sMin, sMax, guesses, onGuess,
  revealed, actualVals, gid, showHint }) {
  const VB = 460, cx = 230, cy = 224, R = 130, LR = R + 17;
  const m = axes.length;
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const [dragKey, setDragKey] = useState(null);
  const [focusKey, setFocusKey] = useState(null);

  const ringVals = [];
  for (let k = sMin; k <= sMax; k++) ringVals.push(k);

  const toT = v => Math.max(0, Math.min(1, (v - sMin) / (sMax - sMin)));
  const valToPoint = (key, i) => polar(i, m, R * toT(guesses[key]), cx, cy);
  const realToPoint = (key, i) => {
    const v = actualVals[key];
    return v == null ? null : { ...polar(i, m, R * toT(v), cx, cy), v };
  };

  const toSvg = (clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    return { x: ((clientX - rect.left) / rect.width) * VB, y: ((clientY - rect.top) / rect.height) * VB };
  };

  useEffect(() => {
    const move = e => {
      const i = dragRef.current;
      if (i == null) return;
      const { x, y } = toSvg(e.clientX, e.clientY);
      const dir = polar(i, m, 1, 0, 0);
      const radial = (x - cx) * dir.cos + (y - cy) * dir.sin;
      const t = Math.max(0, Math.min(1, radial / R));
      onGuess(axes[i].key, sMin + t * (sMax - sMin));
    };
    const up = () => { dragRef.current = null; setDragKey(null); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [axes, m, sMin, sMax, onGuess]); // eslint-disable-line react-hooks/exhaustive-deps

  const startDrag = i => { if (revealed) return; dragRef.current = i; setDragKey(axes[i].key); };

  const onKeyAdjust = (e, key) => {
    if (revealed) return;
    let d = 0;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') d = 0.1;
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') d = -0.1;
    else if (e.key === 'Home') { e.preventDefault(); onGuess(key, sMin); return; }
    else if (e.key === 'End') { e.preventDefault(); onGuess(key, sMax); return; }
    else return;
    e.preventDefault();
    onGuess(key, Math.max(sMin, Math.min(sMax, (guesses[key] ?? sMin) + d)));
  };

  const guessPts = axes.map((ax, i) => ({ ...valToPoint(ax.key, i), ax, i }));
  const realPts = revealed ? axes.map((ax, i) => realToPoint(ax.key, i)) : [];
  const activeKey = dragKey || focusKey;

  return (
    <div style={{ flex: '1 1 390px', minWidth: 320, maxWidth: 560, position: 'relative',
      background: C.card, borderRadius: 26, padding: '24px 20px 18px',
      boxShadow: '0 14px 44px rgba(61,43,31,0.10)', border: '1px solid rgba(61,43,31,0.05)' }}>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: C.font, fontSize: 10.5, fontWeight: 800, letterSpacing: 1.8,
          color: C.coral, background: C.coralSoft, borderRadius: 999, padding: '4px 11px' }}>
          COMPASS {step}
        </span>
        <span style={{ fontFamily: C.fontTitle, fontSize: 19.5, color: C.ink, fontWeight: 700 }}>
          {icon} {title}
        </span>
      </div>
      <div style={{ fontFamily: C.font, fontSize: 12.5, color: C.textM, textAlign: 'center', marginTop: 5 }}>
        {caption}
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${VB} ${VB}`}
        style={{ width: '100%', height: 'auto', overflow: 'visible', marginTop: 4,
          pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
        <defs>
          <radialGradient id={`${gid}-fill`} cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#E58F5A" stopOpacity="0.30" />
            <stop offset="100%" stopColor={GUESS_COLOR} stopOpacity="0.10" />
          </radialGradient>
          <radialGradient id={`${gid}-real`} cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor={REAL_COLOR} stopOpacity="0.16" />
            <stop offset="100%" stopColor={REAL_COLOR} stopOpacity="0.05" />
          </radialGradient>
        </defs>

        {/* rings */}
        {ringVals.map(k => {
          const rr = R * toT(k);
          if (rr <= 0) return null;
          const poly = axes.map((_, i) => { const p = polar(i, m, rr, cx, cy); return `${p.x},${p.y}`; }).join(' ');
          return (
            <g key={`ring-${k}`}>
              <polygon points={poly} fill="none" stroke="rgba(61,43,31,0.09)" strokeWidth="1" />
              <text x={cx + 5} y={cy - rr + 3} fontSize="9.5" fill={C.textL} fontFamily={C.font}>{k}</text>
            </g>
          );
        })}

        {/* spokes + labels */}
        {axes.map((ax, i) => {
          const e = polar(i, m, R, cx, cy);
          const l = polar(i, m, LR, cx, cy);
          const anchor = l.cos > 0.25 ? 'start' : l.cos < -0.25 ? 'end' : 'middle';
          const dy = l.sin > 0.4 ? 13 : l.sin < -0.4 ? -6 : 4;
          const isActive = activeKey === ax.key;
          return (
            <g key={`spoke-${ax.key}`}>
              <line x1={cx} y1={cy} x2={e.x} y2={e.y}
                stroke={isActive ? 'rgba(200,75,49,0.4)' : 'rgba(61,43,31,0.09)'}
                strokeWidth={isActive ? 1.8 : 1} style={{ transition: 'stroke 0.2s' }} />
              <text x={l.x} y={l.y + dy} fontSize="12" fontWeight="700"
                fill={isActive ? C.coral : C.text} fontFamily={C.font} textAnchor={anchor}
                style={{ transition: 'fill 0.2s' }}>
                {ax.icon} {ax.label}
              </text>
              {revealed && actualVals[ax.key] != null && (
                <text x={l.x} y={l.y + dy + 15} fontSize="10.5" fontWeight="700"
                  fontFamily={C.font} textAnchor={anchor}>
                  <tspan fill={GUESS_COLOR}>you {guesses[ax.key] != null ? guesses[ax.key].toFixed(1) : '—'}</tspan>
                  <tspan fill={C.textL} fontWeight="400">  ·  </tspan>
                  <tspan fill={REAL_COLOR}>them {actualVals[ax.key].toFixed(1)}</tspan>
                </text>
              )}
            </g>
          );
        })}

        {/* real-average polygon + guess→real error connectors (revealed) */}
        {revealed && realPts.every(Boolean) && (
          <g style={{ animation: 'fr-bloom 0.9s cubic-bezier(.2,.8,.2,1) both',
            transformOrigin: `${cx}px ${cy}px` }}>
            {realPts.map((p, i) => (
              <line key={`err-${i}`} x1={guessPts[i].x} y1={guessPts[i].y} x2={p.x} y2={p.y}
                stroke={C.turmeric} strokeWidth="2" strokeDasharray="3 4" opacity="0.75" />
            ))}
            <polygon points={realPts.map(p => `${p.x},${p.y}`).join(' ')}
              fill={`url(#${gid}-real)`} stroke={REAL_COLOR} strokeWidth="2.5"
              strokeDasharray="7 5" strokeLinejoin="round" />
            {realPts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="4.5" fill={REAL_COLOR} stroke="#fff" strokeWidth="1.6" />
            ))}
          </g>
        )}

        {/* the visitor's guess polygon */}
        <polygon points={guessPts.map(p => `${p.x},${p.y}`).join(' ')}
          fill={`url(#${gid}-fill)`} fillOpacity={revealed ? 0.55 : 1} stroke={GUESS_COLOR}
          strokeWidth="2.5" strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 5px 14px rgba(200,75,49,0.28))' }} />

        {/* handles: visible dot + big invisible hit/focus target (drag or arrow keys) */}
        {guessPts.map(p => (
          <g key={p.ax.key}>
            <circle cx={p.x} cy={p.y} r={activeKey === p.ax.key ? 11 : 8}
              fill="#fff" stroke={GUESS_COLOR} strokeWidth="3"
              className={!revealed && activeKey == null ? 'fr-handle' : ''}
              style={{ transition: 'r 0.15s' }} />
            {!revealed && (
              <circle cx={p.x} cy={p.y} r="20" fill="transparent" className="fr-hit"
                role="slider" tabIndex={0}
                aria-label={`${p.ax.label} guess`} aria-valuemin={sMin} aria-valuemax={sMax}
                aria-valuenow={guesses[p.ax.key] != null ? +guesses[p.ax.key].toFixed(1) : sMin}
                style={{ cursor: 'grab', touchAction: 'none', pointerEvents: 'auto' }}
                onPointerDown={() => startDrag(p.i)}
                onKeyDown={e => onKeyAdjust(e, p.ax.key)}
                onFocus={() => setFocusKey(p.ax.key)}
                onBlur={() => setFocusKey(k => (k === p.ax.key ? null : k))} />
            )}
          </g>
        ))}

        {/* floating value bubble while dragging / keyboard-focused */}
        {activeKey != null && !revealed && (() => {
          const dp = guessPts.find(p => p.ax.key === activeKey);
          if (!dp) return null;
          const dir = polar(dp.i, m, 1, 0, 0);
          const bx = dp.x - dir.sin * 32, by = dp.y + dir.cos * 32;
          const val = guesses[dp.ax.key];
          return (
            <g style={{ pointerEvents: 'none' }}>
              <g style={{ animation: 'fr-pop 0.16s ease-out' }}>
                <rect x={bx - 20} y={by - 14} width="40" height="28" rx="14"
                  fill={GUESS_COLOR} stroke="#fff" strokeWidth="1.5" />
                <text x={bx} y={by + 1} textAnchor="middle" dominantBaseline="middle"
                  fontFamily={C.font} fontSize="15" fontWeight="800" fill="#fff">
                  {val != null ? val.toFixed(1) : '—'}
                </text>
              </g>
            </g>
          );
        })()}

        {showHint && (
          <g style={{ animation: 'fr-bounce 1.6s ease-in-out infinite', pointerEvents: 'none' }}>
            <rect x={cx - 86} y={cy - 94} width="172" height="30" rx="15" fill={C.ink}
              style={{ filter: 'drop-shadow(0 6px 16px rgba(61,43,31,0.35))' }} />
            <text x={cx} y={cy - 74} textAnchor="middle" fill="#FFF6EA" fontFamily={C.font}
              fontSize="12.5" fontWeight="700">👆 grab a dot and drag it</text>
          </g>
        )}
      </svg>

      {/* legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 2,
        fontFamily: C.font, fontSize: 12, color: C.textM, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 4, borderRadius: 2, background: GUESS_COLOR }} /> your guess
        </span>
        {revealed && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 0, borderTop: `3px dashed ${REAL_COLOR}` }} /> live average
          </span>
        )}
      </div>
    </div>
  );
}

const OUTLOOK_SEG_COLORS = ['#A93E2A', '#DE9C6B', '#AFC48D', '#5A7A3A'];
// 1 (irrelevant) → 6 (extremely relevant): faded warm → deep berry.
const RELEVANCE_SEG_COLORS = ['#D7C3B0', '#D3A57F', '#C9814F', '#B6634A', '#9E4A57', '#8E4162'];

export function HopeGapSection({ ins }) {
  const [ref, seen] = useOnScreen({ threshold: 0.25 });
  const Big = ({ v, label, color }) => (
    <div style={{ textAlign: 'center', minWidth: 200, flex: '0 1 260px' }}>
      <AnimatedNumber value={v} suffix="%" duration={1600}
        style={{ fontFamily: C.fontTitle, fontSize: 'clamp(44px,6vw,64px)', fontWeight: 700, color, lineHeight: 1 }} />
      <div style={{ fontFamily: C.font, fontSize: 13.5, color: C.textM, marginTop: 8, lineHeight: 1.5 }}>{label}</div>
    </div>
  );
  const byPct = [...ins.outlook].sort((a, b) => b.pct - a.pct);
  const [lead, next] = byPct;
  const leadClear = lead && next && clearlyAhead(lead.pct, next.pct);
  const personalLeads = leadClear && lead.key === 'future_personal';
  const worldLowest = clearlyAhead(Math.min(ins.pctEurope, ins.pctCountry, ins.pctPersonal), ins.pctWorld);
  const title = !lead ? 'Hope, rated four ways.'
    : leadClear ? (personalLeads ? 'Hope lives close to home.' : `Hope is highest for ${HOPE_WHAT[lead.key]}.`)
      : `Hope runs level for ${HOPE_WHAT[lead.key]} and ${HOPE_WHAT[next.key]}.`;
  // "about half for Europe (50%)", or "42% for their own country" when no fraction fits
  const part = (p, what) => { const w = shareInWords(p); return w ? `${w} for ${what} (${p}%)` : `${p}% for ${what}`; };
  return (
    <section style={{ padding: '90px 0 96px', background: C.bg }}>
      <SectionHead kicker="What the data says · 1 of 3" title={title}
        lede="The same people answered the same 1 to 4 question four times, about the world, Europe, their
          country and their own life. Watch what happens as the future gets personal." />

      <Fade delay={120}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'clamp(14px,4vw,44px)',
          flexWrap: 'wrap', margin: '44px auto 10px', padding: '0 22px', maxWidth: 860 }}>
          <Big v={ins.pctPersonal} color={C.herb} label="are optimistic about their own future" />
          <div style={{ fontFamily: C.fontTitle, fontSize: 22, color: C.textL }}>vs</div>
          <Big v={ins.pctWorld} color={C.coral} label="are optimistic about the world's" />
        </div>
      </Fade>

      <div ref={ref} style={{ maxWidth: 780, margin: '30px auto 0', padding: '0 22px' }}>
        {ins.outlook.map((ax, r) => {
          const total = ax.dist.reduce((a, b) => a + b, 0) || 1;
          return (
            <div key={ax.key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 13 }}>
              <div style={{ width: 130, textAlign: 'right', fontFamily: C.font, fontSize: 13.5,
                fontWeight: 700, color: C.text, flexShrink: 0 }}>
                {ax.icon} {ax.label}
              </div>
              <div style={{ flex: 1, height: 36, borderRadius: 11, overflow: 'hidden', display: 'flex',
                transform: seen ? 'scaleX(1)' : 'scaleX(0)', transformOrigin: 'left center',
                transition: `transform 1s cubic-bezier(.2,.8,.2,1) ${r * 140}ms`,
                boxShadow: 'inset 0 1px 3px rgba(61,43,31,0.10)' }}>
                {ax.dist.map((cnt, j) => (
                  <div key={j} title={`${cnt} answered ${j + 1}`}
                    style={{ width: `${(100 * cnt) / total}%`, background: OUTLOOK_SEG_COLORS[j],
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {cnt / total > 0.09 && (
                      <span style={{ fontFamily: C.font, fontSize: 11, fontWeight: 700,
                        color: 'rgba(255,255,255,0.92)' }}>{Math.round((100 * cnt) / total)}%</span>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ width: 76, flexShrink: 0, fontFamily: C.font, fontSize: 12.5, color: C.textM }}>
                <strong style={{ color: C.ink, fontSize: 14 }}>{ax.mean != null ? ax.mean.toFixed(1) : '—'}</strong> avg
              </div>
            </div>
          );
        })}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginTop: 14,
          fontFamily: C.font, fontSize: 11.5, color: C.textM }}>
          {['1 · very pessimistic', '2', '3', '4 · very optimistic'].map((t, j) => (
            <span key={j} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: OUTLOOK_SEG_COLORS[j] }} />{t}
            </span>
          ))}
        </div>
      </div>

      <Fade delay={150}>
        <p style={{ maxWidth: 640, margin: '38px auto 0', padding: '0 22px', textAlign: 'center',
          fontFamily: C.font, fontSize: 15.5, color: C.text, lineHeight: 1.8 }}>
          {worldLowest ? 'Only ' : ''}{ins.pctWorld}% feel optimistic about the world, {part(ins.pctEurope, 'Europe')} and{' '}
          {part(ins.pctCountry, 'their own country')}, {personalLeads ? 'yet' : 'and'} <strong>{ins.pctPersonal}%</strong> are
          optimistic about their personal future.
          {personalLeads ? " They haven't run out of hope, they have parked it where it still feels in control: their own lives." : ''}{' '}
          <em style={{ color: C.coral }}>{personalLeads ? 'Turning that private hope into shared futures' : 'Turning hope into shared futures'}{' '}
          is exactly the ground RELISH works on.</em>
        </p>
      </Fade>
    </section>
  );
}

const ORDINAL = { 1: 'first', 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth' };
const HOPE_WHAT = { future_world: 'the world', future_europe: 'Europe', future_country: 'their home country', future_personal: 'their own lives' };

export function RelevanceSection({ ins }) {
  const [ref, seen] = useOnScreen({ threshold: 0.25 });
  const rel = ins.relevance;
  const [top, second] = rel;
  const last = rel[rel.length - 1], prev = rel[rel.length - 2];
  const ahead = (a, b) => a && b && clearlyAheadOnScale(a.mean, b.mean, 1, 6);
  const firstLine = !top ? 'What will define the future?'
    : ahead(top, second) ? `${top.label} writes the future.` : `${top.label} and ${second.label} write the future.`;
  const lastLine = !last || !prev ? '' : ahead(prev, last) ? `${last.label} closes the list.` : `${prev.label} and ${last.label} close the list.`;
  const cultureRank = rel.findIndex(a => a.key === 'culture') + 1;
  const cultureLast = last?.key === 'culture';
  const cultureBottom = cultureLast || (prev?.key === 'culture' && !ahead(prev, last));
  const allRelevant = rel.length && clearlyAheadOnScale(ins.minRelevanceMean, 3.5, 1, 6);
  return (
    <section style={{ padding: '90px 0 96px', background: C.bgWarm }}>
      <SectionHead kicker="What the data says · 2 of 3" accent={C.berry}
        title={<>{firstLine}{lastLine && <><br />{lastLine}</>}</>}
        lede="How relevant will each of these forces be in defining the future, rated 1 (entirely
          irrelevant) to 6 (extremely relevant). Here is the collective ranking." />

      <div ref={ref} style={{ maxWidth: 720, margin: '46px auto 0', padding: '0 22px' }}>
        {ins.relevance.map((ax, r) => {
          const isCulture = ax.key === 'culture';
          const total = ax.dist.reduce((a, b) => a + b, 0) || 1;
          return (
            <div key={ax.key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
              padding: isCulture ? '8px 10px' : '0 10px', borderRadius: 12,
              border: isCulture ? `1.5px dashed ${C.coral}` : '1.5px dashed transparent',
              background: isCulture ? 'rgba(200,75,49,0.05)' : 'transparent' }}>
              <div style={{ width: 20, fontFamily: C.fontTitle, fontSize: 15, fontWeight: 700,
                color: r === 0 ? C.berry : C.textL, flexShrink: 0 }}>{r + 1}</div>
              <div style={{ width: 118, fontFamily: C.font, fontSize: 13.5, fontWeight: 700,
                color: C.text, flexShrink: 0 }}>{ax.icon} {ax.label}</div>
              <div style={{ flex: 1, height: 34, borderRadius: 10, overflow: 'hidden', display: 'flex',
                transform: seen ? 'scaleX(1)' : 'scaleX(0)', transformOrigin: 'left center',
                transition: `transform 1s cubic-bezier(.2,.8,.2,1) ${r * 120}ms`,
                boxShadow: 'inset 0 1px 3px rgba(61,43,31,0.10)' }}>
                {ax.dist.map((cnt, j) => (
                  <div key={j} title={`${cnt} rated ${j + 1}`}
                    style={{ width: `${(100 * cnt) / total}%`, background: RELEVANCE_SEG_COLORS[j],
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {cnt / total > 0.1 && (
                      <span style={{ fontFamily: C.font, fontSize: 10.5, fontWeight: 700,
                        color: 'rgba(255,255,255,0.92)' }}>{Math.round((100 * cnt) / total)}%</span>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ width: 52, flexShrink: 0, textAlign: 'right', fontFamily: C.fontTitle,
                fontSize: 15, fontWeight: 700, color: C.ink }}>
                {ax.mean != null ? ax.mean.toFixed(1) : '—'}<span style={{ fontSize: 10.5, color: C.textL }}>/6</span>
              </div>
            </div>
          );
        })}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginTop: 14,
          fontFamily: C.font, fontSize: 11, color: C.textM }}>
          {['1 · irrelevant', '2', '3', '4', '5', '6 · extremely relevant'].map((t, j) => (
            <span key={j} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: RELEVANCE_SEG_COLORS[j] }} />{t}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 26 }}>
          {allRelevant && <span style={nuggetStyle}>Nothing scores below {ins.minRelevanceMean.toFixed(1)}/6, every force feels relevant</span>}
          {ins.techFloor != null && ins.techFloor >= 3 && (
            <span style={nuggetStyle}>Not one respondent rated Technology under {ins.techFloor}</span>
          )}
          <span style={nuggetStyle}>🎭 Culture, {cultureLast && ahead(prev, last) ? 'last place' : cultureBottom ? 'near the bottom' : `${ORDINAL[cultureRank] || cultureRank} of ${rel.length}`}, and the RELISH lens</span>
        </div>
      </div>

      <Fade delay={150}>
        <p style={{ maxWidth: 640, margin: '36px auto 0', padding: '0 22px', textAlign: 'center',
          fontFamily: C.font, fontSize: 15.5, color: C.text, lineHeight: 1.8 }}>
          {cultureBottom ? <>
            A heritage project could read that {cultureLast && ahead(prev, last) ? 'last place' : 'low place'} as bad news. RELISH reads it as the brief:
            culture is where the other five forces already meet every day, on a plate. If people don't yet
            see culture shaping the future, <em style={{ color: C.berry }}>that's the conversation this project exists to start.</em>
          </> : <>
            For a heritage project, culture's place on this list is the starting point: it is where the other
            five forces already meet every day, on a plate. <em style={{ color: C.berry }}>That's the conversation this project exists to have.</em>
          </>}
        </p>
      </Fade>
    </section>
  );
}

export function PeopleSection({ ins, records }) {
  const [ref, seen] = useOnScreen({ threshold: 0.15 });
  const dots = useMemo(() => {
    const order = new Map(ins.fieldRows.map((g, i) => [g.label, i]));
    return records
      .map(r => {
        const g = fieldGroup(r.field_of_study);
        return { color: g.color, o: order.get(g.label) ?? 99,
          title: `${g.label}${r.residence_country ? ' · ' + r.residence_country : ''}` };
      })
      .sort((a, b) => a.o - b.o);
  }, [records, ins.fieldRows]);

  const COLS = 25, CELL = 18;
  const rows = Math.ceil(dots.length / COLS) || 1;

  const Stat = ({ v, label, suffix = '' }) => (
    <div style={{ textAlign: 'center', minWidth: 110 }}>
      <AnimatedNumber value={v} suffix={suffix} duration={1400}
        style={{ fontFamily: C.fontTitle, fontSize: 'clamp(30px,3.6vw,42px)', fontWeight: 700, color: C.ink }} />
      <div style={{ fontFamily: C.font, fontSize: 12.5, color: C.textM, marginTop: 4 }}>{label}</div>
    </div>
  );

  return (
    <section style={{ padding: '90px 0 80px', background: C.bgWarm }}>
      <SectionHead kicker="What the data says · 3 of 3" accent={C.turmeric}
        title="The people behind the dots."
        lede="Every dot below is one person who stopped and answered. The grid grows as new
          responses arrive, reload in a month and it will be bigger." />

      <Fade delay={100}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(18px,5vw,54px)',
          flexWrap: 'wrap', margin: '40px auto 8px', padding: '0 22px' }}>
          <Stat v={ins.n} label="voices so far" />
          <Stat v={ins.countries} label="countries of residence" />
          <Stat v={ins.medianAge || 0} label="median age" />
          <Stat v={ins.fieldRows.length} label="fields of study" />
        </div>
      </Fade>

      <div ref={ref} className={`fr-dots ${seen ? 'on' : ''}`}
        style={{ maxWidth: 760, margin: '26px auto 0', padding: '0 22px' }}>
        <svg viewBox={`0 0 ${COLS * CELL} ${rows * CELL}`} style={{ width: '100%', height: 'auto' }}>
          {dots.map((d, i) => (
            <circle key={i} cx={(i % COLS) * CELL + CELL / 2} cy={Math.floor(i / COLS) * CELL + CELL / 2}
              r={6} fill={d.color} opacity={seen ? undefined : 0}
              style={{ animationDelay: `${i * 5}ms` }}>
              <title>{d.title}</title>
            </circle>
          ))}
        </svg>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
          {ins.fieldRows.map(g => (
            <span key={g.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: C.font, fontSize: 12, color: C.text }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: g.color }} />
              {g.label} <span style={{ color: C.textL }}>{g.count}</span>
            </span>
          ))}
        </div>
        <p style={{ fontFamily: C.font, fontSize: 12.5, color: C.textM, textAlign: 'center',
          lineHeight: 1.6, marginTop: 18 }}>
          Mostly university students, reached across Europe since {ins.since}. Anonymous by design,
          this shows their outlooks, not their names.
        </p>
      </div>

      <Fade delay={150}>
        <div style={{ textAlign: 'center', marginTop: 34 }}>
          <a href="/survey_future_perspectives" target="_blank" rel="noopener noreferrer"
            style={{ ...btnStyle(true), fontSize: 14 }}>Take the Futures Survey →</a>
        </div>
      </Fade>
    </section>
  );
}

export function computeFuturesInsights(records) {
  if (!records.length) return null;
  const num = k => records.map(r => r[k]).filter(isNum);
  const outlook = OUTLOOK_AXES.map(a => {
    const vals = num(a.key);
    const dist = [1, 2, 3, 4].map(v => vals.filter(x => x === v).length);
    const pct = vals.length ? Math.round((100 * vals.filter(x => x >= 3).length) / vals.length) : 0;
    return { ...a, mean: mean(vals), dist, pct };
  });
  const relevance = RELEVANCE_AXES.map(a => {
    const vals = num(a.key);
    const dist = [1, 2, 3, 4, 5, 6].map(v => vals.filter(x => x === v).length);
    return { ...a, mean: mean(vals), min: vals.length ? Math.min(...vals) : null, dist };
  }).sort((x, y) => (y.mean ?? 0) - (x.mean ?? 0));
  const perOutlook = r => {
    const vs = OUTLOOK_AXES.map(a => r[a.key]).filter(isNum);
    return vs.length === OUTLOOK_AXES.length ? mean(vs) : null;
  };
  const overallOutlook = mean(records.map(perOutlook).filter(v => v != null)) ?? 2.5;
  const byCountry = {};
  records.forEach(r => {
    const c = r.residence_country;
    if (!c) return;
    (byCountry[c] = byCountry[c] || []).push(r);
  });
  const countryRows = Object.entries(byCountry)
    .filter(([, rs]) => rs.length >= 5)
    .map(([c, rs]) => ({ country: c, n: rs.length, mean: mean(rs.map(perOutlook).filter(v => v != null)) }))
    .filter(r => r.mean != null)
    .sort((a, b) => b.mean - a.mean);
  const fieldCounts = {};
  records.forEach(r => { const g = fieldGroup(r.field_of_study); fieldCounts[g.label] = (fieldCounts[g.label] || 0) + 1; });
  const fieldRows = [...FIELD_GROUPS, FIELD_OTHER]
    .map(g => ({ ...g, count: fieldCounts[g.label] || 0 }))
    .filter(g => g.count > 0)
    .sort((a, b) => b.count - a.count);
  // age when they answered, not today
  const medianAge = median(records.map(r => ageAt(r.birth_year, r.createdAt)));
  const dates = records.map(r => r.createdAt).filter(Boolean).sort();
  const tech = relevance.find(a => a.key === 'technology');
  return {
    n: records.length, outlook, relevance, overallOutlook, countryRows, fieldRows, medianAge,
    since: dates.length ? fmtMonth(dates[0]) : '—',
    countries: new Set(records.map(r => r.residence_country).filter(Boolean)).size,
    pctWorld: outlook[0].pct, pctEurope: outlook[1].pct, pctCountry: outlook[2].pct,
    pctPersonal: outlook[3].pct,
    techFloor: tech ? tech.min : null,
    minRelevanceMean: Math.min(...relevance.map(a => a.mean ?? 6)),
  };
}

export function FuturesGameEmbed() {
  const [records, setRecords] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [guesses, setGuesses] = useState(INITIAL_GUESS);
  const [moved, setMoved] = useState(() => new Set());
  const [phase, setPhase] = useState('guess'); // guess | loading | revealed
  const [about, setAbout] = useState(false);
  const [bump, setBump] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const prevN = useRef(0);
  const scoreRef = useRef(null);
  const revealed = phase === 'revealed';

  const load = useCallback(() => {
    fetch('/api/survey/filtered?surveyType=futures')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d) && d.length) { setRecords(d); setLoadError(false); } })
      .catch(err => { console.error('FuturesGameEmbed load error:', err); setLoadError(true); });
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const grew = prevN.current && records.length > prevN.current;
    prevN.current = records.length;
    if (grew) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 700);
      return () => clearTimeout(t);
    }
  }, [records.length]);

  const actual = useMemo(() => ({ vals: averages(records), n: records.length }), [records]);

  const ins = useMemo(() => computeFuturesInsights(records), [records]);

  const onGuess = useCallback((key, val) => {
    setGuesses(g => ({ ...g, [key]: val }));
    setMoved(mv => (mv.has(key) ? mv : new Set(mv).add(key)));
  }, []);

  const doReveal = () => {
    if (phase !== 'guess') return;
    evalog('eval_interaction', { t: 'game_reveal', guesses });
    setPhase('loading');
    setTimeout(() => {
      setPhase('revealed');
      requestAnimationFrame(() => {
        if (scoreRef.current && scoreRef.current.scrollIntoView) {
          scoreRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }, 950);
  };

  const resetGuess = () => {
    setGuesses(INITIAL_GUESS);
    setMoved(new Set());
    setPhase('guess');
    setConfetti(false);
    const el = document.getElementById('futures-game');
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollTo = id => {
    const el = document.getElementById(id);
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const score = useMemo(() => {
    if (!revealed) return null;
    const errOf = axesArr => axesArr
      .filter(a => actual.vals[a.key] != null)
      .map(a => ({ ...a, err: Math.abs(guesses[a.key] - actual.vals[a.key]) }));
    const oErrs = errOf(OUTLOOK_AXES.map(a => ({ ...a, range: 3 })));
    const rErrs = errOf(RELEVANCE_AXES.map(a => ({ ...a, range: 5 })));
    const all = [...oErrs, ...rErrs].map(a => ({ ...a, errN: a.err / a.range }));
    if (!all.length) return null;
    const closeness = Math.max(0, Math.round((1 - mean(all.map(a => a.errN))) * 100));
    const sorted = [...all].sort((a, b) => a.errN - b.errN);
    const msg = closeness >= 85 ? 'Uncanny. You read this generation like a book.'
      : closeness >= 70 ? 'Sharp, you clearly have a feel for how they think.'
      : closeness >= 55 ? 'Close in places, but a few answers should surprise you.'
      : 'Their real picture is stranger than your instinct. Scroll on.';
    return { closeness, msg, best: sorted[0], worst: sorted[sorted.length - 1] };
  }, [revealed, guesses, actual]);

  useEffect(() => {
    if (revealed && score && score.closeness >= 68) {
      setConfetti(true);
      const t = setTimeout(() => setConfetti(false), 2600);
      return () => clearTimeout(t);
    }
  }, [revealed]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!records.length) {
    return (
      <section id="futures-game" style={{ padding: '90px 22px', textAlign: 'center', background: C.bg }}>
        <style>{GLOBAL_CSS}</style>
        {loadError ? (
          <div>
            <div style={{ fontSize: 36 }}>🛰️</div>
            <div style={{ fontFamily: C.fontTitle, color: C.ink, fontSize: 18, marginTop: 12 }}>
              Couldn't reach the futures survey.
            </div>
            <button onClick={load} style={{ ...btnStyle(true), marginTop: 16 }}>Try again ↺</button>
          </div>
        ) : (
          <div style={{ fontSize: 34, animation: 'fr-spin 2.4s linear infinite' }}>🧭</div>
        )}
      </section>
    );
  }

  const cohortLabel = 'everyone in the sample';

  return (
    <div className="fr-root">
      <style>{GLOBAL_CSS}</style>

      <section id="futures-game" style={{ padding: '86px 0 30px', scrollMarginTop: 10, background: C.bg }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 22px', textAlign: 'center' }}>
          <Fade>
            <LiveBadge n={records.length} bump={bump} dark={false} label="RESPONSES" />
          </Fade>
          <Fade delay={80}>
            <div style={{ fontFamily: C.font, fontSize: 11.5, letterSpacing: 3.2, textTransform: 'uppercase',
              color: C.blue, fontWeight: 800, marginTop: 20 }}>
              A second, shorter live survey
            </div>
            <h2 style={{ fontFamily: C.fontTitle, fontSize: 'clamp(26px,3.8vw,42px)', color: C.ink,
              margin: '14px 0 0', lineHeight: 1.22 }}>
              How hopeful do they feel about tomorrow?
            </h2>
            <p style={{ fontFamily: C.font, fontSize: 'clamp(14.5px,1.5vw,16.5px)', color: C.textM,
              lineHeight: 1.75, maxWidth: 620, margin: '16px auto 0' }}>
              The cards above come from long, written stories. This part comes from a much shorter RELISH
              survey: a couple of minutes of quick ratings, no writing involved. Guess the real averages
              below, then see how close you were.
            </p>
            <button onClick={() => setAbout(true)}
              style={{ fontFamily: C.font, fontSize: 12.5, fontWeight: 700, color: C.text,
                background: 'transparent', border: '1px solid rgba(61,43,31,0.22)', borderRadius: 999,
                padding: '7px 15px', cursor: 'pointer', marginTop: 16 }}>About this survey</button>
          </Fade>
        </div>

        <div style={{ maxWidth: 1180, margin: '30px auto 0', padding: '0 18px',
          display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center', alignItems: 'stretch' }}>
          <Fade delay={120} style={{ flex: '1 1 390px', maxWidth: 560, display: 'flex' }}>
            <GuessRadar step="A" gid="fr-out" icon="🧭" title="How hopeful are they?"
              caption="1 = very pessimistic · 4 = very optimistic"
              axes={OUTLOOK_AXES} sMin={1} sMax={4} guesses={guesses} onGuess={onGuess}
              revealed={revealed} actualVals={actual.vals}
              showHint={moved.size === 0 && phase === 'guess'} />
          </Fade>
          <Fade delay={240} style={{ flex: '1 1 390px', maxWidth: 560, display: 'flex' }}>
            <GuessRadar step="B" gid="fr-rel" icon="⚖️" title="What will define the future?"
              caption="1 = entirely irrelevant · 6 = extremely relevant"
              axes={RELEVANCE_AXES} sMin={1} sMax={6} guesses={guesses} onGuess={onGuess}
              revealed={revealed} actualVals={actual.vals} showHint={false} />
          </Fade>
        </div>

        {!revealed && (
          <div style={{ maxWidth: 720, margin: '34px auto 0', padding: '0 22px', textAlign: 'center' }}>
            <div style={{ fontFamily: C.font, fontSize: 12.5, color: C.textM, marginBottom: 14 }}>
              <span style={{ background: C.card, borderRadius: 999, padding: '6px 14px',
                border: '1px solid rgba(61,43,31,0.10)', fontWeight: 700 }}>
                {moved.size} / {ALL_AXES.length} dots set
              </span>
            </div>
            <button onClick={doReveal} disabled={phase === 'loading'}
              style={{ fontFamily: C.font, fontSize: 16.5, fontWeight: 800, cursor: 'pointer', color: '#fff',
                background: phase === 'loading' ? 'rgba(61,43,31,0.35)' : `linear-gradient(120deg, ${C.coral}, #E06A3C)`,
                border: 'none', borderRadius: 999, padding: '16px 36px',
                boxShadow: phase === 'loading' ? 'none' : '0 12px 32px rgba(200,75,49,0.40)',
                transition: 'all 0.25s ease' }}>
              {phase === 'loading'
                ? <span><span style={{ display: 'inline-block', animation: 'fr-spin 0.9s linear infinite' }}>🧭</span>
                    &nbsp;Reading the live answers…</span>
                : 'Reveal the real averages →'}
            </button>
          </div>
        )}

        {revealed && score && (
          <div ref={scoreRef} style={{ position: 'relative', maxWidth: 780, margin: '40px auto 0',
            padding: '0 18px' }}>
            {confetti && <ConfettiBurst />}
            <div style={{ background: C.card, borderRadius: 30, padding: 'clamp(28px,4.5vw,44px)',
              textAlign: 'center', boxShadow: '0 20px 60px rgba(61,43,31,0.14)',
              border: '1px solid rgba(61,43,31,0.05)', animation: 'fr-fadein 0.6s ease both' }}>
              <div style={{ fontFamily: C.font, fontSize: 11.5, letterSpacing: 3, textTransform: 'uppercase',
                color: C.coral, fontWeight: 800, marginBottom: 20 }}>The reveal</div>
              <ScoreRing value={score.closeness} />
              <div aria-live="polite" style={{ fontFamily: C.fontTitle, fontSize: 'clamp(19px,2.4vw,24px)',
                color: C.ink, marginTop: 22, lineHeight: 1.4 }}>{score.msg}</div>
              <div style={{ fontFamily: C.font, fontSize: 13.5, color: C.textM, marginTop: 10 }}>
                Measured against {actual.n} live answers · {cohortLabel}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
                <span style={{ ...nuggetStyle, borderColor: 'rgba(90,122,58,0.35)' }}>
                  🎯 Best call: <strong>{score.best.label}</strong>, off by {score.best.err.toFixed(1)}
                </span>
                <span style={{ ...nuggetStyle, borderColor: 'rgba(200,75,49,0.35)' }}>
                  🌀 Furthest: <strong>{score.worst.label}</strong>, off by {score.worst.err.toFixed(1)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 22 }}>
                <button onClick={() => scrollTo('fr-insights')}
                  style={{ ...btnStyle(true), fontSize: 15, padding: '13px 26px' }}>
                  So what does it mean? ↓
                </button>
                <button onClick={resetGuess} style={btnStyle(false)}>Guess again ↺</button>
              </div>
            </div>
          </div>
        )}
      </section>

      {revealed && ins && (
        <div id="fr-insights" style={{ scrollMarginTop: 10 }}>
          <HopeGapSection ins={ins} />
          <RelevanceSection ins={ins} />
          <PeopleSection ins={ins} records={records} />
        </div>
      )}

      {about && <AboutModal onClose={() => setAbout(false)} n={records.length} since={ins ? ins.since : '—'} />}
    </div>
  );
}

const GLOBAL_CSS = `
  @keyframes fr-live { 0% { box-shadow: 0 0 0 0 rgba(255,92,57,0.55); } 70% { box-shadow: 0 0 0 9px rgba(255,92,57,0); } 100% { box-shadow: 0 0 0 0 rgba(255,92,57,0); } }
  @keyframes fr-bump { 0% { transform: scale(1); } 40% { transform: scale(1.12); } 100% { transform: scale(1); } }
  @keyframes fr-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(7px); } }
  @keyframes fr-bloom { from { transform: scale(0.15); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  @keyframes fr-spin { to { transform: rotate(360deg); } }
  @keyframes fr-fadein { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
  @keyframes fr-pulse { 0%,100% { r: 8; } 50% { r: 10.5; } }
  @keyframes fr-pop { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
  @keyframes fr-pop-center { from { opacity: 0; transform: translateX(-50%) translateY(5px); } to { opacity: 1; transform: translateX(-50%); } }
  @keyframes fr-confetti { 0% { opacity: 1; transform: translate(0,0) rotate(0deg); } 100% { opacity: 0; transform: translate(var(--dx, 0px), 46vh) rotate(var(--rot, 360deg)); } }
  @keyframes fr-dotin { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .fr-root * { box-sizing: border-box; }
  .fr-handle { animation: fr-pulse 1.8s ease-in-out infinite; }
  .fr-hit:focus { outline: none; }
  .fr-root button:hover { transform: translateY(-1px); }
  .fr-root .fr-opt:hover { transform: none; background: rgba(61,43,31,0.06); }
  .fr-dots circle { transform-box: fill-box; transform-origin: center; }
  .fr-dots.on circle { animation: fr-dotin 0.45s cubic-bezier(.2,.8,.2,1) both; }
  @media (prefers-reduced-motion: reduce) {
    .fr-root *, .fr-root *::before, .fr-root *::after { animation-duration: 0.01ms !important; transition-duration: 0.12s !important; }
  }
`;
