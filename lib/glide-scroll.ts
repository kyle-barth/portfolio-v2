// Page turns (a wheel's, a section link's, a click on the desk) glide on a timed ease, driven here a frame
// at a time rather than left to the browser's own smooth scrolling. That is off wherever the system turns
// animations off (Chrome on Windows with "Animation effects" off, Firefox with smooth scrolling off, and
// any browser asked for reduced motion, where the page's CSS turns it off too), and there a turn would
// jump a whole screen in one frame. The glide is the page's one piece of scrolling motion, so like the
// camera's pull-back it runs for everyone, slower (a lower top speed) with reduced motion on.
//
// The ease is a cubic from where the page is, at the speed it is going, to a stop at the target: from rest
// that is a smoothstep (ease in, ease out), and a new target while it glides (the wheel steering it) is
// taken over without a jolt. While it runs, the page's scroll snapping is off (it would pull each step back
// to a section) and so is CSS's smooth scrolling (each step is placed exactly). Both come back when it
// lands, which is on a snap position, so nothing moves. A touch, a key or a mouse press stops it where it
// is (snapping takes over from there). It moves whatever scrolls the page (page-scroll.ts).

import { contentTop, scroller, scrollTop, viewHeight } from './page-scroll';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches && document.documentElement.dataset.motion !== 'full';

type Run = { el: HTMLElement; from: number; to: number; m0: number; ms: number; t0: number; at: number; raf: number };
let run: Run | null = null;

// the cubic (Hermite) from `from` with slope m0 to `to` with slope 0, at s in [0, 1]; its speed is per ms
const posAt = (r: Run, s: number) => { const s2 = s * s, s3 = s2 * s; return (2 * s3 - 3 * s2 + 1) * r.from + (s3 - 2 * s2 + s) * r.m0 + (-2 * s3 + 3 * s2) * r.to; };
const speedAt = (r: Run, s: number) => { const s2 = s * s; return ((6 * s2 - 6 * s) * r.from + (3 * s2 - 4 * s + 1) * r.m0 + (-6 * s2 + 6 * s) * r.to) / r.ms; };
const progress = (r: Run, now: number) => (r.t0 < 0 ? 0 : Math.min(1, (now - r.t0) / r.ms));

function release() {
  if (!run) return;
  cancelAnimationFrame(run.raf);
  run.el.style.scrollSnapType = '';
  run.el.style.scrollBehavior = '';
  run = null;
  removeEventListener('touchstart', release);
  removeEventListener('keydown', release);
  removeEventListener('mousedown', release);
}

/** Where the page is gliding to, or null when it isn't. */
export const glidingTo = () => run?.to ?? null;

/** Where an element's top sits on the page. */
export const pageTop = contentTop;

/** Glide the page to y. A glide under way is taken over from where it has got to, at its speed. */
export function glideTo(y: number) {
  const el = scroller();
  if (run && run.el !== el) release(); // (the screen changed kind mid-glide)
  const to = Math.round(Math.max(0, Math.min(el.scrollHeight - viewHeight(), y)));
  let from = scrollTop(), speed = 0; // px per ms
  if (run) {
    const s = progress(run, run.at);
    from = posAt(run, s);
    speed = speedAt(run, s);
    cancelAnimationFrame(run.raf);
  } else {
    el.style.scrollSnapType = 'none';
    el.style.scrollBehavior = 'auto';
    addEventListener('touchstart', release, { passive: true });
    addEventListener('keydown', release);
    addEventListener('mousedown', release);
  }
  const d = to - from;
  // a screen's height in about 0.73 s, a notch's worth in 0.4; slower with reduced motion
  const ms = (reduced() ? 1.25 : 1) * Math.min(900, 380 + Math.abs(d) * 0.35);
  // carry the speed in, but never so much that it would overshoot (a slope up to 3x the distance can't),
  // or set off far the wrong way
  const m0 = Math.max(Math.min(2 * d, -0.5 * d), Math.min(Math.max(2 * d, -0.5 * d), speed * ms));
  const r: Run = { el, from, to, m0, ms, t0: -1, at: performance.now(), raf: 0 };
  run = r;
  const step = (now: number) => {
    if (run !== r) return;
    if (r.t0 < 0) r.t0 = now;
    r.at = now;
    const s = Math.abs(d) < 1 ? 1 : progress(r, now);
    el.scrollTo(0, s < 1 ? posAt(r, s) : to);
    if (s < 1) r.raf = requestAnimationFrame(step);
    else release();
  };
  r.raf = requestAnimationFrame(step);
}
