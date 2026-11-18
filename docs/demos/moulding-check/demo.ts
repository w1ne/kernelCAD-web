// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Injection-moulding DFM demo: run the dfmSpec({ process: 'moulding' }) gate
// (the `kernelcad dfm` evaluate path) on three revisions of an enclosure base
// and render each one coloured by its own moulding report — red: undercut
// face, amber: face below minDraftDeg, blue-grey: face that passes. Every
// colour is a face ref the report named; the mesh is the kernel's own
// per-face tessellation of the evaluated model.
//
//   npx tsx docs/demos/moulding-check/demo.ts
//
// Writes result.json, still-*.png and demo.mp4 (ffmpeg must be on PATH).
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { initOcct, type OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate';
import { formatDfmSummary } from '../../../src/agent/cli/commands/dfm';
import { resolveParts } from '../../../src/modeling/runtime/dfm/runDfmChecks';
import { faceTaggedMeshOf } from '../../../src/modeling/runtime/dfm/fdmCheck';
import { trianglesOf } from '../../../src/modeling/runtime/dfm/cncCheck';

const dir = dirname(fileURLToPath(import.meta.url));
const W = 960, H = 540, SS = 2;
const RED = [214, 64, 52], AMBER = [236, 170, 40], OK = [120, 150, 186];

interface Tri { v: number[][]; n: number[]; rgb: number[] }

async function evaluate(name: string) {
  const file = resolve(dir, `${name}.kcad.ts`);
  const built = await evaluateAndBuildScript({ file });
  const report = built.dfmReport!;
  const m = report.moulding![0].result;
  const part = resolveParts(built.model!).parts[0];
  const tagged = faceTaggedMeshOf(part.shape as OcctBackend, part.refOwner);
  const under = new Set(m.undercut.faces.map(f => f.faceRef));
  const draft = new Set(m.draft.insufficient.map(f => f.faceRef));
  const tris: Tri[] = trianglesOf({ vertices: Array.from(tagged.vertices), triangles: Array.from(tagged.triangles) })
    .map((t, i) => {
      const ref = tagged.faceRefs[tagged.faceOfTri[i]];
      return { v: t.v, n: t.n, rgb: under.has(ref) ? RED : draft.has(ref) ? AMBER : OK };
    });
  const codes: Record<string, number> = {};
  for (const d of report.diagnostics) codes[d.code] = (codes[d.code] ?? 0) + 1;
  return {
    name,
    tris,
    result: {
      source: `docs/demos/moulding-check/${name}.kcad.ts`,
      exitCode: built.evaluation.exitCode,
      summary: formatDfmSummary(report),
      diagnosticCounts: codes,
      minDraftDeg: m.draft.minDraftDeg,
      underDraftedFaces: m.draft.insufficient.map(f => ({ face: f.faceRef, draftDeg: +f.draftDeg.toFixed(4) })),
      undercutAreaMm2: +m.undercut.areaMm2.toFixed(2),
      undercutFaces: m.undercut.faces.length,
      thinnestWallMm: +m.walls.thinnestMm.toFixed(4),
      thickestSectionMm: m.thickest === null ? null : +m.thickest.thicknessMm.toFixed(4),
      sharpCorners: m.sharpCorners.length,
      unmeasured: m.unmeasured,
      verdict: m.verdict,
      timingsMs: Object.fromEntries(Object.entries(report.timings).map(([k, v]) => [k, Math.round(v)])),
    },
  };
}

/** Z-up orbit camera, orthographic, flat shading from the outward facet normal. */
function render(tris: Tri[], yawDeg: number, pitchDeg: number, centre: number[], scale: number): Uint8ClampedArray {
  const yaw = (yawDeg * Math.PI) / 180, pitch = (pitchDeg * Math.PI) / 180;
  const w = W * SS, h = H * SS;
  const rgb = new Uint8ClampedArray(w * h * 3);
  for (let i = 0; i < w * h; i++) rgb.set([238, 243, 248], i * 3);
  const zbuf = new Float32Array(w * h).fill(-Infinity);
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const light = [0.35, 0.45, 0.82];
  const proj = (p: number[]): number[] => {
    const x = p[0] - centre[0], y = p[1] - centre[1], z = p[2] - centre[2];
    const rx = x * cy - y * sy, ry = x * sy + y * cy;
    return [w / 2 + rx * scale * SS, h / 2 - (z * cp + ry * sp) * scale * SS, z * sp - ry * cp];
  };
  for (const t of tris) {
    const [a, b, c] = t.v.map(proj);
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
    if (area === 0) continue;
    const vx = t.n[0] * cy - t.n[1] * sy, vy = t.n[0] * sy + t.n[1] * cy;
    const ex = vx, ey = t.n[2] * cp + vy * sp, ez = t.n[2] * sp - vy * cp;
    const lum = 0.38 + 0.62 * Math.abs(ex * light[0] + ey * light[1] + ez * light[2]);
    const col = t.rgb.map(ch => Math.round(Math.min(255, ch * lum + 18)));
    const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), x1 = Math.min(w - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), y1 = Math.min(h - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5, py = y + 0.5;
        const w0 = ((b[0] - px) * (c[1] - py) - (c[0] - px) * (b[1] - py)) / area;
        const w1 = ((c[0] - px) * (a[1] - py) - (a[0] - px) * (c[1] - py)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const z = w0 * a[2] + w1 * b[2] + w2 * c[2];
        const k = y * w + x;
        if (z <= zbuf[k]) continue;
        zbuf[k] = z;
        rgb.set(col, k * 3);
      }
    }
  }
  return rgb;
}

const esc = (s: string): string => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;');

async function frame(tris: Tri[], yaw: number, lines: string[], verdict: 'pass' | 'fail'): Promise<Buffer> {
  const centre = [40, 25, 12.5];
  const raw = render(tris, yaw, 32, centre, 4.4);
  const body = await sharp(Buffer.from(raw.buffer), { raw: { width: W * SS, height: H * SS, channels: 3 } })
    .resize(W, H, { kernel: 'lanczos3' }).png().toBuffer();
  const text = lines.map((l, i) =>
    `<text x="24" y="${34 + i * 23}" font-family="DejaVu Sans,Arial,sans-serif" font-size="${i === 0 ? 20 : 15}" fill="#22324a">${esc(l)}</text>`).join('');
  const badge = `<rect x="${W - 132}" y="16" width="108" height="36" rx="6" fill="${verdict === 'pass' ? '#2e8b57' : '#c0392b'}"/>` +
    `<text x="${W - 78}" y="41" text-anchor="middle" font-family="DejaVu Sans,Arial,sans-serif" font-size="20" font-weight="bold" fill="#fff">${verdict.toUpperCase()}</text>`;
  const legend = [['#d64034', 'undercut face'], ['#ecaa28', `draft below minDraftDeg`], ['#7896ba', 'passes']]
    .map(([c, l], i) => `<rect x="24" y="${H - 104 + i * 22}" width="14" height="14" fill="${c}"/>` +
      `<text x="46" y="${H - 92 + i * 22}" font-family="DejaVu Sans,Arial,sans-serif" font-size="14" fill="#22324a">${l}</text>`).join('');
  const footer = `<text x="24" y="${H - 18}" font-family="DejaVu Sans,Arial,sans-serif" font-size="13" fill="#4a5a72">Colours are the face refs named by the dfm.moulding report; kernel tessellation, pull +Z. Local run of this repository, not a moulded part.</text>`;
  return sharp(body)
    .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${text}${badge}${legend}${footer}</svg>`) }])
    .png().toBuffer();
}

function captionFor(name: string, r: Awaited<ReturnType<typeof evaluate>>['result']): string[] {
  const head: Record<string, string> = {
    'straight-walls': '1/3  Straight walls — kernelcad dfm straight-walls.kcad.ts',
    'wrong-draft': '2/3  1.5° draft the wrong way — kernelcad dfm wrong-draft.kcad.ts',
    enclosure: '3/3  1.5° outward draft + r1 inside fillets — kernelcad dfm enclosure.kcad.ts',
  };
  const c = r.diagnosticCounts;
  const line2 = `draft min ${r.minDraftDeg.toFixed(2)}° · ${r.underDraftedFaces.length} faces under 1° · undercut ${r.undercutAreaMm2.toFixed(1)} mm² on ${r.undercutFaces} faces`;
  const line3 = `walls ${r.thinnestWallMm.toFixed(2)}–${r.thickestSectionMm?.toFixed(2) ?? '?'} mm (limits 1.2–3.5) · ${r.sharpCorners} sharp inside corners · ` +
    `${Object.entries(c).map(([k, v]) => `${v}× ${k.replace('dfm.moulding.', '')}`).join(', ') || 'no diagnostics'}`;
  return [head[name], line2, line3];
}

await initOcct();
const runs = [];
for (const name of ['straight-walls', 'wrong-draft', 'enclosure']) runs.push(await evaluate(name));
const result = Object.fromEntries(runs.map(r => [r.name, r.result]));
await writeFile(resolve(dir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));

const tmp = await mkdtemp(join(tmpdir(), 'moulding-demo-'));
try {
  const perRun = 96; // 4 s at 24 fps, a 180° half orbit each
  let k = 0;
  for (const r of runs) {
    const caption = captionFor(r.name, r.result);
    for (let i = 0; i < perRun; i++) {
      const png = await frame(r.tris, -30 + (180 * i) / perRun, caption, r.result.verdict);
      await writeFile(join(tmp, `f${String(k++).padStart(4, '0')}.png`), png);
    }
    await writeFile(resolve(dir, `still-${r.name}.png`), await frame(r.tris, 20, caption, r.result.verdict));
  }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '24', '-i', join(tmp, 'f%04d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '26', resolve(dir, 'demo.mp4')]);
} finally {
  await rm(tmp, { recursive: true, force: true });
}
