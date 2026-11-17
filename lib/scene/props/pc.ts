// Cooler Master NR200P MAX V2 in grey, built from the measured spec in specs/nr200p.ts (millimetres, from
// the dimensioned drawings in Cooler Master's build guide) and nothing else. Built in mm and scaled to
// desk units (1 unit = 160 mm). It stands as it does on the desk: front to the room (+z), the glass left
// panel to the wall (-x), the Ncore steel right panel to the desk (+x).
import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { canvasTexture, reflective, std } from './kit';
import { NR200 } from '../specs/nr200p';

const MM = 1 / 160;
const X = NR200.w / 2, ZF = NR200.d / 2, ZR = -NR200.d / 2, H = NR200.h;
const FEET = NR200.feet.h;
const R = NR200.front.round, ZB = ZF - NR200.front.depth; // the front cover's back
const TOP = H - NR200.top.h; // the top cover's underside

/** A rounded polygon as a Shape (corners cut by quadratic curves of radius r). */
function roundedShape(pts: [number, number][], r: number, shape = new THREE.Shape()) {
  const n = pts.length;
  pts.forEach((p, i) => {
    const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
    const da = Math.hypot(a[0] - p[0], a[1] - p[1]), db = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const ra = Math.min(r, da / 2) / da, rb = Math.min(r, db / 2) / db;
    const p0: [number, number] = [p[0] + (a[0] - p[0]) * ra, p[1] + (a[1] - p[1]) * ra];
    const p1: [number, number] = [p[0] + (b[0] - p[0]) * rb, p[1] + (b[1] - p[1]) * rb];
    if (i === 0) shape.moveTo(...p0); else shape.lineTo(...p0);
    shape.quadraticCurveTo(p[0], p[1], ...p1);
  });
  shape.closePath();
  return shape;
}

/**
 * The badge's hexagon around (0, 0): flat sides upright, inset by `inset`. Its top and bottom points
 * stand 0.46 mm proud of the measured height, which rounding their corners (2.6 mm) takes back off.
 */
function hexagon(inset: number): [number, number][] {
  const L = NR200.logo, w = L.w / 2 - inset, h = L.h / 2 + 0.46 - inset * 1.25, s = L.side / 2 - inset * 0.4;
  return [[0, h], [-w, s], [-w, -s], [0, -h], [w, -s], [w, s]];
}

/** Every hole of the Ncore pattern: [mm from the rear face, mm above the desk, kind]. */
export function ncoreHoles() {
  const N = NR200.ncore, out: [number, number, '/' | '\\' | 'o'][] = [];
  for (let m = 0; m < N.repeats; m++) for (const [dy, kind, z0, every] of N.rows) {
    for (let z = z0; z <= N.end + 1e-6; z += N.pitch * every) out.push([z, N.top - m * N.motif - dy, kind]);
  }
  return out;
}

/**
 * The right panel's face: a steel sheet with the Ncore holes cut through it, in (u, v) = (-z, y), so a
 * shape turned to face +x lands in place. Seen from outside it matches the drawing: each hole's place
 * mirrored front to back, '/' slots rising toward the rear.
 */
function ncoreFace() {
  const S = NR200.side, N = NR200.ncore;
  const zR = ZR + S.z0, zF = zR + S.len;
  const face = new THREE.Shape([new THREE.Vector2(-zF, S.y0), new THREE.Vector2(-zR, S.y0), new THREE.Vector2(-zR, S.y1), new THREE.Vector2(-zF, S.y1)]);
  const r = N.slot.w / 2, half = (N.slot.l - N.slot.w) / 2;
  for (const [d, y, kind] of ncoreHoles()) {
    const u = -(zF - (d - S.z0)), pts: THREE.Vector2[] = [];
    if (kind === 'o') {
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; pts.push(new THREE.Vector2(u + (N.round / 2) * Math.cos(a), y + (N.round / 2) * Math.sin(a))); }
    } else {
      const th = kind === '/' ? Math.PI / 4 : -Math.PI / 4, dx = Math.cos(th), dy = Math.sin(th);
      for (const [cx, cy, a0] of [[u + half * dx, y + half * dy, th - Math.PI / 2], [u - half * dx, y - half * dy, th + Math.PI / 2]]) {
        for (let i = 0; i <= 10; i++) { const a = a0 + (i / 10) * Math.PI; pts.push(new THREE.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a))); }
      }
    }
    face.holes.push(new THREE.Path(pts));
  }
  return new THREE.ShapeGeometry(face, 1).rotateY(Math.PI / 2).translate(X, 0, 0); // (u, v) -> (x = X, y = v, z = -u)
}

/** The top's fine mesh: dark, with rows of tiny holes; one tile is 8 x 8 holes. */
function meshTexture() {
  const tex = canvasTexture(128, 128, (x) => {
    x.fillStyle = '#3a3b3f'; x.fillRect(0, 0, 128, 128);
    x.fillStyle = '#08080a';
    x.filter = 'blur(1px)';
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { x.beginPath(); x.arc(8 + c * 16 + (r % 2) * 8, 8 + r * 16, 5.2, 0, 7); x.fill(); }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

export function buildNR200() {
  const root = new THREE.Group();
  root.name = 'pc';
  const mm = new THREE.Group();
  mm.scale.setScalar(MM);
  root.add(mm);
  const add = <T extends THREE.Object3D>(o: T, name?: string) => { if (name) o.name = name; mm.add(o); return o; };

  // painted steel, neutral grey and close to matte (a metallic finish blows out under the lava lamp)
  const grey = reflective(std('#646567', 0.55, 0.05), 0.4);
  const topBlack = std('#1c1d20', 0.6, 0.1, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const shadow = std('#0b0b0d', 0.9);
  const plastic = std('#141416', 0.55);
  const white = std('#e8e8e6', 0.5, 0, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });

  /* --- the front cover: full height above the feet, its vertical edges rounded --- */
  const fs = new THREE.Shape();
  fs.moveTo(-X, -ZB);
  fs.lineTo(-X, -(ZF - R));
  fs.absarc(-X + R, -(ZF - R), R, Math.PI, Math.PI * 1.5, false);
  fs.lineTo(X - R, -ZF);
  fs.absarc(X - R, -(ZF - R), R, Math.PI * 1.5, Math.PI * 2, false);
  fs.lineTo(X, -ZB);
  fs.closePath();
  // the I/O tray: a stadium cut down through the cover (its floor closes it 3 mm below the top)
  const io = NR200.io, trayZ = ZF - 1.5 - io.d / 2;
  const stadium = (cx: number, cz: number, w: number, d: number) => {
    const p = new THREE.Path(), rr = d / 2;
    p.absarc(cx + w / 2 - rr, -cz, rr, -Math.PI / 2, Math.PI / 2, false);
    p.absarc(cx - w / 2 + rr, -cz, rr, Math.PI / 2, Math.PI * 1.5, false);
    p.closePath();
    return p;
  };
  fs.holes.push(stadium(io.x, trayZ, io.w, io.d));
  const bev = NR200.front.topEdge;
  const frontGeo = new THREE.ExtrudeGeometry(fs, { depth: H - FEET - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelOffset: -bev, bevelSegments: 3, curveSegments: 20 });
  frontGeo.rotateX(-Math.PI / 2).translate(0, FEET + bev, 0); // shape (x, -z) extruded up
  const frontCover = add(new THREE.Mesh(frontGeo, grey), 'front cover');

  // the badge: an outlined hexagon
  const L = NR200.logo;
  const badge = roundedShape(hexagon(0), 2.6);
  badge.holes.push(roundedShape(hexagon(L.line), 2.0));
  const badgeGeo = new THREE.ShapeGeometry(badge, 6).translate(0, L.y, ZF + 0.05);
  add(new THREE.Mesh(badgeGeo, white), 'badge');

  /* --- the top cover: grey steel round a dark mesh, its rear edge rounded --- */
  const ts = new THREE.Shape(); // in (z, y), extruded across x
  ts.moveTo(ZB, TOP);
  ts.lineTo(ZB, H);
  ts.lineTo(ZR + NR200.top.rearR, H);
  ts.absarc(ZR + NR200.top.rearR, H - NR200.top.rearR, NR200.top.rearR, Math.PI / 2, Math.PI, false);
  ts.lineTo(ZR, TOP);
  ts.closePath();
  const topGeo = new THREE.ExtrudeGeometry(ts, { depth: 2 * X, bevelEnabled: false, curveSegments: 8 });
  topGeo.rotateY(-Math.PI / 2).translate(X, 0, 0); // (z, y) at depth e -> (x = X - e, y, z)
  const topCover = add(new THREE.Mesh(topGeo, grey), 'top cover');
  // from above it is black to the edge: a dark skin over the covers' tops, and the mesh inside a lip
  const Tp = NR200.top;
  /** The top's outline in (x, -z), inset by e: from behind the rear round to the front, its front corners round. */
  const topOutline = (e: number, rear: number) => {
    const s = new THREE.Shape(), r = R - e;
    s.moveTo(-X + e, -(ZR + rear));
    s.lineTo(-X + e, -(ZF - R));
    s.absarc(-X + R, -(ZF - R), r, Math.PI, Math.PI * 1.5, false);
    s.lineTo(X - R, -(ZF - e));
    s.absarc(X - R, -(ZF - R), r, Math.PI * 1.5, Math.PI * 2, false);
    s.lineTo(X - e, -(ZR + rear));
    s.closePath();
    return s;
  };
  const skin = topOutline(0, Tp.rearR);
  skin.holes.push(stadium(io.x, trayZ, io.w, io.d));
  add(new THREE.Mesh(new THREE.ShapeGeometry(skin, 12).rotateX(-Math.PI / 2).translate(0, H + 0.02, 0), topBlack), 'top');
  const meshMap = meshTexture();
  meshMap.repeat.set(1 / (8 * Tp.meshPitch), 1 / (8 * Tp.meshPitch)); // ShapeGeometry's uv is in mm
  const meshShape = topOutline(Tp.lip, Tp.rearR);
  meshShape.holes.push(stadium(io.x, trayZ, io.w + 2 * Tp.lip, io.d + 2 * Tp.lip));
  add(new THREE.Mesh(new THREE.ShapeGeometry(meshShape, 12).rotateX(-Math.PI / 2).translate(0, H + 0.04, 0), std('#ffffff', 0.7, 0.15, { map: meshMap, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })), 'top mesh');

  // the I/O tray: a black liner round its walls, its floor 3 mm down with the ports, and the power
  // button's ring of light
  const trayShape = (e: number) => { const s = new THREE.Shape(); s.curves.push(...stadium(io.x, trayZ, io.w - 2 * e, io.d - 2 * e).curves); return s; };
  const liner = trayShape(0);
  liner.holes.push(stadium(io.x, trayZ, io.w - 1.2, io.d - 1.2));
  const linerGeo = new THREE.ExtrudeGeometry(liner, { depth: io.recess, bevelEnabled: false, curveSegments: 12 });
  const trayPlastic = std('#2c2d30', 0.6);
  add(new THREE.Mesh(linerGeo.rotateX(-Math.PI / 2).translate(0, H - io.recess + 0.01, 0), trayPlastic), 'I/O tray');
  // below the floor the cut is filled (it runs the cover's full height), so no light or view passes
  const plug = new THREE.ExtrudeGeometry(trayShape(0), { depth: H - io.recess - FEET - 0.02, bevelEnabled: false, curveSegments: 12 });
  add(new THREE.Mesh(plug.rotateX(-Math.PI / 2).translate(0, FEET, 0), trayPlastic));
  const ioTex = canvasTexture(512, 72, (x) => {
    x.fillStyle = '#3a3b3e'; x.fillRect(0, 0, 512, 72);
    const at = (f: number) => f * 512;
    x.fillStyle = '#050506';
    x.beginPath(); x.roundRect(at(io.ports[0]) - 18, 30, 36, 12, 6); x.fill(); // USB-C
    for (const f of [io.ports[1], io.ports[3]]) { x.fillRect(at(f) - 26, 27, 52, 18); x.fillStyle = '#3c3d40'; x.fillRect(at(f) - 22, 31, 44, 5); x.fillStyle = '#050506'; }
    x.beginPath(); x.arc(at(io.ports[4]), 36, 8, 0, 7); x.fill(); // audio
  });
  const floor = new THREE.ShapeGeometry(trayShape(0.6), 12).rotateX(-Math.PI / 2).translate(0, H - io.recess + 0.02, 0);
  // its uv: across the tray left to right, and front to back
  const fp = floor.getAttribute('position'), fuv = floor.getAttribute('uv');
  for (let i = 0; i < fp.count; i++) fuv.setXY(i, (fp.getX(i) - (io.x - io.w / 2)) / io.w, (trayZ + io.d / 2 - fp.getZ(i)) / io.d);
  add(new THREE.Mesh(floor, std('#ffffff', 0.6, 0, { map: ioTex })), 'I/O');
  const B = io.button, hex = (s: number): [number, number][] => [[B.w / 2 * s, 0], [B.w / 4 * s, B.d / 2 * s], [-B.w / 4 * s, B.d / 2 * s], [-B.w / 2 * s, 0], [-B.w / 4 * s, -B.d / 2 * s], [B.w / 4 * s, -B.d / 2 * s]];
  const btn = roundedShape(hex(1), 1.4);
  btn.holes.push(roundedShape(hex(0.84), 1.2));
  const bx = io.x - io.w / 2 + io.ports[2] * io.w;
  add(new THREE.Mesh(new THREE.ShapeGeometry(btn, 4).rotateX(-Math.PI / 2).translate(bx, H - io.recess + 0.12, trayZ), new THREE.MeshBasicMaterial({ color: new THREE.Color('#f4f6ff').multiplyScalar(1.3), polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: -1 })), 'power button');
  add(new THREE.Mesh(new THREE.ShapeGeometry(roundedShape(hex(0.84), 1.2), 4).rotateX(-Math.PI / 2).translate(bx, H - io.recess + 0.6, trayZ), std('#202124', 0.5, 0.2)));

  // the tab on the top cover's rear edge
  add(new THREE.Mesh(new THREE.BoxGeometry(Tp.tab.w, Tp.tab.h, Tp.tab.proud).translate(0, H - Tp.tab.below - Tp.tab.h / 2, ZR - Tp.tab.proud / 2), grey), 'rear tab');

  /* --- the body under the panels: dark inside, seen through the gaps and the glass --- */
  const S = NR200.side;
  const inner = new THREE.BoxGeometry(2 * X - 2, TOP - FEET, ZB - ZR - 1).translate(0, (TOP + FEET) / 2, (ZB + ZR + 1) / 2);
  add(new THREE.Mesh(inner, std('#0e0f12', 0.9, 0, { side: THREE.BackSide })), 'inside');
  // the bottom rails under the panels, and the rear
  for (const s of [1, -1]) add(new THREE.Mesh(new THREE.BoxGeometry(1.2, S.y0 - FEET, ZB - ZR).translate(s * (X - 0.6), (S.y0 + FEET) / 2, (ZB + ZR) / 2), grey));
  const rear = add(new THREE.Mesh(new THREE.BoxGeometry(2 * X, TOP - FEET, 1.2).translate(0, (TOP + FEET) / 2, ZR + 0.6), std('#4a4c51', 0.55, 0.35)), 'rear');
  // rear details: the motherboard's I/O (upright, the board stands on edge), three slot covers, the
  // power inlet, and the thumbscrews that stand proud
  const rearDark = std('#18191c', 0.6, 0.3);
  add(new THREE.Mesh(new THREE.PlaneGeometry(44.5, 158.8).rotateY(Math.PI).translate(42, 188, ZR - 0.05), rearDark));
  for (let i = 0; i < 3; i++) add(new THREE.Mesh(new THREE.PlaneGeometry(18, 100).rotateY(Math.PI).translate(-30 - i * 20.3, 104, ZR - 0.05), rearDark));
  const In = NR200.rear.inlet;
  add(new THREE.Mesh(new THREE.BoxGeometry(In.w, In.y[1] - In.y[0], In.proud).translate(In.x, (In.y[0] + In.y[1]) / 2, ZR - In.proud / 2), plastic), 'power inlet');
  const V = NR200.rear.vent, ventTex = canvasTexture(128, 128, (x) => {
    x.fillStyle = '#4a4c51'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#060607';
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { x.beginPath(); x.arc(8 + c * 16 + (r % 2) * 8, 8 + r * 16, 6, 0, 7); x.fill(); }
  });
  ventTex.wrapS = ventTex.wrapT = THREE.RepeatWrapping;
  ventTex.repeat.set((V.x[1] - V.x[0]) / 32, (V.y[1] - V.y[0]) / 32);
  add(new THREE.Mesh(new THREE.PlaneGeometry(V.x[1] - V.x[0], V.y[1] - V.y[0]).rotateY(Math.PI).translate((V.x[0] + V.x[1]) / 2, (V.y[0] + V.y[1]) / 2, ZR - 0.05), std('#ffffff', 0.6, 0.2, { map: ventTex })), 'rear vent');
  for (let i = 0; i < 3; i++) add(new THREE.Mesh(new THREE.CylinderGeometry(4, 4, NR200.rear.thumb, 16).rotateX(Math.PI / 2).translate(-30 - i * 20.3, 156, ZR - NR200.rear.thumb / 2), std('#2a2b2e', 0.4, 0.6)), 'thumbscrew');
  // the bottom: a vented plate between the feet
  add(new THREE.Mesh(new THREE.PlaneGeometry(2 * X, ZB - ZR).rotateX(Math.PI / 2).translate(0, FEET, (ZB + ZR) / 2), shadow));

  /* --- the side panels --- */
  const pz = ZR + S.z0 + S.len / 2, py = (S.y0 + S.y1) / 2;
  // right, to the desk: the steel sheet with the Ncore holes cut through, and 2 mm inside it the black
  // dust filter that the holes show
  const right = add(new THREE.Mesh(ncoreFace(), grey), 'right panel');
  add(new THREE.Mesh(new THREE.PlaneGeometry(S.len, S.y1 - S.y0).rotateY(Math.PI / 2).translate(X - 2, py, pz), std('#141517', 0.9)), 'dust filter');
  // the panel's top edge turns in under the top cover: a dark band, so the 0.8 mm reveal above it holds
  // together as a line from across the room instead of breaking into dashes
  add(new THREE.Mesh(new THREE.PlaneGeometry(S.len, 0.9).rotateY(Math.PI / 2).translate(X + 0.03, S.y1 - 0.45, pz), std('#0e0f12', 0.9, 0, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })), 'seam');
  // left, to the wall: tempered glass with a black printed border
  const glassMat = reflective(new THREE.MeshStandardMaterial({ color: '#20242c', transparent: true, opacity: 0.38, roughness: 0.05, metalness: 0.3, depthWrite: false }), 1.2);
  const glass = add(new THREE.Mesh(new THREE.PlaneGeometry(S.len, S.y1 - S.y0).rotateY(-Math.PI / 2).translate(-X, py, pz), glassMat), 'glass');
  glass.renderOrder = 2;
  const border = new THREE.Shape([new THREE.Vector2(-S.len / 2, -(S.y1 - S.y0) / 2), new THREE.Vector2(S.len / 2, -(S.y1 - S.y0) / 2), new THREE.Vector2(S.len / 2, (S.y1 - S.y0) / 2), new THREE.Vector2(-S.len / 2, (S.y1 - S.y0) / 2)]);
  border.holes.push(new THREE.Path([new THREE.Vector2(-S.len / 2 + 7, -(S.y1 - S.y0) / 2 + 7), new THREE.Vector2(-S.len / 2 + 7, (S.y1 - S.y0) / 2 - 7), new THREE.Vector2(S.len / 2 - 7, (S.y1 - S.y0) / 2 - 7), new THREE.Vector2(S.len / 2 - 7, -(S.y1 - S.y0) / 2 + 7)]));
  add(new THREE.Mesh(new THREE.ShapeGeometry(border).rotateY(-Math.PI / 2).translate(-X - 0.05, py, pz), std('#0a0a0b', 0.2, 0.2)));

  /* --- inside, behind the glass: the GPU on its riser, and the radiator's fans under the top --- */
  const fanTex = canvasTexture(128, 128, (x) => {
    x.fillStyle = '#121315'; x.fillRect(0, 0, 128, 128);
    x.translate(64, 64); x.fillStyle = '#2a2c30';
    for (let i = 0; i < 9; i++) { x.rotate((Math.PI * 2) / 9); x.beginPath(); x.moveTo(10, 0); x.quadraticCurveTo(40, 14, 58, 4); x.lineTo(56, -8); x.quadraticCurveTo(36, -4, 10, -8); x.fill(); }
    x.fillStyle = '#1b1c1f'; x.beginPath(); x.arc(0, 0, 14, 0, 7); x.fill();
  });
  const gpu = add(new THREE.Group(), 'GPU');
  gpu.add(new THREE.Mesh(new THREE.BoxGeometry(56, 120, 312).translate(-X + 6 + 28, 30 + 60, -14), std('#1a1b1e', 0.5, 0.4)));
  for (const z of [-118, -14, 90]) gpu.add(new THREE.Mesh(new THREE.CircleGeometry(44, 40).rotateY(-Math.PI / 2).translate(-X + 5.9, 90, z), std('#ffffff', 0.6, 0, { map: fanTex })));
  for (const z of [-80, 70]) add(new THREE.Mesh(new THREE.BoxGeometry(140, 25, 140).translate(0, TOP - 27.2 - 12.5, z), std('#141518', 0.7)));
  add(new THREE.Mesh(new THREE.BoxGeometry(140, 27.2, 318).translate(0, TOP - 13.6, -5), std('#1e1f22', 0.6, 0.3)), 'radiator');

  /* --- the feet: black corner blocks, sloping in --- */
  const Ft = NR200.feet;
  const footPts = (zTop: readonly number[], zBot: readonly number[], front: boolean, sx: number) => {
    const z = (d: number) => (front ? ZF - d : ZR + d), x = (d: number) => sx * (X - d), pts: THREE.Vector3[] = [];
    for (const zz of zTop) for (const xx of Ft.x) pts.push(new THREE.Vector3(x(xx), FEET, z(zz)));
    for (const zz of zBot) for (const xx of Ft.xBottom) pts.push(new THREE.Vector3(x(xx), 0, z(zz)));
    return pts;
  };
  const feet: THREE.BufferGeometry[] = [];
  for (const sx of [1, -1]) for (const front of [false, true]) {
    const f = front ? Ft.front : Ft.rear, g = new ConvexGeometry(footPts(f.z, f.zBottom, front, sx));
    feet.push(g);
    add(new THREE.Mesh(g, plastic), 'foot');
  }

  /* --- measured off the built parts, for the lab's checks --- */
  const measure = () => {
    const box = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o);
    mm.updateMatrixWorld(true);
    const all = box(mm), fc = box(frontCover), tc = box(topCover), rp = box(right), rr = box(rear);
    const u = 1 / MM;
    // the front face's flat: how far the built outline runs straight across before its rounds
    let flat = 0;
    for (const p of fs.extractPoints(20).shape) if (p.y < -ZF + 1e-4) flat = Math.max(flat, Math.abs(p.x));
    feet[0].computeBoundingBox();
    const fb = feet[0].boundingBox!, fp = feet[0].getAttribute('position');
    let botMin = Infinity, botMax = -Infinity;
    for (let i = 0; i < fp.count; i++) if (fp.getY(i) < 0.01) { botMin = Math.min(botMin, fp.getZ(i)); botMax = Math.max(botMax, fp.getZ(i)); }
    feet[1].computeBoundingBox();
    badgeGeo.computeBoundingBox();
    const bb = badgeGeo.boundingBox!;
    const holes = ncoreHoles(); // the rule; the face cuts one hole for each
    const cut = (right.geometry as THREE.ShapeGeometry).parameters.shapes as THREE.Shape;
    return {
      width: (all.max.x - all.min.x) * u,
      height: (all.max.y - all.min.y) * u,
      'depth without protrusions': (fc.max.z - rr.min.z) * u,
      'depth with the thumbscrews': (all.max.z - all.min.z) * u,
      'body height (without feet)': (tc.max.y - fc.min.y) * u,
      'front cover depth': (fc.max.z - fc.min.z) * u,
      'front face flat width': 2 * flat,
      'top cover height': (tc.max.y - tc.min.y) * u,
      'side panel length': (rp.max.z - rp.min.z) * u,
      'side panel height': (rp.max.y - rp.min.y) * u,
      'foot top, front to back': fb.max.z - fb.min.z,
      'foot bottom, front to back': botMax - botMin,
      'front foot, set back from the front': ZF - feet[1].boundingBox!.max.z,
      'badge width': bb.max.x - bb.min.x,
      'badge height': bb.max.y - bb.min.y,
      'badge centre above the desk': (bb.max.y + bb.min.y) / 2,
      'Ncore holes': cut.holes.length,
      'Ncore first hole from the rear': Math.min(...holes.map((h) => h[0])),
      'Ncore last hole from the rear': Math.max(...holes.map((h) => h[0])),
      'Ncore lowest row above the desk': Math.min(...holes.map((h) => h[1])),
    } as Record<string, number>;
  };

  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  glass.castShadow = false;
  let measured: Record<string, number> | undefined;
  return { root, get measured() { return (measured ??= measure()); } };
}

export function buildPC() {
  return buildNR200().root;
}
