// Render a non-default catalog variant to demonstrate editable parameters.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { exportLowPolyAsset, variantSource } from '../../../src/agent/catalog/catalogStore';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/beverage-bottling-line/rotary-filler.kcad.ts';
const code = readFileSync(join(root, source), 'utf8');
const variant = variantSource(code, { scale: 1.2, accent: '#347b8b' });

await initOcct();
const glb = await exportLowPolyAsset(variant, 'rotary-filler.kcad.ts');
const png = await renderTrianglesPng(await glbTriangles(glb), {
  label: 'Rotary bottle filler · scale 1.20 · blue safety accent',
});
writeFileSync(join(import.meta.dirname, 'rotary-filler-variant.png'), png);
console.log('rendered rotary-filler scale=1.20 accent=#347b8b');
