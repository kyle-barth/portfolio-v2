// Lays out the desk. Back row, left to right: NR200P PC, lava lamp, pothos, OLED monitor, P2S.
// Front: MacBook and Snorlax on the left, keyboard and mouse on the mat, coffee in front of the printer
// and a donut beside it on the right.
// The chair sits pulled out in front of the desk. Static parts merge by material; lights, the lava
// and the screens' materials stay live.
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
  macbook: [-2.8, 0, 0.8] as V3, // forward enough that the tilted lid clears the PC's front corner
  pc: [-4.2, 0, -1.25] as V3,
  lava: [-3.2, 0, -1.72] as V3,
  pothos: [-2.3, 0, -1.88] as V3,
  snorlax: [-4.25, 0, 1.6] as V3,
  mug: [3.7, 0, 0.6] as V3, // coaster on the desk in front of the printer
  donut: [4.25, 0, 1.6] as V3,
  printer: [3.65, 0, -1.08] as V3,
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
  ['pothos', () => place(statics, buildPothos(), LAYOUT.pothos, 0.4)],
  ['snorlax', () => place(statics, buildSnorlax(), LAYOUT.snorlax, 0.55)],
  ['coffee', () => place(statics, buildMug(), LAYOUT.mug, -0.6)],
  ['donut', () => place(statics, buildDonut(), LAYOUT.donut)],
  ['chair', () => place(statics, buildChair(), LAYOUT.chair, -0.75)],
];

/**
 * Build the rest of the desk a prop at a time, waiting for `yieldFrame()` between props so whatever is
 * already on screen (the boot set) keeps animating, and reporting each step to `onStep`.
 */
export async function buildDeskScene(opts: {
  reduce: boolean; monitorScreen: THREE.Material; laptopScreen: THREE.Material; env?: THREE.Texture;
  yieldFrame?: () => Promise<unknown>; onStep?: (done: number, total: number, label: string) => void;
}) {
  const root = new THREE.Group();
  root.name = 'desk-scene';
  const statics = new THREE.Group();
  const steps = STEPS(statics, opts.monitorScreen, opts.laptopScreen);
  const total = steps.length + 1; // and the printer, which stays live
  const yieldFrame = opts.yieldFrame ?? (() => Promise.resolve());
  let done = 0;
  for (const [label, run] of steps) {
    run();
    opts.onStep?.(++done, total, label);
    await yieldFrame();
  }

  // lights can't be merged: lift them out to the scene at their world positions first
  statics.updateMatrixWorld(true);
  const lights: THREE.Light[] = [];
  statics.traverse((o) => { if ((o as THREE.Light).isLight) lights.push(o as THREE.Light); });
  for (const l of lights) {
    const p = l.getWorldPosition(new THREE.Vector3());
    l.removeFromParent();
    l.position.copy(p);
    root.add(l);
  }

  root.add(settleMerged(mergeByMaterial(statics)));

  const printer = buildP2S({ reduce: opts.reduce });
  place(root, printer.root, LAYOUT.printer, -0.12);
  opts.onStep?.(++done, total, 'printer');
  if (opts.env) applyReflections(root, opts.env);

  return { root, printer };
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
