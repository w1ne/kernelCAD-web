// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Export quality gate demo. Runs the real `kernelcad export` CLI on a plate
// with a 0.005 mm sliver step (default warn, then --quality-gate block) and
// on the fixed plate. It captures the terminal output, renders each model
// from its own exported OBJ mesh with the gate's worst findings marked, and
// encodes the frames with ffmpeg.
//
//   npx tsx docs/demos/export-quality-gate/demo.ts
//
// Writes result.json, terminal-*.txt, still-*.png and demo.mp4 next to this
// file. The STEP outputs go to a temp dir and are not kept.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { exportModelTool } from '../../../src/agent/mcp/tools/exportModel';
import type { ExportGeometryQualitySummary } from '../../../src/agent/script-runtime/exportQualityGate';

const dir = dirname(fileURLToPath(import.meta.url));
const repo = resolve(dir, '../../..');
const W = 1280, H = 720, RW = 600; // render column width; terminal fills the rest
type V3 = [number, number, number];
interface Mesh { p: V3[]; f: [number, number, number][] }

function parseObj(bytes: Uint8Array): Mesh {
  const m: Mesh = { p: [], f: [] };
  for (const line of new TextDecoder().decode(bytes).split('\n')) {
    const t = line.trim().split(/\s+/);
    if (t[0] === 'v') m.p.push([Number(t[1]), Number(t[2]), Number(t[3])]);
    if (t[0] === 'f') m.f.push(t.slice(1, 4).map(s => Number(s.split('/')[0]) - 1) as [number, number, number]);
  }
  return m;
}

/** Orthographic Z-up orbit view, flat shading, 2x supersampled. */
function render(m: Mesh, w: number, h: number, centre: V3, scale: number, yawDeg: number, pitchDeg: number, marks: V3[]) {
  const yaw = (yawDeg * Math.PI) / 180, pitch = (pitchDeg * Math.PI) / 180;
  const ss = 2, sw = w * ss, sh = h * ss;
  const rgb = new Uint8ClampedArray(sw * sh * 3);
  for (let i = 0; i < sw * sh; i++) rgb.set([236, 241, 247], i * 3);
  const zb = new Float32Array(sw * sh).fill(-Infinity);
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const proj = (q: V3): V3 => {
    const x = q[0] - centre[0], y = q[1] - centre[1], z = q[2] - centre[2];
    const rx = x * cy - y * sy, ry = x * sy + y * cy;
    return [sw / 2 + rx * scale * ss, sh / 2 - (z * cp + ry * sp) * scale * ss, z * sp - ry * cp];
  };
  const P = m.p.map(proj);
  const light = [0.3, 0.5, 0.81];
  for (const [a, b, c] of m.f) {
    const A = P[a]!, B = P[b]!, C = P[c]!;
    const area = (B[0] - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (B[1] - A[1]);
    if (area === 0) continue;
    // Flat world-space normal, rotated into view space (x right, y up, z toward viewer).
    const a3 = m.p[a]!, b3 = m.p[b]!, c3 = m.p[c]!;
    const u = [b3[0] - a3[0], b3[1] - a3[1], b3[2] - a3[2]], v = [c3[0] - a3[0], c3[1] - a3[1], c3[2] - a3[2]];
    const n = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
    const nl = Math.hypot(n[0]!, n[1]!, n[2]!) || 1;
    const vx = (n[0]! * cy - n[1]! * sy) / nl, vy = (n[0]! * sy + n[1]! * cy) / nl, nz = n[2]! / nl;
    const ndl = Math.abs(vx * light[0]! + (nz * cp + vy * sp) * light[1]! + (nz * sp - vy * cp) * light[2]!);
    const shade = 0.38 + 0.62 * ndl;
    const x0 = Math.max(0, Math.floor(Math.min(A[0], B[0], C[0]))), x1 = Math.min(sw - 1, Math.ceil(Math.max(A[0], B[0], C[0])));
    const y0 = Math.max(0, Math.floor(Math.min(A[1], B[1], C[1]))), y1 = Math.min(sh - 1, Math.ceil(Math.max(A[1], B[1], C[1])));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5, py = y + 0.5;
        const w0 = ((B[0] - px) * (C[1] - py) - (C[0] - px) * (B[1] - py)) / area;
        const w1 = ((C[0] - px) * (A[1] - py) - (A[0] - px) * (C[1] - py)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const z = w0 * A[2] + w1 * B[2] + w2 * C[2];
        const k = y * sw + x;
        if (z <= zb[k]!) continue;
        zb[k] = z;
        rgb.set([96 * shade + 20, 132 * shade + 20, 178 * shade + 20], k * 3);
      }
    }
  }
  return { rgb, sw, sh, marks: marks.map(q => { const s = proj(q); return [s[0] / ss, s[1] / ss] as [number, number]; }) };
}

async function renderPng(m: Mesh, w: number, h: number, centre: V3, scale: number, yaw: number, pitch: number, marks: V3[]) {
  const r = render(m, w, h, centre, scale, yaw, pitch, marks);
  const png = await sharp(Buffer.from(r.rgb.buffer), { raw: { width: r.sw, height: r.sh, channels: 3 } }).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer();
  return { png, marks: r.marks };
}

const esc = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
function wrap(lines: string[], cols: number): string[] {
  return lines.flatMap(l => {
    const out: string[] = [];
    let rest = l;
    while (rest.length > cols) { const cut = rest.lastIndexOf(' ', cols) > cols / 2 ? rest.lastIndexOf(' ', cols) : cols; out.push(rest.slice(0, cut)); rest = `    ${rest.slice(cut).trimStart()}`; }
    out.push(rest);
    return out;
  });
}

/** Run the real CLI, keep the lines a user sees (drop OCCT's STEP writer chatter). */
function cli(args: string[]): { text: string[]; status: number } {
  const r = spawnSync('npx', ['tsx', 'src/agent/cli/index.ts', ...args], { cwd: repo, encoding: 'utf8' });
  const keep = `${r.stdout}\n${r.stderr}`.split('\n').filter(l => l.trim() !== '' && !/^\s*\*|Step File|WorkSession|heap limit|re-executing/.test(l));
  return { text: keep.map(l => l.replace(tmpRoot, '/tmp/out')), status: r.status ?? -1 };
}

let tmpRoot = '';

interface Scene { title: string; sub: string; cmd: string; term: string[]; status: number; mesh: Mesh; q?: ExportGeometryQualitySummary; ok: boolean }

async function frame(s: Scene, yaw: number, view: { centre: V3; scale: number }): Promise<Buffer> {
  const worst = (s.q?.worst ?? []).map(w => w.location as V3);
  // Inset on the worst short edge facing the camera (the strip's outer corner,
  // where the 5 µm step face on the strip's front side is visible).
  const focus = (s.q?.worst ?? []).filter(w => w.kind === 'short-edge').sort((a, b) => b.location[0] - a.location[0] || a.location[1] - b.location[1])[0];
  const MT = 90; // main render top
  const main = await renderPng(s.mesh, RW, 380, view.centre, view.scale, yaw, 32, [...worst, ...(focus ? [focus.location as V3] : [])]);
  const layers: sharp.OverlayOptions[] = [{ input: main.png, left: 0, top: MT }];
  let svg = '';
  // Inset: 30 µm window around the worst finding, so the 5 µm step is visible.
  if (focus !== undefined) {
    const inset = await renderPng(s.mesh, 230, 230, focus.location as V3, Number(process.env.INSET_SCALE ?? 4200), yaw, 32, []);
    const IX = RW - 250, IY = H - 250;
    layers.push({ input: inset.png, left: IX, top: IY });
    const fm = main.marks.at(-1)!;
    svg += `<line x1="${fm[0]}" y1="${fm[1] + MT}" x2="${IX + 115}" y2="${IY}" stroke="#c0392b" stroke-width="2" stroke-dasharray="6 4"/>`;
    svg += `<rect x="${IX}" y="${IY}" width="230" height="230" fill="none" stroke="#c0392b" stroke-width="3"/>`;
    svg += `<text x="${IX - 12}" y="${IY + 24}" text-anchor="end" font-family="DejaVu Sans" font-size="14" fill="#c0392b">zoom x${Math.round(4200 / view.scale)} at [${focus.location.map(n => Number(n.toFixed(3))).join(', ')}]</text>`;
    svg += `<text x="${IX - 12}" y="${IY + 44}" text-anchor="end" font-family="DejaVu Sans" font-size="14" fill="#c0392b">${esc(focus.kind)} ${Number(focus.size.toPrecision(3))} ${focus.unit === 'mm2' ? 'mm²' : 'mm'}: the 5 µm step</text>`;
    for (const [x, y] of main.marks.slice(0, worst.length)) svg += `<circle cx="${x}" cy="${y + MT}" r="14" fill="none" stroke="#c0392b" stroke-width="3"/>`;
  }
  const badge = s.ok ? ['#1e8449', s.status === 0 ? 'exported · quality ok' : 'exported'] : s.status === 0 ? ['#b9770e', 'exported with WARNINGS'] : ['#c0392b', 'BLOCKED · nothing written'];
  svg += `<text x="24" y="44" font-family="DejaVu Sans" font-size="26" font-weight="bold" fill="#1d2b40">${esc(s.title)}</text>`;
  svg += `<text x="24" y="76" font-family="DejaVu Sans" font-size="16" fill="#3d4f6b">${esc(s.sub)}</text>`;
  svg += `<rect x="24" y="${H - 54}" width="${badge[1]!.length * 11.5 + 30}" height="34" rx="6" fill="${badge[0]}"/><text x="36" y="${H - 31}" font-family="DejaVu Sans" font-size="17" font-weight="bold" fill="#fff">${esc(badge[1]!)}</text>`;
  // Terminal column.
  svg += `<rect x="${RW}" y="0" width="${W - RW}" height="${H}" fill="#14181f"/>`;
  const lines = wrap([`$ ${s.cmd}`, ...s.term, `[exit ${s.status}]`], 92);
  lines.forEach((l, i) => {
    const colour = l.startsWith('$') ? '#8fd18f' : /^WARN/.test(l) ? '#f5c26b' : /^ERROR/.test(l) ? '#ff7b72' : l.startsWith('[exit') ? '#9aa7b8' : '#d7dde6';
    svg += `<text x="${RW + 18}" y="${34 + i * 18}" font-family="DejaVu Sans Mono" font-size="12" fill="${colour}" xml:space="preserve">${esc(l)}</text>`;
  });
  svg += `<text x="${RW + 18}" y="${H - 16}" font-family="DejaVu Sans" font-size="12" fill="#6f7d91">Local validation: real kernelcad CLI run in this repository; renders from the exported OBJ mesh.</text>`;
  return sharp({ create: { width: W, height: H, channels: 3, background: '#ecf1f7' } })
    .composite([...layers, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`), left: 0, top: 0 }])
    .png().toBuffer();
}

await initOcct();
tmpRoot = await mkdtemp(join(tmpdir(), 'qgate-demo-'));
try {
  const rel = (f: string) => relative(repo, resolve(dir, f));
  const sliver = rel('plate-sliver.kcad.ts'), fixed = rel('plate-fixed.kcad.ts');
  const runs = [
    { title: '1 · Plate with a 0.005 mm sliver step', sub: 'strip typed 6.005 mm tall on a 6 mm plate · default gate: warn', file: sliver, args: [] as string[], gate: 'warn' as const },
    { title: '2 · Same model, --quality-gate block', sub: 'findings become errors; no STEP file is written', file: sliver, args: ['--quality-gate', 'block'], gate: 'block' as const },
    { title: '3 · Fixed: strip height = t', sub: 'one shared value instead of a typed 6.005 · default gate: warn', file: fixed, args: [] as string[], gate: 'warn' as const },
  ];
  const scenes: Scene[] = [];
  const result: Record<string, unknown>[] = [];
  for (const [i, r] of runs.entries()) {
    const out = join(tmpRoot, `plate-${i + 1}.step`);
    const args = ['export', 'step', r.file, '-o', out, ...r.args];
    const c = cli(args);
    const tool = await exportModelTool({ file: resolve(repo, r.file), format: 'step', output_path: join(tmpRoot, `mcp-${i + 1}.step`), qualityGate: r.gate });
    const obj = await runAndExport({ code: (await import('node:fs')).readFileSync(resolve(repo, r.file), 'utf8'), fileName: r.file, format: 'obj', qualityGate: { mode: 'off' } });
    scenes.push({ title: r.title, sub: r.sub, cmd: `kernelcad ${args.join(' ').replace(tmpRoot, '/tmp/out')}`, term: c.text, status: c.status, mesh: parseObj(obj.bytes), q: tool.geometryQuality, ok: tool.geometryQuality?.ok === true });
    await writeFile(resolve(dir, `terminal-${i + 1}.txt`), `$ ${scenes.at(-1)!.cmd}\n${c.text.join('\n')}\n[exit ${c.status}]\n`);
    result.push({ invocation: scenes.at(-1)!.cmd, exitCode: c.status, stepWritten: existsSync(out), mcp: { ok: tool.ok, geometryQuality: tool.geometryQuality, diagnostics: tool.diagnostics?.map(d => ({ code: d.code, severity: d.severity, message: d.message })) } });
  }
  await writeFile(resolve(dir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result.map(r => ({ invocation: r.invocation, exitCode: r.exitCode, stepWritten: r.stepWritten })), null, 2));

  const view = { centre: [30, 20, 3] as V3, scale: 6.4 };
  const fps = 24, perScene = 4 * fps;
  const stillsOnly = process.env.STILLS_ONLY === '1'; // quick layout iteration
  const frames = join(tmpRoot, 'frames');
  await (await import('node:fs/promises')).mkdir(frames);
  let k = 0;
  for (const [i, s] of scenes.entries()) {
    for (let j = 0; j < (stillsOnly ? 0 : perScene); j++) {
      await writeFile(join(frames, `f${String(k++).padStart(4, '0')}.png`), await frame(s, -35 + (20 * j) / perScene, view));
    }
    await writeFile(resolve(dir, `still-${i + 1}.png`), await frame(s, -25, view));
  }
  if (!stillsOnly) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(frames, 'f%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', resolve(dir, 'demo.mp4')]);
} finally {
  await rm(tmpRoot, { recursive: true, force: true });
}
