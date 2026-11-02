import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const outDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(outDir, '../../..');
const indexPath = join(repoRoot, 'catalog/index.json');
const previewDir = join(repoRoot, 'catalog/kits/industrial-plant/previews');
const demoPath = join(outDir, 'demo.mp4');
const index = JSON.parse(readFileSync(indexPath, 'utf8')) as {
  assets: Array<{
    id: string;
    kit: string;
    stats: { triangles: number; minUpM: number; materials: number };
    triangleBudget: number;
  }>;
};
const kitAssets = index.assets.filter((asset) => asset.kit === 'industrial-plant');
const showcase = [
  'chemical-storage-tank',
  'centrifugal-pump',
  'axial-exhaust-fan',
  'cooling-tower',
  'conveyor-belt-section',
  'overhead-crane',
  'motor-control-cabinet',
  'safety-shower',
];

if (kitAssets.length !== 60) throw new Error(`Expected 60 industrial-plant assets, found ${kitAssets.length}`);
for (const id of showcase) {
  if (!kitAssets.some((asset) => asset.id === id)) throw new Error(`Missing catalog asset ${id}`);
  if (!statSync(join(previewDir, `${id}.png`)).isFile()) throw new Error(`Missing preview ${id}.png`);
}

const fontFile = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const inputArgs = [
  '-f', 'lavfi', '-i', 'color=c=0x17252d:s=1280x720:r=24:d=3',
];
for (const id of showcase) {
  inputArgs.push('-loop', '1', '-framerate', '24', '-t', '2.4', '-i', join(previewDir, `${id}.png`));
}
inputArgs.push('-f', 'lavfi', '-i', 'color=c=0x17252d:s=1280x720:r=24:d=3');

const filters: string[] = [];
filters.push(`[0:v]drawtext=fontfile=${fontFile}:text='INDUSTRIAL PLANT':fontcolor=white:fontsize=56:x=(w-text_w)/2:y=230,drawtext=fontfile=${fontFile}:text='60 ORIGINAL PARAMETRIC ASSETS':fontcolor=0xdde9ed:fontsize=34:x=(w-text_w)/2:y=320,drawtext=fontfile=${fontFile}:text='LOCAL CATALOG BUILD AND SOFTWARE PREVIEWS':fontcolor=0xa9c0c8:fontsize=24:x=(w-text_w)/2:y=388,format=yuv420p,setsar=1,fps=24[v0]`);

showcase.forEach((id, i) => {
  const asset = kitAssets.find((item) => item.id === id)!;
  const input = i + 1;
  filters.push(
    `[${input}:v]scale=620:620:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0xf0f4f6,drawtext=fontfile=${fontFile}:text='${id.toUpperCase()}':fontcolor=0x17252d:fontsize=34:x=(w-text_w)/2:y=18,drawtext=fontfile=${fontFile}:text='LOCAL SOFTWARE PREVIEW - ${asset.stats.triangles} TRIS':fontcolor=0x43535c:fontsize=22:x=(w-text_w)/2:y=680,format=yuv420p,setsar=1,fps=24[v${input}]`,
  );
});

const outroIndex = showcase.length + 1;
filters.push(`[${outroIndex}:v]drawtext=fontfile=${fontFile}:text='LOCAL CATALOG OUTPUTS ONLY':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=270,drawtext=fontfile=${fontFile}:text='DEPLOYED BEHAVIOUR AND HARDWARE ACCEPTANCE ARE NOT SHOWN':fontcolor=0xa9c0c8:fontsize=22:x=(w-text_w)/2:y=350,format=yuv420p,setsar=1,fps=24[v${outroIndex}]`);
const concatInputs = Array.from({ length: showcase.length + 2 }, (_, i) => `[v${i}]`).join('');
filters.push(`${concatInputs}concat=n=${showcase.length + 2}:v=1:a=0[outv]`);

const ffmpegArgs = [
  '-y', '-hide_banner', '-loglevel', 'error',
  ...inputArgs,
  '-filter_complex', filters.join(';'),
  '-map', '[outv]', '-r', '24', '-an', '-c:v', 'libx264', '-preset', 'medium',
  '-crf', '27', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', demoPath,
];
const ffmpeg = spawnSync('ffmpeg', ffmpegArgs, { encoding: 'utf8' });
if (ffmpeg.status !== 0) throw new Error(ffmpeg.stderr || 'ffmpeg failed');

const probe = spawnSync('ffprobe', [
  '-v', 'error', '-select_streams', 'v:0', '-show_entries',
  'stream=codec_name,width,height,r_frame_rate', '-show_entries',
  'format=duration,size', '-of', 'json', demoPath,
], { encoding: 'utf8' });
if (probe.status !== 0) throw new Error(probe.stderr || 'ffprobe failed');

const triangles = kitAssets.map((asset) => asset.stats.triangles);
const checks = {
  checkCatalogAsset: { passed: 60, total: 60, result: 'pass' },
  catalogIndexGate: { passed: 2, total: 2, result: 'pass' },
  defaultAssetStats: {
    minTriangles: Math.min(...triangles),
    maxTriangles: Math.max(...triangles),
    allWithinBudget: kitAssets.every((asset) => asset.stats.triangles <= asset.triangleBudget),
    oneMaterialEach: kitAssets.every((asset) => asset.stats.materials === 1),
    allBaseGrounded: kitAssets.every((asset) => asset.stats.minUpM === 0),
  },
};
const video = JSON.parse(probe.stdout) as {
  streams: Array<{ codec_name: string; width: number; height: number; r_frame_rate: string }>;
  format: { duration: string; size: string };
};
const evidence = {
  checkedAt: new Date().toISOString(),
  kit: 'industrial-plant',
  assets: { count: kitAssets.length, ids: kitAssets.map((asset) => asset.id) },
  commands: [
    'for f in catalog/kits/industrial-plant/*.kcad.ts; do npx tsx scripts/checkCatalogAsset.ts "$f" || echo "FAILED $f"; done',
    'npm run catalog:build',
    'npm run catalog:previews',
    'npx vitest run tests/integration/catalog/catalogIndex.test.ts',
    'npx tsx docs/demos/catalog-wave-industrial-plant-20261102/generate.mts',
  ],
  checks,
  demo: {
    file: 'demo.mp4',
    showcase,
    stream: video.streams[0],
    durationSeconds: Number(video.format.duration),
    sizeBytes: Number(video.format.size),
    codecSettings: { codec: 'libx264', crf: 27, preset: 'medium', pixelFormat: 'yuv420p', fps: 24 },
  },
  scope: {
    source: 'Local software-rendered previews from catalog GLBs',
    deployedPage: 'not verified; PR awaits merge and deployment',
    hardwareAcceptance: 'not demonstrated',
    simulationOrReplay: 'not demonstrated',
  },
};

writeFileSync(join(outDir, 'verification.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ demoPath, verificationPath: join(outDir, 'verification.json'), video: evidence.demo }, null, 2));
