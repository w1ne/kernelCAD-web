// Render a changed catalog configuration from the same native source.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { exportLowPolyAsset, variantSource } from '../../../src/agent/catalog/catalogStore';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/vet-clinic/mobile-ultrasound-cart.kcad.ts';
const code = readFileSync(join(root, source), 'utf8');
const variant = variantSource(code, { scale: 1.15, color: '#4b817b' });

await initOcct();
const glb = await exportLowPolyAsset(variant, 'mobile-ultrasound-cart.kcad.ts');
const png = await renderTrianglesPng(await glbTriangles(glb), {
  label: 'Mobile ultrasound cart · scale 1.15 · teal color',
});
writeFileSync(join(import.meta.dirname, 'ultrasound-cart-variant.png'), png);
console.log('rendered mobile-ultrasound-cart scale=1.15 color=#4b817b');
