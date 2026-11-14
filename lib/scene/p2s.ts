// Bambu Lab P2S with an AMS 2 Pro on top, built from primitives at desk scale (1 unit = 160 mm), after
// Bambu's own product shots. The P2S (about 392 x 406 x 478 mm) is a grey enclosure with rounded corners,
// a near full-height dark glass door, a 5-inch touchscreen standing proud of the top-left corner and a
// dark badge down the right side. The AMS 2 Pro (about 372 x 285 x 205 mm) has a dark base with a smoked
// front showing the four feeders, and four spools under a smoked half-cylinder lid. Static parts are
// merged by material; only the moving parts (gantry, toolhead, bed, print, feeding spool) stay separate.
// It prints a small pixel-art garage in the amber filament from slot 4, lowering the bed layer by layer.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeByMaterial } from './geometry';
import { reflective } from './props/kit';

const W = 2.45, D = 2.54, H = 2.99; // 392 x 406 x 478 mm
const DOOR = { x0: -W / 2 + 0.11, x1: W / 2 - 0.11, y0: 0.17, y1: H - 0.42 };
const BAMBU_GREEN = '#00ae42';
const SPOOLS = ['#efece6', '#202327', '#2fa35a', '#ff8a2c']; // white, black, green, amber (feeding)

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
const DEPTH: Record<string, number> = { '#': 0.24, '=': 0.17, ':': 0.1 };

function printGeometry(v = 0.072) {
  const parts: THREE.BufferGeometry[] = [];
  const rows = ART.length, cols = ART[0].length;
  ART.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      const d = DEPTH[ch];
      if (!d) return;
      const g = new THREE.BoxGeometry(v, v, d);
      g.translate((c - (cols - 1) / 2) * v, (rows - 1 - r) * v + v / 2, -0.12 + d / 2);
      parts.push(g.toNonIndexed());
      g.dispose();
    }),
  );
  const geometry = BufferGeometryUtils.mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return { geometry, height: rows * v };
}

function roundedRect(x0: number, y0: number, x1: number, y1: number, r: number, path: THREE.Path = new THREE.Shape()) {
  path.moveTo(x0 + r, y0);
  path.lineTo(x1 - r, y0); path.quadraticCurveTo(x1, y0, x1, y0 + r);
  path.lineTo(x1, y1 - r); path.quadraticCurveTo(x1, y1, x1 - r, y1);
  path.lineTo(x0 + r, y1); path.quadraticCurveTo(x0, y1, x0, y1 - r);
  path.lineTo(x0, y0 + r); path.quadraticCurveTo(x0, y0, x0 + r, y0);
  return path;
}

export function buildP2S({ reduce = false } = {}) {
  const root = new THREE.Group();
  root.name = 'p2s';
  const shell = new THREE.Group();
  const std = (color: string, roughness: number, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const M = {
    body: reflective(std('#7e8082', 0.45, 0.3), 0.5), // neutral mid-dark grey, satin
    trim: reflective(std('#141619', 0.4, 0.2), 0.5),
    inside: std('#24272c', 0.85, 0, { side: THREE.BackSide }),
    rail: std('#4a4f57', 0.35, 0.6),
    head: std('#2d3136', 0.45, 0.2),
    plate: std('#4b4130', 0.7, 0.35),
    ams: reflective(std('#3a3a3a', 0.5, 0.15), 0.5),
    feeder: reflective(std('#5a5a5a', 0.5, 0.1), 0.5), // matte grey, clearly lighter than the smoked glass in front
    silver: reflective(std('#9a9a9a', 0.35, 0.7), 0.8),
    hub: std('#33373d', 0.5, 0.2),
    flange: std('#3b4047', 0.4, 0.1),
    glass: reflective(std('#0b0f15', 0.06, 0.4, { transparent: true, opacity: 0.22, depthWrite: false }), 1),
    smoke: reflective(std('#1a1a1a', 0.06, 0.3, { transparent: true, opacity: 0.32, depthWrite: false }), 0.8),
    dome: reflective(std('#1c1c1c', 0.05, 0.3, { transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }), 0.8),
    slotLed: new THREE.MeshBasicMaterial({ color: '#b9c4d4' }),
    led: new THREE.MeshBasicMaterial({ color: '#eaf1ff' }),
    amber: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff5a00').multiplyScalar(1.5) }), // lit orange internals: saturated, not so bright that tone mapping turns them yellow
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
    mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, Math.min(w, h, d) / 2 - 1e-4)), mat, x, y, z, parent);
  const label = (w: number, h: number, tex: THREE.Texture, x: number, y: number, z: number, parent: THREE.Object3D = shell) =>
    mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6 }), x, y, z, parent);

  /* ---------- Printer body: the front outline with the door cut out, pushed back through the depth ---------- */
  const B = 0.04; // bevel: rounds every outer edge and the door opening
  const front = roundedRect(-W / 2 + B, B, W / 2 - B, H - B, 0.03) as THREE.Shape;
  front.holes.push(roundedRect(DOOR.x0 - B, DOOR.y0 - B, DOOR.x1 + B, DOOR.y1 + B, 0.03, new THREE.Path()));
  const bodyGeo = new THREE.ExtrudeGeometry(front, { depth: D - 2 * B, bevelEnabled: true, bevelSize: B, bevelThickness: B, bevelSegments: 4, curveSegments: 6 });
  bodyGeo.translate(0, 0, -(D - 2 * B) / 2);
  mesh(bodyGeo, M.body, 0, 0, 0);
  box(W - 0.2, 0.05, D - 0.2, M.trim, 0, 0.025, 0); // dark plinth
  // chamber lining, inside the door opening
  const inner = { w: DOOR.x1 - DOOR.x0 - 0.02, h: DOOR.y1 - DOOR.y0 - 0.02, d: D - 0.24 };
  mesh(new THREE.BoxGeometry(inner.w, inner.h, inner.d), M.inside, 0, (DOOR.y0 + DOOR.y1) / 2, -0.06);
  // the back is a solid panel with a round fan grille, not more glass
  box(DOOR.x1 - DOOR.x0 + 0.12, DOOR.y1 - DOOR.y0 + 0.12, 0.03, M.body, 0, (DOOR.y0 + DOOR.y1) / 2, -D / 2 + 0.012);
  const grille = label(0.62, 0.62, canvasTex(256, 256, (x) => {
    x.fillStyle = '#2a2b2d'; x.beginPath(); x.arc(128, 128, 124, 0, 7); x.fill();
    x.strokeStyle = '#121314'; x.lineWidth = 7;
    for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(128, 128, 30 + i * 17, 0, 7); x.stroke(); }
    x.fillStyle = '#3c3d40'; x.beginPath(); x.arc(128, 128, 26, 0, 7); x.fill();
  }), W * 0.22, H * 0.62, -D / 2 - 0.004);
  grille.rotation.y = Math.PI;

  // the door: a thin black frame around dark glass, with a small catch on the right
  const doorFrame = roundedRect(DOOR.x0, DOOR.y0, DOOR.x1, DOOR.y1, 0.03) as THREE.Shape;
  doorFrame.holes.push(roundedRect(DOOR.x0 + 0.045, DOOR.y0 + 0.045, DOOR.x1 - 0.045, DOOR.y1 - 0.045, 0.02, new THREE.Path()));
  mesh(new THREE.ExtrudeGeometry(doorFrame, { depth: 0.03, bevelEnabled: false, curveSegments: 4 }), M.trim, 0, 0, D / 2 - 0.03);
  const glass = mesh(new THREE.PlaneGeometry(DOOR.x1 - DOOR.x0 - 0.09, DOOR.y1 - DOOR.y0 - 0.09), M.glass, 0, (DOOR.y0 + DOOR.y1) / 2, D / 2 - 0.012);
  glass.renderOrder = 2;
  rbox(0.13, 0.035, 0.03, 0.012, std('#d9dde2', 0.4), DOOR.x1 - 0.07, H * 0.55, D / 2 + 0.01); // catch: a small horizontal tab

  // wordmark on the top band, and the Bambu Lab mark printed straight onto the right-hand side
  label(0.62, 0.155, canvasTex(512, 128, (x) => {
    x.fillStyle = '#3a3a3a'; x.font = '700 30px system-ui, sans-serif'; x.textBaseline = 'alphabetic';
    x.fillText('Bambu', 6, 56); x.fillText('Lab', 6, 92);
    x.font = '500 84px system-ui, sans-serif'; x.fillText('P2S', 140, 96);
  }), 0.42, H - 0.2, D / 2 + 0.002);
  const mark = label(0.26, 0.62, canvasTex(128, 304, (x) => {
    x.fillStyle = '#3a3a3a';
    // a tall rectangular mark split on a slant, with the wordmark underneath
    x.beginPath(); x.moveTo(34, 20); x.lineTo(94, 20); x.lineTo(94, 112); x.lineTo(34, 150); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(34, 166); x.lineTo(94, 128); x.lineTo(94, 246); x.lineTo(34, 246); x.closePath(); x.fill();
    x.font = '600 21px system-ui, sans-serif'; x.textAlign = 'center'; x.fillText('Bambu Lab', 64, 284);
  }), W / 2 + 0.002, H * 0.55, D / 2 - 0.55 * D);
  mark.rotation.y = Math.PI / 2;

  // 5-inch touchscreen standing proud of the top-left corner, tipped back a little
  const pivot = new THREE.Group();
  pivot.position.set(-W / 2 + 0.41, H - 0.02, D / 2 + 0.1); // left edge flush with the body
  pivot.rotation.x = -0.28;
  shell.add(pivot);
  rbox(0.82, 0.54, 0.05, 0.06, M.silver, 0, 0, 0, pivot); // aluminium rim
  rbox(0.78, 0.5, 0.012, 0.045, M.trim, 0, 0, 0.022, pivot); // black glass face
  box(0.16, 0.2, 0.14, M.trim, 0.22, -0.1, -0.09, pivot); // hinge block
  const sc = document.createElement('canvas');
  sc.width = 320; sc.height = 200;
  const sctx = sc.getContext('2d')!;
  const screenTex = new THREE.CanvasTexture(sc);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.46), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  screen.position.z = 0.03;
  pivot.add(screen);

  /* ---------- White PTFE tube from the back of the AMS down into the printer's top, with its fitting ---------- */
  const amsBack = D / 2 - 0.08 - 1.75;
  const tube = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.55, H + 0.42, amsBack + 0.02), new THREE.Vector3(0.55, H + 0.36, amsBack - 0.16),
    new THREE.Vector3(0.55, H + 0.12, amsBack - 0.34), new THREE.Vector3(0.55, H + 0.03, amsBack - 0.38),
  ]);
  const ptfe = std('#eef0f2', 0.4);
  mesh(new THREE.TubeGeometry(tube, 24, 0.014, 8), ptfe, 0, 0, 0);
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16), ptfe, 0.55, H + 0.02, amsBack - 0.38);

  /* ---------- Motion system: Z rods, side rails, chamber LED ---------- */
  const inX = inner.w / 2 - 0.06, inZ = inner.d / 2 - 0.1;
  const gantryY = H - 0.62;
  for (const [x, z] of [[-inX + 0.1, -inZ + 0.1], [inX - 0.1, -inZ + 0.1], [0, -inZ + 0.05]]) {
    mesh(new THREE.CylinderGeometry(0.025, 0.025, H - 0.6, 10), M.rail, x, H / 2 - 0.1, z - 0.06);
  }
  box(0.07, 0.07, inner.d - 0.2, M.rail, -inX, gantryY, -0.06);
  box(0.07, 0.07, inner.d - 0.2, M.rail, inX, gantryY, -0.06);
  box(inner.w * 0.7, 0.03, 0.04, M.led, 0, DOOR.y1 - 0.05, D / 2 - 0.35);

  /* ---------- AMS 2 Pro ---------- */
  // 372 x 280 x 226 mm: a tall base (about 55%) under a flatter lid, set back a little from the front edge
  const Wa = 2.33, Da = 1.75, Hb = 0.78, Rz = Da / 2, Ry = 0.63;
  const amsFront = D / 2 - 0.08, az = amsFront - Da / 2, top = H + Hb;
  rbox(Wa, Hb, Da - 0.1, 0.05, M.ams, 0, H + Hb / 2, az - 0.05); // the base, recessed behind its smoked front
  rbox(Wa, 0.06, Da, 0.025, M.ams, 0, top - 0.03, az); // rim the lid closes onto
  rbox(Wa, 0.06, Da, 0.025, M.ams, 0, H + 0.03, az); // foot rim
  for (const s of [-1, 1]) box(0.06, Hb, 0.1, M.ams, s * (Wa / 2 - 0.03), H + Hb / 2, amsFront - 0.05); // front corner posts
  const smoke = box(Wa - 0.12, Hb - 0.12, 0.01, M.smoke, 0, H + Hb / 2, amsFront - 0.01);
  smoke.renderOrder = 2;
  const slotX = (i: number) => (i - 1.5) * (Wa / 4);
  for (let i = 0; i < 4; i++) {
    // feeders behind the smoked front: a big rounded dark-grey bucket with an amber-lit window near its top
    rbox(0.3, 0.56, 0.14, 0.07, M.feeder, slotX(i), H + 0.38, amsFront - 0.12);
    rbox(0.18, 0.1, 0.03, 0.02, M.amber, slotX(i), H + 0.55, amsFront - 0.045);
    box(0.04, 0.012, 0.01, i === 3 ? new THREE.MeshBasicMaterial({ color: BAMBU_GREEN }) : M.slotLed, slotX(i), H + 0.07, amsFront - 0.002);
  }
  label(0.64, 0.1, canvasTex(512, 80, (x) => {
    x.fillStyle = '#e9edf2'; x.textBaseline = 'middle';
    x.font = '700 22px system-ui, sans-serif'; x.fillText('Bambu', 6, 26); x.fillText('Lab', 6, 54);
    x.font = '600 52px system-ui, sans-serif'; x.fillText('AMS 2', 104, 42);
    x.strokeStyle = '#e9edf2'; x.lineWidth = 3; x.strokeRect(272, 22, 66, 38);
    x.font = '700 24px system-ui, sans-serif'; x.fillText('PRO', 281, 42);
  }), 0.5, top - 0.09, amsFront + 0.001);

  // smoked half-cylinder lid with dark end caps; the right cap carries the dryer's vents
  const La = Wa - 0.06;
  const dome = new THREE.Mesh(new THREE.CylinderGeometry(Rz, Rz, La, 56, 1, true, 0, Math.PI), M.dome);
  dome.rotation.z = Math.PI / 2;
  dome.scale.set(Ry / Rz, 1, 1); // after the rotation, local x is world y
  dome.position.set(0, top, az);
  dome.renderOrder = 3;
  root.add(dome); // transparent, so it stays out of the opaque merge and sorts last
  // smoked plastic all but disappears against a dark wall: brighten it where it turns away from you,
  // the way the edges of a glass lid catch the room
  M.dome.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `float rim = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 2.5);
      gl_FragColor.rgb += rim * vec3(0.12, 0.13, 0.15);
      gl_FragColor.a = max(gl_FragColor.a, rim * 0.6);
      #include <dithering_fragment>`,
    );
  };
  // the half-disc's UVs cover the top half of a square texture
  const vents = canvasTex(256, 256, (x) => {
    x.fillStyle = '#3a3a3a'; x.fillRect(0, 0, 256, 256);
    x.fillStyle = '#121212';
    for (let r = 0; r < 14; r++) for (let c = 0; c < 30; c++) {
      const px = 8 + c * 8.3 + (r % 2) * 4, py = 122 - r * 8;
      if ((px - 128) ** 2 + (py - 128) ** 2 < 40 ** 2 || (px - 128) ** 2 / 118 ** 2 + (py - 128) ** 2 / 118 ** 2 > 1) continue;
      x.beginPath(); x.arc(px, py, 2, 0, 7); x.fill();
    }
    x.strokeStyle = '#4a4c50'; x.lineWidth = 6; x.beginPath(); x.arc(128, 128, 40, Math.PI, 0); x.stroke();
  });
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.CircleGeometry(Rz, 40, 0, Math.PI), s > 0 ? reflective(std('#ffffff', 0.5, 0.15, { map: vents }), 0.5) : M.ams);
    cap.rotation.y = (s * Math.PI) / 2;
    cap.scale.set(1, Ry / Rz, 1);
    cap.position.set((s * La) / 2, top, az);
    shell.add(cap);
  }

  // spools: axes run left to right, lower part down in the base
  const wind = windingTexture();
  let feeding: THREE.Group | null = null;
  SPOOLS.forEach((color, i) => {
    const g = new THREE.Group();
    g.position.set(slotX(i), top - 0.08, az - 0.04);
    const fil = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.38, 48), new THREE.MeshStandardMaterial({ color, map: wind, roughness: 0.55 }));
    fil.rotation.z = Math.PI / 2;
    g.add(fil);
    for (const x of [-0.205, 0.205]) {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.024, 48), M.flange);
      f.rotation.z = Math.PI / 2;
      f.position.x = x;
      g.add(f);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 24), M.hub);
      hub.rotation.z = Math.PI / 2;
      hub.position.x = x * 1.05;
      g.add(hub);
    }
    if (i === 3) { feeding = g; root.add(g); } else shell.add(g);
  });

  /* ---------- Moving parts ---------- */
  const nozzleY = gantryY - 0.36;
  const gantry = box(inner.w - 0.14, 0.08, 0.1, M.rail, 0, gantryY, 0, root);
  const head = new THREE.Group();
  root.add(head);
  rbox(0.34, 0.36, 0.3, 0.04, M.head, 0, 0.12, 0, head);
  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 10), std('#c8742a', 0.35, 0.6));
  nozzle.rotation.x = Math.PI;
  nozzle.position.y = -0.1;
  head.add(nozzle);
  box(0.06, 0.03, 0.005, M.led, 0.09, 0.24, 0.153, head);
  const bed = new THREE.Group();
  root.add(bed);
  box(1.66, 0.05, 1.66, M.plate, 0, -0.025, 0, bed);
  // world-space plane at the nozzle: everything above it is "not printed yet"
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), nozzleY);
  const { geometry: printGeo, height: printHeight } = printGeometry();
  const print = new THREE.Mesh(printGeo, new THREE.MeshStandardMaterial({ color: SPOOLS[3], roughness: 0.6, clippingPlanes: [clip] }));
  bed.add(print);
  // the chamber LED sits behind the door's top edge; linear falloff so the toolhead passing under it doesn't flare
  const chamber = new THREE.PointLight('#e6eeff', 0, 3, 1);
  chamber.position.set(0, DOOR.y1 - 0.06, D / 2 - 0.3);
  root.add(chamber);

  /* ---------- Merge the static shell ---------- */
  const merged = mergeByMaterial(shell);
  merged.children.forEach((m) => {
    m.castShadow = false;
    m.receiveShadow = true;
    if (((m as THREE.Mesh).material as THREE.Material).transparent) m.renderOrder = 2;
  });
  root.add(merged);
  root.traverse((o) => { o.castShadow = false; });

  /* ---------- Touchscreen: Bambu's dark UI, an icon rail and the job card ---------- */
  let lastPct = -1;
  function drawScreen(p: number, done: boolean) {
    const pct = Math.round(p * 100);
    if (pct === lastPct) return;
    lastPct = pct;
    const x = sctx;
    x.fillStyle = '#0e1012'; x.fillRect(0, 0, 320, 200);
    x.fillStyle = '#1b1e22'; x.fillRect(0, 0, 44, 200);
    for (let i = 0; i < 5; i++) { x.fillStyle = i === 0 ? BAMBU_GREEN : '#5b626b'; x.beginPath(); x.arc(22, 26 + i * 36, 7, 0, 7); x.fill(); }
    x.fillStyle = done ? BAMBU_GREEN : '#e9edf2'; x.font = '600 19px system-ui, sans-serif';
    x.fillText(done ? 'Print complete' : 'Printing', 60, 34);
    x.fillStyle = '#8a929c'; x.font = '500 13px system-ui, sans-serif'; x.fillText('garage-pixel.3mf', 60, 56);
    x.fillStyle = '#e9edf2'; x.font = '700 44px system-ui, sans-serif'; x.fillText(`${pct}%`, 60, 116);
    x.fillStyle = '#2a2d31'; x.fillRect(60, 136, 236, 8);
    x.fillStyle = BAMBU_GREEN; x.fillRect(60, 136, 236 * p, 8);
    x.fillStyle = '#8a929c'; x.font = '500 13px system-ui, sans-serif';
    x.fillText(`Layer ${Math.round(p * 140)}/140`, 60, 172);
    x.fillText(done ? 'Done' : `${Math.max(1, Math.round((1 - p) * 26))} min left`, 214, 172);
    // the four AMS slots, slot 4 feeding
    SPOOLS.forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(226 + i * 20, 40, 7, 0, 7); x.fill(); });
    x.strokeStyle = BAMBU_GREEN; x.lineWidth = 2; x.beginPath(); x.arc(286, 40, 10, 0, 7); x.stroke();
    screenTex.needsUpdate = true;
  }

  /* ---------- Per frame ---------- */
  const CYCLE = 110, PRINT = 96; // seconds: print, then park and show "complete"
  const LED = new THREE.Color('#eaf1ff');
  function update(t: number, dt: number, light = 1) {
    const phase = reduce ? 70 : t % CYCLE;
    const p = Math.min(1, phase / PRINT), done = phase >= PRINT;
    bed.position.y = nozzleY - printHeight * p;
    let hx = 0.58, hz = -0.62;
    if (!done) { hx = Math.sin(t * 2.3) * 0.36; hz = Math.sin(t * 3.7 + 1) * 0.12; }
    head.position.set(reduce ? 0 : hx, nozzleY + 0.14, reduce ? 0 : hz);
    gantry.position.z = head.position.z;
    if (!reduce && !done && feeding) (feeding as THREE.Group).rotation.x -= dt * 0.12;
    M.led.color.copy(LED).multiplyScalar(0.4 + 1.6 * light);
    chamber.intensity = 2.6 * light;
    drawScreen(p, done);
  }
  update(0, 0, 0);

  return { root, update };
}
