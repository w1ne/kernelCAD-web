// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Capture the local Gate 3 workflow and evidence for the solved-frame regression.
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import type { Assembly } from '../../../src/modeling/capture/assembly';
import { runScript } from '../../../src/composition/runScript';
import { checkLoadCapacity } from '../../../src/kinematic/checkLoadCapacity';
import { solveMates } from '../../../src/modeling/mates/solver';
import type { Transform } from '../../../src/shared/runtime/se3';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const MODEL = resolve(ROOT, 'gate3-solved-frame.kcad.ts');
const FRAMES = resolve(ROOT, '.frames');
const WIDTH = 1280;
const HEIGHT = 720;
const LOAD = { rotor: { force: [1000, 0, 0] as [number, number, number] } };
const LIMIT_NM = 5;
const LOCAL_CONNECTOR = [10, 0, 0] as const;
const AUTHORED_AT = [100, 0, 0] as const;

interface Point2 {
  readonly x: number;
  readonly y: number;
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  })[char]!);
}

function fmt(value: number): string {
  return Math.abs(value) < 1e-8 ? '0.00' : value.toFixed(2);
}

function sub(a: readonly number[], b: readonly number[]): [number, number, number] {
  return [(a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0), (a[2] ?? 0) - (b[2] ?? 0)];
}

function add(a: readonly number[], b: readonly number[]): [number, number, number] {
  return [(a[0] ?? 0) + (b[0] ?? 0), (a[1] ?? 0) + (b[1] ?? 0), (a[2] ?? 0) + (b[2] ?? 0)];
}

function cross(a: readonly number[], b: readonly number[]): [number, number, number] {
  return [
    (a[1] ?? 0) * (b[2] ?? 0) - (a[2] ?? 0) * (b[1] ?? 0),
    (a[2] ?? 0) * (b[0] ?? 0) - (a[0] ?? 0) * (b[2] ?? 0),
    (a[0] ?? 0) * (b[1] ?? 0) - (a[1] ?? 0) * (b[0] ?? 0),
  ];
}

function norm(v: readonly number[]): number {
  return Math.hypot(v[0] ?? 0, v[1] ?? 0, v[2] ?? 0);
}

function svgPath(points: readonly Point2[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ') + ' Z';
}

function slideSvg(
  index: number,
  title: string,
  subtitle: string,
  panelLines: readonly string[],
  solvedJoint: readonly number[],
  solvedOrigin: readonly number[],
  basePose: Transform,
  rotorPose: Transform,
  legacyMomentNm: number,
  solvedMomentNm: number,
): string {
  const project = (xyz: readonly number[]): Point2 => ({
    x: 460 + ((xyz[0] ?? 0) - (solvedJoint[0] ?? 0)) * 7.5,
    y: 350 - ((xyz[1] ?? 0) - (solvedJoint[1] ?? 0)) * 7.5,
  });
  const baseCorners = [
    [-12, -8, 0], [12, -8, 0], [12, 8, 0], [-12, 8, 0],
  ].map((point) => project(basePose.point(point)));
  const rotorCorners = [
    [-10, -4, 0], [10, -4, 0], [10, 4, 0], [-10, 4, 0],
  ].map((point) => project(rotorPose.point(point)));
  const jointPt = project(solvedJoint);
  const originPt = project(solvedOrigin);
  const forcePt = { x: originPt.x + 150, y: originPt.y };
  const panel = panelLines.map((line, i) =>
    `<text x="790" y="${250 + i * 43}" fill="${i === panelLines.length - 1 && index === 3 ? '#ff7d7d' : '#dce5ee'}" font-family="Arial,sans-serif" font-size="23">${escapeXml(line)}</text>`,
  ).join('\n');
  const lever = index >= 2
    ? `<line x1="${jointPt.x}" y1="${jointPt.y}" x2="${originPt.x}" y2="${originPt.y}" stroke="#6fe0a2" stroke-width="5" marker-end="url(#greenArrow)"/>`
    : '';
  const forceArrow = index >= 2
    ? `<line x1="${originPt.x}" y1="${originPt.y}" x2="${forcePt.x}" y2="${forcePt.y}" stroke="#ff756c" stroke-width="5" marker-end="url(#redArrow)"/>`
    : '';
  const diagramLegend = index >= 2
    ? `<text x="70" y="215" fill="#ff928b" font-family="Arial,sans-serif" font-size="16">F = +1000 N X</text><text x="350" y="215" fill="#79e3a9" font-family="Arial,sans-serif" font-size="16">r = 10 mm</text>`
    : '';
  const footer = index === 3
    ? 'Local validator replay · no physics simulation · deployment not checked · hardware acceptance not claimed.'
    : 'Frame diagram uses solved connector and part origins · it is not a stress or reaction simulation.';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <marker id="redArrow" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 z" fill="#ff756c"/></marker>
    <marker id="greenArrow" markerWidth="11" markerHeight="11" refX="8" refY="5.5" orient="auto"><path d="M0,0 L11,5.5 L0,11 z" fill="#6fe0a2"/></marker>
  </defs>
  <rect width="100%" height="100%" fill="#111720"/>
  <text x="58" y="61" fill="#f5f7fa" font-family="Arial,sans-serif" font-size="30" font-weight="700">Gate 3 · solved-frame torque check</text>
  <text x="60" y="96" fill="#aebbc8" font-family="Arial,sans-serif" font-size="18">${escapeXml(title)} · ${escapeXml(subtitle)}</text>
  <rect x="45" y="140" width="700" height="480" rx="14" fill="#171f29" stroke="#354352"/>
  <text x="70" y="175" fill="#9eacba" font-family="Arial,sans-serif" font-size="16">SOLVED ASSEMBLY FRAME · XY PLAN · mm</text>
  ${diagramLegend}
  <path d="${svgPath(baseCorners)}" fill="#62788f" stroke="#a9bacb" stroke-width="3" opacity="0.88"/>
  <path d="${svgPath(rotorCorners)}" fill="#e8903f" stroke="#ffd09b" stroke-width="3"/>
  ${lever}
  ${forceArrow}
  <circle cx="${jointPt.x}" cy="${jointPt.y}" r="10" fill="#dce5ee" stroke="#111720" stroke-width="3"/>
  <text x="${jointPt.x + 15}" y="${jointPt.y - 15}" fill="#f3f7fa" font-family="Arial,sans-serif" font-size="16">hinge connector</text>
  <rect x="70" y="582" width="14" height="14" fill="#62788f" stroke="#a9bacb"/><text x="92" y="594" fill="#dce5ee" font-family="Arial,sans-serif" font-size="14">fixed base</text>
  <rect x="210" y="582" width="14" height="14" fill="#e8903f" stroke="#ffd09b"/><text x="232" y="594" fill="#dce5ee" font-family="Arial,sans-serif" font-size="14">rotor body</text>
  <rect x="780" y="140" width="455" height="480" rx="14" fill="#1a232e" stroke="#354352"/>
  <text x="810" y="190" fill="#71c7ff" font-family="Arial,sans-serif" font-size="17" font-weight="700">CHECK FLOW</text>
  ${panel}
  ${index === 3 ? `<text x="810" y="514" fill="#93a1ae" font-family="Arial,sans-serif" font-size="15">Old authored-frame estimate: ${fmt(legacyMomentNm)} N·m</text><text x="810" y="542" fill="#ffd09b" font-family="Arial,sans-serif" font-size="17">Solved-frame result: ${fmt(solvedMomentNm)} N·m &gt; ${LIMIT_NM} N·m</text>` : ''}
  <line x1="60" y1="652" x2="1220" y2="652" stroke="#354352"/>
  <text x="60" y="685" fill="#9ba8b5" font-family="Arial,sans-serif" font-size="15">${escapeXml(footer)}</text>
  </svg>`;
}

async function main(): Promise<void> {
  await mkdir(FRAMES, { recursive: true });
  const code = await readFile(MODEL, 'utf8');
  const run = await runScript({ code, fileName: MODEL, scriptDir: ROOT });
  const arm = [...(run.session.assemblies as Map<string, Assembly>).values()][0];
  if (!arm) throw new Error('The regression assembly was not captured.');

  const result = await checkLoadCapacity(arm, LOAD, { mode: 'stub' });
  const diagnostic = result.diagnostics.find((entry) => entry.code === 'assembly.joint.load-exceeded');
  if (result.ok || !diagnostic) throw new Error('Expected the local Gate 3 check to reject the exceeded mate torque.');

  const solved = await solveMates(arm);
  const basePose = solved.poses.get('base');
  const rotorPose = solved.poses.get('rotor');
  if (!basePose || !rotorPose) throw new Error('The solver did not return both part placements.');
  const solvedJointOrigin = rotorPose.point(LOCAL_CONNECTOR);
  const solvedPartOrigin = rotorPose.point([0, 0, 0]);
  const lever = sub(solvedPartOrigin, solvedJointOrigin);
  const solvedMomentNm = norm(cross(lever, LOAD.rotor.force)) / 1000;
  const oldJointOrigin = add(AUTHORED_AT, LOCAL_CONNECTOR);
  const oldLever = sub(AUTHORED_AT, oldJointOrigin);
  const legacyMomentNm = norm(cross(oldLever, LOAD.rotor.force)) / 1000;
  const observedMatch = diagnostic.message.match(/torque=([0-9.]+)N·m/);
  const observedMomentNm = observedMatch?.[1] === undefined ? Number.NaN : Number(observedMatch[1]);
  if (!Number.isFinite(solvedMomentNm) || !Number.isFinite(observedMomentNm)
    || Math.abs(solvedMomentNm - 10) > 1e-8 || Math.abs(observedMomentNm - solvedMomentNm) > 0.01) {
    throw new Error(`Expected a 10 N·m solved-frame moment; calculated ${solvedMomentNm}, diagnostic ${observedMomentNm}.`);
  }

  const evidence = {
    scenario: 'rotated mated child with a world-space manual force and legacy mate torque limit',
    invocation: 'npx tsx docs/demos/issue-917-gate3-solved-frame/capture-demo.ts',
    fixture: 'gate3-solved-frame.kcad.ts',
    localValidatorReplay: true,
    physicsSimulationRun: false,
    deployedBehaviorVerified: false,
    hardwareAcceptanceVerified: false,
    externalLoad: LOAD,
    declaredLegacyLimitNm: LIMIT_NM,
    authoredAtMm: AUTHORED_AT,
    localConnectorOriginMm: LOCAL_CONNECTOR,
    solvedPartOriginMm: solvedPartOrigin,
    solvedJointOriginMm: solvedJointOrigin,
    solvedLeverArmMm: lever,
    legacyAuthoredFrameEstimatedTorqueNm: legacyMomentNm,
    solvedFrameCalculatedTorqueNm: solvedMomentNm,
    validatorObservedTorqueNm: observedMomentNm,
    diagnostic: { code: diagnostic.code, message: diagnostic.message, hint: diagnostic.hint },
    result: { ok: result.ok, failures: result.failures },
    limitations: 'The deprecated manual-load gate is a lever-arm sanity check. It is not reaction propagation, FEA, deployed behavior, or hardware acceptance.',
  };
  await writeFile(resolve(ROOT, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);

  const slides = [
    {
      title: 'Local load-check reproduction',
      subtitle: 'one fixed base · one revolute rotor · pose 90°',
      lines: ['Mate: hinge at 90°', 'Rotor authored at x = 100 mm', 'World load: +1000 N along X', 'Declared mate limit: 5 N·m'],
    },
    {
      title: 'Authored frame misses the moment',
      subtitle: 'legacy calculation uses at + unrotated connector origin',
      lines: ['Old joint origin: [110, 0, 0] mm', 'Old part origin: [100, 0, 0] mm', `Old torque: ${fmt(legacyMomentNm)} N·m estimate`, 'Parallel lever and load → false pass'],
    },
    {
      title: 'Solved mate frame restores the lever arm',
      subtitle: 'connector and part origin both follow the solved transform',
      lines: [`Solved hinge: [${fmt(solvedJointOrigin[0] ?? 0)}, ${fmt(solvedJointOrigin[1] ?? 0)}, ${fmt(solvedJointOrigin[2] ?? 0)}] mm`, `Solved rotor origin: [${fmt(solvedPartOrigin[0] ?? 0)}, ${fmt(solvedPartOrigin[1] ?? 0)}, ${fmt(solvedPartOrigin[2] ?? 0)}] mm`, `Solved lever arm: ${fmt(norm(lever))} mm`, `Applied moment: ${fmt(solvedMomentNm)} N·m`],
    },
    {
      title: 'Gate 3 now reports the exceeded limit',
      subtitle: 'checkLoadCapacity(arm, loads, { mode: "stub" })',
      lines: ['Result: ok = false', 'Diagnostic: assembly.joint.load-exceeded', `${fmt(observedMomentNm)} N·m > ${LIMIT_NM} N·m limit`, 'Manual-load sanity check only'],
    },
  ];

  for (const [index, slide] of slides.entries()) {
    const svg = slideSvg(
      index,
      slide.title,
      slide.subtitle,
      slide.lines,
      solvedJointOrigin,
      solvedPartOrigin,
      basePose,
      rotorPose,
      legacyMomentNm,
      solvedMomentNm,
    );
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    await writeFile(resolve(FRAMES, `frame-${String(index * 2).padStart(2, '0')}.png`), png);
    await writeFile(resolve(FRAMES, `frame-${String(index * 2 + 1).padStart(2, '0')}.png`), png);
  }

  const video = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-framerate', '1',
    '-i', resolve(FRAMES, 'frame-%02d.png'), '-vf', 'fps=24', '-frames:v', '192', '-r', '24',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-movflags', '+faststart',
    resolve(ROOT, 'gate3-solved-frame.mp4'),
  ], { encoding: 'utf8' });
  if (video.status !== 0) throw new Error(`ffmpeg failed: ${video.stderr || video.error}`);
  await rm(FRAMES, { recursive: true, force: true });
  console.log(JSON.stringify({ video: resolve(ROOT, 'gate3-solved-frame.mp4'), observedMomentNm, legacyMomentNm, solvedMomentNm, diagnostic: diagnostic.message }, null, 2));
}

await main();
