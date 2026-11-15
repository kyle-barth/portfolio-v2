// Model lab: one prop on its own in neutral studio light, for checking it against product photos.
// Open the site with ?lab=keyboard (or macbook, macbook-closed, printer, printer-bare, chair) and drag to
// orbit. In the console, __labView(i) jumps to one of the fixed views, and __labCapture('v1') renders all
// six into a contact sheet plus a hero shot and posts them to a local receiver on ?save=<port> (default 8799).
// Models built from a measured spec also get __labCheck() (each spec'd dimension, measured off the built
// parts) and __labOverlay('side', 'v1'): the model rendered with an orthographic camera lined up to a
// reference render, with its outline overlap (IoU) and a sheet of the photo with the model's edges on it,
// the model alone, the outline difference and a 50% blend.
// This module is only loaded when ?lab is in the URL.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { disposeTree } from './geometry';
import { buildP2S } from './p2s';
import { buildChair } from './props/chair';
import { buildKeyboard } from './props/keyboard';
import { buildMacBook } from './props/macbook';
import { buildMonitor } from './props/monitor';
import { buildNR200 } from './props/pc';
import { buildSora } from './props/mouse';
import { buildLavaLamp } from './props/lava-lamp';
import { applyReflections } from './props/night-env';
import { buildDonut, buildMug } from './props/tableware';
import { LAVA_CHECKS, LAVA_REFS } from './specs/lava';
import { MBP_CHECKS, MBP_REFS } from './specs/macbook';
import { FO27, FO27_CHECKS, FO27_REFS } from './specs/fo27q3';
import { NR200_CHECKS, NR200_REFS } from './specs/nr200p';
import { SORA_CHECKS, SORA_REFS } from './specs/sora';
import { P2S_CHECKS, P2S_REFS, type RefImage } from './specs/p2s';

type Model = {
  name: string;
  root: THREE.Object3D;
  front: THREE.Vector3;
  /** Spec'd dimensions measured off the built parts, and what they should be (mm). */
  measured?: Record<string, number>;
  checks?: { name: string; want: number; tol: number }[];
  /** Reference renders to overlay, and how many mm one scene unit is. */
  refs?: Record<string, RefImage>;
  unitMm?: number;
};

function printer(ams: boolean): Model {
  const p = buildP2S({ reduce: true, ams });
  p.update(70, 0, 1);
  const refs = Object.fromEntries(Object.entries(P2S_REFS).filter(([, r]) => r.ams === ams));
  return { name: `Bambu Lab P2S${ams ? ' with AMS 2 Pro' : ''}`, root: p.root, front: new THREE.Vector3(0, 0, 1), measured: p.measured, checks: P2S_CHECKS, refs, unitMm: 160 };
}

function macbook(open: number, refs: Record<string, RefImage>): Model {
  const m = buildMacBook(desktopMaterial(), { open });
  return { name: `MacBook Pro 14-inch, PROLED XDR (Space Black)${open ? '' : ', closed'}`, root: m.root, front: new THREE.Vector3(0, 0, 1), measured: m.measured, checks: MBP_CHECKS, refs, unitMm: 160 };
}

/** A plain macOS-style desktop for the laptop screen. */
function desktopMaterial() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 660;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 1024, 660);
  g.addColorStop(0, '#13204f'); g.addColorStop(0.55, '#5a3592'); g.addColorStop(1, '#f39a55');
  x.fillStyle = g; x.fillRect(0, 0, 1024, 660);
  x.fillStyle = 'rgba(16,16,20,.6)'; x.fillRect(0, 0, 1024, 24);
  x.fillStyle = 'rgba(255,255,255,.22)'; x.fillRect(312, 610, 400, 42);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: t, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
}

const MODELS: Record<string, () => Model | Promise<Model>> = {
  keyboard: () => ({ name: 'Rama Works U80-A (Milk)', root: buildKeyboard(), front: new THREE.Vector3(0, 0, 1) }),
  // open, as on the desk (overlays the deck seen from above); closed, for the four outside views
  macbook: () => macbook(108, { deck: MBP_REFS.deck }),
  'macbook-closed': () => macbook(0, { top: MBP_REFS.top, front: MBP_REFS.front, left: MBP_REFS.left, right: MBP_REFS.right }),
  mouse: () => {
    const m = buildSora();
    return { name: 'Ninjutso Sora V2 (white)', root: m.root, front: new THREE.Vector3(0, 0, -1), measured: m.measured, checks: SORA_CHECKS, refs: SORA_REFS, unitMm: 160 };
  },
  monitor: () => {
    // stood at the render's height, so the overlays line up; a dark screen
    const m = buildMonitor(new THREE.MeshStandardMaterial({ color: '#07080a', roughness: 0.15, metalness: 0.1 }), { panelBottom: FO27.head.renderBottom, tipZ: Number(new URLSearchParams(location.search).get('tipz')) || undefined });
    return { name: 'Gigabyte AORUS FO27Q3', root: m.root, front: new THREE.Vector3(0, 0, 1), measured: m.measured, checks: FO27_CHECKS, refs: FO27_REFS, unitMm: 160 };
  },
  pc: () => {
    const p = buildNR200();
    return { name: 'Cooler Master NR200P MAX V2 (grey)', root: p.root, front: new THREE.Vector3(0, 0, 1), measured: p.measured, checks: NR200_CHECKS, refs: NR200_REFS, unitMm: 160 };
  },
  printer: () => printer(true),
  'printer-bare': () => printer(false),
  chair: () => ({ name: 'Secretlab TITAN Evo', root: buildChair(), front: new THREE.Vector3(0, 0, -1) }),
  lava: () => {
    const l = buildLavaLamp({ reduce: true });
    l.update(30, 1); // switched on, wax mid-cycle
    l.light.intensity = 0; // the lab's own lights show the shape; the lamp's glow is self-lit anyway
    return { name: 'Lava lamp (14.5 inch classic)', root: l.root, front: new THREE.Vector3(0, 0, 1), measured: l.measured, checks: LAVA_CHECKS, refs: LAVA_REFS, unitMm: 160 };
  },
  tableware: () => {
    const g = new THREE.Group();
    const mug = buildMug(); mug.position.set(-0.55, 0, 0); mug.rotation.y = -0.6;
    const plate = buildDonut(); plate.position.set(0.45, 0, 0.1);
    g.add(mug, plate);
    return { name: 'Rustic stoneware mug and plate', root: g, front: new THREE.Vector3(0, 0, 1) };
  },
};

// yaw is measured from the model's front; sideOf() names the side the camera ends up on, as the
// person using the product would call it.
const VIEWS = [
  { label: 'front', yaw: 0, elev: 8 },
  { label: 'front three-quarter', yaw: 40, elev: 22 },
  { label: 'front three-quarter', yaw: -40, elev: 22 },
  { label: 'side', yaw: -90, elev: 6 },
  { label: 'rear three-quarter', yaw: 145, elev: 18 },
  { label: 'top (back edge at the top)', yaw: 0, elev: 80 },
];

export async function createLab(name: string) {
  const make = MODELS[name];
  if (!make) throw new Error(`Unknown lab model "${name}". Try: ${Object.keys(MODELS).join(', ')}`);
  const model = await make();
  const params = new URLSearchParams(window.location.search);
  const port = params.get('save') || '8799';

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:9999;display:block';
  document.body.appendChild(canvas);
  document.documentElement.style.overflow = 'hidden';

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.NeutralToneMapping; // Khronos PBR Neutral: built for judging product colour
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d8dade');
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
  pmrem.dispose();
  scene.environment = env.texture;
  scene.add(model.root);
  applyReflections(model.root, env.texture);

  // frame the model: bounding box, ground with a soft contact shadow, a key light that fits it
  const box = new THREE.Box3().setFromObject(model.root);
  const centre = box.getCenter(new THREE.Vector3());
  const radius = box.getBoundingSphere(new THREE.Sphere()).radius;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(radius * 12, radius * 12), new THREE.ShadowMaterial({ opacity: 0.22 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = box.min.y;
  ground.receiveShadow = true;
  scene.add(ground);
  model.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(new THREE.HemisphereLight('#ffffff', '#8a8f99', 0.6));
  const key = new THREE.DirectionalLight('#ffffff', 1.6);
  key.position.copy(centre).add(new THREE.Vector3(radius * 1.2, radius * 2.4, radius * 1.6));
  key.target.position.copy(centre);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const sc = key.shadow.camera;
  sc.left = sc.bottom = -radius * 1.5; sc.right = sc.top = radius * 1.5; sc.near = 0.1; sc.far = radius * 8;
  key.shadow.bias = -0.0004;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight('#dfe8ff', 0.7);
  rim.position.copy(centre).add(new THREE.Vector3(-radius * 2, radius * 1.2, -radius * 2));
  scene.add(rim);

  const camera = new THREE.PerspectiveCamera(30, 1, radius / 50, radius * 40);
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(centre);
  controls.enableDamping = true;

  // wide, flat models can be framed tighter than tall ones
  const size = box.getSize(new THREE.Vector3());
  const tall = THREE.MathUtils.clamp(size.y / Math.max(size.x, size.z) - 0.5, 0, 1);
  const dist = (radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * (0.86 + 0.2 * tall);
  // For every model here the user's left is -x (keyboard, laptop and printer face +z toward the user;
  // the chair faces -z, the way its sitter faces), so the camera's x says which side it is on.
  const sideOf = (yaw: number) => {
    if (yaw === 0 || Math.abs(yaw) === 180) return '';
    const x = model.front.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(yaw)).x;
    return x < 0 ? ", from the user's left" : ", from the user's right";
  };
  function place(view: { yaw: number; elev: number }, d = dist) {
    const dir = model.front.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(view.yaw));
    const e = THREE.MathUtils.degToRad(view.elev);
    camera.position.copy(centre).add(new THREE.Vector3(dir.x * Math.cos(e), Math.sin(e), dir.z * Math.cos(e)).multiplyScalar(d));
    camera.lookAt(centre);
    controls.target.copy(centre);
  }

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();
  place(VIEWS[2]);
  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });

  function renderAt(w: number, h: number, view: { yaw: number; elev: number }) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    place(view, dist * (w / h < 1.2 ? 1.12 : 1));
    renderer.render(scene, camera);
    return renderer.domElement;
  }
  async function save(fileName: string, c: HTMLCanvasElement) {
    const blob = await new Promise<Blob>((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error('toBlob failed'))), 'image/png'));
    const r = await fetch(`http://localhost:${port}/save?name=${encodeURIComponent(fileName)}`, { method: 'POST', body: blob, headers: { 'Content-Type': 'image/png' } });
    if (!r.ok) throw new Error(`receiver said ${r.status}`);
    return fileName;
  }

  /** Six views on one sheet (3 x 2, 900 x 675 each, labelled) and a large hero shot. */
  async function capture(tag = 'v1') {
    renderer.setAnimationLoop(null);
    const cw = 900, ch = 675;
    const sheet = document.createElement('canvas');
    sheet.width = cw * 3; sheet.height = ch * 2 + 56;
    const x = sheet.getContext('2d')!;
    x.fillStyle = '#d8dade'; x.fillRect(0, 0, sheet.width, sheet.height);
    x.fillStyle = '#1b1d22'; x.font = '600 30px system-ui, sans-serif';
    x.fillText(`${model.name}: lab render ${tag}`, 20, 38);
    VIEWS.forEach((v0, i) => {
      const v = { ...v0, label: v0.label + (v0.elev > 60 ? '' : sideOf(v0.yaw)) };
      const src = renderAt(cw, ch, v);
      const px = (i % 3) * cw, py = 56 + Math.floor(i / 3) * ch;
      x.drawImage(src, px, py, cw, ch);
      x.strokeStyle = '#ffffff'; x.lineWidth = 2; x.strokeRect(px, py, cw, ch);
      x.fillStyle = 'rgba(20,22,26,.75)'; x.fillRect(px + 10, py + 10, 22 + v.label.length * 10.5, 34);
      x.fillStyle = '#ffffff'; x.font = '500 20px system-ui, sans-serif'; x.fillText(v.label, px + 20, py + 34);
    });
    const files = [await save(`${name}-${tag}-sheet.png`, sheet)];
    const hero = renderAt(1600, 1200, { yaw: -32, elev: 16 });
    const heroCopy = document.createElement('canvas');
    heroCopy.width = 1600; heroCopy.height = 1200;
    heroCopy.getContext('2d')!.drawImage(hero, 0, 0);
    files.push(await save(`${name}-${tag}-hero.png`, heroCopy));
    // and from straight below, front at the top (the ground only catches shadows on its upper face)
    const under = renderAt(1200, 900, { yaw: 0, elev: -89 });
    const underCopy = document.createElement('canvas');
    underCopy.width = 1200; underCopy.height = 900;
    underCopy.getContext('2d')!.drawImage(under, 0, 0);
    files.push(await save(`${name}-${tag}-under.png`, underCopy));
    resize();
    place(VIEWS[2]);
    renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
    return files;
  }

  /** Every spec'd dimension: wanted, measured off the built parts, and whether it is within tolerance. */
  function check() {
    if (!model.checks || !model.measured) return 'This model has no spec to check against.';
    const rows = model.checks.map((c) => {
      const got = model.measured![c.name];
      const ok = got !== undefined && Math.abs(got - c.want) <= c.tol;
      return { check: c.name, want: c.want, got: got === undefined ? null : +got.toFixed(1), diff: got === undefined ? null : +(got - c.want).toFixed(1), tol: c.tol, ok };
    });
    console.table(rows);
    return rows;
  }

  /**
   * Line the model up with a reference render (orthographic, mapped by the ref's mm/px, centre column and
   * floor row) and compare: outline IoU, plus a sheet of photo + model edges, model alone, outline
   * difference (red: photo only, cyan: model only) and a 50% blend.
   */
  async function overlay(refName: string, tag = 'v1') {
    const ref = model.refs?.[refName];
    if (!ref) return `No reference "${refName}". Try: ${Object.keys(model.refs ?? {}).join(', ') || 'none for this model'}`;
    const res = await fetch(`http://localhost:${port}/ref/${ref.file}`);
    if (!res.ok) throw new Error(`receiver said ${res.status} for ${ref.file}`);
    const img = await createImageBitmap(await res.blob());
    // compare the whole image, or just its region of interest; render with the longest side N
    const N = 1200, P = 900;
    const [rx0, ry0, rx1, ry1] = ref.roi ?? [0, 0, img.width, img.height];
    const iw = rx1 - rx0, ih = ry1 - ry0, fit = N / Math.max(iw, ih);
    const NW = Math.round(iw * fit), NH = Math.round(ih * fit);
    renderer.setAnimationLoop(null);
    ground.visible = false;
    renderer.setSize(NW, NH, false);
    const grab = () => { const c = document.createElement('canvas'); c.width = NW; c.height = NH; c.getContext('2d')!.drawImage(renderer.domElement, 0, 0, NW, NH); return c; };
    const bg = scene.background;

    // the photo and its outline mask (anything not the plain background; without a region of interest the
    // caption strip along the bottom is ignored)
    const photo = document.createElement('canvas'); photo.width = NW; photo.height = NH;
    const px = photo.getContext('2d', { willReadFrequently: true })!;
    px.fillStyle = '#fff'; px.fillRect(0, 0, NW, NH); // a transparent backdrop counts as white
    px.drawImage(img, rx0, ry0, iw, ih, 0, 0, NW, NH);
    const pd = px.getImageData(0, 0, NW, NH).data, bgc = [pd[0], pd[1], pd[2]];
    const photoMask = new Uint8Array(NW * NH);
    for (let i = 0; i < NW * NH; i++) {
      const y = Math.floor(i / NW), k = i * 4;
      photoMask[i] = ref.channel === 'r' ? (pd[k] > (ref.thr ?? 18) ? 1 : 0)
        : (ref.roi || y < NH * 0.89) && Math.max(Math.abs(pd[k] - bgc[0]), Math.abs(pd[k + 1] - bgc[1]), Math.abs(pd[k + 2] - bgc[2])) > (ref.thr ?? 18) ? 1 : 0;
    }
    // A side view lit only along its top (a black mouse in the dark): everything under the outline,
    // down to the desk, is product.
    if (ref.fill === 'down') {
      for (let x = 0; x < NW; x++) {
        let y = 0;
        while (y < NH && !photoMask[y * NW + x]) y++;
        for (; y < NH; y++) photoMask[y * NW + x] = 1;
      }
    }
    // A dark product on a dark backdrop (a black keyboard, port openings) has holes in that mask:
    // whatever the backdrop can't reach from the image's edge is product.
    {
      const seen = new Uint8Array(NW * NH), stack: number[] = [];
      const push = (i: number) => { if (!seen[i] && !photoMask[i]) { seen[i] = 1; stack.push(i); } };
      for (let x = 0; x < NW; x++) { push(x); push((NH - 1) * NW + x); }
      for (let y = 0; y < NH; y++) { push(y * NW); push(y * NW + NW - 1); }
      while (stack.length) {
        const i = stack.pop()!, x = i % NW;
        if (x > 0) push(i - 1);
        if (x < NW - 1) push(i + 1);
        if (i >= NW) push(i - NW);
        if (i < NW * (NH - 1)) push(i + NW);
      }
      for (let i = 0; i < NW * NH; i++) if (!seen[i]) photoMask[i] = 1;
    }

    let cam: THREE.OrthographicCamera | THREE.PerspectiveCamera;
    let pose = '';
    if (ref.view === 'persp') {
      ({ cam, pose } = fitPose(photoMask, NW, NH, ref.yaw));
    } else {
      const u = ref.mmPerPx / (model.unitMm ?? 1); // scene units per image pixel
      cam = new THREE.OrthographicCamera((rx0 - ref.cx) * u, (rx1 - ref.cx) * u, (ref.floorY - ry0) * u, (ref.floorY - ry1) * u, 0.01, 1000);
      if (ref.view === 'front') cam.position.set(0, 0, 100);
      else if (ref.view === 'left') cam.position.set(-100, 0, 0);
      else if (ref.view === 'right') cam.position.set(100, 0, 0);
      else if (ref.view === 'back') cam.position.set(0, 0, -100);
      else { cam.position.set(0, 100, 0); cam.up.set(0, 0, ref.up === '+z' ? 1 : -1); } // from above
      cam.lookAt(0, 0, 0);
      cam.updateMatrixWorld();
    }

    // the model: lit, then as a flat white mask, then its visible edges
    // Product renders are lit by softboxes from the camera's side and above, so this is lit the same way for
    // every reference view, with the lab's own key and rim lights off (in the side view they would leave the
    // panel in shadow). The light sits high, about 55 degrees above the view: nearer the view axis its mirror
    // highlight lands on every front face and on the lower front of anything round.
    scene.background = new THREE.Color(`rgb(${bgc.join(',')})`);
    // The studio environment is halved too: the renders' backdrop is dark around the product, and at full
    // strength it fills every front-facing surface (dark spools read grey).
    const headlight = new THREE.DirectionalLight('#ffffff', 2.6); // tuned so the body's front matches the renders' tone
    if (ref.view === 'persp') headlight.position.copy(cam.position).add(new THREE.Vector3(0, radius * 3, 0));
    else headlight.position.copy(cam.position).add(new THREE.Vector3(ref.view === 'front' ? 30 : 0, 145, ref.view === 'front' ? 0 : 30));
    scene.add(headlight, headlight.target);
    key.visible = rim.visible = false;
    scene.environmentIntensity = 0.5;
    renderer.render(scene, cam);
    scene.environmentIntensity = 1;
    key.visible = rim.visible = true;
    scene.remove(headlight, headlight.target);
    headlight.dispose();
    const beauty = grab();
    scene.background = new THREE.Color('#000');
    scene.overrideMaterial = new THREE.MeshBasicMaterial({ color: '#fff', side: THREE.DoubleSide });
    renderer.render(scene, cam);
    const md = grab().getContext('2d')!.getImageData(0, 0, NW, NH).data;
    const edges = new THREE.Scene();
    const lineMat = new THREE.LineBasicMaterial({ color: '#ff00ff' });
    model.root.updateMatrixWorld(true);
    model.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.visible) return;
      const l = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 35), lineMat);
      l.matrixAutoUpdate = false;
      l.matrix.copy(m.matrixWorld);
      edges.add(l);
    });
    scene.overrideMaterial = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
    renderer.autoClear = false;
    renderer.clear();
    renderer.render(scene, cam); // depth only, so hidden edges stay hidden
    renderer.render(edges, cam);
    renderer.autoClear = true;
    const edgeCanvas = grab();
    scene.overrideMaterial = null;
    scene.background = bg;
    edges.traverse((o) => { if ((o as THREE.LineSegments).isLineSegments) (o as THREE.LineSegments).geometry.dispose(); });
    lineMat.dispose();

    // outline overlap
    let both = 0, photoOnly = 0, modelOnly = 0;
    const diff = document.createElement('canvas'); diff.width = NW; diff.height = NH;
    const dx = diff.getContext('2d')!, dd = dx.createImageData(NW, NH);
    for (let i = 0; i < NW * NH; i++) {
      const a = photoMask[i], b = md[i * 4] > 127 ? 1 : 0, k = i * 4;
      const c = a && b ? [150, 150, 150] : a ? [235, 60, 60] : b ? [40, 200, 230] : [250, 250, 250];
      if (a && b) both++; else if (a) photoOnly++; else if (b) modelOnly++;
      dd.data[k] = c[0]; dd.data[k + 1] = c[1]; dd.data[k + 2] = c[2]; dd.data[k + 3] = 255;
    }
    dx.putImageData(dd, 0, 0);
    const union = both + photoOnly + modelOnly;
    const metrics = { ref: refName, iou: +(both / union).toFixed(4), photoOnlyPct: +((100 * photoOnly) / union).toFixed(2), modelOnlyPct: +((100 * modelOnly) / union).toFixed(2), ...(pose ? { pose } : {}) };

    // the sheet: four panels, side by side for tall subjects, two by two otherwise
    const ps = P / Math.max(NW, NH), PW = Math.round(NW * ps), PH = Math.round(NH * ps);
    const cols = PH > PW * 1.3 ? 4 : 2;
    const sheet = document.createElement('canvas');
    sheet.width = PW * cols; sheet.height = PH * (4 / cols) + 56;
    const x = sheet.getContext('2d')!;
    x.fillStyle = '#d8dade'; x.fillRect(0, 0, sheet.width, sheet.height);
    x.fillStyle = '#1b1d22'; x.font = `600 ${sheet.width < 1400 ? 18 : 26}px system-ui, sans-serif`;
    x.fillText(`${model.name}: overlay on "${refName}" ${tag}  |  outline IoU ${metrics.iou}  (photo only ${metrics.photoOnlyPct}%, model only ${metrics.modelOnlyPct}%)`, 16, 36, sheet.width - 32);
    const panel = (i: number, title: string, draw: (c: CanvasRenderingContext2D) => void) => {
      const ox = (i % cols) * PW, oy = 56 + Math.floor(i / cols) * PH;
      x.save(); x.translate(ox, oy); x.scale(ps, ps); draw(x); x.restore();
      x.strokeStyle = '#fff'; x.lineWidth = 2; x.strokeRect(ox, oy, PW, PH);
      x.font = `500 ${PW < 500 ? 14 : 19}px system-ui, sans-serif`;
      const tw = Math.min(PW - 20, x.measureText(title).width + 20);
      x.fillStyle = 'rgba(20,22,26,.75)'; x.fillRect(ox + 10, oy + 10, tw, 30);
      x.fillStyle = '#fff'; x.fillText(title, ox + 20, oy + 30, tw - 20);
    };
    panel(0, 'photo with model edges', (c) => { c.drawImage(photo, 0, 0); c.globalCompositeOperation = 'lighter'; c.drawImage(edgeCanvas, 0, 0); c.globalCompositeOperation = 'source-over'; });
    panel(1, 'model, same camera', (c) => c.drawImage(beauty, 0, 0));
    panel(2, 'outline: red photo only, cyan model only', (c) => c.drawImage(diff, 0, 0));
    panel(3, '50% blend', (c) => { c.drawImage(photo, 0, 0); c.globalAlpha = 0.5; c.drawImage(beauty, 0, 0); c.globalAlpha = 1; });
    const file = await save(`${name}-${tag}-overlay-${refName}.png`, sheet);

    ground.visible = true;
    resize();
    place(VIEWS[2]);
    renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
    return { ...metrics, file };
  }

  /**
   * For a perspective reference: search camera poses (yaw round the model from its front, elevation,
   * roll about the view axis, lens) for the one whose outline best matches the photo's, each candidate
   * aligned to the photo by area and centroid; then return that camera with a view offset that applies
   * the alignment, so it renders straight onto the photo.
   */
  function fitPose(photoMask: Uint8Array, NW: number, NH: number, yawRange: [number, number] = [-180, 165]) {
    const S = 160 / Math.max(NW, NH), w0 = Math.round(NW * S), h0 = Math.round(NH * S);
    const small = new Uint8Array(w0 * h0);
    for (let y = 0; y < h0; y++) for (let x = 0; x < w0; x++) small[y * w0 + x] = photoMask[Math.floor(y / S) * NW + Math.floor(x / S)];
    const moments = (m: Uint8Array, w: number, h: number) => {
      let a = 0, sx = 0, sy = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) { a++; sx += x; sy += y; }
      return { a, cx: sx / Math.max(1, a), cy: sy / Math.max(1, a) };
    };
    const P = moments(small, w0, h0);
    const target = new THREE.WebGLRenderTarget(w0, h0);
    const buf = new Uint8Array(w0 * h0 * 4), m = new Uint8Array(w0 * h0);
    const white = new THREE.MeshBasicMaterial({ color: '#fff', side: THREE.DoubleSide });
    const bg = scene.background;
    scene.background = new THREE.Color('#000');
    scene.overrideMaterial = white;
    const cam = new THREE.PerspectiveCamera(20, w0 / h0, radius / 50, radius * 80);
    const aim = (yaw: number, elev: number, roll: number, fov: number) => {
      cam.fov = fov;
      const d = (radius / Math.sin(THREE.MathUtils.degToRad(fov / 2))) * 1.1;
      const dir = model.front.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(yaw));
      const e = THREE.MathUtils.degToRad(elev);
      cam.position.copy(centre).add(new THREE.Vector3(dir.x * Math.cos(e), Math.sin(e), dir.z * Math.cos(e)).multiplyScalar(d));
      cam.up.set(0, 1, 0);
      cam.lookAt(centre);
      cam.rotateZ(THREE.MathUtils.degToRad(roll));
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld();
    };
    const score = (yaw: number, elev: number, roll: number, fov: number) => {
      aim(yaw, elev, roll, fov);
      cam.clearViewOffset();
      renderer.setRenderTarget(target);
      renderer.render(scene, cam);
      renderer.readRenderTargetPixels(target, 0, 0, w0, h0, buf);
      for (let y = 0; y < h0; y++) for (let x = 0; x < w0; x++) m[y * w0 + x] = buf[((h0 - 1 - y) * w0 + x) * 4] > 127 ? 1 : 0;
      const M = moments(m, w0, h0);
      if (!M.a) return { iou: 0, s: 1, M };
      const s = Math.sqrt(P.a / M.a);
      let both = 0;
      for (let y = 0; y < h0; y++) for (let x = 0; x < w0; x++) {
        if (!small[y * w0 + x]) continue;
        const mx = Math.round((x - P.cx) / s + M.cx), my = Math.round((y - P.cy) / s + M.cy);
        if (mx >= 0 && my >= 0 && mx < w0 && my < h0 && m[my * w0 + mx]) both++;
      }
      return { iou: both / (2 * P.a - both), s, M };
    };
    let best = { yaw: 0, elev: 30, roll: 0, fov: 20, iou: -1 };
    const tryAll = (yaws: number[], elevs: number[], rolls: number[], fovs: number[]) => {
      for (const fov of fovs) for (const yaw of yaws) for (const elev of elevs) for (const roll of rolls) {
        const r = score(yaw, elev, roll, fov);
        if (r.iou > best.iou) best = { yaw, elev, roll, fov, iou: r.iou };
      }
    };
    const range = (a: number, b: number, step: number) => { const o: number[] = []; for (let v = a; v <= b + 1e-9; v += step) o.push(v); return o; };
    tryAll(range(yawRange[0], yawRange[1], 15), range(0, 80, 10), range(-45, 45, 15), [20]);
    for (const [step, span, fovs] of [[5, 10, [12, 20, 32]], [2, 4, [best.fov]], [1, 2, [best.fov * 0.85, best.fov, best.fov * 1.15]]] as [number, number, number[]][]) {
      const b = { ...best };
      tryAll(range(b.yaw - span, b.yaw + span, step), range(b.elev - span, b.elev + span, step), range(b.roll - span, b.roll + span, step), fovs);
    }
    // the winning pose, with the alignment as a view offset at full size
    const r = score(best.yaw, best.elev, best.roll, best.fov);
    renderer.setRenderTarget(null);
    target.dispose();
    white.dispose();
    scene.overrideMaterial = null;
    scene.background = bg;
    aim(best.yaw, best.elev, best.roll, best.fov);
    cam.aspect = NW / NH;
    const k = NW / w0; // full-size pixels per search pixel
    cam.setViewOffset(NW, NH, (r.M.cx - P.cx / r.s) * k, (r.M.cy - P.cy / r.s) * k, NW / r.s, NH / r.s);
    cam.updateProjectionMatrix();
    const pose = `yaw ${best.yaw.toFixed(0)}, elevation ${best.elev.toFixed(0)}, roll ${best.roll.toFixed(0)}, fov ${best.fov.toFixed(1)} (search IoU ${best.iou.toFixed(3)})`;
    return { cam, pose };
  }

  // __labScene: the scene itself, for poking at parts from the console (hide one, look again)
  Object.assign(window, { __labCapture: capture, __labView: (i: number) => place(VIEWS[i] ?? VIEWS[0]), __labCheck: check, __labOverlay: overlay, __labScene: scene });

  return {
    dispose() {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', resize);
      controls.dispose();
      disposeTree(scene);
      env.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
