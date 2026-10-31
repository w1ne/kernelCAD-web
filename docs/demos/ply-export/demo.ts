// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// PLY export demo: export mount.kcad.ts (a three-part shaft support) with the
// CLI export path, read the written PLY back, and render a turntable from the
// file's own vertices, per-vertex normals and per-vertex colours. Nothing in
// the render comes from the CAD model; it is all decoded from mount.ply.
//
//   npx tsx docs/demos/ply-export/demo.ts
//
// Writes mount.ply, result.json, still-iso.png, still-top.png and demo.mp4
// (frames are encoded with ffmpeg, which must be on PATH).
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { exportScript } from '../../../src/agent/cli/commands/export';
import { parsePly, plyBbox, type ParsedPly } from '../../../tests/helpers/plyParse';

const dir = dirname(fileURLToPath(import.meta.url));
const W = 960, H = 540;

interface Mesh { p: Float32Array; n: Float32Array; c: Uint8Array; f: Uint32Array }

function toMesh(ply: ParsedPly): Mesh {
  const vs = ply.data.vertex!;
  const fs = ply.data.face!;
  const m: Mesh = { p: new Float32Array(vs.length * 3), n: new Float32Array(vs.length * 3), c: new Uint8Array(vs.length * 3), f: new Uint32Array(fs.length * 3) };
  vs.forEach((v, i) => {
    m.p.set([v.x as number, v.y as number, v.z as number], i * 3);
    m.n.set([v.nx as number, v.ny as number, v.nz as number], i * 3);
    m.c.set([v.red as number, v.green as number, v.blue as number], i * 3);
  });
  fs.forEach((f, i) => m.f.set(f.vertex_indices as number[], i * 3));
  return m;
}

/** Z-up orbit camera, orthographic, Gouraud shading from the file's normals. */
function render(m: Mesh, yawDeg: number, pitchDeg: number, centre: number[], scale: number): Uint8ClampedArray {
  const yaw = (yawDeg * Math.PI) / 180, pitch = (pitchDeg * Math.PI) / 180;
  const ss = 2, w = W * ss, h = H * ss;
  const rgb = new Uint8ClampedArray(w * h * 3);
  for (let i = 0; i < w * h; i++) rgb.set([238, 243, 248], i * 3);
  const zbuf = new Float32Array(w * h).fill(-Infinity);
  const nv = m.p.length / 3;
  const sx = new Float32Array(nv), sy = new Float32Array(nv), sz = new Float32Array(nv), lum = new Float32Array(nv);
  const cy = Math.cos(yaw), sy0 = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const light = [0.35, 0.45, 0.82];
  for (let i = 0; i < nv; i++) {
    const x = m.p[i * 3]! - centre[0]!, y = m.p[i * 3 + 1]! - centre[1]!, z = m.p[i * 3 + 2]! - centre[2]!;
    const rx = x * cy - y * sy0, ry = x * sy0 + y * cy; // yaw about Z
    sx[i] = W * ss / 2 + rx * scale * ss;
    sy[i] = H * ss / 2 - (z * cp + ry * sp) * scale * ss;
    sz[i] = z * sp - ry * cp; // toward a viewer in front (-y) and above (+z)
    const nx = m.n[i * 3]!, ny = m.n[i * 3 + 1]!, nz = m.n[i * 3 + 2]!;
    const vx = nx * cy - ny * sy0, vy = nx * sy0 + ny * cy; // normal into view space
    const ex = vx, ey = nz * cp + vy * sp, ez = nz * sp - vy * cp;
    lum[i] = 0.35 + 0.65 * Math.max(0, ex * light[0]! + ey * light[1]! + ez * light[2]!);
  }
  for (let t = 0; t < m.f.length; t += 3) {
    const a = m.f[t]!, b = m.f[t + 1]!, c = m.f[t + 2]!;
    const area = (sx[b]! - sx[a]!) * (sy[c]! - sy[a]!) - (sx[c]! - sx[a]!) * (sy[b]! - sy[a]!);
    if (area === 0) continue;
    const x0 = Math.max(0, Math.floor(Math.min(sx[a]!, sx[b]!, sx[c]!))), x1 = Math.min(w - 1, Math.ceil(Math.max(sx[a]!, sx[b]!, sx[c]!)));
    const y0 = Math.max(0, Math.floor(Math.min(sy[a]!, sy[b]!, sy[c]!))), y1 = Math.min(h - 1, Math.ceil(Math.max(sy[a]!, sy[b]!, sy[c]!)));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5, py = y + 0.5;
        const w0 = ((sx[b]! - px) * (sy[c]! - py) - (sx[c]! - px) * (sy[b]! - py)) / area;
        const w1 = ((sx[c]! - px) * (sy[a]! - py) - (sx[a]! - px) * (sy[c]! - py)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const z = w0 * sz[a]! + w1 * sz[b]! + w2 * sz[c]!;
        const k = y * w + x;
        if (z <= zbuf[k]!) continue;
        zbuf[k] = z;
        const l = w0 * lum[a]! + w1 * lum[b]! + w2 * lum[c]!;
        for (let ch = 0; ch < 3; ch++) {
          const base = (w0 * m.c[a * 3 + ch]! + w1 * m.c[b * 3 + ch]! + w2 * m.c[c * 3 + ch]!) / 255;
          rgb[k * 3 + ch] = Math.round(Math.min(1, 0.1 * l + base * l * 1.1) * 255);
        }
      }
    }
  }
  return rgb;
}

async function frame(m: Mesh, yaw: number, pitch: number, centre: number[], scale: number, lines: string[]): Promise<Buffer> {
  const raw = render(m, yaw, pitch, centre, scale);
  const body = await sharp(Buffer.from(raw.buffer), { raw: { width: W * 2, height: H * 2, channels: 3 } }).resize(W, H, { kernel: 'lanczos3' }).png().toBuffer();
  const esc = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
  const text = lines.map((l, i) => `<text x="24" y="${36 + i * 24}" font-family="DejaVu Sans,Arial,sans-serif" font-size="${i === 0 ? 20 : 16}" fill="#22324a">${esc(l)}</text>`).join('');
  const footer = `<text x="24" y="${H - 20}" font-family="DejaVu Sans,Arial,sans-serif" font-size="14" fill="#4a5a72">Rendered from mount.ply only (its vertices, normals and colours). Local run of this repository; not Studio, not a print.</text>`;
  return sharp(body).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${text}${footer}</svg>`) }]).png().toBuffer();
}

await initOcct();
const plyPath = resolve(dir, 'mount.ply');
const r = await exportScript({ file: resolve(dir, 'mount.kcad.ts'), format: 'ply', out: plyPath });
if (r.exitCode !== 0) throw new Error(JSON.stringify(r.diagnostics));
const bytes = new Uint8Array(await readFile(plyPath));
const ply = parsePly(bytes);
const mesh = toMesh(ply);
const bbox = plyBbox(ply);
const colours = [...new Set(ply.data.vertex!.map(v => `${v.red},${v.green},${v.blue}`))];
const summary = {
  invocation: 'kernelcad export ply docs/demos/ply-export/mount.kcad.ts -o docs/demos/ply-export/mount.ply',
  format: ply.format,
  bytes: bytes.length,
  parts: ply.comments.filter(c => c.startsWith('part ')),
  vertexProperties: ply.elements[0]!.properties.map(p => p.name),
  faceProperties: ply.elements[1]!.properties.map(p => (p.list ? `list ${p.list.countType} ${p.list.itemType} ${p.name}` : p.name)),
  vertices: ply.data.vertex!.length,
  faces: ply.data.face!.length,
  bboxMm: bbox,
  colours,
};
await writeFile(resolve(dir, 'result.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));

const centre = [0, 1, 2].map(i => (bbox.min[i]! + bbox.max[i]!) / 2);
const scale = (H * 0.62) / Math.hypot(bbox.max[0]! - bbox.min[0]!, bbox.max[1]! - bbox.min[1]!, bbox.max[2]! - bbox.min[2]!) * 1.25;
const caption = [
  'kernelcad export ply mount.kcad.ts -o mount.ply',
  `binary_little_endian PLY · ${summary.vertices.toLocaleString('en-US')} vertices (x y z nx ny nz red green blue) · ${summary.faces.toLocaleString('en-US')} triangles`,
  'plate (anodized-black finish) · shaft (steel finish) · collar (#e8742a) — one file, world space',
];
const tmp = await mkdtemp(join(tmpdir(), 'ply-demo-'));
try {
  const n = 120; // 5 s at 24 fps
  for (let i = 0; i < n; i++) {
    const png = await frame(mesh, 30 + (360 * i) / n, 28, centre, scale, caption);
    await writeFile(join(tmp, `f${String(i).padStart(4, '0')}.png`), png);
  }
  await writeFile(resolve(dir, 'still-iso.png'), await frame(mesh, 30, 28, centre, scale, caption));
  await writeFile(resolve(dir, 'still-top.png'), await frame(mesh, 0, 89.9, centre, scale, [...caption.slice(0, 1), 'top view: four M4 clearance holes, collar over the centre bore']));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '24', '-i', join(tmp, 'f%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '26', resolve(dir, 'demo.mp4')]);
} finally {
  await rm(tmp, { recursive: true, force: true });
}
