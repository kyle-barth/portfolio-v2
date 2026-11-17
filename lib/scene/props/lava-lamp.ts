// The classic 14.5 inch Lava lamp, built from the profiles measured off Lava's own side-on drawing
// (specs/lava.ts, millimetres) and scaled to desk units (1 = 160 mm): an hourglass base of satin
// aluminium, a glass bottle widest at its heel that tapers into a matching cap, golden liquid and red wax
// that rises, stretches, merges and sinks. The wax is a metaball field (marching cubes) rebuilt as it
// moves, faded out just inside the glass so it never passes through it. The lamp's warm light is the
// scene's key light, so everything inside the bottle is self-lit (matcaps and vertex-coloured glow) rather
// than lit by that light from a few millimetres away, and the metal's warm reflections of the glowing
// bottle (the collar's top, the cap's lower edge) are painted on.
import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { LAVA } from '../specs/lava';
import { canvasTexture, reflective } from './kit';

const MM = 1 / 160; // desk units per millimetre
type Profile = readonly (readonly [number, number])[];

type Blob = { phase: number; period: number; wobble: number; size: number; drift: number };

const latheOf = (profile: Profile, segments = 64) => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);

/** A profile's radius at height y, between points (the profile must rise in y). */
function radiusAt(profile: Profile, y: number) {
  if (y <= profile[0][1]) return profile[0][0];
  for (let i = 1; i < profile.length; i++) {
    const [r0, y0] = profile[i - 1], [r1, y1] = profile[i];
    if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return profile[profile.length - 1][0];
}
/** The inside of the glass at height y. */
const innerRadius = (y: number) => radiusAt(LAVA.glass.profile, y) - LAVA.glass.wall;

/** Smallest and largest radius among a geometry's vertices between two heights. */
function radiusRange(geo: THREE.BufferGeometry, y0: number, y1: number) {
  const p = geo.attributes.position;
  let lo = Infinity, hi = 0;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y < y0 || y > y1) continue;
    const r = Math.hypot(p.getX(i), p.getZ(i));
    lo = Math.min(lo, r); hi = Math.max(hi, r);
  }
  return { lo, hi };
}

/**
 * MarchingCubes.addBall, but round in the world: the field box is `aspect` times taller than it is wide,
 * so a ball that is round in field units comes out stretched; this squashes its falloff vertically to
 * match. (Real wax is mostly round blobs, not spindles.)
 */
function addRoundBall(mc: MarchingCubes, bx: number, by: number, bz: number, strength: number, subtract: number, aspect: number) {
  const size = mc.size, size2 = size * size, field = mc.field;
  const radius = size * Math.sqrt(strength / subtract), ry = radius / aspect;
  const xs = bx * size, ys = by * size, zs = bz * size;
  const clampI = (v: number) => Math.min(size - 1, Math.max(1, Math.floor(v)));
  for (let z = clampI(zs - radius); z < clampI(zs + radius); z++) {
    const fz = z / size - bz, fz2 = fz * fz;
    for (let y = clampI(ys - ry); y < clampI(ys + ry); y++) {
      const fy = (y / size - by) * aspect, fy2 = fy * fy, row = z * size2 + y * size;
      for (let x = clampI(xs - radius); x < clampI(xs + radius); x++) {
        const fx = x / size - bx, v = strength / (0.000001 + fx * fx + fy2 + fz2) - subtract;
        if (v > 0) field[row + x] += v;
      }
    }
  }
}

function radial(x: CanvasRenderingContext2D, cx: number, cy: number, r: number, stops: [number, string][]) {
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
  for (const [k, c] of stops) g.addColorStop(k, c);
  x.fillStyle = g;
  x.fillRect(0, 0, x.canvas.width, x.canvas.height);
}

/**
 * Lit-sphere texture for the wax: crimson, lighter and pinker toward the edges where light from the bulb
 * scatters through the thin wax (never a dark outline), and a soft sheen.
 */
const waxMatcap = () =>
  canvasTexture(256, 256, (x) => {
    radial(x, 128, 128, 128, [[0, '#e8141e'], [0.55, '#e41a26'], [0.82, '#ff3a4c'], [0.95, '#ff6474'], [1, '#ff8088']]);
    x.globalCompositeOperation = 'lighter';
    radial(x, 128, 250, 110, [[0, 'rgba(255,150,130,0.42)'], [1, 'rgba(255,150,130,0)']]); // undersides lit by the bulb
    radial(x, 96, 84, 34, [[0, 'rgba(255,200,200,0.28)'], [1, 'rgba(255,200,200,0)']]);
  });

/** Glass: nothing face-on, a thin warm rim and a soft vertical highlight; drawn additively. */
const glassMatcap = () =>
  canvasTexture(256, 256, (x) => {
    x.fillStyle = '#000';
    x.fillRect(0, 0, 256, 256);
    // the edges carry the liquid's orange, not white
    radial(x, 128, 128, 128, [[0, 'rgba(0,0,0,0)'], [0.82, 'rgba(0,0,0,0)'], [0.95, 'rgba(255,128,30,0.3)'], [1, 'rgba(255,128,30,0.08)']]);
    x.globalCompositeOperation = 'lighter';
    const s = x.createLinearGradient(60, 0, 84, 0);
    s.addColorStop(0, 'rgba(255,220,180,0)');
    s.addColorStop(0.5, 'rgba(255,220,180,0.3)');
    s.addColorStop(1, 'rgba(255,220,180,0)');
    x.fillStyle = s;
    x.fillRect(60, 56, 24, 140);
  });

export function buildLavaLamp({ reduce = false, lowPower = false } = {}) {
  const g = new THREE.Group();
  g.name = 'lava-lamp';
  const mm = new THREE.Group(); // everything below is in millimetres
  mm.scale.setScalar(MM);
  g.add(mm);
  const { base: B, glass: G, liquid: Q, cap: C } = LAVA;
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material) => { const m = new THREE.Mesh(geo, mat); mm.add(m); return m; };

  /* ---------- Satin aluminium base and cap, with the glow they reflect ---------- */
  const glowU = { value: new THREE.Color(0, 0, 0) };
  // silver satin aluminium that barely mirrors the cool room: lit by the lamp, the real base and cap read
  // dark and warm, never blue under the moonlight (the warmth comes from the painted glow, not the metal)
  const metal = reflective(new THREE.MeshStandardMaterial({ color: '#c4c6c8', roughness: 0.48, metalness: 0.75 }), 0.15);
  metal.onBeforeCompile = (s) => {
    s.uniforms.uGlow = glowU;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying float vLampY;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLampY = position.y;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uGlow;\nvarying float vLampY;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        // the collar's upper half mirrors the glowing bottle above it; the cap, the darkest part of the
        // lamp, only catches it along its lowest 2 mm
        totalEmissiveRadiance += uGlow * (smoothstep(125.0, 156.0, vLampY) * (1.0 - step(157.2, vLampY)) * 0.35
          + (1.0 - smoothstep(307.6, 309.6, vLampY)) * step(306.0, vLampY) * 0.25);`);
  };
  const baseGeo = latheOf(B.profile);
  add(baseGeo, metal);
  const capGeo = latheOf(C.profile, 48);
  add(capGeo, metal);

  /* ---------- Liquid: glowing brightest just above the collar, cooling toward the cap ---------- */
  // The back faces are the solid glowing backdrop; a faint front layer hazes the wax in front of it.
  const inner = G.profile.filter(([, y]) => y > Q.bottom && y < Q.top).map(([r, y]) => [r - G.wall - 0.5, y] as [number, number]);
  const liquidGeo = latheOf([[0, Q.bottom], [innerRadius(Q.bottom) - 0.5, Q.bottom], ...inner, [innerRadius(Q.top) - 0.5, Q.top], [0, Q.top]], 48);
  {
    const pos = liquidGeo.attributes.position, col = new Float32Array(pos.count * 3);
    // saturated orange, golden only in the lowest 15 mm over the bulb; paler colours wash out to cream
    // under the scene's tone mapping and bloom
    const heel = new THREE.Color('#f9b717'), bright = new THREE.Color('#ff7400'), body = new THREE.Color('#e65000'), deep = new THREE.Color('#a83000'), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const k = THREE.MathUtils.clamp((pos.getY(i) - B.top) / (Q.top - B.top), 0, 1);
      c.copy(heel).lerp(bright, THREE.MathUtils.smoothstep(k, 0, 0.04)).lerp(body, THREE.MathUtils.smoothstep(k, 0.04, 0.22)).lerp(deep, THREE.MathUtils.smoothstep(k, 0.5, 1));
      c.multiplyScalar(THREE.MathUtils.lerp(0.85, 0.68, k));
      col.set([c.r, c.g, c.b], i * 3);
    }
    liquidGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const liquidBack = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
  add(liquidGeo, liquidBack);
  const liquidFront = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.1, depthWrite: false });
  add(liquidGeo, liquidFront).renderOrder = 3;

  /* ---------- Wax: metaballs in the liquid's box, kept inside the glass ---------- */
  const waxMat = new THREE.MeshMatcapMaterial({ matcap: waxMatcap() });
  // the pool, lit only from directly beneath, is the darkest wax; wax cooling under the cap dims a little
  waxMat.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWaxY;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWaxY = position.y;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vWaxY;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(0.3, 1.0, smoothstep(-0.9, -0.6, vWaxY)) * mix(1.0, 0.82, smoothstep(0.55, 1.0, vWaxY));');
  };
  // The field is a little taller than wide (1.5:1), so round blobs stretch slightly as wax does.
  const res = lowPower ? 24 : 36;
  const wax = new MarchingCubes(res, waxMat, false, false, lowPower ? 14000 : 30000);
  const halfH = (Q.top - Q.bottom) / 2, halfW = halfH / 1.5;
  wax.position.set(0, Q.bottom + halfH, 0);
  wax.scale.set(halfW, halfH, halfW);
  wax.isolation = 80;
  mm.add(wax);
  // The field is a box but the bottle tapers: fade the field to nothing just inside the glass, so the wax
  // flattens against the wall the way real wax does instead of passing through it.
  const N = wax.size, mask = new Float32Array(N * N * N);
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const X = halfW * ((2 * x) / N - 1), Y = Q.bottom + (2 * halfH * y) / N, Z = halfW * ((2 * z) / N - 1);
    const R = innerRadius(Y);
    mask[x + y * N + z * N * N] = 1 - THREE.MathUtils.smoothstep(Math.hypot(X, Z), R - 6, R - 1.3);
  }

  /* ---------- Glass, drawn last, and the bright ring where it leaves the collar ---------- */
  const glassMat = new THREE.MeshMatcapMaterial({ matcap: glassMatcap(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const glassGeo = latheOf(G.profile);
  add(glassGeo, glassMat).renderOrder = 4;
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const ring = add(new THREE.TorusGeometry(radiusAt(G.profile, B.top + 0.6), 0.9, 6, 64), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = B.top + 0.6;

  // Light from inside the lamp. The glowing bottle is a broad source, not a point, so the falloff is
  // linear: things right beside it (the plant, the PC's glass) don't blow out, the far desk still gets some.
  const light = new THREE.PointLight('#ff9a4a', 0, 14, 1);
  light.position.set(0, (B.top + G.top.y) / 2, 0);
  light.castShadow = true;
  light.shadow.mapSize.set(512, 512);
  light.shadow.bias = -0.002;
  light.shadow.autoUpdate = false;
  light.shadow.needsUpdate = true;
  mm.add(light);
  g.traverse((o) => { if (o !== light) o.castShadow = false; });

  /* ---------- Measured off the built parts, for the lab's checks ---------- */
  const capR = radiusRange(capGeo, 360, 366), glassTop = radiusRange(glassGeo, G.top.y - 0.5, G.top.y + 0.5);
  const measured: Record<string, number> = {
    'overall height': new THREE.Box3().setFromBufferAttribute(capGeo.attributes.position as THREE.BufferAttribute).max.y,
    'foot diameter': 2 * radiusRange(baseGeo, 0, 10).hi,
    'waist diameter': 2 * radiusRange(baseGeo, 79, 82).lo + 1, // across the seam's shoulders, not into its groove
    'waist height': B.waist.y,
    'collar top height': B.top,
    'collar top diameter': 2 * radiusRange(baseGeo, 150, 157.2).hi - 1, // the lip stands about half a mm proud
    'glass widest diameter': 2 * radiusRange(glassGeo, B.top, G.top.y).hi,
    'glass top diameter': 2 * glassTop.hi,
    'visible glass height': C.bottom - B.top,
    'cap height': LAVA.height - C.bottom,
    'cap top diameter': 2 * capR.hi,
  };

  /* ---------- Motion ---------- */
  const blobs: Blob[] = Array.from({ length: 6 }, (_, i) => ({
    phase: i / 6 + (i % 2) * 0.13,
    period: 18 + i * 3.4,
    wobble: 0.6 + (i % 3) * 0.3,
    size: 0.7 + (i % 3) * 0.3,
    drift: i * 1.7,
  }));
  const speed = reduce ? 0.5 : 1;
  // rise slowly, linger at the top, sink, linger in the pool (0 = pool, 1 = top)
  const height = (cyc: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, cyc < 0.5 ? cyc / 0.42 : (1 - cyc) / 0.42)));
  let frame = 0;
  const RING = new THREE.Color('#ffd9a0'), GLOW = new THREE.Color('#ff9a4a');

  /** level: 0 = off, 1 = fully on. flicker: a small multiplier from the scene. */
  function update(t: number, level: number, flicker = 1) {
    const L = level * flicker;
    liquidBack.color.setScalar(0.1 + 0.9 * L);
    liquidFront.color.setScalar(0.1 + 0.9 * L);
    waxMat.color.setScalar(0.22 + 0.78 * L);
    ringMat.color.copy(RING).multiplyScalar(1.1 * L);
    glowU.value.copy(GLOW).multiplyScalar(0.6 * L);
    light.intensity = 10 * L;

    if (lowPower && frame++ % 2) return; // rebuild the wax every other frame on phones
    wax.reset();
    const A = halfH / halfW, ball = (x: number, y: number, z: number, s: number) => addRoundBall(wax, x, y, z, s, 12, A);
    // the domed pool of melted wax at the bottom, rising a little clear of the collar
    ball(0.5, 0.06, 0.5, 2.2);
    for (const [x, z] of [[0.36, 0.5], [0.64, 0.5], [0.5, 0.36], [0.5, 0.64]]) ball(x, 0.05, z, 1.2);
    // wax cooling under the cap: a cluster of round blobs pressed against the top
    for (const [x, y, z, s] of [[0.5, 0.955, 0.5, 0.7], [0.41, 0.92, 0.55, 0.5], [0.59, 0.92, 0.45, 0.5], [0.46, 0.86, 0.4, 0.42], [0.56, 0.865, 0.6, 0.4]]) ball(x, y, z, s);
    const tt = t * speed;
    for (const b of blobs) {
      const cyc = ((tt / b.period + b.phase) % 1 + 1) % 1;
      const h = height(cyc);
      const v = (height((cyc + 0.004) % 1) - h) / 0.004; // + rising, - sinking
      const y = 0.14 + h * 0.66;
      const narrow = 1 - y * 0.55; // the bottle tapers to half its width at the top
      const x = 0.5 + Math.sin(tt * 0.21 * b.wobble + b.drift) * 0.09 * narrow;
      const z = 0.5 + Math.cos(tt * 0.17 * b.wobble + b.drift * 1.3) * 0.09 * narrow;
      const s = 1.6 * b.size * (0.6 + 0.4 * narrow); // 25-40 mm blobs, smaller where the bottle narrows
      ball(x, y, z, s);
      // a smaller ball just behind a moving blob gives it a slight teardrop, as warm wax pulls out
      const trail = Math.min(1, Math.abs(v) * 0.9);
      if (trail > 0.05) ball(x, y - Math.sign(v) * 0.045 * trail, z, s * 0.3 * trail);
    }
    const field = wax.field;
    for (let i = 0; i < field.length; i++) field[i] *= mask[i];
    wax.update();
  }
  update(0, 0);

  return { root: g, update, light, measured };
}
