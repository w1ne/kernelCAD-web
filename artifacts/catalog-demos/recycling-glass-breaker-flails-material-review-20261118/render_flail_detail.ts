// SPDX-License-Identifier: MIT
// Render the actual exported GLB rotor parts from retained before/after source.
// The before snapshot reproduces the former hard-coded dark flail finish.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct, resetOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { renderTrianglesPng, type SoftTriangle } from '../../../scripts/lib/glbSoftwareRender';

const repoRoot = resolve(import.meta.dirname, '../../..');
const bundle = resolve(import.meta.dirname);
const sourcePath = 'catalog/kits/recycling-facility/glass-breaker-screen.kcad.ts';
const beforeSource = join(bundle, 'sources/before/glass-breaker-screen.kcad.ts');
const tmpBefore = join(bundle, 'source-replay-tmp/recycling-facility/glass-breaker-screen.kcad.ts');
const targetParts = new Set([
  'rotor-shaft',
  'rotor-disc-0', 'rotor-disc-1', 'rotor-disc-2', 'rotor-disc-3',
  ...Array.from({ length: 16 }, (_, i) => `flail-${Math.floor(i / 4)}-${i % 4}`),
]);

const toSrgb = (channel: number): number =>
  channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055;

function transformed(matrix: ArrayLike<number>, point: ArrayLike<number>): [number, number, number] {
  return [
    matrix[0]! * point[0]! + matrix[4]! * point[1]! + matrix[8]! * point[2]! + matrix[12]!,
    matrix[1]! * point[0]! + matrix[5]! * point[1]! + matrix[9]! * point[2]! + matrix[13]!,
    matrix[2]! * point[0]! + matrix[6]! * point[1]! + matrix[10]! * point[2]! + matrix[14]!,
  ];
}

async function rotorTriangles(glb: Uint8Array): Promise<SoftTriangle[]> {
  const document = await new NodeIO().readBinary(glb);
  const triangles: SoftTriangle[] = [];
  for (const node of document.getRoot().listNodes()) {
    if (!targetParts.has(node.getName())) continue;
    const mesh = node.getMesh();
    if (mesh === null) continue;
    const world = node.getWorldMatrix();
    for (const primitive of mesh.listPrimitives()) {
      const positions = primitive.getAttribute('POSITION');
      if (positions === null) continue;
      const colors = primitive.getAttribute('COLOR_0');
      const base = primitive.getMaterial()?.getBaseColorFactor() ?? [0.8, 0.8, 0.8, 1];
      const indices = primitive.getIndices();
      const count = indices === null ? positions.getCount() : indices.getCount();
      const at = (index: number): number => indices === null ? index : indices.getScalar(index);
      for (let index = 0; index + 2 < count; index += 3) {
        const vertices = [0, 1, 2].map((corner) =>
          transformed(world, positions.getElement(at(index + corner), [])),
        ) as SoftTriangle['v'];
        const rawColor = colors === null ? base : colors.getElement(at(index), []);
        triangles.push({
          v: vertices,
          color: [toSrgb(rawColor[0]!), toSrgb(rawColor[1]!), toSrgb(rawColor[2]!)],
        });
      }
    }
  }
  return triangles;
}

async function main(): Promise<void> {
  const source = readFileSync(beforeSource, 'utf8');
  mkdirSync(dirname(tmpBefore), { recursive: true });
  writeFileSync(tmpBefore, source);
  try {
    await initOcct();
    const before = await buildCatalogAssetWithGlb(repoRoot, relative(repoRoot, tmpBefore));
    await resetOcct();
    const after = await buildCatalogAssetWithGlb(repoRoot, sourcePath);
    const beforeTriangles = await rotorTriangles(before.glb);
    const afterTriangles = await rotorTriangles(after.glb);
    const outDir = join(bundle, 'previews', 'rotor-detail');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'before-former-dark-flails.png'), await renderTrianglesPng(beforeTriangles, {
      size: 640, yawDeg: 35, pitchDeg: 22, label: 'Former dark flails',
    }));
    writeFileSync(join(outDir, 'after-editable-wear-steel.png'), await renderTrianglesPng(afterTriangles, {
      size: 640, yawDeg: 35, pitchDeg: 22, label: 'Editable wear steel',
    }));
    console.log(JSON.stringify({
      beforeTriangles: before.asset.stats.triangles,
      afterTriangles: after.asset.stats.triangles,
      rotorTrianglesBefore: beforeTriangles.length,
      rotorTrianglesAfter: afterTriangles.length,
      parts: targetParts.size,
      outputs: [join(outDir, 'before-former-dark-flails.png'), join(outDir, 'after-editable-wear-steel.png')],
      note: 'Actual exported GLBs, same rotor geometry and view; former source snapshot versus current source.',
    }, null, 2));
  } finally {
    rmSync(join(bundle, 'source-replay-tmp'), { recursive: true, force: true });
  }
}

await main();
