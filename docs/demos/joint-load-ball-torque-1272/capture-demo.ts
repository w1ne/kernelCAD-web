// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Capture the actual local ball-mate load-check result and a short MP4.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import type { Assembly } from '../../../src/modeling/capture/assembly';
import type { MateLoadLimit, MateRecord } from '../../../src/modeling/mates/mate';
import { runScript } from '../../../src/composition/runScript';
import { checkLoadCapacity } from '../../../src/kinematic/checkLoadCapacity';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const MODEL = resolve(ROOT, 'ball-load.kcad.ts');
const FRAMES = resolve(ROOT, '.frames');
const WIDTH = 1280;
const HEIGHT = 720;
const LOADS = {
  housing: {
    force: [0, 0, -500] as [number, number, number],
    torque: [0, 0, 75] as [number, number, number],
  },
};

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[char]!);
}

function wrap(value: string, limit: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of value.split(/\s+/)) {
    const next = line.length === 0 ? word : `${line} ${word}`;
    if (next.length > limit && line.length > 0) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

interface Slide {
  readonly title: string;
  readonly subtitle: string;
  readonly lines: readonly string[];
  readonly result?: boolean;
}

function slideSvg(slide: Slide): string {
  const output = slide.lines.map((line, i) =>
    `<text x="740" y="${248 + i * 43}" fill="${slide.result && i === 1 ? '#ffd166' : '#e5edf4'}" font-family="Arial,sans-serif" font-size="22">${escapeXml(line)}</text>`,
  ).join('\n');
  const footer = slide.result
    ? 'Local validator replay · no physics simulation or FEA · deployment not checked · hardware acceptance not claimed.'
    : 'Legacy manual-load check · torque rating is explicitly unverified.';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="100%" height="100%" fill="#111720"/>
  <text x="58" y="62" fill="#f5f7fa" font-family="Arial,sans-serif" font-size="30" font-weight="700">Ball-mate torque load check</text>
  <text x="60" y="98" fill="#aebbc8" font-family="Arial,sans-serif" font-size="18">${escapeXml(slide.title)} · ${escapeXml(slide.subtitle)}</text>
  <rect x="45" y="142" width="630" height="475" rx="14" fill="#171f29" stroke="#354352"/>
  <text x="75" y="184" fill="#9eacba" font-family="Arial,sans-serif" font-size="16">ASSEMBLY · SCHEMATIC</text>
  <rect x="105" y="295" width="205" height="145" rx="10" fill="#62788f" stroke="#a9bacb" stroke-width="3"/>
  <text x="143" y="374" fill="#f5f7fa" font-family="Arial,sans-serif" font-size="22">housing</text>
  <circle cx="354" cy="367" r="31" fill="#111720" stroke="#80d6ff" stroke-width="6"/>
  <line x1="310" y1="367" x2="323" y2="367" stroke="#80d6ff" stroke-width="5"/>
  <line x1="385" y1="367" x2="420" y2="367" stroke="#80d6ff" stroke-width="5"/>
  <rect x="420" y="323" width="160" height="88" rx="10" fill="#e8903f" stroke="#ffd09b" stroke-width="3"/>
  <text x="476" y="376" fill="#171f29" font-family="Arial,sans-serif" font-size="22">link</text>
  <text x="112" y="486" fill="#80d6ff" font-family="Arial,sans-serif" font-size="17">ball socket · force limit 1000 N</text>
  <text x="112" y="521" fill="#ffd166" font-family="Arial,sans-serif" font-size="17">torque limit 50 N·m · supplied 75 N·m</text>
  <rect x="710" y="142" width="525" height="475" rx="14" fill="#1a232e" stroke="#354352"/>
  <text x="740" y="184" fill="#71c7ff" font-family="Arial,sans-serif" font-size="17" font-weight="700">ACTUAL LOCAL RESULT</text>
  ${output}
  ${slide.result ? '<rect x="735" y="470" width="475" height="74" rx="10" fill="#3a3020" stroke="#ffd166"/><text x="760" y="516" fill="#ffd166" font-family="Arial,sans-serif" font-size="21" font-weight="700">Warning: torque is unverified</text>' : ''}
  <line x1="60" y1="652" x2="1220" y2="652" stroke="#354352"/>
  <text x="60" y="685" fill="#9ba8b5" font-family="Arial,sans-serif" font-size="15">${escapeXml(footer)}</text>
  </svg>`;
}

async function main(): Promise<void> {
  await mkdir(FRAMES, { recursive: true });
  const code = await readFile(MODEL, 'utf8');
  const run = await runScript({ code, fileName: MODEL, scriptDir: ROOT });
  const arm = [...(run.session.assemblies as Map<string, Assembly>).values()][0];
  if (!arm) throw new Error('The ball-load regression assembly was not captured.');

  const socket = (arm.__mates() as MateRecord[]).find((mate) => mate.name === 'socket');
  if (!socket) throw new Error('The ball-load regression mate was not captured.');
  (socket as { maxLoad?: MateLoadLimit }).maxLoad = { force: 1000, torque: 50 };

  const result = await checkLoadCapacity(arm, LOADS, { mode: 'stub' });
  const diagnostic = result.diagnostics.find(
    (entry) => entry.code === 'assembly.joint.load-unverified',
  );
  if (!result.ok || result.failures.length !== 0 || diagnostic?.severity !== 'warn'
    || !diagnostic.message.includes('No torque comparison ran')) {
    throw new Error('Expected the force check to pass with an explicit unverified torque warning.');
  }
  if (result.diagnostics.some((entry) => entry.code === 'assembly.joint.load-exceeded')) {
    throw new Error('The below-limit 500 N force should not exceed its 1000 N rating.');
  }

  const evidence = {
    scenario: 'resolved ball mate with an unsupported declared torque rating',
    invocation: 'npx tsx docs/demos/joint-load-ball-torque-1272/capture-demo.ts',
    fixture: 'ball-load.kcad.ts',
    fixtureSha256: createHash('sha256').update(code).digest('hex'),
    localValidatorReplay: true,
    physicsSimulationRun: false,
    feaRun: false,
    deployedBehaviorVerified: false,
    hardwareAcceptanceVerified: false,
    input: { mode: 'stub', externalLoads: LOADS, maxLoad: { forceN: 1000, torqueNm: 50 } },
    result: {
      ok: result.ok,
      failures: result.failures,
      diagnostics: result.diagnostics,
    },
    limitations: 'The legacy checker compares the ball-joint force rating only. The declared torque rating is unverified; this is not a torque-capacity pass, reaction propagation, FEA, deployed behavior, or hardware acceptance.',
  };
  await writeFile(resolve(ROOT, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);

  const messageLines = wrap(diagnostic.message, 45);
  const slides: Slide[] = [
    {
      title: 'A ball mate declares a torque rating',
      subtitle: 'the supplied torque is above that rating',
      lines: ['Force: 500 N · rating: 1000 N', 'Torque: 75 N·m · rating: 50 N·m', 'Both loads are supplied to the checker.'],
    },
    {
      title: 'Run the existing legacy check',
      subtitle: "checkLoadCapacity(arm, loads, { mode: 'stub' })",
      lines: ['Connector origins are resolved.', 'The supported force comparison runs.', 'Ball-mate torque is not compared here.'],
    },
    {
      title: 'The actual result marks torque unverified',
      subtitle: 'warning from the returned diagnostic',
      lines: [`${diagnostic.code} · ${diagnostic.severity}`, ...messageLines.slice(0, 4)],
      result: true,
    },
    {
      title: 'Read the envelope with its warning',
      subtitle: 'the torque rating did not receive a verdict',
      lines: [`ok = ${result.ok}`, 'failures = 0 · force is below its rating', 'torque = unverified · no comparison ran', 'Do not treat this as a torque-capacity pass.'],
      result: true,
    },
  ];

  // Warm up the SVG text renderer so the first retained frame is complete.
  await sharp(Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><text x="0" y="1">.</text></svg>',
  )).png().toBuffer();

  for (const [index, slide] of slides.entries()) {
    const png = await sharp(Buffer.from(slideSvg(slide))).png().toBuffer();
    await writeFile(resolve(FRAMES, `frame-${String(index * 2).padStart(2, '0')}.png`), png);
    await writeFile(resolve(FRAMES, `frame-${String(index * 2 + 1).padStart(2, '0')}.png`), png);
  }

  const video = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-framerate', '1',
    '-i', resolve(FRAMES, 'frame-%02d.png'), '-vf', 'fps=24', '-frames:v', '192', '-r', '24',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-movflags', '+faststart',
    resolve(ROOT, 'demo.mp4'),
  ], { encoding: 'utf8' });
  if (video.status !== 0) throw new Error(`ffmpeg failed: ${video.stderr || video.error}`);
  await rm(FRAMES, { recursive: true, force: true });
  console.log(JSON.stringify({ video: resolve(ROOT, 'demo.mp4'), result: evidence.result }, null, 2));
}

await main();
