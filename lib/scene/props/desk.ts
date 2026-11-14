// A white sit-stand desk, 1600 x 800 mm at 720 mm, with a felt desk mat.
import * as THREE from 'three';
import { box, rbox, std } from './kit';

export const DESK = { width: 10, depth: 5, floor: -4.5 };

export function buildDesk() {
  const g = new THREE.Group();
  g.name = 'desk';
  const top = std('#eef0f2', 0.5);
  const frame = std('#e3e6ea', 0.42, 0.15);
  const dark = std('#2a2c31', 0.5);

  rbox(g, DESK.width, 0.16, DESK.depth, 0.05, top, [0, -0.08, 0]);
  box(g, 8.2, 0.2, 0.3, frame, [0, -0.26, -0.7]); // crossbar under the top
  for (const x of [-3.9, 3.9]) {
    box(g, 0.34, 0.18, 4.2, frame, [x, -0.25, 0]); // bracket along the depth
    rbox(g, 0.46, 1.9, 0.36, 0.04, frame, [x, -1.3, -0.7]); // upper stage of the column
    rbox(g, 0.56, 2.1, 0.46, 0.05, frame, [x, -3.27, -0.7]); // lower stage
    rbox(g, 0.5, 0.22, 4.3, 0.08, frame, [x, -4.39, -0.4]); // foot
  }
  rbox(g, 0.9, 0.12, 0.3, 0.04, dark, [3.6, -0.22, 2.38]); // height controller under the front edge
  return g;
}

export function buildDeskMat() {
  const g = new THREE.Group();
  g.name = 'desk-mat';
  rbox(g, 5.6, 0.025, 2.3, 0.012, std('#2a2d33', 1), [0, 0.0125, 0]);
  return g;
}
