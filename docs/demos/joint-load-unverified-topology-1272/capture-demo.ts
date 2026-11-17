// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Capture the actual local legacy load-check result and a short MP4 handoff.
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import type { Assembly } from '../../../src/modeling/capture/assembly';
import { runScript } from '../../../src/composition/runScript';
import { checkLoadCapacity } from '../../../src/kinematic/checkLoadCapacity';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const MODEL = resolve(ROOT, 'topology-load.kcad.ts');
const FRAMES = resolve(ROOT, '.frames');
const WIDTH = 1280;
const HEIGHT = 720;
const LOAD = { housing: { force: [0, 0, -1000] as [number, number, number] } };

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
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
    `<text x="740" y="${250 + i * 45}" fill="${slide.result && i === 1 ? '#ffd166' : '#e5edf4'}" font-family="Arial,sans-serif" font-size="22">${escapeXml(line)}</text>`,
  ).join('\n');
  const footer = slide.result
    ? 'Local validator replay · no physics simulation · deployment not checked · hardware acceptance not claimed.'
    : 'Legacy manual-load check · not reaction propagation, FEA, or hardware acceptance.';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="100%" height="100%" fill="#111720"/>
  <text x="58" y="62" fill="#f5f7fa" font-family="Arial,sans-serif" font-size="30" font-weight="700">Legacy joint load check · topology origin</text>
  <text x="60" y="98" fill="#aebbc8" font-family="Arial,sans-serif" font-size="18">${escapeXml(slide.title)} · ${escapeXml(slide.subtitle)}</text>
  <rect x="45" y="142" width="630" height="475" rx="14" fill="#171f29" stroke="#354352"/>
  <text x="75" y="184" fill="#9eacba" font-family="Arial,sans-serif" font-size="16">ASSEMBLY INTERFACE · SCHEMATIC</text>
  <rect x="105" y="300" width="205" height="150" rx="10" fill="#62788f" stroke="#a9bacb" stroke-width="3"/>
  <circle cx="208" cy="375" r="29" fill="#111720" stroke="#80d6ff" stroke-width="5"/>
  <text x="125" y="486" fill="#e5edf4" font-family="Arial,sans-serif" font-size="19">housing · face-center query</text>
  <rect x="420" y="330" width="150" height="90" rx="10" fill="#e8903f" stroke="#ffd09b" stroke-width="3"/>
  <line x1="310" y1="375" x2="420" y2="375" stroke="#71c7ff" stroke-width="5"/>
  <circle cx="310" cy="375" r="8" fill="#71c7ff"/>
  <text x="420" y="455" fill="#e5edf4" font-family="Arial,sans-serif" font-size="19">link · vec3 origin</text>
  <text x="112" y="544" fill="#80d6ff" font-family="Arial,sans-serif" font-size="17">hinge maxLoad.torque = 10 N·m</text>
  <text x="740" y="184" fill="#71c7ff" font-family="Arial,sans-serif" font-size="17" font-weight="700">WORKFLOW RESULT</text>
  <rect x="710" y="142" width="525" height="475" rx="14" fill="#1a232e" stroke="#354352"/>
  ${output}
  ${slide.result ? '<rect x="735" y="470" width="475" height="74" rx="10" fill="#3a3020" stroke="#ffd166"/><text x="760" y="516" fill="#ffd166" font-family="Arial,sans-serif" font-size="21" font-weight="700">Warning: unverified is not a pass</text>' : ''}
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
  const diagnostic = result.diagnostics.find((entry) => entry.code === 'assembly.joint.load-unverified');
  if (!result.ok || !diagnostic || diagnostic.severity !== 'warn'
    || !diagnostic.message.includes('No force or torque comparison ran')) {
    throw new Error('Expected an explicit warning that the legacy joint-load check was not run.');
  }

  const evidence = {
    scenario: 'legacy manual-load check with a topology-origin revolute connector',
    invocation: 'npx tsx docs/demos/joint-load-unverified-topology-1272/capture-demo.ts',
    fixture: 'topology-load.kcad.ts',
    localValidatorReplay: true,
    physicsSimulationRun: false,
    deployedBehaviorVerified: false,
    hardwareAcceptanceVerified: false,
    input: { mode: 'stub', externalLoads: LOAD, declaredMaxLoadTorqueNm: 10 },
    result: {
      ok: result.ok,
      failures: result.failures,
      diagnostics: result.diagnostics,
    },
    limitations: 'A warning reports that this legacy synchronous check did not compare force or torque. It is not reaction propagation, FEA, deployed behavior, or hardware acceptance.',
  };
  await writeFile(resolve(ROOT, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);

  const messageLines = wrap(diagnostic.message, 46);
  const slides: Slide[] = [
    {
      title: 'A declared load reaches a topology origin',
      subtitle: 'face-center connector on the housing bore',
      lines: ['The hinge declares a 10 N·m limit.', 'A 1000 N load is supplied for housing.', 'The legacy check accepts vec3 origins only.'],
    },
    {
      title: 'Run the legacy check',
      subtitle: "checkLoadCapacity(arm, loads, { mode: 'stub' })",
      lines: ['The model and mate graph are captured.', 'The synchronous checker cannot resolve', 'the topology query into a numeric origin.'],
    },
    {
      title: 'The skipped check is surfaced',
      subtitle: 'actual diagnostic from this local run',
      lines: [`${diagnostic.code} · ${diagnostic.severity}`, ...messageLines.slice(0, 4)],
      result: true,
    },
    {
      title: 'Read the result with its warning',
      subtitle: 'no comparison ran for this mate',
      lines: [`ok = ${result.ok}`, 'failures = 0', 'diagnostic = assembly.joint.load-unverified', 'The result is explicitly unverified here.'],
      result: true,
    },
  ];

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
