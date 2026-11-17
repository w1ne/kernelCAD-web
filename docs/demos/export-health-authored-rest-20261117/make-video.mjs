// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Text replay of the local check_export_health run recorded in run.json.
// Run: node docs/demos/export-health-authored-rest-20261117/make-video.mjs
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const HERE = dirname(new URL(import.meta.url).pathname);
const FRAMES = process.env.FRAMES_DIR || mkdtempSync(join(tmpdir(), 'export-health-rest-frames-'));
const WIDTH = 1920;
const HEIGHT = 1080;
const INK = '#18212b';
const MUTED = '#52606d';
const PASS = '#167447';
const FAIL = '#9b2c2c';
const run = JSON.parse(readFileSync(join(HERE, 'run.json'), 'utf8'));

mkdirSync(FRAMES, { recursive: true });

const deg = (rad) => (rad * 180 / Math.PI).toFixed(3);
const mm = (metres) => (metres * 1000).toFixed(3);
const escapeXml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');
const text = (value, x, y, size, color = INK, weight = 400, family = 'DejaVu Sans') =>
  `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${color}">${escapeXml(value)}</text>`;
const mono = (value, x, y, size, color = INK, weight = 400) => text(value, x, y, size, color, weight, 'DejaVu Sans Mono');
const background = (title, subtitle, slideNo) => `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>
  ${text(title, 100, 100, 48, INK, 700)}
  ${text(subtitle, 102, 152, 24, MUTED)}
  <line x1="100" y1="${HEIGHT - 92}" x2="${WIDTH - 100}" y2="${HEIGHT - 92}" stroke="#d6dce1" stroke-width="2"/>
  ${text('Text replay of a local check_export_health run. Not a renderer capture. Not deployed. Not hardware acceptance.', 100, HEIGHT - 48, 20, MUTED)}
  ${text(String(slideNo).padStart(2, '0'), WIDTH - 132, HEIGHT - 48, 20, MUTED)}
`;
const panel = '<rect x="100" y="210" width="1720" height="680" rx="18" fill="#f5f7f9" stroke="#d6dce1" stroke-width="2"/>';

const swingQ = run.swing.restQpos[0].qpos;
const hit = run.swing.coordinateZero.hits[0];
const limit = run.limitRest.qposOutsideLimits[0];
const block = run.declaredMass.block;
const overlap = run.ballOverlap.row;
const hull = run.hullCorner.row;

const slides = [
  `${background('Export health · authored rest', 'A hinge whose solids overlap at coordinate 0 and clear at the authored pose.', 1)}
    ${panel}
    ${text('MODEL', 160, 290, 22, MUTED, 700)}
    ${mono('swing-clear.kcad.ts', 160, 350, 32, INK, 700)}
    ${mono("mate('swing', ..., 'revolute', { pose: 90, limitsDeg: [-20, 120] })", 160, 420, 28, INK)}
    ${text('The stop is a free root at x = 40 mm. It is not fastened to the base,', 160, 520, 28, INK)}
    ${text('so the swing exclusion does not hide the pair.', 160, 565, 28, INK)}
    ${text('qpos0 is the authored pose. Joint coordinate 0 stays the connector frame.', 160, 650, 28, INK)}
    ${text('Minimum analytic overlap at coordinate 0 is 10 mm along Y and Z.', 160, 730, 28, MUTED)}
  </svg>`,
  `${background('check_export_health at qpos0', 'Compiled forward at the authored pose. Local tool output.', 2)}
    ${panel}
    ${mono(`ok ${run.swing.ok}    ${run.swing.summary}`, 160, 310, 32, PASS, 700)}
    ${mono(`swing qpos0   ${swingQ.toFixed(6)} rad   ${deg(swingQ)}°`, 160, 390, 30, INK, 700)}
    ${mono(`penetrating contacts   ${run.swing.penetrating.length}`, 160, 460, 30, INK)}
    ${mono(`qpos0 outside limits   ${run.swing.qposOutsideLimits.length}`, 160, 520, 30, INK)}
    ${mono(`inertia mismatches   ${run.swing.inertiaMismatch.length} of ${run.swing.inertiaCount}`, 160, 580, 30, INK)}
    ${text('The compiled model shows the 90° pose. The stop is clear.', 160, 700, 30, PASS, 700)}
  </svg>`,
  `${background('Same export at coordinate 0', 'A second forward. This is not qpos0 and not the tool result.', 3)}
    ${panel}
    ${mono('session.setPose(0); session.forward()', 160, 310, 30, MUTED)}
    ${mono(`link : stop   penetration ${mm(hit.penetrationM)} mm`, 160, 400, 36, FAIL, 700)}
    ${mono(`${run.swing.coordinateZero.hits.length} contacts, each ${hit.distM.toExponential(6)} m`, 160, 470, 28, INK)}
    ${text('Analytic overlap is 10 mm. The compiled depth matches it within 0.5 mm.', 160, 580, 28, INK)}
    ${text('Authored rest and coordinate 0 are different poses.', 160, 650, 32, INK, 700)}
    ${text('Physics verify still starts an unnamed mate at coordinate 0.', 160, 730, 26, MUTED)}
  </svg>`,
  `${background('Declared mass and an out-of-limit qpos0', 'Two more local tool runs from this directory.', 4)}
    ${panel}
    ${mono('declared-mass.kcad.ts    massKg 0.055', 160, 290, 28, INK, 700)}
    ${mono(`cad ${block.cadMassKg.toFixed(6)} kg   ${block.massSource}`, 160, 350, 26, INK)}
    ${mono(`mjcf ${block.mjcfMassKg.toFixed(6)} kg   mismatch ${block.mjcfMismatch}`, 160, 400, 26, PASS, 700)}
    ${mono(`urdf ${block.urdfMassKg.toFixed(6)} kg   mismatch ${block.urdfMismatch}`, 160, 450, 26, PASS, 700)}
    ${mono(`ok ${run.declaredMass.ok}`, 160, 510, 28, PASS, 700)}
    ${mono('limit-rest.kcad.ts    pose 0, limits [12°, 40°]', 160, 600, 28, INK, 700)}
    ${mono(`qpos ${limit.qpos}   range ${deg(limit.lower)}° .. ${deg(limit.upper)}°`, 160, 660, 26, FAIL, 700)}
    ${mono(`ok ${run.limitRest.ok}    penetrating ${run.limitRest.penetrating.length}`, 160, 720, 28, FAIL, 700)}
    ${text('The failure is the joint range. The boxes do not overlap.', 160, 800, 26, MUTED)}
  </svg>`,
  `${background('Authored ball Euler', 'qpos0 stays the identity quaternion. The body frame carries the pose.', 5)}
    ${panel}
    ${mono("mate('wrist', ..., 'ball', { pose: [0, 90, 0] })", 160, 290, 28, INK, 700)}
    ${mono(run.ballClear.linkBody, 160, 360, 24, INK)}
    ${mono(run.ballClear.wristJoint, 160, 420, 24, INK)}
    ${mono(`joint ref emitted   ${run.ballClear.jointHasRef}`, 160, 490, 28, INK)}
    ${mono(`ok ${run.ballClear.ok}    penetrating ${run.ballClear.penetrating.length}`, 160, 560, 30, PASS, 700)}
    ${text('The same solids at Euler [0, 0, 0] overlap by 10×10×10 mm³.', 160, 660, 28, INK)}
    ${mono(`penetration ${mm(overlap.penetrationM)} mm    exact volume ${Number(overlap.cadExactOverlapMm3).toFixed(3)} mm³    artefact ${overlap.collisionGeomArtefact}`, 160, 720, 24, FAIL, 700)}
    ${mono(`ok ${run.ballOverlap.ok}`, 160, 780, 28, FAIL, 700)}
  </svg>`,
  `${background('Convex-hull contact, exact solids clear', 'The row stays visible and does not fail the check.', 6)}
    ${panel}
    ${mono('hull-corner.kcad.ts    cube in the inner corner of an L', 160, 290, 28, INK, 700)}
    ${mono(`compiled penetration   ${mm(hull.penetrationM)} mm`, 160, 370, 30, FAIL, 700)}
    ${mono(`exact CAD overlap   ${hull.cadExactOverlapMm3} mm³`, 160, 440, 30, PASS, 700)}
    ${mono(`exact CAD distance   ${Number(hull.cadDistanceMm).toFixed(3)} mm`, 160, 510, 30, PASS, 700)}
    ${mono(`collisionGeomArtefact   ${hull.collisionGeomArtefact}`, 160, 580, 30, INK, 700)}
    ${mono(`ok ${run.hullCorner.ok}`, 160, 660, 32, PASS, 700)}
    ${text(run.hullCorner.summary, 160, 740, 24, MUTED)}
  </svg>`,
];

const framePaths = [];
for (let index = 0; index < slides.length; index++) {
  const pngPath = join(FRAMES, `slide-${String(index).padStart(2, '0')}.png`);
  await sharp(Buffer.from(slides[index])).png().toFile(pngPath);
  framePaths.push(pngPath);
}
await sharp(framePaths[1]).png().toFile(join(HERE, 'poster.png'));

const videoPath = join(HERE, 'demo.mp4');
execFileSync(process.env.FFMPEG || 'ffmpeg', [
  '-y', '-loglevel', 'error', '-framerate', '1/3', '-start_number', '0', '-i', join(FRAMES, 'slide-%02d.png'),
  '-vf', 'fps=24,format=yuv420p', '-c:v', 'libx264', '-crf', '25',
  '-movflags', '+faststart', videoPath,
], { stdio: 'inherit' });

const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const probe = JSON.parse(execFileSync(process.env.FFPROBE || 'ffprobe', [
  '-v', 'error', '-show_entries', 'format=duration,size:stream=width,height,codec_name', '-of', 'json', videoPath,
], { encoding: 'utf8' }));
const evidence = {
  type: 'text replay of a local check_export_health run; not a renderer capture',
  recordedAt: run.recordedAt,
  models: ['swing-clear.kcad.ts', 'declared-mass.kcad.ts', 'limit-rest.kcad.ts', 'ball-clear.kcad.ts', 'ball-overlap.kcad.ts', 'hull-corner.kcad.ts'],
  invocation: run.command,
  run: { file: 'run.json', sha256: sha256(join(HERE, 'run.json')) },
  slides: { count: framePaths.length, secondsEach: 3, tracked: false },
  video: {
    file: 'demo.mp4',
    sha256: sha256(videoPath),
    durationSeconds: Number(probe.format.duration),
    bytes: Number(probe.format.size),
    width: probe.streams?.[0]?.width,
    height: probe.streams?.[0]?.height,
    codec: probe.streams?.[0]?.codec_name,
    encoder: 'libx264, CRF 25, 24 fps, yuv420p',
  },
  claims: {
    authoredRestClear: run.swing.ok === true && run.swing.penetrating.length === 0,
    coordinateZeroPenetrationM: hit.penetrationM,
    declaredMassMatches: block.mjcfMismatch === false && block.urdfMismatch === false,
    outOfLimitFails: run.limitRest.ok === false && run.limitRest.penetrating.length === 0,
    ballClear: run.ballClear.ok === true && run.ballClear.quat != null && run.ballClear.jointHasRef === false,
    ballOverlapIsReal: overlap.collisionGeomArtefact === false && overlap.cadExactOverlapMm3 > 0,
    hullArtefactDoesNotFail: run.hullCorner.ok === true && hull.collisionGeomArtefact === true && hull.cadExactOverlapMm3 === 0,
    deployed: false,
    hardwareAcceptance: false,
  },
};
writeFileSync(join(HERE, 'video-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`frames: ${FRAMES}`);
console.log(JSON.stringify(evidence.video));
