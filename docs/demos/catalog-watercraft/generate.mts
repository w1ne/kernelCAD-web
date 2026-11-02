// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Catalog wave 2: kit overview, natural-language knob requests, then default
// and resolved low-poly GLB renders at the same scale.
// Run: npx tsx docs/demos/catalog-watercraft/generate.mts

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import sharp from 'sharp';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

type Json = Record<string, any>;

const here = import.meta.dirname;
const repoRoot = resolve(here, '../../..');
const settings = JSON.parse(readFileSync(join(here, 'settings.json'), 'utf8')) as {
  kit: string;
  width: number;
  height: number;
  frameRate: number;
  videoFrameRate: number;
  videoCodec: string;
  pixelFormat: string;
  crf: number;
  render: string;
  auditAllChoices: boolean;
  variants: Array<{ id: string; want: string }>;
};
const W = settings.width;
const H = settings.height;
const frameDir = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), 'kcad-watercraft-demo-'));
let frame = 0;
const catalog = JSON.parse(readFileSync(join(repoRoot, 'catalog/index.json'), 'utf8')) as {
  assets: Array<{ id: string; source: string; origin: string; triangleBudget: number }>;
};

const esc = (s: unknown) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function chrome(title: string, subtitle: string, body: string): string {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' +
    '<rect width="100%" height="100%" fill="#f4f7fb"/><rect width="' + W + '" height="12" fill="#2866d5"/>' +
    '<text x="56" y="68" font-family="Arial,sans-serif" font-size="32" font-weight="700" fill="#17243a">' + esc(title) + '</text>' +
    '<text x="58" y="100" font-family="Arial,sans-serif" font-size="18" fill="#53657f">' + esc(subtitle) + '</text>' +
    body +
    '<text x="' + (W - 56) + '" y="' + (H - 24) + '" text-anchor="end" font-family="Arial,sans-serif" font-size="14" fill="#66758b">kernelCAD · local catalog and export · software-rendered GLB · deployment not verified</text>' +
    '</svg>';
}

async function emit(svg: string, overlays: sharp.OverlayOptions[] = [], seconds = 3): Promise<void> {
  const png = await sharp(Buffer.from(svg)).composite(overlays).png().toBuffer();
  for (let i = 0; i < seconds * settings.frameRate; i++) {
    writeFileSync(join(frameDir, 'f-' + String(frame++).padStart(4, '0') + '.png'), png);
  }
}

function textLines(lines: string[], x: number, y: number, size = 17, color = '#24364f'): string {
  return lines.map((line, i) =>
    '<text x="' + x + '" y="' + (y + i * (size + 7)) + '" font-family="DejaVu Sans Mono,monospace" font-size="' + size + '" fill="' + color + '" xml:space="preserve">' + esc(line) + '</text>',
  ).join('');
}

function materialCount(glb: Uint8Array): number {
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + jsonLength))) as { materials?: unknown[] };
  return json.materials?.length ?? 1;
}

function minUpM(glb: Uint8Array): number {
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + jsonLength))) as {
    asset: { extras: { kernelcad: { stats: { minUpM: number } } } };
  };
  return json.asset.extras.kernelcad.stats.minUpM;
}

function sharedRenderFrame(triangles: Awaited<ReturnType<typeof glbTriangles>>): {
  frameHeightM: number;
  cameraOffsetYM: number;
} {
  const yaw = 35 * Math.PI / 180;
  const pitch = 22 * Math.PI / 180;
  const projected = triangles.flatMap((triangle) => triangle.v.map(([x, y, z]) => {
    const horizontal = x * Math.cos(yaw) + z * Math.sin(yaw);
    const depth = -x * Math.sin(yaw) + z * Math.cos(yaw);
    return [horizontal, y * Math.cos(pitch) - depth * Math.sin(pitch)];
  }));
  const xs = projected.map((point) => point[0]!);
  const ys = projected.map((point) => point[1]!);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    frameHeightM: Math.max(maxX - minX, maxY - minY) * 1.08,
    cameraOffsetYM: -minY / Math.cos(pitch),
  };
}

function offsetForRender(
  triangles: Awaited<ReturnType<typeof glbTriangles>>,
  offsetYM: number,
): Awaited<ReturnType<typeof glbTriangles>> {
  return triangles.map((triangle) => ({
    ...triangle,
    v: triangle.v.map(([x, y, z]) => [x, y + offsetYM, z] as [number, number, number]),
  }));
}

await initOcct();
const kits = ((await callMcpTool('list_kits', {})) as Json).kits as Json[];
const kit = kits.find((candidate) => candidate.id === settings.kit);
if (kit === undefined) throw new Error('kit not found in catalog: ' + settings.kit);
const rows = ((await callMcpTool('get_kit', { id: settings.kit })) as Json).rows as Json[];
const totalAssets = kits.reduce((sum, candidate) => sum + Number(candidate.assets), 0);
const evidence: Json = {
  checkedAt: new Date().toISOString(),
  totalAssets,
  kit: settings.kit,
  addedAssets: rows.length,
  assets: rows.map((row) => ({
    id: row.id,
    triangles: row.triangles,
    knobs: row.knobs,
  })),
  choiceAudit: [],
  variants: [],
  settings,
};

// Build every choice value independently so the recorded budget applies beyond defaults.
const choiceFailures: string[] = [];
if (settings.auditAllChoices) {
  const ids = new Set(rows.map((row) => row.id as string));
  for (const asset of catalog.assets.filter((candidate) => ids.has(candidate.id))) {
    const sourcePath = resolve(repoRoot, asset.source);
    const code = readFileSync(sourcePath, 'utf8');
    const declarations = [...code.matchAll(/param\('([A-Za-z][A-Za-z0-9]*)',\s*'([^']+)',\s*\{\s*choices:\s*\[([^\]]+)\]/g)];
    for (const declaration of declarations) {
      const name = declaration[1];
      const defaultValue = declaration[2];
      const values = [...declaration[3].matchAll(/'([^']+)'/g)].map((match) => match[1]);
      for (const value of values) {
        const from = "param('" + name + "', '" + defaultValue + "'";
        const to = "param('" + name + "', '" + value + "'";
        const choiceCode = code.replace(from, to);
        const result = await runAndExport({
          code: choiceCode,
          fileName: basename(sourcePath),
          scriptDir: dirname(sourcePath),
          format: 'glb',
          options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: asset.triangleBudget } },
        });
        const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
        if (errors.length > 0) {
          throw new Error(asset.id + ' ' + name + '=' + value + ': ' + errors.map((error) => error.message).join('; '));
        }
        const triangles = await glbTriangles(result.bytes);
        const materials = materialCount(result.bytes);
        const minimum = minUpM(result.bytes);
        const onBase = asset.origin !== 'base' || Math.abs(minimum) < 0.0000005;
        const failed = triangles.length === 0 || triangles.length > asset.triangleBudget || materials !== 1 || !onBase;
        if (failed) {
          choiceFailures.push(asset.id + ' ' + name + '=' + value + ': ' +
            triangles.length + '/' + asset.triangleBudget + ' triangles, ' + materials + ' materials, minUpM ' + minimum);
        }
        evidence.choiceAudit.push({
          id: asset.id,
          param: name,
          value,
          triangles: triangles.length,
          triangleBudget: asset.triangleBudget,
          materials,
          minUpM: minimum,
        });
      }
    }
  }
}
if (choiceFailures.length > 0) throw new Error('Choice configurations failed:\n' + choiceFailures.join('\n'));

// One overview frame shows every new kit asset and its indexed knob count.
const cols = 6;
const cell = 180;
const left = 56;
const top = 130;
const gapX = 12;
const gapY = 38;
const overlays: sharp.OverlayOptions[] = [];
for (const [i, row] of rows.entries()) {
  const preview = await sharp(join(repoRoot, 'catalog', 'kits', settings.kit, 'previews', row.id + '.png'))
    .resize(cell, cell).png().toBuffer();
  overlays.push({
    input: preview,
    left: left + (i % cols) * (cell + gapX),
    top: top + Math.floor(i / cols) * (cell + gapY),
  });
}
const labels = rows.map((row, i) => {
  const x = left + (i % cols) * (cell + gapX) + cell / 2;
  const y = top + Math.floor(i / cols) * (cell + gapY) + cell + 20;
  return '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="#24364f">' +
    esc(row.id) + ' · ' + (row.knobs as string[]).length + ' knobs</text>';
}).join('');
const triangles = rows.map((row) => Number(row.triangles));
await emit(chrome(
  kit.title + ' — ' + rows.length + ' parametric assets',
  'Catalog defaults · ' + Math.min(...triangles) + '–' + Math.max(...triangles) + ' triangles per asset',
  labels,
), overlays, 4);

// Resolve each request through the catalog workflow and export both versions.
for (const request of settings.variants) {
  const variant = (await callMcpTool('get_variant', { id: request.id, want: request.want })) as Json;
  const defaultAsset = (await callMcpTool('get_asset', { id: request.id })) as Json;
  const indexedAsset = catalog.assets.find((asset) => asset.id === request.id);
  if (indexedAsset === undefined) throw new Error('asset missing from generated index: ' + request.id);
  if ((variant.unmatched as string[]).length > 0) {
    throw new Error(request.id + ' variant request left unmatched terms: ' + (variant.unmatched as string[]).join(', '));
  }
  const exportGlb = async (code: string) => (await runAndExport({
    code,
    fileName: request.id + '.kcad.ts',
    format: 'glb',
    options: { format: 'glb', style: 'lowpoly' },
  })).bytes;
  const [defaultGlb, variantGlb] = await Promise.all([
    exportGlb(defaultAsset.code as string),
    exportGlb(variant.code as string),
  ]);
  const [defaultTriangles, variantTriangles] = await Promise.all([
    glbTriangles(defaultGlb),
    glbTriangles(variantGlb),
  ]);
  const defaultMaterials = materialCount(defaultGlb);
  const variantMaterials = materialCount(variantGlb);
  const defaultMinUpM = minUpM(defaultGlb);
  const resolvedMinUpM = minUpM(variantGlb);
  const baseOriginOkay = indexedAsset.origin !== 'base' ||
    (Math.abs(defaultMinUpM) < 0.0000005 && Math.abs(resolvedMinUpM) < 0.0000005);
  if (defaultTriangles.length > indexedAsset.triangleBudget || variantTriangles.length > indexedAsset.triangleBudget) {
    throw new Error(request.id + ' exceeded its ' + indexedAsset.triangleBudget + '-triangle budget');
  }
  if (defaultMaterials !== 1 || variantMaterials !== 1) {
    throw new Error(request.id + ' did not export as one material');
  }
  if (!baseOriginOkay) throw new Error(request.id + ' did not stand on its declared base origin');
  const renderFrame = sharedRenderFrame([...defaultTriangles, ...variantTriangles]);
  const frameHeightM = renderFrame.frameHeightM;
  const cameraOffsetYM = renderFrame.cameraOffsetYM;
  const defaultPng = await renderTrianglesPng(offsetForRender(defaultTriangles, cameraOffsetYM), {
    size: 410,
    frameHeightM,
    label: 'default · ' + defaultTriangles.length + ' tris',
  });
  const variantPng = await renderTrianglesPng(offsetForRender(variantTriangles, cameraOffsetYM), {
    size: 410,
    frameHeightM,
    label: 'resolved · ' + variantTriangles.length + ' tris',
  });
  const params = variant.params as Json;
  evidence.variants.push({
    id: request.id,
    want: request.want,
    params,
    unmatched: variant.unmatched,
    defaultTriangles: defaultTriangles.length,
    resolvedTriangles: variantTriangles.length,
    triangleBudget: indexedAsset.triangleBudget,
    defaultMaterials,
    resolvedMaterials: variantMaterials,
    defaultMinUpM,
    resolvedMinUpM,
    renderFrame: { ...renderFrame, cameraOffsetYM },
    defaultGlbSha256: createHash('sha256').update(defaultGlb).digest('hex'),
    resolvedGlbSha256: createHash('sha256').update(variantGlb).digest('hex'),
  });
  const parameterText = JSON.stringify(params);
  await emit(chrome(
    'Resolve knobs: ' + request.id,
    'Catalog request becomes parameter values; export keeps both GLBs in one draw-call material.',
    textLines([
      'get_variant({ id: "' + request.id + '",',
      '  want: "' + request.want + '" })',
      'params: ' + parameterText,
      'unmatched: ' + JSON.stringify(variant.unmatched),
    ], 56, 150, 16, '#17243a') +
      '<text x="640" y="470" text-anchor="middle" font-family="Arial,sans-serif" font-size="38" fill="#2866d5">→</text>' +
      '<text x="640" y="510" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" fill="#53657f">same scale · software render</text>',
    ),
    [{ input: defaultPng, left: 56, top: 260 }, { input: variantPng, left: 814, top: 260 }],
    4,
  );
}

execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-framerate', String(settings.frameRate),
  '-i', join(frameDir, 'f-%04d.png'),
  '-vf', 'fps=' + settings.videoFrameRate,
  '-c:v', settings.videoCodec,
  '-pix_fmt', settings.pixelFormat,
  '-crf', String(settings.crf),
  '-movflags', '+faststart',
  join(here, 'demo.mp4'),
]);
execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error', '-i', join(frameDir, 'f-0000.png'), join(here, 'poster.png'),
]);
rmSync(frameDir, { recursive: true, force: true });
evidence.claims = {
  originalGeometry: true,
  localCatalogWorkflow: true,
  softwareRender: true,
  threeJsRendered: false,
  engineImportTested: false,
  deployedBehavior: false,
  simulation: false,
  hardwareAcceptance: false,
};
writeFileSync(join(here, 'verification.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log('wrote ' + join(here, 'demo.mp4') + ' (' + frame + ' frames at ' + settings.frameRate + ' capture fps)');
