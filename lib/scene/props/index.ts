// Lays out the desk. Back row, left to right: NR200P PC, pothos, lava lamp, OLED monitor, P2S.
// Front: MacBook and Snorlax on the left, keyboard and mouse on the mat, coffee in front of the printer
// and a donut beside it on the right.
// The chair sits pulled out in front of the desk. Static parts merge by material; lights, the lava
// and the screens' materials stay live.
// Everything but the boot set (the desk, the lamp and the monitor) builds while the boot camera is
// square on to the monitor, so it all stands clear of that view, to come into sight with the pull-back
// rather than appearing in it: the pothos and the printer sit just outside it (`__bootView()` in the
// console with ?debug measures it). On portrait screens that view is tall enough to take in what sits in
// front of the monitor, so there the boot set takes those props too (UP_FRONT).
import * as THREE from 'three';
import { mergeByMaterial } from '../geometry';
import { buildP2S } from '../p2s';
import { buildChair } from './chair';
import { DESK, buildDesk, buildDeskMat } from './desk';
import { buildKeyboard } from './keyboard';
import type { V3 } from './kit';
import { buildLavaLamp } from './lava-lamp';
import { buildMacBook } from './macbook';
import { MONITOR, buildMonitor } from './monitor';
import { buildMouse } from './mouse';
import { applyReflections } from './night-env';
import { buildPC } from './pc';
import { buildPothos } from './pothos';
import { buildSnorlax } from './snorlax';
import { buildDonut, buildMug } from './tableware';

export const LAYOUT = {
  monitor: [0.25, 0, -1.55] as V3,
  keyboard: [0.0, 0.025, 1.15] as V3,
  mouse: [1.85, 0.025, 1.28] as V3,
  mat: [0.35, 0, 1.08] as V3,
  macbook: [-2.8, 0, 0.8] as V3,
  pc: [-5.45, 0, -1.25] as V3,
  lava: [-3.2, 0, -1.72] as V3,
  pothos: [-4.2, 0, -1.85] as V3, // between the PC and the lamp
  snorlax: [-5.6, 0, 1.85] as V3, // the front-left corner
  mug: [4.6, 0, 0.6] as V3, // coaster on the desk in front of the printer
  donut: [5.15, 0, 1.6] as V3,
  printer: [4.7, 0, -1.08] as V3,
  chair: [-2.6, DESK.floor, 4.7] as V3,
};

/** Where the monitor's screen sits in the world, for its glow. */
export const MONITOR_SCREEN = new THREE.Vector3(LAYOUT.monitor[0], MONITOR.centreY, LAYOUT.monitor[2] + MONITOR.frontZ);

function place(parent: THREE.Object3D, obj: THREE.Object3D, p: V3, rotY = 0) {
  obj.position.set(p[0], p[1], p[2]);
  obj.rotation.y = rotY;
  parent.add(obj);
  return obj;
}

/** Merged meshes: see-through ones draw last and, like self-lit ones, cast no shadow. */
function settleMerged(merged: THREE.Object3D) {
  merged.children.forEach((m) => {
    const mat = (m as THREE.Mesh).material as THREE.Material;
    if (mat.transparent) { m.renderOrder = 2; m.castShadow = false; }
    if ((mat as THREE.MeshBasicMaterial).isMeshBasicMaterial) m.castShadow = false;
  });
  return merged;
}

/** The props in build order, each a label for the boot log and the work to place it (the desk, the
 *  lamp and a stand-in monitor are already up: see buildBootSet). */
const STEPS = (statics: THREE.Group, monitorScreen: THREE.Material, laptopScreen: THREE.Material): [string, () => void][] => [
  ['monitor', () => place(statics, buildMonitor(monitorScreen).root, LAYOUT.monitor)],
  ['keyboard', () => place(statics, buildKeyboard(), LAYOUT.keyboard)],
  ['mouse', () => place(statics, buildMouse(), LAYOUT.mouse, -0.12)],
  ['macbook', () => place(statics, buildMacBook(laptopScreen).root, LAYOUT.macbook, 0.42)],
  ['pc', () => place(statics, buildPC(), LAYOUT.pc)],
  // the vines arch and trail towards the room, clear of the PC and the lamp on either side
  ['pothos', () => place(statics, buildPothos({ arch: [-1.95, -1.2, 0.95, 1.6, 2.1], trail: [0.85, 1.2, 1.5] }), LAYOUT.pothos)],
  ['snorlax', () => place(statics, buildSnorlax(), LAYOUT.snorlax, 0.55)],
  ['coffee', () => place(statics, buildMug(), LAYOUT.mug, -0.6)],
  ['donut', () => place(statics, buildDonut(), LAYOUT.donut)],
  ['chair', () => place(statics, buildChair(), LAYOUT.chair, -0.75)],
];

/** Every vertex under these objects in world space, thinned to one per 2 cm cell (for measuring). */
export function vertexCloud(parts: THREE.Object3D[]) {
  const seen = new Set<string>(), out: number[] = [], v = new THREE.Vector3(), CELL = 0.125;
  for (const p of parts) {
    p.updateMatrixWorld(true);
    p.traverse((o) => {
      const pos = (o as THREE.Mesh).isMesh ? (o as THREE.Mesh).geometry.attributes.position : null;
      if (!pos) return;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        const key = `${Math.round(v.x / CELL)},${Math.round(v.y / CELL)},${Math.round(v.z / CELL)}`;
        if (!seen.has(key)) { seen.add(key); out.push(v.x, v.y, v.z); }
      }
    });
  }
  return new Float32Array(out);
}

/** The props in front of the monitor, which a portrait screen's boot camera sees: there they go up
 *  first (buildAhead), so they are there from the 3D monitor's first frame, in the dark (the screen's
 *  glow just finds the keyboard), rather than appearing later. */
export const UP_FRONT: readonly string[] = ['keyboard', 'mouse', 'chair'];

/** Lights can't be merged: lift them out to `into` at their world positions, then merge the rest by material. */
function settle(statics: THREE.Group, into: THREE.Object3D) {
  statics.updateMatrixWorld(true);
  const lights: THREE.Light[] = [];
  statics.traverse((o) => { if ((o as THREE.Light).isLight) lights.push(o as THREE.Light); });
  for (const l of lights) {
    const p = l.getWorldPosition(new THREE.Vector3());
    l.removeFromParent();
    l.position.copy(p);
    into.add(l);
  }
  into.add(settleMerged(mergeByMaterial(statics)));
}

/**
 * Build the props named (see UP_FRONT) a prop at a time, waiting for `yieldFrame()` between them, merged
 * as the desk's are. The scene puts them up with the boot set, before the 3D monitor takes over.
 * `prepare` gets each prop as it is built (to compile its shaders while the next one builds; merging
 * keeps its materials), and the build waits for all of those before it returns.
 */
export async function buildAhead(labels: readonly string[], opts: {
  monitorScreen: THREE.Material; laptopScreen: THREE.Material; env?: THREE.Texture;
  yieldFrame?: () => Promise<unknown>; prepare?: (part: THREE.Object3D) => Promise<unknown>; measure?: boolean;
}) {
  const root = new THREE.Group();
  root.name = 'ahead';
  const statics = new THREE.Group();
  const parts: Record<string, THREE.Object3D[]> = {}; // their own meshes, when measuring (as buildDeskScene)
  const prepared: Promise<unknown>[] = [];
  for (const [label, run] of STEPS(statics, opts.monitorScreen, opts.laptopScreen)) {
    if (!labels.includes(label)) continue;
    const before = statics.children.length;
    run();
    const built = statics.children.slice(before);
    if (opts.env) for (const b of built) applyReflections(b, opts.env); // before compiling: it changes their shaders
    if (opts.measure) parts[label] = built;
    if (opts.prepare) for (const b of built) prepared.push(opts.prepare(b));
    await opts.yieldFrame?.();
  }
  await Promise.all(prepared);
  settle(statics, root);
  return { root, parts };
}

/**
 * Build the rest of the desk a prop at a time, waiting for `yieldFrame()` between props so whatever is
 * already on screen (the boot set) keeps animating, and reporting each step to `onStep`.
 */
export async function buildDeskScene(opts: {
  reduce: boolean; monitorScreen: THREE.Material; laptopScreen: THREE.Material; env?: THREE.Texture;
  yieldFrame?: () => Promise<unknown>; onStep?: (done: number, total: number, label: string) => void;
  /** Keep hold of each prop's own meshes (debug: merging copies them), to measure what the boot camera would see. */
  measure?: boolean;
  /** Props built ahead already (see UP_FRONT). */
  skip?: readonly string[];
}) {
  const root = new THREE.Group();
  root.name = 'desk-scene';
  const statics = new THREE.Group();
  const steps = STEPS(statics, opts.monitorScreen, opts.laptopScreen).filter(([label]) => !opts.skip?.includes(label));
  const total = steps.length + 1; // and the printer, which stays live
  const yieldFrame = opts.yieldFrame ?? (() => Promise.resolve());
  let done = 0;
  // each prop's own meshes, when measuring (see bootView in after-hours.ts)
  const parts: Record<string, THREE.Object3D[]> = {};
  for (const [label, run] of steps) {
    const before = statics.children.length;
    run();
    if (opts.measure) parts[label] = statics.children.slice(before);
    opts.onStep?.(++done, total, label);
    await yieldFrame();
  }

  settle(statics, root);

  const printer = buildP2S({ reduce: opts.reduce });
  place(root, printer.root, LAYOUT.printer, -0.12);
  opts.onStep?.(++done, total, 'printer');
  if (opts.env) applyReflections(root, opts.env);

  if (opts.measure) parts.printer = [printer.root];
  return { root, printer, parts };
}

/**
 * What is on screen first, while the rest builds: the desk and its mat, the lava lamp (which switches on
 * during the boot and lights them) and the monitor on its own, where the desk will put it. The desk and
 * the lamp stay; `monitor` stands in for the desk's own monitor until the desk is ready.
 */
export function buildBootSet(opts: { reduce: boolean; lowPower: boolean; monitorScreen: THREE.Material; env?: THREE.Texture }) {
  const desk = new THREE.Group();
  desk.name = 'desk';
  place(desk, buildDesk(), [0, 0, 0]);
  place(desk, buildDeskMat(), LAYOUT.mat);
  const lava = buildLavaLamp({ reduce: opts.reduce, lowPower: opts.lowPower });
  place(desk, lava.root, LAYOUT.lava);
  const monitor = new THREE.Group();
  place(monitor, buildMonitor(opts.monitorScreen).root, LAYOUT.monitor);
  if (opts.env) { applyReflections(desk, opts.env); applyReflections(monitor, opts.env); }
  return { desk, monitor, lava };
}
