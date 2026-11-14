// Model lab: one prop on its own in neutral studio light, for checking it against product photos.
// Open the site with ?lab=keyboard (or macbook, macbook-built, printer, chair) and drag to orbit. In the console,
// __labView(i) jumps to one of the fixed views, and __labCapture('v1') renders all six into a contact
// sheet plus a hero shot and posts them to a local receiver on ?save=<port> (default 8799).
// This module is only loaded when ?lab is in the URL.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { disposeTree } from './geometry';
import { buildP2S } from './p2s';
import { buildChair } from './props/chair';
import { buildKeyboard } from './props/keyboard';
import { buildMacBook, loadMacBook } from './props/macbook';
import { applyReflections } from './props/night-env';

type Model = { name: string; root: THREE.Object3D; front: THREE.Vector3 };

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
  macbook: async () => ({ name: 'MacBook Pro 14-inch (Space Black)', root: (await loadMacBook(desktopMaterial())).root, front: new THREE.Vector3(0, 0, 1) }),
  'macbook-built': () => ({ name: 'MacBook Pro 14-inch (built-in fallback)', root: buildMacBook(desktopMaterial()).root, front: new THREE.Vector3(0, 0, 1) }),
  printer: () => {
    const p = buildP2S({ reduce: true });
    p.update(70, 0, 1);
    return { name: 'Bambu Lab P2S with AMS 2 Pro', root: p.root, front: new THREE.Vector3(0, 0, 1) };
  },
  chair: () => ({ name: 'Secretlab TITAN Evo', root: buildChair(), front: new THREE.Vector3(0, 0, -1) }),
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
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
    resize();
    place(VIEWS[2]);
    renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
    return files;
  }

  Object.assign(window, { __labCapture: capture, __labView: (i: number) => place(VIEWS[i] ?? VIEWS[0]) });

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
