// MacBook Pro 14-inch in space black, open. loadMacBook() brings in DPM's model (CC BY 4.0; the credit
// lives in data/content.ts and shows in the footer) and gives it the scene's screen; buildMacBook() is
// the built-in fallback, used if the file can't be fetched in time. Front (the trackpad side) faces +z.
// Units: 1 = 160 mm.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { modelCredits } from '@/data/content';
import { add, canvasTexture, rbox, reflective, std } from './kit';

export const MACBOOK = { screenW: 1.82, screenH: 1.18 };

const MODEL_URL = modelCredits.find((c) => c.what === 'MacBook')!.file;
const PER_METRE = 1 / 0.16; // the file is in metres

// how much of the night room each finish reflects (see night-env.ts)
const SHINE: Record<string, number> = {
  MBP_Aluminium: 0.8, MBP_AluDark: 0.6, MBP_Glass: 1, MBP_Trackpad: 0.6, MBP_Logo: 1, MBP_Grille: 0.4, MBP_Keycap: 0.25, MBP_CamLens: 1,
};
// The file is Space Gray; this one is Space Black: one dark, neutral, satin anodised finish on the deck,
// sides and lid, with the hinge and the speaker grilles a shade darker and a polished logo.
const FINISH: Record<string, { color: string; metalness?: number; roughness?: number; plain?: boolean }> = {
  MBP_Aluminium: { color: '#303032', metalness: 0.6, roughness: 0.48 },
  MBP_Well: { color: '#040405', metalness: 0, roughness: 0.95 }, // the keyboard's floor: darker than the keys
  MBP_AluDark: { color: '#18181a', metalness: 0.6, roughness: 0.5 },
  MBP_Grille: { color: '#2f2f31', metalness: 0.3, roughness: 0.78, plain: true },
  MBP_Logo: { color: '#8c8d91', metalness: 1, roughness: 0.14 },
};
// nodes to leave out: the fake desktop UI, "MacBook Pro" on the bezel (the 14-inch has it underneath),
// the port fills, which sit in openings in the wrong places, and the 1 mm feet (both are redrawn below)
const DROP = ['UI_', 'MBP_ChinText', 'PortFill_', 'MBP_Foot'];

// The file's deck is a little off: a half-height function row, and the keyboard and trackpad sitting
// 6.5 mm too far back (the trackpad ends 13.5 mm from the front edge; the real one about 7 mm). Grow
// the function row to full height and slide everything in front of it forward; the space in front of
// the trackpad takes up the difference. Model metres, front edge at +z.
const ROW_GROW = 0.0065;
const FN_ROW = [-0.0915, -0.082] as const; // the function row's keys, back to front
const FN_MID = (FN_ROW[0] + FN_ROW[1]) / 2;
const PAD_FRONT = 0.0975, FRONT_EDGE = 0.1105;
const deckZ = (z: number) =>
  z < FN_MID ? z : z <= PAD_FRONT ? z + ROW_GROW : z < FRONT_EDGE ? z + (ROW_GROW * (FRONT_EDGE - z)) / (FRONT_EDGE - PAD_FRONT) : z;
// parts that move with the deck; the base itself only inside its outline (its rim, corners and sides stay put)
const DECK = ['MBP_Keycaps', 'MBP_WellFloor', 'MBP_Trackpad', 'MBP_Grille_', 'MBP_Base'];

// Ports, measured from photos of the real one: centre in mm from the back edge, opening width x height
// and corner radius in mm. Left, back to front: MagSafe 3, two Thunderbolt, headphone jack; right:
// HDMI, Thunderbolt, SDXC. The sides are flat at |x| = 156.3 mm from 0.75 to 10.35 mm up.
const BACK_EDGE = -0.111, SIDE_X = 0.1563, PORT_Y = 0.00555;
const PORTS: { side: -1 | 1; at: number; w: number; h: number; r: number }[] = [
  { side: -1, at: 29, w: 15.5, h: 3.4, r: 1.7 },
  { side: -1, at: 49, w: 8.4, h: 2.6, r: 1.3 },
  { side: -1, at: 66, w: 8.4, h: 2.6, r: 1.3 },
  { side: -1, at: 79, w: 3.5, h: 3.5, r: 1.75 },
  { side: 1, at: 29, w: 14, h: 4.5, r: 0.7 },
  { side: 1, at: 50, w: 8.4, h: 2.6, r: 1.3 },
  { side: 1, at: 77, w: 24, h: 2.2, r: 0.6 },
];

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape(), x = w / 2, y = h / 2;
  s.moveTo(-x + r, -y);
  s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r);
  s.lineTo(x, y - r); s.quadraticCurveTo(x, y, x - r, y);
  s.lineTo(-x + r, y); s.quadraticCurveTo(-x, y, -x, y - r);
  s.lineTo(-x, -y + r); s.quadraticCurveTo(-x, -y, -x + r, -y);
  return s;
}

/** Covers each side's straight run (hiding the file's openings) and draws the ports where they really are. */
function redrawPorts(model: THREE.Object3D, metal: THREE.Material) {
  const dark = new THREE.MeshStandardMaterial({ color: '#050506', roughness: 0.7, metalness: 0 });
  for (const side of [-1, 1] as const) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.203, 0.0095), metal);
    panel.rotation.y = (side * Math.PI) / 2;
    panel.position.set(side * (SIDE_X + 0.0001), PORT_Y, 0);
    model.add(panel);
  }
  for (const p of PORTS) {
    const port = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(p.w / 1000, p.h / 1000, p.r / 1000), 6), dark);
    port.rotation.y = (p.side * Math.PI) / 2;
    port.position.set(p.side * (SIDE_X + 0.00015), PORT_Y, BACK_EDGE + p.at / 1000);
    model.add(port);
  }
}

// The front edge (flat at z = 110.6 mm, top at y = 11.1 mm) and the real one's details on it
const FRONT_Z = 0.1106, TOP_Y = 0.0111;
const FOOT = { r: 0.0075, h: 0.0018, x: 0.121, z: 0.086 };

/**
 * The thumb scoop, 54 mm wide in the middle of the front edge: the file has no vertices there to cut,
 * so two thin strips lie on the top and the front of the edge with their normals tipped 45 degrees up
 * and forward. They light like a recess: brighter than the front face, darker than the top.
 * And four round rubber feet, 2 mm tall, that the laptop stands on.
 */
function addScoopAndFeet(model: THREE.Object3D, metal: THREE.Material) {
  const W = 0.054, D = 0.0026, R = 0.0012;
  const tipped = (g: THREE.BufferGeometry) => {
    const n = g.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, Math.SQRT1_2, Math.SQRT1_2);
    return g;
  };
  const front = new THREE.Mesh(tipped(new THREE.ShapeGeometry(roundedRect(W, D, R), 6)), metal);
  front.position.set(0, TOP_Y - D / 2, FRONT_Z + 0.0001);
  const top = new THREE.Mesh(tipped(new THREE.ShapeGeometry(roundedRect(W, D, R), 6).rotateX(-Math.PI / 2)), metal);
  top.position.set(0, TOP_Y + 0.0001, FRONT_Z - D / 2);
  model.add(front, top);

  const rubber = new THREE.MeshStandardMaterial({ color: '#121214', roughness: 0.85, metalness: 0 });
  const foot = new THREE.CylinderGeometry(FOOT.r, FOOT.r * 0.94, FOOT.h, 28);
  for (const x of [-FOOT.x, FOOT.x]) for (const z of [-FOOT.z, FOOT.z]) {
    const m = new THREE.Mesh(foot, rubber);
    m.position.set(x, -FOOT.h / 2, z);
    model.add(m);
  }
}

/** Moves the deck's vertices (in model space) so the layout matches the real keyboard and trackpad. */
function fixDeck(model: THREE.Object3D) {
  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    const node = mesh.parent;
    if (!mesh.isMesh || !node) return;
    const legends = node.name.startsWith('MBP_Legends');
    if (!legends && !DECK.some((d) => node.name.startsWith(d))) return;
    const base = node.name.startsWith('MBP_Base');
    const dz = node.position.z; // only the legends' node is offset (by 0.8 mm)
    const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i) + dz;
      if (base && (Math.abs(x) > 0.14 || pos.getY(i) < 0.0085)) continue;
      // function-row legends ride in the middle of their taller keys; everything else follows the deck
      const nz = legends && z >= FN_ROW[0] && z <= FN_ROW[1] ? z + ROW_GROW / 2 : deckZ(z);
      pos.setZ(i, nz - dz);
    }
    pos.needsUpdate = true;
    mesh.geometry.computeBoundingBox();
    mesh.geometry.computeBoundingSphere();
  });
}

/**
 * Fetches the model and fits it to the scene: metres to scene units, the deck and ports corrected,
 * Space Black, the file's own screen (a fake dock, icons and menu bar) swapped for `screenMaterial`,
 * and the notch kept in front of the screen. `onProgress` gets bytes loaded and the total (0 if the
 * server sends no length), for the boot log.
 */
export async function loadMacBook(screenMaterial: THREE.Material, onProgress?: (loaded: number, total: number) => void) {
  const gltf = await new GLTFLoader().loadAsync(MODEL_URL, (e) => onProgress?.(e.loaded, e.lengthComputable ? e.total : 0));
  const model = gltf.scene;
  model.scale.setScalar(PER_METRE);

  const drop: THREE.Object3D[] = [];
  model.traverse((o) => { if (DROP.some((d) => o.name.startsWith(d))) drop.push(o); });
  drop.forEach((o) => o.removeFromParent());
  fixDeck(model);

  let screen: THREE.Mesh | null = null;
  // the notch's faces point into the lid, so it is drawn from both sides
  const notchMat = new THREE.MeshBasicMaterial({ color: '#050506', side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const finished = new Set<THREE.Material>();
  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (mat.name === 'MBP_Display') {
      // UVs from the panel's own outline, so any texture reads upright: +x is right, +z (lid-local) is up
      const g = mesh.geometry;
      g.computeBoundingBox();
      const { min, max } = g.boundingBox!;
      const pos = g.attributes.position;
      const uv = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        uv[i * 2] = (pos.getX(i) - min.x) / (max.x - min.x);
        uv[i * 2 + 1] = (pos.getZ(i) - min.z) / (max.z - min.z);
      }
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      mesh.material = screenMaterial;
      screen = mesh;
    } else if (mesh.parent?.name.startsWith('MBP_Notch')) {
      mesh.material = notchMat;
      mesh.parent.scale.x = 1.12; // the file's notch is about a tenth too narrow
    } else if (!finished.has(mat)) {
      finished.add(mat);
      const f = FINISH[mat.name];
      if (f) {
        mat.color.set(f.color);
        if (f.metalness !== undefined) mat.metalness = f.metalness;
        if (f.roughness !== undefined) mat.roughness = f.roughness;
        if (f.plain) mat.map = null;
      }
      if (SHINE[mat.name]) reflective(mat, SHINE[mat.name]);
    }
  });
  if (!screen) throw new Error('MacBook model has no display mesh');
  const metal = [...finished].find((m) => m.name === 'MBP_Aluminium');
  if (metal) {
    redrawPorts(model, metal);
    addScoopAndFeet(model, metal);
  }
  model.position.y = FOOT.h * PER_METRE; // stand on the feet

  const root = new THREE.Group();
  root.name = 'macbook';
  root.add(model);
  return { root, screen: screen as THREE.Mesh };
}

/** The built-in stand-in: a box body, a painted deck and a lid on a hinge. */
export function buildMacBook(screenMaterial: THREE.Material) {
  const g = new THREE.Group();
  g.name = 'macbook';
  const body = std('#2e2f34', 0.38, 0.45);

  rbox(g, 1.95, 0.095, 1.38, 0.03, body, [0, 0.0475, 0]);
  const deck = canvasTexture(512, 362, (x) => {
    x.fillStyle = '#2e2f34'; x.fillRect(0, 0, 512, 362);
    x.fillStyle = '#121214';
    const kw = 30, gap = 3.2, left = 36;
    let y = 34;
    for (let r = 0; r < 6; r++) {
      const h = r === 0 ? kw * 0.55 : kw; // half-height function row
      for (let c = 0; c < 14; c++) x.fillRect(left + c * (kw + gap), y, kw, h);
      y += h + gap;
    }
    x.fillStyle = '#38393f'; x.fillRect(132, 236, 248, 112); // trackpad
  });
  add(g, new THREE.Mesh(new THREE.PlaneGeometry(1.86, 1.31), new THREE.MeshStandardMaterial({ map: deck, roughness: 0.5, metalness: 0.3 })), [0, 0.0955, 0.02], [-Math.PI / 2, 0, 0]);

  // lid on a hinge at the back edge, opened a little past upright
  const hinge = add(g, new THREE.Group(), [0, 0.095, -0.67], [-0.22, 0, 0]);
  rbox(hinge, 1.95, 1.33, 0.028, 0.012, body, [0, 0.665, -0.014]);
  // bezel, screen and notch are stacked a few hundredths apart (and the screen material is offset in
  // depth by the scene), so they stay separate at any distance
  add(hinge, new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.29), new THREE.MeshBasicMaterial({ color: '#050506' })), [0, 0.665, 0.002]);
  const screen = add(hinge, new THREE.Mesh(new THREE.PlaneGeometry(MACBOOK.screenW, MACBOOK.screenH), screenMaterial), [0, 0.645, 0.005]);
  const notch = new THREE.MeshBasicMaterial({ color: '#050506', polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  add(hinge, new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.05), notch), [0, 1.209, 0.008]);
  return { root: g, screen };
}
