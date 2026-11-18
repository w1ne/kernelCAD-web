// Render one photo-video-studio source (optionally with knob overrides) to a scratch PNG for authoring checks.
// Run: npx tsx artifacts/catalog-demos/photo-video-studio-silhouette-20261106/quick_render.ts <id> <out.png> [yaw] [pitch] [key=value ...]
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { variantSource } from '../../../src/agent/catalog/catalogStore';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const [id, out, yaw, pitch, ...kv] = process.argv.slice(2);
const dir = resolve(root, 'catalog/kits/photo-video-studio');
const source = readFileSync(resolve(dir, id + '.kcad.ts'), 'utf8');
const values = Object.fromEntries(kv.map((s) => s.split('=')));
await initOcct();
const exported = await runAndExport({
  code: kv.length ? variantSource(source, values) : source,
  fileName: id + '.kcad.ts',
  scriptDir: dir,
  format: 'glb',
  options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 20000 } },
});
for (const d of exported.diagnostics) console.log(d.severity, d.message);
const tris = await glbTriangles(exported.bytes);
writeFileSync(out, await renderTrianglesPng(tris, {
  label: `${id} ${tris.length} tris`,
  yawDeg: yaw && yaw !== '-' ? Number(yaw) : undefined,
  pitchDeg: pitch && pitch !== '-' ? Number(pitch) : undefined,
}));
console.log(id, tris.length, 'tris');
