// Reading telemetry, only with ?eval=1 (otherwise every function is a no-op).
// Events go to /api/survey/log-batch under a session code shown on screen.

import { useEffect, useRef } from 'react';

const ENDPOINT = '/api/survey/log-batch';

let pid = null;
let artifact = null;
let queue = [];

// A short, human-friendly participant code (no ambiguous 0/O/1/I/L) minted when
// an artifact is opened with ?eval=1, shown on-screen for the reader to paste
// into the questionnaire, so the answers can be joined to the telemetry.
function genEvalCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)];
  return s;
}

function showCodeBadge(code) {
  if (typeof document === 'undefined' || document.getElementById('relish-eval-badge')) return;
  const bar = document.createElement('div');
  bar.id = 'relish-eval-badge';
  bar.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);' +
    'z-index:2147483647;display:flex;align-items:center;gap:10px;background:#1f1300;color:#fff;' +
    'padding:8px 14px;border-radius:999px;font:500 14px/1.2 system-ui,-apple-system,sans-serif;' +
    'box-shadow:0 4px 16px rgba(0,0,0,.3);max-width:92vw;';
  const label = document.createElement('span');
  label.textContent = 'Questionnaire code:';
  label.style.opacity = '.85';
  const strong = document.createElement('strong');
  strong.textContent = code;
  strong.style.cssText = 'letter-spacing:2px;font-size:16px;';
  const btn = document.createElement('button');
  btn.textContent = 'Copy';
  btn.style.cssText = 'cursor:pointer;border:none;border-radius:999px;padding:5px 12px;' +
    'background:#C84B31;color:#fff;font:600 13px system-ui,sans-serif;';
  btn.onclick = () => {
    try { navigator.clipboard.writeText(code); } catch (_) {}
    btn.textContent = 'Copied ✓';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
  };
  bar.appendChild(label); bar.appendChild(strong); bar.appendChild(btn);
  document.body.appendChild(bar);
}

function removeCodeBadge() {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('relish-eval-badge');
  if (el) el.remove();
}

function flush(useBeacon = false) {
  if (!queue.length) return;
  const body = JSON.stringify({ events: queue.splice(0, queue.length) });
  try {
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
        .catch(() => {});
    }
  } catch (_) { /* telemetry must never break the artifact */ }
}

// Log one event. Safe to call from anywhere: no-op unless an evaluation session is active.
export function evalog(eventType, payload = {}) {
  if (!pid) return;
  queue.push({
    surveyType: 'eval_telemetry',
    sessionId: pid,
    eventType,
    questionName: artifact,
    answer: payload,
    timestamp: new Date().toISOString(),
  });
  if (queue.length >= 25) flush();
}

// Mount in an artifact's root component. Returns a cleanup function.
export function initEvalTelemetry(artifactId) {
  if (typeof window === 'undefined') return () => {};
  const params = new URLSearchParams(window.location.search);
  // A new code per page load.
  if (!params.has('eval')) return () => {};
  pid = genEvalCode();
  artifact = artifactId;
  showCodeBadge(pid);

  evalog('eval_session_start', {
    vw: window.innerWidth, vh: window.innerHeight,
    ua: navigator.userAgent.slice(0, 140),
  });

  let maxDepth = 0;
  let lastSent = 0;
  const onScroll = () => {
    const now = Date.now();
    if (now - lastSent < 2000) return; // throttle
    const doc = document.documentElement;
    const depth = Math.min(100, Math.round(
      (100 * (window.scrollY + window.innerHeight)) / Math.max(doc.scrollHeight, 1)));
    if (depth > maxDepth) {
      maxDepth = depth;
      lastSent = now;
      evalog('eval_scroll', { depth, y: Math.round(window.scrollY) });
    }
  };
  const onCustom = e => evalog('eval_interaction', e.detail || {});
  const onHide = () => { evalog('eval_end', { maxDepth }); flush(true); };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('evalog', onCustom);
  window.addEventListener('pagehide', onHide);
  const interval = setInterval(() => flush(), 5000);

  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('evalog', onCustom);
    window.removeEventListener('pagehide', onHide);
    clearInterval(interval);
    flush();
    removeCodeBadge();
    pid = null; artifact = null;
  };
}

// Time spent in each phase (the section that last crossed 55% of the viewport).
export function usePhaseDwell(phaseIds) {
  const ref = useRef({ id: null, since: null });
  useEffect(() => {
    if (!phaseIds || !phaseIds.length) return undefined;
    let raf = null;
    const emit = () => {
      const d = ref.current;
      if (d.id != null) evalog('eval_interaction',
        { t: 'phase_dwell', phase: d.id, ms: Date.now() - d.since });
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        let current = null;
        phaseIds.forEach(id => {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.55) current = id;
        });
        if (current !== ref.current.id) {
          emit();
          ref.current = { id: current, since: Date.now() };
        }
      });
    };
    const onHide = () => { emit(); ref.current = { id: null, since: null }; };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', onHide);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', onHide);
      if (raf) cancelAnimationFrame(raf);
      onHide();
    };
  }, [phaseIds]);
}

// One reader interaction in /the_borrowed_plate (guess, quiz answer, ...).
export function storylog(type, payload = {}) {
  evalog('eval_interaction', { t: type, ...payload });
}
