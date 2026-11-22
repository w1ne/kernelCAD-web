// Render actual named source presets for the tracker and battery container.
// Run: npx tsx artifacts/catalog-demos/solar-energy-quality-20261106/render_solar_presets.ts
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initOcct, resetOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { variantSource } from '../../../src/agent/catalog/catalogStore';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const bundle = resolve(import.meta.dirname);
const outputDir = resolve(bundle, 'preset-variants');
mkdirSync(outputDir, { recursive: true });

function readPreset(source: string, name: string): Record<string, string> {
  const match = source.match(new RegExp(`${name}:\\s*(\\{[^\\n]+\\})`));
  if (!match) throw new Error(`could not read ${name} preset`);
  const json = match[1]!
    .replace(/([A-Za-z_]\w*)\s*:/g, '"$1":')
    .replaceAll("'", '"');
  return JSON.parse(json) as Record<string, string>;
}

await initOcct();
const variants = [];
for (const assetId of ['solar-battery-container', 'single-axis-solar-tracker']) {
  const sourcePath = resolve(root, `catalog/kits/solar-energy/${assetId}.kcad.ts`);
  const source = readFileSync(sourcePath, 'utf8');
  for (const preset of ['fieldService', 'highVisibility']) {
    const values = readPreset(source, preset);
    const code = variantSource(source, values);
    const exported = await runAndExport({
      code,
      fileName: `${assetId}.kcad.ts`,
      format: 'glb',
      options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 1800 } },
    });
    const errors = exported.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    if (errors.length || exported.bytes.byteLength === 0) {
      throw new Error(`${assetId}/${preset} export failed: ${errors.map((error) => error.message).join('; ')}`);
    }
    const png = `${assetId}-${preset}.png`;
    writeFileSync(resolve(outputDir, png), await renderTrianglesPng(await glbTriangles(exported.bytes), {
      label: `${assetId.replaceAll('-', ' ')} · ${preset}`,
    }));
    variants.push({
      assetId,
      preset,
      values,
      source: `catalog/kits/solar-energy/${assetId}.kcad.ts`,
      sourceSha256: createHash('sha256').update(source).digest('hex'),
      triangles: exported.extras?.stats?.triangles,
      png: `preset-variants/${png}`,
    });
    await resetOcct();
  }
}

const evidence = {
  invocation: 'npx tsx artifacts/catalog-demos/solar-energy-quality-20261106/render_solar_presets.ts',
  exporter: 'runAndExport(format="glb", options={ format: "glb", style: "lowpoly", lowpoly: { maxTriangles: 1800 } })',
  renderer: 'scripts/lib/glbSoftwareRender.ts:renderTrianglesPng',
  variants,
};
writeFileSync(resolve(bundle, 'preset-variants.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
