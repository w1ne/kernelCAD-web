import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { renderTrianglesPng, type SoftTriangle } from '../../../scripts/lib/glbSoftwareRender';

const repoRoot = resolve('.');
const bundle = 'artifacts/catalog-demos/mining-crusher-discharge-conveyor-idler-material-review-20261118';
const target = resolve(bundle);
const parts = new Set([
  'impact-idler-0-centre',
  'impact-idler-0-wing-0',
  'impact-idler-0-wing-1',
  'impact-idler-0-frame',
]);

function transform(m: ArrayLike<number>, p: ArrayLike<number>): [number, number, number] {
  return [
    m[0]! * p[0]! + m[4]! * p[1]! + m[8]! * p[2]! + m[12]!,
    m[1]! * p[0]! + m[5]! * p[1]! + m[9]! * p[2]! + m[13]!,
    m[2]! * p[0]! + m[6]! * p[1]! + m[10]! * p[2]! + m[14]!,
  ];
}

function linearToSrgb(color: number): number {
  return color <= 0.0031308 ? 12.92 * color : 1.055 * color ** (1 / 2.4) - 0.055;
}

async function render(sourceSnapshot: string, output: string, label: string): Promise<void> {
  const sourcePath = `${bundle}/render-sources/${label.toLowerCase()}/mining/crusher-discharge-conveyor.kcad.ts`;
  const absoluteSourcePath = resolve(sourcePath);
  await mkdir(resolve(sourcePath, '..'), { recursive: true });
  await copyFile(resolve(sourceSnapshot), absoluteSourcePath);
  const source = sourcePath;
  const { glb } = await buildCatalogAssetWithGlb(repoRoot, source);
  const doc = await new NodeIO().readBinary(glb);
  const triangles: SoftTriangle[] = [];
  const present = new Set<string>();
  for (const node of doc.getRoot().listNodes()) {
    if (!parts.has(node.getName())) continue;
    present.add(node.getName());
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
      const indexAt = (index: number) => indices === null ? index : indices.getScalar(index);
      for (let i = 0; i + 2 < count; i += 3) {
        const verts: SoftTriangle['v'] = [0, 1, 2].map((corner) => transform(world, positions.getElement(indexAt(i + corner), []))) as SoftTriangle['v'];
        const color = colors === null ? base : colors.getElement(indexAt(i), []);
        triangles.push({
          v: verts,
          color: [linearToSrgb(color[0]!), linearToSrgb(color[1]!), linearToSrgb(color[2]!)],
        });
      }
    }
  }
  if (present.size !== parts.size) throw new Error(`${label}: missing selected parts: ${[...parts].filter((name) => !present.has(name)).join(', ')}`);
  await (await import('node:fs/promises')).writeFile(resolve(output), await renderTrianglesPng(triangles, {
    size: 1000,
    yawDeg: 35,
    pitchDeg: 22,
    background: '#f5f7f8',
    label: `${label} · impact idler set 0 · 3456 triangle conveyor`,
  }));
}

await initOcct();
await mkdir(resolve(target, 'focused'), { recursive: true });
await render(`${bundle}/sources/before/crusher-discharge-conveyor.kcad.ts`, `${bundle}/focused/before-idler-set.png`, 'Before');
await render('catalog/kits/mining/crusher-discharge-conveyor.kcad.ts', `${bundle}/focused/after-idler-set.png`, 'After');
