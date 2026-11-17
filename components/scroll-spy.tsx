'use client';

import { useEffect } from 'react';
import { onScroll } from '@/lib/page-scroll';
import { measureAnchors, stageAt } from '@/lib/scroll-stage';

/** Marks the nav link for the section in view, and tells the CSS which side the panel is on. */
export default function ScrollSpy() {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-stage]'));
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-nav]'));
    let anchors = measureAnchors(sections);
    let last = -1;

    const update = () => {
      const idx = Math.round(stageAt(anchors));
      if (idx === last) return;
      last = idx;
      const id = sections[idx]?.id;
      links.forEach((a) => a.setAttribute('aria-current', String(a.dataset.nav === id)));
      document.body.dataset.side = id === 'experience' ? 'right' : 'left';
    };
    const remeasure = () => {
      anchors = measureAnchors(sections);
      last = -1;
      update();
    };

    const ro = new ResizeObserver(remeasure);
    ro.observe(document.body);
    const unScroll = onScroll(update);
    window.addEventListener('resize', remeasure);
    update();
    return () => {
      ro.disconnect();
      unScroll();
      window.removeEventListener('resize', remeasure);
    };
  }, []);

  return null;
}
