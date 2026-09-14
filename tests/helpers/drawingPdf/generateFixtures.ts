// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/helpers/drawingPdf/generateFixtures.ts
//
// Regenerates the committed drawing-to-CAD fixtures:
//   tests/fixtures/drawing-pdf/<name>.svg  — kernelCAD's own svg-drawing sheet
//   tests/fixtures/drawing-pdf/<name>.pdf  — that sheet converted to PDF
//   tests/fixtures/drawing-pdf/raster-only.pdf — an image-only (scanned) page
//   examples/drawing-to-cad/motor-mount-bracket.pdf — the example's input sheet
//
// Run:
//   npx tsx tests/helpers/drawingPdf/generateFixtures.ts [--converter minimal]

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { DRAWING_FIXTURE_MODELS, MOTOR_MOUNT_BRACKET } from './fixtureModels';
import { detectSvgPdfConverter, svgToPdf, writeRasterPdf, type SvgPdfConverter } from './svgToPdf';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '../../fixtures/drawing-pdf');
const EXAMPLE_DIR = join(HERE, '../../../examples/drawing-to-cad');

/** Render a fixture model through the svg-drawing exporter. */
export async function renderFixtureSvg(name: string): Promise<string> {
  const model = [...DRAWING_FIXTURE_MODELS, MOTOR_MOUNT_BRACKET].find(m => m.name === name);
  if (!model) throw new Error(`unknown fixture model ${name}`);
  const r = await runAndExport({
    code: model.code,
    fileName: `${model.name}.kcad.ts`,
    format: 'svg-drawing',
    options: { format: 'svg-drawing', modelName: model.name, annotations: model.annotations },
  });
  const errors = r.diagnostics.filter(d => d.severity === 'error');
  if (errors.length > 0 || r.bytes.length === 0) {
    throw new Error(`svg-drawing export of ${name} failed: ${JSON.stringify(errors)}`);
  }
  return new TextDecoder().decode(r.bytes);
}

/** 400×280 greyscale "scan" of a plate outline with two holes. */
function rasterScanPixels(): { widthPx: number; heightPx: number; pixels: Uint8Array } {
  const widthPx = 400, heightPx = 280;
  const pixels = new Uint8Array(widthPx * heightPx).fill(245);
  const ink = (x: number, y: number) => {
    if (x >= 0 && y >= 0 && x < widthPx && y < heightPx) pixels[y * widthPx + x] = 20;
  };
  for (let x = 60; x <= 340; x++) for (const y of [70, 71, 210, 211]) ink(x, y);
  for (let y = 70; y <= 211; y++) for (const x of [60, 61, 339, 340]) ink(x, y);
  for (const [cx, cy] of [[110, 140], [290, 140]]) {
    for (let t = 0; t < 720; t++) {
      const a = (t / 720) * 2 * Math.PI;
      ink(Math.round(cx + 22 * Math.cos(a)), Math.round(cy + 22 * Math.sin(a)));
    }
  }
  return { widthPx, heightPx, pixels };
}

async function main(): Promise<void> {
  const flag = process.argv.indexOf('--converter');
  const converter: SvgPdfConverter = flag >= 0
    ? (process.argv[flag + 1] as SvgPdfConverter)
    : detectSvgPdfConverter();
  await initOcct();
  mkdirSync(OUT_DIR, { recursive: true });
  for (const model of DRAWING_FIXTURE_MODELS) {
    const svg = await renderFixtureSvg(model.name);
    writeFileSync(join(OUT_DIR, `${model.name}.svg`), svg, 'utf8');
    writeFileSync(join(OUT_DIR, `${model.name}.pdf`), svgToPdf(svg, converter));
    console.log(`${model.name}: svg + pdf (${converter})`);
  }
  writeFileSync(join(OUT_DIR, 'raster-only.pdf'), writeRasterPdf(rasterScanPixels()));
  console.log('raster-only: pdf');
  mkdirSync(EXAMPLE_DIR, { recursive: true });
  const exampleSvg = await renderFixtureSvg(MOTOR_MOUNT_BRACKET.name);
  writeFileSync(join(EXAMPLE_DIR, `${MOTOR_MOUNT_BRACKET.name}.pdf`), svgToPdf(exampleSvg, converter));
  console.log(`examples/drawing-to-cad/${MOTOR_MOUNT_BRACKET.name}.pdf (${converter})`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}
