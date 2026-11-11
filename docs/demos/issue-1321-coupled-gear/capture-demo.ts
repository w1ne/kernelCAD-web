// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Reproduce the authored coupling, run its native MuJoCo release check, and
// package the observed joint trajectory as CSV, JSON, and an inspectable MP4.
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import type { Assembly } from '../../../src/modeling/capture/assembly';
import { runScript } from '../../../src/composition/runScript';
import { checkMechanismTruth } from '../../../src/modeling/runtime/mechanismTruth';
import { loadMujocoSession } from '../../../src/modeling/runtime/mujocoSession';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const MODEL = resolve(ROOT, 'coupled-gear.kcad.ts');
const RATIO = -12 / 48;
const RAD_TO_DEG = 180 / Math.PI;
const WIDTH = 1280;
const HEIGHT = 720;
const FRAMES = resolve(ROOT, '.frames');

interface Sample {
  readonly step: number;
  readonly seconds: number;
  readonly inputDeg: number;
  readonly outputDeg: number;
  readonly residualDeg: number;
}

async function loadAssembly(): Promise<Assembly> {
  const result = await runScript({
    code: await readFile(MODEL, 'utf8'),
    fileName: MODEL,
    scriptDir: ROOT,
  });
  const arm = [...(result.session.assemblies as Map<string, Assembly>).values()][0];
  if (!arm) throw new Error('The authored coupling assembly was not captured.');
  return arm;
}

function chartSvg(samples: readonly Sample[], frame: number, verdict: string): string {
  const visible = samples.slice(0, Math.max(1, Math.ceil(samples.length * frame / 5)));
  const x0 = 102;
  const y0 = 544;
  const plotW = 1070;
  const plotH = 350;
  const x = (step: number) => x0 + (step / Math.max(1, samples.length - 1)) * plotW;
  const yAngle = (degrees: number) => y0 - ((degrees + 200) / 400) * plotH;
  const yResidual = (degrees: number) => y0 - (degrees / 5) * plotH;
  const polyline = (key: 'inputDeg' | 'outputDeg' | 'residualDeg', map: (n: number) => number) =>
    visible.map((sample) => `${x(sample.step - 1).toFixed(1)},${map(sample[key]).toFixed(1)}`).join(' ');
  const residualMax = Math.max(0, ...visible.map((sample) => Math.abs(sample.residualDeg)));
  const endTime = visible.at(-1)?.seconds.toFixed(3) ?? '0.000';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="100%" height="100%" fill="#10151d"/>
  <text x="70" y="68" fill="#f2f5f8" font-family="Arial,sans-serif" font-size="32" font-weight="700">KernelCAD · coupled 12:48 gear release</text>
  <text x="70" y="105" fill="#aeb8c4" font-family="Arial,sans-serif" font-size="18">Native MuJoCo scalar constraint · authored ratio −1/4 · 500 integration observations</text>
  <rect x="${x0}" y="194" width="${plotW}" height="${plotH}" rx="8" fill="#171f2a" stroke="#384451"/>
  ${[-180, -90, 0, 90, 180].map((value) => `<line x1="${x0}" y1="${yAngle(value)}" x2="${x0 + plotW}" y2="${yAngle(value)}" stroke="#364250"/><text x="${x0 - 16}" y="${yAngle(value) + 6}" text-anchor="end" fill="#aeb8c4" font-family="Arial,sans-serif" font-size="15">${value}°</text>`).join('')}
  ${[0, 2.5, 5].map((value) => `<text x="${x0 + plotW + 14}" y="${yResidual(value) + 6}" fill="#68d391" font-family="Arial,sans-serif" font-size="14">${value}°</text>`).join('')}
  ${[0, 100, 200, 300, 400, 500].map((step) => `<line x1="${x(step)}" y1="194" x2="${x(step)}" y2="${y0}" stroke="#26303c"/><text x="${x(step)}" y="${y0 + 25}" text-anchor="middle" fill="#aeb8c4" font-family="Arial,sans-serif" font-size="14">${step}</text>`).join('')}
  <polyline fill="none" stroke="#55b7ff" stroke-width="3" points="${polyline('inputDeg', yAngle)}"/>
  <polyline fill="none" stroke="#ffb454" stroke-width="3" points="${polyline('outputDeg', yAngle)}"/>
  <polyline fill="none" stroke="#68d391" stroke-width="2" stroke-dasharray="7 6" points="${polyline('residualDeg', yResidual)}"/>
  <text x="102" y="158" fill="#55b7ff" font-family="Arial,sans-serif" font-size="17">Input (°)</text>
  <text x="210" y="158" fill="#ffb454" font-family="Arial,sans-serif" font-size="17">Driven output (°)</text>
  <text x="405" y="158" fill="#68d391" font-family="Arial,sans-serif" font-size="17">Coupling residual (°)</text>
  <text x="70" y="624" fill="#f2f5f8" font-family="Arial,sans-serif" font-size="18" font-weight="700">${verdict}</text>
  <text x="70" y="657" fill="#aeb8c4" font-family="Arial,sans-serif" font-size="16">Visible simulation time: ${endTime}s · max observed |output − (−0.25 × input)|: ${residualMax.toFixed(5)}°</text>
  <text x="70" y="690" fill="#8895a3" font-family="Arial,sans-serif" font-size="14">Focused ratio replay · fixture geometry has intentional overlaps; no overall mechanism, deployment, or hardware acceptance claim.</text>
  </svg>`;
}

async function main(): Promise<void> {
  await mkdir(FRAMES, { recursive: true });
  const samples: Sample[] = [];
  let exportedXml = '';
  let releaseStart: number[] | undefined;
  const assembly = await loadAssembly();
  const result = await checkMechanismTruth(assembly, {
    physicsCheck: true,
    physicsSessionFactory: async (xml, bodies, joints) => {
      exportedXml = xml;
      const inputIndex = joints.findIndex((joint) => joint.mateName === 'motor-input');
      const outputIndex = joints.findIndex((joint) => joint.mateName === 'rear-drive-output');
      if (inputIndex < 0 || outputIndex < 0) throw new Error('Expected authored input and output joints.');
      const session = await loadMujocoSession(xml, bodies, joints);
      const setPose = session.setPose.bind(session);
      session.setPose = (qpos) => {
        setPose(qpos);
      };
      const step = session.step.bind(session);
      session.step = (seconds, dt, observer) => {
        if (releaseStart === undefined) releaseStart = [...session.getQpos()];
        return step(seconds, dt, (qpos, index) => {
          const inputDeg = (qpos[inputIndex] ?? 0) * RAD_TO_DEG;
          const outputDeg = (qpos[outputIndex] ?? 0) * RAD_TO_DEG;
          samples.push({
            step: samples.length + 1,
            seconds: (samples.length + 1) * dt,
            inputDeg,
            outputDeg,
            residualDeg: outputDeg - RATIO * inputDeg,
          });
          observer?.(qpos, index);
        });
      };
      return session;
    },
  });

  if (samples.length !== 500) throw new Error(`Expected 500 release observations; got ${samples.length}.`);
  const maxResidualDeg = Math.max(...samples.map((sample) => Math.abs(sample.residualDeg)));
  const couplingXml = /<equality>[\s\S]*joint1="rear-drive-output" joint2="motor-input" polycoef="0 -0\.250000 0 0 0"/.test(exportedXml);
  const couplingPass = couplingXml && maxResidualDeg <= 5;
  const verdict = `Coupling residual gate: ${couplingPass ? 'PASS' : 'FAIL'} · max ${maxResidualDeg.toFixed(5)}° ≤ 5° · native equality ${couplingXml ? 'emitted' : 'missing'}`;
  await writeFile(resolve(ROOT, 'release-samples.csv'), [
    'step,seconds,inputDeg,outputDeg,residualDeg',
    ...samples.map((sample) => [sample.step, sample.seconds.toFixed(3), sample.inputDeg.toFixed(6), sample.outputDeg.toFixed(6), sample.residualDeg.toFixed(6)].join(',')),
  ].join('\n') + '\n');
  await writeFile(resolve(ROOT, 'evidence.json'), `${JSON.stringify({
    scenario: 'authored 12:48 external gear pair; ratio -1/4',
    invocation: 'npx tsx docs/demos/issue-1321-coupled-gear/capture-demo.ts',
    localReplay: true,
    deployedBehaviorVerified: false,
    hardwareAcceptanceVerified: false,
    integrationObservations: samples.length,
    emittedNativeEquality: couplingXml,
    couplingResidualGatePassed: couplingPass,
    maxResidualDegrees: maxResidualDeg,
    residualGateDegrees: 5,
    coveredInputPosesDegrees: [-720, 0, 720],
    sourceLimitsDegrees: [-720, 720],
    drivenLimitsDegrees: [-180, 180],
    capturedReleaseStartQpos: releaseStart,
    failures: result.failures.map((failure) => ({ code: failure.code, message: failure.message })),
    coverage: result.coverage,
    fixtureLimitation: 'Simplified offset boxes excite release; the fixture does not model involute tooth contact.',
  }, null, 2)}\n`);

  for (let frame = 1; frame <= 5; frame++) {
    const svg = Buffer.from(chartSvg(samples, frame, verdict));
    await sharp(svg).png().toFile(resolve(FRAMES, `frame-${String(frame - 1).padStart(2, '0')}.png`));
  }
  const video = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-framerate', '1',
    '-i', resolve(FRAMES, 'frame-%02d.png'), '-t', '5', '-r', '24',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-movflags', '+faststart',
    resolve(ROOT, 'coupled-gear-release.mp4'),
  ], { encoding: 'utf8' });
  if (video.status !== 0) throw new Error(`ffmpeg failed: ${video.stderr || video.error}`);
  await rm(FRAMES, { recursive: true, force: true });
  console.log(JSON.stringify({ samples: samples.length, maxResidualDeg, couplingXml, video: resolve(ROOT, 'coupled-gear-release.mp4') }, null, 2));
}

await main();
