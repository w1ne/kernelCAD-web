// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replays recorded solver states. This renderer never advances a joint or simulation.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdtemp, rm, copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import type { MujocoScalarJointState, CompiledGeom } from '../../../src/modeling/runtime/mujocoSessionCore';
import type { ContactDynamicsResult } from '../../../src/modeling/runtime/contactDynamics';
interface Sample { timeSeconds: number; joints: readonly MujocoScalarJointState[]; poses: Record<string, readonly number[]>; normalLoadsN: number[] }
interface Run { dtSeconds: number; result: ContactDynamicsResult; trace: Sample[]; compiledGeoms: CompiledGeom[] }
interface Proof { runs: Run[]; settings: { durationSeconds: number }; sourceSha256: string; mjcfSha256: string }

const folder = dirname(fileURLToPath(import.meta.url));
const proof = JSON.parse(await readFile(join(folder, 'results.json'), 'utf8')) as Proof;
const xml = await readFile(join(folder, 'model.xml'), 'utf8');
const run = proof.runs.at(-1)!;
const result = run.result;
const colors: Record<string, string> = { base: '#e2e5ea', wheel: '#c49b35', anchor: '#2c6190', entry: '#ba294b', exit: '#ba294b' };
type Point = [number, number];
function convexHull(points: Point[]): Point[] {
    const sorted = [...new Map(points.map(p => [p.join(','), p])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (a: Point, b: Point, c: Point) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const half = (list: Point[]) => {
        const out: Point[] = [];
        for (const p of list) {
            while (out.length >= 2 && cross(out.at(-2)!, out.at(-1)!, p) <= 0) out.pop();
            out.push(p);
        }
        return out;
    };
    return [...half(sorted).slice(0, -1), ...half(sorted.reverse()).slice(0, -1)];
}
const meshes = new Map<string, Point[]>();
for (const match of xml.matchAll(/<mesh name="([^"]+)"[^>]*vertex="([^"]+)"/g)) {
    const values = match[2].trim().split(/\s+/).map(Number);
    const points: Point[] = [];
    for (let i = 0; i < values.length; i += 3) points.push([values[i], values[i + 1]]);
    meshes.set(match[1], convexHull(points));
}
function geometry(sample: Sample, scale = 3.5, cx = 260, cy = 510, includeBase = true) {
    let svg = '';
    for (const body of includeBase ? ['base', 'wheel', 'anchor', 'entry', 'exit'] : ['wheel', 'anchor', 'entry', 'exit']) {
        const matrix = sample.poses[body];
        for (const geom of run.compiledGeoms.filter((g) => g.body === body && g.group === 1 && g.mesh)) {
            const hull = meshes.get(geom.mesh!);
            if (!hull) throw new Error(`Missing mesh ${geom.mesh}`);
            const points = hull.map(([x, y]) => [cx + scale * (matrix[0] * x + matrix[4] * y + matrix[12]),
                cy - scale * (matrix[1] * x + matrix[5] * y + matrix[13])].join(',')).join(' ');
            svg += `<polygon points="${points}" fill="${colors[body]}"/>`;
        }
    }
    for (const body of ['wheel', 'anchor']) {
        const m = sample.poses[body];
        svg += `<circle cx="${cx + scale * m[12]}" cy="${cy - scale * m[13]}" r="6" fill="#fafbfe"/>`;
    }
    return svg;
}
function chart(index: number, pairIndex: number, color: string) {
    const maxForce = Math.max(0.0001, ...run.trace.map((s) => s.normalLoadsN[pairIndex]));
    const points = run.trace.slice(0, index + 1).map((s) => `${730 + s.timeSeconds / proof.settings.durationSeconds * 470},${610 - s.normalLoadsN[pairIndex] / maxForce * 54}`).join(' ');
    return `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2.5"/>`;
}
const f = (x: number, n = 3) => x.toFixed(n);
function frame(index: number) {
    const sample = run.trace[index];
    const entry = result.pairs[0], exit = result.pairs[1];
    const coarse = proof.runs[0].result;
    const wheelStart = result.initialJoints.find((j) => j.name === 'wheel')!.position;
    const wheelNow = sample.joints.find((j) => j.name === 'wheel')!.position;
    const advanceDeg = (wheelStart - wheelNow) * 180 / Math.PI;
    const status = result.ok ? 'PASS: declared contact criteria' : 'FAIL: declared contact criteria';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
      <rect width="1280" height="720" fill="#f6f8fc"/>
      <text x="40" y="53" class="title">Deadbeat escapement: independent contact check</text>
      <text x="40" y="88" class="sub">Constant wheel torque · two free hinges · separate entry and exit pallets</text>
      <text x="40" y="117" class="small">LOCAL SIMULATION · assumed scale, densities, losses and drive · original has no restoring oscillator</text>
      <rect x="40" y="143" width="630" height="535" rx="14" fill="#ffffff"/>
      ${geometry(sample)}
      <defs><clipPath id="contact"><rect x="445" y="258" width="190" height="190" rx="6"/></clipPath></defs>
      <rect x="445" y="258" width="190" height="190" rx="6" fill="#f6f8fc"/>
      <g clip-path="url(#contact)">${geometry(sample, 15, 540 + 25 * 15, 353 + 23 * 15, false)}</g>
      <text x="445" y="242" class="small">Entry contact · 4.3×</text>
      <text x="62" y="174" class="small">Native collision geometry · t = ${f(sample.timeSeconds)} s</text>
      <text x="62" y="210" class="small">Measured wheel advance: ${f(advanceDeg, 4)}°</text>
      <text x="62" y="650" class="small">Torque: −0.010 mN·m · no prescribed motion after t = 0</text>
      <text x="710" y="175" class="status" style="fill:${result.ok ? '#1a7054' : '#aa243d'}">${status}</text>
      <text x="710" y="206" class="small">${f(result.durationSeconds, 1)} s at ${f(run.dtSeconds * 1000, 2)} ms · ${result.steps} steps</text>
      <text x="710" y="250" class="label">Acceptance requirement</text><text x="1205" y="250" text-anchor="end" class="label">Measured</text>
      <text x="710" y="286" class="value">Entry contact episodes ≥ 2</text><text x="1205" y="286" text-anchor="end" class="number">${entry.episodes}</text>
      <text x="710" y="322" class="value">Exit contact episodes ≥ 2</text><text x="1205" y="322" text-anchor="end" class="number">${exit.episodes}</text>
      <text x="710" y="358" class="value">Entry → exit sequences ≥ 2</text><text x="1205" y="358" text-anchor="end" class="number">${result.contactSequence?.cycles ?? 0}</text>
      <text x="710" y="394" class="value">Maximum penetration ≤ 0.10 mm</text><text x="1205" y="394" text-anchor="end" class="number">${f(Math.max(entry.maxPenetrationMm, exit.maxPenetrationMm), 6)}</text>
      <text x="710" y="439" class="small">Peak normal force: entry ${f(entry.peakNormalForceN * 1000, 2)} mN / exit ${f(exit.peakNormalForceN * 1000, 2)} mN</text>
      <text x="710" y="472" class="small">At 0.50 ms: ${coarse.contactSequence?.cycles ?? 0} sequences; ${coarse.ok ? 'PASS' : 'FAIL'}</text>
      <text x="710" y="505" class="small">Episode counts can include contact chatter; they are not clock cycles.</text>
      <text x="710" y="544" class="label">Recorded normal loads · each trace has its own scale</text>
      ${chart(index, 0, '#b93054')}${chart(index, 1, '#2c6190')}
      <text x="730" y="637" class="tiny">0 s</text><text x="1200" y="637" text-anchor="end" class="tiny">2 s · sampled every 10 ms</text>
      <text x="710" y="666" class="small">Entry: ${f(sample.normalLoadsN[0] * 1000, 2)} mN   Exit: ${f(sample.normalLoadsN[1] * 1000, 2)} mN</text>
      <text x="40" y="704" class="small">Recorded solver replay at 5× slower speed · contact checked every step · no hardware acceptance</text>
      <style>
        text { font-family: 'DejaVu Sans', sans-serif; fill: #17263c; }
        .title { font-size: 30px; font-weight: 700; }
        .sub { font-size: 22px; }
        .small { font-size: 15px; fill: #46566e; }
        .status { font-size: 24px; font-weight: 700; }
        .label { font-size: 17px; font-weight: 700; }
        .value { font-size: 17px; }
        .number { font-family: 'DejaVu Sans Mono', monospace; font-size: 20px; font-weight: 700; }
        .tiny { font-size: 13px; fill: #52647e; }
      </style>
    </svg>`;
}
const temp = await mkdtemp(join(tmpdir(), 'kcad-deadbeat-contact-'));
try {
    const files: string[] = [];
    for (let i = 0; i < run.trace.length; ++i) {
        const file = join(temp, `sample-${i}.png`);
        await sharp(Buffer.from(frame(i))).png().toFile(file);
        files.push(file);
    }
    const order = [...Array(20).fill(0), ...files.map((_, i) => i), ...Array(20).fill(files.length - 1)];
    for (const [i, sample] of order.entries()) await copyFile(files[sample], join(temp, `frame-${String(i).padStart(4, '0')}.png`));
    await copyFile(files[0], join(folder, 'first-frame.png'));
    await copyFile(files[Math.floor(files.length / 2)], join(folder, 'poster.png'));
    await copyFile(files.at(-1)!, join(folder, 'final-frame.png'));
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', '20', '-i', join(temp, 'frame-%04d.png'),
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', join(folder, 'demo.mp4')]);
    execFileSync('ffmpeg', ['-v', 'error', '-i', join(folder, 'demo.mp4'), '-f', 'null', '-']);
    await writeFile(join(folder, 'verification.json'), JSON.stringify({
        generatedAt: new Date().toISOString(), sourceSha256: proof.sourceSha256, mjcfSha256: proof.mjcfSha256,
        videoSha256: createHash('sha256').update(await readFile(join(folder, 'demo.mp4'))).digest('hex'),
        fps: 20, width: 1280, height: 720, frames: order.length, durationSeconds: order.length / 20,
        invocation: 'npx tsx docs/demos/contact-dynamics-20261126/run-studies.ts && npx tsx docs/demos/contact-dynamics-20261126/capture-demo.ts',
        evidence: 'Every displayed pose and load is read from recorded native solver states. Collision geometry is projected from the exact MJCF convex pieces.',
        fullVideoDecode: 'passed', visualInspection: 'pending',
    }, null, 2) + '\n');
} finally { await rm(temp, { recursive: true, force: true }); }
