'use client';

import { useEffect } from 'react';
import { WheelGestures } from 'wheel-gestures';
import { glideTo, glidingTo } from '@/lib/glide-scroll';
import { scroller, scrollTop, viewHeight } from '@/lib/page-scroll';

/** How long the page is given to catch up with where a gesture sent it (a wheel's own smooth scroll). */
const CATCH_UP_MS = 1500;
/** A gesture starting this soon after one ended coasting may be that coast, resumed after a hitch
 *  (where the browser doesn't say which events are coasting). */
const BRIDGE_MS = 250;

/**
 * Mouse wheels and touchpads turn the page a section at a time: a scroll down from the intro goes to
 * Work just as its link would, the next to Experience, and a scroll up goes back. Touch and the keys
 * page by the CSS's scroll snapping (globals.css), which a browser applies natively; wheels are paged
 * here because browsers snap a short wheel or touchpad scroll back to the section it started from.
 *
 * One gesture turns one page. wheel-gestures says where a gesture starts: a notch or a spin of the wheel,
 * or a touchpad swipe together with all of its coasting, which it tells by how the events slow down (or
 * by the browser's own flag, where there is one); a new swipe that cuts the coasting short starts a new
 * gesture. A section taller than the screen scrolls as normal, a gesture stopping at its end; the next
 * one that way turns the page. A turn glides (glide-scroll.ts); a wheel used while it does steers it.
 */
export default function SectionPager() {
  useEffect(() => {
    // for the gesture under way: used: it has done its one thing (turned a page, or scrolled within a
    // tall section); turned: it turned a page, so the rest of it (its coasting, more notches) moves nothing
    let used = false, turned = false;
    // aim: where the page has been sent. A turn glides for most of a second, and browsers ease a wheel's
    // own scroll over a few frames (Firefox especially), so scrollY lags behind it: checking scrollY would
    // let a fast gesture run past the end of a section, or a quick second one turn to the page the first is
    // already going to.
    let aim: number | null = null, aimedAt = -Infinity;
    const sendTo = (y: number, now: number) => { aim = y; aimedAt = now; };
    const fresh = (now: number) => {
      used = turned = false;
      // still on its way to the last aim (or gliding, a link's glide included): carry on from there
      const arrived = aim === null || Math.abs(scrollTop() - aim) <= 2 || now - aimedAt > CATCH_UP_MS;
      aim = glidingTo() ?? (arrived ? null : aim);
    };

    // A hitch of a few frames while a swipe coasts (40 ms will do) makes wheel-gestures end the gesture
    // there, and the rest of the coast would start another and turn a second page. So a gesture that starts
    // mid-coast is taken as that coast resuming (bridging). Chrome marks each coasting event itself
    // (WheelEvent.momentum), which settles it. Elsewhere, a gesture starting soon after one ended coasting
    // bridges until it goes well past the speed the coast had got down to, which coasting never does: then
    // it is a new swipe. Speeds are per millisecond, so events the browser has merged, or a gap in them,
    // read as the same speed.
    let coastEndedAt = -Infinity, bridging = false, coastSpeed = 0, lastAt = -Infinity;
    const speeds: number[] = []; // the latest few
    const marked = (e: unknown) => (e as { momentum?: boolean }).momentum; // a boolean where the browser says

    // the gestures' own reading of the wheel; the page is moved (or not) by onWheel below
    const gestures = WheelGestures({ preventWheelAction: false, reverseSign: false });
    gestures.on('wheel', ({ isStart, isEnding, isMomentum, isMomentumCancel, event }) => {
      if (isEnding) coastEndedAt = isMomentum && !isMomentumCancel ? lastAt : -Infinity;
      if (!isStart) return;
      const coasting = marked(event);
      bridging = typeof coasting === 'boolean' ? coasting : event.timeStamp - coastEndedAt < BRIDGE_MS;
      coastSpeed = speeds.length ? Math.max(...speeds) : 0;
      if (!bridging) fresh(event.timeStamp);
    });

    // an element under the pointer that can still scroll that way itself (a list, a code block) keeps the wheel
    // (the page's own scroller is the one paged here: page-scroll.ts)
    const scrollsItself = (el: Element | null, dir: number) => {
      const page = scroller();
      for (; el && el !== document.body && el !== document.documentElement && el !== page; el = el.parentElement) {
        const s = getComputedStyle(el);
        if (!/(auto|scroll)/.test(s.overflowY) || el.scrollHeight <= el.clientHeight) continue;
        if (dir > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0) return true;
      }
      return false;
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.defaultPrevented) return; // pinch zoom, or someone else's
      gestures.feedWheel(e); // a new gesture resets the state above
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
      if (!dy || Math.abs(dy) < Math.abs(e.deltaX)) return; // sideways
      const dir = Math.sign(dy), now = e.timeStamp;
      // (events come at most every 8 ms, at 120 Hz: a closer pair is timing noise)
      const speed = Math.abs(dy) / Math.max(8, now - lastAt);
      lastAt = now;
      speeds.push(speed);
      if (speeds.length > 3) speeds.shift();
      // (where the browser marks coasting, a new swipe comes unmarked, and wheel-gestures starts a gesture for it)
      if (bridging && typeof marked(e) !== 'boolean' && speed > coastSpeed * 2 + 0.3) { bridging = false; fresh(now); }
      if (turned) { e.preventDefault(); return; }

      if (scrollsItself(e.target as Element | null, dir)) return;
      const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-stage]'));
      if (!sections.length) return;
      const gliding = glidingTo(); // (a link's glide too)
      const y = gliding ?? aim ?? scrollTop(), vh = viewHeight();
      let i = 0;
      while (i + 1 < sections.length && sections[i + 1].offsetTop <= y + 2) i++;
      const top = sections[i].offsetTop, bottom = top + sections[i].offsetHeight;
      // more of this section to see that way: scroll it as normal (or, while the page glides, steer the
      // glide that far), but no further than its end (this gesture stops there; the next one turns the page)
      const room = dir > 0 ? bottom - vh - y : y - top;
      if (room > 2) {
        used = true;
        if (Math.abs(dy) < room && gliding === null) { sendTo(y + dy, now); return; }
        e.preventDefault();
        const to = Math.abs(dy) < room ? y + dy : dir > 0 ? bottom - vh : top;
        sendTo(to, now);
        glideTo(to);
        return;
      }

      e.preventDefault();
      if (used) return; // this gesture has done its one thing
      const next = sections[i + dir];
      if (!next) return;
      used = turned = true;
      sendTo(next.offsetTop, now);
      glideTo(next.offsetTop);
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  return null;
}
