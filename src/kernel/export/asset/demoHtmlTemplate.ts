// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Self-contained browser page shipped inside an asset-pack zip. One pinned
// three.js release feeds both the import map and the loader URLs.

/** three.js release the packed viewer loads. Keep this the only pin. */
export const ASSET_PACK_THREE_VERSION = '0.184.0';

/** Viewer page that loads `<id>.glb` with GLTFLoader and OrbitControls. */
export function renderAssetPackDemoHtml(id: string): string {
  const version = ASSET_PACK_THREE_VERSION;
  const modelUrl = JSON.stringify(`${id}.glb`);
  const title = escapeHtml(id);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  html, body { margin: 0; height: 100%; background: #16181d; }
  canvas { width: 100%; height: 100%; display: block; }
</style>
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@${version}/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@${version}/examples/jsm/"
  }
}
</script>
</head>
<body>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const modelUrl = ${modelUrl};
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.01, 1000);
camera.position.set(1.4, 1.1, 1.8);
const controls = new OrbitControls(camera, renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.1));
const key = new THREE.DirectionalLight(0xffffff, 2);
key.position.set(3, 5, 2);
scene.add(key);

const loader = new GLTFLoader();
loader.load(modelUrl, (gltf) => {
  scene.add(gltf.scene);
  const bounds = new THREE.Box3().setFromObject(gltf.scene);
  const span = bounds.getSize(new THREE.Vector3()).length() || 1;
  bounds.getCenter(controls.target);
  camera.position.copy(controls.target).add(new THREE.Vector3(span, span * 0.7, span));
  controls.update();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
</script>
</body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (ch) => {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    return '&quot;';
  });
}
