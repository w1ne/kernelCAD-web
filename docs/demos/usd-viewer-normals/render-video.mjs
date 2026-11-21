// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Renders three USDA exports of bracket.kcad.ts side by side in headless
// Chromium with the three.js USDLoader: before.usda (origin/develop),
// braces-only.usda (before.usda with only the prim braces moved to their own
// lines) and after.usda (this branch). Encodes demo.mp4 and poster.png.
// Usage: node docs/demos/usd-viewer-normals/render-video.mjs

import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, copyFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../..');
const types = { '.js': 'text/javascript', '.usda': 'text/plain', '.html': 'text/html' };
const panels = [
  ['/before.usda', 20, '#9a2a2a', 'Before (develop)'],
  ['/braces-only.usda', 440, '#8a5a00', 'Control: braces moved only'],
  ['/after.usda', 860, '#1f6b35', 'After (this branch)'],
];

const page = `<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif">
<div style="position:absolute;left:0;top:0;width:1280px;padding:20px 30px;box-sizing:border-box">
<div style="font-size:28px;font-weight:700;color:#17243a">USD export in a three.js viewer: the part loads, sharp edges stay sharp</div>
<div style="font-size:17px;color:#53657f">Same kernelCAD bracket exported with format: 'usd', loaded by three.js USDLoader</div></div>
${panels.map(([, x, c, t], i) => `<div style="position:absolute;left:${x}px;top:118px;width:400px;font-size:20px;font-weight:700;color:${c}">${t}</div>
<div id="s${i}" style="position:absolute;left:${x}px;top:146px;width:400px;font-size:15px;color:#33445c"></div>`).join('')}
<canvas id="c" width="1280" height="720"></canvas>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { USDLoader } from 'three/addons/loaders/USDLoader.js';
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, alpha: true });
renderer.setScissorTest(true);
const views = [];
const stats = [];
for (const [i, [url, x]] of ${JSON.stringify(panels)}.entries()) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(1, 2, 1.5); scene.add(sun);
  const model = new USDLoader().parse(await (await fetch(url)).text());
  model.rotation.x = -Math.PI / 2;
  let meshes = 0, corners = 0;
  model.traverse(o => { if (o.isMesh) { meshes++; corners += o.geometry.getAttribute('position').count; } });
  stats.push({ url, meshes, corners });
  document.getElementById('s' + i).textContent = meshes === 0
    ? 'USDLoader found 0 meshes: nothing to draw'
    : meshes + ' mesh, ' + corners + ' triangle corners';
  const pivot = new THREE.Group(); pivot.add(model); scene.add(pivot);
  const box = new THREE.Box3().setFromObject(pivot);
  const size = box.isEmpty() ? 1 : box.getSize(new THREE.Vector3()).length();
  if (!box.isEmpty()) model.position.sub(box.getCenter(new THREE.Vector3()));
  stats[i].diagonal = size;
  const camera = new THREE.PerspectiveCamera(30, 400 / 440, size / 100, size * 10);
  camera.position.set(0, size * 0.85, size * 1.95); camera.lookAt(0, 0, 0);
  views.push({ scene, camera, pivot, x });
}
window.stats = stats;
window.drawFrame = (t) => {
  renderer.setClearColor(0xffffff, 1);
  for (const v of views) {
    v.pivot.rotation.y = -0.6 + t * Math.PI * 2;
    renderer.setViewport(v.x, 720 - 180 - 440, 400, 440);
    renderer.setScissor(v.x, 720 - 180 - 440, 400, 440);
    renderer.render(v.scene, v.camera);
  }
};
window.ready = true;
</script></body></html>`;

const server = createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(page); return; }
  const file = url.endsWith('.usda') ? join(here, url) : join(repo, url);
  try { res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, ok));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const tab = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await tab.goto(`http://127.0.0.1:${server.address().port}/`);
await tab.waitForFunction(() => window.ready === true, null, { timeout: 120000 });
writeFileSync(join(here, 'loader-stats.json'), `${JSON.stringify(await tab.evaluate(() => window.stats), null, 2)}\n`);
const frames = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), 'kcad-usd-normals-'));
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
