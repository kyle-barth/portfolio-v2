// Geometry helpers: merge static meshes by material to cut draw calls, and free GPU memory on teardown.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

const isMesh = (o: THREE.Object3D): o is THREE.Mesh => (o as THREE.Mesh).isMesh === true;

/** Copy an attribute into plain float32 (quantized or interleaved data cannot be re-transformed in place). */
function toFloat(attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) {
  if (!(attr instanceof THREE.InterleavedBufferAttribute) && attr.array instanceof Float32Array && !attr.normalized) return attr;
  const n = attr.count, k = attr.itemSize, out = new Float32Array(n * k);
  const get = [attr.getX, attr.getY, attr.getZ, attr.getW];
  for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) out[i * k + j] = get[j].call(attr, i);
  return new THREE.BufferAttribute(out, k);
}

type MergeOptions = {
  pick?: (mesh: THREE.Mesh) => THREE.Material;
  skip?: (mesh: THREE.Mesh) => boolean;
};

/**
 * Bake every mesh under `root` into one static mesh per material, positioned relative to `root`.
 * ~180 desk meshes become a handful of draws, shadow passes included.
 */
export function mergeByMaterial(root: THREE.Object3D, { pick = (m) => m.material as THREE.Material, skip = () => false }: MergeOptions = {}) {
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const local = new THREE.Matrix4();
  const groups = new Map<THREE.Material, THREE.BufferGeometry[]>();

  root.traverse((o) => {
    if (!isMesh(o) || skip(o)) return;
    const mat = pick(o);
    const src = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    const g = new THREE.BufferGeometry();
    for (const [name, attr] of Object.entries(src.attributes)) g.setAttribute(name, toFloat(attr));
    src.dispose();
    local.multiplyMatrices(toRoot, o.matrixWorld);
    g.applyMatrix4(local);
    if (!groups.has(mat)) groups.set(mat, []);
    groups.get(mat)!.push(g);
  });

  const out = new THREE.Group();
  out.name = 'merged';
  for (const [mat, list] of groups) {
    const m = mat as THREE.MeshStandardMaterial;
    const need = ['position', 'normal'];
    if (m.map || m.normalMap || m.roughnessMap || m.aoMap || m.emissiveMap) need.push('uv');
    if (m.vertexColors) need.push('color');
    for (const g of list) {
      for (const name of Object.keys(g.attributes)) if (!need.includes(name)) g.deleteAttribute(name);
      if (!g.attributes.normal) g.computeVertexNormals();
      const n = g.attributes.position.count;
      if (need.includes('uv') && !g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
      if (need.includes('color') && !g.attributes.color) g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    }
    const merged = BufferGeometryUtils.mergeGeometries(list, false);
    list.forEach((g) => g.dispose());
    if (!merged) continue;
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    out.add(mesh);
  }
  return out;
}

/** Free every geometry, material and texture under `root`. */
export function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose();
    const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
    for (const mat of mats) {
      for (const value of Object.values(mat)) if ((value as THREE.Texture | null)?.isTexture) (value as THREE.Texture).dispose();
      mat.dispose();
    }
  });
}
