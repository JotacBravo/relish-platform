// Food Visions 2050: a swipe deck of written futures, followed by a short ratings game.
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { initEvalTelemetry, evalog, usePhaseDwell } from '../eval/evalTelemetry';
import ReactDOM from 'react-dom';
import {
  C as SUITE_C, useOnScreen, useIsMobile, AnimatedNumber, Fade, Starfield, LiveBadge,
  OfficialEUBadge, SectionHead, nuggetStyle, linkBtnStyle, btnStyle, ProgressSystem,
} from './story3/shared';
import { ageAt, ageBand, bandAgesInText, median, clearlyAhead } from './claims';
import { FuturesGameEmbed } from './FuturesRadar';

const C = {
  ...SUITE_C,
  like: '#43A047', nope: '#E53935', superlike: '#1E88E5',
};
const DARK = '#1D1207';
const CREAM = '#FFF6EA';
const CREAM_DIM = 'rgba(255,238,214,0.66)';

function toneGradient(tone) {
  if (!tone) return ['#C84B31', '#C49A2A'];
  const t = tone.toLowerCase();
  if (t.includes('optimi') || t.includes('hope') || t.includes('joy')) return ['#5A7A3A', '#8fbc6a'];
  if (t.includes('anxi') || t.includes('fear') || t.includes('dystop') || t.includes('grim')) return ['#8E4162', '#5A4040'];
  if (t.includes('nostalg') || t.includes('warm') || t.includes('comfort')) return ['#C49A2A', '#e8c97a'];
  if (t.includes('defi') || t.includes('determin') || t.includes('resili')) return ['#C84B31', '#C49A2A'];
  if (t.includes('seren') || t.includes('calm') || t.includes('peace')) return ['#5A7A3A', '#C49A2A'];
  if (t.includes('ambival') || t.includes('mixed') || t.includes('conflict')) return ['#9C4B8E', '#C49A2A'];
  return ['#C84B31', '#C49A2A'];
}

const CARD_ART_BG = 'linear-gradient(135deg, #E7DECF, #D3C6B2)';

const cardArtSrc = i => `/images/story_cards_web/story_${i}.webp`;
const onCardArtError = e => {
  const img = e.currentTarget;
  if (img.dataset.step !== 'full') {
    img.dataset.step = 'full';
    img.src = `/images/story_cards/story_${img.dataset.idx}.png`;
  } else {
    img.style.visibility = 'hidden';
  }
};

const POLARITY_META = {
  positive: { label: 'Positive', color: '#5A7A3A' },  // herb
  neutral:  { label: 'Neutral',  color: '#C49A2A' },  // turmeric
  negative: { label: 'Negative', color: '#8E4162' },  // berry
};
// Okabe–Ito palette (colour-blind safe) for the eight NRC emotions.
const EMOTION_META = {
  joy:          { label: 'Joy',          color: '#F0E442' },
  trust:        { label: 'Trust',        color: '#009E73' },
  anticipation: { label: 'Anticipation', color: '#E69F00' },
  surprise:     { label: 'Surprise',     color: '#56B4E9' },
  fear:         { label: 'Fear',         color: '#000000' },
  sadness:      { label: 'Sadness',      color: '#0072B2' },
  disgust:      { label: 'Disgust',      color: '#CC79A7' },
  anger:        { label: 'Anger',        color: '#D55E00' },
};
const EMO_STROKE = 'rgba(61,43,31,0.55)';
// Dominant NRC emotion of a per-doc entry (argmax of the 8 emotion shares).
const EMO_KEYS = ['joy', 'trust', 'anticipation', 'surprise', 'fear', 'sadness', 'disgust', 'anger'];
// key: 'emotions', or 'emotions_nofood' for the same shares without the word "food".
const domEmotion = (d, key = 'emotions') => {
  if (!d || !d[key]) return null;
  let best = null, bv = 0;
  EMO_KEYS.forEach(k => { const v = d[key][k] || 0; if (v > bv) { bv = v; best = k; } });
  return bv > 0 ? best : null;
};

const dedash = s => typeof s === 'string'
  ? s.replace(/(\d)\s*[–—]\s*(\d)/g, '$1-$2').replace(/\s*[–—]\s*/g, ', ')
  : s;
const DEDASH_FIELDS = ['title', 'swipe_hook', 'summary', 'bio', 'story_text', 'image_prompt'];
// Exact ages inside the model-written texts become the card's age band.
const BAND_FIELDS = ['title', 'swipe_hook', 'summary', 'bio', 'image_prompt'];
const bandCard = card => {
  const band = ageBand(ageAt(card.birth_year, card.respondedAt));
  const out = { ...card };
  BAND_FIELDS.forEach(f => { if (typeof out[f] === 'string') out[f] = bandAgesInText(out[f], band); });
  return out;
};
const dedashCard = card => {
  const out = { ...card };
  DEDASH_FIELDS.forEach(f => { if (typeof out[f] === 'string') out[f] = dedash(out[f]); });
  return out;
};

const ACTION_BY_DIR = { left: 'nope', right: 'like', up: 'superlike' };
const ACTION_POINTS = { like: 1, superlike: 3, nope: -1 };

// Operator curation (?curate=1): the same gestures record a verdict instead of a vote.
const VERDICT_BY_DIR = { up: 'keep', right: 'regen', left: 'hide' };
const VERDICT_META = {
  keep:  { label: 'Keep',      color: '#1E88E5', icon: '⭐' },
  regen: { label: 'New image', color: '#43A047', icon: '♥' },
  hide:  { label: 'Hide',      color: '#E53935', icon: '✕' },
};

function weightedShuffle(cards, scores, featured) {
  return [...cards]
    .map(c => {
      const pts = scores[c.story_index]?.points || 0;
      const weight = Math.max(0.25, 1 + pts) * (featured.has(c.story_index) ? 2 : 1);
      return { c, key: Math.pow(Math.random(), 1 / weight) };
    })
    .sort((a, b) => b.key - a.key)
    .map(x => x.c);
}

const STAMP_BY_DIR = {
  left: { text: 'NOPE', color: '#E53935', rot: -10 },
  right: { text: 'LIKE', color: '#43A047', rot: 10 },
  up: { text: 'SUPER', color: '#1E88E5', rot: 0 },
};

const guard = {
  onMouseDown: e => e.stopPropagation(),
  onTouchStart: e => e.stopPropagation(),
};

function TagChip({ tag, onOpen, color = C.textM, bg = 'rgba(61,43,31,0.05)', size = 11, border = 'transparent' }) {
  return (
    <button
      className="ft-chip"
      {...guard}
      onClick={e => { e.stopPropagation(); onOpen(tag); }}
      title={`See every story tagged ${tag}`}
      style={{
        background: bg, color, border: `1px solid ${border}`, cursor: 'pointer',
        padding: '4px 11px', borderRadius: 13, fontFamily: C.font, fontSize: size, fontWeight: 700,
      }}>
      {tag}
    </button>
  );
}

function LoveBadge({ score, light }) {
  if (!score || (score.likes <= 0 && score.superlikes <= 0)) return null;
  return (
    <span style={{
      fontFamily: C.font, fontSize: 11, fontWeight: 700,
      color: light ? '#fff' : C.textM,
      background: light ? 'rgba(0,0,0,0.38)' : 'rgba(61,43,31,0.06)',
      backdropFilter: light ? 'blur(6px)' : 'none',
      padding: '4px 10px', borderRadius: 13, whiteSpace: 'nowrap',
    }}>
      {score.likes > 0 && <>♥ {score.likes}</>}{score.likes > 0 && score.superlikes > 0 && ' · '}{score.superlikes > 0 && <>⭐ {score.superlikes}</>}
    </span>
  );
}

const trunc = (s, n) => (s && s.length > n ? s.slice(0, n).trim() + '…' : s);

const ageOf = (birthYear, respondedAt) => ageAt(birthYear, respondedAt);
// Cards show a band (18–24, 25–34, 35+), not the exact age; see ageBand in claims.js.
const ageLabel = (birthYear, respondedAt) => ageBand(ageOf(birthYear, respondedAt)) || '?';

function AiMark() {
  return (
    <span title="Written by an AI model from the participant's story, not a quote"
      style={{ display: 'inline-block', marginLeft: 7, verticalAlign: '1px', fontStyle: 'normal',
        fontFamily: C.font, fontSize: 8.5, fontWeight: 800, letterSpacing: 0.9, textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.78)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 4,
        padding: '1px 4px', lineHeight: 1.3, textShadow: 'none', whiteSpace: 'nowrap' }}>
      AI-written
    </span>
  );
}

function CardFace({ card, hasImage, width = 320, highlight = null, pin = null, stamp = null }) {
  const grad = toneGradient(card.emotional_tone);
  const zone = z => ({
    opacity: highlight && highlight !== z ? 0.22 : 1,
    transition: 'opacity 0.35s ease', position: 'relative',
  });
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: width, margin: '0 auto',
      aspectRatio: '3 / 4.35', borderRadius: 26, overflow: 'hidden', background: C.card,
      boxShadow: '0 24px 60px rgba(61,43,31,0.24)', display: 'flex', flexDirection: 'column' }}>

      {/* visual area, identical to the live deck card */}
      <div style={{ flex: '0 0 55%', position: 'relative', overflow: 'hidden',
        background: CARD_ART_BG }}>
        <div style={{ ...zone('image'), position: 'absolute', inset: 0 }}>
          {hasImage ? (
            <img src={cardArtSrc(card.story_index)} data-idx={card.story_index} onError={onCardArtError}
              loading="lazy" decoding="async" alt="" draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', backgroundImage:
              'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.18) 0%, transparent 45%), radial-gradient(circle at 80% 70%, rgba(0,0,0,0.10) 0%, transparent 50%)' }}>
              <img src="/logo192.png" alt="" style={{ width: 56, opacity: 0.3 }} />
            </div>
          )}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '62%',
          background: 'linear-gradient(transparent, rgba(20,10,5,0.72))', pointerEvents: 'none' }} />
        {pin && (
          <span style={{ position: 'absolute', top: 11, left: 11, ...zone('image') }}>{pin('image')}</span>
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 16px 10px' }}>
          <div style={{ ...zone('title'), fontFamily: C.fontTitle, fontSize: 17.5, fontWeight: 700,
            color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.55)', marginBottom: 5, lineHeight: 1.28 }}>
            {pin && pin('title')}{card.title}
          </div>
          {card.swipe_hook && (
            <div style={{ ...zone('caption'), fontFamily: C.font, fontSize: 12, color: 'rgba(255,255,255,0.92)',
              textShadow: '0 1px 5px rgba(0,0,0,0.45)', fontStyle: 'italic', lineHeight: 1.45 }}>
              {pin && pin('caption')}{card.swipe_hook}<AiMark />
            </div>
          )}
        </div>
      </div>

      {/* content area, identical to the live deck card */}
      <div style={{ flex: '0 0 45%', padding: '11px 16px 12px', display: 'flex',
        flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ ...zone('meta'), fontFamily: C.font, fontSize: 10.5, color: C.textM,
          marginBottom: 7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {card.nationality?.trim() || '?'}{card.residence_country ? ` → ${card.residence_country}` : ''} · {card.gender || '?'} · {ageLabel(card.birth_year, card.respondedAt)}
        </div>
        <div style={{ ...zone('summary'), fontFamily: C.font, fontSize: 12, color: C.text,
          lineHeight: 1.55, flex: 1, overflow: 'hidden' }}>
          {pin && pin('summary')}<b style={{ color: grad[0] }}>In short:</b> {card.summary}
        </div>
        {card.themes && card.themes.length > 0 && (
          <div style={{ ...zone('themes'), display: 'flex', flexWrap: 'wrap', gap: 5,
            marginTop: 'auto', paddingTop: 8, alignItems: 'center' }}>
            {pin && pin('themes')}
            {card.themes.slice(0, 4).map((t, i) => (
              <span key={i} style={{ background: `${grad[0]}10`, color: grad[0], border: `1px solid ${grad[0]}2e`,
                padding: '3px 9px', borderRadius: 11, fontFamily: C.font, fontSize: 9.5, fontWeight: 700 }}>{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* deck-identical swipe stamp */}
      {stamp && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }}>
          <div key={stamp.text} style={{ border: `3.5px solid ${stamp.color}`, borderRadius: 14,
            padding: '7px 22px', color: stamp.color, fontFamily: C.font, fontSize: 30, fontWeight: 800,
            letterSpacing: 5, '--rot': `${stamp.rot}deg`, background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(3px)', boxShadow: `0 6px 30px ${stamp.color}40`,
            animation: 'ft-stamp-in 0.4s cubic-bezier(.2,.9,.35,1.3) both' }}>
            {stamp.text}
          </div>
        </div>
      )}
    </div>
  );
}

const ANATOMY_PARTS = [
  { n: 1, zone: 'image', label: 'The illustration',
    body: 'One scene from their day, painted by an image model as a gouache, editorial illustration set in 2050. The scene itself comes straight from what they described.',
    sampleLabel: 'Painted from this scene description',
    sample: card => card.image_prompt ? `“${trunc(card.image_prompt, 130)}”` : null },
  { n: 2, zone: 'title', label: 'The title',
    body: 'A short, punchy headline for the story. The participant never wrote or saw it; it exists so you can tell the futures apart at a glance.',
    sampleLabel: 'On this card',
    sample: card => card.title },
  { n: 3, zone: 'caption', label: 'The inspired caption',
    body: 'One evocative line, like a caption under a photograph. The model writes it in the participant’s voice, but it is not a quote: they never wrote this line. If the title is the poster, this is the whisper.',
    sampleLabel: 'On this card · AI-written',
    sample: card => card.swipe_hook || null },
  { n: 4, zone: 'summary', label: 'The summary',
    body: 'A neutral paragraph condensing the full response to what fits on the back of a card. Every claim in it traces back to something they actually wrote.',
    sampleLabel: 'On this card',
    sample: card => trunc(card.summary, 140) },
  { n: 5, zone: 'themes', label: 'The themes',
    body: 'Hashtags that run through the story. Tap one on a real card and you will see every other person who imagined something similar.',
    sampleLabel: 'On this card',
    sample: card => (card.themes || []).slice(0, 4).join('  ') },
];

const anatomyPinFor = (activePart, setActivePart) => zone => {
  const part = ANATOMY_PARTS.find(p => p.zone === zone);
  if (!part) return null;
  const active = activePart === part.n;
  return (
    <button className="ft-pin" aria-label={part.label}
      onMouseEnter={() => setActivePart(part.n)}
      onMouseLeave={() => setActivePart(a => (a === part.n ? null : a))}
      onClick={() => setActivePart(a => (a === part.n ? null : part.n))}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 20, height: 20, borderRadius: '50%', marginRight: 7, verticalAlign: '-3px',
        border: '1.5px solid #fff', cursor: 'pointer', flexShrink: 0,
        background: active ? C.coral : 'rgba(29,18,7,0.72)', color: '#fff',
        fontFamily: C.font, fontSize: 10.5, fontWeight: 800, lineHeight: 1, padding: 0,
        boxShadow: active ? `0 0 0 4px ${C.coral}35` : '0 2px 6px rgba(0,0,0,0.3)',
        transform: active ? 'scale(1.2)' : 'scale(1)', transition: 'all 0.18s ease',
      }}>{part.n}</button>
  );
};

function CardAnatomy({ card, hasImage, n, onAbout }) {
  const [activePart, setActivePart] = useState(null);
  if (!card) return null;
  const excerpt = trunc(card.story_text, 150);
  const activeZone = ANATOMY_PARTS.find(p => p.n === activePart)?.zone || null;
  const pinFor = anatomyPinFor(activePart, setActivePart);

  return (
    <section style={{ padding: '84px 0 46px', background: C.bgWarm }}>
      {/* mirrors the Chapter 2 intro: live badge → kicker/title/lede → about pill */}
      <Fade>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <LiveBadge n={n} dark={false} label="STORIES" />
        </div>
      </Fade>
      <SectionHead kicker="Chapter 1 · Written stories" accent={C.berry}
        title="A day in the life, 2050"
        lede="No writing required from you: swipe through what university students, most of them in Europe, imagined. First, how each card
          is made. A large language model read each participant's own words and, without inventing anything
          new, drew out the five parts below. Hover or tap a number to see what each one is." />
      <Fade delay={60}>
        <div style={{ textAlign: 'center' }}>
          <button onClick={onAbout}
            style={{ fontFamily: C.font, fontSize: 12.5, fontWeight: 700, color: C.text,
              background: 'transparent', border: '1px solid rgba(61,43,31,0.22)', borderRadius: 999,
              padding: '7px 15px', cursor: 'pointer', marginTop: 16 }}>About the data</button>
        </div>
      </Fade>

      <Fade delay={100}>
        <div style={{ maxWidth: 640, margin: '38px auto 0', padding: '16px 24px', background: C.card,
          borderRadius: 18, boxShadow: '0 6px 24px rgba(61,43,31,0.08)' }}>
          <div style={{ fontFamily: C.font, fontSize: 10.5, fontWeight: 800, letterSpacing: 2,
            color: C.textL, textTransform: 'uppercase', marginBottom: 8 }}>Where it starts: their words</div>
          <div style={{ fontFamily: C.font, fontSize: 14.5, color: C.text, fontStyle: 'italic', lineHeight: 1.65 }}>
            “{excerpt}”
          </div>
          <div style={{ fontFamily: C.font, fontSize: 11.5, color: C.textL, marginTop: 8 }}>
            Written freely, up to 3000 characters. Tap any real card later to read it in full.
          </div>
        </div>
      </Fade>

      <div style={{ textAlign: 'center', fontFamily: C.font, fontSize: 12.5, fontWeight: 700,
        color: C.textL, margin: '16px 0' }}>↓ becomes, with no new facts invented ↓</div>

      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '0 22px', display: 'flex',
        gap: 38, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Fade delay={140} style={{ flex: '0 1 340px' }}>
          <CardFace card={card} hasImage={hasImage} width={330} highlight={activeZone} pin={pinFor} />
        </Fade>
        <div style={{ flex: '1 1 380px', maxWidth: 470, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ANATOMY_PARTS.map((p, i) => {
            const active = activePart === p.n;
            const sample = p.sample(card);
            return (
              <Fade key={p.n} delay={200 + i * 110}>
                <div onMouseEnter={() => setActivePart(p.n)}
                  onMouseLeave={() => setActivePart(a => (a === p.n ? null : a))}
                  onClick={() => setActivePart(a => (a === p.n ? null : p.n))}
                  style={{ display: 'flex', gap: 12, padding: '12px 15px', borderRadius: 14, cursor: 'pointer',
                    background: active ? C.coralSoft : C.card,
                    border: `1.5px solid ${active ? C.coral : 'rgba(61,43,31,0.06)'}`,
                    boxShadow: active ? `0 8px 26px ${C.coral}22` : '0 2px 10px rgba(61,43,31,0.05)',
                    transform: active ? 'translateX(4px)' : 'none', transition: 'all 0.22s ease' }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: active ? C.coral : 'rgba(61,43,31,0.10)', color: active ? '#fff' : C.textM,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: C.font, fontSize: 12, fontWeight: 800, transition: 'all 0.18s ease' }}>{p.n}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: C.font, fontSize: 13.5, fontWeight: 800, color: C.text }}>{p.label}</div>
                    <div style={{ fontFamily: C.font, fontSize: 12.5, color: C.textM, lineHeight: 1.55, marginTop: 2 }}>{p.body}</div>
                    {/* the real value from the example card, unfolds when active */}
                    {sample && (
                      <div style={{ display: 'grid', gridTemplateRows: active ? '1fr' : '0fr',
                        transition: 'grid-template-rows 0.35s cubic-bezier(.2,.8,.2,1)' }}>
                        <div style={{ overflow: 'hidden', minHeight: 0 }}>
                          <div style={{ marginTop: 9, paddingTop: 8, borderTop: `1px dashed ${C.coral}55` }}>
                            <div style={{ fontFamily: C.font, fontSize: 9.5, fontWeight: 800, letterSpacing: 1.6,
                              textTransform: 'uppercase', color: C.coral, marginBottom: 3 }}>{p.sampleLabel}</div>
                            <div style={{ fontFamily: C.font, fontSize: 12, color: C.berry, fontStyle: 'italic',
                              lineHeight: 1.55 }}>{sample}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Fade>
            );
          })}
        </div>
      </div>

      {/* the sixth, invisible layer: the emotional fingerprint */}
      <Fade delay={200}>
        <div style={{ maxWidth: 640, margin: '34px auto 0', padding: '16px 24px', background: C.card,
          borderRadius: 18, boxShadow: '0 6px 24px rgba(61,43,31,0.08)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 1,
              background: 'rgba(61,43,31,0.10)', color: C.textM, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontFamily: C.font, fontSize: 12, fontWeight: 800 }}>+</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: C.font, fontSize: 13.5, fontWeight: 800, color: C.text }}>
                And one part you can't see: the emotional fingerprint
              </div>
              <div style={{ fontFamily: C.font, fontSize: 12.5, color: C.textM, lineHeight: 1.6, marginTop: 3 }}>
                Every response is also read by the NRC Emotion Lexicon, which tags its words with eight
                basic emotions. Open any card to see its profile, and at the end of the page each dot in the
                grid takes the colour of its story's strongest emotion.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {EMO_KEYS.map(k => (
                  <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontFamily: C.font, fontSize: 11, fontWeight: 700, color: C.text,
                    background: 'rgba(61,43,31,0.04)', border: '1px solid rgba(61,43,31,0.08)',
                    borderRadius: 999, padding: '4px 10px' }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: EMOTION_META[k].color, border: `1px solid ${EMO_STROKE}` }} />
                    {EMOTION_META[k].label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Fade>
    </section>
  );
}

function renderActionBar(visible, enabled, onAdvance, curate = false) {
  const buttons = curate
    ? [
        { dir: 'left', icon: '✕', color: C.nope, size: 56, label: 'Hide', fs: 22 },
        { dir: 'up', icon: '⭐', color: C.superlike, size: 46, label: 'Keep', fs: 17 },
        { dir: 'right', icon: '♥', color: C.like, size: 56, label: 'New image', fs: 22 },
      ]
    : [
        { dir: 'left', icon: '✕', color: C.nope, size: 56, label: 'Pass', fs: 22 },
        { dir: 'up', icon: '⭐', color: C.superlike, size: 46, label: 'Super', fs: 17 },
        { dir: 'right', icon: '♥', color: C.like, size: 56, label: 'Like', fs: 22 },
      ];
  return (
    <div style={{
      display: 'flex', gap: 30, padding: '16px 0 12px', alignItems: 'flex-start', justifyContent: 'center',
      opacity: visible ? 1 : 0, pointerEvents: visible && enabled ? 'auto' : 'none',
      transition: 'opacity 0.3s',
    }}>
      {buttons.map(b => (
        <div key={b.dir} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          {/* filled, larger buttons so the gestures read at a glance */}
          <button className="ft-action" onClick={() => onAdvance(b.dir)} aria-label={b.label} style={{
            width: b.size + 10, height: b.size + 10, borderRadius: '50%',
            border: 'none', background: b.color, color: '#fff',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: b.fs + 4,
            boxShadow: `0 8px 22px ${b.color}66, 0 2px 6px rgba(61,43,31,0.12)`,
            marginTop: b.dir === 'up' ? 4 : 0,
          }}>{b.icon}</button>
          <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', color: b.color }}>
            {b.label}
          </span>
        </div>
      ))}
    </div>
  );
}

const SWIPE_MOVES = [
  { key: 'pass', cls: 'ft-sw-left', dir: 'left', icon: '✕', color: C.nope,
    kicker: 'Swipe left', arrow: '←', title: 'Pass',
    text: 'No hard feelings. The story drops lower in the deck and the next one takes its place.' },
  { key: 'super', cls: 'ft-sw-up', dir: 'up', icon: '⭐', color: C.superlike,
    kicker: 'Swipe up', arrow: '↑', title: 'Super-like it',
    text: 'Three points at once. Save it for the futures you most believe in, whether they feel hopeful or unsettling.' },
  { key: 'like', cls: 'ft-sw-right', dir: 'right', icon: '♥', color: C.like,
    kicker: 'Swipe right', arrow: '→', title: 'Like it',
    text: 'A like gives the story one point. Stories with more points rise up the deck and reach more visitors.' },
  { key: 'open', cls: 'ft-sw-tap', dir: null, icon: '👆', color: C.coral,
    kicker: 'Tap the card', arrow: '', title: 'Open it to read',
    text: 'Opens the full story in the person’s own words, with its emotional profile. You can swipe from there too.' },
];
// how the still card leans while a balloon is hovered (preview only)
const PREVIEW_POSE = {
  left: 'translateX(-26px) rotate(-6deg)',
  right: 'translateX(26px) rotate(6deg)',
  up: 'translateY(-22px) scale(1.02)',
};

function SwipeGuide({ card, hasImage, onGoToDeck }) {
  const [hovered, setHovered] = useState(null);
  const move = SWIPE_MOVES.find(m => m.key === hovered) || null;

  return (
    <section style={{ padding: '10px 0 88px', background: C.bgWarm }}>
      <Fade>
        <div style={{ maxWidth: 720, margin: '0 auto 34px', padding: '0 22px', textAlign: 'center' }}>
          <div style={{ fontFamily: C.font, fontSize: 10.5, fontWeight: 800, letterSpacing: 2.2,
            textTransform: 'uppercase', color: C.coral, marginBottom: 9 }}>
            And this is how you answer it
          </div>
          <h3 style={{ fontFamily: C.fontTitle, fontSize: 'clamp(23px, 3vw, 31px)', fontWeight: 700,
            color: C.ink, margin: '0 0 10px', lineHeight: 1.25 }}>
            Four ways to react to a card
          </h3>
          <div style={{ fontFamily: C.font, fontSize: 14.5, color: C.textM, lineHeight: 1.68 }}>
            Every card takes one of the gestures below, by mouse, keyboard arrows or the buttons under the
            deck. Nothing on this page is scored yet: the still card here is only the example. Hover a
            gesture to see what it does to it.
          </div>
        </div>
      </Fade>

      <div className="ft-swipe-grid">
        {SWIPE_MOVES.map((m, i) => {
          const on = hovered === m.key;
          return (
            <div key={m.key} className={m.cls}>
              <Fade delay={90 + i * 90}>
              <div
                onMouseEnter={() => setHovered(m.key)}
                onMouseLeave={() => setHovered(h => (h === m.key ? null : h))}
                style={{ maxWidth: 290, background: C.card, borderRadius: 16, padding: '14px 17px',
                  border: `1.5px solid ${on ? m.color : 'rgba(61,43,31,0.07)'}`,
                  boxShadow: on ? `0 12px 32px ${m.color}30` : '0 3px 14px rgba(61,43,31,0.06)',
                  transform: on ? 'translateY(-3px)' : 'none', transition: 'all 0.24s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5 }}>
                  <span style={{ width: 27, height: 27, borderRadius: '50%', flexShrink: 0,
                    background: on ? m.color : `${m.color}18`, color: on ? '#fff' : m.color,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, transition: 'all 0.2s ease' }}>{m.icon}</span>
                  <span style={{ fontFamily: C.font, fontSize: 10.5, fontWeight: 800, letterSpacing: 1.8,
                    textTransform: 'uppercase', color: m.color }}>
                    {m.kicker} {m.arrow && <span style={{ fontSize: 13 }}>{m.arrow}</span>}
                  </span>
                </div>
                <div style={{ fontFamily: C.fontTitle, fontSize: 16.5, fontWeight: 700, color: C.ink,
                  lineHeight: 1.3 }}>{m.title}</div>
                <div style={{ fontFamily: C.font, fontSize: 12.5, color: C.textM, lineHeight: 1.6,
                  marginTop: 4 }}>{m.text}</div>
              </div>
              </Fade>
            </div>
          );
        })}

        {/* the still example card, held in one place */}
        <div className="ft-sw-card" style={{ position: 'relative' }}>
          <div style={{ position: 'relative', width: 268, maxWidth: '76vw', margin: '0 auto',
            pointerEvents: 'none', userSelect: 'none',
            transform: move && PREVIEW_POSE[move.dir] ? PREVIEW_POSE[move.dir] : 'none',
            transition: 'transform 0.4s cubic-bezier(.22,.9,.3,1)' }}>
            {card && (
              <CardFace card={card} hasImage={hasImage} width={268}
                stamp={move && move.dir ? STAMP_BY_DIR[move.dir] : null} />
            )}
          </div>
          <div style={{ textAlign: 'center', marginTop: 12, fontFamily: C.font, fontSize: 10.5,
            fontWeight: 800, letterSpacing: 1.8, textTransform: 'uppercase', color: C.textL }}>
            Example card · not live
          </div>
        </div>
      </div>

      <Fade delay={140}>
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <button onClick={onGoToDeck} className="ft-cta"
            style={{ fontFamily: C.font, fontSize: 14.5, fontWeight: 800, color: '#fff',
              background: `linear-gradient(120deg, ${C.coral}, #E06A3C)`, border: 'none',
              borderRadius: 999, padding: '14px 34px', cursor: 'pointer',
              boxShadow: '0 12px 30px rgba(200,75,49,0.32)' }}>
            Start swiping the real deck ↓
          </button>
        </div>
      </Fade>
    </section>
  );
}

function MobileAnatomySheet({ card, hasImage, onClose }) {
  const [activePart, setActivePart] = useState(null);
  const activeZone = ANATOMY_PARTS.find(p => p.n === activePart)?.zone || null;
  return (
    <div role="dialog" aria-modal="true" aria-label="How is a card made?"
      style={{ position: 'fixed', inset: 0, zIndex: 310, background: 'rgba(24,14,6,0.6)',
        display: 'flex', alignItems: 'flex-end', animation: 'ftFadeIn 0.2s ease' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxHeight: '92%', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          background: C.bgWarm, borderRadius: '22px 22px 0 0', textAlign: 'left',
          padding: '12px 16px calc(env(safe-area-inset-bottom) + 20px)' }}>
        <div style={{ position: 'sticky', top: -12, zIndex: 2, background: C.bgWarm, margin: '-12px -16px 0',
          padding: '12px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: C.fontTitle, fontSize: 19, fontWeight: 700, color: C.text }}>How is a card made?</span>
          <button onClick={onClose} aria-label="Close"
            style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid rgba(61,43,31,0.15)',
              background: '#fff', color: C.textM, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ fontFamily: C.font, fontSize: 12.5, color: C.textM, lineHeight: 1.6, marginBottom: 14 }}>
          A language model read each participant's story and wrote the five parts below. The full story,
          which opens when you tap a card, is the participant's own. Tap a number to see each part.
        </div>
        {card && (
          <div style={{ maxWidth: 230, margin: '0 auto 16px' }}>
            <CardFace card={card} hasImage={hasImage} width={230} highlight={activeZone}
              pin={anatomyPinFor(activePart, setActivePart)} />
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ANATOMY_PARTS.map(p => {
            const active = activePart === p.n;
            const sample = card ? p.sample(card) : null;
            return (
              <div key={p.n} onClick={() => setActivePart(a => (a === p.n ? null : p.n))}
                style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                  background: active ? C.coralSoft : C.card,
                  border: `1.5px solid ${active ? C.coral : 'rgba(61,43,31,0.06)'}` }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: active ? C.coral : 'rgba(61,43,31,0.10)', color: active ? '#fff' : C.textM,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: C.font, fontSize: 11, fontWeight: 800 }}>{p.n}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: C.font, fontSize: 13, fontWeight: 800, color: C.text }}>{p.label}</div>
                  <div style={{ fontFamily: C.font, fontSize: 12, color: C.textM, lineHeight: 1.5, marginTop: 2 }}>{p.body}</div>
                  {active && sample && (
                    <div style={{ marginTop: 7, paddingTop: 6, borderTop: `1px dashed ${C.coral}55` }}>
                      <div style={{ fontFamily: C.font, fontSize: 9.5, fontWeight: 800, letterSpacing: 1.4,
                        textTransform: 'uppercase', color: C.coral, marginBottom: 2 }}>{p.sampleLabel}</div>
                      <div style={{ fontFamily: C.font, fontSize: 11.5, color: C.berry, fontStyle: 'italic',
                        lineHeight: 1.5, overflowWrap: 'anywhere' }}>{sample}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MobileAppIntro({ n, onClose, card, hasImage }) {
  const [anatomyOpen, setAnatomyOpen] = useState(false);
  const G = [
    { icon: '✕', color: C.nope, label: 'Pass', hint: 'swipe left' },
    { icon: '⭐', color: C.superlike, label: 'Super', hint: 'swipe up' },
    { icon: '♥', color: C.like, label: 'Like', hint: 'swipe right' },
  ];
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(24,14,6,0.97)',
      overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '40px 28px calc(env(safe-area-inset-bottom) + 40px)', textAlign: 'center',
      animation: 'ftFadeIn 0.25s ease' }}>
      {/* auto margins centre the content, yet let it scroll on short screens */}
      <div style={{ margin: 'auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/logo192.png" alt="" style={{ width: 44, height: 'auto' }} />
        <span style={{ fontFamily: C.fontTitle, fontSize: 34, fontWeight: 800, color: C.coral }}>futures</span>
      </div>
      <div style={{ fontFamily: C.font, fontSize: 14, color: CREAM_DIM, marginTop: 14, maxWidth: 300, lineHeight: 1.65 }}>
        {n} days in 2050, imagined by university students, most of them in Europe. One card each.
      </div>
      <div style={{ display: 'flex', gap: 26, marginTop: 30 }}>
        {G.map(g => (
          <div key={g.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 52, height: 52, borderRadius: '50%', border: `2px solid ${g.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: g.color,
              background: 'rgba(255,255,255,0.06)' }}>{g.icon}</span>
            <span style={{ fontFamily: C.font, fontSize: 11.5, fontWeight: 800, color: CREAM }}>{g.label}</span>
            <span style={{ fontFamily: C.font, fontSize: 10, color: CREAM_DIM }}>{g.hint}</span>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: C.font, fontSize: 12.5, color: CREAM_DIM, marginTop: 26, maxWidth: 300, lineHeight: 1.65 }}>
        Tap any card to read the whole story. ⭐ is for the futures you most believe in, hopeful or not.
      </div>
      <div style={{ fontFamily: C.font, fontSize: 12, color: CREAM_DIM, marginTop: 16, maxWidth: 300, lineHeight: 1.6 }}>
        On each card, the illustration, title, caption, summary and themes were written by an AI model
        from the participant's story. The full story you open by tapping is not generated: it is theirs.
      </div>
      <button onClick={() => setAnatomyOpen(true)}
        style={{ marginTop: 12, fontFamily: C.font, fontSize: 12.5, fontWeight: 700, color: CREAM,
          background: 'transparent', border: '1px solid rgba(255,246,234,0.32)', borderRadius: 999,
          padding: '8px 16px', cursor: 'pointer' }}>
        How is a card made?
      </button>
      <div style={{ fontFamily: C.font, fontSize: 11.5, color: 'rgba(255,238,214,0.45)', marginTop: 18,
        maxWidth: 300, lineHeight: 1.6, borderTop: '1px solid rgba(255,246,234,0.14)', paddingTop: 16 }}>
        On your phone, this is the whole app. For a second live survey and the data insights,
        open this page on a computer.
      </div>
      <button onClick={onClose} style={{ marginTop: 26, fontFamily: C.font, fontSize: 15, fontWeight: 800,
        color: '#fff', background: `linear-gradient(120deg, ${C.coral}, #E06A3C)`, border: 'none',
        borderRadius: 999, padding: '15px 40px', cursor: 'pointer',
        boxShadow: '0 12px 34px rgba(200,75,49,0.45)' }}>
        Start swiping
      </button>
      {/* EU funding — required for visibility even on the phone app */}
      <div style={{ marginTop: 26, background: '#fff', borderRadius: 8, padding: '7px 11px' }}>
        <OfficialEUBadge height={24} />
      </div>
      </div>
      {anatomyOpen && <MobileAnatomySheet card={card} hasImage={hasImage} onClose={() => setAnatomyOpen(false)} />}
    </div>
  );
}

const FUTURES_CHAPTERS = [
  { id: 'ft-anatomy',   label: 'How a card is made',        short: 'How a card is made' },
  { id: 'ft-deck',      label: 'Swipe the stories',         short: 'Swipe the stories' },
  { id: 'ft-insights',  label: 'The people behind them',    short: 'The people' },
  { id: 'futures-game', label: 'The futures survey',        short: 'Futures survey' },
  { id: 'ft-countries', label: 'Where they answered from',  short: 'Where they answered' },
];

function PhoneAppBanner() {
  const [open, setOpen] = useState(() => {
    try { return sessionStorage.getItem('ft-desktop-hint-seen') !== '1'; } catch (_) { return true; }
  });
  if (!open) return null;
  const close = () => {
    setOpen(false);
    try { sessionStorage.setItem('ft-desktop-hint-seen', '1'); } catch (_) { /* ignore */ }
  };
  return (
    <div style={{ width: '100%', maxWidth: 430, margin: '14px auto 0', padding: '0 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: C.card,
        border: '1.5px solid rgba(61,43,31,0.08)', borderRadius: 14, padding: '10px 13px',
        boxShadow: '0 4px 14px rgba(61,43,31,0.06)' }}>
        <span style={{ fontSize: 17, flexShrink: 0 }}>📱</span>
        <span style={{ flex: 1, fontFamily: C.font, fontSize: 12, color: C.textM, lineHeight: 1.55 }}>
          Prefer this as an app? Open this page on your phone: there it's focused on just this experience.
        </span>
        <button onClick={close} aria-label="Dismiss"
          style={{ background: 'none', border: 'none', color: C.textL, fontSize: 14,
            cursor: 'pointer', padding: '0 2px', flexShrink: 0 }}>✕</button>
      </div>
    </div>
  );
}

// Phases tracked for the evaluation dwell time, in reading order (see usePhaseDwell).
// Module-level so the array identity is stable across renders.
const FUTURES_PHASES = ['ft-anatomy', 'ft-deck', 'ft-insights', 'futures-game', 'ft-countries'];

export default function FoodTinder() {
  const isMobile = useIsMobile(700);
  const [stories, setStories] = useState([]);
  const [writtenCount, setWrittenCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [idx, setIdx] = useState(0);
  const [selectedStory, setSelectedStory] = useState(null);
  const [tagFilter, setTagFilter] = useState(null);
  const [themeQueue, setThemeQueue] = useState(null); // { tag, i } — swipeable run through one theme's stories
  const [drag, setDrag] = useState({ x: 0, y: 0, on: false, sx: 0, sy: 0 });
  const [exit, setExit] = useState(null);
  const [featuredIndices, setFeaturedIndices] = useState(new Set());
  const [scores, setScores] = useState({});
  const [likesEnabled, setLikesEnabled] = useState(false);
  const [sentiment, setSentiment] = useState(null);
  const [futuresRecords, setFuturesRecords] = useState([]); // for the two-survey country comparison
  const [visionsRecords, setVisionsRecords] = useState([]); // responses (not cards): who answered, and when
  const [about, setAbout] = useState(false);
  const curateMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('curate') === '1';
  // On phones the page becomes a full-screen, Tinder-like app.
  const appMode = isMobile && !curateMode;
  const [introOpen, setIntroOpen] = useState(() => {
    try { return sessionStorage.getItem('ft-app-intro-seen') !== '1'; } catch (_) { return true; }
  });
  const closeIntro = () => {
    setIntroOpen(false);
    try { sessionStorage.setItem('ft-app-intro-seen', '1'); } catch (_) { /* ignore */ }
  };
  useEffect(() => {
    if (!appMode) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [appMode]);

  // Reading telemetry — active only with ?eval=1 (evaluation sessions).
  useEffect(() => initEvalTelemetry('futures'), []);
  usePhaseDwell(FUTURES_PHASES);
  const [curateToken, setCurateToken] = useState(() =>
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('ft_curate_token') || '' : ''));
  const [tokenInput, setTokenInput] = useState('');
  const [curation, setCuration] = useState({}); // storyIndex -> verdict
  const [curationErr, setCurationErr] = useState('');

  const didDrag = useRef(false);
  const activeChipRef = useRef(null);

  const cur = stories[idx] || null;
  const nxt = stories[idx + 1] || null;

  useEffect(() => {
    const prev = document.title;
    document.title = 'RELISH Futures';
    return () => { document.title = prev; };
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/data/story_cards.json').then(r => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      }),
      fetch('/api/tinder/config').then(r => r.ok ? r.json() : { likesEnabled: false }).catch(() => ({ likesEnabled: false })),
      fetch('/api/tinder/scores').then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch('/api/survey/filtered?surveyType=visions').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/data/sentiment.json').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/survey/filtered?surveyType=futures').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/images/story_cards_web/manifest.json').then(r => r.ok ? r.json() : null).catch(() => null),
    ])
      .then(([rawCards, config, serverScores, visionsRecords, sentimentData, futuresData, imgManifest]) => {
        if (!Array.isArray(rawCards) || !rawCards.length) throw new Error('no cards');
        setFuturesRecords(Array.isArray(futuresData) ? futuresData : []);
        const answeredAt = new Map((Array.isArray(visionsRecords) ? visionsRecords : []).map(r => [r.Index, r.createdAt]));
        setVisionsRecords(Array.isArray(visionsRecords) ? visionsRecords : []);
        const cards = rawCards.map(dedashCard)
          .map(c => ({ ...c, respondedAt: answeredAt.get(c.story_index) || null }))
          .map(bandCard)
          // curation sees every card, so hidden ones can be judged again
          .filter(c => curateMode || (c.hidden !== true && c.relevant !== false));
        setSentiment(sentimentData);
        setWrittenCount(Array.isArray(visionsRecords) && visionsRecords.length ? visionsRecords.length : cards.length);
        const withImages = imgManifest && Array.isArray(imgManifest.indices)
          ? new Set(imgManifest.indices)
          : new Set(cards.map(c => c.story_index));
        setFeaturedIndices(withImages);
        setScores(serverScores || {});
        setLikesEnabled(!!config.likesEnabled);
        setStories(curateMode
          ? [...cards].sort((a, b) => a.story_index - b.story_index)
          : weightedShuffle(cards, serverScores || {}, withImages));
        setLoading(false);
      })
      .catch(err => {
        console.error('story_cards.json failed:', err);
        setLoadError(true);
        setLoading(false);
      });
  }, []); // eslint-disable-line

  // verdicts already recorded (needs the token)
  useEffect(() => {
    if (!curateMode || !curateToken) return;
    fetch('/api/tinder/curation', { headers: { Authorization: `Bearer ${curateToken}` } })
      .then(r => {
        if (r.status === 401) { setCurationErr('Token rejected.'); setCurateToken(''); sessionStorage.removeItem('ft_curate_token'); return {}; }
        return r.ok ? r.json() : {};
      })
      .then(m => { setCuration(m || {}); setCurationErr(''); })
      .catch(() => {});
  }, [curateMode, curateToken]);

  // tag → stories carrying it, most common first
  const tagIndex = useMemo(() => {
    const m = new Map();
    stories.forEach(s => (s.themes || []).forEach(t => {
      const k = String(t).toLowerCase();
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(s);
    }));
    return new Map([...m.entries()].sort((a, b) => b[1].length - a[1].length));
  }, [stories]);

  const allTags = useMemo(() => [...tagIndex.entries()], [tagIndex]);

  // story_index -> per-document sentiment result
  const sentIndex = useMemo(() => {
    const m = new Map();
    (sentiment?.per_doc || []).forEach(d => m.set(d.i, d));
    return m;
  }, [sentiment]);

  // everything the insight sections need, computed once per data load
  const ins = useMemo(() => {
    if (!stories.length) return null;

    const byCountry = {};
    stories.forEach(s => { const c = s.residence_country; if (c) (byCountry[c] = byCountry[c] || []).push(s); });
    const countryRows = Object.entries(byCountry)
      .filter(([, rs]) => rs.length >= 3)
      .map(([c, rs]) => ({ country: c, n: rs.length }))
      .sort((a, b) => b.n - a.n);

    const medianAge = median(stories.map(s => ageOf(s.birth_year, s.respondedAt)));

    // theme chips coloured by the mean VADER polarity of the stories carrying them
    const themeRows = allTags.slice(0, 18).map(([tag, list]) => {
      const comps = list.map(s => sentIndex.get(s.story_index)?.compound).filter(v => typeof v === 'number');
      const meanC = comps.length ? comps.reduce((a, b) => a + b, 0) / comps.length : null;
      const color = meanC == null ? POLARITY_META.neutral.color
        : meanC >= 0.05 ? POLARITY_META.positive.color
        : meanC <= -0.05 ? POLARITY_META.negative.color
        : POLARITY_META.neutral.color;
      return { tag, n: list.length, color };
    });

    const totalScore = Object.values(scores).reduce((a, s) => ({
      likes: a.likes + (s.likes || 0), superlikes: a.superlikes + (s.superlikes || 0),
    }), { likes: 0, superlikes: 0 });
    const topLoved = Object.entries(scores)
      .map(([idx2, s]) => ({ idx: Number(idx2), ...s }))
      .filter(s => (s.points || 0) > 0)
      .sort((a, b) => b.points - a.points)[0];
    const topLovedStory = topLoved ? stories.find(s => s.story_index === topLoved.idx) : null;

    return {
      n: stories.length, countryRows, medianAge, themeRows,
      countries: new Set(stories.map(s => s.residence_country).filter(Boolean)).size,
      engagement: (totalScore.likes + totalScore.superlikes) > 0 ? { ...totalScore, topLoved, topLovedStory } : null,
    };
  }, [stories, allTags, scores, sentIndex]);

  const anatomyCard = useMemo(() => stories.find(s => s.story_index === 1) || stories[0] || null, [stories]);

  // when a theme run is open, swipes act on its queue instead of the main deck
  const themeList = themeQueue ? (tagIndex.get(themeQueue.tag) || []) : null;
  const tCur = themeList ? themeList[themeQueue.i] || null : null;
  const tNxt = themeList ? themeList[themeQueue.i + 1] || null : null;
  const activeCard = themeQueue ? tCur : cur;

  const sendSwipe = useCallback((story, action) => {
    if (!likesEnabled || !story || !action) return;
    setScores(prev => {
      const s = prev[story.story_index] || { likes: 0, superlikes: 0, nopes: 0, points: 0 };
      return {
        ...prev,
        [story.story_index]: {
          ...s,
          [`${action}s`]: (s[`${action}s`] || 0) + 1,
          points: (s.points || 0) + ACTION_POINTS[action],
        },
      };
    });
    fetch('/api/tinder/swipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyIndex: story.story_index, action }),
      keepalive: true,
    }).catch(() => {});
  }, [likesEnabled]);

  const sendCuration = useCallback((story, verdict) => {
    if (!story || !verdict) return;
    setCuration(prev => ({ ...prev, [story.story_index]: verdict }));
    fetch('/api/tinder/curate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${curateToken}` },
      body: JSON.stringify({ storyIndex: story.story_index, verdict }),
      keepalive: true,
    }).then(r => { if (r.status === 401) setCurationErr('Token rejected, enter it again.'); })
      .catch(() => setCurationErr('Could not save the verdict (offline?).'));
  }, [curateToken]);

  const advance = useCallback((dir) => {
    evalog('eval_interaction', { t: 'swipe', dir, story: activeCard?.story_index });
    if (!activeCard || exit) return;
    if (curateMode) sendCuration(activeCard, VERDICT_BY_DIR[dir]);
    else sendSwipe(activeCard, ACTION_BY_DIR[dir]);
    const exitX = dir === 'left' ? -window.innerWidth * 1.1 : dir === 'right' ? window.innerWidth * 1.1 : 0;
    const exitY = dir === 'up' ? -window.innerHeight * 1.05 : (drag.y || 0) * 1.4;
    setExit({ dir, x: exitX, y: exitY });
    setTimeout(() => {
      setExit(null);
      setDrag({ x: 0, y: 0, on: false, sx: 0, sy: 0 });
      if (themeQueue) {
        // walk the open theme; past the last story, fall back to the theme grid
        setThemeQueue(q => {
          if (!q) return q;
          const list = tagIndex.get(q.tag) || [];
          return q.i + 1 >= list.length ? null : { ...q, i: q.i + 1 };
        });
      } else {
        setIdx(i => i + 1);
      }
    }, 420);
  }, [activeCard, exit, drag.y, sendSwipe, sendCuration, curateMode, themeQueue, tagIndex]);

  const restart = useCallback(() => {
    setStories(s => weightedShuffle(s, scores, featuredIndices));
    setIdx(0);
  }, [scores, featuredIndices]);

  const pDown = useCallback((e) => {
    if (selectedStory || exit) return;
    const t = e.touches ? e.touches[0] : e;
    didDrag.current = false;
    setDrag({ x: 0, y: 0, on: true, sx: t.clientX, sy: t.clientY });
  }, [selectedStory, exit]);

  const pMove = useCallback((e) => {
    if (!drag.on) return;
    const t = e.touches ? e.touches[0] : e;
    const dx = t.clientX - drag.sx;
    const dy = t.clientY - drag.sy;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) didDrag.current = true;
    setDrag(p => ({ ...p, x: dx, y: dy }));
  }, [drag.on, drag.sx, drag.sy]);

  const pUp = useCallback(() => {
    if (!drag.on) return;
    const T = 100;
    if (drag.y < -T && Math.abs(drag.x) < T) advance('up');
    else if (drag.x < -T) advance('left');
    else if (drag.x > T) advance('right');
    else setDrag({ x: 0, y: 0, on: false, sx: 0, sy: 0 });
  }, [drag, advance]);

  const handleCardTap = useCallback(() => {
    if (!didDrag.current && !exit && activeCard) {
      evalog('eval_interaction', { t: 'card_open', story: activeCard.story_index });
      setSelectedStory(activeCard);
    }
  }, [exit, activeCard]);

  const openTag = useCallback((tag) => {
    setSelectedStory(null);
    setThemeQueue(null);
    setTagFilter(String(tag).toLowerCase());
  }, []);

  const scrollTo = id => {
    const el = document.getElementById(id);
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // keyboard: ← pass · ↑ super · → like · enter opens · esc closes
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (selectedStory) setSelectedStory(null);
        else if (themeQueue) setThemeQueue(null);
        else if (tagFilter) setTagFilter(null);
        return;
      }
      if (selectedStory || exit || !activeCard || (tagFilter && !themeQueue)) return;
      if (e.key === 'ArrowLeft') advance('left');
      else if (e.key === 'ArrowRight') advance('right');
      else if (e.key === 'ArrowUp') { e.preventDefault(); advance('up'); }
      else if (e.key === 'Enter') setSelectedStory(activeCard);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedStory, tagFilter, themeQueue, exit, activeCard, advance]);

  // keep the active tag chip visible in the switcher
  useEffect(() => {
    if (tagFilter && activeChipRef.current) {
      activeChipRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [tagFilter]);

  // in curation the stamp shows the verdict
  const STAMPS = curateMode
    ? { up: { text: 'KEEP', color: '#1E88E5', rot: 0 },
        right: { text: 'NEW IMG', color: '#43A047', rot: 8 },
        left: { text: 'HIDE', color: '#E53935', rot: -10 } }
    : STAMP_BY_DIR;
  const swipeLabel = () => {
    if (exit) return { ...STAMPS[exit.dir], opacity: 1 };
    if (!drag.on && !drag.x && !drag.y) return null;
    const T = 40;
    const opacity = Math.min(1, Math.max(Math.abs(drag.x), Math.abs(drag.y)) / 110);
    if (drag.y < -T && Math.abs(drag.x) < Math.abs(drag.y)) return { ...STAMPS.up, opacity };
    if (drag.x < -T) return { ...STAMPS.left, opacity };
    if (drag.x > T) return { ...STAMPS.right, opacity };
    return null;
  };

  const cardStyle = (isTop) => {
    if (!isTop) {
      const pull = exit ? 1 : Math.min(1, (Math.abs(drag.x) + Math.abs(drag.y)) / 260);
      const s = 0.94 + 0.06 * pull;
      const ty = 18 - 18 * pull;
      return { transform: `scale(${s}) translateY(${ty}px)`, transition: exit ? 'transform 0.42s cubic-bezier(0.22, 1, 0.36, 1)' : (drag.on ? 'none' : 'transform 0.3s ease'), zIndex: 1 };
    }
    if (exit) return {
      transform: `translate(${exit.x}px, ${exit.y}px) rotate(${exit.dir === 'up' ? 0 : exit.x * 0.045}deg)`,
      transition: 'transform 0.42s cubic-bezier(0.3, 0.7, 0.4, 1), opacity 0.42s ease',
      opacity: 0, zIndex: 2,
    };
    if (drag.on || drag.x || drag.y) return { transform: `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x * 0.06}deg)`, transition: 'none', zIndex: 2 };
    return { transform: 'translate(0,0) rotate(0)', transition: 'transform 0.34s cubic-bezier(0.22, 1, 0.36, 1)', zIndex: 2 };
  };

  const scoreOf = (story) => scores[story?.story_index] || null;

  const renderCard = (story, top) => {
    const grad = toneGradient(story.emotional_tone);
    const hasImage = featuredIndices.has(story.story_index);
    const cs = cardStyle(top);
    const label = top ? swipeLabel() : null;

    return (
      <div key={story.story_index} style={{
        position: 'absolute', inset: 0, borderRadius: 26, overflow: 'hidden',
        background: C.card,
        boxShadow: top
          ? '0 24px 64px rgba(61,43,31,0.20), 0 6px 18px rgba(61,43,31,0.10)'
          : '0 10px 30px rgba(61,43,31,0.10)',
        ...cs, userSelect: 'none', touchAction: 'none', cursor: top ? (drag.on ? 'grabbing' : 'grab') : 'default',
        display: 'flex', flexDirection: 'column',
        willChange: 'transform',
      }}
        onMouseDown={top ? pDown : undefined} onMouseMove={top ? pMove : undefined}
        onMouseUp={top ? pUp : undefined} onMouseLeave={top && drag.on ? pUp : undefined}
        onTouchStart={top ? pDown : undefined} onTouchMove={top ? pMove : undefined}
        onTouchEnd={top ? pUp : undefined}
        onClick={top ? handleCardTap : undefined}
      >
        {label && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10, pointerEvents: 'none',
          }}>
            <div style={{
              border: `3.5px solid ${label.color}`, borderRadius: 14, padding: '8px 26px',
              color: label.color, fontFamily: C.font, fontSize: 34, fontWeight: 800,
              letterSpacing: 5, opacity: label.opacity,
              transform: `rotate(${label.rot}deg) scale(${0.92 + 0.08 * label.opacity})`,
              background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(3px)',
              boxShadow: `0 6px 30px ${label.color}40`,
            }}>
              {label.text}
            </div>
          </div>
        )}

        <div style={{
          flex: '0 0 55%', position: 'relative', overflow: 'hidden',
          background: CARD_ART_BG,
        }}>
          {hasImage ? (
            <img
              src={cardArtSrc(story.story_index)}
              data-idx={story.story_index}
              onError={onCardArtError}
              alt=""
              draggable={false}
              decoding="async"
              onLoad={e => { e.currentTarget.style.opacity = 1; }}
              style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', opacity: 0, transition: 'opacity 0.4s ease' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.18) 0%, transparent 45%), radial-gradient(circle at 80% 70%, rgba(0,0,0,0.10) 0%, transparent 50%)',
            }}>
              <img src="/logo192.png" alt="" style={{ width: 64, opacity: 0.3, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.2))' }} />
            </div>
          )}

          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '62%',
            background: 'linear-gradient(transparent, rgba(20,10,5,0.72))',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'absolute', top: 13, left: 15, right: 15, display: 'flex',
            justifyContent: 'space-between', gap: 6 }}>
            <LoveBadge score={scoreOf(story)} light />
            {curateMode && curation[story.story_index] && (
              <span style={{ fontFamily: C.font, fontSize: 11, fontWeight: 800, color: '#fff',
                background: VERDICT_META[curation[story.story_index]].color, borderRadius: 12,
                padding: '4px 10px', whiteSpace: 'nowrap' }}>
                {VERDICT_META[curation[story.story_index]].icon} {VERDICT_META[curation[story.story_index]].label}
              </span>
            )}
          </div>

          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px', pointerEvents: 'none' }}>
            <div style={{
              fontFamily: C.fontTitle, fontSize: 21, fontWeight: 700, color: '#fff',
              textShadow: '0 2px 10px rgba(0,0,0,0.55)', marginBottom: 5, lineHeight: 1.28,
            }}>
              {story.title || 'Untitled Vision'}
            </div>
            {story.swipe_hook && (
              <div style={{
                fontFamily: C.font, fontSize: 13.5, color: 'rgba(255,255,255,0.92)',
                textShadow: '0 1px 5px rgba(0,0,0,0.45)', fontStyle: 'italic', lineHeight: 1.45,
              }}>
                {story.swipe_hook}<AiMark />
              </div>
            )}
          </div>
        </div>

        <div style={{
          flex: '0 0 45%', padding: '13px 20px 14px',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ fontFamily: C.font, fontSize: 11.5, color: C.textM, marginBottom: 8 }}>
            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {story.nationality?.trim() || '?'}{story.residence_country ? ` → ${story.residence_country}` : ''} · {story.gender || '?'} · {ageLabel(story.birth_year, story.respondedAt)}
            </span>
          </div>

          <div style={{
            fontFamily: C.font, fontSize: 13.5, color: C.text, lineHeight: 1.58,
            flex: 1, overflow: 'hidden',
          }}>
            {story.summary
              ? <><b style={{ color: grad[0] }}>In short:</b> {story.summary}</>
              : <span style={{ fontStyle: 'italic' }}>"{story.bio}"</span>}
          </div>

          {story.themes && story.themes.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'auto', paddingTop: 9 }}>
              {story.themes.slice(0, 4).map((tag, i) => (
                <TagChip key={i} tag={tag} onOpen={openTag} color={grad[0]} bg={`${grad[0]}10`} border={`${grad[0]}2e`} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // loading / error screens
  if (loading) {
    return (
      <div className="story-fullwidth ft-root" style={{ width: '100vw', height: '100vh', background: DARK,
        display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center', alignItems: 'center',
        position: 'relative', overflow: 'hidden' }}>
        <Starfield />
        <style>{FT_CSS}</style>
        {loadError ? (
          <div style={{ textAlign: 'center', zIndex: 2, padding: 20 }}>
            <div style={{ fontSize: 44 }}>🍽️</div>
            <div style={{ fontFamily: C.fontTitle, color: CREAM, fontSize: 20, marginTop: 14 }}>
              Couldn't reach the live story deck.
            </div>
            <button onClick={() => window.location.reload()} style={{ ...btnStyle(true), marginTop: 20 }}>Try again ↺</button>
          </div>
        ) : (
          <>
            <img src="/logo192.png" alt="Relish" style={{ width: 56, height: 'auto', zIndex: 2, animation: 'ftFloat 1.6s ease-in-out infinite alternate' }} />
            <div style={{ fontFamily: C.font, color: CREAM_DIM, fontSize: 15, zIndex: 2 }}>Setting up the deck of futures…</div>
          </>
        )}
      </div>
    );
  }

  const progress = stories.length ? Math.min(idx / stories.length, 1) : 0;

  return (
    <div className="story-fullwidth ft-root" style={{ width: '100vw', minHeight: '100vh', overflowX: 'clip', background: C.bg }}>
      <style>{FT_CSS}</style>

      {appMode && introOpen && <MobileAppIntro n={stories.length} onClose={closeIntro}
        card={anatomyCard} hasImage={anatomyCard ? featuredIndices.has(anatomyCard.story_index) : false} />}

      {/* CURATION MODE (operator only) */}
      {curateMode && !curateToken && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(29,18,7,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22 }}>
          <div style={{ background: C.card, borderRadius: 20, padding: 'clamp(24px,4vw,36px)', maxWidth: 420,
            width: '100%', boxShadow: '0 30px 80px rgba(0,0,0,0.4)' }}>
            <div style={{ fontFamily: C.fontTitle, fontSize: 22, fontWeight: 700, color: C.ink }}>Curation mode</div>
            <p style={{ fontFamily: C.font, fontSize: 13.5, color: C.textM, lineHeight: 1.6, margin: '10px 0 16px' }}>
              Enter the admin token to review the stories. Swipe <strong>up</strong> to keep,
              <strong> right</strong> to keep with a new image, <strong>left</strong> to hide.
            </p>
            <input type="password" value={tokenInput} onChange={e => setTokenInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && tokenInput) { sessionStorage.setItem('ft_curate_token', tokenInput); setCurateToken(tokenInput); } }}
              placeholder="Admin token" autoFocus
              style={{ width: '100%', boxSizing: 'border-box', fontFamily: C.font, fontSize: 14, padding: '11px 14px',
                borderRadius: 10, border: '1.5px solid rgba(61,43,31,0.2)', marginBottom: 12 }} />
            {curationErr && <div style={{ color: C.nope, fontFamily: C.font, fontSize: 12.5, marginBottom: 10 }}>{curationErr}</div>}
            <button onClick={() => { if (tokenInput) { sessionStorage.setItem('ft_curate_token', tokenInput); setCurateToken(tokenInput); } }}
              style={{ ...btnStyle(true), width: '100%' }}>Start reviewing →</button>
            <a href="/food_visions_2050" style={{ display: 'block', textAlign: 'center', marginTop: 12, fontFamily: C.font,
              fontSize: 12.5, color: C.textM }}>← back to the normal page</a>
          </div>
        </div>
      )}

      {curateMode && curateToken && (
        <div style={{ position: 'sticky', top: 0, zIndex: 90, background: DARK, color: CREAM,
          padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 'clamp(10px,3vw,26px)', flexWrap: 'wrap', fontFamily: C.font }}>
          <span style={{ fontWeight: 800, letterSpacing: 1.5, fontSize: 12 }}>CURATION</span>
          <span style={{ fontSize: 12.5, color: CREAM_DIM }}>
            {Object.keys(curation).length} / {stories.length} judged
          </span>
          <span style={{ display: 'inline-flex', gap: 14, fontSize: 12 }}>
            {['keep', 'regen', 'hide'].map(v => (
              <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ color: VERDICT_META[v].color, fontWeight: 800 }}>{VERDICT_META[v].icon}</span>
                {VERDICT_META[v].label}
                <span style={{ color: CREAM_DIM }}>{Object.values(curation).filter(x => x === v).length}</span>
              </span>
            ))}
          </span>
          {curationErr && <span style={{ color: '#FF8A7A', fontSize: 12 }}>{curationErr}</span>}
        </div>
      )}

      {!isMobile && !curateMode && <>
      <ProgressSystem chapters={FUTURES_CHAPTERS} />
      {/* ACT I · HERO */}
      <section style={{ position: 'relative', minHeight: '96vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        background: `linear-gradient(180deg, ${DARK} 0%, #2A1A0C 62%, #43290F 100%)` }}>
        <Starfield />
        <div aria-hidden="true" style={{ position: 'absolute', left: '-15%', bottom: '-42%', width: '130%',
          height: '80%', background: 'radial-gradient(ellipse at 50% 100%, rgba(200,75,49,0.34), rgba(200,75,49,0) 65%)',
          animation: 'fr-glow 9s ease-in-out infinite' }} />
        <div aria-hidden="true" style={{ position: 'absolute', right: '-10%', top: '-20%', width: '55%',
          height: '55%', background: 'radial-gradient(ellipse, rgba(196,154,42,0.14), rgba(196,154,42,0) 70%)' }} />

        <div style={{ position: 'relative', zIndex: 4, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
          padding: 'clamp(16px,2.5vw,26px) clamp(18px,3.5vw,36px)' }}>
          <img src="/logo192.png" alt="RELISH" style={{ height: 34, width: 'auto', display: 'block' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 4, flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          padding: '20px 22px 90px', maxWidth: 980, margin: '0 auto' }}>
          <Fade delay={80}>
            <div style={{ fontFamily: C.font, fontSize: 'clamp(11px,1.3vw,13px)', letterSpacing: 4,
              textTransform: 'uppercase', color: C.turmeric, fontWeight: 800 }}>
              RELISH · University students and the future
            </div>
          </Fade>
          <Fade delay={220}>
            <h1 style={{ fontFamily: C.fontTitle, fontSize: 'clamp(32px,5.6vw,60px)', color: CREAM,
              margin: '22px 0 0', lineHeight: 1.16, maxWidth: 880 }}>
              How do university students{' '}
              <span style={{ color: '#E58F5A' }}>picture the future</span>?
            </h1>
          </Fade>
          <Fade delay={380}>
            <p style={{ fontFamily: C.font, fontSize: 'clamp(15px,1.8vw,18.5px)', color: CREAM_DIM,
              maxWidth: 680, margin: '24px auto 0', lineHeight: 1.75 }}>
              Two short <strong style={{ color: CREAM }}>RELISH</strong> surveys asked university students, most of them in Europe,
              to look ahead: one in their own words, one in quick ratings. Scroll through what they imagined,
              and how hopeful they feel about tomorrow.
            </p>
          </Fade>
          <Fade delay={540}>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', alignItems: 'center',
              flexWrap: 'wrap', marginTop: 34 }}>
              <button onClick={() => scrollTo('ft-anatomy')}
                style={{ fontFamily: C.font, fontSize: 16, fontWeight: 800, cursor: 'pointer', color: '#fff',
                  background: `linear-gradient(120deg, ${C.coral}, #E06A3C)`, border: 'none',
                  borderRadius: 999, padding: '16px 34px', letterSpacing: 0.3,
                  boxShadow: '0 12px 34px rgba(200,75,49,0.45)' }}>
                Start exploring ↓
              </button>
              <button onClick={() => scrollTo('ft-deck')}
                style={{ fontFamily: C.font, fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                  color: CREAM, background: 'transparent', border: '1px solid rgba(255,246,234,0.35)',
                  borderRadius: 999, padding: '15px 24px' }}>
                Skip straight to swiping →
              </button>
            </div>
          </Fade>
        </div>

        <button onClick={() => scrollTo('ft-anatomy')} aria-label="Scroll down"
          style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', zIndex: 5,
            background: 'none', border: 'none', color: 'rgba(255,238,214,0.75)', fontSize: 26,
            cursor: 'pointer', animation: 'fr-bounce 1.8s ease-in-out infinite' }}>⌄</button>
        <div aria-hidden="true" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 110,
          zIndex: 3, background: `linear-gradient(180deg, rgba(255,249,240,0), ${C.bgWarm})`, pointerEvents: 'none' }} />
      </section>

      {/* CHAPTER 1 · written stories */}

      <div id="ft-anatomy" style={{ scrollMarginTop: 10 }}>
        <CardAnatomy card={anatomyCard} hasImage={anatomyCard ? featuredIndices.has(anatomyCard.story_index) : false}
          n={writtenCount ?? stories.length} onAbout={() => setAbout(true)} />
      </div>
      </>}

      {/* ACT II · THE DECK (mobile and desktop) */}
      {!curateMode && !isMobile && (
        <SwipeGuide
          card={anatomyCard}
          hasImage={anatomyCard ? featuredIndices.has(anatomyCard.story_index) : false}
          onGoToDeck={() => scrollTo('ft-deck')} />
      )}

      <div id="ft-deck" className="ft-bg" style={appMode ? {
        position: 'fixed', inset: 0, zIndex: 40, height: '100dvh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 4px)',
      } : { scrollMarginTop: 10, minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden', paddingBottom: 18 }}>

        {!isMobile && !curateMode && <PhoneAppBanner />}

        {appMode ? (
          /* Tinder-style app header: ⓘ · wordmark · counter */
          <div style={{ width: '100%', maxWidth: 430, padding: '12px 18px 6px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => setIntroOpen(true)} aria-label="About this app"
              style={{ width: 34, height: 34, borderRadius: '50%', border: '1.5px solid rgba(61,43,31,0.15)',
                background: 'rgba(255,255,255,0.85)', color: C.textM, fontFamily: C.fontTitle,
                fontSize: 15, fontWeight: 700, cursor: 'pointer', fontStyle: 'italic' }}>i</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="/logo192.png" alt="" style={{ width: 26, height: 'auto' }} />
              <span style={{ fontFamily: C.fontTitle, fontSize: 23, fontWeight: 800, color: C.coral,
                letterSpacing: 0.3, lineHeight: 1 }}>futures</span>
            </div>
            <div style={{
              fontSize: 11.5, fontWeight: 700, color: C.textM, background: 'rgba(255,255,255,0.8)',
              borderRadius: 16, padding: '6px 11px', border: '1.5px solid rgba(61,43,31,0.08)',
            }}>
              {Math.min(idx + 1, stories.length)}<span style={{ opacity: 0.45 }}> / {stories.length}</span>
            </div>
          </div>
        ) : (
        <div style={{ width: '100%', maxWidth: 430, padding: '38px 22px 8px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <img src="/logo192.png" alt="Relish" style={{ width: 30, height: 'auto' }} />
            <div>
              <div style={{ fontFamily: C.fontTitle, fontSize: 19, fontWeight: 700, color: C.coral, lineHeight: 1.1 }}>
                Visions of 2050
              </div>
              <div style={{ fontSize: 10.5, color: C.textL }}>{stories.length} stories</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="ft-pill"
              onClick={() => allTags.length && openTag(allTags[0][0])}
              title="Browse every theme"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                border: 'none', background: `linear-gradient(120deg, ${C.turmeric}, #d8a93a)`, color: '#fff',
                borderRadius: 999, padding: '9px 16px', fontFamily: C.font, fontSize: 13, fontWeight: 800,
                cursor: 'pointer', boxShadow: `0 4px 14px ${C.turmeric}55`,
              }}>
              <span style={{ fontSize: 15 }}>#</span> Browse themes
            </button>
            <div style={{
              fontSize: 11.5, fontWeight: 700, color: C.textM, background: 'rgba(255,255,255,0.8)',
              borderRadius: 16, padding: '6px 11px', border: '1.5px solid rgba(61,43,31,0.08)',
            }}>
              {Math.min(idx + 1, stories.length)}<span style={{ opacity: 0.45 }}> / {stories.length}</span>
            </div>
          </div>
        </div>
        )}

        <div style={{ width: '100%', maxWidth: 430, padding: '0 22px', marginBottom: 6 }}>
          <div style={{ height: 3.5, borderRadius: 2, background: 'rgba(61,43,31,0.07)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2, width: `${Math.max(progress * 100, 1)}%`,
              background: `linear-gradient(90deg, ${C.coral}, ${C.turmeric})`,
              transition: 'width 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
            }} />
          </div>
        </div>

        <div style={appMode ? {
          flex: 1, width: '100%', maxWidth: 430, position: 'relative',
          padding: '4px 16px 0', minHeight: 0,
        } : {
          flex: 1, width: '100%', maxWidth: 410, position: 'relative',
          padding: '4px 18px 0', height: 'calc(100vh - 215px)', maxHeight: 640, minHeight: 430,
        }}>
          {cur ? (
            <>
              {nxt && renderCard(nxt, false)}
              {renderCard(cur, true)}
            </>
          ) : curateMode ? (
            <div style={{
              position: 'absolute', inset: '0 18px', borderRadius: 26, background: C.card,
              boxShadow: '0 24px 64px rgba(61,43,31,0.16)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              textAlign: 'center', overflow: 'auto', padding: '30px 26px',
            }}>
              <div style={{ fontSize: 46, marginBottom: 10 }}>✅</div>
              <div style={{ fontFamily: C.fontTitle, fontSize: 21, color: C.text, marginBottom: 6 }}>Review complete</div>
              <div style={{ fontSize: 13.5, color: C.textM, marginBottom: 18, lineHeight: 1.6 }}>
                {Object.keys(curation).length} of {stories.length} stories judged.
              </div>
              <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
                {['keep', 'regen', 'hide'].map(v => (
                  <div key={v} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: C.fontTitle, fontSize: 26, fontWeight: 700, color: VERDICT_META[v].color }}>
                      {Object.values(curation).filter(x => x === v).length}
                    </div>
                    <div style={{ fontFamily: C.font, fontSize: 11.5, color: C.textM }}>
                      {VERDICT_META[v].icon} {VERDICT_META[v].label}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: C.textL, lineHeight: 1.6, maxWidth: 300 }}>
                Verdicts are saved. Apply them with <code>npm run curation -- apply</code> in server/backend.
                You can swipe any story again to change its verdict.
              </div>
              <button className="ft-cta" onClick={() => setIdx(0)} style={{ marginTop: 18,
                background: `linear-gradient(135deg, ${C.coral}, #d8693f)`, color: '#fff', border: 'none',
                padding: '11px 26px', borderRadius: 24, fontFamily: C.font, fontSize: 13.5, fontWeight: 700,
                cursor: 'pointer' }}>Review again from the top ↺</button>
            </div>
          ) : (
            <div style={{
              position: 'absolute', inset: '0 18px', borderRadius: 26, background: C.card,
              boxShadow: '0 24px 64px rgba(61,43,31,0.16)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              textAlign: 'center', overflow: 'auto', padding: '30px 26px',
            }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
              <div style={{ fontFamily: C.fontTitle, fontSize: 22, color: C.text, marginBottom: 6 }}>Every future explored!</div>
              <div style={{ fontSize: 13.5, color: C.textM, marginBottom: 20, lineHeight: 1.6 }}>
                You travelled through all {stories.length} visions of 2050.
              </div>
              <button className="ft-cta" onClick={restart} style={{
                background: `linear-gradient(135deg, ${C.coral}, #d8693f)`, color: '#fff', border: 'none',
                padding: '12px 30px', borderRadius: 24, fontFamily: C.font, fontSize: 14, fontWeight: 700,
                cursor: 'pointer', marginBottom: 18, boxShadow: `0 8px 26px ${C.coral}50`,
              }}>Shuffle &amp; start over</button>
              {!isMobile && (
                <button onClick={() => scrollTo('ft-insights')} style={{
                  background: 'none', color: C.coral, border: `1.5px solid ${C.coral}`, borderRadius: 22,
                  padding: '9px 22px', fontFamily: C.font, fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 20,
                }}>See the big picture ↓</button>
              )}
              <div style={{ fontSize: 11.5, color: C.textL, marginBottom: 10 }}>…or revisit them by theme:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                {allTags.slice(0, 12).map(([tag, list]) => (
                  <button key={tag} className="ft-chip" onClick={() => openTag(tag)} style={{
                    background: 'rgba(61,43,31,0.05)', color: C.textM, border: '1px solid rgba(61,43,31,0.1)',
                    cursor: 'pointer', padding: '5px 11px', borderRadius: 12, fontFamily: C.font, fontSize: 11.5, fontWeight: 600,
                  }}>
                    {tag} <span style={{ opacity: 0.55 }}>{list.length}</span>
                  </button>
                ))}
              </div>
              {isMobile && (
                <div style={{ fontSize: 11.5, color: C.textL, marginTop: 16, lineHeight: 1.6 }}>
                  For the full data story, open this page on a computer.
                </div>
              )}
            </div>
          )}
        </div>

        {renderActionBar(!!cur, !exit, advance, curateMode)}
        {!isMobile && cur && (
          <button onClick={() => scrollTo('ft-insights')}
            style={{ ...linkBtnStyle, fontSize: 12, textDecoration: 'none', color: C.textL, marginTop: 2 }}>
            Skip to the big picture ↓
          </button>
        )}
      </div>

      {!isMobile && !curateMode && <>
      {/* ACT III · INSIGHTS */}
      {ins && (
        <div id="ft-insights" style={{ scrollMarginTop: 10 }}>
          <PeopleSection ins={ins} stories={stories} sentIndex={sentIndex} />
        </div>
      )}

      {/* CHAPTER 2 · a second, shorter RELISH survey */}
      <ChapterBreak num={2} label="A second survey" title="Beyond food: a different dataset"
        lede="Everything above comes from long, written stories. This next part is a different,
          much shorter live RELISH survey: quick ratings, no writing involved." />
      <FuturesGameEmbed />

      {/* both surveys' respondents, side by side */}
      <CountriesComparison
        visionsCountries={countriesOf(visionsRecords.length ? visionsRecords : stories, 'residence_country')}
        futuresCountries={countriesOf(futuresRecords, 'residence_country')}
        visionsN={visionsRecords.length || stories.length} futuresN={futuresRecords.length} />

      <FinaleSection onAbout={() => setAbout(true)} />
      </>}

      {/* Theme browser overlay */}
      {tagFilter && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 90, overflowY: 'auto',
          background: `linear-gradient(180deg, #FFF3E4 0%, ${C.bg} 240px)`,
          animation: 'ftFadeIn 0.22s ease',
        }}>
          <div style={{
            position: 'sticky', top: 0, zIndex: 5, background: 'rgba(255,246,233,0.94)',
            backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(61,43,31,0.08)',
            padding: '13px 20px 0',
          }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 10 }}>
                <button onClick={() => setTagFilter(null)} aria-label="Back to the deck" className="ft-pill" style={{
                  border: '1.5px solid rgba(61,43,31,0.12)', background: '#fff', borderRadius: '50%',
                  width: 38, height: 38, cursor: 'pointer', fontSize: 16, color: C.text,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>←</button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: C.fontTitle, fontSize: 21, fontWeight: 700, color: C.coral, lineHeight: 1.15 }}>
                    {tagFilter}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.textM }}>
                    {(tagIndex.get(tagFilter) || []).length} visions share this theme · tap one to read it
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '2px 2px 10px' }}>
                {allTags.map(([tag, list]) => {
                  const active = tag === tagFilter;
                  return (
                    <button key={tag} ref={active ? activeChipRef : null}
                      className="ft-chip"
                      onClick={() => setTagFilter(tag)} style={{
                        border: active ? 'none' : '1px solid rgba(61,43,31,0.1)',
                        cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                        background: active ? `linear-gradient(135deg, ${C.coral}, #d8693f)` : '#fff',
                        color: active ? '#fff' : C.textM,
                        boxShadow: active ? `0 4px 14px ${C.coral}45` : 'none',
                        padding: '7px 13px', borderRadius: 15, fontFamily: C.font, fontSize: 12, fontWeight: 700,
                      }}>
                      {tag} <span style={{ opacity: 0.65, fontWeight: 600 }}>{list.length}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{
            maxWidth: 1100, margin: '0 auto', padding: '18px 20px 70px',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 15,
          }}>
            {(tagIndex.get(tagFilter) || []).map((story, qi) => {
              const grad = toneGradient(story.emotional_tone);
              const hasImage = featuredIndices.has(story.story_index);
              return (
                <div key={story.story_index}
                  className="ft-mini"
                  onClick={() => setThemeQueue({ tag: tagFilter, i: qi })}
                  style={{
                    background: C.card, borderRadius: 19, overflow: 'hidden', cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(61,43,31,0.09)', display: 'flex', flexDirection: 'column',
                  }}>
                  <div style={{
                    height: 116, position: 'relative', flexShrink: 0,
                    background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})`,
                  }}>
                    {hasImage && (
                      <img src={`/images/story_cards/story_${story.story_index}.png`} alt=""
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 28%, rgba(20,10,5,0.66))' }} />
                    <div style={{ position: 'absolute', top: 10, right: 12 }}>
                      <LoveBadge score={scoreOf(story)} light />
                    </div>
                    <div style={{
                      position: 'absolute', bottom: 10, left: 14, right: 14,
                      fontFamily: C.fontTitle, fontSize: 15, fontWeight: 700, color: '#fff',
                      lineHeight: 1.32, textShadow: '0 1px 6px rgba(0,0,0,0.5)',
                    }}>
                      {story.title}
                    </div>
                  </div>
                  <div style={{ padding: '12px 15px 14px', display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
                    <div style={{
                      fontFamily: C.font, fontSize: 12.5, color: C.text, lineHeight: 1.55,
                      display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {story.summary || story.bio}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 'auto' }}>
                      {(story.themes || []).slice(0, 4).map((tag, i) => {
                        const active = String(tag).toLowerCase() === tagFilter;
                        return (
                          <button key={i}
                            className="ft-chip"
                            onClick={e => { e.stopPropagation(); setTagFilter(String(tag).toLowerCase()); }}
                            style={{
                              background: active ? `${grad[0]}1c` : 'rgba(61,43,31,0.045)',
                              color: active ? grad[0] : C.textM,
                              border: `1px solid ${active ? `${grad[0]}40` : 'transparent'}`,
                              cursor: 'pointer', padding: '3px 9px', borderRadius: 10,
                              fontFamily: C.font, fontSize: 10.5, fontWeight: 700,
                            }}>
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Theme deck overlay — swipe through the open theme's stories */}
      {themeQueue && tCur && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 95,
          background: 'rgba(30,16,8,0.55)', backdropFilter: 'blur(3px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '16px 18px 4px', animation: 'ftFadeIn 0.2s ease',
        }} onClick={() => setThemeQueue(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            fontFamily: C.font, fontSize: 11.5, fontWeight: 700, letterSpacing: 0.5,
            color: '#fff', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)',
            padding: '5px 14px', borderRadius: 14, marginBottom: 12,
          }}>
            {themeQueue.tag} · {Math.min(themeQueue.i + 1, themeList.length)} / {themeList.length}
          </div>
          <div onClick={e => e.stopPropagation()} style={{
            position: 'relative', width: '100%', maxWidth: 374,
            height: 'min(600px, calc(100vh - 210px))', minHeight: 420,
          }}>
            {tNxt && renderCard(tNxt, false)}
            {renderCard(tCur, true)}
          </div>
          <div onClick={e => e.stopPropagation()}>
            {renderActionBar(true, !exit, advance)}
          </div>
        </div>
      )}

      {/* Expanded story modal */}
      {selectedStory && (() => {
        const story = selectedStory;
        const grad = toneGradient(story.emotional_tone);
        const sd = sentIndex.get(story.story_index);  // this story's sentiment profile
        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(30,16,8,0.6)', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18,
            animation: 'ftFadeIn 0.2s ease', backdropFilter: 'blur(3px)',
          }} onClick={() => setSelectedStory(null)}>
            <div style={{
              background: C.card, borderRadius: 26, maxWidth: 520, width: '100%',
              maxHeight: '88vh', overflow: 'auto', position: 'relative',
              boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
              animation: 'ftPopIn 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
            }} onClick={e => e.stopPropagation()}>

              <div style={{ position: 'sticky', top: 0, height: 0, zIndex: 20 }}>
                <button onClick={() => setSelectedStory(null)} aria-label="Close" style={{
                  position: 'absolute', top: 12, right: 12,
                  border: 'none', background: 'rgba(20,10,5,0.55)', backdropFilter: 'blur(6px)',
                  borderRadius: '50%', width: 38, height: 38, cursor: 'pointer', fontSize: 16, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>✕</button>
              </div>

              {featuredIndices.has(story.story_index) ? (
                <div style={{ position: 'relative', height: 225, overflow: 'hidden', borderRadius: '26px 26px 0 0', background: CARD_ART_BG }}>
                  <img
                    src={cardArtSrc(story.story_index)}
                    data-idx={story.story_index}
                    onError={onCardArtError}
                    decoding="async"
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
                    background: 'linear-gradient(transparent, rgba(20,10,5,0.66))',
                  }} />
                  <div style={{ position: 'absolute', bottom: 16, left: 24, right: 60 }}>
                    <div style={{
                      fontFamily: C.fontTitle, fontSize: 22, fontWeight: 700, color: '#fff',
                      textShadow: '0 2px 8px rgba(0,0,0,0.5)', lineHeight: 1.27,
                    }}>
                      {story.title || 'Untitled Vision'}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ position: 'relative', padding: '22px 28px 0', background: `linear-gradient(135deg, ${grad[0]}18, transparent 70%)`, borderRadius: '26px 26px 0 0' }}>
                  <h3 style={{ fontFamily: C.fontTitle, fontSize: 22, color: C.text, margin: '0 0 4px', paddingRight: 44, lineHeight: 1.3 }}>
                    {story.title || 'Untitled Vision'}
                  </h3>
                </div>
              )}

              <div style={{ padding: '18px 28px 30px' }}>
                <div style={{
                  fontFamily: C.font, fontSize: 15, color: C.text, lineHeight: 1.85,
                  whiteSpace: 'pre-wrap',
                }}>
                  {story.story_text}
                </div>

                {story.themes && story.themes.length > 0 && (
                  <>
                    <div style={{ height: 1, background: 'rgba(61,43,31,0.08)', margin: '20px 0 14px' }} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {story.themes.map((tag, i) => (
                        <TagChip key={i} tag={tag} onOpen={openTag} size={11.5} border="rgba(61,43,31,0.1)" />
                      ))}
                    </div>
                  </>
                )}

                {sd && sd.n_sentences > 0 && <StorySentiment sd={sd} />}

                {story.image_prompt && (
                  <details style={{ marginTop: 16 }}>
                    <summary style={{ fontFamily: C.font, fontSize: 12, fontWeight: 700, color: C.textM,
                      cursor: 'pointer', userSelect: 'none' }}>
                      🎨 See the illustration prompt
                    </summary>
                    <div style={{ fontFamily: C.font, fontSize: 12.5, color: C.textM, fontStyle: 'italic',
                      lineHeight: 1.6, marginTop: 8, padding: '10px 13px', background: 'rgba(61,43,31,0.04)',
                      borderRadius: 10 }}>
                      "{story.image_prompt}"
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {about && <AboutModal onClose={() => setAbout(false)} ins={ins} writtenCount={writtenCount} />}
    </div>
  );
}

function StorySentiment({ sd }) {
  const tot = sd.n_sentences || 1;
  const rows = EMO_KEYS
    .map(k => ({ k, ...EMOTION_META[k], v: (sd.emotions || {})[k] || 0 }))
    .sort((a, b) => b.v - a.v);
  const any = rows.some(r => r.v > 0);

  return (
    <div style={{ marginTop: 18, padding: '13px 15px', background: 'rgba(61,43,31,0.035)', borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10,
        marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: C.font, fontSize: 10.5, fontWeight: 800, letterSpacing: 1.6,
          textTransform: 'uppercase', color: C.textM }}>Emotions in this response</span>
        <span style={{ fontFamily: C.font, fontSize: 11.5, color: C.textL }}>
          {tot} sentence{tot === 1 ? '' : 's'} · NRC EmoLex
        </span>
      </div>
      {any ? (
        <>
          {rows.filter(r => r.v > 0).map(r => (
            <div key={r.k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <span style={{ width: 86, flexShrink: 0, fontFamily: C.font, fontSize: 11.5,
                fontWeight: 700, color: C.text }}>{r.label}</span>
              <div style={{ flex: 1, height: 12, borderRadius: 6, background: 'rgba(61,43,31,0.06)',
                overflow: 'hidden' }}>
                <div style={{ width: `${Math.round(r.v * 100)}%`, height: '100%', borderRadius: 6,
                  background: r.color }} />
              </div>
              <span style={{ width: 34, flexShrink: 0, textAlign: 'right', fontFamily: C.font,
                fontSize: 11, fontWeight: 700, color: C.textM }}>{Math.round(r.v * 100)}%</span>
            </div>
          ))}
          <div style={{ fontFamily: C.font, fontSize: 10.5, color: C.textL, marginTop: 7, lineHeight: 1.5 }}>
            Share of this response's emotion words that carry each emotion; one word can carry several,
            so the bars add up to more than 100%.
          </div>
          <div style={{ fontFamily: C.font, fontSize: 11, color: C.textM, marginTop: 8, lineHeight: 1.55,
            paddingTop: 8, borderTop: '1px solid rgba(61,43,31,0.1)' }}>
            In the NRC lexicon the word “food” counts as both trust and joy, so a response's trust score partly
            reflects the vocabulary of the topic.{' '}
            {sd.emotions_nofood
              ? (sd.food_n > 0
                ? <>This response uses “food” {sd.food_n === 1 ? 'once' : `${sd.food_n} times`}; without it counted as
                  trust, trust would be <strong>{Math.round((sd.emotions_nofood.trust || 0) * 100)}%</strong> instead
                  of {Math.round((sd.emotions.trust || 0) * 100)}%.</>
                : <>This response never uses the word “food”, so its trust figure is not affected.</>)
              : null}
          </div>
        </>
      ) : (
        <div style={{ fontFamily: C.font, fontSize: 12, color: C.textM }}>
          No emotion-lexicon words detected in this response.
        </div>
      )}
    </div>
  );
}

// Count respondents by country for a survey's records.
function countriesOf(records, key) {
  const c = {};
  (records || []).forEach(r => { const k = r && r[key]; if (k) c[k] = (c[k] || 0) + 1; });
  return Object.entries(c).map(([country, n]) => ({ country, n })).sort((a, b) => b.n - a.n);
}

function CountriesComparison({ visionsCountries, futuresCountries, visionsN, futuresN }) {
  const [ref, seen] = useOnScreen({ threshold: 0.2 });
  const vMap = new Map(visionsCountries.map(r => [r.country, r.n]));
  const fMap = new Map(futuresCountries.map(r => [r.country, r.n]));
  const all = [...new Set([...vMap.keys(), ...fMap.keys()])]
    .map(country => ({ country, v: vMap.get(country) || 0, f: fMap.get(country) || 0 }))
    .sort((a, b) => (b.v + b.f) - (a.v + a.f))
    .slice(0, 14);
  const maxAll = Math.max(1, ...all.flatMap(r => [r.v, r.f]));
  const VIS = C.coral, FUT = C.blue;

  if (!all.length) return null;

  const Legend = ({ color, label, n }) => (
    <span style={{ fontFamily: C.font, fontSize: 12.5, color: C.text, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: color }} /> {label} <span style={{ color: C.textL }}>({n})</span>
    </span>
  );

  return (
    <section id="ft-countries" style={{ padding: '90px 0 96px', background: C.bg, scrollMarginTop: 10 }}>
      <SectionHead kicker="Both surveys · who answered" title="Where they answered from."
        lede="Every country of residence across the two RELISH surveys, side by side: the written food
          stories on one side, the quick futures ratings on the other." />

      <Fade delay={80}>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
          <Legend color={VIS} label="Food stories" n={visionsN} />
          <Legend color={FUT} label="Futures ratings" n={futuresN} />
        </div>
      </Fade>

      <div ref={ref} style={{ maxWidth: 760, margin: '34px auto 0', padding: '0 22px' }}>
        {all.map((row, i) => (
          <div key={row.country} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 1fr',
            alignItems: 'center', gap: 10, marginBottom: 9 }}>
            {/* left: food stories, grows leftward */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
              <span style={{ fontFamily: C.font, fontSize: 12, fontWeight: 700, color: row.v ? VIS : C.textL, minWidth: 14, textAlign: 'right' }}>
                {row.v || '·'}
              </span>
              <div style={{ height: 18, borderRadius: '7px 0 0 7px', background: VIS,
                width: seen ? `${(row.v / maxAll) * 100}%` : '0%', minWidth: row.v ? 3 : 0,
                transition: `width 0.9s cubic-bezier(.2,.8,.2,1) ${i * 55}ms` }} />
            </div>
            {/* centre: country */}
            <div style={{ textAlign: 'center', fontFamily: C.font, fontSize: 12.5, fontWeight: 700,
              color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.country}
            </div>
            {/* right: futures ratings, grows rightward */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ height: 18, borderRadius: '0 7px 7px 0', background: FUT,
                width: seen ? `${(row.f / maxAll) * 100}%` : '0%', minWidth: row.f ? 3 : 0,
                transition: `width 0.9s cubic-bezier(.2,.8,.2,1) ${i * 55}ms` }} />
              <span style={{ fontFamily: C.font, fontSize: 12, fontWeight: 700, color: row.f ? FUT : C.textL, minWidth: 14 }}>
                {row.f || '·'}
              </span>
            </div>
          </div>
        ))}
        <p style={{ fontFamily: C.font, fontSize: 12.5, color: C.textM, textAlign: 'center',
          lineHeight: 1.6, marginTop: 24 }}>
          Two independent samples, both mostly university students across Europe. A country can be busy in
          one survey and quiet in the other, so read the bars as who happened to answer each, not a ranking.
        </p>
      </div>
    </section>
  );
}

function PeopleSection({ ins, stories, sentIndex }) {
  const [ref, seen] = useOnScreen({ threshold: 0.15 });
  const dots = useMemo(() => stories
    .map(s => ({ s, emo: domEmotion(sentIndex.get(s.story_index)) }))
    .filter(x => x.emo)
    .map(({ s, emo }) => ({ color: EMOTION_META[emo].color,
      title: `${EMOTION_META[emo].label}${s.residence_country ? ' · ' + s.residence_country : ''}` })),
  [stories, sentIndex]);

  const legend = useMemo(() => {
    const counts = {}; EMO_KEYS.forEach(k => { counts[k] = 0; });
    stories.forEach(s => {
      const emo = domEmotion(sentIndex.get(s.story_index));
      if (emo) counts[emo]++;
    });
    return EMO_KEYS.map(k => ({ ...EMOTION_META[k], count: counts[k] }))
      .filter(m => m.count > 0).sort((a, b) => b.count - a.count);
  }, [stories, sentIndex]);

  // Dominant emotions again, without the word "food" counted as trust.
  const noFood = useMemo(() => {
    const counts = {}; EMO_KEYS.forEach(k => { counts[k] = 0; });
    let n = 0, withField = 0;
    stories.forEach(s => {
      const sd = sentIndex.get(s.story_index);
      const emo = domEmotion(sd);
      if (!emo) return;
      n++;
      if (!sd.emotions_nofood) return;
      withField++;
      const e2 = domEmotion(sd, 'emotions_nofood');
      if (e2) counts[e2]++;
    });
    const shown = {}; legend.forEach(m => { shown[m.label] = m.count; });
    return n > 0 && withField === n ? { counts, n, trustNow: shown.Trust || 0 } : null;
  }, [stories, sentIndex, legend]);

  const COLS = 25, CELL = 18;
  const rows = Math.ceil(dots.length / COLS) || 1;

  const Stat = ({ v, label }) => (
    <div style={{ textAlign: 'center', minWidth: 110 }}>
      <AnimatedNumber value={v} duration={1400}
        style={{ fontFamily: C.fontTitle, fontSize: 'clamp(30px,3.6vw,42px)', fontWeight: 700, color: C.ink }} />
      <div style={{ fontFamily: C.font, fontSize: 12.5, color: C.textM, marginTop: 4 }}>{label}</div>
    </div>
  );

  return (
    <section style={{ padding: '90px 0 96px', background: C.bgWarm }}>
      <SectionHead kicker="What the data says" accent={C.turmeric} title="The people behind the stories."
        lede="Every dot is one person who sat down and imagined a day, coloured by the strongest emotion
          in what they wrote (NRC EmoLex). The grid grows as new responses arrive." />

      <Fade delay={100}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(18px,5vw,54px)',
          flexWrap: 'wrap', margin: '40px auto 8px', padding: '0 22px' }}>
          <Stat v={ins.n} label="stories" />
          <Stat v={ins.countries} label="countries" />
          <Stat v={ins.medianAge || 0} label="median age" />
        </div>
      </Fade>

      <div ref={ref} className={`fr-dots ${seen ? 'on' : ''}`} style={{ maxWidth: 760, margin: '26px auto 0', padding: '0 22px' }}>
        <svg viewBox={`0 0 ${COLS * CELL} ${rows * CELL}`} style={{ width: '100%', height: 'auto' }}>
          {dots.map((d, i) => (
            <circle key={i} cx={(i % COLS) * CELL + CELL / 2} cy={Math.floor(i / COLS) * CELL + CELL / 2}
              r={6} fill={d.color} stroke={EMO_STROKE} strokeWidth={0.8} style={{ animationDelay: `${i * 5}ms` }}>
              <title>{d.title}</title>
            </circle>
          ))}
        </svg>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
          {legend.map(m => (
            <span key={m.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: C.font, fontSize: 12, color: C.text }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: m.color, border: `1px solid ${EMO_STROKE}` }} />
              {m.label} <span style={{ color: C.textL }}>{m.count}</span>
            </span>
          ))}
        </div>
        <p style={{ fontFamily: C.font, fontSize: 12.5, color: C.textM, lineHeight: 1.65, maxWidth: 560,
          margin: '18px auto 0', textAlign: 'center' }}>
          <strong>A caveat on trust.</strong> In the NRC lexicon the word “food” is tagged as both trust and joy,
          so {legend[0] && legend[0].label === 'Trust' && clearlyAhead(legend[0].count, legend[1] ? legend[1].count : 0)
            ? 'the lead of trust mostly reflects' : 'the weight of trust partly reflects'} the
          vocabulary of the topic, not only how people feel.
          {noFood && <> Without “food” counted as trust, trust is the strongest emotion in {noFood.counts.trust} of
          these {noFood.n} stories instead of {noFood.trustNow}, joy in {noFood.counts.joy} and anticipation
          in {noFood.counts.anticipation}.</>}
        </p>
      </div>

      {ins.engagement && ins.engagement.topLovedStory && (
        <Fade delay={150}>
          <div style={{ maxWidth: 500, margin: '34px auto 0', padding: '0 22px', textAlign: 'center' }}>
            <span style={nuggetStyle}>
              ♥ {ins.engagement.likes} likes · ⭐ {ins.engagement.superlikes} super-likes cast by visitors so far,
              the most loved story is <strong>"{ins.engagement.topLovedStory.title}"</strong>
            </span>
          </div>
        </Fade>
      )}
    </section>
  );
}

function ChapterBreak({ num, label, title, lede }) {
  return (
    <Fade>
      <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto', padding: '58px 22px 0' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 40, height: 1, background: 'rgba(61,43,31,0.25)' }} />
          <span style={{ fontFamily: C.font, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase',
            color: C.textM, fontWeight: 700 }}>Chapter {num} · {label}</span>
          <span style={{ width: 40, height: 1, background: 'rgba(61,43,31,0.25)' }} />
        </div>
        <h2 style={{ fontFamily: C.fontTitle, fontSize: 'clamp(28px,4vw,44px)', color: C.ink,
          margin: '18px 0 0', lineHeight: 1.2 }}>{title}</h2>
        {lede && <p style={{ fontFamily: C.font, fontSize: 15.5, color: C.textM, lineHeight: 1.75,
          maxWidth: 600, margin: '16px auto 0' }}>{lede}</p>}
      </div>
    </Fade>
  );
}

function FinaleSection({ onAbout }) {
  return (
    <section style={{ padding: '90px 0 70px', background: C.bg }}>
      <Fade>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(30px,5vw,50px)',
          background: `linear-gradient(135deg, ${DARK}, #3A2413)`, borderRadius: 30, textAlign: 'center',
          position: 'relative', overflow: 'hidden', boxShadow: '0 24px 70px rgba(61,43,31,0.30)' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.5 }}><Starfield /></div>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontFamily: C.font, fontSize: 11.5, letterSpacing: 3, textTransform: 'uppercase',
              color: C.turmeric, fontWeight: 800 }}>And now, you</div>
            <h2 style={{ fontFamily: C.fontTitle, fontSize: 'clamp(26px,3.6vw,38px)', color: CREAM,
              margin: '14px 0 0', lineHeight: 1.25 }}>
              This deck is alive.<br />Your day in 2050 could join it.
            </h2>
            <p style={{ fontFamily: C.font, fontSize: 15, color: CREAM_DIM, lineHeight: 1.75,
              maxWidth: 520, margin: '16px auto 0' }}>
              Write your own: what would you cook, and with whom? Two minutes, anonymous. If yours gets
              illustrated, it'll show up in this deck for others to swipe on.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 26 }}>
              <a href="/survey_food_visions_2050" target="_blank" rel="noopener noreferrer"
                style={{ ...btnStyle(true), fontSize: 15, padding: '13px 26px' }}>
                Write your day in 2050 →
              </a>
              <a href="/dashboard_food_visions_2050" style={{ ...btnStyle(false), color: CREAM, borderColor: 'rgba(255,246,234,0.4)' }}>
                Researcher dashboard
              </a>
            </div>
          </div>
        </div>
      </Fade>

      <Fade delay={120}>
        <div style={{ maxWidth: 760, margin: '44px auto 0', padding: '0 22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <OfficialEUBadge height={42} />
            <div style={{ fontFamily: C.font, fontSize: 13, color: C.text, lineHeight: 1.65, maxWidth: 560 }}>
              RELISH, Reframing European gastronomy Legacy through Innovation, Sustainability and Heritage ·
              project 101177427 · Horizon Europe, call HORIZON-CL2-2024-HERITAGE-01.
            </div>
          </div>
          <p style={{ fontFamily: C.font, fontSize: 11.5, color: C.textL, lineHeight: 1.65, textAlign: 'center',
            marginTop: 18, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto' }}>
            Views and opinions expressed on this page are those of the survey respondents and the RELISH team
            only and do not necessarily reflect those of the European Union or the granting authority. Neither
            the European Union nor the granting authority can be held responsible for them.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap', marginTop: 14,
            fontFamily: C.font, fontSize: 12.5 }}>
            <button onClick={onAbout} style={linkBtnStyle}>About the data</button>
            <span style={{ color: C.textL }}>·</span>
            <span style={{ color: C.textM }}>Anonymous live data · © RELISH consortium</span>
          </div>
        </div>
      </Fade>
    </section>
  );
}

function AboutModal({ onClose, ins, writtenCount }) {
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
        padding: 18, animation: 'ftFadeIn 0.25s ease' }}>
      <div role="dialog" aria-modal="true" aria-label="About the data"
        style={{ background: C.bg, borderRadius: 24, maxWidth: 700, width: '100%', maxHeight: '86vh',
          overflowY: 'auto', padding: 'clamp(24px,4vw,40px)', boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
          animation: 'ftPopIn 0.3s cubic-bezier(.2,.8,.2,1)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ fontFamily: C.fontTitle, fontSize: 26, fontWeight: 700, color: C.ink }}>
            About the data
          </div>
          <button onClick={onClose} aria-label="Close"
            style={{ background: 'rgba(61,43,31,0.08)', border: 'none', borderRadius: 12, width: 38,
              height: 38, fontSize: 17, cursor: 'pointer', color: C.text, flexShrink: 0 }}>✕</button>
        </div>

        <H>What you are looking at</H>
        <P>A playable window into the <strong>RELISH Visions survey</strong>. In the platform, every card is
          built from an anonymous written response. This copy runs on <strong>{writtenCount ?? ins?.n ?? 'a set of'} demo
          stories</strong> written for testing: none of them comes from a real participant.</P>

        <H>The survey</H>
        <P>Participants were asked to describe, in their own words (up to 3000 characters), a single day of
          cooking and eating in 2050. It is not about predicting correctly, it asks how people <em>speculate</em>{' '}
          according to their experiences, beliefs and expectations.</P>

        <H>How a story becomes a card</H>
        <P>In the platform, each response is processed offline by a large language model, grounded only in
          what was written, to draft a title, a one-line caption in the participant's voice, a short summary,
          an emotional tone, a set of themes, and a description of one scene from the story. An image model
          then paints that scene as an illustration. The full, original text is always one tap away on every
          card. That processing is not part of this copy: the demo cards are written by hand and have no
          illustrations.</P>

        <H>Privacy</H>
        <P>The survey is anonymous: no names or personal identifiers are collected, and responses are never
          linked to identities. Birth year is used only for age statistics. Data is stored securely and used
          exclusively for educational, research and cultural purposes within the RELISH project.</P>

        <H>The project</H>
        <P><strong>RELISH, Reframing European gastronomy Legacy through Innovation, Sustainability and
          Heritage</strong> (project 101177427, Horizon Europe call HORIZON-CL2-2024-HERITAGE-01) explores how
          Europe's food heritage can help imagine better futures. This page is one of the project's public
          experiments in making that research tangible and playable.</P>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 22 }}>
          <a href="/survey_food_visions_2050" target="_blank" rel="noopener noreferrer" style={btnStyle(true)}>
            Write your own →</a>
          <a href="/dashboard_food_visions_2050" style={btnStyle(false)}>Researcher dashboard</a>
        </div>
      </div>
    </div>,
    document.body
  );
}

const FT_CSS = `
  .ft-bg {
    background:
      radial-gradient(640px 420px at 12% -8%, rgba(200,75,49,0.10), transparent 60%),
      radial-gradient(560px 400px at 105% 14%, rgba(196,154,42,0.12), transparent 60%),
      radial-gradient(640px 480px at 50% 115%, rgba(90,122,58,0.08), transparent 60%),
      #FFF9F0;
  }
  .ft-root * { box-sizing: border-box; }

  .ft-swipe-grid {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    grid-template-rows: auto auto auto;
    gap: 22px 34px;
    align-items: center;
    justify-items: center;
    max-width: 1120px;
    margin: 0 auto;
    padding: 0 22px;
  }
  .ft-sw-up    { grid-column: 2; grid-row: 1; }
  .ft-sw-left  { grid-column: 1; grid-row: 2; justify-self: end; }
  .ft-sw-card  { grid-column: 2; grid-row: 2; }
  .ft-sw-right { grid-column: 3; grid-row: 2; justify-self: start; }
  .ft-sw-tap   { grid-column: 2; grid-row: 3; }
  @media (max-width: 1040px) {
    .ft-swipe-grid { grid-template-columns: minmax(0, 1fr); }
    .ft-sw-up, .ft-sw-left, .ft-sw-card, .ft-sw-right, .ft-sw-tap {
      grid-column: 1; grid-row: auto; justify-self: center;
    }
  }

  /* section rail: reveal a chapter's label on hover, matching /the_borrowed_plate */
  .s3-rail-dot .s3-rail-label { pointer-events: none; }
  .s3-rail-dot:hover .s3-rail-label { opacity: 1 !important; }
  .ft-chip { transition: transform 0.15s ease, filter 0.15s ease, box-shadow 0.15s ease; }
  .ft-chip:hover { transform: translateY(-1px); filter: brightness(1.06); }
  .ft-chip:active { transform: translateY(0) scale(0.96); }
  .ft-pill { transition: transform 0.15s ease, box-shadow 0.15s ease; }
  .ft-pill:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(61,43,31,0.12); }
  .ft-action { transition: transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.16s ease; }
  .ft-action:hover { transform: scale(1.13); }
  .ft-action:active { transform: scale(0.95); }
  .ft-cta { transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.18s ease; }
  .ft-cta:hover { transform: translateY(-2px) scale(1.03); box-shadow: 0 12px 32px rgba(200,75,49,0.5); }
  .ft-cta:active { transform: scale(0.97); }
  .ft-mini { transition: transform 0.18s ease, box-shadow 0.18s ease; }
  .ft-mini:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(61,43,31,0.16); }
  .ft-cloud-tag { transition: transform 0.15s ease, filter 0.15s ease; }
  .ft-cloud-tag:hover { transform: scale(1.08); filter: brightness(1.1); }
  .ft-pin:hover, .ft-pin:focus { outline: none; }
  @keyframes ftFadeIn { from { opacity: 0 } to { opacity: 1 } }
  @keyframes ft-stamp-in { from { opacity: 0; transform: scale(1.6) rotate(0deg); } to { opacity: 1; transform: scale(1) rotate(var(--rot, 0deg)); } }
  @keyframes ftPopIn { from { opacity: 0; transform: scale(0.93) translateY(12px); } to { opacity: 1; transform: none; } }
  @keyframes ftFloat { from { transform: translateY(0); } to { transform: translateY(-7px); } }
  @keyframes fr-twinkle { 0%,100% { opacity: calc(var(--o, 0.5) * 0.25); } 50% { opacity: var(--o, 0.5); } }
  @keyframes fr-glow { 0%,100% { opacity: 0.85; } 50% { opacity: 1; } }
  @keyframes fr-live { 0% { box-shadow: 0 0 0 0 rgba(255,92,57,0.55); } 70% { box-shadow: 0 0 0 9px rgba(255,92,57,0); } 100% { box-shadow: 0 0 0 0 rgba(255,92,57,0); } }
  @keyframes fr-bump { 0% { transform: scale(1); } 40% { transform: scale(1.12); } 100% { transform: scale(1); } }
  @keyframes fr-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(7px); } }
  @keyframes fr-dotin { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .fr-dots circle { transform-box: fill-box; transform-origin: center; opacity: 0; }
  .fr-dots.on circle { animation: fr-dotin 0.45s cubic-bezier(.2,.8,.2,1) both; opacity: 1; }
  html { scroll-behavior: smooth; }
  @media (hover: none) { .ft-kbd-hint { display: none; } }
  @media (prefers-reduced-motion: reduce) {
    .ft-root *, .ft-root *::before, .ft-root *::after { animation-duration: 0.01ms !important; transition-duration: 0.12s !important; }
  }
`;
