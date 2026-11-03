// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Run: npx tsx artifacts/catalog-demos/fire-rescue-wave-20261102/generate.mts

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

type Json = Record<string, any>;
type TriangleSet = Awaited<ReturnType<typeof glbTriangles>>;
type CatalogAsset = {
  id: string;
  kit: string;
  title: string;
  source: string;
  origin: string;
  triangleBudget: number;
  params: Array<{ name: string }>;
  stats: { triangles: number; materials: number; minUpM: number };
};

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
  assetsPerOverviewFrame: number;
  variants: Array<{ id: string; want: string }>;
};
const W = settings.width;
const H = settings.height;
const frameDir = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), 'kcad-fire-rescue-'));
const catalog = JSON.parse(readFileSync(join(repoRoot, 'catalog/index.json'), 'utf8')) as {
  kits: Array<{ id: string; title: string; assets: string[] }>;
  assets: CatalogAsset[];
};
let frame = 0;

const esc = (s: unknown) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function slide(title: string, subtitle: string, body: string): string {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' +
    '<rect width="100%" height="100%" fill="#f4f7fb"/><rect width="' + W + '" height="12" fill="#2866d5"/>' +
    '<text x="56" y="68" font-family="Arial,sans-serif" font-size="31" font-weight="700" fill="#17243a">' + esc(title) + '</text>' +
    '<text x="58" y="101" font-family="Arial,sans-serif" font-size="17" fill="#53657f">' + esc(subtitle) + '</text>' + body +
    '<text x="' + (W - 42) + '" y="' + (H - 20) + '" text-anchor="end" font-family="Arial,sans-serif" font-size="13" fill="#66758b">kernelCAD · local catalog source and export · software render · deployment not verified</text>' +
    '</svg>';
}

async function emit(svg: string, overlays: sharp.OverlayOptions[] = [], seconds = 2): Promise<Buffer> {
  const png = await sharp(Buffer.from(svg)).composite(overlays).png().toBuffer();
  for (let i = 0; i < seconds * settings.frameRate; i++) {
    writeFileSync(join(frameDir, 'f-' + String(frame++).padStart(4, '0') + '.png'), png);
  }
  return png;
}

function textLines(lines: string[], x: number, y: number, size = 16, color = '#24364f'): string {
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

function sharedRenderFrame(triangles: TriangleSet): { frameHeightM: number; cameraOffsetYM: number } {
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

function offsetForRender(triangles: TriangleSet, offsetYM: number): TriangleSet {
  return triangles.map((triangle) => ({
    ...triangle,
    v: triangle.v.map(([x, y, z]) => [x, y + offsetYM, z] as [number, number, number]),
  }));
}

async function exportModel(code: string, fileName: string, triangleBudget: number): Promise<Uint8Array> {
  const result = await runAndExport({
    code,
    fileName,
    scriptDir: join(repoRoot, 'catalog', 'kits', settings.kit),
    format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: triangleBudget } },
  });
  const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length > 0) throw new Error(fileName + ': ' + errors.map((error) => error.message).join('; '));
  return result.bytes;
}

async function writeContactSheet(rows: Json[]): Promise<void> {
  const cols = 6;
  const cell = 160;
  const gapX = 26;
  const gapY = 22;
  const top = 118;
  const rowPitch = cell + gapY + 24;
  const height = top + Math.ceil(rows.length / cols) * rowPitch + 38;
  const width = W;
  const left = Math.round((width - (cols * cell + (cols - 1) * gapX)) / 2);
  const overlays: sharp.OverlayOptions[] = [];
  const labels: string[] = [];
  for (const [i, row] of rows.entries()) {
    const x = left + (i % cols) * (cell + gapX);
    const y = top + Math.floor(i / cols) * rowPitch;
    overlays.push({
      input: await sharp(join(repoRoot, 'catalog/kits', settings.kit, 'previews', row.id + '.png')).resize(cell, cell).png().toBuffer(),
      left: x,
      top: y,
    });
    labels.push('<text x="' + (x + cell / 2) + '" y="' + (y + cell + 17) + '" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#24364f">' + esc(row.id) + '</text>');
    labels.push('<text x="' + (x + cell / 2) + '" y="' + (y + cell + 33) + '" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" fill="#53657f">' + row.triangles + ' tris · ' + row.knobs.length + ' knobs</text>');
  }
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '"><rect width="100%" height="100%" fill="#f4f7fb"/><rect width="100%" height="12" fill="#2866d5"/><text x="48" y="62" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="#17243a">Fire & Rescue · 60 original parametric assets</text><text x="50" y="91" font-family="Arial,sans-serif" font-size="16" fill="#53657f">Fire apparatus, water delivery, ladders, rescue tools, protective gear and incident support</text>' + labels.join('') + '</svg>';
  const png = await sharp(Buffer.from(svg)).composite(overlays).png().toBuffer();
  writeFileSync(join(here, 'preview-contact-sheet.png'), png);
}

await initOcct();
const kits = ((await callMcpTool('list_kits', {})) as Json).kits as Json[];
const kit = kits.find((candidate) => candidate.id === settings.kit);
if (kit === undefined) throw new Error('kit not found: ' + settings.kit);
const kitRows = ((await callMcpTool('get_kit', { id: settings.kit })) as Json).rows as Json[];
const totalAssets = kits.reduce((sum, candidate) => sum + Number(candidate.assets), 0);
const assetRows = catalog.assets.filter((asset) => asset.kit === settings.kit);
if (kitRows.length !== 60 || assetRows.length !== 60 || totalAssets !== catalog.assets.length) {
  throw new Error(`catalog mismatch: kit=${kitRows.length}, sources=${assetRows.length}, total=${totalAssets}/${catalog.assets.length}`);
}

const evidence: Json = {
  checkedAt: new Date().toISOString(),
  totalAssets,
  kit: settings.kit,
  addedAssets: kitRows.length,
  query: {},
  assets: kitRows.map((row) => {
    const indexed = catalog.assets.find((asset) => asset.id === row.id && asset.kit === settings.kit);
    if (indexed === undefined || Number(row.triangles) !== indexed.stats.triangles) {
      throw new Error('MCP/index mismatch for ' + row.id);
    }
    return {
      id: row.id,
      triangles: row.triangles,
      triangleBudget: indexed.triangleBudget,
      knobs: row.knobs,
      materials: indexed.stats.materials,
      minUpM: indexed.stats.minUpM,
    };
  }),
  variants: [],
  settings,
};

const search = (await callMcpTool('search_assets', { q: 'fire engine', limit: 8 })) as Json;
evidence.query = { tool: 'search_assets', q: 'fire engine', coverage: search.coverage, rows: search.rows.map((row: Json) => row.id) };
if (!search.rows.some((row: Json) => row.id === 'municipal-fire-engine')) throw new Error('catalog search did not return municipal-fire-engine');

// Render three pages of twenty assets each so all 60 entries remain legible.
const perPage = settings.assetsPerOverviewFrame;
if (perPage !== 20) throw new Error('video settings expect 20 assets per overview frame');
let poster: Buffer | undefined;
for (let page = 0; page < Math.ceil(kitRows.length / perPage); page++) {
  const rows = kitRows.slice(page * perPage, (page + 1) * perPage);
  const cols = 6;
  const cell = 108;
  const gapX = 18;
  const gapY = 20;
  const left = Math.round((W - (cols * cell + (cols - 1) * gapX)) / 2);
  const top = 122;
  const overlays: sharp.OverlayOptions[] = [];
  const labels: string[] = [];
  for (const [i, row] of rows.entries()) {
    const x = left + (i % cols) * (cell + gapX);
    const y = top + Math.floor(i / cols) * (cell + gapY + 28);
    overlays.push({
      input: await sharp(join(repoRoot, 'catalog/kits', settings.kit, 'previews', row.id + '.png')).resize(cell, cell).png().toBuffer(),
      left: x,
      top: y,
    });
    const label = String(row.id).length > 18 ? String(row.id).slice(0, 17) + '…' : String(row.id);
    labels.push('<text x="' + (x + cell / 2) + '" y="' + (y + cell + 15) + '" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" fill="#24364f">' + esc(label) + '</text>');
    labels.push('<text x="' + (x + cell / 2) + '" y="' + (y + cell + 28) + '" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" fill="#53657f">' + row.triangles + ' tris · ' + row.knobs.length + ' knobs</text>');
  }
  const first = page * perPage + 1;
  const last = Math.min((page + 1) * perPage, kitRows.length);
  const current = await emit(
    slide('Fire & Rescue · asset index ' + (page + 1) + ' / 3', `${first}–${last} of 60 assets · CC0 · scale and palette controls · local catalog`, labels.join('')),
    overlays,
    2,
  );
  if (poster === undefined) poster = current;
}

await writeContactSheet(kitRows);

for (const request of settings.variants) {
  const indexed = catalog.assets.find((asset) => asset.id === request.id && asset.kit === settings.kit);
  if (indexed === undefined) throw new Error('asset missing from index: ' + request.id);
  const base = (await callMcpTool('get_asset', { id: request.id })) as Json;
  const variant = (await callMcpTool('get_variant', { id: request.id, want: request.want })) as Json;
  if ((variant.unmatched as string[]).length > 0) {
    throw new Error(request.id + ' variant request left unmatched: ' + variant.unmatched.join(', '));
  }
  const defaultGlb = await exportModel(base.code as string, request.id + '.kcad.ts', indexed.triangleBudget);
  const resolvedGlb = await exportModel(variant.code as string, request.id + '.kcad.ts', indexed.triangleBudget);
  const [defaultTriangles, resolvedTriangles] = await Promise.all([glbTriangles(defaultGlb), glbTriangles(resolvedGlb)]);
  const defaultMaterials = materialCount(defaultGlb);
  const resolvedMaterials = materialCount(resolvedGlb);
  const defaultBase = minUpM(defaultGlb);
  const resolvedBase = minUpM(resolvedGlb);
  const baseOriginOkay = indexed.origin !== 'base' || (Math.abs(defaultBase) < 0.0000005 && Math.abs(resolvedBase) < 0.0000005);
  if (defaultTriangles.length > indexed.triangleBudget || resolvedTriangles.length > indexed.triangleBudget) {
    throw new Error(request.id + ' exceeded triangle budget ' + indexed.triangleBudget);
  }
  if (defaultMaterials !== 1 || resolvedMaterials !== 1 || !baseOriginOkay) {
    throw new Error(request.id + ' failed material/base audit: ' + defaultMaterials + '/' + resolvedMaterials + ' materials, minUpM ' + defaultBase + '/' + resolvedBase);
  }
  const renderFrame = sharedRenderFrame([...defaultTriangles, ...resolvedTriangles]);
  const defaultPng = await renderTrianglesPng(offsetForRender(defaultTriangles, renderFrame.cameraOffsetYM), {
    size: 410,
    frameHeightM: renderFrame.frameHeightM,
    label: 'default · ' + defaultTriangles.length + ' tris',
  });
  const resolvedPng = await renderTrianglesPng(offsetForRender(resolvedTriangles, renderFrame.cameraOffsetYM), {
    size: 410,
    frameHeightM: renderFrame.frameHeightM,
    label: 'resolved · ' + resolvedTriangles.length + ' tris',
  });
  const params = variant.params as Json;
  evidence.variants.push({
    id: request.id,
    want: request.want,
    params,
    unmatched: variant.unmatched,
    matched: variant.matched,
    defaultTriangles: defaultTriangles.length,
    resolvedTriangles: resolvedTriangles.length,
    triangleBudget: indexed.triangleBudget,
    defaultMaterials,
    resolvedMaterials,
    defaultMinUpM: defaultBase,
    resolvedMinUpM: resolvedBase,
    defaultGlbSha256: createHash('sha256').update(defaultGlb).digest('hex'),
    resolvedGlbSha256: createHash('sha256').update(resolvedGlb).digest('hex'),
  });
  const text = textLines([
    'get_variant({ id: "' + request.id + '",',
    '  want: "' + request.want + '" })',
    'params: ' + JSON.stringify(params),
    'unmatched: ' + JSON.stringify(variant.unmatched),
    'export: one material · ' + indexed.triangleBudget + ' triangle budget',
  ], 56, 152, 15, '#17243a');
  await emit(
    slide('Resolve and export · ' + request.id, 'Catalog variant request · default and resolved GLBs shown at the same camera scale', text),
    [{ input: defaultPng, left: 56, top: 280 }, { input: resolvedPng, left: 814, top: 280 }],
    4,
  );
}

try {
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
  if (poster !== undefined) writeFileSync(join(here, 'poster.png'), poster);
  const evidencePath = join(here, 'verification.json');
  evidence.claims = {
    originalGeometry: true,
    localCatalogSearchAndVariantWorkflow: true,
    glbExport: true,
    softwareRender: true,
    threeJsRendered: false,
    deployedBehavior: false,
    simulation: false,
    hardwareAcceptance: false,
  };
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
  console.log('wrote ' + join(here, 'demo.mp4') + ' (' + frame + ' frames at ' + settings.frameRate + ' capture fps)');
} finally {
  rmSync(frameDir, { recursive: true, force: true });
}
