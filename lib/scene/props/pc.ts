// Small form factor PC in a Cooler Master NR200P (376 x 185 x 292 mm), black, with the tempered
// glass side facing the room. Inside: ITX board, tower cooler with a lit fan ring, RAM, and the GPU.
import * as THREE from 'three';
import { add, box, canvasTexture, cyl, std } from './kit';

const W = 1.16, H = 1.83, D = 2.35, T = 0.04;

export function buildPC() {
  const g = new THREE.Group();
  g.name = 'pc';
  const shell = std('#26282d', 0.45, 0.35);
  const vent = canvasTexture(256, 256, (x) => {
    x.fillStyle = '#26282d'; x.fillRect(0, 0, 256, 256);
    x.fillStyle = '#0b0b0d';
    for (let r = 0; r < 32; r++) for (let c = 0; c < 32; c++) { x.beginPath(); x.arc(4 + c * 8 + (r % 2) * 4, 4 + r * 8, 2.4, 0, 7); x.fill(); }
  });
  vent.wrapS = vent.wrapT = THREE.RepeatWrapping;
  vent.repeat.set(3, 3);
  const vented = std('#ffffff', 0.65, 0.2, { map: vent });

  box(g, T, H, D, vented, [-W / 2 + T / 2, H / 2, 0]); // far side
  box(g, W, T, D, vented, [0, H - T / 2, 0]); // top
  box(g, W, 0.06, D, shell, [0, 0.03, 0]); // bottom
  box(g, W, H, T, shell, [0, H / 2, D / 2 - T / 2]); // front
  box(g, W, H, T, shell, [0, H / 2, -D / 2 + T / 2]); // back
  for (const z of [-D / 2 + 0.15, D / 2 - 0.15]) for (const x of [-W / 2 + 0.12, W / 2 - 0.12]) cyl(g, 0.06, 0.06, 0.03, shell, [x, -0.015, z], undefined, 12);
  cyl(g, 0.035, 0.035, 0.01, std('#2b2d31', 0.4, 0.5), [-0.3, H - 0.18, D / 2 + 0.002], [Math.PI / 2, 0, 0], 16); // power button

  // glass side, framed
  const glass = new THREE.MeshStandardMaterial({ color: '#1a1f28', transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0.6, depthWrite: false });
  add(g, new THREE.Mesh(new THREE.PlaneGeometry(D - 0.08, H - 0.08), glass), [W / 2 + 0.002, H / 2, 0], [0, Math.PI / 2, 0]).renderOrder = 2;
  box(g, 0.02, 0.05, D, shell, [W / 2, H - 0.025, 0]);
  box(g, 0.02, 0.05, D, shell, [W / 2, 0.055, 0]);

  // interior, with a faint cool glow from the lighting strips so the window reads from across the room
  add(g, new THREE.Mesh(new THREE.BoxGeometry(W - 2 * T, H - 0.1, D - 2 * T), std('#15171c', 0.9, 0, { side: THREE.BackSide, emissive: '#16263c', emissiveIntensity: 0.9 })), [0, H / 2 + 0.01, 0]);
  box(g, 0.02, 1.15, 1.25, std('#151a17', 0.7), [-W / 2 + 0.07, 1.12, -0.35]); // motherboard
  box(g, 0.5, 0.7, 0.36, std('#a3a9b1', 0.35, 0.75), [-0.24, 1.2, -0.32]); // cooler fin stack
  const ring = new THREE.MeshBasicMaterial({ color: new THREE.Color('#bfe0ff').multiplyScalar(1.2) });
  add(g, new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.012, 8, 40), ring), [-0.24, 1.2, -0.12]);
  add(g, new THREE.Mesh(new THREE.CircleGeometry(0.26, 32), std('#202227', 0.6)), [-0.24, 1.2, -0.125]);
  const ramGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color('#9fd2ff').multiplyScalar(1.4) });
  for (const x of [-0.42, -0.36]) {
    box(g, 0.025, 0.32, 0.9, std('#1d1f24', 0.5), [x, 1.12, -0.95 + 0.45 + 0.1]);
    box(g, 0.026, 0.02, 0.9, ramGlow, [x, 1.29, -0.4]);
  }
  box(g, 0.46, 0.34, 1.95, std('#23262b', 0.45, 0.4), [-0.08, 0.36, 0.08]); // GPU
  box(g, 0.005, 0.03, 1.1, new THREE.MeshBasicMaterial({ color: new THREE.Color('#e8f1ff').multiplyScalar(1.5) }), [0.152, 0.42, 0.3]); // GPU light strip

  const light = new THREE.PointLight('#cfe3ff', 1.6, 2.4, 1);
  light.position.set(0.1, 1.0, 0);
  g.add(light);
  return g;
}
