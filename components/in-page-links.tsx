'use client';

import { useEffect } from 'react';
import { glideTo, pageTop } from '@/lib/glide-scroll';

/**
 * Links to a section of the page (the nav, the dock, the brand, "See my work") scroll to it here instead of
 * navigating to the fragment. A fragment navigation adds a history entry and fires popstate, and Next's
 * router reloads the page on a popstate whose state it does not recognise, which on an iPhone replayed the
 * whole intro. This glides there as a wheel's page turn does (glide-scroll.ts), keeps the address in step
 * without adding an entry, and moves focus to the section as the fragment would have.
 */
export default function InPageLinks() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href^="#"]');
      const target = a && a.hash.length > 1 ? document.getElementById(decodeURIComponent(a.hash.slice(1))) : null;
      if (!a || !target) return;
      e.preventDefault();
      glideTo(pageTop(target));
      target.focus({ preventScroll: true });
      if (location.hash !== a.hash) history.replaceState(history.state, '', a.hash);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}
