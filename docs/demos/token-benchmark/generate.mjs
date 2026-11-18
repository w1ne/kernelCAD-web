import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const demoDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(demoDir, '../../..');
const resultPath = path.join(repoRoot, 'docs/benchmarks/token-efficiency/output.json');
const result = JSON.parse(await readFile(resultPath, 'utf8'));
const outputDir = path.join(demoDir, 'generated');
const reviewDir = path.join(demoDir, 'video-review');
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await mkdir(reviewDir, { recursive: true });

const escapeXml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

function slide({ eyebrow, title, subtitle, rows, number }) {
  const textRows = rows.map((row, index) => {
    const y = 360 + index * 66;
    return `<text x="112" y="${y}" class="body">${escapeXml(row)}</text>`;
  }).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#101827"/><stop offset="1" stop-color="#1b293a"/></linearGradient></defs>
    <style>
      text { font-family: 'DejaVu Sans Mono', monospace; }
      .eyebrow { fill: #80d6c8; font-size: 23px; letter-spacing: 3px; }
      .title { fill: #f4f7fb; font-size: 46px; font-weight: 700; }
      .subtitle { fill: #bdcbd8; font-size: 25px; }
      .body { fill: #e7eef5; font-size: 23px; }
      .muted { fill: #8da2b5; font-size: 18px; }
      .accent { fill: #f6c76f; }
    </style>
    <rect width="1600" height="900" fill="url(#bg)"/>
    <rect x="82" y="88" width="8" height="700" rx="4" fill="#63c5b5"/>
    <text x="112" y="138" class="eyebrow">${escapeXml(eyebrow)}</text>
    <text x="112" y="228" class="title">${escapeXml(title)}</text>
    <text x="112" y="285" class="subtitle">${escapeXml(subtitle)}</text>
    ${textRows}
    <text x="112" y="817" class="muted">kernelCAD native catalogue source measurement · ${escapeXml(result.generatedAt.slice(0, 10))}</text>
    <text x="1468" y="817" class="muted">${number} / 4</text>
  </svg>`;
}

const statLine = (label, stat) => `${label.padEnd(25)} n=${stat.n}  min=${stat.min}  median=${stat.median}  mean=${stat.mean.toFixed(2)}  p90=${stat.p90}  max=${stat.max}`;
const focus = new Map(result.focusAssets.map((asset) => [path.basename(asset.path), asset]));
const angle = focus.get('angle-bracket.kcad.ts');
const gusset = focus.get('gusset-bracket.kcad.ts');
const plate = focus.get('base-mounting-plate.kcad.ts');
const slides = [
  slide({
    eyebrow: 'MEASUREMENT RUN',
    title: 'Catalogue token profile',
    subtitle: `${result.includedCount.toLocaleString('en-US')} real .kcad.ts assets · source tree ${result.sourceCommit.slice(0, 12)}`,
    rows: [
      'One file is one catalogue asset; assemblies may contain multiple solids.',
      `Tokenizer: ${result.tokenizer.encoding} via ${result.tokenizer.implementation}.`,
      'The full-source count includes each asset’s meta({...}) block.',
    ],
    number: '01',
  }),
  slide({
    eyebrow: 'REPRODUCIBLE CLI WORKFLOW',
    title: 'Run the local census',
    subtitle: 'npm run benchmark:tokens -- --write-manifest=…',
    rows: [
      `Included assets: ${result.includedCount.toLocaleString('en-US')}.`,
      `Metadata included: median ${result.distributions.withMeta.median} tokens; removed: median ${result.distributions.withoutMeta.median}.`,
      `Code only: median ${result.distributions.programOnly.median} tokens (comments and meta removed).`,
    ],
    number: '02',
  }),
  slide({
    eyebrow: 'MEASURED RESULT',
    title: 'Distribution and source-size audit',
    subtitle: 'Nearest-rank p90 · all numbers came from output.json',
    rows: [
      statLine('with meta', result.distributions.withMeta),
      statLine('without meta', result.distributions.withoutMeta),
      statLine('program only', result.distributions.programOnly),
      `Large sources excluded: ${result.excludedLargeSources.length}; largest included: ${result.largestIncludedSource.bytes} bytes.`,
    ],
    number: '03',
  }),
  slide({
    eyebrow: 'NATIVE ASSET EXAMPLES',
    title: 'Three mechanical source counts',
    subtitle: 'Full source includes catalog metadata · program-only removes metadata and comments',
    rows: [
      `${path.basename(angle.path)}: ${angle.withMeta} full / ${angle.programOnly} program-only.`,
      `${path.basename(gusset.path)}: ${gusset.withMeta} full / ${gusset.programOnly} program-only.`,
      `${path.basename(plate.path)}: ${plate.withMeta} full / ${plate.programOnly} program-only.`,
      'The source files remain unchanged; these are counts from the recorded census.',
    ],
    number: '04',
  }),
];

const framePaths = [];
for (let index = 0; index < slides.length; index += 1) {
  const svgPath = path.join(outputDir, `slide-${String(index + 1).padStart(2, '0')}.svg`);
  const pngPath = path.join(outputDir, `slide-${String(index + 1).padStart(2, '0')}.png`);
  await writeFile(svgPath, slides[index]);
  execFileSync('rsvg-convert', ['-o', pngPath, svgPath]);
  framePaths.push(pngPath);
}

const concatPath = path.join(outputDir, 'timeline.txt');
const concatLines = framePaths.map((framePath) => `file '${framePath.replaceAll("'", "'\\''")}'\nduration 5`).join('\n');
await writeFile(concatPath, `${concatLines}\nfile '${framePaths.at(-1)}'\n`);
execFileSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-f', 'concat', '-safe', '0', '-i', concatPath,
  '-vf', 'fps=24,format=yuv420p',
  '-c:v', 'libx264', '-crf', '27', '-preset', 'medium', '-movflags', '+faststart',
  path.join(demoDir, 'demo.mp4'),
]);
execFileSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(demoDir, 'demo.mp4'),
  '-vf', 'select=eq(n\\,0)+eq(n\\,120)+eq(n\\,240)+eq(n\\,360),scale=640:-1,tile=4x1',
  '-frames:v', '1', path.join(reviewDir, 'contact-sheet.png'),
]);

console.log(JSON.stringify({
  input: path.relative(repoRoot, resultPath),
  command: 'node docs/demos/token-benchmark/generate.mjs',
  video: 'docs/demos/token-benchmark/demo.mp4',
  frames: framePaths.length,
  settings: { width: 1600, height: 900, fps: 24, durationSeconds: 20, codec: 'H.264', crf: 27 },
}, null, 2));
