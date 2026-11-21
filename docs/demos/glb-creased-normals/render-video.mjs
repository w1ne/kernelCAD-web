// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Renders before.glb (origin/develop export) and after.glb (this branch) side
// by side in headless Chromium with three.js GLTFLoader, which shades with the
// file's own NORMAL attribute, then encodes demo.mp4 and poster.png.
// Usage: node docs/demos/glb-creased-normals/render-video.mjs

import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../..');
const types = { '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.html': 'text/html' };

const page = `<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif">
<div style="position:absolute;left:0;top:0;width:1280px;height:92px;padding:22px 40px;box-sizing:border-box">
<div style="font-size:30px;font-weight:700;color:#17243a">GLB export shading normals: sharp edges stay sharp</div>
<div style="font-size:18px;color:#53657f">Same kernelCAD part, default glTF export, rendered by three.js GLTFLoader from the file's NORMAL attribute</div></div>
<div id="l" style="position:absolute;left:40px;top:150px;font-size:22px;font-weight:700;color:#9a2a2a">Before (develop): normals averaged across 90° edges</div>
<div id="r" style="position:absolute;left:660px;top:150px;font-size:22px;font-weight:700;color:#1f6b35">After: split at creases &gt; 30°, smooth on curved faces</div>
<canvas id="c" width="1280" height="720"></canvas>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, alpha: true });
renderer.setScissorTest(true);
const loader = new GLTFLoader();
const load = (u) => new Promise((ok, no) => loader.load(u, (g) => ok(g.scene), undefined, no));
const views = [];
for (const [url, x] of [['/before.glb', 40], ['/after.glb', 660]]) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(1, 2, 1.5); scene.add(sun);
  const model = await load(url);
  const box = new THREE.Box3().setFromObject(model);
  model.position.sub(box.getCenter(new THREE.Vector3()));
  const pivot = new THREE.Group(); pivot.add(model); scene.add(pivot);
  const camera = new THREE.PerspectiveCamera(30, 580 / 460, 0.001, 10);
  camera.position.set(0, 0.07, 0.16); camera.lookAt(0, 0, 0);
  views.push({ scene, camera, pivot, x });
}
window.drawFrame = (t) => {
  renderer.setClearColor(0xffffff, 1);
  for (const v of views) {
    v.pivot.rotation.y = -0.6 + t * Math.PI * 2;
    renderer.setViewport(v.x, 720 - 190 - 460, 580, 460);
    renderer.setScissor(v.x, 720 - 190 - 460, 580, 460);
    renderer.render(v.scene, v.camera);
  }
};
window.ready = true;
</script></body></html>`;

const server = createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(page); return; }
  const file = url.endsWith('.glb') ? join(here, url) : join(repo, url);
  try { res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, ok));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const tab = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await tab.goto(`http://127.0.0.1:${server.address().port}/`);
await tab.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
const frames = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), 'kcad-glb-crease-'));
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
