import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const assetPath = 'catalog/kits/recycling-facility/horizontal-baler.kcad.ts';
const outputDir = join(import.meta.dirname, 'preset-variants');
const source = readFileSync(join(root, assetPath), 'utf8');
const settings = JSON.parse(readFileSync(join(import.meta.dirname, 'demo-settings.json'), 'utf8')) as {
  triangleBudget: number;
  presetOverrides: Record<string, Record<string, string>>;
};
const presetBlock = source.match(/presets\(\s*\{([\s\S]*?)\}\s*\);/);
if (presetBlock === null) throw new Error('Source has no presets() block');
const sourcePresets = Object.fromEntries(
  [...presetBlock[1]!.matchAll(/([A-Za-z_]\w*)\s*:\s*\{([^{}]*)\}/g)].map(([, preset, values]) => [
    preset!,
    Object.fromEntries([...values!.matchAll(/([A-Za-z_]\w*)\s*:\s*'(#\w{6})'/g)].map(([, name, value]) => [name!, value!])),
  ]),
);
const canonical = (value: Record<string, string>) => Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
if (JSON.stringify(Object.fromEntries(Object.entries(sourcePresets).map(([name, value]) => [name, canonical(value as Record<string, string>)])))
  !== JSON.stringify(Object.fromEntries(Object.entries(settings.presetOverrides).map(([name, value]) => [name, canonical(value)])))) {
  throw new Error('demo-settings.json preset values differ from the source presets() block');
}

await initOcct();
mkdirSync(outputDir, { recursive: true });
for (const [preset, overrides] of Object.entries(sourcePresets) as [string, Record<string, string>][]) {
  let code = source;
  for (const [name, color] of Object.entries(overrides)) {
    const declaration = new RegExp(`(param\\('${name}', )'#[0-9a-fA-F]{6}'`);
    if (!declaration.test(code)) throw new Error(`Missing color declaration for ${name}`);
    code = code.replace(declaration, `$1'${color}'`);
  }
  const result = await runAndExport({
    code,
    fileName: 'horizontal-baler.kcad.ts',
    scriptDir: join(root, 'catalog/kits/recycling-facility'),
    format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: settings.triangleBudget } },
  });
  const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length > 0 || result.bytes.byteLength === 0) {
    throw new Error(errors.map((diagnostic) => diagnostic.message).join('; ') || 'empty GLB');
  }
  const png = await renderTrianglesPng(await glbTriangles(result.bytes), {
    label: `Horizontal baler · ${preset}`,
  });
  writeFileSync(join(outputDir, `${preset}.png`), png);
  writeFileSync(join(outputDir, `${preset}.sha256`), `${createHash('sha256').update(png).digest('hex')}\n`);
  console.log(`${preset}: ${result.bytes.byteLength} GLB bytes; ${png.length} PNG bytes`);
}
