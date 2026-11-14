// Bambu Lab P2S with an AMS 2 Pro on top. Every size and position comes from the measured spec in
// specs/p2s.ts (millimetres, from Bambu's orthographic product renders); the model is built in mm and
// scaled to desk units (1 unit = 160 mm). The body is a U-shaped wall extruded upward, so its vertical
// corners and its top edges get their own radii, with the door opening between the front pillars. Static
// parts are merged by material; the moving parts (gantry, toolhead, bed, print, feeding spool) and the
// see-through lid stay separate. It prints a small pixel-art garage in the amber filament from slot 4.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeByMaterial } from './geometry';
import { reflective } from './props/kit';
import { P2S } from './specs/p2s';

const MM = 1 / 160; // desk units per millimetre
const BAMBU_GREEN = '#00ae42';
const SPOOLS = ['#efece6', '#202327', '#2fa35a', '#ff8a2c']; // white, black, green, amber (feeding)
const NOZZLE_Y = P2S.chamber.xRail.y - 41; // nozzle tip, with the toolhead hanging off the X rail

function canvasTex(w: number, h: number, draw: (x: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Fine lines around the circumference so the filament reads as wound. */
function windingTexture() {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 128;
  const x = c.getContext('2d')!;
  for (let i = 0; i < 128; i++) {
    const v = 200 + (i % 4 < 2 ? 40 : 0) + Math.random() * 15;
    x.fillStyle = `rgb(${v},${v},${v})`;
    x.fillRect(0, i, 8, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 3);
  return t;
}

// The print: a pixel-art garage with a roof and roller door. '#' full depth, '=' door slat, ':' groove.
const ART = [
  '....##....',
  '...####...',
  '..######..',
  '.########.',
  '##########',
  '##======##',
  '##::::::##',
  '##======##',
  '##::::::##',
  '##======##',
];
const DEPTH: Record<string, number> = { '#': 38, '=': 27, ':': 16 };

function printGeometry(v = 11.5) {
  const parts: THREE.BufferGeometry[] = [];
  const rows = ART.length, cols = ART[0].length;
  ART.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      const d = DEPTH[ch];
      if (!d) return;
      const g = new THREE.BoxGeometry(v, v, d);
      g.translate((c - (cols - 1) / 2) * v, (rows - 1 - r) * v + v / 2, -19 + d / 2);
      parts.push(g.toNonIndexed());
      g.dispose();
    }),
  );
  const geometry = BufferGeometryUtils.mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return { geometry, height: rows * v };
}

/** Text drawn to a cap height and stretched to a width, for wide display lettering (all px). */
function fitText(x: CanvasRenderingContext2D, text: string, left: number, baseline: number, cap: number, width: number, weight = 700) {
  x.font = `${weight} ${cap / 0.72}px system-ui, sans-serif`;
  const w0 = x.measureText(text).width;
  x.save();
  x.translate(left, baseline);
  x.scale(width / w0, 1);
  x.fillText(text, 0, 0);
  x.restore();
}

/** A rounded rectangle centred on the origin. */
function roundedRect(w: number, h: number, r: number, path: THREE.Path = new THREE.Shape()) {
  const x0 = -w / 2, y0 = -h / 2, x1 = w / 2, y1 = h / 2;
  path.moveTo(x0 + r, y0);
  path.lineTo(x1 - r, y0); path.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  path.lineTo(x1, y1 - r); path.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  path.lineTo(x0 + r, y1); path.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  path.lineTo(x0, y0 + r); path.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  return path;
}

/**
 * The body's walls: a U-shaped footprint (sides, back, and the two front pillars) extruded upward with a
 * bevel. The bevel grows the outline by edgeR, so the outline is drawn that much inside the final size.
 */
function wallsGeometry() {
  const { w, h, d, feet, cornerR, edgeR: e, pillarDepth } = P2S.body;
  const xo = w / 2 - e, zo = d / 2 - e, rc = cornerR - e;
  const xp = w / 2 - P2S.front.pillar + e; // pillar inner edge (the bevel pushes it into the door opening)
  const zf = d / 2 - pillarDepth + e; // back of the pillars
  const wall = 10, xi = w / 2 - wall + e, zi = -d / 2 + wall + e; // inside faces, hidden by the chamber lining
  const pts: [number, number][] = [[-xp, zo]];
  const arc = (cx: number, cz: number, a0: number, a1: number) => {
    for (let i = 0; i <= 6; i++) { const a = a0 + ((a1 - a0) * i) / 6; pts.push([cx + rc * Math.cos(a), cz + rc * Math.sin(a)]); }
  };
  arc(-xo + rc, zo - rc, Math.PI / 2, Math.PI);
  arc(-xo + rc, -zo + rc, Math.PI, Math.PI * 1.5);
  arc(xo - rc, -zo + rc, Math.PI * 1.5, Math.PI * 2);
  arc(xo - rc, zo - rc, 0, Math.PI / 2);
  pts.push([xp, zo], [xp, zf], [xi, zf], [xi, zi], [-xi, zi], [-xi, zf], [-xp, zf]);
  // shape space is (x, -z): after rotateX(-90deg) the shape's y becomes -z and the extrusion becomes +y
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h - feet - 2 * e, bevelEnabled: true, bevelSize: e, bevelThickness: e, bevelSegments: 3, curveSegments: 4 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, feet + e, 0);
  return geo;
}

/** The Bambu Lab mark (two bars split by a rising diagonal) with the wordmark underneath. */
function sideMarkTexture() {
  const { sideMark: m } = P2S;
  const W = m.word.w + 1, H = m.top - (m.word.top - m.word.h); // mm covered by the texture
  const k = 4; // px per mm
  return {
    w: W, h: H,
    tex: canvasTex(Math.round(W * k), Math.round(H * k), (x) => {
      x.fillStyle = '#1b1c1e';
      const mx = ((W - m.w) / 2) * k, mw = m.w * k, mh = m.h * k, bar = mw * 0.47;
      x.fillRect(mx, 0, bar, mh);
      x.fillRect(mx + mw - bar, 0, bar, mh);
      // the white diagonal cut across both bars, rising to the right
      x.globalCompositeOperation = 'destination-out';
      x.beginPath();
      x.moveTo(mx - 2, mh * 0.74); x.lineTo(mx + mw + 2, mh * 0.53); x.lineTo(mx + mw + 2, mh * 0.53 + mh * 0.045); x.lineTo(mx - 2, mh * 0.74 + mh * 0.045);
      x.closePath(); x.fill();
      x.globalCompositeOperation = 'source-over';
      x.textBaseline = 'alphabetic';
      fitText(x, 'Bambu Lab', ((W - m.word.w) / 2) * k, H * k - 2, m.word.h * k * 0.92, m.word.w * k, 600);
    }),
  };
}

export function buildP2S({ reduce = false, ams = true } = {}) {
  const { body: B, front: F } = P2S;
  const root = new THREE.Group();
  root.name = 'p2s';
  const mm = new THREE.Group(); // everything below is in millimetres
  mm.scale.setScalar(MM);
  root.add(mm);
  const shell = new THREE.Group();

  const std = (color: string, roughness: number, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const M = {
    body: reflective(std('#808285', 0.5, 0.35), 0.5), // medium grey, fine satin metallic finish
    plinth: std('#17181a', 0.75),
    trim: reflective(std('#141619', 0.4, 0.2), 0.5),
    inside: std('#141517', 0.9, 0, { side: THREE.BackSide }),
    // near-black tinted glass (a dielectric: clear head-on, reflective at glancing angles); vertex alpha
    // lets more of the lit chamber through at the top than at the bottom
    glass: reflective(std('#0a0b0d', 0.05, 0, { transparent: true, depthWrite: false, vertexColors: true }), 1),
    roofGlass: reflective(std('#0c0e12', 0.08, 0.2), 1),
    handle: reflective(std('#d8dade', 0.42, 0.05), 0.5),
    metal: reflective(std('#b9bdc3', 0.3, 0.9), 0.8),
    rail: reflective(std('#c9ccd0', 0.25, 1), 0.8), // the polished X rod
    rod: std('#4a4e54', 0.4, 0.7), // Y rails and Z rods, dull in the dark chamber
    screw: std('#2e3135', 0.45, 0.6),
    head: reflective(std('#8e9297', 0.38, 0.55), 0.6),
    dark: std('#1a1c1f', 0.6),
    plate: std('#2a2b2e', 0.75, 0.1),
    screenRim: reflective(std('#b5b9be', 0.35, 0.6), 0.6), // reads as light silver even in a dark room
    screenGlass: reflective(std('#050607', 0.08, 0.3), 1),
    housing: std('#2a2c30', 0.55, 0.2),
    ams: reflective(std('#2a2b2e', 0.45, 0.15), 0.5), // dark grey tray
    amsFrame: reflective(std('#4a4c50', 0.45, 0.1), 0.5), // the top frame round the lid
    amsLip: std('#6a6c6f', 0.4, 0.2), // the lighter lip round the top of the tub
    amsWall: std('#0b0b0c', 0.85), // opaque inner wall behind the feeders
    amsEnd: std('#5a5d61', 0.7), // the bays' end walls, seen through the smoked sides
    smoke: reflective(std('#2e3033', 0.08, 0, { transparent: true, opacity: 0.68, depthWrite: false }), 0.8),
    unit: std('#55585c', 0.2, 0.1, { transparent: true, opacity: 0.35, depthWrite: false }),
    divider: std('#c8c8c8', 0.4, 0.05, { transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }),
    dome: reflective(std('#4a4d52', 0.05, 0, { transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }), 0.8),
    feeder: std('#5a5d61', 0.75), // matte grey buckets
    cap: std('#8a8d92', 0.5, 0.2), // their lighter caps
    hub: std('#33373d', 0.5, 0.2),
    flange: std('#c8c8c8', 0.3, 0.05, { transparent: true, opacity: 0.5, depthWrite: false }), // clear spool sides
    ptfe: std('#9a9ea4', 0.45),
    orange: std('#f39a1e', 0.45),
    led: new THREE.MeshBasicMaterial({ color: '#eaf1ff' }),
    // lit feeder internals: a yellow-orange that stays amber after tone mapping (a deeper orange turns red)
    amber: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff8a30') }),
  };
  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = shell) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = shell) =>
    mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
  const rbox = (w: number, h: number, d: number, r: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = shell) =>
    mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, Math.min(w, h, d) / 2 - 1e-3)), mat, x, y, z, parent);
  const cylX = (r: number, len: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = shell, seg = 24) => {
    const m = mesh(new THREE.CylinderGeometry(r, r, len, seg), mat, x, y, z, parent);
    m.rotation.z = Math.PI / 2;
    return m;
  };
  const cylZ = (r: number, len: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = shell, seg = 20) => {
    const m = mesh(new THREE.CylinderGeometry(r, r, len, seg), mat, x, y, z, parent);
    m.rotation.x = Math.PI / 2;
    return m;
  };
  /** A flat printed graphic; `facing` turns it to face +x (1), -x (-1) or -z (2) instead of +z. */
  const label = (w: number, h: number, tex: THREE.Texture, x: number, y: number, z: number, facing = 0, parent: THREE.Object3D = shell) => {
    const m = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6, alphaTest: 0.02 }), x, y, z, parent);
    m.rotation.y = facing === 2 ? Math.PI : (facing * Math.PI) / 2;
    return m;
  };

  /* ---------- Body ---------- */
  const halfW = B.w / 2, halfD = B.d / 2, top = B.h;
  const doorW = B.w - 2 * F.pillar, dy0 = B.feet + F.bottomBand, dy1 = B.h - F.topBand, doorH = dy1 - dy0;
  const walls = mesh(wallsGeometry(), M.body, 0, 0, 0);
  // bands above and below the door, between the pillars (their ends tuck into the pillars)
  rbox(doorW + 6, F.topBand, B.pillarDepth, B.edgeR, M.body, 0, top - F.topBand / 2, halfD - B.pillarDepth / 2);
  rbox(doorW + 6, F.bottomBand, B.pillarDepth, B.edgeR, M.body, 0, B.feet + F.bottomBand / 2, halfD - B.pillarDepth / 2);
  box(B.w - 2 * B.edgeR - 2, 4, B.d - 2 * B.edgeR - 2, M.body, 0, top - 2.3, 0); // roof
  const glassTop = new THREE.Mesh(new THREE.PlaneGeometry(B.w - 2 * P2S.topGlass.inset, B.d - 2 * P2S.topGlass.inset), M.roofGlass);
  glassTop.rotation.x = -Math.PI / 2;
  glassTop.position.set(0, top - 0.15, 0);
  shell.add(glassTop);
  const plinth = rbox(B.w - 8, B.feet, B.d - 8, 2, M.plinth, 0, B.feet / 2, 0);
  // chamber lining: dark, seen only from inside, through the door
  const lin = { x: B.w - 20, y0: B.feet + 3, y1: top - 3, z0: -halfD + 10, z1: halfD - B.pillarDepth };
  box(lin.x, lin.y1 - lin.y0, lin.z1 - lin.z0, M.inside, 0, (lin.y0 + lin.y1) / 2, (lin.z0 + lin.z1) / 2);
  mesh(new THREE.CylinderGeometry(P2S.roofFitting.d / 2, P2S.roofFitting.d / 2, P2S.roofFitting.h, 28), M.metal, 0, top + P2S.roofFitting.h / 2, P2S.roofFitting.z);

  /* ---------- Door: dark tinted glass in a thin black frame, hinged on the left ---------- */
  const frame = roundedRect(doorW, doorH, 2) as THREE.Shape;
  frame.holes.push(roundedRect(doorW - 2 * P2S.door.frameW, doorH - 2 * P2S.door.frameW, 1.5, new THREE.Path()));
  mesh(new THREE.ExtrudeGeometry(frame, { depth: 1.2, bevelEnabled: false, curveSegments: 3 }), M.trim, 0, (dy0 + dy1) / 2, halfD - 1.6);
  const glassGeo = new THREE.PlaneGeometry(doorW - 1, doorH - 1);
  // vertex alpha: 0.62 at the top (under the gantry and the light) down to 0.9 at the bottom
  glassGeo.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1, 0.62, 1, 1, 1, 0.62, 1, 1, 1, 0.9, 1, 1, 1, 0.9], 4));
  const doorGlass = mesh(glassGeo, M.glass, 0, (dy0 + dy1) / 2, halfD - 0.9);
  doorGlass.renderOrder = 2;
  for (const y of [dy1, dy0]) box(P2S.door.hinge.w, P2S.door.hinge.h, 2, M.trim, -doorW / 2 + P2S.door.hinge.w / 2, y, halfD + 0.4);
  for (const x of P2S.door.catches.x) for (const y of P2S.door.catches.y) cylZ(P2S.door.catches.d / 2, 3, M.dark, x, y, halfD - 5, shell, 16);

  // handle: a light grey "Bambu Lab" pill straddling the door's right edge
  const H = P2S.handle;
  const pill = new THREE.ExtrudeGeometry(roundedRect(H.w - 2, H.h - 2, (H.h - 2) / 2) as THREE.Shape, { depth: H.proud - 2, bevelEnabled: true, bevelSize: 1, bevelThickness: 1, bevelSegments: 2, curveSegments: 8 });
  const handle = mesh(pill, M.handle, H.x, H.y, halfD + 1);
  label(30, 6, canvasTex(240, 48, (x) => {
    x.fillStyle = '#3a3c40'; x.font = '600 34px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('Bambu Lab', 120, 25, 236);
  }), H.x, H.y, halfD + H.proud + 0.05);

  // "Bambu Lab | P2S" on the top band, right-aligned
  const L = P2S.logo;
  label(L.x1 - L.x0, L.y1 - L.y0, canvasTex(512, 68, (x) => {
    // 68 x 9 mm: a stacked "Bambu Lab" about 25 mm wide, then a wide "P2S" about 38 mm wide
    x.fillStyle = '#121315'; x.textBaseline = 'alphabetic';
    fitText(x, 'Bambu', 2, 30, 24, 120, 700);
    fitText(x, 'Lab', 2, 64, 24, 72, 700);
    fitText(x, 'P2S', 196, 66, 62, 310, 800);
  }), (L.x0 + L.x1) / 2, (L.y0 + L.y1) / 2, halfD + 0.1);

  // the Bambu Lab mark on both sides, and the vented hand grip along the bottom of each side
  const mark = sideMarkTexture();
  const markY = P2S.sideMark.top - mark.h / 2;
  for (const s of [-1, 1]) label(mark.w, mark.h, mark.tex, s * (halfW + 0.1), markY, 0, s);
  const grip = canvasTex(560, 88, (x) => {
    const k = 4, gw = P2S.handGrip.w, gh = P2S.handGrip.h;
    x.fillStyle = '#26282b';
    x.beginPath(); x.moveTo(((140 - gw) / 2) * k, 0); x.lineTo(((140 + gw) / 2) * k, 0); x.lineTo(560, gh * k); x.lineTo(0, gh * k); x.closePath(); x.fill();
    x.fillStyle = '#0d0e10';
    for (let i = 0; i < 6; i++) x.fillRect(220 + i * 22, 30, 9, 58);
    x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(((140 - gw) / 2) * k, 0, gw * k, 3);
  });
  for (const s of [-1, 1]) label(140, P2S.handGrip.h, grip, s * (halfW + 0.08), 3 + P2S.handGrip.h / 2, 0, s);

  /* ---------- Touchscreen: a 5-inch slab leaning back 22 degrees, proud of the top-left corner ---------- */
  const S = P2S.screen;
  const scr = new THREE.Group();
  scr.position.set(S.face.x, S.face.y, S.face.z);
  scr.rotation.x = -THREE.MathUtils.degToRad(S.tilt);
  shell.add(scr);
  const bev = 1.2;
  const slabGeo = new THREE.ExtrudeGeometry(roundedRect(S.w - 2 * bev, S.h - 2 * bev, S.r - bev) as THREE.Shape, { depth: S.t - 2 * bev, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 2, curveSegments: 8 });
  slabGeo.translate(0, 0, -(S.t - bev));
  const slab = mesh(slabGeo, M.screenRim, 0, 0, 0, scr); // aluminium edge
  mesh(new THREE.ShapeGeometry(roundedRect(S.w - 6, S.h - 6, S.r - 3) as THREE.Shape, 8), M.screenGlass, 0, 0, 0.05, scr); // black glass inside a 3 mm silver rim
  rbox(110, 56, 12, 4, M.housing, 0, -6, -S.t - 5, scr); // housing behind, toward the hinge
  rbox(30, 12, 16, 3, M.housing, S.face.x, 466, halfD + 7); // hinge arm on the body
  const sc = document.createElement('canvas');
  sc.width = 384; sc.height = 216;
  const sctx = sc.getContext('2d')!;
  const screenTex = new THREE.CanvasTexture(sc);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  const display = new THREE.Mesh(new THREE.PlaneGeometry(S.display.w, S.display.h), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  display.position.z = 0.12;
  scr.add(display);

  /* ---------- Rear (never in view on the desk, but the lab turns it round) ---------- */
  const R = P2S.rear;
  rbox(R.buffer.w, R.buffer.y1 - R.buffer.y0, R.buffer.proud, 3, M.body, R.buffer.x, (R.buffer.y0 + R.buffer.y1) / 2, -halfD - R.buffer.proud / 2);
  label(64, 9, canvasTex(256, 36, (x) => {
    x.fillStyle = '#1b1c1e'; x.fillRect(0, 0, 256, 36);
    x.fillStyle = '#ff8a2c'; x.fillRect(110, 6, 70, 24);
    x.fillStyle = '#3a3c40'; for (let i = 0; i < 9; i++) x.fillRect(12 + i * 10, 8, 4, 20);
  }), R.buffer.x, (R.buffer.y0 + R.buffer.y1) / 2, -halfD - R.buffer.proud - 0.05, 2);
  const dots = canvasTex(128, 256, (x) => {
    x.fillStyle = '#5b5e62'; x.fillRect(0, 0, 128, 256);
    x.fillStyle = '#0d0e10';
    for (let r = 0; r < 30; r++) for (let c = 0; c < 15; c++) { x.beginPath(); x.arc(6 + c * 8.3 + (r % 2) * 4, 6 + r * 8.3, 2.4, 0, 7); x.fill(); }
  });
  label(R.vent.x1 - R.vent.x0, R.vent.y1 - R.vent.y0, dots, (R.vent.x0 + R.vent.x1) / 2, (R.vent.y0 + R.vent.y1) / 2, -halfD - 0.1, 2);
  box(R.chute.x1 - R.chute.x0, R.chute.y1 - R.chute.y0, 1, M.dark, (R.chute.x0 + R.chute.x1) / 2, (R.chute.y0 + R.chute.y1) / 2, -halfD - 0.4);
  box(R.power.x1 - R.power.x0, R.power.y1 - R.power.y0, 3, M.dark, (R.power.x0 + R.power.x1) / 2, (R.power.y0 + R.power.y1) / 2, -halfD - 1.5);
  cylZ(5, 18, M.orange, R.coupler.x, R.coupler.y, -halfD - 9);
  box(38, 40, 3, M.metal, 136, 408, -halfD - 1.5);
  box(38, 40, 3, M.metal, -133, 370, -halfD - 1.5);

  /* ---------- Chamber: rails, Z rods, the back-wall grille, the purge module, the light ---------- */
  const C = P2S.chamber;
  for (const s of [-1, 1]) cylZ(4, 350, M.rod, s * 176, C.xRail.y + 14, -2);
  for (const [x, z] of C.zRods) mesh(new THREE.CylinderGeometry(4, 4, 372, 12), x === 0 ? M.screw : M.rod, x, 226, z); // the rear one is the lead screw
  box(34, 370, 16, M.dark, 0, 226, -174); // rear Z column, behind the lead screw
  // the chamber heater on the back wall: vertical fins
  const G = C.rearGrille, gw = G.x1 - G.x0, gh = G.y1 - G.y0;
  box(gw, gh, 12, M.dark, (G.x0 + G.x1) / 2, (G.y0 + G.y1) / 2, lin.z0 + 6);
  label(gw, gh, canvasTex(64, 180, (x) => {
    x.fillStyle = '#26282b'; x.fillRect(0, 0, 64, 180);
    x.fillStyle = '#6e7278'; for (let i = 0; i < 12; i++) x.fillRect(3 + i * 5, 4, 2, 172);
  }), (G.x0 + G.x1) / 2, (G.y0 + G.y1) / 2, lin.z0 + 12.2);
  box(50, 112, 40, M.dark, -63, 302, -150); // purge chute and cutter
  box(240, 3, 3, M.led, 0, dy1 - 4, halfD - 22); // chamber LED strip behind the top band

  /* ---------- AMS 2 Pro ---------- */
  const A = P2S.ams;
  const az1 = A.front, az0 = A.front - A.d, azc = (az0 + az1) / 2, ab = top, at = top + A.base;
  const slotX = (i: number) => (i - (A.slots - 1) / 2) * A.pitch;
  const lidHalf = Math.sqrt(A.lid.r ** 2 - (A.rim - A.lid.axisY) ** 2); // lid footprint, front to back
  const lz0 = A.lid.axisZ - lidHalf, lz1 = A.lid.axisZ + lidHalf;
  let amsBase: THREE.Object3D | null = null, amsTray: THREE.Object3D | null = null, lid: THREE.Mesh | null = null;
  let feeding: THREE.Group | null = null;
  if (ams) {
    const base = new THREE.Group();
    shell.add(base);
    amsBase = base;
    rbox(A.w - 10, 16, A.d - 10, 6, M.ams, 0, ab + 8, azc, base); // tray, set in a little under the sleeve; its top is the floor
    // the tub: an open smoked sleeve with rounded vertical corners
    const ring = (w: number, d: number, r: number, wall: number) => {
      const s = roundedRect(w, d, r) as THREE.Shape;
      s.holes.push(roundedRect(w - 2 * wall, d - 2 * wall, Math.max(0.5, r - wall), new THREE.Path()));
      return s;
    };
    const sleeveH = A.base - 22;
    const sleeve = new THREE.ExtrudeGeometry(ring(A.w, A.d, 12, 2), { depth: sleeveH, bevelEnabled: false, curveSegments: 6 });
    sleeve.rotateX(-Math.PI / 2);
    amsTray = mesh(sleeve, M.smoke, 0, ab + 14, azc, base); // the AMS's outer size is the sleeve's
    // the top frame round the lid (a ledge in front, a strip behind, the two ends) and a lighter lip on its edge
    rbox(A.w, 8, az1 - lz1, 3, M.amsFrame, 0, at - 4, (az1 + lz1) / 2, base);
    rbox(A.w, 8, lz0 - az0, 3, M.amsFrame, 0, at - 4, (az0 + lz0) / 2, base);
    for (const sx of [-1, 1]) box((A.w - A.lid.len) / 2, 8, lz1 - lz0, M.amsFrame, sx * (A.w + A.lid.len) / 4, at - 4, (lz0 + lz1) / 2, base);
    const lip = new THREE.ExtrudeGeometry(ring(A.w, A.d, 12, 5), { depth: 3, bevelEnabled: false, curveSegments: 6 });
    lip.rotateX(-Math.PI / 2);
    mesh(lip, M.amsLip, 0, at - 2.5, azc, base);
    // an opaque wall behind the feeders hides the spools' lower halves, as on the real unit
    box(A.w - 8, 90, 3, M.amsWall, 0, ab + 16 + 45, az1 - 46, base); // the strip above it lets a little through
    // and the bay walls at each end keep the outer spools from showing through the sides
    for (const sx of [-1, 1]) box(3, sleeveH - 4, A.d - 24, M.amsEnd, sx * (A.w / 2 - 8), ab + 14 + (sleeveH - 4) / 2, azc, base);
    // spool dividers between the slots, filling the lid above the rim
    const div = new THREE.Shape();
    const dr = A.lid.r - 6, rimV = A.rim - A.lid.axisY;
    div.moveTo(-dr, rimV); div.lineTo(dr, rimV); div.absarc(0, 0, dr, Math.asin(rimV / dr), Math.PI - Math.asin(rimV / dr), false); div.lineTo(-dr, rimV);
    const divGeo = new THREE.ShapeGeometry(div, 24);
    for (let i = 1; i < A.slots; i++) { const m = mesh(divGeo, M.divider, (slotX(i - 1) + slotX(i)) / 2, A.lid.axisY, A.lid.axisZ, base); m.rotation.y = Math.PI / 2; }
    // feeders behind the smoked front: a black bucket, a clear unit with the lit gears, a grey cap
    for (let i = 0; i < A.slots; i++) {
      const x = slotX(i), z = az1 - 24, [b0, b1] = A.feeder.bucket, [u0, u1] = A.feeder.unit;
      mesh(new THREE.CylinderGeometry(A.feeder.w / 2, A.feeder.w / 2, b1 - b0, 20), M.feeder, x, (b0 + b1) / 2, z, base);
      rbox(30, u1 - u0, 26, 4, M.unit, x, (u0 + u1) / 2, z, base);
      rbox(22, 9, 12, 2, M.amber, x, u0 + 10, z, base); // the glow sits in the lower half of the window
      box(18, 4, 18, M.cap, x, u1 + 2, z, base);
    }
    label(A.logo.x1 - A.logo.x0, A.logo.y1 - A.logo.y0, canvasTex(512, 54, (x) => {
      // 101 x 10.4 mm: a small stacked "Bambu Lab", a wide "AMS 2" (about 60 mm), and the PRO badge beside the 2
      x.fillStyle = '#e9edf2'; x.textBaseline = 'alphabetic';
      fitText(x, 'Bambu', 2, 24, 18, 86, 700);
      fitText(x, 'Lab', 2, 50, 18, 52, 700);
      fitText(x, 'AMS 2', 124, 51, 46, 300, 600);
      x.strokeStyle = '#e9edf2'; x.lineWidth = 3; x.strokeRect(440, 22, 68, 29);
      fitText(x, 'PRO', 448, 45, 17, 52, 700);
    }), (A.logo.x0 + A.logo.x1) / 2, (A.logo.y0 + A.logo.y1) / 2, az1 + 0.2, 0, base);
    mesh(new THREE.CylinderGeometry(A.ledgeFitting.d / 2, A.ledgeFitting.d / 2, A.ledgeFitting.h, 24), M.metal, 0, at + A.ledgeFitting.h / 2, A.ledgeFitting.z, base);
    box(40, 14, 6, M.dark, 0, ab + 70, az0 - 3, base); // filament outlet and ports on the back

    // the lid: a smoked half-capsule turned round its left-to-right axis, with rounded ends
    const f = 10, half = A.lid.len / 2, prof: THREE.Vector2[] = [new THREE.Vector2(0.01, -half)];
    for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2); prof.push(new THREE.Vector2(A.lid.r - f + f * Math.cos(a), -half + f + f * Math.sin(a))); }
    for (let i = 0; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); prof.push(new THREE.Vector2(A.lid.r - f + f * Math.cos(a), half - f + f * Math.sin(a))); }
    prof.push(new THREE.Vector2(0.01, half));
    const lidGeo = new THREE.LatheGeometry(prof, 56, Math.PI, Math.PI);
    lidGeo.rotateZ(-Math.PI / 2); // lathe axis (y) becomes x; the half that was at -x is now on top
    lid = new THREE.Mesh(lidGeo, M.dome);
    lid.position.set(0, A.lid.axisY, A.lid.axisZ);
    lid.renderOrder = 3;
    mm.add(lid);
    // smoked plastic all but disappears against a dark wall: brighten it where it turns away from you
    M.dome.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        // plus the broad pale band an overhead light leaves two-thirds of the way up a clear cylinder
        `float rim = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 2.5);
        float band = smoothstep(0.25, 0.42, normal.y) * (1.0 - smoothstep(0.6, 0.78, normal.y));
        gl_FragColor.rgb = mix(gl_FragColor.rgb + rim * vec3(0.1, 0.105, 0.11), vec3(0.74, 0.76, 0.78), band * 0.32);
        gl_FragColor.a = max(gl_FragColor.a, max(rim * 0.5, band * 0.55));
        #include <dithering_fragment>`,
      );
    };
    // the ends: dot perforations round a solid hub
    const capTex = canvasTex(256, 256, (x) => {
      x.fillStyle = 'rgba(30,31,34,.8)'; x.beginPath(); x.arc(128, 128, 128, Math.PI, 0); x.fill(); // smoked, but much less clear than the lid
      x.fillStyle = 'rgba(4,4,5,.9)';
      for (let r = 0; r < 15; r++) for (let c = 0; c < 31; c++) {
        const px = 6 + c * 8.1 + (r % 2) * 4, py = 124 - r * 8.1;
        const dc = Math.hypot(px - 128, py - 128);
        if (dc > 118 || Math.hypot(px - 128, py - 112) < 30) continue;
        x.beginPath(); x.arc(px, py, 2.1, 0, 7); x.fill();
      }
      x.fillStyle = 'rgba(40,42,46,.9)'; x.beginPath(); x.arc(128, 112, 26, 0, 7); x.fill();
      x.strokeStyle = 'rgba(120,124,130,.7)'; x.lineWidth = 3; x.beginPath(); x.arc(128, 112, 26, 0, 7); x.stroke();
    });
    const capMat = new THREE.MeshStandardMaterial({ map: capTex, transparent: true, depthWrite: false, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 });
    for (const s of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.CircleGeometry(A.lid.r - f, 40, 0, Math.PI), capMat);
      cap.rotation.y = (s * Math.PI) / 2;
      cap.position.set(s * (half + 0.3), A.lid.axisY, A.lid.axisZ);
      cap.renderOrder = 4;
      mm.add(cap);
    }

    // spools on the lid's axis, the lower part down in the tub
    const wind = windingTexture(), sp = A.spool;
    SPOOLS.forEach((color, i) => {
      const g = new THREE.Group();
      g.position.set(slotX(i), A.lid.axisY + 1, A.lid.axisZ);
      // wound filament is close to matte: thousands of strands scatter the light rather than mirror it
      cylX(sp.d / 2 - 5, sp.w - 4, new THREE.MeshStandardMaterial({ color, map: wind, roughness: 0.85, envMapIntensity: 0.3 }), 0, 0, 0, g, 48);
      for (const s of [-1, 1]) {
        cylX(sp.d / 2, 2, M.flange, (s * (sp.w - 2)) / 2, 0, 0, g, 48);
        cylX(sp.hub / 2, 4, M.hub, (s * sp.w) / 2, 0, 0, g);
      }
      if (i === SPOOLS.length - 1) { feeding = g; mm.add(g); } else shell.add(g);
    });

    // PTFE tube from the AMS's outlet down the back into the buffer
    const tube = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, ab + 70, az0 - 6), new THREE.Vector3(0, ab + 40, -halfD - 2.5),
      new THREE.Vector3(R.buffer.x * 0.6, R.buffer.y1 + 60, -halfD - 2.5), new THREE.Vector3(R.buffer.x, R.buffer.y1 + 2, -halfD - R.buffer.proud / 2),
    ]);
    mesh(new THREE.TubeGeometry(tube, 24, 2.2, 8), M.ptfe, 0, 0, 0);
  }

  /* ---------- Measure before merging: these feed the lab's checks ---------- */
  shell.updateMatrixWorld(true);
  const boxOf = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o);
  const bodyBox = boxOf(walls).union(boxOf(plinth));
  const glassBox = boxOf(doorGlass), handleBox = boxOf(handle), slabBox = boxOf(slab);
  // the screen's front face corners, as the side render sees them
  const faceCorners = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sy]) => slab.localToWorld(new THREE.Vector3((sx * S.w) / 2, (sy * S.h) / 2, 0)));
  const faceTop = Math.max(...faceCorners.map((v) => v.y)), faceBottom = Math.min(...faceCorners.map((v) => v.y));
  const faceFront = Math.max(...faceCorners.map((v) => v.z));
  let amsBox: THREE.Box3 | null = null, lidBox: THREE.Box3 | null = null;
  if (amsBase && amsTray && lid) {
    amsBox = boxOf(amsTray); // the tub's sleeve, without the ports on its back
    lid.updateMatrixWorld(true);
    lidBox = new THREE.Box3().setFromObject(lid);
  }
  const measured: Record<string, number> = {
    'body width': bodyBox.max.x - bodyBox.min.x,
    'body height': bodyBox.max.y - bodyBox.min.y,
    'body depth': bodyBox.max.z - bodyBox.min.z,
    'door width': glassBox.max.x - glassBox.min.x + 1,
    'door height': glassBox.max.y - glassBox.min.y + 1,
    'screen width': slabBox.max.x - slabBox.min.x,
    'screen left edge from body edge': slabBox.min.x - bodyBox.min.x,
    'screen top above roof': faceTop - top,
    'screen bottom below roof': top - faceBottom,
    'screen bottom edge in front of face': faceFront - bodyBox.max.z,
    'handle width': handleBox.max.x - handleBox.min.x,
    'handle centre below top': top - (handleBox.min.y + handleBox.max.y) / 2,
  };
  if (amsBox && lidBox) {
    Object.assign(measured, {
      'AMS width': amsBox.max.x - amsBox.min.x,
      'AMS depth': amsBox.max.z - amsBox.min.z,
      'AMS front behind printer front': bodyBox.max.z - amsBox.max.z,
      'AMS total height': lidBox.max.y - top,
      'AMS lid front to back': lidBox.max.z - lidBox.min.z,
      'AMS lid width': lidBox.max.x - lidBox.min.x,
    });
  }

  /* ---------- Moving parts ---------- */
  const gantry = new THREE.Group();
  mm.add(gantry);
  cylX(C.xRail.d / 2, 2 * C.xRail.x, M.rail, 0, C.xRail.y, 0, gantry, 16);
  box(2 * C.xRail.x, 5, 2, M.dark, 0, C.xRail.y + 9, -6, gantry); // belt
  for (const s of [-1, 1]) box(16, 20, 24, M.dark, s * 160, C.xRail.y + 10, 0, gantry); // carriages on the Y rails
  const head = new THREE.Group(); // origin at the nozzle tip
  mm.add(head);
  const T = C.toolhead;
  rbox(T.w, T.h, T.d, 5, M.head, 0, 5.5 + T.h / 2, 0, head);
  box(T.w - 6, T.h - 8, 1, M.metal, 0, 5.5 + T.h / 2, T.d / 2 + 0.1, head); // brushed silver front
  cylZ(T.fan / 2, 2, M.dark, 0, 5.5 + T.h * 0.62, T.d / 2 + 0.6, head, 28);
  mesh(new THREE.TorusGeometry(T.fan / 2, 1.2, 6, 28), M.metal, 0, 5.5 + T.h * 0.62, T.d / 2 + 1, head);
  box(30, 5, 30, M.dark, 0, 3, 0, head);
  const nozzle = mesh(new THREE.ConeGeometry(3, 6, 10), std('#c8742a', 0.35, 0.6), 0, 3, 0, head);
  nozzle.rotation.x = Math.PI;
  box(8, 3, 1, M.led, 18, 5.5 + T.h - 8, T.d / 2 + 0.6, head);
  const bed = new THREE.Group(); // origin at the plate's top surface
  mm.add(bed);
  const Bd = C.bed;
  box(Bd.w, 4, Bd.d, M.plate, 0, -2, -10, bed);
  box(Bd.w, Bd.t - 4, Bd.d - 10, M.dark, 0, -4 - (Bd.t - 4) / 2, -15, bed);
  label(Bd.w - 20, Bd.t - 7, canvasTex(512, 24, (x) => {
    x.fillStyle = '#7d8186'; x.font = '600 13px system-ui, sans-serif'; x.textBaseline = 'middle';
    x.fillText('WARNING  HOT SURFACE', 16, 12); x.fillText('BUILD VOLUME', 190, 12);
    x.font = '600 18px system-ui, sans-serif'; x.fillText('256 × 256 × 256 mm³', 300, 13);
  }), 0, -4 - (Bd.t - 4) / 2, -10 + Bd.d / 2 - 4.9, 0, bed);
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0); // world-space plane at the nozzle; above it is "not printed yet"
  const { geometry: printGeo, height: printHeight } = printGeometry();
  const print = new THREE.Mesh(printGeo, new THREE.MeshStandardMaterial({ color: SPOOLS[3], roughness: 0.6, clippingPlanes: [clip] }));
  print.position.z = -10;
  bed.add(print);
  // the chamber LED shines down from behind the top band. A spot, not a point light: lights have no
  // shadows here, and a point light would shine up through the roof onto the spools from below.
  // Linear falloff, so the toolhead passing under it doesn't flare.
  const chamber = new THREE.SpotLight('#e6eeff', 0, 3, 1.15, 0.6, 1);
  chamber.position.set(0, dy1 - 10, halfD - 50);
  chamber.target.position.set(0, 0, -40);
  mm.add(chamber, chamber.target);

  /* ---------- Merge the static shell ---------- */
  const merged = mergeByMaterial(shell);
  merged.children.forEach((m) => {
    m.castShadow = false;
    m.receiveShadow = true;
    if (((m as THREE.Mesh).material as THREE.Material).transparent) m.renderOrder = 2;
  });
  mm.add(merged);
  root.traverse((o) => { o.castShadow = false; });

  /* ---------- Touchscreen: Bambu's dark UI, an icon rail and the job card ---------- */
  let lastPct = -1;
  function drawScreen(p: number, done: boolean) {
    const pct = Math.round(p * 100);
    if (pct === lastPct) return;
    lastPct = pct;
    const x = sctx;
    x.fillStyle = '#0e1012'; x.fillRect(0, 0, 384, 216);
    x.fillStyle = '#1b1e22'; x.fillRect(0, 0, 50, 216);
    for (let i = 0; i < 5; i++) { x.fillStyle = i === 0 ? BAMBU_GREEN : '#5b626b'; x.beginPath(); x.arc(25, 28 + i * 40, 7, 0, 7); x.fill(); }
    x.fillStyle = done ? BAMBU_GREEN : '#e9edf2'; x.font = '600 21px system-ui, sans-serif';
    x.fillText(done ? 'Print complete' : 'Printing', 68, 36);
    x.fillStyle = '#8a929c'; x.font = '500 14px system-ui, sans-serif'; x.fillText('garage-pixel.3mf', 68, 60);
    x.fillStyle = '#e9edf2'; x.font = '700 48px system-ui, sans-serif'; x.fillText(`${pct}%`, 68, 124);
    x.fillStyle = '#2a2d31'; x.fillRect(68, 144, 290, 9);
    x.fillStyle = BAMBU_GREEN; x.fillRect(68, 144, 290 * p, 9);
    x.fillStyle = '#8a929c'; x.font = '500 14px system-ui, sans-serif';
    x.fillText(`Layer ${Math.round(p * 140)}/140`, 68, 184);
    x.fillText(done ? 'Done' : `${Math.max(1, Math.round((1 - p) * 26))} min left`, 282, 184);
    // the four AMS slots, slot 4 feeding
    SPOOLS.forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(278 + i * 22, 42, 7.5, 0, 7); x.fill(); });
    x.strokeStyle = BAMBU_GREEN; x.lineWidth = 2; x.beginPath(); x.arc(344, 42, 11, 0, 7); x.stroke();
    screenTex.needsUpdate = true;
  }

  /* ---------- Per frame ---------- */
  const CYCLE = 110, PRINT = 96; // seconds: print, then park and show "complete"
  const LED = new THREE.Color('#eaf1ff');
  const nozzleWorld = new THREE.Vector3();
  function update(t: number, dt: number, light = 1) {
    const phase = reduce ? 70 : t % CYCLE;
    const p = Math.min(1, phase / PRINT), done = phase >= PRINT;
    bed.position.y = NOZZLE_Y - printHeight * p;
    let hx = 93, hz = -99;
    if (!done) { hx = Math.sin(t * 2.3) * 58; hz = Math.sin(t * 3.7 + 1) * 19 - 10; }
    head.position.set(reduce ? 0 : hx, NOZZLE_Y, reduce ? -10 : hz);
    gantry.position.z = head.position.z;
    nozzleWorld.set(0, NOZZLE_Y, 0);
    mm.localToWorld(nozzleWorld);
    clip.constant = nozzleWorld.y;
    if (!reduce && !done && feeding) (feeding as THREE.Group).rotation.x -= dt * 0.12;
    M.led.color.copy(LED).multiplyScalar(0.4 + 1.6 * light);
    chamber.intensity = 2.6 * light;
    drawScreen(p, done);
  }
  update(0, 0, 0);

  return { root, update, measured };
}
