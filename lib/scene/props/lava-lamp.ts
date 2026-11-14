// A classic lava lamp: conical metal base, tapered glass bottle of amber liquid, and wax that rises,
// stretches, merges and sinks. The wax is a metaball field (marching cubes) rebuilt as it moves.
// Its warm light is the scene's key light, so everything inside the bottle is self-lit (matcaps and
// vertex-coloured glow) rather than lit by that light from a few millimetres away. About 370 mm tall.
import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { add, canvasTexture, lathe, std } from './kit';

const BOTTLE: [number, number][] = [[0.15, 0.66], [0.2, 0.78], [0.25, 1.02], [0.245, 1.22], [0.2, 1.55], [0.15, 1.85], [0.12, 2.0]];
const LIQUID_BOTTOM = 0.7, LIQUID_TOP = 1.96;

type Blob = { phase: number; period: number; wobble: number; size: number; drift: number };

function radial(x: CanvasRenderingContext2D, cx: number, cy: number, r: number, stops: [number, string][]) {
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
  for (const [k, c] of stops) g.addColorStop(k, c);
  x.fillStyle = g;
  x.fillRect(0, 0, x.canvas.width, x.canvas.height);
}

/** Lit-sphere texture for the wax: a warm, translucent core, deep red edges, the bulb glowing up from below. */
const waxMatcap = () =>
  canvasTexture(256, 256, (x) => {
    radial(x, 128, 140, 132, [[0, '#ffb978'], [0.42, '#ff6f2c'], [0.78, '#d9361a'], [0.94, '#8c1508'], [1, '#4a0803']]);
    x.globalCompositeOperation = 'lighter';
    radial(x, 128, 262, 118, [[0, 'rgba(255,205,110,0.75)'], [1, 'rgba(255,205,110,0)']]);
    radial(x, 94, 80, 44, [[0, 'rgba(255,238,220,0.55)'], [1, 'rgba(255,238,220,0)']]);
  });

/** Glass: nothing face-on, a bright rim and a long vertical highlight; drawn additively. */
const glassMatcap = () =>
  canvasTexture(256, 256, (x) => {
    x.fillStyle = '#000';
    x.fillRect(0, 0, 256, 256);
    radial(x, 128, 128, 128, [[0, 'rgba(0,0,0,0)'], [0.7, 'rgba(0,0,0,0)'], [0.92, 'rgba(255,236,214,0.42)'], [1, 'rgba(255,236,214,0.12)']]);
    x.globalCompositeOperation = 'lighter';
    const s = x.createLinearGradient(52, 0, 92, 0);
    s.addColorStop(0, 'rgba(255,255,255,0)');
    s.addColorStop(0.5, 'rgba(255,248,240,0.5)');
    s.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = s;
    x.fillRect(52, 46, 40, 164);
  });

export function buildLavaLamp({ reduce = false, lowPower = false } = {}) {
  const g = new THREE.Group();
  g.name = 'lava-lamp';
  const metal = std('#9aa0a8', 0.32, 0.75);

  // base cone with a lip, and the cap
  lathe(g, [[0, 0], [0.34, 0], [0.345, 0.025], [0.33, 0.05], [0.2, 0.6], [0.21, 0.63], [0.17, 0.66], [0, 0.66]], metal, undefined, 48);
  lathe(g, [[0, 2.32], [0.07, 2.32], [0.075, 2.3], [0.125, 2.0], [0.115, 1.98], [0, 1.98]], metal, undefined, 40);

  // the bulb glowing up through the bottom of the bottle
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  add(g, new THREE.Mesh(new THREE.CircleGeometry(0.15, 28), bulbMat), [0, 0.665, 0], [-Math.PI / 2, 0, 0]);

  // Liquid: the inside of the bottle, glowing brightest just above the bulb and cooling toward the cap.
  // The back faces are the solid glowing backdrop, and a faint front layer hazes the wax in front of it.
  const liquidGeo = new THREE.LatheGeometry(BOTTLE.map(([r, y]) => new THREE.Vector2(r - 0.012, y)), 40);
  {
    const pos = liquidGeo.attributes.position, col = new Float32Array(pos.count * 3);
    const hot = new THREE.Color('#ffd27c'), warm = new THREE.Color('#ff8f34'), cool = new THREE.Color('#8a3414'), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const k = (pos.getY(i) - 0.66) / (2.0 - 0.66);
      c.copy(hot).lerp(warm, THREE.MathUtils.smoothstep(k, 0, 0.5)).lerp(cool, THREE.MathUtils.smoothstep(k, 0.45, 1));
      c.multiplyScalar(THREE.MathUtils.lerp(1.45, 0.7, k));
      col.set([c.r, c.g, c.b], i * 3);
    }
    liquidGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const liquidBack = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
  add(g, new THREE.Mesh(liquidGeo, liquidBack));
  const liquidFront = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.16, depthWrite: false });
  add(g, new THREE.Mesh(liquidGeo, liquidFront)).renderOrder = 3;

  // wax: metaballs inside the bottle's inner volume
  const waxMat = new THREE.MeshMatcapMaterial({ matcap: waxMatcap() });
  // wax near the bulb is hotter and brighter than wax cooling at the top
  waxMat.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWaxY;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWaxY = position.y;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vWaxY;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(1.2, 0.62, smoothstep(-1.0, 1.0, vWaxY));');
  };
  // The field is a little taller than wide (1.5:1), so round blobs stretch slightly as wax does.
  const res = lowPower ? 24 : 36;
  const wax = new MarchingCubes(res, waxMat, false, false, lowPower ? 14000 : 30000);
  const halfH = (LIQUID_TOP - LIQUID_BOTTOM) / 2, halfW = halfH / 1.5;
  wax.position.set(0, LIQUID_BOTTOM + halfH, 0);
  wax.scale.set(halfW, halfH, halfW);
  wax.isolation = 80;
  g.add(wax);

  // glass, drawn last
  const glassMat = new THREE.MeshMatcapMaterial({ matcap: glassMatcap(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  lathe(g, BOTTLE, glassMat, undefined, 48).renderOrder = 4;

  // Light from inside the lamp. The glowing bottle is a broad source, not a point, so the falloff is
  // linear: things right beside it (the plant, the PC's glass) don't blow out, the far desk still gets some.
  const light = new THREE.PointLight('#ff9a4a', 0, 14, 1);
  light.position.set(0, 1.25, 0);
  light.castShadow = true;
  light.shadow.mapSize.set(512, 512);
  light.shadow.bias = -0.002;
  light.shadow.autoUpdate = false;
  light.shadow.needsUpdate = true;
  g.add(light);

  g.traverse((o) => { if (o !== light) o.castShadow = false; });

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
  const BULB = new THREE.Color('#ffd7a0');

  /** level: 0 = off, 1 = fully on. flicker: a small multiplier from the scene. */
  function update(t: number, level: number, flicker = 1) {
    const L = level * flicker;
    bulbMat.color.copy(BULB).multiplyScalar(1.3 * L);
    liquidBack.color.setScalar(0.1 + 0.9 * L);
    liquidFront.color.setScalar(0.1 + 0.9 * L);
    waxMat.color.setScalar(0.22 + 0.78 * L);
    light.intensity = 10 * L;

    if (lowPower && frame++ % 2) return; // rebuild the wax every other frame on phones
    wax.reset();
    // the pool of melted wax at the bottom: a few low, wide blobs that the rising wax pulls away from
    wax.addBall(0.5, 0.02, 0.5, 1.15, 12);
    wax.addBall(0.44, 0.03, 0.55, 0.7, 12);
    wax.addBall(0.56, 0.03, 0.45, 0.7, 12);
    const tt = t * speed;
    for (const b of blobs) {
      const cyc = ((tt / b.period + b.phase) % 1 + 1) % 1;
      const h = height(cyc);
      const v = (height((cyc + 0.004) % 1) - h) / 0.004; // + rising, - sinking
      const y = 0.08 + h * 0.8;
      const narrow = 1 - y * 0.4; // the bottle tapers toward the top
      const x = 0.5 + Math.sin(tt * 0.21 * b.wobble + b.drift) * 0.08 * narrow;
      const z = 0.5 + Math.cos(tt * 0.17 * b.wobble + b.drift * 1.3) * 0.08 * narrow;
      const s = 0.92 * b.size * (0.6 + 0.4 * narrow);
      wax.addBall(x, y, z, s, 12);
      // a smaller ball trailing behind a moving blob draws it out into a teardrop
      const trail = Math.min(1, Math.abs(v) * 0.9);
      if (trail > 0.05) wax.addBall(x, y - Math.sign(v) * 0.07 * trail, z, s * 0.45 * trail, 12);
    }
    wax.update();
  }
  update(0, 0);

  return { root: g, update, light };
}
