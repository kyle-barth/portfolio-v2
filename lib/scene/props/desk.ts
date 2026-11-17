// A white sit-stand desk, 2000 x 800 mm at 720 mm, with a cloth desk mat printed with liquid marble.
import * as THREE from 'three';
import { box, canvasTexture, rbox, std } from './kit';

/**
 * Liquid marble in black, greys and white: a flow field (two rounds of sine domain-warping) cut into
 * bands, each band edged in near-black, with a stitched black border. 900 x 368 mm, so 1024 x 420 px.
 */
function marbleTexture() {
  const W = 1024, H = 420;
  const bands: [number, number[]][] = [ // band start (0..1 of the cycle), colour
    [0, [14, 14, 15]], [0.16, [52, 53, 56]], [0.3, [104, 106, 110]], [0.42, [176, 178, 181]], [0.54, [222, 222, 222]],
    [0.62, [150, 152, 156]], [0.72, [70, 71, 74]], [0.84, [24, 24, 26]],
  ];
  return canvasTexture(W, H, (x) => {
    const img = x.createImageData(W, H);
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const nx = (px / W) * 4.9, ny = (py / H) * 2;
      const qx = nx + 0.55 * Math.sin(1.7 * ny + 0.3) + 0.25 * Math.sin(3.1 * ny + 1.7 * nx + 2);
      const qy = ny + 0.55 * Math.sin(1.3 * nx + 1.2) + 0.25 * Math.sin(2.7 * nx - 1.9 * ny + 0.5);
      const rx = qx + 0.35 * Math.sin(2.3 * qy + 4), ry = qy + 0.35 * Math.sin(2.1 * qx + 1);
      const f = rx * 0.9 + 0.6 * Math.sin(ry * 1.6 + rx * 0.7) + 0.2 * Math.sin(ry * 4.1 - rx * 1.3);
      const t = (((f * 1.4) % 1) + 1) % 1;
      let i = bands.length - 1;
      while (i > 0 && t < bands[i][0]) i--;
      const start = bands[i][0], end = i + 1 < bands.length ? bands[i + 1][0] : 1;
      const edge = Math.min(t - start, end - t); // distance to the nearest band boundary
      const k = edge < 0.008 ? 0.25 : edge < 0.016 ? 0.6 : 1; // a thin dark line between colours
      const c = bands[i][1], o = (py * W + px) * 4;
      img.data[o] = c[0] * k; img.data[o + 1] = c[1] * k; img.data[o + 2] = c[2] * k; img.data[o + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    // stitched black edge
    x.strokeStyle = '#0b0b0c'; x.lineWidth = 10; x.strokeRect(5, 5, W - 10, H - 10);
    x.strokeStyle = 'rgba(70,70,74,.7)'; x.lineWidth = 1.5; x.setLineDash([5, 4]); x.strokeRect(5, 5, W - 10, H - 10);
  });
}

export const DESK = { width: 12.5, depth: 5, floor: -4.5 };
/** The frame's legs, in from each end of the top. */
const LEG_X = DESK.width / 2 - 1.1;

export function buildDesk() {
  const g = new THREE.Group();
  g.name = 'desk';
  const top = std('#eef0f2', 0.5);
  const frame = std('#e3e6ea', 0.42, 0.15);
  const dark = std('#2a2c31', 0.5);

  rbox(g, DESK.width, 0.16, DESK.depth, 0.05, top, [0, -0.08, 0]);
  box(g, 2 * LEG_X + 0.4, 0.2, 0.3, frame, [0, -0.26, -0.7]); // crossbar under the top
  for (const x of [-LEG_X, LEG_X]) {
    box(g, 0.34, 0.18, 4.2, frame, [x, -0.25, 0]); // bracket along the depth
    rbox(g, 0.46, 1.9, 0.36, 0.04, frame, [x, -1.3, -0.7]); // upper stage of the column
    rbox(g, 0.56, 2.1, 0.46, 0.05, frame, [x, -3.27, -0.7]); // lower stage
    rbox(g, 0.5, 0.22, 4.3, 0.08, frame, [x, -4.39, -0.4]); // foot
  }
  rbox(g, 0.9, 0.12, 0.3, 0.04, dark, [LEG_X - 0.3, -0.22, 2.38]); // height controller under the front edge
  return g;
}

export function buildDeskMat() {
  const g = new THREE.Group();
  g.name = 'desk-mat';
  const tex = marbleTexture();
  tex.anisotropy = 8; // seen at a glancing angle from the camera
  rbox(g, 5.6, 0.025, 2.3, 0.012, std('#ffffff', 0.92, 0, { map: tex }), [0, 0.0125, 0]);
  return g;
}
