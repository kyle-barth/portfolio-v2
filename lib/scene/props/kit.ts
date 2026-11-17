// Small helpers for building props from primitives. Units: 1 = 160 mm; the desk top is y = 0.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export type V3 = [number, number, number];

export const std = (color: string, roughness = 0.6, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

/** Mark a material to pick up the night-room reflections (see night-env.ts). */
export function reflective<T extends THREE.Material>(mat: T, intensity = 1): T {
  mat.userData.env = intensity;
  return mat;
}

export function add<T extends THREE.Object3D>(parent: THREE.Object3D, obj: T, p?: V3, r?: V3): T {
  if (p) obj.position.set(p[0], p[1], p[2]);
  if (r) obj.rotation.set(r[0], r[1], r[2]);
  parent.add(obj);
  return obj;
}

export const box = (parent: THREE.Object3D, w: number, h: number, d: number, mat: THREE.Material, p?: V3, r?: V3) =>
  add(parent, new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), p, r);

/** Rounded box; the radius is clamped so it always fits. */
export const rbox = (parent: THREE.Object3D, w: number, h: number, d: number, radius: number, mat: THREE.Material, p?: V3, r?: V3, segments = 3) =>
  add(parent, new THREE.Mesh(new RoundedBoxGeometry(w, h, d, segments, Math.min(radius, Math.min(w, h, d) / 2 - 1e-4)), mat), p, r);

export const cyl = (parent: THREE.Object3D, rTop: number, rBottom: number, h: number, mat: THREE.Material, p?: V3, r?: V3, segments = 28) =>
  add(parent, new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), mat), p, r);

/** Revolve a profile of [radius, height] points around the y axis. */
export const lathe = (parent: THREE.Object3D, profile: [number, number][], mat: THREE.Material, p?: V3, segments = 40) =>
  add(parent, new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments), mat), p);

/** A rod between two points. */
export function rod(parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, radius: number, mat: THREE.Material) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, dir.length(), 12), mat);
  m.position.copy(from).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  parent.add(m);
  return m;
}

export function canvasTexture(w: number, h: number, draw: (x: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Deterministic random numbers, so the plant and anything else random looks the same on every visit. */
export function seeded(seed = 7) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const noShadows = (root: THREE.Object3D) => root.traverse((o) => { o.castShadow = false; });
