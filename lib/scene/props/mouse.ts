// Ninjutso Sora V2 in white: 116 x 62 x 38 mm, symmetrical, low at the front with the hump behind the
// middle and a slight waist. The shell is one sculpted surface: a superellipse in plan and in section,
// with the button splits, wheel and side buttons laid onto it. Front points to -z.
import * as THREE from 'three';
import { add, reflective, std } from './kit';

const L = 0.36, W = 0.193, H = 0.235, FEET = 0.018;
const NU = 64, NT = 40;

const bump = (u: number, at: number, width: number) => Math.exp(-(((u - at) / width) ** 2));
const close = (u: number, p: number) => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * u - 1), p)), 1 / p);
const halfWidth = (u: number) => W * close(u, 2.5) * (0.9 + 0.1 * bump(u, 0.74, 0.26) - 0.035 * bump(u, 0.44, 0.12));
// blunt at the front, a longer slope down the back
const height = (u: number) => H * (u < 0.5 ? close(u, 3.2) : close(u, 2.1)) * (0.62 + 0.38 * bump(u, 0.6, 0.34));
const pw = (x: number, e: number) => Math.sign(x) * Math.pow(Math.abs(x), e);

/** A point on the shell: u runs front (0) to back (1), t runs across from the right edge (0) over the top to the left (PI). */
function shell(u: number, t: number, out: THREE.Vector3) {
  return out.set(halfWidth(u) * pw(Math.cos(t), 0.72), FEET + height(u) * Math.pow(Math.max(0, Math.sin(t)), 0.82), (u * 2 - 1) * L);
}

/** Outward normal and the tangent along u, by finite differences. */
function frame(u: number, t: number, n: THREE.Vector3, du: THREE.Vector3) {
  const p = shell(u, t, new THREE.Vector3());
  shell(Math.min(1, u + 0.004), t, du).sub(p).normalize();
  const dt = shell(u, t + 0.01, new THREE.Vector3()).sub(p).normalize();
  n.crossVectors(dt, du).normalize();
  return p;
}

function surfaceLine(points: [number, number][], lift: number, radius: number, mat: THREE.Material) {
  const n = new THREE.Vector3(), du = new THREE.Vector3();
  const pts = points.map(([u, t]) => frame(u, t, n, du).addScaledVector(n, lift));
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), points.length * 3, radius, 5), mat);
}

export function buildMouse() {
  const g = new THREE.Group();
  g.name = 'mouse';
  const white = reflective(std('#f1f1ee', 0.48), 0.35);
  const seam = std('#9a9da4', 0.6);
  const dark = std('#1d1f25', 0.7);

  // the shell
  const pos = new Float32Array((NU + 1) * (NT + 1) * 3);
  const p = new THREE.Vector3();
  for (let i = 0; i <= NU; i++) for (let j = 0; j <= NT; j++) shell(i / NU, (j / NT) * Math.PI, p).toArray(pos, (i * (NT + 1) + j) * 3);
  const index: number[] = [];
  for (let i = 0; i < NU; i++) {
    for (let j = 0; j < NT; j++) {
      const a = i * (NT + 1) + j, b = a + NT + 1;
      index.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, white));

  // a dark base on its skates, so it sits on the mat instead of melting into it
  const foot = new THREE.Shape();
  for (let i = 0; i <= 40; i++) { const u = i / 40; foot[i ? 'lineTo' : 'moveTo'](halfWidth(u) * 0.95, (u * 2 - 1) * L * 0.97); }
  for (let i = 40; i >= 0; i--) { const u = i / 40; foot.lineTo(-halfWidth(u) * 0.95, (u * 2 - 1) * L * 0.97); }
  const base = new THREE.ExtrudeGeometry(foot, { depth: FEET + 0.004, bevelEnabled: false });
  base.rotateX(Math.PI / 2).translate(0, FEET + 0.004, 0);
  g.add(new THREE.Mesh(base, dark));

  // button splits: down the middle, across where the buttons end, and along each side
  const across: [number, number][] = [];
  for (let k = 0; k <= 12; k++) { const t = 0.13 * Math.PI + (k / 12) * 0.74 * Math.PI; across.push([0.41 + 0.05 * Math.sin(t), t]); }
  g.add(surfaceLine(across, 0.0012, 0.0024, seam));
  g.add(surfaceLine([[0.03, Math.PI / 2], [0.12, Math.PI / 2], [0.3, Math.PI / 2], [0.46, Math.PI / 2]], 0.0012, 0.0026, seam));
  for (const t of [0.13 * Math.PI, 0.87 * Math.PI]) g.add(surfaceLine([[0.03, t], [0.15, t], [0.3, t], [0.41 + 0.05 * Math.sin(t), t]], 0.0012, 0.0024, seam));

  // scroll wheel in its slot
  const n = new THREE.Vector3(), du = new THREE.Vector3();
  const at = frame(0.22, Math.PI / 2, n, du);
  const tilt = Math.atan2(-du.y, du.z);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.02, 0.13), dark), at.clone().addScaledVector(n, -0.006).toArray(), [tilt, 0, 0]);
  const wheel = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.034, 24), std('#4d55c9', 0.45)), at.clone().addScaledVector(n, -0.03).toArray(), [0, 0, Math.PI / 2]);
  wheel.castShadow = false;

  // two side buttons on the left
  for (const [u0, u1] of [[0.37, 0.47], [0.5, 0.6]]) g.add(surfaceLine([[u0, 0.79 * Math.PI], [(u0 + u1) / 2, 0.79 * Math.PI], [u1, 0.79 * Math.PI]], 0.006, 0.011, white));
  return g;
}
