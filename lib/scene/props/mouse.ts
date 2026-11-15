// Ninjutso Sora V2 in white, built from the measured spec in specs/sora.ts (millimetres, from
// Ninjutso's top, side and underside renders) and nothing else. Built in mm and scaled to desk units
// (1 unit = 160 mm). The mouse points down -z; it stands on its skates at y = 0.
//
// The shell is one surface over (s, t): s runs back from the front tip along the measured plan and
// profile, t across each section from the right-hand base, over the top, to the left. Above its edge
// (where it is widest) each section spans the plan's half-width and rises to the measured profile: a
// shallow dome over a tight shoulder and near-vertical sides. Below, a chamfer runs in to the base
// along the outline's normal: shallow on the sides, a rounded undercut beneath the buttons' lip at the
// nose, steep at the tail. Splits, the wheel slot, logos and the side buttons are laid onto that
// surface, so they follow it exactly.
import * as THREE from 'three';
import { canvasTexture, reflective, std } from './kit';
import { SORA } from '../specs/sora';

const MM = 1 / 160;
const L = SORA.length, BASE = SORA.skates;
const NS = 140, NT = 96;
const { smoothstep, clamp, lerp } = THREE.MathUtils;

/**
 * A smooth curve through a measured table: monotone cubic (PCHIP), so it passes through every reading,
 * never overshoots between them, and has no creases at the stations.
 */
function curve(table: readonly (readonly [number, number])[]) {
  const n = table.length, xs = table.map((p) => p[0]), ys = table.map((p) => p[1]);
  const h: number[] = [], d: number[] = [];
  for (let i = 0; i < n - 1; i++) { h.push(xs[i + 1] - xs[i]); d.push((ys[i + 1] - ys[i]) / h[i]); }
  const m = ys.map((_, i) => {
    if (i === 0) return d[0];
    if (i === n - 1) return d[n - 2];
    if (d[i - 1] * d[i] <= 0) return 0;
    const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1];
    return (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
  });
  return (s: number) => {
    s = clamp(s, xs[0], xs[n - 1]);
    let i = 0;
    while (i < n - 2 && s > xs[i + 1]) i++;
    const u = (s - xs[i]) / h[i], u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h[i] * m[i] + (3 * u2 - 2 * u3) * ys[i + 1] + (u3 - u2) * h[i] * m[i + 1];
  };
}
/**
 * The curve, smoothed: the readings are whole pixels of the renders (0.21 mm across, 0.08 up), and a
 * curve through every step ripples in the light. A Gaussian 3 mm wide evens that out along the sides,
 * narrowing to nothing toward the ends, where the outline really does turn fast. Sampled every 0.05 mm.
 */
function smoothed(f: (s: number) => number) {
  const step = 0.05, n = Math.round(L / step), v = new Float32Array(n + 1);
  for (let i = 0; i <= n; i++) {
    const s = i * step, sigma = 3 * smoothstep(s, 10, 22) * (1 - smoothstep(s, 96, 108));
    if (sigma < 0.05) { v[i] = f(s); continue; }
    let sum = 0, wsum = 0;
    for (let k = -12; k <= 12; k++) { const w = Math.exp(-((k / 4) ** 2) / 2); sum += w * f(clamp(s + (k / 4) * sigma, 0, L)); wsum += w; }
    v[i] = sum / wsum;
  }
  return (s: number) => { const x = clamp(s, 0, L) / step, i = Math.min(n - 1, Math.floor(x)); return lerp(v[i], v[i + 1], x - i); };
}
const halfWidth = smoothed(curve(SORA.plan));
const topAt = smoothed(curve(SORA.profile));
const zOf = (s: number) => -L / 2 + s;
const E = SORA.edge, T = SORA.tuck, SEC = SORA.section;

/** How much of the nose's lip applies at s: all of it round the front, none from 13 mm back, where the side panel starts under the 空. */
const noseK = (s: number) => 1 - smoothstep(s, 6, 13);
/** The edge, where the section is widest, above the desk: the lip at the nose, rising to a point at the tail. */
const edgeAt = (s: number) => Math.min(lerp(E.side, E.lip, noseK(s)) + (E.tail - E.side) * smoothstep(s, L - 18, L), topAt(s) - 0.05);
/** How far the chamfer below the edge runs in: the nose's undercut eases out to the sides' by 15 mm back. */
const tuckAt = (s: number) => lerp(T.side, T.front, 1 - smoothstep(s, 1, 15)) + (T.tail - T.side) * smoothstep(s, L - 14, L);

/** The outline's outward normal seen from above at s, on the right-hand side: [x, z]. */
function planNormal(s: number): [number, number] {
  const a = Math.max(0, s - 0.4), b = Math.min(L, s + 0.4);
  const dw = (halfWidth(b) - halfWidth(a)) / (b - a), n = Math.hypot(1, dw);
  return [1 / n, -dw / n];
}

/**
 * The section above the edge: height fraction over width fraction xi (0 on the centre line, 1 at the
 * edge). Three shapes, (1 - dome xi^2) (1 - xi^shoulder)^(1/2) each: flat across the buttons' front,
 * domed over the buttons, round over the palm. Between them the heights blend, not the shapes' numbers
 * (blending those bulges the side partway).
 */
function sectionF(xi: number, s: number) {
  if (xi >= 1) return -1;
  const [a, b, c, d] = SEC.at;
  const shape = (i: number) => (1 - SEC.dome[i] * xi * xi) * Math.sqrt(1 - Math.pow(xi, SEC.shoulder[i]));
  return lerp(lerp(shape(0), shape(1), smoothstep(s, a, b)), shape(2), smoothstep(s, c, d));
}
/** Where a ray at angle a (0 toward the edge, PI/2 straight up, in the section's fractions) meets the section: [xi, f]. */
function sectionAt(a: number, s: number): [number, number] {
  const c = Math.cos(a), sn = Math.sin(a);
  let lo = 0, hi = 1.5;
  for (let k = 0; k < 26; k++) { const r = (lo + hi) / 2; if (r * sn < sectionF(r * c, s)) lo = r; else hi = r; }
  const r = (lo + hi) / 2;
  return [r * c, r * sn];
}

/** The share of t each lower band (edge to base) takes, on either side. */
const BAND = 0.16 * Math.PI;

/** A point on the shell. s: mm back from the front tip; t: 0 at the right-hand base, PI/2 on top, PI at the left. */
function shell(s: number, t: number, out = new THREE.Vector3()) {
  const w = halfWidth(s), h = topAt(s), ye = edgeAt(s);
  if (t > BAND && t < Math.PI - BAND) {
    const tt = ((t - BAND) / (Math.PI - 2 * BAND)) * Math.PI;
    const [xi, f] = sectionAt(tt <= Math.PI / 2 ? tt : Math.PI - tt, s);
    return out.set(w * xi * (tt <= Math.PI / 2 ? 1 : -1), ye + (h - ye) * f, zOf(s));
  }
  // the lower band, k: 0 at the edge, 1 at the base; straight on the sides, rounded under the nose's lip
  const right = t <= BAND;
  const k = clamp(right ? 1 - t / BAND : (t - (Math.PI - BAND)) / BAND, 0, 1);
  const d = tuckAt(s) * lerp(k, 1 - (1 - k) ** 2, noseK(s));
  const [nx, nz] = planNormal(s);
  const x = Math.max(0, w - d * nx); // at the tips both sides pinch to the centre line
  return out.set(right ? x : -x, ye - (ye - BASE) * k, zOf(s) - d * nz);
}

/** t for a point on the upper part at angle a (as in sectionAt), on the right or left. */
const fromUpper = (a: number, left: boolean) => { const t = BAND + (a / Math.PI) * (Math.PI - 2 * BAND); return left ? Math.PI - t : t; };

/** t on the right (x >= 0) or left side for a given x across the section at s (on the upper part). */
function tForX(s: number, x: number) {
  const xi = Math.min(1, Math.abs(x) / halfWidth(s));
  return fromUpper(Math.atan2(Math.max(0, sectionF(xi, s)), xi), x < 0);
}
/** t on the left (or right) side for a height y at s. */
function tForY(s: number, y: number, left = true) {
  const h = topAt(s), ye = edgeAt(s);
  if (y >= ye) {
    const f = clamp((y - ye) / (h - ye), 0, 1);
    let lo = 0, hi = 1; // the section falls from the centre line to the edge
    for (let k = 0; k < 26; k++) { const m = (lo + hi) / 2; if (sectionF(m, s) > f) lo = m; else hi = m; }
    return fromUpper(Math.atan2(f, (lo + hi) / 2), left);
  }
  const t = BAND * (1 - clamp((ye - y) / (ye - BASE), 0, 1));
  return left ? Math.PI - t : t;
}

/** Outward normal at (s, t), by finite differences. */
function normalAt(s: number, t: number) {
  const s0 = Math.max(0, s - 0.15), s1 = Math.min(L, s + 0.15), t0 = Math.max(0, t - 0.005), t1 = Math.min(Math.PI, t + 0.005);
  const ds = shell(s1, t).sub(shell(s0, t)), dt = shell(s, t1).sub(shell(s, t0));
  return new THREE.Vector3().crossVectors(dt, ds).normalize();
}

/** A sheet through rows of points, its triangles wound to face `outward`. */
function sheet(rows: THREE.Vector3[][], outward: THREE.Vector3, uv?: number[], normals?: THREE.Vector3[][]) {
  const nr = rows.length, nc = rows[0].length;
  const pos: number[] = [];
  for (const r of rows) for (const p of r) pos.push(p.x, p.y, p.z);
  const idx: number[] = [];
  for (let i = 0; i < nr - 1; i++) for (let j = 0; j < nc - 1; j++) {
    const a = i * nc + j, b = a + nc;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const m = Math.floor(nc / 2), A = rows[0][m], B = rows[1][m], C = rows[0][m + 1] ?? rows[0][m - 1];
  const n = new THREE.Vector3().crossVectors(B.clone().sub(A), C.clone().sub(A)).multiplyScalar(rows[0][m + 1] ? 1 : -1);
  if (n.dot(outward) < 0) for (let k = 0; k < idx.length; k += 3) [idx[k + 1], idx[k + 2]] = [idx[k + 2], idx[k + 1]];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  if (normals) g.setAttribute('normal', new THREE.Float32BufferAttribute(normals.flat().flatMap((v) => [v.x, v.y, v.z]), 3));
  else g.computeVertexNormals();
  return g;
}

/**
 * A patch of surface over (u, v) in [0, 1]^2, lifted off the shell along its normals (decals, buttons).
 * at() gives (s, t) for each (u, v); uv runs u along the texture's x, v up it.
 */
function patch(nu: number, nv: number, at: (u: number, v: number) => [number, number], lift: (u: number, v: number) => number) {
  const rows: THREE.Vector3[][] = [], uv: number[] = [];
  let mid = new THREE.Vector3();
  for (let i = 0; i <= nu; i++) {
    const row: THREE.Vector3[] = [];
    for (let j = 0; j <= nv; j++) {
      const [s, t] = at(i / nu, j / nv), n = normalAt(s, t);
      row.push(shell(s, t).addScaledVector(n, lift(i / nu, j / nv)));
      uv.push(i / nu, j / nv);
      if (i === nu >> 1 && j === nv >> 1) mid = n;
    }
    rows.push(row);
  }
  return sheet(rows, mid, uv);
}

/**
 * A split laid along the surface over a run of (s, t) points: a dark gap w mm wide, and either side of
 * it a 0.2 mm edge rounding down into it (a strip of the shell's material whose normals tip toward the
 * gap, so the edges catch the light as the real ones do).
 */
function groove(points: [number, number][], w: number, gapMat: THREE.Material, edgeMat: THREE.Material) {
  const at = (i: number) => shell(...points[clamp(i, 0, points.length - 1)]);
  const P: THREE.Vector3[] = [], N: THREE.Vector3[] = [], B: THREE.Vector3[] = [];
  points.forEach(([s, t], i) => {
    const n = normalAt(s, t);
    P.push(shell(s, t).addScaledVector(n, 0.03));
    N.push(n);
    B.push(new THREE.Vector3().crossVectors(at(i + 1).sub(at(i - 1)), n).normalize());
  });
  const off = (d: number) => P.map((p, i) => p.clone().addScaledVector(B[i], d));
  const tip = (sign: number, a: number) => N.map((n, i) => n.clone().multiplyScalar(Math.cos(a)).addScaledVector(B[i], -sign * Math.sin(a)).normalize());
  const g = new THREE.Group();
  const mid = N[N.length >> 1];
  g.add(new THREE.Mesh(sheet([off(w / 2), off(-w / 2)], mid), gapMat));
  for (const sign of [1, -1]) {
    g.add(new THREE.Mesh(sheet([off(sign * (w / 2 + 0.2)), off((sign * w) / 2)], mid, undefined, [tip(sign, 0), tip(sign, 1)]), edgeMat));
  }
  return g;
}

/** Ninjutso's mark as it reads from above, front at the top: a three-bladed star with a crescent trailing each blade, round a hole. */
function logoTexture() {
  return canvasTexture(512, 512, (x) => {
    // drawn in the coordinates of a 400 x 360 crop of Ninjutso's top render (front up, the mark's
    // centre at 297, 228), turned so u runs back along the mouse and v across it to the right
    x.setTransform(0, -1, 1, 0, 0, 512);
    x.scale(512 / 400, 512 / 360);
    x.translate(-95, -85);
    const C = [297, 228], P = (deg: number, r: number) => [C[0] + r * Math.cos((deg * Math.PI) / 180), C[1] - r * Math.sin((deg * Math.PI) / 180)] as const;
    x.fillStyle = '#fff';
    const blades = [32, 152, 272];
    // the star: three tips, concave between them
    x.beginPath();
    blades.forEach((b, i) => {
      const tip = P(b, 224), valley = P(b + 60, 50), c1 = P(b + 16, 112), c2 = P(b + 50, 62);
      if (i === 0) x.moveTo(...P(b - 60, 50));
      x.quadraticCurveTo(...P(b - 16, 104), ...tip);
      x.quadraticCurveTo(...c1, ...P(b + 36, 66));
      x.quadraticCurveTo(...c2, ...valley);
    });
    x.closePath();
    x.fill();
    // the crescents: each leaves a blade and sweeps 85 degrees clockwise, thinning to a point
    for (const b of blades) {
      const a0 = b - 4, a1 = b - 92, R = 150, N = 30;
      x.beginPath();
      for (let k = 0; k <= N; k++) x.lineTo(...P(a0 + ((a1 - a0) * k) / N, R));
      for (let k = N; k >= 0; k--) { const q = k / N; x.lineTo(...P(a0 + (a1 - a0) * q, R - 46 * Math.pow(1 - q, 0.8))); }
      x.closePath();
      x.fill();
    }
    x.globalCompositeOperation = 'destination-out';
    x.beginPath(); x.arc(C[0], C[1], 23, 0, Math.PI * 2); x.fill();
  });
}

/**
 * 空 ("sky", Sora) on the left side, in Ninjutso's cursive brush hand: traced off the side render, in its
 * pixels (0.0825 mm each; the patch covers 13.6 to 23.1 mm back and 4.2 to 13.7 mm up).
 */
function kanjiTexture() {
  return canvasTexture(256, 256, (x) => {
    const k = 256 / (9.5 / 0.0825);
    x.setTransform(k, 0, 0, k, -784.85 * k, -728.94 * k);
    x.fillStyle = '#fff';
    /**
     * A brush stroke: a smooth (Catmull-Rom) centre line through [x, y, width] points, stamped with
     * round dabs every 0.3 px, so it tapers, swells and rounds off the way ink does.
     */
    const brush = (pts: [number, number, number][]) => {
      const P = [pts[0], ...pts, pts[pts.length - 1]];
      const cr = (a: number, b: number, c: number, d: number, u: number) => 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u);
      for (let i = 1; i < P.length - 2; i++) {
        const n = Math.ceil(Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]) / 0.3);
        for (let j = 0; j <= n; j++) {
          const u = j / n, at = (c: number) => cr(P[i - 1][c], P[i][c], P[i + 1][c], P[i + 2][c], u);
          x.beginPath();
          x.arc(at(0), at(1), Math.max(0.4, at(2) / 2), 0, Math.PI * 2);
          x.fill();
        }
      }
    };
    // the dot: a wedge, pointed at its top left
    brush([[835, 733.5, 1.5], [841, 738.5, 4.5], [848, 743, 7], [852.5, 745, 6.5]]);
    // the roof: a tall stroke down on the left, tapering to a point at its top, then one long sweep up
    // to the right, thinning to a point
    brush([[796, 753, 2], [798, 762, 9], [797.5, 772, 12], [795, 784, 12], [797, 791, 10]]);
    brush([[799, 788, 12], [817, 780, 14], [835, 772, 13], [857, 764, 10], [882, 756, 7], [901, 755, 1.2]]);
    // inside it, two hooked strokes, one above the other
    brush([[852, 764.5, 8], [860, 762.5, 8], [866, 761.5, 7.5]]);
    brush([[866, 762, 8], [859.5, 770, 8.5], [854, 777.5, 7.5]]);
    brush([[854, 778, 7], [859, 778.5, 7.5], [864, 779.5, 7.5]]);
    brush([[864, 780.5, 8], [857, 787.5, 7.5], [850.5, 795, 5]]);
    // 工: the short bar, the stroke down to the left and the long bar, thickening to its end
    brush([[835.5, 817, 6], [841, 816.2, 6], [847.5, 815.5, 6]]);
    brush([[842.5, 818.5, 5.8], [838, 825.5, 5.5], [833, 832.5, 5]]);
    brush([[829.5, 835.5, 5], [851, 835.2, 5.5], [872.5, 833.8, 7.5], [879.5, 831, 9]]);
  });
}

export function buildSora() {
  const root = new THREE.Group();
  root.name = 'mouse';
  const mm = new THREE.Group();
  mm.scale.setScalar(MM);
  root.add(mm);

  const white = reflective(std('#f1f1ee', 0.46), 0.35);
  white.shadowSide = THREE.DoubleSide;
  const split = std('#3a3c42', 0.8, 0, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const dark = std('#17181c', 0.7);
  const ptfe = std('#f6f6f2', 0.3);
  const ink = '#202060'; // renders near the prints' #33338f under the desk and lab lights
  const decal = (map: THREE.Texture, color: string) => {
    map.anisotropy = 4;
    return new THREE.MeshStandardMaterial({ map, color, roughness: 0.75, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  };

  /* --- the shell, denser toward both ends where it turns fastest --- */
  const sAt = (i: number) => (L * (1 - Math.cos((Math.PI * i) / NS))) / 2;
  const pos = new Float32Array((NS + 1) * (NT + 1) * 3);
  const p = new THREE.Vector3();
  for (let i = 0; i <= NS; i++) for (let j = 0; j <= NT; j++) shell(sAt(i), (j / NT) * Math.PI, p).toArray(pos, (i * (NT + 1) + j) * 3);
  const index: number[] = [];
  for (let i = 0; i < NS; i++) for (let j = 0; j < NT; j++) {
    const a = i * (NT + 1) + j, b = a + NT + 1;
    index.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const shellGeo = new THREE.BufferGeometry();
  shellGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  shellGeo.setIndex(index);
  shellGeo.computeVertexNormals();
  // At the tips every section pinches to a line, and the triangles there are too thin to give normals:
  // take them from the surface just behind (or ahead), and on the tip line itself face straight out.
  const nrm = shellGeo.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i <= NS; i++) {
    const s = sAt(i);
    if (s > 1.5 && s < L - 1.5) continue;
    for (let j = 0; j <= NT; j++) {
      const n = normalAt(clamp(s, 0.3, L - 0.3), (j / NT) * Math.PI);
      if (i === 0 || i === NS) n.setX(0).normalize();
      nrm.setXYZ(i * (NT + 1) + j, n.x, n.y, n.z);
    }
  }
  shellGeo.computeBoundingBox();
  const shellMesh = new THREE.Mesh(shellGeo, white);
  shellMesh.name = 'shell';
  mm.add(shellMesh);

  // the underside: a flat plate through the shell's base, which pinches to the centre line at both tips
  let base: THREE.Vector2[] = [];
  for (let i = 0; i <= NS; i++) { const q = shell(sAt(i), 0); base.push(new THREE.Vector2(q.x, q.z)); }
  let a = 0, b = base.length - 1;
  while (a + 1 < b && base[a + 1].x <= 1e-4) a++;
  while (b - 1 > a && base[b - 1].x <= 1e-4) b--;
  base = base.slice(a, b + 1);
  const ring = [...base, ...base.slice(1, -1).reverse().map((v) => new THREE.Vector2(-v.x, v.y))];
  const under = new THREE.ShapeGeometry(new THREE.Shape(ring), 1).rotateX(Math.PI / 2).translate(0, BASE, 0);
  mm.add(new THREE.Mesh(under, white));

  /* --- skates, the sensor ring, the name and the power switch --- */
  const F = SORA.feet;
  const extrude = (shape: THREE.Shape) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth: BASE - 0.15, bevelEnabled: true, bevelSize: 0.4, bevelThickness: 0.15, bevelSegments: 2, curveSegments: 8 });
    return g.rotateX(Math.PI / 2).translate(0, BASE, 0); // (x, y, z) -> (x, -z, y): the foot lands on y = 0
  };
  /** Rounds a traced outline's corners (two passes of corner cutting); in (x, z), mirrored for the left. */
  const rounded = (pts: readonly (readonly [number, number])[], side: number) => {
    let p = pts.map(([x, s]) => [side * x, zOf(s)]);
    for (let pass = 0; pass < 2; pass++) {
      const q: number[][] = [];
      p.forEach((a, i) => { const b = p[(i + 1) % p.length]; q.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]); });
      p = q;
    }
    return p.map(([x, z]) => new THREE.Vector2(x, z));
  };
  const pads = [F.front, F.back].flatMap((o) => [rounded(o, 1), rounded(o, -1)]);
  for (const outline of pads) mm.add(new THREE.Mesh(extrude(new THREE.Shape(outline)), ptfe));
  const roundRect = (w: number, d: number, r: number, cx: number, cz: number) => {
    const s = new THREE.Shape();
    s.moveTo(cx - w / 2 + r, cz - d / 2);
    s.lineTo(cx + w / 2 - r, cz - d / 2); s.quadraticCurveTo(cx + w / 2, cz - d / 2, cx + w / 2, cz - d / 2 + r);
    s.lineTo(cx + w / 2, cz + d / 2 - r); s.quadraticCurveTo(cx + w / 2, cz + d / 2, cx + w / 2 - r, cz + d / 2);
    s.lineTo(cx - w / 2 + r, cz + d / 2); s.quadraticCurveTo(cx - w / 2, cz + d / 2, cx - w / 2, cz + d / 2 - r);
    s.lineTo(cx - w / 2, cz - d / 2 + r); s.quadraticCurveTo(cx - w / 2, cz - d / 2, cx - w / 2 + r, cz - d / 2);
    return s;
  };
  const flat = (shape: THREE.Shape, y: number) => new THREE.ShapeGeometry(shape, 6).rotateX(Math.PI / 2).translate(0, y, 0);
  const Sn = F.sensor, sz = zOf(Sn.s);
  const sensorRing = roundRect(Sn.w, Sn.l, Sn.r, 0, sz);
  sensorRing.holes.push(roundRect(Sn.window.w, Sn.window.l, Sn.window.r, 0, sz));
  mm.add(new THREE.Mesh(extrude(sensorRing), ptfe));
  mm.add(new THREE.Mesh(flat(roundRect(Sn.window.w, Sn.window.l, Sn.window.r, 0, sz), BASE - 0.05), dark));
  mm.add(new THREE.Mesh(new THREE.CircleGeometry(1.6, 24).rotateX(Math.PI / 2).translate(0, BASE - 0.1, sz), std('#3a3c42', 0.15)));
  const Pw = F.power;
  mm.add(new THREE.Mesh(flat(roundRect(Pw.w, Pw.l, Pw.w / 2, Pw.x, zOf(Pw.s)), BASE - 0.05), dark));
  mm.add(new THREE.Mesh(flat(roundRect(Pw.w - 1.4, Pw.w - 1.4, (Pw.w - 1.4) / 2, Pw.x, zOf(Pw.s) - Pw.l / 2 + Pw.w / 2), BASE - 0.1), ptfe));
  // NINJUTSO across the plate, reading the right way round with the mouse turned over, front at the top
  const nameTex = canvasTexture(512, 96, (x) => {
    x.fillStyle = '#1b1c20';
    x.font = 'italic 800 78px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('NINJUTSO', 256, 52, 500);
  });
  const nameGeo = new THREE.PlaneGeometry(F.name.w, F.name.h).rotateX(Math.PI / 2).rotateY(Math.PI).translate(0, BASE - 0.03, zOf(F.name.s));
  mm.add(new THREE.Mesh(nameGeo, new THREE.MeshStandardMaterial({ map: nameTex, transparent: true, depthWrite: false, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));

  /* --- the buttons' splits: down the middle, across where they end, and along each side into the lip --- */
  const S = SORA.seam;
  const seamS = (x: number) => S.centre - (S.centre - S.side) * (x / S.x) ** 2;
  const across: [number, number][] = [];
  for (let k = 0; k <= 32; k++) { const x = -S.x + (2 * S.x * k) / 32, s = seamS(x); across.push([s, tForX(s, x)]); }
  mm.add(groove(across, 0.45, split, white));
  // behind it the palm shell stands 0.3 mm proud of the buttons
  mm.add(new THREE.Mesh(patch(6, 32, (u, v) => { const x = -S.x + 2 * S.x * v, s = seamS(x) + 0.35 + 1.6 * u; return [s, tForX(s, x)]; }, (u) => 0.3 * (1 - u) ** 2), white));
  const middle: [number, number][] = [];
  for (let s = 0.4; s <= S.centre; s += 1.5) middle.push([s, Math.PI / 2]);
  mm.add(groove(middle, 0.3, split, white));
  // along each side, a set distance inside the outline (as seen from above) back to where the seam ends;
  // at the front it turns down the buttons' front face into the lip
  const Sp = SORA.split;
  const splitX = (s: number) => halfWidth(s) - lerp(Sp.inset, halfWidth(S.side) - S.x, smoothstep(s, 38, S.side));
  const sideLine = (left: boolean) => {
    const line: [number, number][] = [];
    for (let k = 0; k <= 8; k++) {
      // down the front face: from the split's height in the section (as a fraction) to just above the lip
      const s = 2.5 + ((Sp.front - 2.5) * k) / 8, ye = edgeAt(s), f = lerp(0.03, sectionF(splitX(s) / halfWidth(s), s), 1 - (1 - k / 8) ** 2);
      line.push([s, tForY(s, ye + (topAt(s) - ye) * f, left)]);
    }
    for (let s = Sp.front + 1.2; s < S.side; s += 1.2) line.push([s, tForX(s, (left ? -1 : 1) * splitX(s))]);
    line.push([S.side, tForX(S.side, (left ? -1 : 1) * S.x)]);
    return line;
  };
  for (const left of [false, true]) {
    mm.add(groove(sideLine(left), 0.45, split, white));
    // the buttons stand 0.3 mm proud of the side along it, their edge rounding down into the split
    mm.add(new THREE.Mesh(patch(40, 6, (u, v) => {
      const s = lerp(Sp.front + 1, S.side - 0.4, u), x = splitX(s) - 0.225 - 1.6 * v;
      return [s, tForX(s, left ? -x : x)];
    }, (u, v) => 0.3 * (1 - v) ** 2 * (0.35 + 0.65 * Math.sin((Math.min(1, v / 0.12) * Math.PI) / 2)) * smoothstep(u, 0, 0.06) * (1 - smoothstep(u, 0.94, 1))), white));
  }
  // under the lip, round the nose: the dark gap above the lower shell
  // between the two stacked lips, rising along the buttons' lip to where it ends round each corner
  const G = SORA.gap, gapLine: [number, number][] = [];
  const gapY = (s: number) => lerp(G.y[0], G.y[1], smoothstep(s, 0, G.to));
  for (let k = 32; k >= 0; k--) { const s = (G.to * k) / 32; gapLine.push([s, tForY(s, gapY(s), false)]); }
  for (let k = 1; k <= 32; k++) { const s = (G.to * k) / 32; gapLine.push([s, tForY(s, gapY(s), true)]); }
  mm.add(groove(gapLine, 0.8, split, white));

  /* --- the wheel in its slot: a blue tread between white discs --- */
  const Wl = SORA.wheel;
  const slot = patch(18, 8, (u, v) => { const s = Wl.slot.from + (Wl.slot.to - Wl.slot.from) * u; return [s, tForX(s, (v - 0.5) * Wl.slot.w)]; }, () => 0.05);
  const slotTex = canvasTexture(64, 256, (x) => { x.fillStyle = '#fff'; x.beginPath(); x.roundRect(2, 2, 60, 252, 30); x.fill(); });
  mm.add(new THREE.Mesh(slot, new THREE.MeshStandardMaterial({ color: '#141519', alphaMap: slotTex, transparent: true, depthWrite: false, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
  const ribs = canvasTexture(256, 16, (x) => { x.fillStyle = '#26259a'; x.fillRect(0, 0, 256, 16); x.fillStyle = '#17165e'; for (let i = 0; i < 256; i += 8) x.fillRect(i, 0, 3, 16); });
  const wy = Wl.top - Wl.d / 2, wz = zOf(Wl.at);
  const treadGeo = new THREE.CylinderGeometry(Wl.d / 2, Wl.d / 2, Wl.tread, 48, 1, true).rotateZ(Math.PI / 2).translate(0, wy, wz);
  treadGeo.computeBoundingBox();
  const tread = new THREE.Mesh(treadGeo, std('#ffffff', 0.65, 0, { map: ribs }));
  tread.name = 'wheel';
  mm.add(tread);
  const discW = (Wl.w - Wl.tread) / 2;
  for (const side of [1, -1]) {
    mm.add(new THREE.Mesh(new THREE.CylinderGeometry(Wl.d / 2 - 0.5, Wl.d / 2 - 0.5, discW, 40).rotateZ(Math.PI / 2).translate(side * (Wl.tread + discW) / 2, wy, wz), white));
  }

  /* --- side buttons on the left: solid, dished, round at their far ends, a dark split round each --- */
  const R = 3, proud = SORA.sideButtonProud;
  let past = -Infinity;
  SORA.sideButtons.forEach((btn, i) => {
    const far = i === 0 ? 0 : 1; // the front one rounds off at its front, the back one at its back
    const fp = (e: number) => (u: number, v: number): [number, number] => {
      const s0 = btn.from - e, s1 = btn.to + e, s = s0 + (s1 - s0) * u, k = (s - btn.from) / (btn.to - btn.from);
      const lo = lerp(btn.y0[0], btn.y0[1], k) - e, hi = lerp(btn.y1[0], btn.y1[1], k) + e;
      const r = R + e, d = (far === 0 ? u : 1 - u) * (s1 - s0);
      const c = d < r ? r - Math.sqrt(Math.max(0, r * r - (r - d) ** 2)) : 0;
      return [s, tForY(s, lerp(lo + c, hi - c, v))];
    };
    mm.add(new THREE.Mesh(patch(20, 10, fp(0.45), () => 0.03), std('#9a9ca2', 0.8, 0, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
    mm.add(new THREE.Mesh(patch(20, 10, fp(0.22), () => 0.04), std('#5c5e64', 0.8, 0, { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })));
    const face = fp(0);
    const top = patch(24, 12, face, (u, v) => {
      const edge = Math.min(u, 1 - u, v, 1 - v);
      return proud - 0.5 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v) - 0.18 * Math.max(0, 1 - edge / 0.07) ** 2;
    });
    mm.add(new THREE.Mesh(top, white));
    // the wall round it, from the face's edge down into the shell
    const loop: [number, number][] = [];
    for (let k = 0; k < 24; k++) loop.push([k / 24, 0]);
    for (let k = 0; k < 10; k++) loop.push([1, k / 10]);
    for (let k = 24; k > 0; k--) loop.push([k / 24, 1]);
    for (let k = 10; k >= 0; k--) loop.push([0, k / 10]);
    const rows: THREE.Vector3[][] = [[], []];
    for (const [u, v] of loop) {
      const [s, t] = face(u, v), n = normalAt(s, t);
      rows[0].push(shell(s, t).addScaledVector(n, proud - 0.18));
      rows[1].push(shell(s, t).addScaledVector(n, -0.4));
    }
    const [cs, ct] = face(0.5, 0.5), m = loop.length >> 1;
    mm.add(new THREE.Mesh(sheet(rows, rows[1][m].clone().sub(shell(cs, ct))), white));
    // how far the face stands past the outline seen from above
    const P = top.getAttribute('position');
    for (let k = 0; k < P.count; k++) past = Math.max(past, -P.getX(k) - halfWidth(P.getZ(k) + L / 2));
  });

  /* --- logos: Ninjutso's mark on the top at the back, 空 on the left side --- */
  const Lg = SORA.logo;
  mm.add(new THREE.Mesh(patch(12, 12, (u, v) => { const s = Lg.at - Lg.l / 2 + Lg.l * u; return [s, tForX(s, (v - 0.5) * Lg.w)]; }, () => 0.04), decal(logoTexture(), ink)));
  mm.add(new THREE.Mesh(patch(10, 10, (u, v) => { const s = 13.6 + 9.5 * u; return [s, tForY(s, 4.2 + 9.5 * v)]; }, () => 0.04), decal(kanjiTexture(), ink)));

  /* --- measured off the built surface, for the lab's checks (only when asked for: it takes a while) --- */
  const measure = () => {
    const box = shellGeo.boundingBox!;
    const widthAt = (s: number) => { let m = 0; for (let j = 0; j <= 200; j++) m = Math.max(m, Math.abs(shell(s, (j / 200) * Math.PI).x)); return 2 * m; };
    let peak = 0, peakAt = 0;
    for (let s = 0; s <= L; s += 0.2) { const h = shell(s, Math.PI / 2).y; if (h > peak) { peak = h; peakAt = s; } }
    let widest = 0;
    for (let s = 0; s <= L; s += 0.5) widest = Math.max(widest, widthAt(s));
    /** The front- or rearmost point of the shell at height y, mm from the front tip. */
    const reach = (y: number, rear: boolean) => {
      let best = rear ? -Infinity : Infinity;
      for (let i = 0; i <= NS; i++) for (let j = 0; j <= NT; j++) {
        const k = (i * (NT + 1) + j) * 3;
        if (Math.abs(pos[k + 1] - y) < 0.6) best = rear ? Math.max(best, pos[k + 2]) : Math.min(best, pos[k + 2]);
      }
      return best + L / 2;
    };
    let tailY = 0, tailZ = -Infinity;
    for (let k = 0; k < pos.length; k += 3) if (pos[k + 2] > tailZ + 1e-6 || (Math.abs(pos[k + 2] - tailZ) < 1e-6 && pos[k + 1] > tailY)) { tailZ = pos[k + 2]; tailY = pos[k + 1]; }
    const edgeY = (s: number) => { let m = 0, y = 0; for (let j = 0; j <= 400; j++) { const q = shell(s, (j / 400) * Math.PI); if (q.x > m) { m = q.x; y = q.y; } } return y; };
    // the skates' clearance: the least distance from any pad's outline in to the base's edge (negative if over it)
    const segDist = (p: THREE.Vector2, a: THREE.Vector2, b: THREE.Vector2) => {
      const ab = b.clone().sub(a), k = clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1);
      return a.clone().addScaledVector(ab, k).distanceTo(p);
    };
    const inside = (p: THREE.Vector2) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const A = ring[i], B = ring[j]; if ((A.y > p.y) !== (B.y > p.y) && p.x < ((B.x - A.x) * (p.y - A.y)) / (B.y - A.y) + A.x) c = !c; } return c; };
    let clearance = Infinity;
    for (const o of pads) for (const p of o) {
      let d = Infinity;
      for (let i = 0; i < ring.length; i++) d = Math.min(d, segDist(p, ring[i], ring[(i + 1) % ring.length]));
      clearance = Math.min(clearance, inside(p) ? d - 0.4 : -d); // the bevel spreads each pad 0.4 mm
    }
    const splitAt = (s: number) => shell(s, tForX(s, -splitX(s))).y;
    return {
      length: box.max.z - box.min.z,
      height: box.max.y,
      widest,
      'width 45 mm back (grip)': widthAt(45),
      'width 10 mm back': widthAt(10),
      'width 110 mm back': widthAt(110),
      'hump peak from front': peakAt,
      'height 20 mm back': shell(20, Math.PI / 2).y,
      'height 100 mm back': shell(100, Math.PI / 2).y,
      'seam from front, centre': seamS(0),
      'wheel top above desk': treadGeo.boundingBox!.max.y,
      'nose undercut at the base': reach(BASE + 0.3, false),
      'nose undercut 5.4 mm up': reach(5.4, false),
      'edge height on the sides': edgeY(60),
      'tail point height': tailY,
      'tail chamfer meets the base': reach(BASE + 0.3, true),
      'side buttons past the outline (top view)': past,
      'side split height 22 mm back': splitAt(21.8),
      'side split height 30 mm back': splitAt(30),
      'side split height 38 mm back': splitAt(38.3),
      'seam end height on the side': shell(S.side, tForX(S.side, -S.x)).y,
      'skates: least clearance to the base edge': clearance,
    } as Record<string, number>;
  };

  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  let measured: Record<string, number> | undefined;
  return { root, get measured() { return (measured ??= measure()); } };
}

export function buildMouse() {
  return buildSora().root;
}
