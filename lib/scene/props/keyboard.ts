// Rama Works U80-A in Milk (white): a WKL TKL in a one-piece wedge case with thin, even bezels, softly
// rounded corners and a crisp chamfered top edge. The top of the case is solid, with a tight cutout
// for each cluster of keys (Esc, the three F groups, PrtSc-Pause, alphas, nav block, arrows) over a
// dark plate. A polished brass weight bar runs under the back, its ends showing in a window low on
// each side. Underneath: rubber foot strips front and back, and four screws.
// Keycaps are a sculpted Cherry-style set with dished tops: cream alphas, charcoal modifiers, orange
// Esc and Enter. Front (the spacebar side) faces +z. Units: 1 = 160 mm.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { box, cyl, reflective, std } from './kit';

const U = 0.119; // one key unit, 19.05 mm
const KEYS_W = 18.25 * U, KEYS_D = 6.5 * U;
const SIDE = 0.7 * U, FRONT_BEZEL = 0.7 * U, BACK_BEZEL = 0.9 * U;
const CW = KEYS_W + 2 * SIDE, CD = KEYS_D + FRONT_BEZEL + BACK_BEZEL;
const H_FRONT = 0.115, H_BACK = 0.233; // about 18 mm and 37 mm: a 7 degree typing angle
const RADIUS = 0.04;
/** Height of the case's top rim at depth z (front edge at +CD/2). */
const rimY = (z: number) => H_FRONT + (H_BACK - H_FRONT) * (CD / 2 - z) / CD;

type Key = [width: number, colour: 'a' | 'm' | 'x'];
// rows from the back (F row) to the front; gaps are negative widths
const ROWS: { y: number; keys: Key[] }[] = [
  { y: 0, keys: [[1, 'x'], [-1, 'm'], [1, 'm'], [1, 'm'], [1, 'm'], [1, 'm'], [-0.5, 'm'], [1, 'a'], [1, 'a'], [1, 'a'], [1, 'a'], [-0.5, 'm'], [1, 'm'], [1, 'm'], [1, 'm'], [1, 'm'], [-0.25, 'm'], [1, 'm'], [1, 'm'], [1, 'm']] },
  { y: 1.5, keys: [...Array.from({ length: 13 }, (): Key => [1, 'a']), [2, 'm'], [-0.25, 'm'], [1, 'm'], [1, 'm'], [1, 'm']] },
  { y: 2.5, keys: [[1.5, 'm'], ...Array.from({ length: 12 }, (): Key => [1, 'a']), [1.5, 'a'], [-0.25, 'm'], [1, 'm'], [1, 'm'], [1, 'm']] },
  { y: 3.5, keys: [[1.75, 'm'], ...Array.from({ length: 11 }, (): Key => [1, 'a']), [2.25, 'x']] },
  { y: 4.5, keys: [[2.25, 'm'], ...Array.from({ length: 10 }, (): Key => [1, 'a']), [2.75, 'm'], [-1.25, 'm'], [1, 'm']] },
  { y: 5.5, keys: [[1.5, 'm'], [1, 'm'], [1.5, 'm'], [7, 'a'], [1.5, 'm'], [1, 'm'], [1.5, 'm'], [-0.25, 'm'], [1, 'm'], [1, 'm'], [1, 'm']] },
];
// Cherry-style sculpt, back row to front: cap height and extra tilt toward the typist
const SCULPT = [[0.078, 0.16], [0.078, 0.14], [0.07, 0.06], [0.064, 0], [0.066, -0.08], [0.066, -0.08]];

// clusters of keys, in key units from the top-left of the key area: [x0, x1, y0, y1]
const CLUSTERS: [number, number, number, number][] = [
  [0, 1, 0, 1], [2, 6, 0, 1], [6.5, 10.5, 0, 1], [11, 15, 0, 1], [15.25, 18.25, 0, 1],
  [0, 15, 1.5, 6.5], [15.25, 18.25, 1.5, 3.5],
];
// the arrow keys' inverted T, as a polygon
const ARROWS: [number, number][] = [[16.25, 4.5], [17.25, 4.5], [17.25, 5.5], [18.25, 5.5], [18.25, 6.5], [15.25, 6.5], [15.25, 5.5], [16.25, 5.5]];

function keycap(width: number, h: number) {
  // the base is 0.05u short of the pitch (about 1 mm gaps); the top is about 0.7u across
  const w = width * U - 0.05 * U, d = U - 0.05 * U, inset = 0.125 * U;
  const g = new RoundedBoxGeometry(w, h, d, 2, 0.012);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const top = h / 2;
  for (let i = 0; i < pos.count; i++) {
    const x0 = pos.getX(i), y = pos.getY(i), z0 = pos.getZ(i);
    const k = (y + h / 2) / h; // 0 at the bottom, 1 at the top
    // Cherry-style taper on every side, the same whatever the width, and a shallow dish across the top
    const x = x0 - Math.sign(x0) * inset * k, z = z0 - Math.sign(z0) * inset * k;
    const dish = 0.006 * Math.max(0, 1 - (x0 / (w / 2)) ** 2) * THREE.MathUtils.smoothstep(y, top - 0.012, top);
    pos.setXYZ(i, x, y - dish, z);
  }
  g.translate(0, h / 2, 0);
  g.computeVertexNormals();
  return g;
}

function roundedRect(w: number, d: number, r: number, cz = 0) {
  const x0 = -w / 2, x1 = w / 2, y0 = -d / 2 + cz, y1 = d / 2 + cz;
  const p = new THREE.Path();
  p.moveTo(x0 + r, y0);
  p.lineTo(x1 - r, y0); p.quadraticCurveTo(x1, y0, x1, y0 + r);
  p.lineTo(x1, y1 - r); p.quadraticCurveTo(x1, y1, x1 - r, y1);
  p.lineTo(x0 + r, y1); p.quadraticCurveTo(x0, y1, x0, y1 - r);
  p.lineTo(x0, y0 + r); p.quadraticCurveTo(x0, y0, x0 + r, y0);
  return p.getPoints(8);
}

export function buildKeyboard() {
  const g = new THREE.Group();
  g.name = 'keyboard';
  const milk = reflective(std('#ecebe7', 0.36, 0.05), 0.6);

  // case: the footprint with a cutout per key cluster, raised as a wall, then sheared so the top follows
  // the typing angle; a narrow chamfer catches the light on every edge. The shape is drawn in (x, -z)
  // and stood up. Cutouts clear the keycaps by 0.04u, plus the chamfer, which eats into each opening.
  const keysZ = CD / 2 - FRONT_BEZEL - KEYS_D / 2; // centre of the key area (nearer the front than the back)
  const B = 0.006;
  const ux = (u: number) => -KEYS_W / 2 + u * U, uy = (u: number) => -(keysZ - KEYS_D / 2 + u * U); // key units -> shape coords
  const c = 0.04 * U + B;
  const caseShape = new THREE.Shape(roundedRect(CW, CD, RADIUS));
  caseShape.holes = [
    ...CLUSTERS.map(([x0, x1, y0, y1]) => new THREE.Path([
      new THREE.Vector2(ux(x0) - c, uy(y0) + c), new THREE.Vector2(ux(x1) + c, uy(y0) + c),
      new THREE.Vector2(ux(x1) + c, uy(y1) - c), new THREE.Vector2(ux(x0) - c, uy(y1) - c),
    ])),
    new THREE.Path(ARROWS.map(([x, y], i) => {
      // push each corner outward: right-hand points right, top points up (shape y runs the other way to z)
      const dx = [-1, 1, 1, 1, 1, -1, -1, -1][i], dy = [1, 1, 1, 1, -1, -1, 1, 1][i];
      return new THREE.Vector2(ux(x) + dx * c, uy(y) + dy * c);
    })),
  ];
  const caseGeo = new THREE.ExtrudeGeometry(caseShape, { depth: 1, bevelEnabled: true, bevelSize: B, bevelThickness: B, bevelSegments: 1 });
  caseGeo.rotateX(-Math.PI / 2); // the extrusion now runs up y, and the shape's y became -z
  const pos = caseGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), top = rimY(pos.getZ(i)) - B;
    // 0..1 is the wall, stretched to the rim height here; the bevels above and below keep their size
    pos.setY(i, y < 0 ? y + B : y > 1 ? top + (y - 1) : B + y * (top - B));
  }
  caseGeo.computeVertexNormals();
  g.add(new THREE.Mesh(caseGeo, milk));

  // the plate under the keys: dark, following the typing angle a little below the rim
  const slope = Math.atan2(H_BACK - H_FRONT, CD);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(KEYS_W + 0.02, KEYS_D + 0.02), reflective(std('#26272b', 0.3, 0.6), 0.8)); // mirror-PVD plate
  plate.rotation.x = -Math.PI / 2 + slope;
  plate.position.set(0, rimY(keysZ) - 0.045, keysZ);
  g.add(plate);
  box(g, CW - 0.04, 0.01, CD - 0.04, std('#1c1d20', 0.8), [0, 0.02, 0]); // floor, so no light leaks under the plate

  // keycaps, merged by colour
  const groups: Record<'a' | 'm' | 'x', THREE.BufferGeometry[]> = { a: [], m: [], x: [] };
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  const left = -KEYS_W / 2, back = keysZ - KEYS_D / 2;
  ROWS.forEach((row, r) => {
    const [h, tilt] = SCULPT[r];
    const z = back + (row.y + 0.5) * U;
    q.setFromEuler(e.set(slope + tilt, 0, 0));
    let x = 0;
    for (const [w, c] of row.keys) {
      if (w < 0) { x += -w; continue; }
      const geo = keycap(w, h);
      m.compose(new THREE.Vector3(left + (x + w / 2) * U, rimY(z) - 0.012, z), q, one);
      geo.applyMatrix4(m);
      groups[c].push(geo);
      x += w;
    }
  });
  const mats = { a: reflective(std('#ebe6d6', 0.42), 0.25), m: reflective(std('#34373e', 0.42), 0.35), x: reflective(std('#ef7c43', 0.42), 0.25) };
  for (const k of ['a', 'm', 'x'] as const) {
    const merged = BufferGeometryUtils.mergeGeometries(groups[k], false);
    groups[k].forEach((geo) => geo.dispose());
    if (merged) g.add(new THREE.Mesh(merged, mats[k]));
  }

  // the small notch in the middle of the back edge
  box(g, 0.07, 0.014, 0.02, std('#c9c8c3', 0.5), [0, rimY(-CD / 2) + 0.004, -CD / 2 + 0.012]);

  // The brass weight: a bar under the back of the case, 18.5 to 49 mm in from the back edge and the full
  // width (Rama's straight-down render of the underside). Its ends show through a window cut up from the
  // bottom of each side wall, 16 mm high (about half the wall there, from a photo of the side), flush
  // with the wall; its underside sits just proud of the base. Mirror-polished PVD brass.
  // (a touch less than mirror, and a little diffuse, so at night it catches the room's lights as warm
  // gold instead of reflecting the dark room as a black slot)
  const brass = reflective(std('#e3b86e', 0.32, 0.6), 1.4);
  const W0 = 0.12 * CD, W1 = 0.32 * CD, WH = 0.1;
  box(g, CW + 2 * B + 0.0016, WH + 0.004, W1 - W0, brass, [0, (WH - 0.004) / 2, -CD / 2 + (W0 + W1) / 2]);

  // underneath: rubber strips front and back, four screws
  for (const z of [-CD / 2 + 0.07, CD / 2 - 0.07]) box(g, CW * 0.8, 0.008, 0.035, std('#1a1a1c', 0.9), [0, -0.004, z]);
  for (const x of [-CW / 2 + 0.12, CW / 2 - 0.12]) for (const z of [-0.08, 0.12]) cyl(g, 0.018, 0.018, 0.004, std('#9aa0a8', 0.35, 0.8), [x, -0.002, z], undefined, 12);
  return g;
}
