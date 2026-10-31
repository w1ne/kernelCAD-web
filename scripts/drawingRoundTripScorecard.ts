// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Drawing round-trip scorecard. Every reference part with an analytic volume
// (assets/reference-parts/scorecard.json) is drawn by kernelCAD's own
// pdf-drawing exporter (auto-annotated, A3, third angle), read back by
// drawing_to_cad, and the emitted script is rebuilt and measured. A part
// passes when the rebuilt volume (the "mass check") and bbox extents match
// the analytic values. This scores the reader on clean vector sheets drawn
// by kernelCAD; it says nothing about scanned or third-party drawings.
//
// Run: npx tsx scripts/drawingRoundTripScorecard.ts [--out docs/drawing-roundtrip-scorecard.md]

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAndExport } from '../src/agent/script-runtime/export';
import { drawingToCadTool } from '../src/agent/mcp/tools/drawingToCad';
import { buildModel } from '../src/modeling/buildModel';
import { initOcct } from '../src/kernel/backends/occt/occtBackend';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Mass-check tolerance: relative volume error a pass allows. */
export const VOLUME_TOLERANCE = 0.001;
/** Absolute tolerance on each bbox extent (mm). */
export const EXTENT_TOLERANCE_MM = 0.05;

export interface CorpusPart {
  id: string;
  name: string;
  source: string;
  expected: { volumeMm3: number; bbox: { min: number[]; max: number[] } };
}

export type RoundTripStatus = 'PASS' | 'WRONG' | 'REFUSED' | 'ERROR';

export interface RoundTripResult {
  id: string;
  name: string;
  status: RoundTripStatus;
  volumeError?: number;
  extentErrorMm?: number;
  build?: string;
  detail?: string;
}

function extents(b: { min: readonly number[]; max: readonly number[] }): number[] {
  return [0, 1, 2].map((i) => b.max[i] - b.min[i]);
}

/** Compare a rebuilt volume and bbox with the analytic ground truth. Extents are sorted:
 *  the reader may lay the part out on different axes than the source. */
export function judge(
  expected: CorpusPart['expected'],
  actual: { volumeMm3: number; bbox: { min: readonly number[]; max: readonly number[] } },
): Pick<RoundTripResult, 'status' | 'volumeError' | 'extentErrorMm'> {
  const volumeError = (actual.volumeMm3 - expected.volumeMm3) / expected.volumeMm3;
  const want = extents(expected.bbox).sort((a, b) => a - b);
  const got = extents(actual.bbox).sort((a, b) => a - b);
  const extentErrorMm = Math.max(...want.map((w, i) => Math.abs(w - got[i])));
  const ok = Math.abs(volumeError) <= VOLUME_TOLERANCE && extentErrorMm <= EXTENT_TOLERANCE_MM;
  return { status: ok ? 'PASS' : 'WRONG', volumeError, extentErrorMm };
}

function firstError(diagnostics: ReadonlyArray<{ severity: string; code: string; message: string }>): string | undefined {
  const d = diagnostics.find((x) => x.severity === 'error');
  return d ? `${d.code}: ${d.message}` : undefined;
}

export async function runPart(part: CorpusPart): Promise<RoundTripResult> {
  const base = { id: part.id, name: part.name };
  try {
    const code = await readFile(resolve(ROOT, part.source), 'utf8');
    const sheet = await runAndExport({ code, fileName: `${part.id}.kcad.ts`, format: 'pdf-drawing' });
    const exportError = firstError(sheet.diagnostics);
    if (exportError || sheet.bytes.length === 0) return { ...base, status: 'ERROR', detail: `drawing export: ${exportError ?? 'empty'}` };
    const read = await drawingToCadTool({ pdfBase64: Buffer.from(sheet.bytes).toString('base64') });
    if (!read.ok || !read.script) {
      return { ...base, status: 'REFUSED', detail: firstError(read.diagnostics) ?? 'no script returned' };
    }
    const build = read.reconstruction ? `${read.reconstruction.kind} (${read.reconstruction.holeCount} holes)` : undefined;
    const model = await buildModel({ code: read.script, fileName: `${part.id}.rebuilt.kcad.ts` });
    try {
      const buildError = firstError(model.diagnostics);
      if (buildError || !model.rootShape || model.rootShape.isEmpty()) {
        return { ...base, status: 'ERROR', ...(build ? { build } : {}), detail: `rebuilt script: ${buildError ?? 'no solid'}` };
      }
      const verdict = judge(part.expected, { volumeMm3: model.rootShape.volume(), bbox: model.rootShape.boundingBox({ exact: true }) });
      return { ...base, ...verdict, ...(build ? { build } : {}) };
    } finally {
      model.rootShape?.dispose?.();
    }
  } catch (e) {
    return { ...base, status: 'ERROR', detail: e instanceof Error ? e.message : String(e) };
  }
}

const pct = (v: number | undefined) => (v === undefined ? '—' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(3)}%`);
const mm = (v: number | undefined) => (v === undefined ? '—' : `${v.toFixed(3)} mm`);
const cell = (s: string | undefined) => (s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').slice(0, 160);

export function renderReport(results: readonly RoundTripResult[], raster: string): string {
  const pass = results.filter((r) => r.status === 'PASS').length;
  const count = (s: RoundTripStatus) => results.filter((r) => r.status === s).length;
  const lines = [
    '# Drawing round-trip scorecard',
    '',
    `**Result:** ${pass}/${results.length} parts rebuilt to the right volume and size from their drawing alone ` +
      `(${count('WRONG')} wrong, ${count('REFUSED')} refused, ${count('ERROR')} errors).`,
    '',
    'Each reference part in `assets/reference-parts/scorecard.json` is drawn by kernelCAD\'s `pdf-drawing` exporter ' +
      '(automatic dimensions, A3, third-angle). `drawing_to_cad` reads only that PDF and emits a script. ' +
      'The script is rebuilt and measured against the analytic values. ' +
      `A part passes when its volume is within ±${VOLUME_TOLERANCE * 100}% (a mass check) and every bbox extent is within ${EXTENT_TOLERANCE_MM} mm.`,
    '',
    '**Scope:** these are clean vector sheets drawn by kernelCAD itself, so the score is an upper bound on what the reader ' +
      'does with third-party drawings. Scanned or raster drawings are out of scope for this reader (see the last section).',
    '',
    'Regenerate with `npm run drawing-roundtrip:scorecard`.',
    '',
    '| Part | Rebuilt as | Δ volume | Max Δ extent | Result | Detail |',
    '| --- | --- | ---: | ---: | --- | --- |',
    ...results.map((r) => `| ${r.name} | ${cell(r.build) || '—'} | ${pct(r.volumeError)} | ${mm(r.extentErrorMm)} | ${r.status} | ${cell(r.detail)} |`),
    '',
    '## Raster drawings',
    '',
    `\`tests/fixtures/drawing-pdf/raster-only.pdf\` (an image-only page): ${raster}`,
    '',
  ];
  return lines.join('\n');
}

async function rasterVerdict(): Promise<string> {
  const r = await drawingToCadTool({ path: resolve(ROOT, 'tests/fixtures/drawing-pdf/raster-only.pdf') });
  return r.ok ? 'read (unexpected)' : `refused — ${cell(firstError(r.diagnostics) ?? 'no script')}`;
}

async function main(): Promise<void> {
  const flag = process.argv.indexOf('--out');
  const out = resolve(ROOT, flag >= 0 ? process.argv[flag + 1] : 'docs/drawing-roundtrip-scorecard.md');
  await initOcct();
  const corpus = JSON.parse(await readFile(resolve(ROOT, 'assets/reference-parts/scorecard.json'), 'utf8')) as { parts: CorpusPart[] };
  const results: RoundTripResult[] = [];
  for (const part of corpus.parts) {
    const r = await runPart(part);
    results.push(r);
    console.log(`${r.status.padEnd(7)} ${part.id}${r.detail ? `  ${r.detail.slice(0, 120)}` : ''}`);
  }
  await writeFile(out, renderReport(results, await rasterVerdict()), 'utf8');
  await writeFile(out.replace(/\.md$/, '.json'), JSON.stringify(results, null, 2) + '\n', 'utf8');
  console.log(`wrote ${out}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main();
}
