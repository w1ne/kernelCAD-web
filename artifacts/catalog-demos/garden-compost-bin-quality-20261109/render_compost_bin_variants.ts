import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const artifactDir = import.meta.dirname;
const assetPath = 'catalog/kits/garden/compost-bin.kcad.ts';
const source = readFileSync(join(root, assetPath), 'utf8');
const settings = JSON.parse(readFileSync(join(artifactDir, 'demo-settings.json'), 'utf8')) as {
  triangleBudget: number;
  variants: { id: string; frontAccess: string; preset?: string }[];
};

const accessParam = source.match(/param\('frontAccess',\s*'[^']+',\s*\{\s*choices:\s*\[([^\]]+)\]/);
if (accessParam === null) throw new Error('Source has no frontAccess choice parameter');
const allowedAccess = [...accessParam[1]!.matchAll(/'([^']+)'/g)].map((match) => match[1]);
const presetBlock = source.match(/presets\(\s*\{([\s\S]*?)\}\s*\);/);
if (presetBlock === null) throw new Error('Source has no presets() block');
const sourcePresets = Object.fromEntries(
  [...presetBlock[1]!.matchAll(/([A-Za-z_]\w*)\s*:\s*\{([^{}]*)\}/g)].map(([, name, values]) => [
    name!,
    Object.fromEntries([...values!.matchAll(/([A-Za-z_]\w*)\s*:\s*'(#\w{6})'/g)].map(([, key, value]) => [key!, value!])),
  ]),
) as Record<string, Record<string, string>>;

await initOcct();
const outputDir = join(artifactDir, 'variants');
mkdirSync(outputDir, { recursive: true });
for (const variant of settings.variants) {
  if (!allowedAccess.includes(variant.frontAccess)) {
    throw new Error(`${variant.id}: unsupported frontAccess ${variant.frontAccess}`);
  }
  let code = source.replace(
    /(param\('frontAccess',\s*)'[^']+'(\s*,\s*\{)/,
    `$1'${variant.frontAccess}'$2`,
  );
  if (variant.preset !== undefined) {
    const overrides = sourcePresets[variant.preset];
    if (overrides === undefined) throw new Error(`${variant.id}: missing source preset ${variant.preset}`);
    for (const [name, color] of Object.entries(overrides)) {
      const declaration = new RegExp(`(param\\('${name}',\\s*)'#[0-9a-fA-F]{6}'`);
      if (!declaration.test(code)) throw new Error(`${variant.id}: no material param ${name}`);
      code = code.replace(declaration, `$1'${color}'`);
    }
  }
  const result = await runAndExport({
    code,
    fileName: 'compost-bin.kcad.ts',
    scriptDir: join(root, 'catalog/kits/garden'),
    format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: settings.triangleBudget } },
  });
  const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length > 0 || result.bytes.byteLength === 0) {
    throw new Error(errors.map((diagnostic) => diagnostic.message).join('; ') || 'empty GLB');
  }
  const label = variant.preset === undefined ? variant.frontAccess : `${variant.preset} · ${variant.frontAccess}`;
  const png = await renderTrianglesPng(await glbTriangles(result.bytes), { label: `Slatted compost bin · ${label}` });
  writeFileSync(join(outputDir, `${variant.id}.png`), png);
  writeFileSync(join(outputDir, `${variant.id}.sha256`), `${createHash('sha256').update(png).digest('hex')}  ${variant.id}.png\n`);
  console.log(`${variant.id}: ${result.bytes.byteLength} GLB bytes; ${png.length} PNG bytes`);
}
