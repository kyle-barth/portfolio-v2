// A blocky, cube-style Snorlax figure, about 140 mm tall.
import * as THREE from 'three';
import { box, rbox, std } from './kit';

export function buildSnorlax() {
  const g = new THREE.Group();
  g.name = 'snorlax';
  const teal = std('#2f6e80', 0.65);
  const cream = std('#efe3c6', 0.7);
  const ink = std('#1b2528', 0.6);

  rbox(g, 0.64, 0.5, 0.52, 0.07, teal, [0, 0.28, 0]); // body
  rbox(g, 0.48, 0.38, 0.05, 0.02, cream, [0, 0.27, 0.255]); // belly
  rbox(g, 0.5, 0.32, 0.46, 0.07, teal, [0, 0.68, 0]); // head
  rbox(g, 0.38, 0.2, 0.04, 0.015, cream, [0, 0.65, 0.225]); // face
  for (const x of [-0.08, 0.08]) box(g, 0.085, 0.014, 0.01, ink, [x, 0.69, 0.248]); // sleepy eyes
  box(g, 0.13, 0.012, 0.01, ink, [0, 0.61, 0.248]); // mouth
  for (const x of [-0.035, 0.035]) box(g, 0.022, 0.024, 0.01, cream, [x, 0.6, 0.252]); // little fangs
  for (const s of [-1, 1]) {
    box(g, 0.1, 0.13, 0.08, teal, [s * 0.17, 0.88, 0], [0, 0, s * -0.32]); // ears
    rbox(g, 0.13, 0.2, 0.15, 0.04, teal, [s * 0.36, 0.33, 0.06]); // arms
    rbox(g, 0.2, 0.09, 0.22, 0.03, cream, [s * 0.18, 0.045, 0.22]); // feet
    for (const dx of [-0.05, 0, 0.05]) box(g, 0.025, 0.04, 0.012, cream, [s * 0.36 + dx * 0.6, 0.24, 0.13]); // claws
  }
  return g;
}
