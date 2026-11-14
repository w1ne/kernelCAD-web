// SPDX-License-Identifier: MIT
// Re-render the selected drum assembly from an exported catalog GLB.
// Usage: node_modules/.bin/tsx <this file> <model root relative to repo root> <source path> <output PNG>

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { renderTrianglesPng, type SoftTriangle } from '../../../scripts/lib/glbSoftwareRender';

const mainRoot = resolve(import.meta.dirname, '../../..');
const modelRoot = process.argv[2] === undefined ? undefined : resolve(mainRoot, process.argv[2]);
const sourcePath = process.argv[3];
const outputPath = process.argv[4];
if (modelRoot === undefined || sourcePath === undefined || outputPath === undefined) {
  throw new Error('usage: render_pick_detail.ts <model root relative to repo root> <source path> <output PNG>');
}

const focus = /^(?:arm-gearhead-0|drum-core-0|drum-face-ring-0|drum-back-plate-0|vane-0-\d-\d|vane-pick-0-\d-\d|face-pick-0-\d)$/;
const toSrgb = (color: number): number => color <= 0.0031308
  ? 12.92 * color
  : 1.055 * color ** (1 / 2.4) - 0.055;

const transform = (matrix: ArrayLike<number>, point: ArrayLike<number>): [number, number, number] => [
  matrix[0]! * point[0]! + matrix[4]! * point[1]! + matrix[8]! * point[2]! + matrix[12]!,
  matrix[1]! * point[0]! + matrix[5]! * point[1]! + matrix[9]! * point[2]! + matrix[13]!,
  matrix[2]! * point[0]! + matrix[6]! * point[1]! + matrix[10]! * point[2]! + matrix[14]!,
];

await initOcct();
const built = await buildCatalogAssetWithGlb(modelRoot, sourcePath);
const document = await new NodeIO().readBinary(built.glb);
const triangles: SoftTriangle[] = [];
for (const node of document.getRoot().listNodes()) {
  if (!focus.test(node.getName())) continue;
  const mesh = node.getMesh();
  if (mesh === null) continue;
  const world = node.getWorldMatrix();
  for (const primitive of mesh.listPrimitives()) {
    const positions = primitive.getAttribute('POSITION');
    if (positions === null) continue;
    const vertexColors = primitive.getAttribute('COLOR_0');
    const baseColor = primitive.getMaterial()?.getBaseColorFactor() ?? [0.8, 0.8, 0.8, 1];
    const indices = primitive.getIndices();
    const count = indices === null ? positions.getCount() : indices.getCount();
    const at = (index: number): number => indices === null ? index : indices.getScalar(index);
    for (let index = 0; index + 2 < count; index += 3) {
      const vertices = [0, 1, 2].map((corner) => transform(world, positions.getElement(at(index + corner), []))) as SoftTriangle['v'];
      const color = vertexColors === null ? baseColor : vertexColors.getElement(at(index), []);
      triangles.push({ v: vertices, color: [toSrgb(color[0]!), toSrgb(color[1]!), toSrgb(color[2]!)] });
    }
  }
}
if (triangles.length === 0) throw new Error(`no focused drum triangles found in ${sourcePath}`);

mkdirSync(dirname(resolve(outputPath)), { recursive: true });
writeFileSync(resolve(outputPath), await renderTrianglesPng(triangles, {
  size: 900,
  yawDeg: 35,
  pitchDeg: 18,
  background: '#eef3f8',
  label: `Cutter drum detail · ${built.asset.stats.triangles} tris total`,
}));
console.log(`${relative(mainRoot, resolve(outputPath))}: ${triangles.length} detail triangles`);
