// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Build one catalog asset the way the catalog build does and report it.
//   npx tsx scripts/checkCatalogAsset.ts catalog/kits/<kit>/<id>.kcad.ts [--png out.png] [--yaw 35]
// Prints triangles / size / palette, fails on a meta or budget problem, and
// optionally writes a software-rendered preview of the low-poly GLB.
import { writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { initOcct } from '../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../src/agent/catalog/buildCatalog';
import { glbTriangles, renderTrianglesPng } from './lib/glbSoftwareRender';

const repoRoot = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const file = args.find((a) => a.endsWith('.kcad.ts'));
if (file === undefined) {
  console.error('usage: npx tsx scripts/checkCatalogAsset.ts catalog/kits/<kit>/<id>.kcad.ts [--png out.png] [--yaw deg]');
  process.exit(2);
}
const flag = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

await initOcct();
// Report the build error itself: an uncaught throw makes Node print the
// (minified, very long) OCCT glue line it surfaced through first.
const built = await buildCatalogAssetWithGlb(repoRoot, relative(repoRoot, resolve(file))).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
const { asset, glb } = built;
console.log(JSON.stringify({
  id: asset.id,
  triangles: asset.stats.triangles,
  budget: asset.triangleBudget,
  sizeM: asset.stats.sizeM,
  minUpM: asset.stats.minUpM,
  materials: asset.stats.materials,
  knobs: asset.params.map((p) => `${p.name}:${p.type}`),
  palette: asset.palette.map((z) => `${z.name}=${z.color}`),
  ...(asset.rig === undefined ? {} : {
    rig: Object.entries(asset.rig).map(([name, j]) => `${name}:${j.type}/${j.axis}[${j.range.join(',')}]`),
  }),
}));
const png = flag('--png');
if (png !== undefined) {
  const yaw = Number(flag('--yaw') ?? 35);
  writeFileSync(png, await renderTrianglesPng(await glbTriangles(glb), { yawDeg: yaw, label: `${asset.id} · ${asset.stats.triangles} tris` }));
  console.log(`wrote ${png}`);
}
