// Where the page scrolls. On touch screens it is <main>, a box the size of the screen (globals.css), rather
// than the document. When the document scrolls, a phone's browser slides its address and tool bars away
// and back, resizing the viewport as it goes, and iOS Safari lands a scroll snap for one size and corrects
// it once the bars have settled: the page stops, then jumps a bar's height or more, on every turn between
// the intro and Work (the bars come and go at the top of the page). A box scrolling inside a screen that
// never changes size leaves the bars where they are, and its snapping is the native, in-step kind.
// Elsewhere the document scrolls as usual, so the keys, the scrollbar and find-in-page work as they would.

/** Screens whose page scrolls in the box (matches the CSS in globals.css). */
export const BOXED_QUERY = '(hover: none) and (pointer: coarse)';

const box = () => (window.matchMedia(BOXED_QUERY).matches ? document.querySelector<HTMLElement>('main') : null);

/** The element that scrolls the page. */
export const scroller = (): HTMLElement => box() ?? ((document.scrollingElement as HTMLElement | null) || document.documentElement);

/** How far the page is scrolled. */
export const scrollTop = () => { const b = box(); return b ? b.scrollTop : window.scrollY; };

/** The height of the scrolled view. */
export const viewHeight = () => { const b = box(); return b ? b.clientHeight : window.innerHeight; };

/** Where an element's top sits in the scrolled page. */
export const contentTop = (el: Element) => {
  const b = box();
  return el.getBoundingClientRect().top - (b ? b.getBoundingClientRect().top : 0) + scrollTop();
};

/** Call fn whenever the page scrolls, either way; returns the unsubscribe. */
export function onScroll(fn: () => void) {
  const main = document.querySelector('main');
  window.addEventListener('scroll', fn, { passive: true });
  main?.addEventListener('scroll', fn, { passive: true });
  return () => { window.removeEventListener('scroll', fn); main?.removeEventListener('scroll', fn); };
}
