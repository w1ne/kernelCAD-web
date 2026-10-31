// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Asset catalog demo: one contact sheet per kit (the committed previews), then
// real answers of the catalog MCP tools (search_assets with an honest gap,
// find_matching, get_variant) with the variant exported and rendered.
//   npx tsx docs/demos/asset-catalog/generate.mts
// Writes demo.mp4, poster.png and verification.json beside this file.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

type Json = Record<string, any>;

const here = import.meta.dirname;
const repoRoot = resolve(here, '../../..');
const W = 1280;
const H = 720;
const fps = 2;
const frameDir = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), 'kcad-asset-catalog-'));
let frame = 0;

const esc = (s: unknown) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function chrome(title: string, subtitle: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="100%" height="100%" fill="#f4f7fb"/><rect width="${W}" height="12" fill="#2866d5"/>
    <text x="56" y="68" font-family="Arial,sans-serif" font-size="32" font-weight="700" fill="#17243a">${esc(title)}</text>
    <text x="58" y="100" font-family="Arial,sans-serif" font-size="18" fill="#53657f">${esc(subtitle)}</text>
    ${body}
    <text x="${W - 56}" y="${H - 24}" text-anchor="end" font-family="Arial,sans-serif" font-size="14" fill="#66758b">kernelCAD · original parametric assets · software render of exported low-poly GLBs</text>
  </svg>`;
}

async function emit(svg: string, overlays: sharp.OverlayOptions[] = [], seconds = 3): Promise<void> {
  const png = await sharp(Buffer.from(svg)).composite(overlays).png().toBuffer();
  for (let i = 0; i < seconds * fps; i++) writeFileSync(join(frameDir, `f-${String(frame++).padStart(4, '0')}.png`), png);
}

function textLines(lines: string[], x: number, y: number, size = 17, color = '#24364f'): string {
  return lines.map((line, i) => `<text x="${x}" y="${y + i * (size + 7)}" font-family="DejaVu Sans Mono,monospace" font-size="${size}" fill="${color}">${esc(line)}</text>`).join('');
}

await initOcct();
const kits = (await callMcpTool('list_kits', {}) as Json).kits as Json[];
const evidence: Json = { checkedAt: new Date().toISOString(), kits: [], queries: [] };

// 1. Contact sheet per kit.
for (const kit of kits) {
  const rows = ((await callMcpTool('get_kit', { id: kit.id })) as Json).rows as Json[];
  const cols = 6;
  const cell = Math.min(196, Math.floor((H - 150) / Math.ceil(rows.length / cols)) - 8);
  const overlays: sharp.OverlayOptions[] = [];
  for (const [i, row] of rows.entries()) {
    const png = await sharp(join(repoRoot, 'catalog', 'kits', kit.id, 'previews', `${row.id}.png`)).resize(cell, cell).png().toBuffer();
    overlays.push({ input: png, left: 56 + (i % cols) * (cell + 8), top: 124 + Math.floor(i / cols) * (cell + 8) });
  }
  const tris = rows.map((r) => r.triangles as number);
  evidence.kits.push({ id: kit.id, assets: rows.length, triangles: { min: Math.min(...tris), max: Math.max(...tris) } });
  await emit(chrome(`Kit: ${kit.title} — ${rows.length} parametric assets`, `${kit.description} Triangles per asset ${Math.min(...tris)}–${Math.max(...tris)}.`, ''), overlays, 4);
}

// 2. search_assets: a hit and an honest gap.
const hit = await callMcpTool('search_assets', { q: 'bench', limit: 4 }) as Json;
const gap = await callMcpTool('search_assets', { q: 'spaceship hangar' }) as Json;
evidence.queries.push({ tool: 'search_assets', q: 'bench', coverage: hit.coverage, rows: hit.rows.map((r: Json) => r.id) });
evidence.queries.push({ tool: 'search_assets', q: 'spaceship hangar', coverage: gap.coverage, unmatched: gap.unmatched_terms });
await emit(chrome('search_assets', 'Rows carry triangles, size in metres and knobs; coverage says how far to trust the answer.', [
  textLines(['search_assets({ q: "bench" })', `coverage: ${hit.coverage}   total: ${hit.total}`], 56, 150, 19, '#17243a'),
  textLines(hit.rows.map((r: Json) => `${r.id.padEnd(22)} ${String(r.triangles).padStart(4)} tris  ${r.size_m.map((v: number) => v.toFixed(2)).join(' x ')} m  knobs: ${r.knobs.join(', ')}`.slice(0, 118)), 56, 214),
  textLines(['search_assets({ q: "spaceship hangar" })', `coverage: ${gap.coverage}   unmatched_terms: ${JSON.stringify(gap.unmatched_terms)}`], 56, 400, 19, '#17243a'),
  textLines((gap.next as string).match(/.{1,100}(\s|$)/g)!.map((s) => s.trim()), 56, 464, 16, '#8a3b12'),
].join('')), [], 6);

// 3. find_matching.
const anchor = (await callMcpTool('search_assets', { q: 'tree', limit: 1 }) as Json).rows[0] as Json;
const match = await callMcpTool('find_matching', { id: anchor.id, limit: 8 }) as Json;
evidence.queries.push({ tool: 'find_matching', id: anchor.id, rows: match.rows.map((r: Json) => [r.id, r.reasons]) });
await emit(chrome('find_matching', `What belongs in a scene with ${anchor.id}: same kit, shared compat tags, palette, scale — spread across categories.`, [
  textLines([`find_matching({ id: "${anchor.id}" })`], 56, 150, 19, '#17243a'),
  textLines(match.rows.map((r: Json) => `${r.id.padEnd(22)} ${r.category.padEnd(10)} score ${String(r.score).padStart(2)}  ${r.reasons.join(', ')}`.slice(0, 118)), 56, 196),
].join('')), [], 5);

// 4. get_variant: plain words -> knobs -> exported GLB.
const variantId = anchor.id;
const want = 'taller, autumn, five tiers';
const variant = await callMcpTool('get_variant', { id: variantId, want }) as Json;
const exported = await runAndExport({
  code: variant.code, fileName: `${variantId}.kcad.ts`, format: 'glb',
  options: { format: 'glb', style: 'lowpoly' },
});
const defaultCode = (await callMcpTool('get_asset', { id: variantId }) as Json).code as string;
const defaultGlb = (await runAndExport({ code: defaultCode, fileName: `${variantId}.kcad.ts`, format: 'glb', options: { format: 'glb', style: 'lowpoly' } })).bytes;
const [defaultTris, variantTris] = [await glbTriangles(defaultGlb), await glbTriangles(exported.bytes)];
const tallest = Math.max(...[...defaultTris, ...variantTris].flatMap((t) => t.v.map((p) => p[1]))) * 1.05;
const variantPng = await renderTrianglesPng(variantTris, { size: 420, frameHeightM: tallest, label: `variant · ${variantTris.length} tris` });
const defaultPng = await renderTrianglesPng(defaultTris, { size: 420, frameHeightM: tallest, label: `defaults · ${defaultTris.length} tris` });
evidence.queries.push({ tool: 'get_variant', id: variantId, want, params: variant.params, unmatched: variant.unmatched, glbSha256: createHash('sha256').update(exported.bytes).digest('hex') });
await emit(chrome('get_variant', `Plain words become knob values and a ready .kcad.ts source; exported here with style: 'lowpoly'.`, [
  textLines([`get_variant({ id: "${variantId}", want: "${want}" })`, `params: ${JSON.stringify(variant.params)}`, `unmatched: ${JSON.stringify(variant.unmatched)}`], 56, 150, 18, '#17243a'),
  `<text x="640" y="460" text-anchor="middle" font-family="Arial,sans-serif" font-size="40" fill="#2866d5">→</text>`,
  `<text x="640" y="500" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" fill="#53657f">same scale</text>`,
].join('')), [{ input: defaultPng, left: 56, top: 250 }, { input: variantPng, left: 800, top: 250 }], 6);

execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(frameDir, 'f-%04d.png'),
  '-vf', 'fps=24', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-movflags', '+faststart', join(here, 'demo.mp4')]);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(frameDir, 'f-0000.png'), join(here, 'poster.png')]);
rmSync(frameDir, { recursive: true, force: true });
evidence.claims = { originalGeometry: true, softwareRender: true, threeJsRendered: false, engineImportTested: false, deployedBehavior: false };
writeFileSync(join(here, 'verification.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`wrote ${join(here, 'demo.mp4')} (${frame} frames at ${fps} fps)`);
