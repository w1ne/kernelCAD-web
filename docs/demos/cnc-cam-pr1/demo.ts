// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Local playback of planMill on a 40x30x10 box in a 50x40x15 plate.
// The drawing is the planner's polylines. It is not a machine cut.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planMill, type CamSegment, type MillPlanSuccess } from '../../../src/shared/cam';

const dir = dirname(fileURLToPath(import.meta.url));

const plan = planMill({
  part_bbox: { min_mm: [0, 0, 0], max_mm: [40, 30, 10] },
  stock: { kind: 'plate', lengthMm: 50, widthMm: 40, thicknessMm: 15 },
  tool: { diameter_mm: 6 },
  ops: ['facing', 'profile'],
  stepdown_mm: 5,
  stepover: 0.5,
  safe_z_mm: 20,
  spindle_rpm: 10000,
  feed_mm_min: 600,
  include_gcode: true,
});
if (!plan.ok || !plan.gcode) throw new Error(plan.ok ? 'missing gcode' : plan.error);

const feeds = plan.ops.flatMap((op) =>
  op.segments.filter((seg) => seg.motion === 'feed').map((seg) => ({ op: op.kind, seg })),
);
const frameCount = 48;
const step = Math.max(1, Math.ceil(feeds.length / frameCount));
const shown = feeds.filter((_, index) => index % step === 0);

function poly(points: CamSegment[], color: string): string {
  if (points.length < 2) return '';
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x_mm).toFixed(1)} ${sy(p.y_mm).toFixed(1)}`).join(' ');
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>`;
}

const scale = 11;
const ox = 90;
const oy = 620;
const sx = (x: number) => ox + x * scale;
const sy = (y: number) => oy - y * scale;

function frame(upTo: number, label: string): string {
  const slice = shown.slice(0, upTo);
  const facing = slice.filter((p) => p.op === 'facing').map((p) => p.seg);
  const profile = slice.filter((p) => p.op === 'profile').map((p) => p.seg);
  const tip = slice.at(-1)?.seg;
  const cutter = tip
    ? `<circle cx="${sx(tip.x_mm).toFixed(1)}" cy="${sy(tip.y_mm).toFixed(1)}" r="${(3 * scale).toFixed(1)}" fill="none" stroke="#ffc857" stroke-width="2"/>`
    : '';
  const gcode = plan.gcode!.split('\n').slice(0, 14).map((line, i) =>
    `<text x="760" y="${250 + i * 22}" class="code">${escapeXml(clip(line, 48))}</text>`,
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
<rect width="1280" height="720" fill="#101820"/>
<text x="70" y="58" class="title">kernelCAD · plan_cnc_toolpaths</text>
<text x="70" y="92" class="sub">${label}</text>
<rect x="${sx(0)}" y="${sy(40)}" width="${50 * scale}" height="${40 * scale}" fill="#1b2c36" stroke="#8aa4b2" stroke-width="2"/>
<rect x="${sx(5)}" y="${sy(35)}" width="${40 * scale}" height="${30 * scale}" fill="#243e4c" stroke="#d7e4ea" stroke-width="2"/>
${poly(facing, '#7dcea0')}${poly(profile, '#5dade2')}${cutter}
<text x="760" y="150" class="sub">Top view, stock corner at the lower left.</text>
<text x="760" y="182" class="sub">Facing ${plan.ops[0].removed_volume_mm3} mm³ · profile ${plan.ops[1].removed_volume_mm3} mm³</text>
<text x="760" y="214" class="sub">Time heuristic ${plan.time_s.toFixed(1)} s · safe Z 20 mm</text>
${gcode}
<text x="70" y="680" class="foot">Local bbox playback. Not collision-checked. Not a cut on a machine.</text>
<style>.title{font:700 32px sans-serif;fill:#f3f6f8}.sub{font:18px sans-serif;fill:#c5d4db}.code{font:15px monospace;fill:#d6eaf8}.foot{font:16px sans-serif;fill:#91a4ae}</style>
</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function clip(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

const framesDir = resolve(dir, 'frames');
await mkdir(framesDir, { recursive: true });
const svgs: string[] = [];
for (let i = 1; i <= shown.length; i++) {
  const kind = shown[i - 1].op;
  const svg = frame(i, `6 mm end mill · ${kind} · feed ${i} of ${shown.length}`);
  svgs.push(svg);
  await writeFile(resolve(framesDir, `frame-${String(i).padStart(3, '0')}.svg`), svg);
}
await writeFile(resolve(dir, 'poster.svg'), svgs.at(-1)!);
const summary = summaryOf(plan);
await writeFile(resolve(dir, 'result.json'), `${JSON.stringify(summary, null, 2)}\n`);
await writeFile(resolve(dir, 'toolpath.nc'), plan.gcode);
console.log(`planned ${plan.ops.length} ops, ${shown.length} frames, volume ${plan.removed_volume_mm3}`);

function summaryOf(ok: MillPlanSuccess) {
  return {
    ok: ok.ok,
    origin: ok.origin,
    part_in_stock_mm: ok.part_in_stock_mm,
    stock_size_mm: ok.stock.size_mm,
    tool: ok.tool,
    feeds: ok.feeds,
    ops: ok.ops.map((op) => ({
      kind: op.kind,
      segment_count: op.segment_count,
      time_s: op.time_s,
      removed_volume_mm3: op.removed_volume_mm3,
    })),
    time_s: ok.time_s,
    removed_volume_mm3: ok.removed_volume_mm3,
    warnings: ok.warnings,
    disclaimer: ok.disclaimer,
    gcode_head: ok.gcode?.split('\n').slice(0, 20),
  };
}
