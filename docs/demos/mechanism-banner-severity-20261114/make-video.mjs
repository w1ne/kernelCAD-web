// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Build a text replay of the recorded `kernelcad validate` output in before.txt and after.txt.
// Run: node docs/demos/mechanism-banner-severity-20261114/make-video.mjs
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const HERE = dirname(new URL(import.meta.url).pathname);
// Slides are regenerable; keep them out of the repository.
const FRAMES = process.env.FRAMES_DIR || mkdtempSync(join(tmpdir(), 'mechanism-banner-severity-frames-'));
const WIDTH = 1920;
const HEIGHT = 1080;
const INK = '#18212b';
const MUTED = '#52606d';
const WARN = '#a35a00';
const PASS = '#167447';
const MODEL = 'examples/robot-arm/skill-built-supported-arm.kcad.ts';

mkdirSync(FRAMES, { recursive: true });

/** Reduce a recorded CLI transcript to the facts the slides show. */
const parse = file => {
  const raw = readFileSync(join(HERE, file), 'utf8');
  const entries = [...raw.matchAll(/^\s*\[(ERROR|WARN|NOTE)\] (\S+)$/gm)].map(m => ({ label: m[1], code: m[2] }));
  return {
    failureCount: Number(raw.match(/will not work as built \((\d+) failures?\)/)?.[1]),
    summaryMore: Number(raw.match(/^Mechanism broken: .*\(\+(\d+) more\)$/m)?.[1]),
    exitCode: Number(raw.match(/^exit=(\d+)$/m)?.[1]),
    entries,
  };
};
const before = parse('before.txt');
const after = parse('after.txt');

const escapeXml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');
const text = (value, x, y, size, color = INK, weight = 400, family = 'DejaVu Sans') =>
  `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${color}">${escapeXml(value)}</text>`;
const mono = (value, x, y, size, color = INK, weight = 400) => text(value, x, y, size, color, weight, 'DejaVu Sans Mono');
const background = (title, subtitle, slideNo) => `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>
  ${text(title, 100, 100, 52, INK, 700)}
  ${text(subtitle, 102, 150, 26, MUTED)}
  <line x1="100" y1="${HEIGHT - 92}" x2="${WIDTH - 100}" y2="${HEIGHT - 92}" stroke="#d6dce1" stroke-width="2"/>
  ${text('Text replay of recorded local CLI output · not a renderer capture · the example stays "broken" in both runs', 100, HEIGHT - 48, 19, MUTED)}
  ${text(String(slideNo).padStart(2, '0'), WIDTH - 132, HEIGHT - 48, 19, MUTED)}
`;
const panel = '<rect x="100" y="200" width="1720" height="700" rx="18" fill="#f5f7f9" stroke="#d6dce1" stroke-width="2"/>';
const resultSlide = (title, subtitle, slideNo, result, verdict, verdictColor) => `${background(title, subtitle, slideNo)}
    ${panel}
    ${mono(`$ kernelcad validate ${MODEL} --include-interference`, 160, 262, 22, MUTED)}
    ${mono(`MECHANISM BROKEN — this assembly will not work as built (${result.failureCount} failures)`, 160, 316, 26, INK, 700)}
    ${result.entries.map((e, i) => mono(`  [${e.label}] ${e.code}`, 160, 362 + i * 40, 25,
      e.code === 'mechanism.drops-on-release' ? verdictColor : INK,
      e.code === 'mechanism.drops-on-release' ? 700 : 400)).join('\n    ')}
    ${mono(`Mechanism broken: Joint 'shoulder-pitch' ... (+${result.summaryMore} more)   exit ${result.exitCode}`, 160, 760, 24, MUTED)}
    ${text(verdict, 160, 850, 28, verdictColor, 700)}
  </svg>`;

const slideSvgs = [
  `${background('Mechanism banner · severity of each entry', 'A note that says "informational, not a defect" must not be printed and counted as an error.', 1)}
    ${panel}
    ${text('MODEL', 160, 300, 25, MUTED, 700)}
    ${mono(MODEL, 160, 360, 26, INK, 700)}
    ${text('Two free passive joints swing under gravity in the 0.5 s release check.', 160, 460, 30, INK)}
    ${text('The gate reports each one as mechanism.drops-on-release with severity "info".', 160, 520, 30, INK)}
    ${text('Only error-severity entries make the verdict "broken".', 160, 580, 30, INK)}
    ${text('Expected: the banner counts the errors and labels the info entries as notes.', 160, 690, 30, INK, 700)}
  </svg>`,
  resultSlide('Before · origin/develop cd3eac756', 'Each entry is printed as [ERROR]. The headline counts the two info notes as failures.', 2, before,
    `Wrong: ${before.failureCount} failures in the headline; the summary line counts ${before.summaryMore + 1}.`, WARN),
  resultSlide('After · errors counted, notes labelled', 'Errors first, then non-fatal entries under [NOTE] or [WARN].', 3, after,
    `Correct: ${after.failureCount} failures in the headline and in the summary line; 2 notes.`, PASS),
  `${background('Verification · local regression', 'tests/unit/cli/renderHuman.test.ts · tests/unit/mcp/renderPreviewTool.test.ts', 4)}
    ${panel}
    ${text('PASS', 160, 340, 46, PASS, 700)}
    ${text('30 / 30 tests · the 2 new cases fail without the fix', 160, 420, 40, INK, 700)}
    ${text('typecheck: OK · eslint on the changed files: OK', 160, 495, 30, INK)}
    ${text('Scope: banner text, render watermark codes and render_preview mechanism_failure_codes.', 160, 610, 26, MUTED)}
    ${text('The verdict, the exit code and the diagnostics list do not change.', 160, 665, 26, MUTED)}
    ${text('No deployment or hardware acceptance claim.', 160, 720, 26, MUTED)}
  </svg>`,
];

const framePaths = [];
for (let index = 0; index < slideSvgs.length; index++) {
  const pngPath = join(FRAMES, `slide-${String(index).padStart(2, '0')}.png`);
  await sharp(Buffer.from(slideSvgs[index])).png().toFile(pngPath);
  framePaths.push(pngPath);
}
await sharp(framePaths[2]).png().toFile(join(HERE, 'poster.png'));

const videoPath = join(HERE, 'demo.mp4');
execFileSync(process.env.FFMPEG || 'ffmpeg', [
  '-y', '-loglevel', 'error', '-framerate', '1/3', '-start_number', '0', '-i', join(FRAMES, 'slide-%02d.png'),
  '-vf', 'fps=24,format=yuv420p', '-c:v', 'libx264', '-crf', '25',
  '-movflags', '+faststart', videoPath,
], { stdio: 'inherit' });

const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const probe = JSON.parse(execFileSync(process.env.FFPROBE || 'ffprobe', [
  '-v', 'error', '-show_entries', 'format=duration,size', '-of', 'json', videoPath,
], { encoding: 'utf8' }));
const evidence = {
  type: 'text replay of recorded local CLI output; not a renderer capture',
  model: MODEL,
  invocation: `npx tsx src/agent/cli/index.ts validate ${MODEL} --include-interference --epsilon 0.01`,
  before: { source: 'origin/develop cd3eac756 (banner change reverted)', file: 'before.txt', sha256: sha256(join(HERE, 'before.txt')), ...before },
  after: { source: 'this branch', file: 'after.txt', sha256: sha256(join(HERE, 'after.txt')), ...after },
  verification: {
    regressionTest: 'npx vitest run tests/unit/cli/renderHuman.test.ts tests/unit/mcp/renderPreviewTool.test.ts — 30/30 passed; the 2 new cases fail with the fix reverted',
    mechanism: 'broken in both runs (exit 2); this change does not touch the verdict or the failures themselves',
  },
  slides: { count: framePaths.length, secondsEach: 3, tracked: false },
  video: {
    file: 'demo.mp4',
    sha256: sha256(videoPath),
    durationSeconds: Number(probe.format.duration),
    bytes: Number(probe.format.size),
    encoder: 'libx264, CRF 25, 24 fps, yuv420p',
  },
};
writeFileSync(join(HERE, 'video-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`frames: ${FRAMES}`);
