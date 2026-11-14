// A tiny "night room" for reflections: dark walls, the lava lamp's warm glow on the left, the monitor's
// cool light behind the desk, moonlight high on the left and a soft fill from the right. It is baked once
// with PMREM and given only to materials marked with `reflective()`, so metal, glass and glaze have
// something to reflect without lifting the rest of the room.
import * as THREE from 'three';

export function nightEnvironment(renderer: THREE.WebGLRenderer) {
  const room = new THREE.Scene();
  const parts: { geometry: THREE.BufferGeometry; material: THREE.Material }[] = [];
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, p?: [number, number, number]) => {
    const m = new THREE.Mesh(geometry, material);
    if (p) { m.position.set(p[0], p[1], p[2]); m.lookAt(0, 0, 0); }
    room.add(m);
    parts.push(m);
  };
  add(new THREE.BoxGeometry(24, 12, 24), new THREE.MeshBasicMaterial({ color: '#0a0d16', side: THREE.BackSide }));
  const panel = (w: number, h: number, color: string, strength: number, p: [number, number, number]) =>
    add(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), side: THREE.DoubleSide }), p);
  panel(2.4, 3.2, '#ff9a4a', 2.2, [-6, 1.5, -4]); // lava lamp
  panel(5.5, 3.0, '#8fd3ff', 1.1, [0.3, 1.8, -6]); // monitor
  panel(7, 4, '#7d93ff', 0.5, [-7, 6, -6]); // moonlight
  panel(6, 4, '#c9d6ff', 0.45, [8, 3.5, 6]); // fill from the right
  panel(14, 14, '#26304d', 0.9, [0, 5.9, 0]); // a faint ceiling

  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(room, 0.04);
  pmrem.dispose();
  parts.forEach((p) => { p.geometry.dispose(); p.material.dispose(); });
  return target;
}

/** Hand the environment to every material marked with `reflective()` under `root`. */
export function applyReflections(root: THREE.Object3D, env: THREE.Texture) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const m = mat as THREE.MeshStandardMaterial;
      if (m.userData.env === undefined || m.envMap === env) continue;
      m.envMap = env;
      m.envMapIntensity = m.userData.env as number;
      m.needsUpdate = true;
    }
  });
}
