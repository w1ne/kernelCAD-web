// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Observations only: replay never advances or feeds the solver.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { loadMujocoSession } from '../../../src/modeling/runtime/mujocoSession';

const output = dirname(fileURLToPath(import.meta.url));
const fixture = new URL('../../../examples/physics/two-wheel-mechanical-port.xml', import.meta.url);
const source = new URL('../../../src/modeling/runtime/mujocoSessionCore.ts', import.meta.url);
const xml = await readFile(fixture, 'utf8');
const bodyOrder = ['chassis', 'wheel_left', 'wheel_right'];
const dt = 0.001, fps = 20;
interface Sample { timeS: number; effortNm: number; bodies: Array<{ body: string; matrix: readonly number[];
    velocityMps: readonly number[]; angularVelocityRadS: readonly number[] }> }
const samples: Sample[] = [];
const session = await loadMujocoSession(xml, bodyOrder, []);
try {
    session.forward();
    for (let step = 0; step <= 150; step++) {
        const effortNm = step > 100 ? 0.01 : 0;
        if (step > 0) { session.setJointEfforts({ left_wheel: effortNm, right_wheel: effortNm }); session.stepFixed(1, dt); }
        if (step % 5 !== 0) continue;
        const timeS = session.timeSeconds, poses = session.bodyPosesNow(), velocities = session.bodyVelocitiesNow();
        samples.push({ timeS, effortNm, bodies: bodyOrder.map(body => ({ body, matrix: poses.get(body)!.matrix,
            ...velocities.get(body)! })) });
        assert.equal(session.timeSeconds, timeS, 'observing body velocity must not advance time');
    }
} finally { session.dispose(); }
assert(samples.at(-1)!.bodies[1].angularVelocityRadS[1] > 1);
assert(samples.every(s => s.bodies.every(b => [...b.matrix, ...b.velocityMps, ...b.angularVelocityRadS].every(Number.isFinite))));

function point(m: readonly number[], x: number, y: number, z: number): [number, number] {
    return [m[0] * x + m[4] * y + m[8] * z + m[12], m[2] * x + m[6] * y + m[10] * z + m[14]];
}
function render(s: Sample): string {
    const chassis = s.bodies[0], wheel = s.bodies[1];
    const project = ([x, z]: readonly number[]) => [300 + 1.65 * x, 455 - 1.65 * z];
    const outline = [[-45, 15], [45, 15], [45, 95], [-45, 95]]
        .map(([x, z]) => project(point(chassis.matrix, x, 0, z)).join(',')).join(' ');
    const [wx, wz] = project(point(wheel.matrix, 0, -10.7, 0));
    const [sx, sz] = project(point(wheel.matrix, 32.5, -10.7, 0));
    const [bx, bz] = project(point(chassis.matrix, 0, 0, 0));
    const vx = chassis.velocityMps[0] * 400, vz = -chassis.velocityMps[2] * 400;
    const f = (n: number) => n.toFixed(4);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
    <rect width="1280" height="720" fill="#eef3f9"/><rect width="1280" height="8" fill="#26719a"/>
    <text x="40" y="55" class="title">Measured body velocity at the completed frontier</text>
    <text x="40" y="90" class="subtitle">Actual MuJoCo 3.9.0 state · world axes · regular body origin · SI units</text>
    <text x="40" y="120" class="small">LOCAL TORQUE PROBE · assumed masses and inertias · firmware is not connected</text>
    <rect x="40" y="145" width="535" height="510" rx="14" fill="white" stroke="#cedbe8"/>
    <rect x="595" y="145" width="645" height="510" rx="14" fill="white" stroke="#cedbe8"/>
    <text x="62" y="181" class="section">t = ${s.timeS.toFixed(3)} s · torque ${s.effortNm.toFixed(3)} N·m / wheel</text>
    <text x="62" y="209" class="small">${s.timeS <= 0.100001 ? 'Gravity and ground contact' : 'Applied torque; body reacts and moves'}</text>
    <path d="M62,455 H553" stroke="#5d7089" stroke-width="3"/>
    <polygon points="${outline}" fill="#b4d5ed" stroke="#306a94" stroke-width="3"/>
    <circle cx="${wx}" cy="${wz}" r="53.625" fill="#25354d"/><circle cx="${wx}" cy="${wz}" r="39.6" fill="#d4b733"/>
    <path d="M${wx},${wz} L${sx},${sz}" stroke="white" stroke-width="4"/>
    <circle cx="${bx}" cy="${bz}" r="6" fill="#bd307d" stroke="white" stroke-width="2"/>
    <path d="M${bx},${bz} l${vx},${vz}" stroke="#bd307d" stroke-width="4" marker-end="url(#arrow)"/>
    <text x="62" y="493" class="small">Side projection; the two wheels overlap.</text>
    <text x="62" y="521" class="small">Pink: body origin and measured linear velocity.</text>
    <text x="62" y="559" class="small">Body origin differs from its center of mass.</text>
    <text x="62" y="587" class="small">World +X → right, +Z → up, +Y → into view.</text>
    <text x="62" y="625" class="small">Pose and velocity share one solver timestamp.</text>
    ${s.bodies.map((b, i) => `<text x="617" y="${183 + i * 137}" class="section">${b.body}</text>
      <text x="617" y="${215 + i * 137}" class="mono">v [m/s]   [${b.velocityMps.map(f).join(', ')}]</text>
      <text x="617" y="${245 + i * 137}" class="mono">ω [rad/s] [${b.angularVelocityRadS.map(f).join(', ')}]</text>
      <line x1="617" x2="1217" y1="${267 + i * 137}" y2="${267 + i * 137}" stroke="#e1e8f1"/>`).join('')}
    <text x="617" y="625" class="small">Read copied values. Do not derive motion from playback time.</text>
    <text x="40" y="694" class="small">1 ms integration · 20× slower replay of measured states · source, model and trace retained</text>
    <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L6,3 L0,6 Z" fill="#bd307d"/></marker></defs>
    <style>text{font-family:'DejaVu Sans',sans-serif;fill:#1c2d44}.title{font-size:31px;font-weight:700}.subtitle{font-size:22px}.section{font-size:20px;font-weight:700}.small{font-size:16px;fill:#475d79}.mono{font-size:18px;font-family:'DejaVu Sans Mono',monospace}</style></svg>`;
}
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const require_ = createRequire(import.meta.url), engineDir = dirname(require_.resolve('@mujoco/mujoco'));
const proof = { capturedAt: new Date().toISOString(), engineVersion: '3.9.0', timestepS: dt,
    fixtureSha256: hash(xml), sessionSourceSha256: hash(await readFile(source)),
    engineWasmSha256: hash(await readFile(join(engineDir, 'mujoco.wasm'))),
    scope: 'Actual mechanical torque/contact probe, assumed dynamics; no firmware, stability or hardware claim.',
    units: { linearVelocity: 'm/s', angularVelocity: 'rad/s', poseTranslation: 'mm', time: 's' },
    observationFrame: 'World axes at the regular body origin (mjOBJ_XBODY), not COM. Observation does not advance time.', samples };
await writeFile(join(output, 'trace.json'), JSON.stringify(proof, null, 2) + '\n');
const temp = await mkdtemp(join(tmpdir(), 'kcad-body-velocity-'));
try {
    const pngs: string[] = [];
    for (const [i, sample] of samples.entries()) {
        const path = join(temp, `sample-${i}.png`); await sharp(Buffer.from(render(sample))).png().toFile(path); pngs.push(path);
    }
    const frames = [...Array(20).fill(0), ...pngs.flatMap((_, i) => [i, i]), ...Array(20).fill(pngs.length - 1)];
    for (const [i, sample] of frames.entries()) await copyFile(pngs[sample], join(temp, `frame-${String(i).padStart(4, '0')}.png`));
    await copyFile(pngs.at(-1)!, join(output, 'poster.png'));
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(fps), '-i', join(temp, 'frame-%04d.png'),
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', join(output, 'demo.mp4')]);
    execFileSync('ffmpeg', ['-v', 'error', '-i', join(output, 'demo.mp4'), '-f', 'null', '-']);
    await writeFile(join(output, 'verification.json'), JSON.stringify({ ...Object.fromEntries(Object.entries(proof).filter(([k]) => k !== 'samples')),
        fps, frames: frames.length, durationS: frames.length / fps, width: 1280, height: 720,
        videoSha256: hash(await readFile(join(output, 'demo.mp4'))),
        invocation: 'npx tsx docs/demos/mechanical-body-velocity-20261125/capture-demo.ts',
        decode: 'ffmpeg -v error -i demo.mp4 -f null - passed', visualInspection: 'pending' }, null, 2) + '\n');
} finally { await rm(temp, { recursive: true, force: true }); }
console.log(JSON.stringify({ output, last: samples.at(-1) }));
