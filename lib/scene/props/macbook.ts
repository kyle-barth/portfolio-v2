// MacBook Pro with PROLED XDR Display, 14-inch, in Space Black, built from the measured spec in
// specs/macbook.ts (millimetres, from Apple's straight-on renders) and nothing else. Built in mm and
// scaled to desk units (1 unit = 160 mm). Front (the trackpad side) faces +z; the feet stand on y = 0.
//
// The base and the lid are lofts: a stack of rounded-rectangle rings, each the outline pulled in by the
// measured edge profile at its height, so the corners, the long tuck under the base and the lid's soft
// edges all come out of one table. The finger scoop is cut by pushing the front edge's top rings back.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { reflective } from './kit';
import { MBP } from '../specs/macbook';

const MM = 1 / 160; // desk units per millimetre

/** The panel's proportions, for whoever draws the screen. */
export const MACBOOK_SCREEN = { w: MBP.display.w, h: MBP.display.h };

/* ---------- Outline and lofts ---------- */

type OutlinePt = { x: number; z: number; nx: number; nz: number };

/**
 * A rounded rectangle's outline as points with outward normals, front edge first (+z), going round
 * through the right side, the back and the left. Straight runs are sampled every `step` mm, or `fine`
 * mm where `dense(x)` asks for it along the front and back (the scoop, the hinge pockets), with a vertex
 * exactly on each of `breaks` (where they start and end).
 */
function outline(w: number, d: number, r: number, step = 12, fine = 0.5, dense: (x: number) => boolean = () => false, breaks: number[] = []) {
  const pts: OutlinePt[] = [];
  const hx = w / 2 - r, hz = d / 2 - r;
  const run = (from: number, to: number, at: (v: number) => OutlinePt, denseRun = false) => {
    const len = Math.abs(to - from), dir = Math.sign(to - from);
    let v = from;
    while ((to - v) * dir > 1e-6) {
      pts.push(at(v));
      // fine steps inside the dense stretch, and from a coarse step before it, so its ends aren't skipped;
      // a vertex lands exactly on each break (where the scoop starts)
      const s = denseRun && (dense(v) || dense(v + dir * step)) ? fine : step;
      let next = dir > 0 ? Math.min(to, v + s) : Math.max(to, v - s);
      if (denseRun) for (const b of breaks) if ((b - v) * dir > 1e-6 && (next - b) * dir > 1e-6) next = b;
      v = next;
      if (len === 0) break;
    }
  };
  const arc = (cx: number, cz: number, a0: number, a1: number, n = 14) => {
    for (let i = 0; i < n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      pts.push({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, nx: Math.cos(a), nz: Math.sin(a) });
    }
  };
  run(-hx, hx, (x) => ({ x, z: d / 2, nx: 0, nz: 1 }), true); // front, left to right
  arc(hx, hz, Math.PI / 2, 0); // front right
  run(hz, -hz, (z) => ({ x: w / 2, z, nx: 1, nz: 0 })); // right side, front to back
  arc(hx, -hz, 0, -Math.PI / 2); // back right
  run(hx, -hx, (x) => ({ x, z: -d / 2, nx: 0, nz: -1 }), true); // back, right to left
  arc(-hx, -hz, -Math.PI / 2, -Math.PI); // back left
  run(-hz, hz, (z) => ({ x: -w / 2, z, nx: -1, nz: 0 })); // left side, back to front
  arc(-hx, hz, Math.PI, Math.PI / 2); // front left
  return pts;
}

/**
 * Loft rings through `rings` ([inset, y], top first). `push(p, y)` moves a point further in from the
 * outline (the scoop, the hinge pockets). Returns the side surface and each ring's points, outward-facing.
 */
function loft(pts: OutlinePt[], rings: [number, number][], push: (p: OutlinePt, y: number) => number = () => 0) {
  const n = pts.length;
  const pos: number[] = [];
  const ringPts: THREE.Vector2[][] = [];
  for (const [inset, y] of rings) {
    const ring: THREE.Vector2[] = [];
    for (const p of pts) {
      const k = inset + push(p, y);
      const x = p.x - p.nx * k, z = p.z - p.nz * k;
      pos.push(x, y, z);
      ring.push(new THREE.Vector2(x, z));
    }
    ringPts.push(ring);
  }
  const idx: number[] = [];
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < n; i++) {
      const a = r * n + i, b = r * n + ((i + 1) % n), c = (r + 1) * n + i, d = (r + 1) * n + ((i + 1) % n);
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  // wind outward: the first quad's normal should agree with the first point's outward normal
  const v = (k: number) => new THREE.Vector3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]);
  const fn = new THREE.Vector3().crossVectors(v(n).sub(v(0)), v(1).sub(v(0)));
  if (fn.x * pts[0].nx + fn.z * pts[0].nz < 0) {
    for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; }
    g.setIndex(idx);
  }
  g.computeVertexNormals();
  return { side: g, ringPts };
}

/** A flat cap through a ring (shape coordinates are x and -z), facing up or down, with holes. */
function cap(ring: THREE.Vector2[], y: number, up: boolean, holes: THREE.Path[] = []) {
  const shape = new THREE.Shape(ring.map((p) => new THREE.Vector2(p.x, up ? -p.y : p.y)));
  for (const h of holes) {
    const pts = h.getPoints(6).map((p) => new THREE.Vector2(p.x, up ? p.y : -p.y));
    shape.holes.push(new THREE.Path(pts));
  }
  const g = new THREE.ShapeGeometry(shape, 1);
  g.rotateX(up ? -Math.PI / 2 : Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

/** A rounded rectangle path in shape coordinates (x, -z): centre (x, z), size w x d. */
function roundRectPath(x: number, z: number, w: number, d: number, r: number, path: THREE.Path = new THREE.Path()) {
  const x0 = x - w / 2, x1 = x + w / 2, y0 = -z - d / 2, y1 = -z + d / 2;
  path.moveTo(x0 + r, y0);
  path.lineTo(x1 - r, y0); path.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  path.lineTo(x1, y1 - r); path.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  path.lineTo(x0 + r, y1); path.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  path.lineTo(x0, y0 + r); path.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  return path;
}

/** A flat rounded rectangle (separate corner radii top/bottom, in its own x/y), facing +z. */
function plate(w: number, h: number, rTop: number, rBottom = rTop) {
  const s = new THREE.Shape(), x = w / 2, y = h / 2;
  s.moveTo(-x + rBottom, -y);
  s.lineTo(x - rBottom, -y); s.absarc(x - rBottom, -y + rBottom, rBottom, -Math.PI / 2, 0, false);
  s.lineTo(x, y - rTop); s.absarc(x - rTop, y - rTop, rTop, 0, Math.PI / 2, false);
  s.lineTo(-x + rTop, y); s.absarc(-x + rTop, y - rTop, rTop, Math.PI / 2, Math.PI, false);
  s.lineTo(-x, -y + rBottom); s.absarc(-x + rBottom, -y + rBottom, rBottom, Math.PI, Math.PI * 1.5, false);
  const g = new THREE.ShapeGeometry(s, 8);
  // UVs across the plate, 0..1
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + x) / w, (pos.getY(i) + y) / h);
  return g;
}

/** Position and normal only, unindexed: what mergeGeometries needs from every part. */
function flat(g: THREE.BufferGeometry) {
  const out = g.index ? g.toNonIndexed() : g;
  for (const name of Object.keys(out.attributes)) if (name !== 'position' && name !== 'normal') out.deleteAttribute(name);
  if (out !== g) g.dispose();
  return out;
}

/** Interpolate the profile's inset at a height. */
function insetAt(profile: readonly (readonly [number, number])[], y: number) {
  for (let i = 0; i < profile.length - 1; i++) {
    const [i0, y0] = profile[i], [i1, y1] = profile[i + 1];
    if (y <= y0 && y >= y1) return y0 === y1 ? i0 : i0 + ((i1 - i0) * (y0 - y)) / (y0 - y1);
  }
  return profile[profile.length - 1][0];
}

/** Quarter-round edges for a slab t thick: [inset, y] from the top face down. */
function slabProfile(t: number, rTop: number, rBottom: number, steps = 5): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) { const a = (i / steps) * (Math.PI / 2); out.push([rTop - Math.sin(a) * rTop, t - rTop + Math.cos(a) * rTop]); }
  for (let i = 0; i <= steps; i++) { const a = (i / steps) * (Math.PI / 2); out.push([rBottom - Math.cos(a) * rBottom, rBottom - Math.sin(a) * rBottom]); }
  return out;
}

/* ---------- Textures ---------- */

function canvasTex(w: number, h: number, draw: (x: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const SHIFTED: Record<string, string> = {
  '`': '~', '1': '!', '2': '@', '3': '#', '4': '$', '5': '%', '6': '^', '7': '&', '8': '*', '9': '(', '0': ')', '-': '_', '=': '+',
  '[': '{', ']': '}', '\\': '|', ';': ':', "'": '"', ',': '<', '.': '>', '/': '?',
};
// the modifier symbols' widths in mm, and the scale that draws them at it
const SYMBOL: Record<string, [number, number]> = { control: [3.3, 2.2], option: [4.0, 1.54], command: [3.65, 1.45] };
const MODS: Record<string, [string, string]> = { left: ['', '◀'], right: ['', '▶'], up: ['', '▲'], down: ['', '▼'] }; // the arrows

/**
 * The function row's icons (brightness, Mission Control, search, dictation, focus, media, volume),
 * drawn as strokes in a 2 mm box around (cx, cy); `u` is pixels per mm.
 */
function fnIcon(x: CanvasRenderingContext2D, n: number, cx: number, cy: number, u: number) {
  x.save();
  x.translate(cx, cy); x.scale(u, u); x.lineWidth = 0.18; x.lineCap = 'round'; x.lineJoin = 'round';
  const line = (pts: number[]) => { x.beginPath(); x.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]); x.stroke(); };
  const tri = (pts: number[]) => { x.beginPath(); x.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]); x.closePath(); x.stroke(); };
  const speaker = () => tri([-1.1, -0.35, -0.6, -0.35, 0, -0.9, 0, 0.9, -0.6, 0.35, -1.1, 0.35]);
  switch (n) {
    case 1: case 2: {
      const r = n === 1 ? 0.45 : 0.55, ray = n === 1 ? 0.95 : 1.15;
      x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke();
      for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; line([Math.cos(a) * (r + 0.25), Math.sin(a) * (r + 0.25), Math.cos(a) * ray, Math.sin(a) * ray]); }
      break;
    }
    case 3: x.strokeRect(-1.25, -0.7, 0.95, 0.6); x.strokeRect(-1.25, 0.1, 0.95, 0.6); x.strokeRect(-0.1, -0.7, 1.35, 1.4); break;
    case 4: x.beginPath(); x.arc(-0.2, -0.2, 0.65, 0, 7); x.stroke(); line([0.25, 0.25, 0.9, 0.9]); break;
    case 5: x.beginPath(); x.roundRect(-0.32, -1, 0.64, 1.2, 0.32); x.stroke(); x.beginPath(); x.arc(0, -0.1, 0.65, 0.15, Math.PI - 0.15); x.stroke(); line([0, 0.55, 0, 0.95]); break;
    case 6: x.rotate(-Math.PI / 4); x.beginPath(); x.arc(0, 0, 0.85, 0.6, Math.PI * 2 - 0.6, false); x.arc(0.55, 0, 0.75, Math.PI * 2 - 1.2, 1.2, true); x.closePath(); x.stroke(); break;
    case 7: tri([0, -0.6, -0.9, 0, 0, 0.6]); tri([0.9, -0.6, 0, 0, 0.9, 0.6]); break;
    case 8: tri([-1, -0.6, -0.1, 0, -1, 0.6]); line([0.35, -0.6, 0.35, 0.6]); line([0.85, -0.6, 0.85, 0.6]); break;
    case 9: tri([-0.9, -0.6, 0, 0, -0.9, 0.6]); tri([0, -0.6, 0.9, 0, 0, 0.6]); break;
    case 10: speaker(); line([-1.3, -1.05, 1.0, 1.05]); break;
    case 11: speaker(); x.beginPath(); x.arc(0.1, 0, 0.5, -0.8, 0.8); x.stroke(); break;
    case 12: speaker(); for (const r of [0.5, 0.85, 1.2]) { x.beginPath(); x.arc(0.1, 0, r, -0.8, 0.8); x.stroke(); } break;
  }
  x.restore();
}

/**
 * The keyboard's symbols, drawn as strokes (system fonts draw them at odd sizes, or not at all), in a
 * box about 3.5 mm tall around (cx, cy); `u` is pixels per mm.
 */
function glyph(x: CanvasRenderingContext2D, name: string, cx: number, cy: number, u: number, size = 1) {
  x.save();
  x.translate(cx, cy); x.scale(u * size, u * size); x.lineWidth = 0.26 / size; x.lineCap = 'round'; x.lineJoin = 'round';
  const path = (pts: number[], close = false) => { x.beginPath(); x.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]); if (close) x.closePath(); x.stroke(); };
  const arrowUp = () => path([0, -1.5, 1.45, 0, 0.65, 0, 0.65, 1.2, -0.65, 1.2, -0.65, 0, -1.45, 0], true);
  switch (name) {
    case 'shift': arrowUp(); break;
    case 'caps': x.translate(0, -0.3); arrowUp(); path([-0.65, 1.75, 0.65, 1.75, 0.65, 2.15, -0.65, 2.15], true); break;
    case 'tab': path([-1.5, 0, 1.2, 0]); path([0.55, -0.65, 1.2, 0, 0.55, 0.65]); path([1.6, -0.8, 1.6, 0.8]); break;
    case 'return': path([1.4, -1.2, 1.4, 0.35, -1.4, 0.35]); path([-0.75, -0.3, -1.4, 0.35, -0.75, 1.0]); break;
    case 'delete': path([-1.8, 0, -0.9, -1.0, 1.6, -1.0, 1.6, 1.0, -0.9, 1.0], true); path([-0.25, -0.45, 0.75, 0.45]); path([-0.25, 0.45, 0.75, -0.45]); break;
    case 'command': {
      const s = 0.55, r = 0.42;
      path([-s, -s, s, -s, s, s, -s, s], true);
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { x.beginPath(); x.arc(sx * (s + r * 0.7), sy * (s + r * 0.7), r, 0, 7); x.stroke(); }
      break;
    }
    case 'option': path([-1.3, -1.15, -0.5, -1.15, 0.5, 1.15, 1.3, 1.15]); path([0.4, -1.15, 1.3, -1.15]); break;
    case 'control': path([-0.75, 0.35, 0, -0.45, 0.75, 0.35]); break;
    case 'globe': x.beginPath(); x.arc(0, 0, 1.1, 0, 7); x.stroke(); x.beginPath(); x.ellipse(0, 0, 0.45, 1.1, 0, 0, 7); x.stroke(); path([-1.1, 0, 1.1, 0]); break;
    case 'dot': x.beginPath(); x.arc(0, 0, 0.3, 0, 7); x.fill(); break;
  }
  x.restore();
}

/** Every key's legend on one transparent sheet the size of the keyboard well, 10 px per mm. */
function legendTexture() {
  const W = MBP.deck.well, PX = 10;
  const w = W.x * 2, d = W.z1 - W.z0;
  return canvasTex(Math.round(w * PX), Math.round(d * PX), (x) => {
    const X = (mm: number) => (mm + W.x) * PX, Z = (mm: number) => (mm - W.z0) * PX;
    const ink = '#dfe0e5';
    x.fillStyle = ink; x.strokeStyle = ink; x.textBaseline = 'middle';
    const font = (mm: number, weight = 400) => { x.font = `${weight} ${mm * PX}px -apple-system, "SF Pro Text", "Helvetica Neue", "Segoe UI", Arial, sans-serif`; };
    const word = (t: string, at: number, y: number, align: CanvasTextAlign) => { font(3.4, 500); x.textAlign = align; x.fillText(t, at, y); };
    for (const row of MBP.keys) {
      const [z0, z1] = row.z;
      for (const [label, x0, x1] of row.keys) {
        const cx = X((x0 + x1) / 2), cz = Z((z0 + z1) / 2), kw = (x1 - x0) * PX, kh = (z1 - z0) * PX;
        const left = cx - kw / 2 + 2.2 * PX, right = cx + kw / 2 - 2.2 * PX, top = cz - kh / 2 + 4.4 * PX, bottom = cz + kh / 2 - 3.3 * PX;
        x.textAlign = 'center';
        if (/^[A-Z]$/.test(label)) {
          font(4.6); x.fillText(label, cx, cz + 0.2 * PX);
          if (label === 'F' || label === 'J') x.fillRect(cx - 0.9 * PX, cz + 3.5 * PX, 1.8 * PX, 0.32 * PX); // homing bars
        }
        else if (SHIFTED[label]) { font(3.9); x.fillText(SHIFTED[label], cx, cz - 3.3 * PX); font(4.4); x.fillText(label, cx, cz + 2.8 * PX); }
        else if (/^F\d+$/.test(label)) { font(2.1, 500); x.fillText(label, cx, cz + 4.6 * PX); fnIcon(x, +label.slice(1), cx, cz - 2.2 * PX, PX * 1.7); }
        else if (label === 'touchid') { x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.arc(cx, cz, 4.7 * PX, 0, 7); x.fill(); x.fillStyle = ink; } // the sensor: a darker disc
        else if (label === 'esc') { font(3.8, 600); x.textAlign = 'left'; x.fillText('esc', left, bottom); }
        else if (label === 'fn') { glyph(x, 'globe', cx - kw / 2 + 4.45 * PX, bottom, PX, 1.95); font(3.4, 500); x.textAlign = 'right'; x.fillText('fn', cx + kw / 2 - 2.5 * PX, bottom); }
        else if (label === 'tab' || label === 'caps' || label === 'shift') { glyph(x, label, left + 1.6 * PX, bottom, PX); if (label === 'caps') glyph(x, 'dot', left + 0.4 * PX, top, PX); }
        else if (label === 'rshift') glyph(x, 'shift', right - 1.6 * PX, bottom, PX);
        else if (label === 'delete' || label === 'return') glyph(x, label, right - 1.9 * PX, bottom, PX);
        else if (label === 'control' || label === 'option' || label === 'command' || label === 'roption' || label === 'rcommand') {
          // the symbol sits top-left on the left-hand keys, top-right on the right-hand ones; the word is centred
          const name = label.replace(/^r/, ''), onRight = label.startsWith('r');
          const [w, size] = SYMBOL[name];
          glyph(x, name, onRight ? cx + kw / 2 - (2.5 + w / 2) * PX : cx - kw / 2 + (2.7 + w / 2) * PX, top, PX, size);
          word(name, cx, bottom, 'center');
        }
        else if (MODS[label]) { font(2.4); x.fillText(MODS[label][1], cx, cz); } // the arrows
      }
    }
  });
}

/** Speaker grille: a fine hexagonal field of holes, as a transparent sheet. */
function grilleTexture() {
  const G = MBP.deck.grille, PX = 12;
  const w = G.x1 - G.x0, d = G.z1 - G.z0;
  return canvasTex(Math.round(w * PX), Math.round(d * PX), (x) => {
    x.fillStyle = '#030304';
    const p = G.pitch * PX, r = (G.hole / 2) * PX;
    for (let j = 0, yy = p / 2; yy < d * PX - p / 3; j++, yy += p * 0.866) {
      for (let xx = p / 2 + (j % 2 ? p / 2 : 0); xx < w * PX - p / 3; xx += p) { x.beginPath(); x.arc(xx, yy, r, 0, 7); x.fill(); }
    }
  });
}

/** The logo on the back of the lid, as a mask: white apple on transparent. */
function logoTexture() {
  return canvasTex(256, 300, (x) => {
    x.fillStyle = '#fff';
    x.translate(128, 166);
    // body: two lobes on top, narrowing to a dimpled base, with the bite on the right
    x.beginPath();
    x.moveTo(0, -78);
    x.bezierCurveTo(-30, -96, -112, -92, -112, -12);
    x.bezierCurveTo(-112, 60, -64, 128, -30, 128);
    x.bezierCurveTo(-12, 128, -8, 118, 0, 118);
    x.bezierCurveTo(8, 118, 12, 128, 30, 128);
    x.bezierCurveTo(60, 128, 92, 82, 104, 46);
    x.bezierCurveTo(60, 28, 50, -32, 98, -54); // the bite: about a sixth of the width
    x.bezierCurveTo(80, -84, 44, -96, 0, -78);
    x.closePath();
    x.fill();
    // leaf
    x.beginPath();
    x.moveTo(2, -92);
    x.bezierCurveTo(0, -130, 30, -156, 52, -160);
    x.bezierCurveTo(56, -124, 30, -96, 2, -92);
    x.fill();
  });
}

/* ---------- Build ---------- */

export type MacBookOptions = { /** degrees between the lid and the deck; 0 is closed */ open?: number };

/** The laptop, open at `open` degrees, with `screenMaterial` on the panel (UVs 0..1, upright). */
export function buildMacBook(screenMaterial: THREE.Material, { open = 108 }: MacBookOptions = {}) {
  const B = MBP.base, L = MBP.lid, D = MBP.display, K = MBP.deck;
  const root = new THREE.Group();
  root.name = 'macbook';
  const mm = new THREE.Group();
  mm.scale.setScalar(MM);
  root.add(mm);

  // Space Black: dark, neutral, satin anodised aluminium (anodising scatters, so less mirror than bare
  // metal, or it takes on the room's blue); the keyboard's floor and the keys darker
  const metal = reflective(new THREE.MeshStandardMaterial({ color: '#303134', metalness: 0.45, roughness: 0.5, name: 'MBP_Aluminium' }), 0.55);
  const keyMat = reflective(new THREE.MeshStandardMaterial({ color: '#0d0d0f', metalness: 0.1, roughness: 0.62, name: 'MBP_Key' }), 0.25);
  const well = new THREE.MeshStandardMaterial({ color: '#060607', metalness: 0, roughness: 0.95, name: 'MBP_Well' });
  const glass = reflective(new THREE.MeshStandardMaterial({ color: '#040405', metalness: 0, roughness: 0.18, name: 'MBP_Glass' }), 0.1);
  // the trackpad's glass is finished to match the deck exactly; only the hairline gap round it shows it
  const pad = metal;
  const dark = new THREE.MeshStandardMaterial({ color: '#050506', metalness: 0, roughness: 0.7, name: 'MBP_Port' });
  const rubber = new THREE.MeshStandardMaterial({ color: '#121214', metalness: 0, roughness: 0.85, name: 'MBP_Foot' });
  const pin = new THREE.MeshStandardMaterial({ color: '#8c7a52', metalness: 0.8, roughness: 0.35, name: 'MBP_Pin' });
  const decal = (map: THREE.Texture, color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ map, color, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, ...extra });
  const legends = decal(legendTexture(), '#ffffff', { roughness: 0.7, name: 'MBP_Legends' });
  const grilleMat = decal(grilleTexture(), '#ffffff', { roughness: 0.9, name: 'MBP_Grille' });
  const logoMat = reflective(decal(logoTexture(), '#3c3d41', { metalness: 1, roughness: 0.1, name: 'MBP_Logo' }), 1);
  const ON_TOP = { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 };
  const islandMat = new THREE.MeshBasicMaterial({ color: '#000000', ...ON_TOP, name: 'MBP_Island' });

  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, name?: string) => {
    const o = new THREE.Mesh(g, m);
    if (name) o.name = name;
    parent.add(o);
    return o;
  };

  /* --- Base: underside at y = 0 of its own frame, on the feet --- */
  const base = new THREE.Group();
  base.name = 'base';
  base.position.y = MBP.feet.h;
  mm.add(base);
  const S = B.scoop, Hb = MBP.hinge.bar, Ha = MBP.hinge.arms, barHalf = MBP.hinge.w / 2;
  const breaks = [S.w / 2, barHalf, barHalf + 0.1, Ha.x0 - 0.1, Ha.x0, Ha.x1, Ha.x1 + 0.1].flatMap((b) => [-b, b]);
  const pts = outline(MBP.w, MBP.d, MBP.cornerR, 12, 0.5, (x) => Math.abs(x) < S.w / 2 + 1.5, breaks);
  // the profile, with extra rings through the scoop's depth so the trough is smooth, and either side of
  // the hinge pockets' floors so they come out flat
  const rings: [number, number][] = [...B.profile.map((p) => [p[0], p[1]] as [number, number])];
  const extra: number[] = [];
  for (let y = B.h - 0.25; y > B.h - S.depth - 0.2; y -= 0.2) extra.push(y);
  for (const f of [2 * Hb.r, Ha.drop]) extra.push(B.h - f + 0.02, B.h - f - 0.02);
  for (const y of extra) if (!rings.some((r) => Math.abs(r[1] - y) < 0.01)) rings.push([insetAt(B.profile, y), y]);
  rings.sort((a, b) => b[1] - a[1]);
  const scoopAcross = (x: number) => { const k = Math.abs(x) / (S.w / 2); return k >= 1 ? 0 : Math.pow(1 - Math.pow(k, 12), 0.5); };
  const push = (p: OutlinePt, y: number) => {
    if (p.nx !== 0) return 0;
    if (p.nz === 1) { // the scoop
      const v = (B.h - y) / S.depth;
      return v >= 1 ? 0 : S.reach * Math.sqrt(1 - v * v) * scoopAcross(p.x);
    }
    const ax = Math.abs(p.x); // the back: the hinge bar's pocket, and the arms' notches
    if (ax <= barHalf + 1e-6) return y > B.h - 2 * Hb.r ? 2 * Hb.r : 0;
    if (ax >= Ha.x0 - 1e-6 && ax <= Ha.x1 + 1e-6) return y > B.h - Ha.drop ? Ha.depth : 0;
    return 0;
  };
  const shell = loft(pts, rings, push);
  const top = shell.ringPts[0], bottom = shell.ringPts[shell.ringPts.length - 1];
  const wellW = K.well.x * 2, wellD = K.well.z1 - K.well.z0, wellZ = (K.well.z0 + K.well.z1) / 2;
  const tp = K.trackpad, tpD = tp.z1 - tp.z0, tpZ = (tp.z0 + tp.z1) / 2;
  const holes = [roundRectPath(0, wellZ, wellW, wellD, K.well.r), roundRectPath(0, tpZ, tp.w + 0.7, tpD + 0.7, tp.r + 0.35)];
  const baseGeo = BufferGeometryUtils.mergeGeometries([flat(shell.side), flat(cap(top, B.h, true, holes)), flat(cap(bottom, 0, false))]);
  baseGeo.computeBoundingBox();
  mesh(baseGeo, metal, base, 'shell');

  // the hinge from above: a black bar in the middle of the back edge, and the arms in their notches
  const hingeDark = new THREE.MeshStandardMaterial({ color: '#121214', metalness: 0.5, roughness: 0.45, name: 'MBP_Hinge' });
  mesh(new THREE.CylinderGeometry(Hb.r, Hb.r, MBP.hinge.w, 24).rotateZ(Math.PI / 2).translate(0, B.h - Hb.r, -MBP.d / 2 + Hb.r), hingeDark, base, 'hinge bar');
  const recessBlack = new THREE.MeshStandardMaterial({ color: '#030304', metalness: 0, roughness: 0.9, name: 'MBP_Notch' });
  const armMat = reflective(new THREE.MeshStandardMaterial({ color: '#1d1e20', metalness: 0.45, roughness: 0.5, name: 'MBP_Arm' }), 0.55);
  for (const s of [-1, 1]) {
    const cx = (s * (Ha.x0 + Ha.x1)) / 2;
    mesh(new THREE.BoxGeometry(Ha.x1 - Ha.x0 - 0.04, Ha.drop - 0.4, Ha.depth - 0.02).translate(cx, B.h - Ha.drop / 2 - 0.2, -MBP.d / 2 + Ha.depth / 2), recessBlack, base, 'hinge notch');
    mesh(new THREE.BoxGeometry(Ha.x1 - Ha.x0 - 4, Ha.drop, Ha.depth - 1.4).translate(cx, B.h - Ha.drop / 2 - 0.25, -MBP.d / 2 + (Ha.depth - 1.4) / 2), armMat, base, 'hinge arm');
  }

  // keyboard well: walls, then the floor the keys stand on
  const wellPts = outline(wellW, wellD, K.well.r, 6);
  const wellWalls = loft(wellPts, [[0, B.h], [0, B.h - K.well.depth]]).side;
  wellWalls.index!.array.reverse(); wellWalls.computeVertexNormals(); // they face into the well
  wellWalls.translate(0, 0, wellZ);
  mesh(wellWalls, well, base);
  const wellFloor = new THREE.PlaneGeometry(wellW, wellD).rotateX(-Math.PI / 2).translate(0, B.h - K.well.depth, wellZ);
  mesh(wellFloor, well, base, 'well');

  // keys: rounded caps with a soft top edge, all in one geometry, and their legends on one sheet
  const keyGeos: THREE.BufferGeometry[] = [];
  const keyBoxes: Record<string, THREE.Box3> = {};
  const keyT = K.well.depth - K.keyTop; // from the floor to the key top
  for (const row of MBP.keys) {
    const [z0, z1] = row.z;
    for (const [label, x0, x1] of row.keys) {
      const w = x1 - x0, d = z1 - z0, bev = 0.22;
      const s = new THREE.Shape(), hw = w / 2 - bev, hd = d / 2 - bev, r = Math.min(K.keyR, hw, hd);
      roundRectPath(0, 0, hw * 2, hd * 2, r, s);
      const g = new THREE.ExtrudeGeometry(s, { depth: keyT - bev * 2, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 2, curveSegments: 3 });
      g.rotateX(-Math.PI / 2); // extruded along +y, shape's y becomes -z
      g.translate((x0 + x1) / 2, B.h - K.well.depth + bev, (z0 + z1) / 2);
      g.computeBoundingBox();
      keyBoxes[label] = g.boundingBox!.clone();
      keyGeos.push(flat(g));
    }
  }
  const keysGeo = BufferGeometryUtils.mergeGeometries(keyGeos);
  keyGeos.forEach((g) => g.dispose());
  mesh(keysGeo, keyMat, base, 'keys');
  mesh(new THREE.PlaneGeometry(wellW, wellD).rotateX(-Math.PI / 2).translate(0, B.h - K.keyTop + 0.01, wellZ), legends, base);

  // trackpad: a glass-smooth plate flush with the deck, a hairline gap round it
  const tpGeo = plate(tp.w, tpD, tp.r).rotateX(-Math.PI / 2).translate(0, B.h - 0.04, tpZ);
  tpGeo.computeBoundingBox();
  mesh(tpGeo, pad, base, 'trackpad');
  const gapMat = reflective(new THREE.MeshStandardMaterial({ color: '#55565a', metalness: 0.45, roughness: 0.5, name: 'MBP_TrackpadEdge' }), 0.55);
  mesh(plate(tp.w + 8, tpD + 8, tp.r + 4).rotateX(-Math.PI / 2).translate(0, B.h - 0.6, tpZ), gapMat, base);

  // speaker grilles either side of the keyboard
  const G = K.grille;
  for (const s of [-1, 1]) {
    mesh(new THREE.PlaneGeometry(G.x1 - G.x0, G.z1 - G.z0).rotateX(-Math.PI / 2).translate(s * (G.x0 + G.x1) / 2, B.h + 0.01, (G.z0 + G.z1) / 2), grilleMat, base);
  }

  // ports on the straight part of each side: HDMI's lower corners chamfered, a tongue in each Thunderbolt
  // port, MagSafe's grey recess with its five pins in a dark pill
  const portMeshes: Record<string, THREE.Mesh> = {};
  const recess = new THREE.MeshStandardMaterial({ color: '#2a2a2d', metalness: 0.4, roughness: 0.5, name: 'MBP_Recess' });
  const hdmi = (w: number, h: number) => {
    const s = new THREE.Shape(), x = w / 2, y = h / 2, c = h * 0.42;
    s.moveTo(-x, y); s.lineTo(x, y); s.lineTo(x, -y + c); s.lineTo(x - c, -y); s.lineTo(-x + c, -y); s.lineTo(-x, -y + c); s.closePath();
    return new THREE.ShapeGeometry(s);
  };
  for (const [side, list] of [[-1, MBP.ports.left], [1, MBP.ports.right]] as const) {
    const onSide = (g: THREE.BufferGeometry, out: number, at: number, y = MBP.ports.y) => g.rotateY((side * Math.PI) / 2).translate(side * (MBP.w / 2 + out), y, -MBP.d / 2 + at);
    for (const p of list) {
      const shape = p.name === 'HDMI' ? hdmi(p.w, p.h) : plate(p.w, p.h, p.r);
      const m = mesh(onSide(shape, 0.03, p.at), p.name === 'MagSafe 3' ? recess : dark, base, p.name);
      if (!portMeshes[`${p.name}:${side}`]) portMeshes[`${p.name}:${side}`] = m;
      if (p.name === 'MagSafe 3') {
        mesh(onSide(plate(11, 1.5, 0.75), 0.05, p.at), dark, base);
        for (let i = -2; i <= 2; i++) mesh(onSide(new THREE.CircleGeometry(0.42, 10), 0.07, p.at + i * 1.75), pin, base);
      }
      if (p.name === 'Thunderbolt') mesh(onSide(plate(6.2, 0.6, 0.3), 0.05, p.at), recess, base);
    }
  }

  // intake slots low on each side, following the tuck
  const I = B.intake;
  for (const side of [-1, 1]) {
    const y0 = I.y - I.h / 2, y1 = I.y + I.h / 2, z0 = -MBP.d / 2 + I.fromBack, z1 = MBP.d / 2 - I.toFront;
    const xo = (y: number) => side * (MBP.w / 2 - insetAt(B.profile, y) + 0.03);
    const g = new THREE.BufferGeometry();
    const v = [xo(y0), y0, z0, xo(y1), y1, z0, xo(y0), y0, z1, xo(y1), y1, z1];
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.setIndex(side > 0 ? [0, 1, 2, 2, 1, 3] : [0, 2, 1, 2, 3, 1]);
    g.computeVertexNormals();
    mesh(g, dark, base);
  }

  // feet: four round rubber feet under the flat of the base
  const F = MBP.feet;
  const footGeo = new THREE.CylinderGeometry(F.d / 2, F.d / 2 - 0.5, F.h, 32);
  footGeo.computeBoundingBox();
  for (const x of [-F.x, F.x]) for (const z of [-MBP.d / 2 + F.fromBack, MBP.d / 2 - F.fromFront]) {
    const f = mesh(footGeo, rubber, mm, 'foot');
    f.position.set(x, F.h / 2, z);
  }

  /* --- Lid: a slab that turns on a barrel at the back; local y = 0 is its inner (screen) face --- */
  const H = MBP.hinge;
  const hinge = new THREE.Group();
  hinge.name = 'hinge';
  const axisZ = -MBP.d / 2 + H.axisIn;
  hinge.position.set(0, B.h - H.axisDrop, axisZ);
  base.add(hinge);
  const lid = new THREE.Group();
  lid.name = 'lid';
  lid.position.set(0, H.axisDrop, -axisZ); // closed, the lid lies on the deck over the full footprint
  hinge.add(lid);
  const lidPts = outline(MBP.w, MBP.d, MBP.cornerR, 12);
  const lidShell = loft(lidPts, slabProfile(L.t, L.outerR, L.innerR));
  const lidGeo = BufferGeometryUtils.mergeGeometries([
    flat(lidShell.side),
    flat(cap(lidShell.ringPts[0], L.t, true)),
    flat(cap(lidShell.ringPts[lidShell.ringPts.length - 1], 0, false)),
  ]);
  lidGeo.computeBoundingBox();
  mesh(lidGeo, metal, lid, 'lid shell');

  // the front, as it faces you with the lid open: black glass edge to edge inside a thin rim, the
  // panel, and the Dynamic Island. Lid-local +z runs from the hinge to the top edge.
  const face = (g: THREE.BufferGeometry, depth: number) => g.rotateX(Math.PI / 2).translate(0, -depth, 0); // facing -y (the inner side)
  const glassGeo = face(plate(MBP.w - 2 * L.rim, MBP.d - 2 * L.rim, MBP.cornerR - L.rim), 0.06);
  mesh(glassGeo, glass, lid, 'glass');
  const panelTopZ = MBP.d / 2 - D.bezel; // the lid's top edge is at +d/2 in lid-local z
  // turned to face the inner side, the plate's top (+y, v = 1) runs to the lid's top edge: upright from the front
  const panelGeo = face(plate(D.w, D.h, D.topR, D.bottomR), 0.1).translate(0, 0, panelTopZ - D.h / 2);
  panelGeo.computeBoundingBox();
  const screen = mesh(panelGeo, screenMaterial, lid, 'panel');
  const islandGeo = face(plate(D.island.w, D.island.h, D.island.h / 2), 0.14).translate(0, 0, panelTopZ - D.island.top - D.island.h / 2);
  islandGeo.computeBoundingBox();
  mesh(islandGeo, islandMat, lid, 'island');

  // the logo on the back, upright to someone behind the open lid: 37.8 x 46.0 mm (leaf to base), centred
  // 3.75 mm toward the lid's top edge. The drawing fills 216 x 288 of the texture's 256 x 300, a little
  // left of centre (turned over, that is +x).
  const logo = MBP.lid.logo;
  const logoW = (logo.w * 256) / 216, logoH = (logo.h * 300) / 288;
  mesh(new THREE.PlaneGeometry(logoW, logoH).rotateX(-Math.PI / 2).rotateY(Math.PI).translate((-4 / 256) * logoW, L.t + 0.02, logo.z), logoMat, lid);

  // the hinge cover: the lid's lower edge across the middle, a dark rounded bar (closed, inside the lid's thickness)
  const cover = new THREE.CylinderGeometry(H.cover, H.cover, H.w, 32).rotateZ(Math.PI / 2).translate(0, L.t / 2, -MBP.d / 2 + H.cover - 0.05);
  mesh(cover, hingeDark, lid, 'hinge cover');

  hinge.rotation.x = -THREE.MathUtils.degToRad(open);

  /** How much of the lid's face shows above the deck under the panel, seen square on, opened to `deg`. */
  function chinAbove(deg: number) {
    const keep = hinge.rotation.x;
    hinge.rotation.x = -THREE.MathUtils.degToRad(deg);
    base.updateMatrixWorld(true);
    const toBase = new THREE.Matrix4().copy(base.matrixWorld).invert().multiply(lid.matrixWorld);
    const panelBottom = new THREE.Vector3(0, 0, panelBox.min.z).applyMatrix4(toBase);
    const lidEdge = new THREE.Vector3(0, 0, -MBP.d / 2).applyMatrix4(toBase);
    hinge.rotation.x = keep;
    base.updateMatrixWorld(true);
    const k = (panelBottom.y - B.h) / (panelBottom.y - lidEdge.y); // the share of the chin above the deck
    return k * (panelBox.min.z + MBP.d / 2);
  }

  /* --- Measured off the built parts, for the lab's checks --- */
  const bb = (g: THREE.BufferGeometry) => { if (!g.boundingBox) g.computeBoundingBox(); return g.boundingBox!; };
  const shellBox = bb(baseGeo), lidBox = bb(lidGeo), wellBox = bb(wellFloor), tpBox = bb(tpGeo), panelBox = bb(panelGeo), islandBox = bb(islandGeo);
  const bottomXs = bottom.map((p) => p.x);
  // the scoop runs between the last uncut vertices either side of the cut ones, along the deck's front edge
  const cut = top.map((p, i) => pts[i].nz === 1 && pts[i].nx === 0 && p.y < MBP.d / 2 - 0.35 - 0.01);
  const firstCut = cut.indexOf(true), lastCut = cut.lastIndexOf(true);
  const frontTop = firstCut > 0 ? [top[firstCut - 1], top[lastCut + 1]] : [];
  const portAt = (key: string) => { const g = portMeshes[key].geometry; const b = bb(g); return (b.min.z + b.max.z) / 2 + MBP.d / 2; };
  const portY = (key: string) => { const b = bb(portMeshes[key].geometry); return (b.min.y + b.max.y) / 2 + MBP.feet.h; };
  const measured: Record<string, number> = {
    width: Math.max(shellBox.max.x - shellBox.min.x, lidBox.max.x - lidBox.min.x),
    depth: Math.max(shellBox.max.z - shellBox.min.z, lidBox.max.z - lidBox.min.z),
    'closed height': shellBox.max.y - shellBox.min.y + (lidBox.max.y - lidBox.min.y),
    'base height': shellBox.max.y - shellBox.min.y,
    'lid thickness': lidBox.max.y - lidBox.min.y,
    'feet height': bb(footGeo).max.y - bb(footGeo).min.y,
    'underside inset': (MBP.w - (Math.max(...bottomXs) - Math.min(...bottomXs))) / 2,
    'keyboard well width': wellBox.max.x - wellBox.min.x,
    'keyboard well depth': wellBox.max.z - wellBox.min.z,
    'key pitch across': keyBoxes.F2.min.x - keyBoxes.F1.min.x,
    'key pitch front to back': keyBoxes.Q.min.z - keyBoxes['1'].min.z,
    'letter key width': keyBoxes.Q.max.x - keyBoxes.Q.min.x,
    'space bar width': keyBoxes.space.max.x - keyBoxes.space.min.x,
    'trackpad width': tpBox.max.x - tpBox.min.x,
    'trackpad depth': tpBox.max.z - tpBox.min.z,
    'trackpad front from edge': MBP.d / 2 - tpBox.max.z,
    'panel width': panelBox.max.x - panelBox.min.x,
    'panel height': panelBox.max.z - panelBox.min.z,
    'side bezel': (lidBox.max.x - panelBox.max.x),
    'Dynamic Island width': islandBox.max.x - islandBox.min.x,
    'scoop width': frontTop.length ? Math.max(...frontTop.map((p) => p.x)) - Math.min(...frontTop.map((p) => p.x)) : 0,
    'MagSafe from back': portAt('MagSafe 3:-1'),
    'HDMI from back': portAt('HDMI:1'),
    'SDXC from back': portAt('SDXC:1'),
    'port centre height': portY('HDMI:1'),
    'chin above the deck at 108°': chinAbove(108),
  };

  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { root, screen, measured, setOpen: (deg: number) => { hinge.rotation.x = -THREE.MathUtils.degToRad(deg); } };
}
