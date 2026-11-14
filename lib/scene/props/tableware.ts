// Coffee in a cream stoneware mug on a walnut coaster, and a pink-iced donut on a slate stoneware plate.
// Each origin is the surface the piece stands on. Units: 1 = 160 mm.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { add, canvasTexture, cyl, lathe, reflective, seeded, std } from './kit';

const COASTER_H = 0.035;
/** Height of the mug's rim above the surface the coaster sits on (the steam starts here). */
export const MUG_RIM = COASTER_H + 0.58;

const smooth = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

/** A (u, v) grid that wraps in both directions, so a torus has no seams in its shading. */
function wrapGrid(nu: number, nv: number, at: (u: number, v: number, out: THREE.Vector3) => void, tint?: (u: number, v: number, out: THREE.Color) => void) {
  const pos = new Float32Array(nu * nv * 3);
  const col = tint ? new Float32Array(nu * nv * 3) : null;
  const p = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const u = (i / nu) * Math.PI * 2, v = (j / nv) * Math.PI * 2;
      at(u, v, p);
      p.toArray(pos, (i * nv + j) * 3);
      if (tint && col) { tint(u, v, c); c.toArray(col, (i * nv + j) * 3); }
    }
  }
  const index: number[] = [];
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const a = i * nv + j, b = ((i + 1) % nu) * nv + j, c2 = ((i + 1) % nu) * nv + ((j + 1) % nv), d = i * nv + ((j + 1) % nv);
      index.push(a, d, b, b, d, c2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/* ---------- Coffee ---------- */

function walnut() {
  const rand = seeded(11);
  const t = canvasTexture(256, 256, (x) => {
    x.fillStyle = '#5b3a24'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 70; i++) {
      const y0 = rand() * 256, amp = 2 + rand() * 6, f = 0.01 + rand() * 0.02, ph = rand() * 6;
      x.strokeStyle = rand() < 0.6 ? `rgba(38,22,12,${0.25 + rand() * 0.35})` : `rgba(140,98,62,${0.15 + rand() * 0.2})`;
      x.lineWidth = 0.6 + rand() * 1.8;
      x.beginPath();
      for (let px = 0; px <= 256; px += 8) x.lineTo(px, y0 + Math.sin(px * f + ph) * amp);
      x.stroke();
    }
  });
  return t;
}

function crema() {
  return canvasTexture(128, 128, (x) => {
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, '#2a170c');
    g.addColorStop(0.72, '#3c2212');
    g.addColorStop(0.9, '#6e4424');
    g.addColorStop(1, '#4a2c17');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  });
}

export function buildMug() {
  const g = new THREE.Group();
  g.name = 'mug';
  const glaze = reflective(std('#ece5d8', 0.34), 0.5);
  const clay = std('#a99883', 0.9); // unglazed foot ring

  // walnut coaster; a cylinder's caps map the texture flat, so the grain runs straight across
  cyl(g, 0.34, 0.34, COASTER_H, std('#ffffff', 0.55, 0, { map: walnut() }), [0, COASTER_H / 2, 0], undefined, 48);

  const m = add(g, new THREE.Group(), [0, COASTER_H, 0]);
  lathe(m, [[0, 0.004], [0.2, 0.004], [0.214, 0.012], [0.222, 0.03]], clay, undefined, 48);
  lathe(m, [[0.222, 0.03], [0.238, 0.08], [0.247, 0.2], [0.251, 0.4], [0.252, 0.55], [0.249, 0.572], [0.24, 0.58], [0.231, 0.574],
    [0.228, 0.55], [0.225, 0.3], [0.222, 0.12], [0.205, 0.075], [0, 0.07]], glaze, undefined, 48);
  add(m, new THREE.Mesh(new THREE.CircleGeometry(0.227, 40), new THREE.MeshLambertMaterial({ map: crema() })), [0, 0.49, 0], [-Math.PI / 2, 0, 0]);

  // a D-shaped handle, a little wider than it is thick
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.235, 0.47, 0), new THREE.Vector3(0.33, 0.46, 0), new THREE.Vector3(0.385, 0.38, 0),
    new THREE.Vector3(0.38, 0.24, 0), new THREE.Vector3(0.33, 0.16, 0), new THREE.Vector3(0.235, 0.14, 0),
  ]);
  const handle = add(m, new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.026, 10), glaze));
  handle.scale.set(1, 1, 1.35);
  return g;
}

/* ---------- Donut ---------- */

const RING = 0.185, TUBE = 0.1;
// a slightly lumpy, puffy ring with a flat underside
const lump = (u: number, v: number) => 1 + 0.045 * Math.sin(3 * u + 1.1) * Math.cos(2 * v) + 0.025 * Math.sin(7 * u + 3 * v + 0.4) + 0.015 * Math.sin(11 * u - 2 * v);
const flatBase = (s: number) => (s < -0.7 ? -0.7 + (s + 0.7) * 0.25 : s);
const LIFT = TUBE * 0.8 * 0.775;
function donutPoint(u: number, v: number, k: number, out: THREE.Vector3) {
  const r = TUBE * k * lump(u, v);
  const ring = RING + r * Math.cos(v);
  return out.set(ring * Math.cos(u), LIFT + r * 0.8 * flatBase(Math.sin(v)), ring * Math.sin(u));
}
// where the icing stops, in sin(v): just below the widest point outside, with a few drips
function icingEdge(u: number, v: number) {
  const drips = Math.max(0, Math.sin(5 * u + 0.8)) ** 6 * 0.38 + Math.max(0, Math.sin(3 * u + 2.4)) ** 10 * 0.3;
  const outer = 0.16 - drips * 1.1 + 0.04 * Math.sin(13 * u);
  const inner = 0.4 - drips * 0.3 + 0.04 * Math.sin(9 * u + 1);
  return THREE.MathUtils.lerp(inner, outer, smooth(-0.35, 0.35, Math.cos(v)));
}
const icingK = (u: number, v: number) => THREE.MathUtils.lerp(0.86, 1.1, smooth(-0.05, 0.05, Math.sin(v) - icingEdge(u, v)));

export function buildDonut() {
  const g = new THREE.Group();
  g.name = 'donut';

  // slate stoneware dessert plate, 200 mm: foot ring, flat well, flared rim (profile runs underneath first)
  lathe(g, [[0, 0.016], [0.27, 0.012], [0.285, 0], [0.33, 0], [0.345, 0.014], [0.45, 0.034], [0.56, 0.068], [0.615, 0.086],
    [0.628, 0.096], [0.62, 0.104], [0.56, 0.092], [0.46, 0.066], [0.38, 0.044], [0, 0.04]], reflective(std('#46505e', 0.28), 0.7), undefined, 56);

  const d = add(g, new THREE.Group(), [0.02, 0.04, -0.01], [0, 0.6, 0]);
  const golden = new THREE.Color('#d29a55'), browned = new THREE.Color('#9c5d2a'), pale = new THREE.Color('#efd6a4');
  const dough = wrapGrid(64, 28, (u, v, o) => donutPoint(u, v, 1, o), (u, v, c) => {
    const s = Math.sin(v);
    c.copy(golden).lerp(browned, smooth(0.3, 0.95, Math.abs(s)));
    c.lerp(pale, (1 - smooth(0.06, 0.2, Math.abs(s))) * smooth(0.2, 0.7, Math.cos(v)) * 0.85); // the fried band
  });
  add(d, new THREE.Mesh(dough, std('#ffffff', 0.75, 0, { vertexColors: true })));
  // icing: the same ring, slightly fatter where iced and tucked inside the dough everywhere else
  const icing = wrapGrid(96, 44, (u, v, o) => donutPoint(u, v, icingK(u, v), o));
  add(d, new THREE.Mesh(icing, reflective(std('#ff8db0', 0.3), 0.45)));

  // sprinkles: little capsules lying on the icing, one draw for all of them
  const rand = seeded(5);
  const colours = ['#ffe066', '#6ecbff', '#ffffff', '#9be38c', '#b892ff', '#ff9d5c'].map((c) => new THREE.Color(c));
  const parts: THREE.BufferGeometry[] = [];
  const p = new THREE.Vector3(), pu = new THREE.Vector3(), pv = new THREE.Vector3();
  const n = new THREE.Vector3(), tu = new THREE.Vector3(), tv = new THREE.Vector3(), dir = new THREE.Vector3(), side = new THREE.Vector3();
  const basis = new THREE.Matrix4();
  for (let i = 0; i < 170; i++) {
    const u = rand() * Math.PI * 2, v = Math.asin(0.3 + rand() * 0.7) * (rand() < 0.5 ? 1 : -1) + (rand() < 0.5 ? 0 : Math.PI);
    const sv = Math.sin(v);
    if (sv < icingEdge(u, v) + 0.2) continue;
    donutPoint(u, v, icingK(u, v), p);
    donutPoint(u + 0.01, v, icingK(u + 0.01, v), pu);
    donutPoint(u, v + 0.01, icingK(u, v + 0.01), pv);
    tu.subVectors(pu, p).normalize();
    tv.subVectors(pv, p).normalize();
    n.crossVectors(tv, tu).normalize();
    const a = rand() * Math.PI;
    dir.copy(tu).multiplyScalar(Math.cos(a)).addScaledVector(tv, Math.sin(a)).normalize();
    side.crossVectors(dir, n).normalize();
    basis.makeBasis(side, dir, n).setPosition(p.addScaledVector(n, 0.004));
    const s = new THREE.CapsuleGeometry(0.0058, 0.03, 2, 6).applyMatrix4(basis);
    const c = colours[i % colours.length];
    const cols = new Float32Array(s.attributes.position.count * 3);
    for (let k = 0; k < cols.length; k += 3) { cols[k] = c.r; cols[k + 1] = c.g; cols[k + 2] = c.b; }
    s.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    parts.push(s.index ? s.toNonIndexed() : s);
  }
  const sprinkles = BufferGeometryUtils.mergeGeometries(parts, false);
  parts.forEach((s) => s.dispose());
  if (sprinkles) add(d, new THREE.Mesh(sprinkles, std('#ffffff', 0.45, 0, { vertexColors: true })));
  return g;
}
