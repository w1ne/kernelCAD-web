// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Repro: npx tsx docs/demos/drawing-path-qa/demo.ts
// Uses genuine OCCT drawing export, injects a deliberate cubic-path layout
// fault, transcribes both SVGs through the vector-PDF writer, and rasterizes
// real PDF bytes with Poppler. No claimed automatic source/model repair.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { analyzeExportedDrawingSvg } from '../../../src/kernel/backends/occt/drawingVisualQa';
import { svgSheetsToPdf } from '../../../src/kernel/export/pdf/svgSheetToPdf';

const dir = dirname(fileURLToPath(import.meta.url));
await initOcct();
const source = await runAndExport({
  code: 'return box(80,50,12);', fileName: 'fixture-block.kcad.ts',
  format: 'svg-drawing',
  options: { format: 'svg-drawing', sheet: 'a4', autoAnnotate: false, date: '2026-11-09' },
});
if (source.bytes.length < 1000) throw new Error('Expected a genuine OCCT drawing');
const original = new TextDecoder().decode(source.bytes);
const injected = original.replace(/(<g id="view-front"[^>]*>)/,
  '$1<path d="M 15 30 C 90 50 345 60 350 70" stroke="#d22" stroke-width="1.5"/>');
if (injected === original) throw new Error('Failure injection did not affect exported front view');
const originalQa = analyzeExportedDrawingSvg(original, { drawingReport: source.drawingReport });
const injectedQa = analyzeExportedDrawingSvg(injected, { drawingReport: source.drawingReport });
if (originalQa.issues.some(i => i.code === 'view-overflow')) throw new Error('Baseline is not clean');
if (!injectedQa.issues.some(i => i.code === 'view-overflow')) throw new Error('Cubic path overflow was missed');

const artifacts = [
  { id: 'before', svg: injected, qa: injectedQa },
  { id: 'after', svg: original, qa: originalQa },
] as const;
const results = [];
for (const artifact of artifacts) {
  writeFileSync(join(dir, artifact.id + '.svg'), artifact.svg);
  const pdf = svgSheetsToPdf([artifact.svg], {
    title: 'KernelCAD synthetic drawing path QA',
    creator: 'KernelCAD local QA demonstration',
  });
  writeFileSync(join(dir, artifact.id + '.pdf'), pdf);
  execFileSync('pdftoppm', ['-r', '120', '-f', '1', '-l', '1', '-singlefile',
    '-png', join(dir, artifact.id + '.pdf'), join(dir, artifact.id)]);
  const pdfInfo = execFileSync('pdfinfo', [join(dir, artifact.id + '.pdf')], { encoding: 'utf8' });
  const size = pdfInfo.split('\n').find(line => line.startsWith('Page size:')) ?? '';
  results.push({
    id: artifact.id,
    injected: artifact.id === 'before',
    status: artifact.qa.status,
    issueCodes: artifact.qa.issues.map(i => i.code),
    page: size,
    pdfBytes: pdf.length,
    sourceIsRealOCCT: true,
  });
}
writeFileSync(join(dir, 'result.json'), JSON.stringify({
  source: '80 x 50 x 12 mm fixture; original SVG from real OCCT export',
  injection: 'additional cubic SVG path in front view extends past A4 boundary',
  repair: 'original SVG restored; no automatic CAD/annotation repair is claimed',
  outcomes: results,
  limitations: 'Geometry bound validation and real PDF raster evidence, not manufacturing approval',
}, null, 2) + '\n');

async function frame(id: 'before' | 'after', heading: string, result: string): Promise<void> {
  const image = await sharp(readFileSync(join(dir, id + '.png'))).resize({ width: 710 }).png().toBuffer();
  const copy = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">',
    '<text x="42" y="75" font-family="DejaVu Sans" font-size="40" font-weight="bold" fill="#182230">KernelCAD path verification</text>',
    '<text x="42" y="118" font-family="DejaVu Sans" font-size="23" fill="#475569">' + heading + '</text>',
    '<text x="800" y="295" font-family="DejaVu Sans" font-size="28" font-weight="bold" fill="#182230">' + id.toUpperCase() + '</text>',
    '<text x="800" y="338" font-family="DejaVu Sans" font-size="17" fill="#475569">' + result + '</text>',
    '<text x="42" y="688" font-family="DejaVu Sans" font-size="16" fill="#64748b">Real PDF raster from OCCT sheet; synthetic path fault injected for QA</text>',
    '</svg>',
  ].join('');
  await sharp({ create: { width: 1280, height: 720, channels: 4, background: '#fff' } })
    .composite([{ input: image, left: 42, top: 150 },
      { input: Buffer.from(copy), left: 0, top: 0 }])
    .png().toFile(join(dir, id + '-frame.png'));
}
await frame('before', 'Injected cubic path extends beyond A4', 'view-overflow detected');
await frame('after', 'Original engineering sheet restored', 'No view overflow');
execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error',
  '-loop', '1', '-t', '4', '-i', join(dir, 'before-frame.png'),
  '-loop', '1', '-t', '4', '-i', join(dir, 'after-frame.png'),
  '-filter_complex', '[0:v][1:v]concat=n=2:v=1:a=0,format=yuv420p[v]',
  '-map', '[v]', '-r', '24', '-c:v', 'libx264', '-crf', '22', '-pix_fmt', 'yuv420p',
  join(dir, 'demo.mp4')]);
console.log(JSON.stringify(results, null, 2));
