// Golden pothos in a terracotta pot: a full crown of leaves, a few vines arching up, and three
// trailing over the rim and along the desk. Leaves are heart-shaped, folded along the midrib, and
// streaked with gold. All the leaves merge into one mesh, all the stems into another.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { lathe, seeded, std } from './kit';

const POT_TOP = 0.6;

/** A unit leaf: base at the origin, tip at +y, face toward +z, with a fold and a slight backward curl. */
function leafGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(-0.42, -0.12, -0.62, 0.42, 0, 1);
  s.bezierCurveTo(0.62, 0.42, 0.42, -0.12, 0, 0);
  const geo = new THREE.ShapeGeometry(s, 14);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, Math.abs(x) * 0.38 - y * y * 0.16);
  }
  geo.deleteAttribute('uv');
  geo.computeVertexNormals();
  return geo;
}

export function buildPothos() {
  const g = new THREE.Group();
  g.name = 'pothos';
  const rand = seeded(11);

  // pot, with a rolled rim
  lathe(g, [[0, 0], [0.31, 0], [0.33, 0.03], [0.39, 0.54], [0.42, 0.56], [0.42, POT_TOP], [0.38, POT_TOP], [0.36, 0.56], [0.32, 0.06], [0, 0.06]], std('#b9693f', 0.92), undefined, 44);
  lathe(g, [[0, 0.53], [0.37, 0.53], [0.37, 0.54], [0, 0.54]], std('#2a1d14', 1), undefined, 36);

  const unit = leafGeometry();
  const leaves: THREE.BufferGeometry[] = [];
  const stems: THREE.BufferGeometry[] = [];
  const green = new THREE.Color(), gold = new THREE.Color('#e3d77a'), c = new THREE.Color();
  const m = new THREE.Matrix4(), bx = new THREE.Vector3(), by = new THREE.Vector3(), bz = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  /** Place a leaf at p, its face toward `face` and its tip toward `tip`. */
  function leaf(p: THREE.Vector3, face: THREE.Vector3, tip: THREE.Vector3, size: number) {
    bz.copy(face).normalize();
    by.copy(tip).addScaledVector(bz, -tip.dot(bz)).normalize();
    bx.crossVectors(by, bz);
    m.makeBasis(bx, by, bz).scale(new THREE.Vector3(size, size, size)).setPosition(p);
    const geo = unit.clone().applyMatrix4(m);
    // deep green with feathered gold streaks running out from the midrib
    green.setHSL(0.27 + rand() * 0.04, 0.48 + rand() * 0.14, 0.24 + rand() * 0.07);
    const amount = rand() < 0.6 ? 0.25 + rand() * 0.5 : 0.08;
    const seed = rand() * 10;
    const up = unit.attributes.position, col = new Float32Array(up.count * 3);
    for (let v = 0; v < up.count; v++) {
      const x = up.getX(v), y = up.getY(v);
      const streak = Math.pow(Math.max(0, Math.sin(Math.atan2(y + 0.2, x) * 9 + seed)), 3);
      c.copy(green).lerp(gold, streak * amount * Math.min(1, Math.abs(x) * 4));
      col.set([c.r, c.g, c.b], v * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    leaves.push(geo);
  }

  const at = (a: number, r: number, y: number) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
  const out = (a: number) => new THREE.Vector3(Math.cos(a), 0, Math.sin(a));

  // the crown: leaves fanning out of the soil all the way round
  for (let i = 0; i < 16; i++) {
    const a = i * 2.39996 + rand() * 0.3; // golden angle, so they don't line up
    const r = 0.08 + rand() * 0.2;
    const p = at(a, r, 0.55 + rand() * 0.18);
    const o = out(a);
    leaf(p, o.clone().multiplyScalar(0.5 + rand() * 0.4).add(UP), o.clone().add(UP.clone().multiplyScalar(0.5 + rand() * 0.9)), 0.3 + rand() * 0.14);
  }

  // vines: angles avoid -x, where the lava lamp stands
  const vines: { curve: THREE.CatmullRomCurve3; leaves: number; trailing: boolean }[] = [];
  for (const a of [-1.3, -0.25, 0.75, 1.55, 2.35]) {
    const h = 0.55 + rand() * 0.45, reach = 0.3 + rand() * 0.25;
    vines.push({
      curve: new THREE.CatmullRomCurve3([at(a, 0.05, 0.54), at(a, 0.1, POT_TOP + h * 0.55), at(a, reach * 0.7, POT_TOP + h), at(a, reach * 1.1, POT_TOP + h * 0.8)]),
      leaves: 5,
      trailing: false,
    });
  }
  for (const a of [0.35, 1.2, 2.0]) {
    const run = 0.45 + rand() * 0.55;
    vines.push({
      curve: new THREE.CatmullRomCurve3([at(a, 0.12, 0.56), at(a, 0.38, POT_TOP + 0.08), at(a, 0.47, 0.42), at(a, 0.5, 0.12), at(a + 0.08, 0.56, 0.02), at(a + 0.2, 0.6 + run * 0.6, 0.02), at(a + 0.35, 0.6 + run, 0.02)]),
      leaves: 7,
      trailing: true,
    });
  }

  const tangent = new THREE.Vector3();
  for (const v of vines) {
    stems.push(new THREE.TubeGeometry(v.curve, 48, 0.012, 5));
    for (let k = 0; k < v.leaves; k++) {
      const t = 0.22 + (k / v.leaves) * 0.76;
      const p = v.curve.getPointAt(t);
      v.curve.getTangentAt(t, tangent);
      // alternate sides of the vine; leaves face up and out, tips run along the vine and droop a little
      const sideways = new THREE.Vector3().crossVectors(tangent, UP).normalize().multiplyScalar(k % 2 ? 1 : -1);
      const face = UP.clone().multiplyScalar(v.trailing ? 1.4 : 0.8).add(sideways.clone().multiplyScalar(0.5));
      const tipDir = tangent.clone().add(sideways.clone().multiplyScalar(0.8));
      if (v.trailing) tipDir.y = Math.max(tipDir.y, 0); // lie on the desk, not through it
      const size = (0.3 + rand() * 0.08) * (1 - t * 0.35);
      leaf(p.clone().addScaledVector(sideways, 0.03), face, tipDir, size);
    }
  }
  unit.dispose();

  const leafMesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(leaves, false)!, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.5 }));
  const stemMesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(stems, false)!, std('#4a7a33', 0.7));
  leaves.forEach((x) => x.dispose());
  stems.forEach((x) => x.dispose());
  g.add(leafMesh, stemMesh);
  return g;
}
