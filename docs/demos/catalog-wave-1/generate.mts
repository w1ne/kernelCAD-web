// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Catalog wave 1 demo: a contact sheet for each of the five new kits (the
// committed previews), then knob variants of three new assets asked for in
// plain words through get_variant, exported and rendered beside the defaults.
//   npx tsx docs/demos/catalog-wave-1/generate.mts
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
const NEW_KITS = ['tools-equipment', 'containers', 'electronics', 'food-kitchen', 'lighting'];
const VARIANTS: Array<{ id: string; want: string }> = [
  { id: 'cooking-pot', want: 'soup, copper' },
  { id: 'ibc-tote', want: 'wood pallet, 30 fill' },
  { id: 'paper-lantern', want: 'tall, table' },
];
const frameDir = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), 'kcad-catalog-wave-1-'));
let frame = 0;

const esc = (s: unknown) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function chrome(title: string, subtitle: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="100%" height="100%" fill="#f4f7fb"/><rect width="${W}" height="12" fill="#2866d5"/>
    <text x="56" y="68" font-family="Arial,sans-serif" font-size="32" font-weight="700" fill="#17243a">${esc(title)}</text>
    <text x="58" y="100" font-family="Arial,sans-serif" font-size="18" fill="#53657f">${esc(subtitle)}</text>
    ${body}
    <text x="${W - 56}" y="${H - 24}" text-anchor="end" font-family="Arial,sans-serif" font-size="14" fill="#66758b">kernelCAD · original parametric CC0 assets · software render of exported low-poly GLBs</text>
  </svg>`;
}

async function emit(svg: string, overlays: sharp.OverlayOptions[] = [], seconds = 3): Promise<void> {
  const png = await sharp(Buffer.from(svg)).composite(overlays).png().toBuffer();
  for (let i = 0; i < seconds * fps; i++) writeFileSync(join(frameDir, `f-${String(frame++).padStart(4, '0')}.png`), png);
}

function textLines(lines: string[], x: number, y: number, size = 17, color = '#24364f'): string {
  return lines.map((line, i) => `<text x="${x}" y="${y + i * (size + 7)}" font-family="DejaVu Sans Mono,monospace" font-size="${size}" fill="${color}" xml:space="preserve">${esc(line)}</text>`).join('');
}

await initOcct();
const kits = ((await callMcpTool('list_kits', {})) as Json).kits as Json[];
const evidence: Json = { checkedAt: new Date().toISOString(), totalKits: kits.length, kits: [], variants: [] };
const total = kits.reduce((n, k) => n + (k.assets as number), 0);
const added = kits.filter((k) => NEW_KITS.includes(k.id)).reduce((n, k) => n + (k.assets as number), 0);
evidence.totalAssets = total;
evidence.addedAssets = added;

// 1. Contact sheet per new kit.
for (const id of NEW_KITS) {
  const kit = kits.find((k) => k.id === id)!;
  const rows = ((await callMcpTool('get_kit', { id })) as Json).rows as Json[];
  const cols = 6;
  const cell = 188;
  const overlays: sharp.OverlayOptions[] = [];
  for (const [i, row] of rows.entries()) {
    const png = await sharp(join(repoRoot, 'catalog', 'kits', id, 'previews', `${row.id}.png`)).resize(cell, cell).png().toBuffer();
    overlays.push({ input: png, left: 56 + (i % cols) * (cell + 8), top: 130 + Math.floor(i / cols) * (cell + 40) });
  }
  const labels = rows.map((row, i) => `<text x="${56 + (i % cols) * (cell + 8) + cell / 2}" y="${130 + Math.floor(i / cols) * (cell + 40) + cell + 22}" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" fill="#24364f">${esc(row.id)} · ${(row.knobs as string[]).length} knobs</text>`).join('');
  const tris = rows.map((r) => r.triangles as number);
  evidence.kits.push({ id, assets: rows.length, triangles: { min: Math.min(...tris), max: Math.max(...tris) }, ids: rows.map((r) => r.id) });
  await emit(chrome(`New kit: ${kit.title} — ${rows.length} parametric assets`, `Wave 1 adds ${added} assets in five kits (catalog now ${total}). Triangles per asset here: ${Math.min(...tris)}–${Math.max(...tris)}.`, labels), overlays, 4);
}

// 2. Knob variants through get_variant, exported and rendered at the same scale as the defaults.
for (const { id, want } of VARIANTS) {
  const variant = (await callMcpTool('get_variant', { id, want })) as Json;
  const defaultCode = ((await callMcpTool('get_asset', { id })) as Json).code as string;
  const glb = async (code: string) => (await runAndExport({ code, fileName: `${id}.kcad.ts`, format: 'glb', options: { format: 'glb', style: 'lowpoly' } })).bytes;
  const [defaultGlb, variantGlb] = [await glb(defaultCode), await glb(variant.code as string)];
  const [dT, vT] = [await glbTriangles(defaultGlb), await glbTriangles(variantGlb)];
  const tallest = Math.max(...[...dT, ...vT].flatMap((t) => t.v.map((p) => p[1]))) * 1.05;
  const dPng = await renderTrianglesPng(dT, { size: 420, frameHeightM: tallest, label: `defaults · ${dT.length} tris` });
  const vPng = await renderTrianglesPng(vT, { size: 420, frameHeightM: tallest, label: `variant · ${vT.length} tris` });
  evidence.variants.push({ id, want, params: variant.params, unmatched: variant.unmatched, glbSha256: createHash('sha256').update(variantGlb).digest('hex') });
  await emit(chrome(`Knobs: ${id}`, 'Plain words become knob values and a ready .kcad.ts source, exported with style: \'lowpoly\'.', [
    textLines([`get_variant({ id: "${id}", want: "${want}" })`, `params: ${JSON.stringify(variant.params)}`, `unmatched: ${JSON.stringify(variant.unmatched)}`], 56, 150, 18, '#17243a'),
    `<text x="640" y="460" text-anchor="middle" font-family="Arial,sans-serif" font-size="40" fill="#2866d5">→</text>`,
    `<text x="640" y="500" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" fill="#53657f">same scale</text>`,
  ].join('')), [{ input: dPng, left: 56, top: 250 }, { input: vPng, left: 800, top: 250 }], 5);
}

execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(frameDir, 'f-%04d.png'),
  '-vf', 'fps=24', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-movflags', '+faststart', join(here, 'demo.mp4')]);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(frameDir, 'f-0000.png'), join(here, 'poster.png')]);
rmSync(frameDir, { recursive: true, force: true });
evidence.claims = { originalGeometry: true, softwareRender: true, threeJsRendered: false, engineImportTested: false, deployedBehavior: false };
writeFileSync(join(here, 'verification.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`wrote ${join(here, 'demo.mp4')} (${frame} frames at ${fps} fps)`);
