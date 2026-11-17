// Secretlab TITAN Evo (2022), Regular, all black. The upholstered parts are cushions rather than boxes:
// each is a pair of surfaces over a silhouette that swell from a rounded edge. The backrest has the Evo's
// outline (a narrow rounded top, straight chamfers out to the shoulders, near-parallel sides, then lower
// wings that flare just above the seat), bolsters that deepen and wrap forward toward the lumbar, and a
// tone-on-tone centre panel. Recline pivots with round covers, 4D arms on L-brackets, and an all-black
// five-star base. Origin is the floor under the seat; it faces -z.
import * as THREE from 'three';
import { add, cyl, rbox, reflective, std } from './kit';

type Cushion = {
  length: number;
  halfWidth: (v: number) => number;
  /** padding on the -z side and the +z side, before the edge rounds it off */
  front: (u: number, v: number) => number;
  back: (u: number, v: number) => number;
  /** shifts both sides along z: curvature of the whole cushion */
  bend?: (x: number, v: number) => number;
  /** per-vertex colour, for tone-on-tone panels */
  tint?: (x: number, v: number, side: -1 | 1, out: THREE.Color) => void;
  /** squareness of the edge roll: higher is boxier */
  square?: number;
  nu?: number;
  nv?: number;
};

const smooth = (a: number, b: number, x: number) => THREE.MathUtils.smoothstep(x, a, b);
/** Catmull-Rom through evenly spaced samples over [0, 1]. */
function profile(samples: number[]) {
  const n = samples.length - 1;
  return (v: number) => {
    const f = Math.min(n - 1e-6, Math.max(0, v * n)), i = Math.floor(f), t = f - i;
    const p0 = samples[Math.max(0, i - 1)], p1 = samples[i], p2 = samples[i + 1], p3 = samples[Math.min(n, i + 2)];
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  };
}

/** Builds a cushion in its own frame: x across, y along its length (v from 0 to 1), z through it. */
function cushion(o: Cushion) {
  const nu = o.nu ?? 30, nv = o.nv ?? 40, P = o.square ?? 3.2;
  const edge = (s: number) => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(s), P)), 1 / P);
  const point = (u: number, v: number, side: -1 | 1, out = new THREE.Vector3()) => {
    const x = u * o.halfWidth(v);
    const pad = (side < 0 ? o.front(u, v) : o.back(u, v)) * edge(u) * edge(2 * v - 1);
    return out.set(x, v * o.length, side * pad + (o.bend ? o.bend(x, v) : 0));
  };
  const pos: number[] = [], col: number[] = [], index: number[] = [];
  const p = new THREE.Vector3(), c = new THREE.Color();
  for (const side of [-1, 1] as const) {
    const base = pos.length / 3;
    for (let i = 0; i <= nv; i++) {
      // more rows and columns toward the edges, where the surface turns fastest
      const v = (1 - Math.cos((Math.PI * i) / nv)) / 2;
      for (let j = 0; j <= nu; j++) {
        point(Math.sin(Math.PI * (j / nu - 0.5)), v, side, p);
        pos.push(p.x, p.y, p.z);
        if (o.tint) { o.tint(p.x, v, side, c); col.push(c.r, c.g, c.b); }
      }
    }
    for (let i = 0; i < nv; i++) {
      for (let j = 0; j < nu; j++) {
        const a = base + i * (nu + 1) + j, b = a + 1, d = a + nu + 1, e = d + 1;
        if (side < 0) index.push(a, d, b, b, d, e); else index.push(a, b, d, b, e, d);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (o.tint) geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return { geometry, point, halfWidth: o.halfWidth };
}

/** A seam laid on a cushion's surface, given as (x, v) points. */
function seam(c: ReturnType<typeof cushion>, pts: [number, number][], side: -1 | 1, mat: THREE.Material) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, v]) => c.point(THREE.MathUtils.clamp(x / c.halfWidth(v), -0.92, 0.92), v, side).add(new THREE.Vector3(0, 0, side * 0.008))));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, pts.length * 4, 0.013, 5), mat);
}

// Proportions (units of 160 mm): backrest 5.1 tall and 3.3 across the shoulders, seat 3.24 wide,
// seat underside 2.8 above the floor, backrest top about 8.3.
const BACK_LEN = 5.1, SEAT_Y = 3.16, SEAT_HALF = 1.62;

export function buildChair() {
  const g = new THREE.Group();
  g.name = 'chair';
  // satin leatherette, neutral black; vertex colours carry the tone-on-tone panels
  const leather = reflective(std('#ffffff', 0.56, 0, { vertexColors: true }), 0.14);
  const seamMat = std('#0d0d0d', 0.8);
  const black = reflective(std('#1b1b1c', 0.42, 0.45), 0.6); // base, brackets, arm posts
  const plastic = std('#141415', 0.7);
  const PANEL = new THREE.Color('#363636'), BOLSTER = new THREE.Color('#171717'), BACK = new THREE.Color('#1c1c1c');

  /* ---------- Base: five tapered black arms with a gentle sweep, twin-wheel casters, gas lift ---------- */
  const arm = new THREE.Shape(); // side profile, radius along x, height along y
  arm.moveTo(0.1, 0.4); arm.quadraticCurveTo(1.0, 0.3, 1.9, 0.32); arm.lineTo(1.94, 0.42);
  arm.quadraticCurveTo(1.0, 0.48, 0.1, 0.7); arm.closePath();
  const armGeo = new THREE.ExtrudeGeometry(arm, { depth: 0.18, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.04, bevelSegments: 2, curveSegments: 10 });
  armGeo.translate(0, 0, -0.09);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const spoke = add(g, new THREE.Group(), [0, 0, 0], [0, -a, 0]);
    add(spoke, new THREE.Mesh(armGeo, black));
    rbox(spoke, 0.18, 0.16, 0.24, 0.05, plastic, [1.92, 0.26, 0]); // caster housing
    for (const z of [-0.08, 0.08]) cyl(spoke, 0.16, 0.16, 0.08, plastic, [1.96, 0.16, z], [Math.PI / 2, 0, 0], 20);
  }
  cyl(g, 0.26, 0.3, 0.36, plastic, [0, 0.56, 0], undefined, 24); // hub
  cyl(g, 0.19, 0.19, 1.62, plastic, [0, 1.48, 0], undefined, 24); // gas lift, covered for its full length
  // tilt mechanism: a chunky box under the seat pan, with the tilt lever pointing forward
  rbox(g, 0.56, 0.33, 1.25, 0.06, plastic, [0, SEAT_Y - 0.6, 0.1]);
  cyl(g, 0.21, 0.27, 0.2, plastic, [0, SEAT_Y - 0.86, 0.1], undefined, 20); // tapers into the column
  rbox(g, 0.12, 0.035, 0.42, 0.015, plastic, [0.3, SEAT_Y - 0.78, -0.62], [-0.7, 0.35, 0]); // tilt paddle
  rbox(g, 0.5, 0.05, 0.08, 0.02, plastic, [0.6, SEAT_Y - 0.55, -0.3]); // recline lever

  /* ---------- Seat: thick, flat-topped, low side bolsters, squared front ---------- */
  const seat = cushion({
    length: 3.0,
    halfWidth: profile([1.52, 1.6, SEAT_HALF, 1.6, 1.55]),
    front: () => 0.43,
    back: (u, v) => 0.4 + 0.12 * smooth(0.62, 0.9, Math.abs(u)) * (1 - 0.4 * smooth(0.6, 1, v)),
    square: 4,
    tint: (x, _v, side, c) => (side > 0 ? c.copy(BOLSTER).lerp(PANEL, 1 - smooth(0.92, 1.12, Math.abs(x))) : c.copy(BACK)),
    nu: 40,
  });
  // the seat is built lying along +y; turn it flat so it runs from the back (+z) to the front (-z)
  add(g, new THREE.Mesh(seat.geometry, leather), [0, SEAT_Y, 1.5], [-Math.PI / 2, 0, 0]);

  /* ---------- Backrest ---------- */
  const back = add(g, new THREE.Group(), [0, SEAT_Y + 0.05, 1.45], [0.115, 0, 0]); // about 6.5 degrees of recline
  const outline = profile([1.6, 1.73, 1.77, 1.73, 1.63, 1.56, 1.54, 1.54, 1.56, 1.6, 1.64, 1.6, 1.39, 1.14, 0.94, 0.805, 0.74]);
  // round the head's top corners into an arch: elliptical corners about 0.13 W across and 4% of the height deep
  const RX = 0.43, RY = 0.22;
  const halfWidth = (v: number) => {
    const t = (1 - v) * BACK_LEN;
    return t >= RY ? outline(v) : outline(v) - RX + RX * Math.sqrt(Math.max(0, 1 - ((RY - t) / RY) ** 2));
  };
  // the centre panel: 0.8 of the shoulder width up top, narrowing to half of it below about 55-60% down
  const panelHalf = (v: number) => Math.min(THREE.MathUtils.lerp(0.83, 1.32, smooth(0.36, 0.5, v)), 0.72 * outline(v));
  // how far the sides curl forward: deep wings down to about 20% from the top, then a step back to the head
  const wrap = profile([0.24, 0.26, 0.27, 0.27, 0.26, 0.25, 0.24, 0.21, 0.13, 0.06, 0.05, 0.04]);
  const rest = cushion({
    length: BACK_LEN,
    halfWidth,
    // bolsters rise from the edge of the centre panel, so their inner faces angle in toward it
    front: (u, v) => {
      const x = Math.abs(u) * halfWidth(v), p = panelHalf(v);
      return 0.17 + 0.3 * smooth(p - 0.02, p + 0.3, x) * (1 - 0.7 * smooth(0.68, 0.79, v));
    },
    back: () => 0.2,
    bend: (x, v) => -wrap(v) * x * x - 0.05 * Math.exp(-(((v - 0.25) / 0.12) ** 2)),
    tint: (x, v, side, c) => (side < 0 ? c.copy(BOLSTER).lerp(PANEL, 1 - smooth(panelHalf(v) - 0.06, panelHalf(v) + 0.06, Math.abs(x))) : c.copy(BACK)),
    nu: 36,
    nv: 48,
  });
  add(back, new THREE.Mesh(rest.geometry, leather));
  // dark seams where the centre panel meets the bolsters
  for (const s of [-1, 1]) {
    const pts: [number, number][] = [];
    for (let k = 0; k <= 10; k++) { const v = 0.05 + (k / 10) * 0.72; pts.push([s * panelHalf(v), v]); }
    back.add(seam(rest, pts, -1, seamMat));
  }
  // magnetic head pillow: a flat rounded slab about half the shoulder width, just below the top
  const pillow = cushion({ length: 0.62, halfWidth: profile([0.72, 0.82, 0.84, 0.82, 0.72]), front: () => 0.1, back: () => 0.06, square: 3.6, bend: (x) => -0.04 * x * x, tint: (_x, _v, _s, c) => c.copy(BOLSTER) });
  const pv = 0.86, onFace = rest.point(0, pv, -1);
  add(back, new THREE.Mesh(pillow.geometry, leather), [0, pv * BACK_LEN - 0.31, onFace.z - 0.06]);
  // lumbar knob on the right-hand side
  const knobAt = rest.point(1, 0.3, 1); // on the edge, where the side has curled forward
  cyl(back, 0.11, 0.11, 0.08, plastic, [knobAt.x + 0.03, knobAt.y, knobAt.z], [0, 0, Math.PI / 2], 18);

  // recline brackets with round pivot covers at the back corners of the seat
  for (const s of [-1, 1]) {
    rbox(g, 0.14, 1.4, 0.42, 0.05, black, [s * (SEAT_HALF + 0.08), SEAT_Y + 0.75, 1.4], [0.115, 0, 0]);
    cyl(g, 0.28, 0.28, 0.1, plastic, [s * (SEAT_HALF + 0.13), SEAT_Y + 0.15, 1.3], [0, 0, Math.PI / 2], 28);
  }

  /* ---------- 4D armrests: L-brackets under the seat, rectangular posts, chunky pads ---------- */
  const pad = cushion({ length: 1.75, halfWidth: profile([0.22, 0.27, 0.28, 0.27, 0.24]), front: () => 0.06, back: () => 0.1, square: 3.6, nu: 14, nv: 18, tint: (_x, _v, _s, c) => c.copy(BOLSTER) });
  const ARM_X = 2.02;
  for (const s of [-1, 1]) {
    rbox(g, ARM_X - 0.55, 0.14, 0.46, 0.05, black, [s * (0.55 + (ARM_X - 0.55) / 2), SEAT_Y - 0.42, 0.3]); // L-bracket, horizontal leg
    rbox(g, 0.16, 2.0, 0.4, 0.05, plastic, [s * ARM_X, SEAT_Y + 0.52, 0.3]); // post
    add(g, new THREE.Mesh(pad.geometry, leather), [s * ARM_X, SEAT_Y + 1.58, 1.17], [-Math.PI / 2, 0, 0]);
  }
  return g;
}
