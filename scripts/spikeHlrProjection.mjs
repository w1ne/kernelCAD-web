// Spike: orthographic engineering-drawing views (front/top/side) with hidden
// lines, via replicad's drawProjection (OCCT HLRBRep_Algo under the hood).
//
// Usage: npx tsx scripts/spikeHlrProjection.mjs <script.kcad.ts> <outPrefix>
// Writes <outPrefix>-front.svg / -top.svg / -left.svg plus a combined
// <outPrefix>-sheet.svg (3 views side by side).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { initOcct } from '../src/kernel/backends/occt/occtBackend.ts';
import { runScript } from '../src/modeling/runtime/runScript.ts';
import { RecomputeEngine } from '../src/modeling/compute/recomputeEngine.ts';
import { createOcctLowerer } from '../src/modeling/backends/occt/occtLowerer.ts';
import { isSceneBackend } from '../src/kernel/backends/sceneBackend.ts';
import { sceneToWorldFrameParts } from '../src/kernel/backends/occt/sceneToWorldFrame.ts';
import { Shape } from '../src/modeling/capture/proxy.ts';
import { Scene } from '../src/modeling/validation/scene.ts';
import { drawProjection, makeCompound } from 'replicad';

const [, , scriptPath, outPrefix] = process.argv;
if (!scriptPath || !outPrefix) {
  console.error('usage: spikeHlrProjection.mjs <script.kcad.ts> <outPrefix>');
  process.exit(2);
}

await initOcct();

const filePath = resolve(scriptPath);
const code = readFileSync(filePath, 'utf8');
const t0 = performance.now();
const run = await runScript({ code, fileName: filePath, scriptDir: dirname(filePath) });
const engine = new RecomputeEngine(createOcctLowerer(run.session));
const r = await engine.run(run.records, { paramTable: run.paramTable });
const tLower = performance.now() - t0;

const fatal = r.diagnostics.filter((d) => d.severity === 'error');
if (fatal.length > 0) {
  console.error('lowering failed:', JSON.stringify(fatal, null, 2));
  process.exit(1);
}

// Resolve target shape exactly like runAndExport does.
let targetId;
const ret = run.returnValue;
if (ret instanceof Shape) targetId = ret.id;
else if (ret instanceof Scene) targetId = ret.__sourceFeatureId();
else if (run.records.length > 0) targetId = run.records[run.records.length - 1].id;
const lowered = r.shapes.get(targetId);
if (!lowered) {
  console.error(`target '${targetId}' did not lower`);
  process.exit(1);
}

// Single body → replicad shape directly. Scene (assembly) → world-frame
// parts compounded into one shape so HLR sees inter-part occlusion.
let shape;
let partCount = 1;
if (isSceneBackend(lowered)) {
  const parts = sceneToWorldFrameParts(lowered);
  partCount = parts.length;
  shape = makeCompound(parts.map((p) => p.shape.getReplicadShape()));
} else {
  shape = lowered.getReplicadShape();
}
console.log(`lowered in ${tLower.toFixed(0)} ms; parts=${partCount}`);

/** Compose visible (solid) + hidden (dashed) drawings into one SVG string. */
function composeSvg(visible, hidden) {
  const visPaths = visible.toSVGPaths().flat();
  const hidPaths = hidden.toSVGPaths().flat();
  // Union of both viewboxes so hidden geometry is never clipped.
  const vb = (d) => d.toSVGViewBox(2).split(' ').map(Number);
  const boxes = [];
  if (visPaths.length) boxes.push(vb(visible));
  if (hidPaths.length) boxes.push(vb(hidden));
  if (!boxes.length) return { svg: null, visCount: 0, hidCount: 0 };
  const x0 = Math.min(...boxes.map((b) => b[0]));
  const y0 = Math.min(...boxes.map((b) => b[1]));
  const x1 = Math.max(...boxes.map((b) => b[0] + b[2]));
  const y1 = Math.max(...boxes.map((b) => b[1] + b[3]));
  const w = x1 - x0;
  const h = y1 - y0;
  const sw = Math.max(w, h) / 300; // line weight relative to view size
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${w} ${h}" width="400">`,
    `<g fill="none" stroke="#888" stroke-width="${sw}" stroke-dasharray="${4 * sw} ${2 * sw}">`,
    ...hidPaths.map((p) => `<path d="${p}"/>`),
    `</g>`,
    `<g fill="none" stroke="#000" stroke-width="${sw * 1.6}">`,
    ...visPaths.map((p) => `<path d="${p}"/>`),
    `</g>`,
    `</svg>`,
  ].join('\n');
  return { svg, visCount: visPaths.length, hidCount: hidPaths.length, vbox: [x0, y0, w, h] };
}

const views = ['front', 'top', 'left'];
const sheetParts = [];
let sheetX = 0;
let sheetH = 0;
for (const view of views) {
  const tv = performance.now();
  const { visible, hidden } = drawProjection(shape, view);
  const ms = performance.now() - tv;
  const { svg, visCount, hidCount, vbox } = composeSvg(visible, hidden);
  if (!svg) {
    console.log(`${view}: EMPTY projection (${ms.toFixed(0)} ms)`);
    continue;
  }
  const out = `${outPrefix}-${view}.svg`;
  writeFileSync(out, svg);
  console.log(
    `${view}: ${ms.toFixed(0)} ms, visible paths=${visCount}, hidden paths=${hidCount}, ` +
      `viewbox=${vbox.map((n) => n.toFixed(1)).join(' ')} -> ${out}`,
  );
  // Accumulate into combined sheet (translate views side by side).
  const [x0, y0, w, h] = vbox;
  sheetParts.push({ svg, x0, y0, w, h, offset: sheetX, view });
  sheetX += w * 1.15;
  sheetH = Math.max(sheetH, h);
}

if (sheetParts.length) {
  const inner = sheetParts
    .map((p) => {
      const body = p.svg
        .replace(/^<svg[^>]*>/, '')
        .replace(/<\/svg>$/, '');
      const label = `<text x="${p.x0 + p.w / 2}" y="${p.y0 - p.h * 0.04}" font-size="${p.h / 18}" text-anchor="middle" fill="#000">${p.view.toUpperCase()}</text>`;
      return `<g transform="translate(${p.offset - p.x0 + sheetParts[0].x0}, 0)">${label}\n${body}</g>`;
    })
    .join('\n');
  const x0 = sheetParts[0].x0;
  const y0 = Math.min(...sheetParts.map((p) => p.y0)) - sheetH * 0.12;
  const sheet = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${sheetX} ${sheetH * 1.2}" width="1200">\n${inner}\n</svg>`;
  writeFileSync(`${outPrefix}-sheet.svg`, sheet);
  console.log(`sheet -> ${outPrefix}-sheet.svg`);
}
