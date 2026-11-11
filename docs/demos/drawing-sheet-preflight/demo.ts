// SPDX-License-Identifier: MIT
// Local drawing preflight demo: npx tsx docs/demos/drawing-sheet-preflight/demo.ts
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { renderSvgDrawing } from '../../../src/kernel/backends/occt/exportSvgDrawing';
import { SHEETS, type SheetLayout } from '../../../src/kernel/backends/occt/drawingLayout';
import { reviewSheetViewPlacement } from '../../../src/kernel/backends/occt/drawingSheetPreflight';

const dir = path.dirname(fileURLToPath(import.meta.url));
await initOcct();
const drawing = renderSvgDrawing(
  [{ name: 'fixture-plate', shape: OcctBackend.box(80, 50, 12) }],
  { format: 'svg-drawing', sheet: 'a4', modelName: 'Fixture plate', date: '2026-11-09' },
);
const clean = drawing.report?.sheetPlacement;
if (!clean || clean.status !== 'clear') throw new Error('Expected clean actual export');
const svg = Buffer.from(drawing.bytes).toString('utf8');
writeFileSync(path.join(dir, 'actual-drawing.svg'), svg);

// Explicit failure injection: the invalid layout is not a second exporter run.
const at = (x: number, y: number, w: number, h: number) => ({
  tx: x, ty: y, box: { x, y, w, h },
});
const injected: SheetLayout = {
  scale: 1, scaleText: '1:1',
  views: {
    front: at(210, 185, 40, 20),
    top: at(70, 40, 30, 20),
    left: at(20, 100, 30, 20),
    iso: at(170, 40, 30, 20),
  },
};
const injectedReview = reviewSheetViewPlacement(injected, SHEETS.a4,
  ['front', 'top', 'left', 'iso']);
if (injectedReview.status !== 'issues') throw new Error('Failure injection not detected');
writeFileSync(path.join(dir, 'result.json'), JSON.stringify({
  source: 'local OCCT exporter; A4 four-view fixture plate',
  actualExport: { sheetPlacement: clean, diagnostics: drawing.diagnostics.map(d => d.code) },
  failureInjection: { method: 'pure layout preflight with displaced front view', sheetPlacement: injectedReview },
  limitations: 'Geometry boxes only, not annotation, PDF raster, GD&T, or manufacturability certification',
}, null, 2) + '\n');

const page = await sharp(Buffer.from(svg)).resize({ width: 740 }).png().toBuffer();
async function still(file: string, subtitle: string, lines: string[]): Promise<void> {
  const typography = [
    '<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">',
    '<text x="45" y="77" fill="#1b2631" font-size="42" font-family="DejaVu Sans" font-weight="bold">KernelCAD drawing preflight</text>',
    '<text x="45" y="115" fill="#536171" font-size="22" font-family="DejaVu Sans">' + subtitle + '</text>',
    '<text x="910" y="245" fill="#1b2631" font-size="30" font-family="DejaVu Sans" font-weight="bold">' + lines[0] + '</text>',
    '<text x="910" y="310" fill="#334155" font-size="20" font-family="DejaVu Sans">' + lines[1] + '</text>',
    '<text x="910" y="349" fill="#334155" font-size="20" font-family="DejaVu Sans">' + lines[2] + '</text>',
    '<text x="45" y="683" fill="#64748b" font-size="17" font-family="DejaVu Sans">Local geometric validation; drawing shown is from the OCCT exporter</text>',
    '</svg>',
  ].join('');
  await sharp({ create: { width: 1280, height: 720, channels: 4, background: '#fafafa' } })
    .composite([{ input: page, top: 144, left: 45 },
      { input: Buffer.from(typography), top: 0, left: 0 }])
    .png().toFile(path.join(dir, file));
}
await still('still-1.png', 'Actual four-view A4 export', ['CLEAR', '4 views checked', '0 placement issues']);
await still('still-2.png', 'Synthetic displaced-view failure injection', ['ISSUES', 'outside-frame', 'title-block-overlap']);

execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
  '-loop', '1', '-t', '4', '-i', path.join(dir, 'still-1.png'),
  '-loop', '1', '-t', '4', '-i', path.join(dir, 'still-2.png'),
  '-filter_complex', '[0:v][1:v]concat=n=2:v=1:a=0,format=yuv420p[v]',
  '-map', '[v]', '-r', '24', '-c:v', 'libx264', '-preset', 'medium', '-crf', '22',
  path.join(dir, 'demo.mp4')]);
console.log(JSON.stringify({ clean, injectedReview }, null, 2));
