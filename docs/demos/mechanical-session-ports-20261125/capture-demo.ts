// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Render only measured MuJoCo states. This replay never drives the simulation clock.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp, rm, copyFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { loadMujocoSession, type MujocoSession } from '../../../src/modeling/runtime/mujocoSession';

const output = dirname(fileURLToPath(import.meta.url));
const fixtureUrl = new URL('../../../examples/physics/two-wheel-mechanical-port.xml', import.meta.url);
const sourceUrl = new URL('../../../src/modeling/runtime/mujocoSessionCore.ts', import.meta.url);
const XML = await readFile(fixtureUrl, 'utf8');
const DT = 0.001;
const FPS = 20;
const TOTAL_STEPS = 300;
const bodyOrder = ['chassis', 'wheel_left', 'wheel_right'];

interface Sample {
    timeS: number;
    effortNm: number;
    wheelRadS: number;
    gyroRadS: readonly number[];
    accelMps2: readonly number[];
    pitchDeg: number;
    apparentTiltDeg: number;
    chassisMatrixMm: readonly number[];
    wheelMatrixMm: readonly number[];
    contacts: number;
}

function sample(session: MujocoSession, effortNm: number): Sample {
    const byName = new Map(session.sensorReadingsNow().map((sensor) => [sensor.name, sensor.values]));
    const accel = byName.get('imu_accel')!;
    const poses = session.bodyPosesNow();
    const q = session.getQpos();
    return {
        timeS: session.timeSeconds,
        effortNm,
        wheelRadS: session.scalarJointStatesNow()[0].velocity,
        gyroRadS: byName.get('imu_gyro')!,
        accelMps2: accel,
        pitchDeg: 2 * Math.atan2(q[5], q[3]) * 180 / Math.PI,
        apparentTiltDeg: Math.atan2(accel[1], accel[2]) * 180 / Math.PI,
        chassisMatrixMm: poses.get('chassis')!.matrix,
        wheelMatrixMm: poses.get('wheel_left')!.matrix,
        contacts: session.compiledContacts().length,
    };
}

async function record(sign: number): Promise<Sample[]> {
    const session = await loadMujocoSession(XML, bodyOrder, []);
    try {
        session.assertExternalJointOwnership(['left_wheel', 'right_wheel']);
        session.forward();
        const samples = [sample(session, 0)];
        for (let step = 1; step <= TOTAL_STEPS; step++) {
            const effort = step > 100 && step <= 150 ? sign * 0.01 : 0;
            session.setJointEfforts({ left_wheel: effort, right_wheel: effort });
            session.stepFixed(1, DT);
            if (step % 5 === 0) samples.push(sample(session, effort));
        }
        return samples;
    } finally {
        session.dispose();
    }
}

function point(matrix: readonly number[], x: number, y: number, z: number): [number, number] {
    return [
        matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
        matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
    ];
}

function panel(samples: readonly Sample[], index: number, x: number, positive: boolean): string {
    const s = samples[index];
    const center = x + 285;
    const ground = 420;
    const scale = 1.7;
    const project = ([px, pz]: readonly number[]): [number, number] => [center + px * scale, ground - pz * scale];
    const outline = [[-45, 15], [45, 15], [45, 95], [-45, 95]]
        .map(([px, pz]) => project(point(s.chassisMatrixMm, px, 0, pz)).join(',')).join(' ');
    const [wx, wz] = project(point(s.wheelMatrixMm, 0, -10.7, 0));
    const [sx, sz] = project(point(s.wheelMatrixMm, 32.5, -10.7, 0));
    const [ix, iz] = project(point(s.chassisMatrixMm, 0, 25, 19.5));
    const phase = s.timeS <= 0.100001 ? 'Gravity and contact' : s.timeS <= 0.150001 ? 'Applied wheel torque' : 'Zero torque; free motion';
    const chartRange = Math.max(1, ...samples.map((p) => Math.abs(p.gyroRadS[0])));
    const chart = samples.slice(0, index + 1).map((p) => {
        const cx = x + 22 + p.timeS / 0.3 * 525;
        const cy = 628 - p.gyroRadS[0] / chartRange * 15;
        return cx.toFixed(2) + ',' + cy.toFixed(2);
    }).join(' ');
    const f = (value: number, digits = 3) => value.toFixed(digits);
    return `
      <rect x="${x}" y="135" width="580" height="529" rx="16" fill="#fff" stroke="#d5dfed"/>
      <text x="${x + 22}" y="169" class="panelTitle">${positive ? '+' : '−'}0.010 N·m per wheel for 50 ms</text>
      <text x="${x + 22}" y="196" class="small">${phase} · t = ${f(s.timeS)} s</text>
      <path d="M${x + 22},${ground} H${x + 558}" stroke="#596b83" stroke-width="3"/>
      <polygon points="${outline}" fill="#9fc5e7" stroke="#2f6a9e" stroke-width="3"/>
      <circle cx="${wx}" cy="${wz}" r="${32.5 * scale}" fill="#283348" stroke="#162035" stroke-width="3"/>
      <circle cx="${wx}" cy="${wz}" r="${24 * scale}" fill="#dfb629"/>
      <path d="M${wx},${wz} L${sx},${sz}" stroke="#fff" stroke-width="4"/>
      <circle cx="${ix}" cy="${iz}" r="6" fill="#c63391" stroke="#fff" stroke-width="2"/>
      <text x="${x + 22}" y="452" class="small">Side projection · wheel pair overlaps · pink site = IMU</text>
      <text x="${x + 22}" y="486" class="value">Axle X: ${f(s.chassisMatrixMm[12])} mm   Wheel: ${f(s.wheelRadS)} rad/s</text>
      <text x="${x + 22}" y="515" class="value">Gyro X: ${f(s.gyroRadS[0])} rad/s   Pitch: ${f(s.pitchDeg, 2)}°</text>
      <text x="${x + 22}" y="544" class="value">Accel: [${s.accelMps2.map((a) => f(a, 2)).join(', ')}] m/s²</text>
      <text x="${x + 22}" y="573" class="small">atan2(AY, AZ): ${f(s.apparentTiltDeg, 2)}° · includes motion acceleration</text>
      <text x="${x + 22}" y="601" class="small">Actual torque: ${f(s.effortNm)} N·m · Contacts: ${s.contacts}</text>
      <line x1="${x + 22}" y1="628" x2="${x + 547}" y2="628" stroke="#e0e7f0"/>
      <polyline points="${chart}" fill="none" stroke="#2f6a9e" stroke-width="2"/>
      <text x="${x + 545}" y="654" text-anchor="end" class="tiny">gyro X trace · 0 → 300 ms</text>`;
}

function render(samples: readonly Sample[][], index: number): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
      <rect width="1280" height="720" fill="#edf2f8"/>
      <rect width="1280" height="8" fill="#2f6a9e"/>
      <text x="40" y="57" class="title">MuJoCo mechanical session ports</text>
      <text x="40" y="91" class="subtitle">Torque → free chassis + wheel contact → site accelerometer and gyro</text>
      <text x="40" y="118" class="small">LOCAL SIMULATION · assumed proxy masses/inertias · no MCU or hardware acceptance</text>
      ${panel(samples[0], index, 40, true)}
      ${panel(samples[1], index, 660, false)}
      <text x="40" y="697" class="small">1 ms integration · 20× slower measured replay · complete XML, source and trace retained</text>
      <style>
        text { font-family: 'DejaVu Sans', sans-serif; fill: #17263d; }
        .title { font-size: 34px; font-weight: 700; }
        .subtitle { font-size: 23px; }
        .panelTitle { font-size: 23px; font-weight: 700; }
        .small { font-size: 16px; fill: #425671; }
        .value { font-size: 18px; font-family: 'DejaVu Sans Mono', monospace; }
        .tiny { font-size: 12px; fill: #526982; }
      </style>
    </svg>`;
}

const traces = [await record(1), await record(-1)];
const at150 = traces.map((trace) => trace[30]);
assert(at150[0].chassisMatrixMm[12] > 4 && at150[1].chassisMatrixMm[12] < -4);
assert(at150[0].gyroRadS[0] < -3 && at150[1].gyroRadS[0] > 3);
const require_ = createRequire(import.meta.url);
const engineDir = dirname(require_.resolve('@mujoco/mujoco'));
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const proof = {
    capturedAt: new Date().toISOString(),
    scope: 'Local mechanical-engine simulation only. Torque input is a declared test signal; no MCU, motor calibration or balance claim.',
    engineVersion: JSON.parse(await readFile(join(engineDir, 'package.json'), 'utf8')).version,
    engineWasmSha256: hash(await readFile(join(engineDir, 'mujoco.wasm'))),
    fixtureSha256: hash(XML),
    sessionSourceSha256: hash(await readFile(sourceUrl)),
    timestepS: DT, stepsPerCase: TOTAL_STEPS, sampledEverySteps: 5,
    control: 'Zero torque 0..100 ms; +/-0.01 N*m per wheel 100..150 ms; zero torque thereafter.',
    at150ms: at150,
    traces,
};
await mkdir(output, { recursive: true });
await writeFile(join(output, 'trace.json'), JSON.stringify(proof, null, 2) + '\n');
const temp = await mkdtemp(join(tmpdir(), 'kcad-mechanical-port-demo-'));
try {
    const pngs: string[] = [];
    for (let i = 0; i < traces[0].length; i++) {
        const png = join(temp, `sample-${i}.png`);
        await sharp(Buffer.from(render(traces, i))).png().toFile(png);
        pngs.push(png);
    }
    const frames = [...Array(20).fill(0), ...pngs.flatMap((_, i) => [i, i]), ...Array(20).fill(pngs.length - 1)];
    for (const [frame, index] of frames.entries()) {
        await copyFile(pngs[index], join(temp, `frame-${String(frame).padStart(4, '0')}.png`));
    }
    await copyFile(pngs[30], join(output, 'poster.png'));
    await copyFile(pngs.at(-1)!, join(output, 'final-frame.png'));
    const args = ['-y', '-v', 'error', '-framerate', String(FPS), '-i', join(temp, 'frame-%04d.png'),
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', join(output, 'demo.mp4')];
    execFileSync('ffmpeg', args, { stdio: 'inherit' });
    await writeFile(join(output, 'verification.json'), JSON.stringify({
        fixtureSha256: proof.fixtureSha256,
        engineWasmSha256: proof.engineWasmSha256,
        sessionSourceSha256: proof.sessionSourceSha256,
        fps: FPS, width: 1280, height: 720, frames: frames.length,
        durationS: frames.length / FPS,
        videoSha256: hash(await readFile(join(output, 'demo.mp4'))),
        invocation: 'npx tsx docs/demos/mechanical-session-ports-20261125/capture-demo.ts',
        evidence: 'All displayed poses and sensor values are sampled from actual solver states.',
        visualInspection: 'pending',
    }, null, 2) + '\n');
} finally {
    await rm(temp, { recursive: true, force: true });
}
console.log(JSON.stringify({ output, cases: 2, at150ms: at150.map((s) => ({
    xMm: s.chassisMatrixMm[12], wheelRadS: s.wheelRadS, gyroXRadS: s.gyroRadS[0],
    pitchDeg: s.pitchDeg, apparentTiltDeg: s.apparentTiltDeg,
})) }));
