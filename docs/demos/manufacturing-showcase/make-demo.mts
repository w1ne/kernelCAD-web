import { execFileSync } from 'node:child_process';
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const CLI = join(ROOT, 'dist/cli/index.js');
const VIDEO = join(HERE, 'manufacturing-workflow.mp4');
const EVIDENCE = join(HERE, 'video-evidence.json');
const WIDTH = 1920;
const HEIGHT = 1080;
const FONT = 'Adwaita Sans, DejaVu Sans, sans-serif';

type DemoCase = {
  slug: string;
  process: string;
  title: string;
  source: string;
  format: 'dxf' | 'step' | '3mf';
  parameters: string;
  testCheck: string;
  openWork: string;
  renderArgs?: string[];
  pose?: string;
  hide?: string;
};

const CASES: DemoCase[] = [
  {
    slug: 'cut-motor-plate',
    process: 'LASER / WATERJET',
    title: 'Motor mounting plate',
    source: 'examples/manufacturing-showcase/cut-motor-plate.kcad.ts',
    format: 'dxf',
    parameters: 'Plate size and thickness, NEMA pitch, pilot diameter, frame-hole size.',
    testCheck: 'DXF loops, edited hole centres and diameters are read back.',
    openWork: 'Confirm the motor drawing, tolerances, cutter compensation and physical fit.',
  },
  {
    slug: 'bearing-block',
    process: 'CNC MILLING',
    title: 'Bearing block',
    source: 'examples/manufacturing-showcase/bearing-block.kcad.ts',
    format: 'step',
    parameters: '608 seat Ø21.8–22.2 mm × 7 mm; shaft clearance and mounting inset.',
    testCheck: 'Seat-depth volume and CNC undercut/internal-corner gates.',
    openWork: 'Choose the bearing fit, machining setup and shop process.',
  },
  {
    slug: 'bent-mounting-bracket',
    process: 'SHEET METAL',
    title: 'Bent mounting bracket',
    source: 'examples/manufacturing-showcase/bent-mounting-bracket.kcad.ts',
    format: 'dxf',
    parameters: '2 mm sheet, bend angle and width; two mounting holes per leg.',
    testCheck: 'Flat-pattern DXF readback: four holes, bend line and sheet metadata.',
    openWork: 'Confirm stock, K-factor, tooling and physical bend/fit.',
  },
  {
    slug: 'shoulder-spacer',
    process: 'TURNING',
    title: 'Shoulder spacer',
    source: 'examples/manufacturing-showcase/shoulder-spacer.kcad.ts',
    format: 'step',
    parameters: 'Bore, body/flange diameters, flange thickness and overall length.',
    testCheck: 'Revolved profile, STEP round-trip, envelope and analytic volume.',
    openWork: 'Set tolerances and edge breaks; verify the physical mating fit.',
  },
  {
    slug: 'electronics-enclosure',
    process: 'FDM PRINTING',
    title: 'Electronics enclosure',
    source: 'examples/manufacturing-showcase/electronics-enclosure.kcad.ts',
    format: '3mf',
    parameters: 'Editable base/lid sizes, wall, locating lip, board posts and connector.',
    testCheck: 'Separate watertight STL meshes; named 3MF objects and bed layout.',
    openWork: 'Check board/fastener fit, material and slicer settings; print and assemble.',
    pose: '45,65',
    hide: 'lid',
  },
  {
    slug: 'moulded-housing',
    process: 'INJECTION MOLDING',
    title: 'Drafted housing',
    source: 'examples/manufacturing-showcase/moulded-housing.kcad.ts',
    format: 'step',
    parameters: '1–5° draft, 1.8–2.5 mm wall and editable envelope dimensions.',
    testCheck: 'Draft/wall checks pass range endpoints; trapped-core control fails.',
    openWork: 'Add retention/ribs and review gate, ejectors, parting and tool design.',
    pose: '45,65',
  },
  {
    slug: 'bearing-shaft-assembly',
    process: 'ASSEMBLY',
    title: 'Bearing and shaft',
    source: 'examples/manufacturing-showcase/bearing-shaft-assembly.kcad.ts',
    format: 'step',
    parameters: 'Shaft length/diameter, shoulder diameter and retainer thickness.',
    testCheck: 'Four named parts; default mate and motion review.',
    openWork: 'Specify bearing fits, screws, external fixture/load path and physical motion.',
  },
];

function sha256(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function wrap(value: string, maxChars = 44): string[] {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

function textBlock(label: string, value: string, y: number, size = 30): string {
  const lines = wrap(value);
  const labelSvg = `<text x="1132" y="${y}" fill="#91a7c7" font-family="${FONT}" font-size="20" font-weight="700" letter-spacing="2">${escapeXml(label)}</text>`;
  const valueSvg = lines.map((line, index) =>
    `<text x="1132" y="${y + 38 + index * 34}" fill="#f3f6fb" font-family="${FONT}" font-size="${size}">${escapeXml(line)}</text>`,
  ).join('');
  return labelSvg + valueSvg;
}

function cardSvg(options: {
  kicker: string;
  title: string;
  subtitle: string;
  blocks?: string;
}): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#10192a"/><stop offset="1" stop-color="#1a2940"/></linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#000" flood-opacity=".25"/></filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <path d="M72 145H1848" stroke="#34445b" stroke-width="2"/>
    <text x="72" y="78" fill="#7dd3c7" font-family="${FONT}" font-size="22" font-weight="700" letter-spacing="3">${escapeXml(options.kicker)}</text>
    <text x="72" y="126" fill="#ffffff" font-family="${FONT}" font-size="40" font-weight="700">${escapeXml(options.title)}</text>
    <text x="72" y="1018" fill="#aab8cc" font-family="${FONT}" font-size="22">${escapeXml(options.subtitle)}</text>
    ${options.blocks ?? ''}
  </svg>`;
  return Buffer.from(svg);
}

function renderCommand(caseInfo: DemoCase, basePath: string): string[] {
  return [
    'render', '--preset', 'publish', '--background', 'dark', '--no-watermark',
    ...(caseInfo.pose ? ['--pose', caseInfo.pose] : []),
    ...(caseInfo.hide ? ['--hide', caseInfo.hide] : []),
    '-o', basePath, join(ROOT, caseInfo.source),
  ];
}

function expectedRenderPath(caseInfo: DemoCase, basePath: string): string {
  return caseInfo.pose
    ? basePath.replace(/\.png$/, `.pose-${caseInfo.pose.replace(',', '-')}.png`)
    : basePath;
}

function runCli(args: string[]): { stdout: string } {
  const result = execFileSync(process.execPath, [CLI, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    env: process.env,
  });
  return { stdout: result };
}

function parseCliJson(stdout: string, label: string): Record<string, unknown> {
  const start = stdout.search(/\{\s*"ok"\s*:/);
  if (start < 0) throw new Error(`${label}: CLI output did not contain a JSON receipt`);
  try {
    return JSON.parse(stdout.slice(start)) as Record<string, unknown>;
  } catch (error) {
    throw new Error(`${label}: could not parse the CLI JSON receipt: ${String(error)}`);
  }
}

async function main(): Promise<void> {
  const temp = await mkdtemp(join(tmpdir(), 'kernelcad-manufacturing-demo-'));
  try {
    const gitHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
    const resultRows = [];
    const frames: string[] = [];
    const slideDurations: number[] = [];
    const intro = join(temp, '00-intro.png');
    const introSvg = cardSvg({
      kicker: 'KERNELCAD · MANUFACTURING SHOWCASE',
      title: 'Seven jobs, one editable CAD workflow',
      subtitle: 'Digital geometry and file evidence only · no machine process or physical acceptance',
      blocks: `
        <rect x="112" y="236" width="1696" height="616" rx="28" fill="#152238" stroke="#34445b" stroke-width="2" filter="url(#shadow)"/>
        <text x="190" y="345" fill="#7dd3c7" font-family="${FONT}" font-size="27" font-weight="700" letter-spacing="2">SOURCE</text>
        <text x="190" y="410" fill="#ffffff" font-family="${FONT}" font-size="39">Editable .kcad.ts parameters and named geometry</text>
        <path d="M190 480H1700" stroke="#34445b" stroke-width="2"/>
        <text x="190" y="565" fill="#7dd3c7" font-family="${FONT}" font-size="27" font-weight="700" letter-spacing="2">EVALUATE</text>
        <text x="190" y="630" fill="#ffffff" font-family="${FONT}" font-size="39">kernelcad evaluate --json → diagnostics</text>
        <path d="M190 700H1700" stroke="#34445b" stroke-width="2"/>
        <text x="190" y="785" fill="#7dd3c7" font-family="${FONT}" font-size="27" font-weight="700" letter-spacing="2">EXPORT + CHECK</text>
        <text x="190" y="850" fill="#ffffff" font-family="${FONT}" font-size="39">DXF · STEP · STL · 3MF · independent readback tests</text>
      `,
    });
    await sharp(introSvg).png().toFile(intro);
    frames.push(intro);
    slideDurations.push(4);

    for (const [index, item] of CASES.entries()) {
      const sourcePath = join(ROOT, item.source);
      const sourceText = await readFile(sourcePath);
      const sourceSha256 = sha256(sourceText);
      const evaluate = runCli(['evaluate', '--json', sourcePath]);
      const evaluation = parseCliJson(evaluate.stdout, `${item.slug} evaluate`) as {
        ok?: boolean;
        featureCount?: number;
        diagnostics?: Array<{ severity?: string }>;
      };
      if (!evaluation.ok || evaluation.diagnostics?.some((diagnostic) => diagnostic.severity === 'error')) {
        throw new Error(`${item.slug}: evaluate failed or returned error diagnostics`);
      }

      const artifactPath = join(temp, `${item.slug}.${item.format}`);
      const exported = runCli(['export', item.format, sourcePath, '-o', artifactPath, '--json']);
      const exportResult = parseCliJson(exported.stdout, `${item.slug} ${item.format} export`) as {
        ok?: boolean;
        bytesWritten?: number;
        diagnostics?: Array<{ severity?: string }>;
      };
      if (!exportResult.ok || !exportResult.bytesWritten || exportResult.diagnostics?.some((diagnostic) => diagnostic.severity === 'error')) {
        throw new Error(`${item.slug}: ${item.format} export failed or returned error diagnostics`);
      }
      const artifact = await readFile(artifactPath);

      const renderBase = join(temp, `${item.slug}.png`);
      const renderArgs = renderCommand(item, renderBase);
      runCli(renderArgs);
      const imagePath = expectedRenderPath(item, renderBase);
      const image = await readFile(imagePath);

      const blocks = [
        textBlock('SOURCE', item.source.split('/').at(-1)!, 355, 28),
        textBlock('EDITABLE INPUTS', item.parameters, 435, 29),
        textBlock('REAL CLI STEPS', `kernelcad evaluate --json  →  export ${item.format.toUpperCase()}`, 555, 26),
        textBlock('EXPORT RESULT', `No error diagnostics · ${artifact.byteLength.toLocaleString()} bytes · SHA-256 ${sha256(artifact).slice(0, 12)}`, 650, 25),
        textBlock('EXAMPLE TESTS', item.testCheck, 760, 27),
        textBlock('STILL OPEN', item.openWork, 866, 25),
      ].join('');
      const framePath = join(temp, `${String(index + 1).padStart(2, '0')}-${item.slug}.png`);
      const svg = cardSvg({
        kicker: `${String(index + 1).padStart(2, '0')} / 07  ·  ${item.process}`,
        title: item.title,
        subtitle: 'The exported geometry is not a toolpath, fit approval or physical test.',
        blocks: `${blocks}<rect x="72" y="184" width="1016" height="762" rx="22" fill="#202428" stroke="#384250" stroke-width="2" filter="url(#shadow)"/>`,
      });
      const scaledImage = await sharp(image).resize(1000, 750, { fit: 'contain', background: '#202428' }).png().toBuffer();
      await sharp(svg)
        .composite([{ input: scaledImage, left: 80, top: 190 }])
        .png()
        .toFile(framePath);
      frames.push(framePath);
      slideDurations.push(4);
      resultRows.push({
        slug: item.slug,
        source: item.source,
        sourceSha256,
        evaluateCommand: ['kernelcad', 'evaluate', '--json', item.source],
        evaluation: {
          ok: evaluation.ok,
          featureCount: evaluation.featureCount,
          errorDiagnostics: 0,
        },
        exportCommand: ['kernelcad', 'export', item.format, item.source, '-o', `${item.slug}.${item.format}`, '--json'],
        artifact: {
          format: item.format,
          bytes: artifact.byteLength,
          sha256: sha256(artifact),
          errorDiagnostics: 0,
        },
        renderCommand: [
          'kernelcad', 'render', '--preset', 'publish', '--background', 'dark', '--no-watermark',
          ...(item.pose ? ['--pose', item.pose] : []),
          ...(item.hide ? ['--hide', item.hide] : []),
          '-o', `<temp>/${item.slug}.png`, item.source,
        ],
        renderSha256: sha256(image),
        testCheck: item.testCheck,
        openWork: item.openWork,
      });
    }

    const outro = join(temp, '99-scope.png');
    const outroSvg = cardSvg({
      kicker: 'WHAT THE EVIDENCE SAYS',
      title: 'CAD checks passed. Shop acceptance is separate.',
      subtitle: 'Source, evaluation, neutral-file exports and integration tests are software evidence.',
      blocks: `
        <rect x="112" y="222" width="1696" height="680" rx="28" fill="#152238" stroke="#34445b" stroke-width="2" filter="url(#shadow)"/>
        <text x="190" y="330" fill="#7dd3c7" font-family="${FONT}" font-size="27" font-weight="700" letter-spacing="2">COVERED HERE</text>
        <text x="190" y="394" fill="#ffffff" font-family="${FONT}" font-size="36">Parametric edits · geometry gates · export and readback tests</text>
        <path d="M190 454H1700" stroke="#34445b" stroke-width="2"/>
        <text x="190" y="540" fill="#7dd3c7" font-family="${FONT}" font-size="27" font-weight="700" letter-spacing="2">NOT CLAIMED</text>
        <text x="190" y="604" fill="#ffffff" font-family="${FONT}" font-size="34">No CAM toolpaths, slicer/G-code, supplier sign-off, strength test,</text>
        <text x="190" y="654" fill="#ffffff" font-family="${FONT}" font-size="34">fabricated parts, physical fit or production approval.</text>
        <path d="M190 714H1700" stroke="#34445b" stroke-width="2"/>
        <text x="190" y="800" fill="#7dd3c7" font-family="${FONT}" font-size="27" font-weight="700" letter-spacing="2">NEXT ACCEPTANCE GATE</text>
        <text x="190" y="862" fill="#ffffff" font-family="${FONT}" font-size="34">Review drawings with a shop, then measure and test real parts.</text>
      `,
    });
    await sharp(outroSvg).png().toFile(outro);
    frames.push(outro);
    slideDurations.push(5);

    const concatFile = join(temp, 'slides.ffconcat');
    const concatLines = frames.flatMap((frame, index) => [
      `file '${frame.replaceAll("'", "'\\''")}'`,
      `duration ${index === frames.length - 1 ? slideDurations[index] / 2 : slideDurations[index]}`,
    ]);
    concatLines.push(`file '${frames.at(-1)!.replaceAll("'", "'\\''")}'`);
    await writeFile(concatFile, `${concatLines.join('\n')}\n`);
    execFileSync('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'concat', '-safe', '0', '-i', concatFile,
      '-vf', 'fps=24,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21',
      '-movflags', '+faststart', VIDEO,
    ], { cwd: ROOT, stdio: 'inherit' });

    const probe = JSON.parse(execFileSync('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration', '-show_entries', 'stream=width,height',
      '-of', 'json', VIDEO,
    ], { encoding: 'utf8' })) as {
      streams?: Array<{ width?: number; height?: number }>;
      format?: { duration?: string };
    };
    const videoBytes = await readFile(VIDEO);
    const evidence = {
      checkedAt: new Date().toISOString(),
      sourceHead: gitHead,
      provenance: 'Annotated still sequence from local kernelcad CLI renders of the committed example sources. The generator runs evaluate and neutral-file export commands for every case. It is not a screen recording, deployed-site capture, machine toolpath, fabricated part or physical acceptance.',
      video: 'manufacturing-workflow.mp4',
      videoSha256: sha256(videoBytes),
      durationSec: Number(probe.format?.duration),
      canvas: `${probe.streams?.[0]?.width}x${probe.streams?.[0]?.height}`,
      codec: 'H.264, yuv420p, 24 fps',
      slides: [
        { title: 'Source → evaluate → export', durationSec: slideDurations[0] },
        ...resultRows.map((row, index) => ({
          source: row.source,
          durationSec: slideDurations[index + 1],
          sourceSha256: row.sourceSha256,
          renderSha256: row.renderSha256,
          format: row.artifact.format,
          artifactBytes: row.artifact.bytes,
          artifactSha256: row.artifact.sha256,
          evaluateCommand: row.evaluateCommand,
          exportCommand: row.exportCommand,
          renderCommand: row.renderCommand,
          testCheck: row.testCheck,
          openWork: row.openWork,
        })),
        { title: 'Evidence boundary', durationSec: slideDurations.at(-1) },
      ],
      cases: resultRows,
    };
    await writeFile(EVIDENCE, `${JSON.stringify(evidence, null, 2)}\n`);
    console.log(JSON.stringify({ video: VIDEO, durationSec: evidence.durationSec, canvas: evidence.canvas, cases: resultRows.length, sha256: evidence.videoSha256 }, null, 2));
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

await main();
