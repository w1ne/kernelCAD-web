// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { getOC } from 'replicad';
import { isValidShape } from '../../../src/kernel/backends/occt/booleanRecovery.ts';
import { meshFeaturesPerFeature } from '../../../src/modeling/capture/featureMeshing.ts';
import { loadScriptFeatures } from '../../../src/modeling/runtime/scriptLoader.ts';
import { renderTrianglesPng, type SoftTriangle } from '../../../scripts/lib/glbSoftwareRender.ts';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../..');
const modelScript = join(repo, 'examples/interoperability/dxf-ellipse/import-partial-ellipse.kcad.ts');
const dxfFixture = join(repo, 'examples/interoperability/dxf-ellipse/partial-ellipse.dxf');
const output = join(here, 'demo.mp4');
const width = 1280;
const height = 720;
const fps = 16;
const frameCount = 160;
const expectedVolumeMm3 = 75 * Math.PI;
const settings = {
  invocation: 'npx tsx docs/demos/dxf-partial-ellipse-import/capture-demo.mts',
  sourceScript: 'examples/interoperability/dxf-ellipse/import-partial-ellipse.kcad.ts',
  inputFixture: 'examples/interoperability/dxf-ellipse/partial-ellipse.dxf',
  renderer: 'scripts/lib/glbSoftwareRender.ts using triangles meshed from the lowered OCCT B-rep',
  browser: 'none; offline SVG + Sharp + FFmpeg capture',
  width,
  height,
  fps,
  durationSeconds: frameCount / fps,
  initialViewYawDeg: 72,
  encoding: { codec: 'libx264', preset: 'medium', crf: 26, pixelFormat: 'yuv420p', fastStart: true },
  model: { majorRadiusMm: 10, minorRadiusMm: 5, extrusionMm: 3, profile: 'upper half ellipse closed by its diameter' },
  validation: ['OCCT B-rep validity', 'measured volume against 75π mm³', 'bounding box against fixture extents'],
  scope: 'Local geometry validation only; no deployment, simulation, or hardware acceptance.',
};

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function escapeXml(value: unknown): string {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function frameSvg(index: number, measuredVolume: number): string {
  const step = Math.min(3, Math.floor(index / (frameCount / 4)));
  const steps = [
    'Read the partial ELLIPSE and its diameter edge',
    'Keep the curve as two exact rational NURBS arcs',
    'Join the arc to make an ordinary closed Sketch',
    'Extrude and measure the resulting B-rep',
  ];
  const stepRows = steps.map((label, i) => {
    const y = 550 + i * 23;
    const active = i === step;
    return `<circle cx="94" cy="${y - 5}" r="7" fill="${active ? '#2d69d6' : '#d1dae7'}"/><text x="112" y="${y}" font-family="Arial,sans-serif" font-size="15" font-weight="${active ? '700' : '400'}" fill="${active ? '#1f5fc4' : '#7d8aa0'}">${escapeXml(label)}</text>`;
  }).join('');
  const color = step >= 1 ? '#164d9a' : '#294365';
  const measured = measuredVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#f2f5fa"/><rect width="100%" height="12" fill="#2d69d6"/>
    <text x="64" y="70" font-family="Arial,sans-serif" font-size="34" font-weight="700" fill="#17263d">Import a partial DXF ellipse exactly</text>
    <text x="66" y="108" font-family="Arial,sans-serif" font-size="18" fill="#586982">DXF arc + diameter → KernelCAD sketch → measured OCCT solid</text>
    <rect x="60" y="140" width="576" height="482" rx="20" fill="#fff" stroke="#d7e0ed"/>
    <text x="88" y="180" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing=".8" fill="#64748b">INPUT · PARTIAL-ELLIPSE.DXF</text>
    <rect x="86" y="198" width="524" height="152" rx="12" fill="#f7f9fc"/>
    <text x="104" y="230" font-family="Arial,sans-serif" font-size="15" fill="#53657e">Center (codes 10, 20)</text>
    <text x="572" y="230" text-anchor="end" font-family="monospace" font-size="15" font-weight="700" fill="#20344f">(20, 20) mm</text>
    <text x="104" y="260" font-family="Arial,sans-serif" font-size="15" fill="#53657e">Major axis · minor/major ratio</text>
    <text x="572" y="260" text-anchor="end" font-family="monospace" font-size="15" font-weight="700" fill="#20344f">(10, 0) · 0.5</text>
    <text x="104" y="290" font-family="Arial,sans-serif" font-size="15" fill="#53657e">Parameter span (codes 41, 42)</text>
    <text x="572" y="290" text-anchor="end" font-family="monospace" font-size="15" font-weight="700" fill="#20344f">0 → π</text>
    <text x="104" y="320" font-family="Arial,sans-serif" font-size="15" fill="#53657e">Closing edge</text>
    <text x="572" y="320" text-anchor="end" font-family="monospace" font-size="15" font-weight="700" fill="#20344f">20 mm diameter</text>
    <path d="M86 367H610" stroke="#e4eaf2"/>
    <text x="88" y="399" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing=".8" fill="#64748b">KERNELCAD MODEL SCRIPT</text>
    <text x="104" y="438" font-family="monospace" font-size="16" fill="${color}">const [profile] = await lib.fromDXF(</text>
    <text x="122" y="466" font-family="monospace" font-size="16" fill="${color}">'partial-ellipse.dxf');</text>
    <text x="104" y="505" font-family="monospace" font-size="16" fill="#294365">return profile.extrude(3);</text>
    ${stepRows}
    <rect x="656" y="140" width="564" height="482" rx="20" fill="#fff" stroke="#d7e0ed"/>
    <text x="684" y="180" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing=".8" fill="#64748b">LOWERED OCCT B-REP · SOFTWARE RENDER</text>
    <rect x="728" y="196" width="420" height="374" rx="14" fill="#f7f9fc"/>
    <rect x="684" y="580" width="172" height="27" rx="13" fill="#e5f3eb"/>
    <text x="701" y="599" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#257449">VALID B-REP</text>
    <rect x="870" y="580" width="320" height="27" rx="13" fill="#e7eefb"/>
    <text x="887" y="599" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#315c9e">2 NURBS ARCS · ${measured} mm³</text>
    <text x="64" y="670" font-family="Arial,sans-serif" font-size="15" fill="#586982">Local geometry validation · deployment, simulation and hardware acceptance are not shown</text>
    <text x="1216" y="670" text-anchor="end" font-family="Arial,sans-serif" font-size="15" fill="#718096">kernelCAD · DXF import</text>
  </svg>`;
}

const loaded = await loadScriptFeatures(modelScript);
const returned = loaded.returnValue as { id?: string } | undefined;
if (typeof returned?.id !== 'string') throw new Error('Example script did not return a KernelCAD Shape.');

const meshed = await meshFeaturesPerFeature(
  loaded.features.map(feature => feature.record),
  loaded.paramTable,
  loaded.session,
);
if (meshed.failedFeatureIds.length > 0) {
  throw new Error(`Feature meshing failed: ${meshed.failedFeatureIds.join(', ')}`);
}
const feature = meshed.features.find(candidate => candidate.featureId === returned.id);
const backend = meshed.shapes?.get(returned.id) as unknown as {
  getReplicadShape(): { wrapped: unknown };
  volume(): number;
  boundingBox(): { min: number[]; max: number[] };
} | undefined;
if (!feature || !backend) throw new Error(`No lowered geometry was produced for ${returned.id}.`);

const validBrep = isValidShape(getOC(), backend.getReplicadShape().wrapped);
const measuredVolumeMm3 = backend.volume();
const relativeVolumeError = Math.abs(measuredVolumeMm3 - expectedVolumeMm3) / expectedVolumeMm3;
const bounds = backend.boundingBox();
const profileRecord = loaded.session.getRecords().find(record => {
  const commands = (record.metadata as { commands?: Array<{ kind?: string }> } | undefined)?.commands;
  return commands?.filter(command => command.kind === 'nurbsSegment').length === 2;
});
if (!validBrep) throw new Error('OCCT reports the imported partial-ellipse extrusion as an invalid B-rep.');
if (relativeVolumeError > 1e-6) {
  throw new Error(`Volume ${measuredVolumeMm3} mm³ differs from analytic ${expectedVolumeMm3} mm³.`);
}
if (!profileRecord) throw new Error('The imported sketch does not contain two rational NURBS arcs.');
if (Math.abs(bounds.min[0]! - 10) > 1e-6 || Math.abs(bounds.max[0]! - 30) > 1e-6 ||
    Math.abs(bounds.min[1]! - 20) > 1e-6 || Math.abs(bounds.max[1]! - 25) > 1e-6 ||
    Math.abs(bounds.min[2]!) > 1e-6 || Math.abs(bounds.max[2]! - 3) > 1e-6) {
  throw new Error(`Unexpected B-rep bounds: ${JSON.stringify(bounds)}.`);
}

const triangles: SoftTriangle[] = [];
for (const face of feature.faces) {
  for (let i = 0; i + 2 < face.indices.length; i += 3) {
    const at = (corner: number): [number, number, number] => {
      const vertex = face.indices[i + corner]!;
      const offset = vertex * 3;
      return [face.vertices[offset]!, face.vertices[offset + 2]!, face.vertices[offset + 1]!];
    };
    triangles.push({ v: [at(0), at(1), at(2)], color: [0.24, 0.45, 0.75] });
  }
}
if (triangles.length === 0) throw new Error('The verified B-rep produced no renderable triangles.');

mkdirSync(here, { recursive: true });
writeFileSync(join(here, 'settings.json'), `${JSON.stringify(settings, null, 2)}\n`);
const frameDir = join(tmpdir(), `kcad-dxf-partial-ellipse-${process.pid}`);
rmSync(frameDir, { recursive: true, force: true });
mkdirSync(frameDir, { recursive: true });
try {
  const views = await Promise.all(Array.from({ length: 40 }, (_, i) => renderTrianglesPng(triangles, {
    size: 360,
    yawDeg: i * 9 + 72,
    pitchDeg: 25,
    background: '#f7f9fc',
  })));
  const poster = await sharp(Buffer.from(frameSvg(0, measuredVolumeMm3))).png().toBuffer();
  await sharp(poster).composite([{ input: views[0]!, left: 758, top: 200 }]).png().toFile(join(here, 'poster.png'));
  for (let i = 0; i < frameCount; i++) {
    const stage = await sharp(Buffer.from(frameSvg(i, measuredVolumeMm3))).png().toBuffer();
    const viewIndex = Math.floor((i / frameCount) * views.length) % views.length;
    await sharp(stage)
      .composite([{ input: views[viewIndex]!, left: 758, top: 200 }])
      .png()
      .toFile(join(frameDir, `frame-${String(i).padStart(4, '0')}.png`));
  }
  execFileSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-framerate', String(fps), '-i', join(frameDir, 'frame-%04d.png'),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '26',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output,
  ], { stdio: 'inherit' });
} finally {
  rmSync(frameDir, { recursive: true, force: true });
}

const videoProbe = JSON.parse(execFileSync('ffprobe', [
  '-v', 'error', '-show_entries', 'format=duration,size',
  '-show_entries', 'stream=codec_name,width,height,avg_frame_rate', '-of', 'json', output,
], { encoding: 'utf8' })) as {
  format: { duration: string; size: string };
  streams: Array<{ codec_name: string; width: number; height: number; avg_frame_rate: string }>;
};
const inputBytes = readFileSync(dxfFixture);
const scriptBytes = readFileSync(modelScript);
const captureScriptBytes = readFileSync(fileURLToPath(import.meta.url));
const evidence = {
  inputSha256: sha256(inputBytes),
  modelScriptSha256: sha256(scriptBytes),
  captureScriptSha256: sha256(captureScriptBytes),
  outputFeatureId: returned.id,
  importedSketchId: profileRecord.id,
  nurbsArcCount: 2,
  validBrep,
  measuredVolumeMm3,
  analyticVolumeMm3: expectedVolumeMm3,
  relativeVolumeError,
  boundingBoxMm: bounds,
  triangleCount: triangles.length,
  video: {
    file: 'demo.mp4',
    sha256: sha256(readFileSync(output)),
    durationSeconds: Number(videoProbe.format.duration),
    sizeBytes: Number(videoProbe.format.size),
    ...videoProbe.streams[0],
  },
  scope: 'Local model evaluation and OCCT B-rep measurement. No deployment, simulation, or hardware acceptance is claimed.',
};
writeFileSync(join(here, 'verification.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Wrote ${resolve(output)} (${evidence.video.durationSeconds}s, ${width}x${height}, ${triangles.length} actual B-rep triangles).`);
