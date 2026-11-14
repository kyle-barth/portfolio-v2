// A 27-inch QD-OLED gaming monitor: a 5 mm panel with hairline bezels and a slim chin, the electronics in a
// tapered housing low on the back, an angled neck and a V-shaped metal foot.
// The live screen is a plane on the front of the panel; its material comes from the scene.
import * as THREE from 'three';
import { add, box, rbox, reflective, std } from './kit';

export const MONITOR = { screenW: 3.72, screenH: 2.09, centreY: 1.72, frontZ: 0.042 };

export function buildMonitor(screenMaterial: THREE.Material) {
  const g = new THREE.Group();
  g.name = 'monitor';
  const { centreY: cy } = MONITOR;
  const metal = reflective(std('#4b4f57', 0.28, 0.75), 1);
  const bezel = reflective(std('#0c0d10', 0.3, 0.1), 0.6);
  const shell = reflective(std('#1a1c21', 0.45, 0.2), 0.45);

  // panel: hairline bezels on three sides, a slightly deeper chin
  const panelH = 2.24, panelCy = cy - 0.02;
  rbox(g, 3.82, panelH, 0.04, 0.016, bezel, [0, panelCy, 0.02]);
  box(g, 0.16, 0.012, 0.004, reflective(std('#9aa1ab', 0.25, 0.9), 1), [0, panelCy - panelH / 2 + 0.045, 0.041]); // badge on the chin
  box(g, 0.022, 0.008, 0.004, new THREE.MeshBasicMaterial({ color: '#f2f6ff' }), [1.72, panelCy - panelH / 2 + 0.045, 0.041]); // power LED

  // rear housing: a side profile that swells low on the back and thins out toward the top
  const y0 = panelCy - panelH / 2 + 0.06;
  const s = new THREE.Shape();
  s.moveTo(0, y0);
  s.lineTo(-0.14, y0);
  s.quadraticCurveTo(-0.27, y0 + 0.02, -0.27, y0 + 0.3);
  s.lineTo(-0.27, cy - 0.05);
  s.quadraticCurveTo(-0.26, cy + 0.55, 0, cy + 0.9);
  s.closePath();
  const housingW = 3.0;
  const housing = new THREE.ExtrudeGeometry(s, { depth: housingW, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.06, bevelSegments: 3, curveSegments: 10 });
  housing.rotateY(-Math.PI / 2).translate(housingW / 2, 0, 0);
  add(g, new THREE.Mesh(housing, shell));

  // stand: VESA block, angled neck with a cable cut-out, V-shaped foot
  rbox(g, 0.62, 0.5, 0.12, 0.04, metal, [0, cy - 0.25, -0.31]);
  const neck = add(g, new THREE.Group(), [0, 0.04, -0.5], [-0.07, 0, 0]);
  rbox(neck, 0.34, cy - 0.15, 0.13, 0.05, metal, [0, (cy - 0.15) / 2, 0]);
  rbox(neck, 0.18, 0.3, 0.02, 0.05, std('#0b0c0f', 0.8), [0, 0.42, 0.06]); // cable cut-out
  const foot = new THREE.Shape(); // drawn in (x, -z), then laid flat
  foot.moveTo(-1.02, -0.3);
  foot.quadraticCurveTo(-1.08, -0.18, -0.98, -0.12);
  foot.quadraticCurveTo(-0.4, 0.4, 0, 0.66);
  foot.quadraticCurveTo(0.4, 0.4, 0.98, -0.12);
  foot.quadraticCurveTo(1.08, -0.18, 1.02, -0.3);
  foot.quadraticCurveTo(0.95, -0.36, 0.86, -0.3);
  foot.quadraticCurveTo(0.35, 0.12, 0, 0.3);
  foot.quadraticCurveTo(-0.35, 0.12, -0.86, -0.3);
  foot.quadraticCurveTo(-0.95, -0.36, -1.02, -0.3);
  const footGeo = new THREE.ExtrudeGeometry(foot, { depth: 0.035, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 14 });
  footGeo.rotateX(-Math.PI / 2).translate(0, 0.012, -0.02);
  add(g, new THREE.Mesh(footGeo, metal));

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(MONITOR.screenW, MONITOR.screenH), screenMaterial);
  screen.position.set(0, cy, MONITOR.frontZ);
  g.add(screen);
  return { root: g, screen };
}
