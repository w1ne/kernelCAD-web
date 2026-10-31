// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// ES module demo: emit pine-tree.mjs, import it with real three.js in Node,
// call createAsset() with no knobs, a colour knob and a preset, and software
// render the THREE.Group triangles each call returned.
//   npx tsx docs/demos/asset-module/generate.mts
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import * as THREE from 'three';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { exportLowPolyAsset, loadAssetCatalog, readAssetSource } from '../../../src/agent/catalog/catalogStore';
import { emitAssetModule } from '../../../src/agent/catalog/assetModule';
import { renderTrianglesPng, type SoftTriangle } from '../../../scripts/lib/glbSoftwareRender';

const here = import.meta.dirname;
const id = 'pine-tree';
await initOcct();
const { dir, index } = loadAssetCatalog();
const asset = index.assets.find((row) => row.id === id)!;
const glb = await exportLowPolyAsset(readAssetSource(dir, asset), `${id}.kcad.ts`);
const shipped = await emitAssetModule(asset, glb);
writeFileSync(join(here, `${id}.mjs`), shipped);
const tmp = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), 'kcad-asset-module-'));
writeFileSync(join(tmp, `${id}.mjs`), await emitAssetModule(asset, glb, { threeSpecifier: import.meta.resolve('three') }));
const mod = await import(pathToFileURL(join(tmp, `${id}.mjs`)).href) as { default: (o?: Record<string, unknown>) => THREE.Group };

function trianglesOf(group: THREE.Group): SoftTriangle[] {
  group.updateMatrixWorld(true);
  const tris: SoftTriangle[] = [];
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const pos = o.geometry.getAttribute('position');
    const col = o.geometry.getAttribute('color');
    for (let i = 0; i + 2 < pos.count; i += 3) {
      const v = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(pos, i + k).applyMatrix4(o.matrixWorld).toArray()) as SoftTriangle['v'];
      const c = new THREE.Color(col.getX(i), col.getY(i), col.getZ(i)).convertLinearToSRGB();
      tris.push({ v, color: [c.r, c.g, c.b] });
    }
  });
  return tris;
}

const calls: Array<[string, Record<string, unknown>]> = [
  ['createAsset()', {}],
  ["createAsset({ leaves: '#c0392b' })", { leaves: '#c0392b' }],
  ["createAsset({ preset: 'snowy' })", { preset: 'snowy' }],
];
const panels = await Promise.all(calls.map(async ([label, options]) =>
  renderTrianglesPng(trianglesOf(mod.default(options)), { size: 380, frameHeightM: 4.8, label })));
const W = 1280;
const H = 720;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#f4f7fb"/><rect width="${W}" height="12" fill="#2866d5"/>
  <text x="56" y="68" font-family="Arial,sans-serif" font-size="32" font-weight="700" fill="#17243a">Catalog asset as a three.js ES module</text>
  <text x="58" y="102" font-family="Arial,sans-serif" font-size="18" fill="#53657f">import createAsset from './${id}.mjs' — ${Math.round(shipped.length / 1024)} KB, builds a THREE.Group synchronously; colour knobs recolour at runtime, no server.</text>
  <text x="58" y="640" font-family="DejaVu Sans Mono,monospace" font-size="16" fill="#8a3b12">createAsset({ tiers: '5' }) → Error: knob 'tiers' changes geometry; bake that variant (get_variant + export)</text>
  <text x="${W - 56}" y="${H - 24}" text-anchor="end" font-family="Arial,sans-serif" font-size="14" fill="#66758b">Software render of the THREE.Group each call returned in Node · not a browser render</text></svg>`;
const frame = await sharp(Buffer.from(svg)).composite(panels.map((input, i) => ({ input, left: 56 + i * 400, top: 140 }))).png().toBuffer();
writeFileSync(join(here, 'poster.png'), frame);
const frames = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), 'kcad-asset-module-frames-'));
writeFileSync(join(frames, 'f.png'), frame);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-t', '6', '-i', join(frames, 'f.png'), '-vf', 'fps=24', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-movflags', '+faststart', join(here, 'demo.mp4')]);
rmSync(frames, { recursive: true, force: true });
rmSync(tmp, { recursive: true, force: true });
writeFileSync(join(here, 'verification.json'), `${JSON.stringify({
  checkedAt: new Date().toISOString(),
  source: asset.source,
  module: `${id}.mjs`,
  moduleBytes: shipped.length,
  moduleSha256: createHash('sha256').update(shipped).digest('hex'),
  calls: calls.map(([label]) => label),
  claims: { runtimeRecolour: true, geometryKnobsRequireBake: true, browserRendered: false, deployedBehavior: false },
}, null, 2)}\n`);
console.log('wrote demo.mp4, poster.png, verification.json');
