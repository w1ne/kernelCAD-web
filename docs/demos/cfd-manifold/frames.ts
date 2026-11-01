// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Compose the demo frames (1280 x 720) from the renders, the tool's preview
// PNG and the recorded numbers. Usage:
//   npx tsx docs/demos/cfd-manifold/frames.ts <model.png> <fluid.png> <outDir>

import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const dir = dirname(fileURLToPath(import.meta.url));
const [modelPng, fluidPng, outDir] = process.argv.slice(2);
await mkdir(outDir, { recursive: true });
const result = JSON.parse(await readFile(join(dir, 'result.json'), 'utf8'));
const val = JSON.parse(await readFile(join(dir, 'validation.json'), 'utf8'));
const W = 1280;
const H = 720;
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function textSvg(lines: Array<{ t: string; size?: number; y: number; color?: string; mono?: boolean }>): Buffer {
  const body = lines.map(l => `<text x="48" y="${l.y}" font-family="${l.mono ? 'DejaVu Sans Mono' : 'DejaVu Sans'}, sans-serif" font-size="${l.size ?? 24}" fill="${l.color ?? '#e8e8e8'}">${esc(l.t)}</text>`).join('');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${body}</svg>`);
}

async function frame(name: string, image: string | undefined, imgBox: { top: number; height: number }, lines: Parameters<typeof textSvg>[0]): Promise<void> {
  const layers: sharp.OverlayOptions[] = [];
  if (image !== undefined) {
    const img = await sharp(image).resize({ width: W - 96, height: imgBox.height, fit: 'inside', background: '#1d1f23' }).toBuffer();
    const meta = await sharp(img).metadata();
    layers.push({ input: img, top: imgBox.top, left: Math.round((W - (meta.width ?? 0)) / 2) });
  }
  layers.push({ input: textSvg(lines), top: 0, left: 0 });
  await sharp({ create: { width: W, height: H, channels: 3, background: '#1d1f23' } }).composite(layers).png().toFile(join(outDir, name));
}

const [o1, o2] = result.outlets;
const pv = val.poiseuille;
const sp = val.sphere;

await frame('frame-1.png', modelPng, { top: 110, height: 560 }, [
  { t: '1/5  The job: a printed coolant splitter (manifold.kcad.ts)', size: 30, y: 52 },
  { t: '60 x 40 x 16 mm, 8 mm inlet port -> internal gallery -> 5 mm and 4 mm outlet ports, 4x M4 mounting holes', size: 20, y: 88, color: '#b8c0cc' },
  { t: "shape.cfdStudy({ flow: 'internal', fluid: 'water', inlet: { atX: 0 }, outlet: [ {atX: 60, near: ...} x2 ], flowRateLpm: 0.3 })", size: 16, y: 700, mono: true, color: '#9fd3ff' },
]);
await frame('frame-2.png', fluidPng, { top: 110, height: 560 }, [
  { t: '2/5  run_cfd extracts the fluid: bounding box minus part, wetted channels only', size: 28, y: 52 },
  { t: 'Patches named from model faces: inlet, outlet_1 (5 mm), outlet_2 (4 mm), walls. The bolt holes are dropped (no inlet reaches them).', size: 18, y: 88, color: '#b8c0cc' },
  { t: `snappyHexMesh: ${result.mesh.cells} cells, checkMesh OK, max non-orthogonality ${result.mesh.maxNonOrthogonality.toFixed(1)} deg`, size: 18, y: 700, color: '#9fd3ff' },
]);
const transcript = (await readFile(join(dir, 'transcript.txt'), 'utf8')).split('\n').filter(l => l.trim() !== '').slice(0, 13);
await frame('frame-3.png', undefined, { top: 0, height: 0 }, [
  { t: '3/5  One command, OpenFOAM simpleFoam (local Docker image opencfd/openfoam-run:2406)', size: 26, y: 52 },
  ...transcript.map((t, i) => ({ t: t.length > 118 ? `${t.slice(0, 115)}...` : t, size: 15, y: 110 + i * 34, mono: true, color: i === 0 ? '#9fd3ff' : '#e8e8e8' })),
]);
await frame('frame-4.png', join(dir, 'velocity-midplane.png'), { top: 120, height: 520 }, [
  { t: `4/5  Result: ${result.pressureDropPa.toFixed(1)} Pa pressure drop at 0.3 L/min, Re ${result.reynolds.value.toFixed(0)} (laminar)`, size: 28, y: 52 },
  { t: `Flow split: 5 mm outlet ${o1.lpm.toFixed(3)} L/min (${(o1.share * 100).toFixed(1)}%), 4 mm outlet ${o2.lpm.toFixed(3)} L/min (${(o2.share * 100).toFixed(1)}%); mass balance ${(result.massBalance.imbalance * 100).toFixed(3)}%`, size: 19, y: 90, color: '#b8c0cc' },
  { t: `Converged on steady monitors (dp band ${(result.convergence.monitor.band * 100).toFixed(2)}% over the last 20%); residuals plateaued ~1e-2. Mesh ${(result.meshMs / 1000).toFixed(0)} s + solve ${(result.solveMs / 1000).toFixed(0)} s.`, size: 17, y: 700, color: '#9fd3ff' },
]);
await frame('frame-5.png', undefined, { top: 0, height: 0 }, [
  { t: '5/5  Validation against analytic results (same tool, same machine)', size: 28, y: 60 },
  { t: 'Hagen-Poiseuille: water pipe D 10 mm, L 200 mm, Re 20', size: 24, y: 140 },
  { t: `  run_cfd ${pv.pressureDropPa.toFixed(4)} Pa vs analytic ${pv.analyticPa.toFixed(4)} Pa  (${(pv.error * 100).toFixed(1)}%, incl. inlet development)`, size: 20, y: 180, mono: true },
  { t: `  centreline / mean velocity ${pv.centrelineOverMean.toFixed(3)} vs 2   (${pv.cells} cells)`, size: 20, y: 215, mono: true },
  { t: 'Sphere drag: D 10 mm in air, Re 50', size: 24, y: 290 },
  { t: `  run_cfd Cd ${sp.cd.toFixed(3)} vs Schiller-Naumann ${sp.schillerNaumannCd.toFixed(3)}  (${(sp.error * 100).toFixed(1)}%, ${sp.cells} cells)`, size: 20, y: 330, mono: true },
  { t: 'Missing OpenFOAM -> cfd.solver.unavailable with the install command, never a pass.', size: 20, y: 420, color: '#b8c0cc' },
  { t: 'Unconverged runs -> ok: false + cfd.solve.not-converged with the monitor band as the error bar.', size: 20, y: 455, color: '#b8c0cc' },
  { t: 'Local run on a development machine: an engineering estimate, not a certification,', size: 18, y: 560, color: '#ffcf7a' },
  { t: 'not a hosted-service run and not a test of a printed part.', size: 18, y: 590, color: '#ffcf7a' },
]);
console.log(`frames written to ${outDir}`);
