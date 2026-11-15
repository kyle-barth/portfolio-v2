// Gigabyte AORUS FO27Q3, built from the measured spec in specs/fo27q3.ts (millimetres, from Gigabyte's
// straight-on renders and its official dimensions) and nothing else. Built in mm and scaled to desk units
// (1 unit = 160 mm). The head (panel, housing, VESA boss) slides down the stand's leaning pillar to the
// desk's setting; the stand (pillar, hub, legs) stands on the desk at y = 0.
// The live screen is a plane on the front of the panel; its material comes from the scene.
import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { canvasTexture, reflective, std } from './kit';
import { FO27 } from '../specs/fo27q3';

const MM = 1 / 160;
const P = FO27.panel, SC = FO27.screen, CH = FO27.chin, HS = FO27.housing, V = FO27.vesa, PL = FO27.pillar, B = FO27.base;

/** Where the scene puts the screen, in desk units: its size, its centre's height, and its plane's z. */
export const MONITOR = {
  screenW: SC.w * MM, screenH: SC.h * MM,
  centreY: (FO27.head.bottom + SC.bottom + SC.h / 2) * MM,
  frontZ: 0.042,
};

/** The pillar's front face leans back: how far it moves back per mm up. */
const LEAN = (PL.foot.z - PL.top.z) / (PL.top.y - PL.foot.y);
const pillarFront = (y: number) => PL.foot.z - (y - PL.foot.y) * LEAN;

/** Straight lines through a table of [x, value]. */
const table = (t: readonly (readonly [number, number])[], x: number) => {
  if (x <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) if (x <= t[i][0]) return t[i - 1][1] + ((t[i][1] - t[i - 1][1]) * (x - t[i - 1][0])) / (t[i][0] - t[i - 1][0]);
  return t[t.length - 1][1];
};

/** A solid from a side profile [z, y][] swept across x from x0 to x1 (flat ends). */
function sweep(profile: [number, number][], x0: number, x1: number) {
  const s = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y)));
  // shape (z, y) extruded along its normal, turned so the extrusion runs from x1 back to x0
  return new THREE.ExtrudeGeometry(s, { depth: x1 - x0, bevelEnabled: false, curveSegments: 6 }).rotateY(-Math.PI / 2).translate(x1, 0, 0);
}

/**
 * The AORUS wordmark on the chin, traced off the front render in its pixels (0.3826 mm each): leaning
 * forward, angular, the A without a crossbar. The canvas covers pixels 736 to 862 across and 899 to 923
 * down; each letter is an outline and, where it has one, a counter.
 */
const LOGO_PX = { x: [736, 862], y: [899, 923], centre: [799, 911] } as const;
function wordmark(color: string) {
  const k = 4, [x0, x1] = LOGO_PX.x, [y0, y1] = LOGO_PX.y;
  const letters: number[][][] = [
    [[738, 920, 762, 901.5, 772, 901.5, 766, 920, 758.5, 920, 760.5, 914, 751.5, 914, 745.5, 920], [755, 911.5, 762.5, 905, 760.5, 911.5]], // A
    [[770, 920, 776, 902, 793, 902, 787, 920], [777.5, 916.5, 781, 905.5, 787.5, 905.5, 784, 916.5]], // O
    [[789, 920, 795, 902, 808, 902, 805.5, 910.5, 801, 911.5, 804.5, 920, 798, 920, 795, 912.5, 792.5, 920], [797, 909, 798.2, 905, 803, 905, 802, 909]], // R
    [[811, 902, 816.5, 902, 812.5, 915.5, 821, 915.5, 825, 902, 830.5, 902, 825, 920, 806.5, 920]], // U
    [[836.8, 902, 859.8, 902, 858.3, 905, 841.8, 905, 840.3, 909.5, 851.8, 909.5, 848.3, 920, 825.8, 920, 827.3, 917, 843.8, 917, 845.3, 912.5, 833.8, 912.5]], // S, its top stroke running back over the U
  ];
  return canvasTexture((x1 - x0) * k, (y1 - y0) * k, (x) => {
    x.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
    x.fillStyle = color;
    for (const rings of letters) {
      x.beginPath();
      for (const r of rings) { x.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) x.lineTo(r[i], r[i + 1]); x.closePath(); }
      x.fill('evenodd');
    }
  });
}

export function buildMonitor(screenMaterial: THREE.Material, opts: { panelBottom?: number; tipZ?: number } = {}) {
  const g = new THREE.Group();
  g.name = 'monitor';
  const mm = new THREE.Group();
  mm.scale.setScalar(MM);
  g.add(mm);

  // three blacks: the glass (black where the picture stops), the satin chin, and the matte stand
  const glass = reflective(std('#060708', 0.12, 0.2), 0.8);
  const housingPlastic = reflective(std('#141518', 0.55, 0.1), 0.35);
  const standPlastic = reflective(std('#1b1c1f', 0.6, 0.1), 0.35);
  const chinSatin = reflective(std('#1d1e21', 0.45, 0.3), 0.6);
  const rimMat = reflective(std('#2a2b2f', 0.35, 0.4), 0.8);
  const rib = std('#26272b', 0.4, 0.2); // a shade lighter than the leg: the ribs show by catching the light
  const dark = std('#060607', 0.8);

  // the stand is drawn where it stands under the render's panel; the head slides down the leaning pillar
  const pb = opts.panelBottom ?? FO27.head.bottom;
  const slide = (FO27.head.renderBottom - pb) * LEAN; // moving down the pillar brings the head forward
  const panelZ = MONITOR.frontZ / MM - 0.08; // the panel's front face; the screen sits just in front
  const stand = new THREE.Group();
  stand.position.z = panelZ - slide;
  mm.add(stand);
  const head = new THREE.Group();
  head.position.set(0, pb, panelZ);
  mm.add(head);

  /* --- the head: module, back, bar, block, housing --- */
  const W = P.w / 2, H = P.h, mod = P.module;
  const topSlope = H - P.slope * ((mod - P.top) / (P.back - P.top)); // where the sloping top meets the module's depth
  const panel = new THREE.Mesh(sweep([[0, 0], [0, H], [-P.top, H], [-mod, topSlope], [-mod, 0]], -W, W), glass);
  panel.name = 'panel';
  head.add(panel);
  // the back swells behind the module across the middle, easing back toward the ends
  const backPts: THREE.Vector3[] = [];
  for (const s of [1, -1]) {
    // its depth across: full to |x| = 256, then easing (top view: 534 wide at 10.7, 585 at 6.6)
    for (const [x, d] of [[P.backW, P.back], [267, 10.7], [P.edgeW + 0.5, 6.6]] as [number, number][]) {
      const top = H - P.slope * ((d - P.top) / (P.back - P.top)); // where the sloping top reaches this depth
      backPts.push(new THREE.Vector3(s * x, topSlope, -mod), new THREE.Vector3(s * x, top, -d), new THREE.Vector3(s * x, 0, -d), new THREE.Vector3(s * x, 0, -mod));
    }
  }
  head.add(new THREE.Mesh(new ConvexGeometry(backPts), housingPlastic));
  // the bar along the bottom, its ends tapering in plan
  const barPts: THREE.Vector3[] = [];
  for (const y of [0, P.bar.h]) for (const s of [1, -1]) barPts.push(new THREE.Vector3(s * P.bar.wFront / 2, y, -mod), new THREE.Vector3(s * P.bar.wBack / 2, y, -P.bar.d));
  const bar = new THREE.Mesh(new ConvexGeometry(barPts), housingPlastic);
  head.add(bar);
  // the housing: its depth at (x, mm below the top) follows the centre profile, scaled across by the
  // bowed plan. The wings reach it; the centre panel between them sits `rise` lower.
  const deepest = Math.max(...HS.back.map((b) => b[1]));
  const planF = (x: number) => (Math.min(table(HS.plan, Math.abs(x)), deepest) - P.back) / (deepest - P.back);
  const depthAt = (x: number, below: number) => P.back + (table(HS.back, below) - P.back) * planF(x);
  const hTopFront = H - HS.top[0], WG = HS.wing;
  const stations = HS.back.map((b) => b[0]);
  const hpts: THREE.Vector3[] = [];
  for (const [ax] of HS.plan) for (const s of ax === 0 ? [1] : [1, -1]) {
    const x = s * Math.min(ax, HS.w / 2);
    hpts.push(new THREE.Vector3(x, hTopFront, -P.back + 0.5), new THREE.Vector3(x, H - HS.back[HS.back.length - 1][0], -P.back + 0.5));
    for (const b of stations) hpts.push(new THREE.Vector3(x, H - b, -Math.max(P.back + 1, depthAt(x, b) - WG.rise)));
  }
  const housing = new THREE.Mesh(new ConvexGeometry(hpts), housingPlastic);
  housing.name = 'housing';
  head.add(housing);
  // the wings: their outline, with the profile's stations added along each edge so their backs follow it
  const wingEdge: [number, number][] = [];
  WG.outline.forEach(([ax, ab], i) => {
    const [bx, bb] = WG.outline[(i + 1) % WG.outline.length];
    wingEdge.push([ax, ab]);
    for (const st of stations) if ((st - ab) * (st - bb) < 0) wingEdge.push([ax + ((bx - ax) * (st - ab)) / (bb - ab), st]);
  });
  for (const s of [1, -1]) {
    const pts: THREE.Vector3[] = [];
    for (const [ax, b] of wingEdge) {
      pts.push(new THREE.Vector3(s * ax, H - b, -depthAt(ax, b)));
      pts.push(new THREE.Vector3(s * ax, b <= HS.back[0][0] ? hTopFront : H - b, -P.back + 0.5));
    }
    const wing = new THREE.Mesh(new ConvexGeometry(pts), housingPlastic);
    wing.name = 'wing';
    head.add(wing);
  }
  // the light lines: blue along each wing's fold, purple along the bottom of the centre panel
  const lineBetween = (a: THREE.Vector3, b: THREE.Vector3, color: string) => {
    const geo = new THREE.BoxGeometry(0.9, 0.9, a.distanceTo(b));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.lookAt(m.position.clone().add(b.clone().sub(a)));
    return m;
  };
  const Lt = HS.lights;
  for (const s of [1, -1]) {
    const [xa, xb] = Lt.wing.x, y = H - Lt.wing.below;
    head.add(lineBetween(new THREE.Vector3(s * xa, y, -depthAt(xa, Lt.wing.below) - 0.3), new THREE.Vector3(s * xb, y, -depthAt(xb, Lt.wing.below) - 0.3), '#4a6dff'));
  }
  const cy = H - Lt.centre.below, cd = depthAt(0, Lt.centre.below) - WG.rise + 0.3;
  head.add(lineBetween(new THREE.Vector3(-Lt.centre.x, cy, -cd), new THREE.Vector3(Lt.centre.x, cy, -cd), '#b04dff'));
  const prof: [number, number][] = HS.back.map(([below, d]) => [H - below, d]);
  // the block between the bar and the housing, centred
  const hBot = prof[prof.length - 1][0];
  const blockPts: THREE.Vector3[] = [];
  for (const [y, w] of [[0, P.block.w], [hBot, P.block.wTop]] as [number, number][]) for (const s of [1, -1]) blockPts.push(new THREE.Vector3(s * w / 2, y, -mod), new THREE.Vector3(s * w / 2, y, -P.block.d));
  head.add(new THREE.Mesh(new ConvexGeometry(blockPts), housingPlastic));
  // the AORUS light window along the housing's top back edge
  const ST = HS.strip, logoTex = wordmark('#d27bff');
  const stripTex = canvasTexture(1024, 56, (x) => {
    x.fillStyle = '#0b0f18'; x.fillRect(0, 0, 1024, 56);
    const gr = x.createLinearGradient(0, 0, 1024, 0);
    gr.addColorStop(0, '#3d5cff'); gr.addColorStop(0.5, '#c45cff'); gr.addColorStop(1, '#45d4ff');
    x.fillStyle = gr;
    const line = Math.round((1.2 / ST.d[1]) * 56 * 3.4); // about 1.2 mm of the window's 16
    x.fillRect(0, 0, 1024, line); x.fillRect(0, 56 - line, 1024, line);
    const lw = (ST.logo[0] / ST.w) * 1024, lh = (ST.logo[1] / 16) * 56;
    x.drawImage(logoTex.image as HTMLCanvasElement, 512 - lw / 2, 28 - lh / 2, lw, lh);
  });
  const yAt = (d: number) => hTopFront - ((d - P.back) / (HS.back[0][1] - P.back)) * (HS.top[1] - HS.top[0]);
  const sd = HS.strip.d, stripLen = Math.hypot(sd[1] - sd[0], yAt(sd[0]) - yAt(sd[1]));
  // turned half round so the wordmark reads from behind, the way the real one does
  const strip = new THREE.PlaneGeometry(HS.strip.w, stripLen).rotateZ(Math.PI).rotateX(-Math.PI / 2 - Math.atan2(yAt(sd[0]) - yAt(sd[1]), sd[1] - sd[0]));
  head.add(new THREE.Mesh(strip.translate(0, (yAt(sd[0]) + yAt(sd[1])) / 2 + 0.1, -(sd[0] + sd[1]) / 2), new THREE.MeshStandardMaterial({ map: stripTex, emissiveMap: stripTex, emissive: '#ffffff', roughness: 0.1, metalness: 0.2 })));

  // the VESA boss ring, the stand's hub on it (tapering), and the arm back to the pillar
  const vy = H - V.below;
  const ring = new THREE.Shape();
  ring.absarc(0, 0, V.ring[1] / 2, 0, Math.PI * 2, false);
  ring.holes.push(new THREE.Path().absarc(0, 0, V.ring[0] / 2, 0, Math.PI * 2, true));
  const boss = new THREE.Mesh(new THREE.ExtrudeGeometry(ring, { depth: V.depth[1] - V.depth[0] + 2, bevelEnabled: false, curveSegments: 24 }).translate(0, vy, -V.depth[1]), housingPlastic);
  head.add(boss);
  head.add(new THREE.Mesh(new THREE.CylinderGeometry(V.hub.d[0] / 2, V.hub.d[0] / 2, V.hub.z[0] - V.depth[1] + 3, 40).rotateX(Math.PI / 2).translate(0, vy, -(V.hub.z[0] + V.depth[1] - 3) / 2), standPlastic));
  head.add(new THREE.Mesh(new THREE.CylinderGeometry(V.hub.d[1] / 2, V.hub.d[0] / 2, V.hub.z[1] - V.hub.z[0], 40).rotateX(-Math.PI / 2).translate(0, vy, -(V.hub.z[0] + V.hub.z[1]) / 2), standPlastic));
  const armY = pb + vy; // in the stand's frame (both stand on the desk)
  const armFront = panelZ - V.hub.z[1] + 2, armBack = stand.position.z + pillarFront(armY) - 4;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(V.arm.w, V.arm.h, armFront - armBack).translate(0, armY, (armFront + armBack) / 2), standPlastic);
  mm.add(arm);

  /* --- the front: the chin band and its wordmark, the light rim, the screen --- */
  const chin = new THREE.Mesh(new THREE.PlaneGeometry(P.w, CH.h).translate(0, CH.h / 2, 0.04), chinSatin);
  head.add(chin);
  for (const y of [0.3, CH.h - 0.3]) head.add(new THREE.Mesh(new THREE.PlaneGeometry(P.w, 0.6).translate(0, y, 0.05), rimMat)); // its edges catch the light
  const px = 0.3826, LP = LOGO_PX;
  const logo = new THREE.PlaneGeometry((LP.x[1] - LP.x[0]) * px, (LP.y[1] - LP.y[0]) * px)
    .translate(((LP.x[0] + LP.x[1]) / 2 - 798) * px, CH.logo.y + ((LP.centre[1] - (LP.y[0] + LP.y[1]) / 2)) * px, 0.06);
  head.add(new THREE.Mesh(logo, new THREE.MeshStandardMaterial({ map: wordmark('#ffffff'), color: '#9a9ea6', transparent: true, roughness: 0.4, metalness: 0.3, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })));
  const R = FO27.rim;
  head.add(new THREE.Mesh(new THREE.PlaneGeometry(P.w, R).translate(0, H - R / 2, 0.03), rimMat));
  for (const s of [1, -1]) head.add(new THREE.Mesh(new THREE.PlaneGeometry(R, H - CH.h).translate(s * (W - R / 2), (H + CH.h) / 2, 0.03), rimMat));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SC.w, SC.h), screenMaterial);
  screen.position.set(0, SC.bottom + SC.h / 2, 0.08);
  head.add(screen);

  /* --- the stand: the leaning pillar, its slot and plate, the hub and the legs --- */
  const pw = PL.w / 2, topFront = PL.top.y, topBack = PL.top.y + PL.top.slope, [bz, by] = PL.top.bevel;
  const footY = PL.foot.y - 12;
  const pillarPts: THREE.Vector3[] = [];
  for (const x of [-pw, pw]) {
    pillarPts.push(new THREE.Vector3(x, footY, pillarFront(footY)), new THREE.Vector3(x, footY, pillarFront(footY) - PL.foot.d));
    pillarPts.push(new THREE.Vector3(x, topFront - by, pillarFront(topFront - by)), new THREE.Vector3(x, topFront, pillarFront(topFront) - bz)); // the bevel
    pillarPts.push(new THREE.Vector3(x, topBack, pillarFront(topFront) - PL.top.d));
  }
  const pillar = new THREE.Mesh(new ConvexGeometry(pillarPts), standPlastic);
  pillar.name = 'pillar';
  stand.add(pillar);
  // the cable slot down its front: a dark stadium inside a rim, on the leaning face
  const slotTop = PL.top.y - PL.slot.top, slotBot = PL.slot.bottom, slotLen = (slotTop - slotBot) / Math.cos(Math.atan(LEAN));
  const stadium = (w: number, l: number) => { const s = new THREE.Shape(); s.absarc(0, l / 2 - w / 2, w / 2, 0, Math.PI, false); s.absarc(0, -l / 2 + w / 2, w / 2, Math.PI, Math.PI * 2, false); s.closePath(); return s; };
  const onFace = (geo: THREE.BufferGeometry, lift: number) => {
    const mid = (slotTop + slotBot) / 2;
    return geo.rotateX(-Math.atan(LEAN)).translate(0, mid, pillarFront(mid) + lift);
  };
  stand.add(new THREE.Mesh(onFace(new THREE.ShapeGeometry(stadium(PL.slot.rim, slotLen + 5), 12), 0.05), std('#0f1012', 0.5, 0.2)));
  stand.add(new THREE.Mesh(onFace(new THREE.ShapeGeometry(stadium(PL.slot.w, slotLen), 12), 0.1), dark));
  // the AORUS plate: a dark glass wedge jutting from the pillar's foot, edged in blue along its top
  const pz = pillarFront(PL.plate.y[1]);
  const platePts = [
    new THREE.Vector3(-PL.plate.w[1] / 2, PL.plate.y[1], pz), new THREE.Vector3(PL.plate.w[1] / 2, PL.plate.y[1], pz),
    new THREE.Vector3(-PL.plate.w[0] / 2, PL.plate.y[0], pz + 8), new THREE.Vector3(PL.plate.w[0] / 2, PL.plate.y[0], pz + 8),
    new THREE.Vector3(-PL.plate.w[1] / 2, PL.plate.y[1], pz - 6), new THREE.Vector3(PL.plate.w[1] / 2, PL.plate.y[1], pz - 6),
    new THREE.Vector3(-PL.plate.w[0] / 2, PL.plate.y[0], pz - 6), new THREE.Vector3(PL.plate.w[0] / 2, PL.plate.y[0], pz - 6),
  ];
  stand.add(new THREE.Mesh(new ConvexGeometry(platePts), reflective(std('#1a1f2b', 0.3, 0.3), 1)));
  stand.add(new THREE.Mesh(new THREE.BoxGeometry(PL.plate.w[1] - 1, 0.6, 0.6).translate(0, PL.plate.y[1] - 0.4, pz + 0.2), std('#3a4660', 0.4, 0.3)));
  // the hub: a round collar with a chamfered top, on an oval plinth
  // (lathe profiles run from the bottom up: listed the other way, three.js turns the faces inward, and the
  // inside of the bottom disc, level with the desk, fights the desk's top for every pixel)
  const collar = new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(B.hub.d / 2, 0), new THREE.Vector2(B.hub.d / 2, B.hub.h - 3),
    new THREE.Vector2(B.hub.d / 2 - 3, B.hub.h), new THREE.Vector2(0, B.hub.h),
  ], 48).translate(0, 0, B.hub.z);
  stand.add(new THREE.Mesh(collar, standPlastic));
  const plinth = new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(B.hub.plinth / 2, 0), new THREE.Vector2(B.hub.plinth / 2, 1.5), new THREE.Vector2(B.hub.plinth / 2 - 4, 5), new THREE.Vector2(0, 5),
  ], 48).scale(1, 1, B.hub.depth / B.hub.plinth).translate(0, 0, B.hub.z); // oval: 90 deep (side render)
  stand.add(new THREE.Mesh(plinth, standPlastic));
  // the legs: even blades from the plinth out to the tips, five raised ribs along their tops
  const legs: THREE.Mesh[] = [];
  for (const s of [1, -1]) {
    const a = new THREE.Vector2(s * B.hub.plinth * 0.32, B.hub.z + 6), b = new THREE.Vector2(s * B.tip.x, opts.tipZ ?? B.tip.z);
    const d = b.clone().sub(a).normalize(), n = new THREE.Vector2(-d.y, d.x);
    // so the tip's outer corners land on tip.x and tip.z
    b.x -= s * Math.abs(n.x) * B.leg.w[1] * 0.4;
    b.y -= Math.abs(n.y) * B.leg.w[1] * 0.4;
    const tipEnd = b.clone().addScaledVector(d, -B.leg.w[1] / 2);
    const pts: THREE.Vector3[] = [];
    for (const [c, w, t] of [[a, B.leg.w[0], B.leg.t[0]], [tipEnd, B.leg.w[1], B.leg.t[1]]] as [THREE.Vector2, number, number][]) {
      for (const k of [1, -1]) for (const y of [0, t]) pts.push(new THREE.Vector3(c.x + n.x * k * w / 2, y, c.y + n.y * k * w / 2));
    }
    // the tip's outer end, angled down
    for (const k of [1, -1]) for (const y of [0, B.leg.t[1] * 0.55]) pts.push(new THREE.Vector3(b.x + n.x * k * B.leg.w[1] * 0.4, y, b.y + n.y * k * B.leg.w[1] * 0.4));
    const leg = new THREE.Mesh(new ConvexGeometry(pts), standPlastic);
    leg.name = 'leg';
    legs.push(leg);
    stand.add(leg);
    // a foot pad under the tip
    stand.add(new THREE.Mesh(new THREE.BoxGeometry(B.leg.w[1] * 0.7, 0.8, 14).rotateY(Math.atan2(d.x, d.y)).translate(tipEnd.x, 0.4, tipEnd.y), dark));
    // the ribs, standing proud along the top
    const len = tipEnd.distanceTo(a), mid = a.clone().add(tipEnd).multiplyScalar(0.5);
    const [rw, rh] = B.leg.rib, tt = (B.leg.t[0] + B.leg.t[1]) / 2, ww = (B.leg.w[0] + B.leg.w[1]) / 2;
    for (let i = 0; i < B.leg.ribs; i++) {
      const off = (i - (B.leg.ribs - 1) / 2) / B.leg.ribs;
      const r = new THREE.BoxGeometry(rw, rh, len * 0.9);
      r.rotateX(Math.atan2(B.leg.t[0] - B.leg.t[1], len)).rotateY(Math.atan2(d.x, d.y));
      r.translate(mid.x + n.x * off * ww * 0.85, tt + rh / 2, mid.y + n.y * off * ww * 0.85);
      stand.add(new THREE.Mesh(r, rib));
    }
  }

  /* --- measured off the built parts, for the lab's checks --- */
  const measure = () => {
    mm.updateMatrixWorld(true);
    const u = 1 / MM, box = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o);
    const all = box(mm), pan = box(panel), headBox = new THREE.Box3();
    for (const o of [panel, housing, boss, bar]) headBox.union(box(o));
    const legBox = new THREE.Box3();
    for (const l of legs) legBox.union(box(l));
    const pil = box(pillar), hb = box(housing), bb = box(bar), ch = box(chin), am = box(arm);
    // the back's depth at the edge: the deepest part of the head at x = 292.5
    const ray = new THREE.Raycaster(new THREE.Vector3(292.5 * MM, (pb + H / 2) * MM, (panelZ - 100) * MM), new THREE.Vector3(0, 0, 1));
    const hit = ray.intersectObjects([panel, ...head.children.filter((c) => (c as THREE.Mesh).isMesh)], false)[0];
    return {
      'panel width': (pan.max.x - pan.min.x) * u,
      'panel height': (pan.max.y - pan.min.y) * u,
      'screen width': SC.w,
      'screen height': SC.h,
      'chin (screen above the panel bottom)': screen.position.y - SC.h / 2,
      'chin band height': (ch.max.y - ch.min.y) * u,
      'depth without the stand': (headBox.max.z - headBox.min.z) * u,
      'bottom bar depth': (bb.max.z - bb.min.z) * u + mod,
      'panel edge depth (top view, at 585 wide)': hit ? panelZ - hit.point.z * u : 0,
      'housing width': (hb.max.x - hb.min.x) * u,
      "height at the render's setting": all.max.y * u,
      'base, tip to tip': (legBox.max.x - legBox.min.x) * u,
      'leg tips in front of the panel': legBox.max.z * u - panelZ,
      'pillar width': (pil.max.x - pil.min.x) * u,
      'pillar lean (degrees)': THREE.MathUtils.radToDeg(Math.atan(LEAN)),
      'arm width': (am.max.x - am.min.x) * u,
      'screen centre above the desk (scene)': FO27.head.bottom + screen.position.y,
    } as Record<string, number>;
  };

  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  screen.castShadow = false;
  let measured: Record<string, number> | undefined;
  return { root: g, screen, get measured() { return (measured ??= measure()); } };
}
