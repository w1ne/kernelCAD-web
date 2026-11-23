// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Renders the OBJ export of part.kcad.ts side by side in headless Chromium
// with the three.js OBJLoader: before/model.obj (origin/develop) and
// after/model.obj (this branch). Encodes demo.mp4 and poster.png and writes
// loader-stats.json.
// Usage: node docs/demos/obj-normals/render-video.mjs

import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, copyFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../..');
const types = { '.js': 'text/javascript', '.obj': 'text/plain', '.html': 'text/html' };
const panels = [
  ['/before', 90, '#9a2a2a', 'Before (develop): no vn lines'],
  ['/after', 690, '#1f6b35', 'After (this branch): crease-split vn normals'],
];

const page = `<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif">
<div style="position:absolute;left:0;top:0;width:1280px;padding:20px 30px;box-sizing:border-box">
<div style="font-size:28px;font-weight:700;color:#17243a">OBJ export in a three.js viewer: round faces shade smooth, sharp edges stay sharp</div>
<div style="font-size:17px;color:#53657f">Same bracket exported with format: 'obj'; model.obj loaded by three.js OBJLoader</div></div>
${panels.map(([, x, c, t], i) => `<div style="position:absolute;left:${x}px;top:118px;width:500px;font-size:20px;font-weight:700;color:${c}">${t}</div>
<div id="s${i}" style="position:absolute;left:${x}px;top:146px;width:500px;font-size:15px;color:#33445c"></div>`).join('')}
<canvas id="c" width="1280" height="720"></canvas>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, alpha: true });
renderer.setScissorTest(true);
const views = [];
const stats = [];
for (const [i, [url, x]] of ${JSON.stringify(panels)}.entries()) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(1, 2, 1.5); scene.add(sun);
  const model = new OBJLoader().parse(await (await fetch(url + '/model.obj')).text());
  // OBJ is Z-up millimetres; three.js is Y-up.
  model.rotation.x = -Math.PI / 2;
  model.traverse(o => { if (o.isMesh) o.material = new THREE.MeshStandardMaterial({ color: 0xa8b4c4, metalness: 0.6, roughness: 0.22 }); });
  let meshes = 0, triangles = 0, faceted = 0;
  model.traverse(o => { if (o.isMesh) {
    meshes++;
    const n = o.geometry.getAttribute('normal');
    triangles += n.count / 3;
    // A triangle on a curved face is faceted when its three corner normals are equal and not axial.
    for (let k = 0; k < n.count; k += 3) {
      const same = [1, 2].every(j => n.getX(k) === n.getX(k + j) && n.getY(k) === n.getY(k + j) && n.getZ(k) === n.getZ(k + j));
      const axial = Math.max(Math.abs(n.getX(k)), Math.abs(n.getY(k)), Math.abs(n.getZ(k))) > 0.9999;
      if (same && !axial) faceted++;
    }
  } });
  stats.push({ url, meshes, triangles, facetedNonAxialTriangles: faceted });
  document.getElementById('s' + i).textContent = triangles + ' triangles; triangles with one flat non-axial normal: ' + faceted;
  const pivot = new THREE.Group(); pivot.add(model); scene.add(pivot);
  const box = new THREE.Box3().setFromObject(pivot);
  const size = box.isEmpty() ? 1 : box.getSize(new THREE.Vector3()).length();
  if (!box.isEmpty()) model.position.sub(box.getCenter(new THREE.Vector3()));
  stats[i].diagonal = size;
  const camera = new THREE.PerspectiveCamera(30, 500 / 520, size / 100, size * 10);
  camera.position.set(0, size * 0.9, size * 1.9); camera.lookAt(0, 0, 0);
  views.push({ scene, camera, pivot, x });
}
window.stats = stats;
window.drawFrame = (t) => {
  renderer.setClearColor(0xffffff, 1);
  for (const v of views) {
    v.pivot.rotation.y = -0.6 + t * Math.PI * 2;
    renderer.setViewport(v.x, 720 - 180 - 520 + 10, 500, 520);
    renderer.setScissor(v.x, 720 - 180 - 520 + 10, 500, 520);
    renderer.render(v.scene, v.camera);
  }
};
window.ready = true;
</script></body></html>`;

const server = createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(page); return; }
  const file = url.endsWith('.obj') ? join(here, url) : join(repo, url);
  try { res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, ok));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const tab = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await tab.goto(`http://127.0.0.1:${server.address().port}/`);
await tab.waitForFunction(() => window.ready === true, null, { timeout: 120000 });
writeFileSync(join(here, 'loader-stats.json'), `${JSON.stringify(await tab.evaluate(() => window.stats), null, 2)}\n`);
const frames = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), 'kcad-obj-normals-'));
const count = 120;
try {
  for (let i = 0; i < count; i++) {
    await tab.evaluate((t) => window.drawFrame(t), i / count);
    await tab.screenshot({ path: join(frames, `f${String(i).padStart(4, '0')}.png`) });
  }
  copyFileSync(join(frames, 'f0000.png'), join(here, 'poster.png'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '20', '-i', join(frames, 'f%04d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '28', join(here, 'demo.mp4')]);
} finally {
  rmSync(frames, { recursive: true, force: true });
  await browser.close();
  server.close();
}
