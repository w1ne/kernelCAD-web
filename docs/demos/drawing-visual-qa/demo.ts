// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Reproduce: npx tsx docs/demos/drawing-visual-qa/demo.ts
// Requires: pdftoppm, pdfinfo and ffmpeg on PATH.
// Creates genuine vector-PDF exports through the public runAndExport path,
// renders each PDF with Poppler, and makes a short local-validation MP4.
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';

const dir = dirname(fileURLToPath(import.meta.url));
const note = 'INSPECT MACHINED EDGE BEFORE ASSEMBLY AND RECORD ACTUAL LENGTH';
const base = { format: 'pdf-drawing' as const, sheet: 'a4' as const,
  autoAnnotate: false, date: '2026-11-09',
  annotations: [{ id: 'inspection', kind: 'note' as const, at: [0, 0, 12] as const, text: note }] };
await initOcct();
const rows = [];
for (const [tag, repair] of [['before', false], ['after', true]] as const) {
  const r = await runAndExport({
    fileName: 'fixture-block.kcad.ts', code: 'return box(80,50,12);',
    format: 'pdf-drawing', options: { ...base, visualQa: { autoRepair: repair, maxAttempts: 3 } },
  });
  if (r.bytes.length === 0 || r.diagnostics.some(d => d.severity === 'error')) {
    throw new Error('Failed real PDF export ' + tag + ': ' + JSON.stringify(r.diagnostics));
  }
  const pdf = join(dir, tag + '.pdf');
  writeFileSync(pdf, r.bytes);
  execFileSync('pdftoppm', ['-f', '1', '-l', '1', '-r', '120',
    '-singlefile', '-png', pdf, join(dir, tag)]);
  const info = execFileSync('pdfinfo', [pdf], { encoding: 'utf8' });
  const sizeLine = info.split('\n').find(line => line.startsWith('Page size:')) ?? '';
  const png = join(dir, tag + '.png');
  const pixels = await sharp(readFileSync(png)).metadata();
  const report = r.drawingReport;
  rows.push({ tag, repairEnabled: repair, page: sizeLine,
    raster: { width: pixels.width, height: pixels.height },
    visualQa: report?.visualQa,
    diagnostics: r.diagnostics.map(d => ({ code: d.code, severity: d.severity })) });
}
if (!rows[0].visualQa?.issues.some(i => i.code === 'text-clipping')) {
  throw new Error('The unrepaired PDF did not trigger the intended text clipping');
}
if (!rows[1].visualQa?.repaired
  || !rows[1].visualQa.attempts.some(a => a.sheet === 'a3' && a.accepted)
  || rows[1].visualQa.issues.some(i => i.severity === 'error')
  || rows[1].visualQa.pdf?.status !== 'passed') {
  throw new Error('Bounded repair did not clear the annotated PDF layout or PDF readback failed');
}
writeFileSync(join(dir, 'result.json'), JSON.stringify({
  mode: 'local public export -> vector PDF -> Poppler raster',
  source: 'fixture-block.kcad.ts; geometry 80 x 50 x 12 mm',
  annotation: note,
  evidence: rows,
  limits: 'SVG font-metric preflight, PDF vector readback and independently inspected raster; not OCR, fit or GD&T certification',
}, null, 2) + '\n');

async function frame(tag: string, heading: string, detail: string): Promise<void> {
  const raw = await sharp(join(dir, tag + '.png')).resize({ width: 700 }).png().toBuffer();
  const label = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">',
    '<text x="46" y="72" fill="#182230" font-size="42" font-weight="bold" font-family="DejaVu Sans">KernelCAD drawing QA</text>',
    '<text x="46" y="116" fill="#475569" font-size="23" font-family="DejaVu Sans">' + heading + '</text>',
    '<text x="875" y="300" fill="#182230" font-size="29" font-weight="bold" font-family="DejaVu Sans">' + tag.toUpperCase() + '</text>',
    '<text x="875" y="343" fill="#475569" font-size="18" font-family="DejaVu Sans">' + detail + '</text>',
    '<text x="46" y="686" fill="#64748b" font-size="17" font-family="DejaVu Sans">Real vector PDF rendered with Poppler; local test, not deployed production</text>',
    '</svg>',
  ].join('');
  await sharp({ create: { width: 1280, height: 720, channels: 4, background: 'white' } })
    .composite([{ input: raw, top: 146, left: 45 },
      { input: Buffer.from(label), top: 0, left: 0 }])
    .png().toFile(join(dir, tag + '-frame.png'));
}
await frame('before', 'Explicit A4 without repair', 'Clipped annotation detected');
await frame('after', 'A3 selected after measured repair', 'PDF readback passed; review incomplete');
execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error',
  '-loop', '1', '-t', '4', '-i', join(dir, 'before-frame.png'),
  '-loop', '1', '-t', '4', '-i', join(dir, 'after-frame.png'),
  '-filter_complex', '[0:v][1:v]concat=n=2:v=1:a=0,format=yuv420p[v]',
  '-map', '[v]', '-r', '24', '-c:v', 'libx264', '-crf', '22', '-pix_fmt', 'yuv420p',
  join(dir, 'demo.mp4')]);
console.log(JSON.stringify({ before: rows[0], after: rows[1] }, null, 2));
