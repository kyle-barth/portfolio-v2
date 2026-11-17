// Scroll position as a continuous "stage": 0 at the intro, 1 at Work, 2 at Experience, 3 at Contact.
// The camera eases between shots on it; the nav uses the rounded value.
import { scrollTop, viewHeight } from './page-scroll';

export function measureAnchors(sections: HTMLElement[]) {
  const vh = viewHeight();
  return sections.map((s) => s.offsetTop + Math.min(s.offsetHeight, vh) * 0.5);
}

export function stageAt(anchors: number[]) {
  if (!anchors.length) return 0;
  const mid = scrollTop() + viewHeight() * 0.5;
  if (mid <= anchors[0]) return 0;
  for (let i = 0; i < anchors.length - 1; i++) {
    if (mid < anchors[i + 1]) return i + (mid - anchors[i]) / (anchors[i + 1] - anchors[i]);
  }
  return anchors.length - 1;
}
