// SPDX-License-Identifier: MIT
// Local #1799 object-map demo: npx tsx docs/demos/object-map-return/capture-demo.mts

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import sharp from 'sharp';
import { runAndExport } from '../../../src/agent/script-runtime/export.ts';
import { buildModel } from '../../../src/composition/buildModel.ts';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend.ts';
import { isSceneBackend } from '../../../src/kernel/backends/sceneBackend.ts';
import { meshFeaturesPerFeature } from '../../../src/modeling/capture/featureMeshing.ts';
import { runScript } from '../../../src/composition/runScript.ts';
import { KernelError } from '../../../src/shared/intent/kernelError.ts';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender.ts';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../..');
const exampleFile = join(here, 'drive-plate.kcad.ts');
const mixedCode = `const plate = box(40, 30, 4);\nreturn { motor_plate: plate, count: 2 };`;
const videoPath = join(here, 'demo.mp4');
const posterPath = join(here, 'poster.png');
const glbPath = join(here, 'drive-plate.glb');
const width = 1280;
const height = 720;
const fps = 20;

const settings = {
  invocation: 'npx tsx docs/demos/object-map-return/capture-demo.mts',
  sourceScript: 'docs/demos/object-map-return/drive-plate.kcad.ts',
  negativeSource: 'inline mixed object map { motor_plate: Shape, count: number }',
  checks: ['mixed object map diagnostic', 'Scene part names from object keys', 'mesh bounds', 'GLB node and triangle output'],
  render: 'scripts/lib/glbSoftwareRender.ts; triangles parsed from the locally exported GLB',
  browser: 'none; offline SVG + Sharp + FFmpeg capture',
  dimensionsMm: [40, 30, 14],
  video: { width, height, fps, durationSeconds: 8, codec: 'libx264', crf: 26, pixelFormat: 'yuv420p' },
  scope: 'Local source evaluation and export only; no deployed Studio, hosted MCP, simulation, or hardware acceptance.',
};

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function escapeXml(value: unknown): string {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function cardSvg(title: string, subtitle: string, content: string, footer: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#f2f5fa"/><rect width="100%" height="12" fill="#2d69d6"/>
    <text x="64" y="72" font-family="Arial,sans-serif" font-size="34" font-weight="700" fill="#17263d">${escapeXml(title)}</text>
    <text x="66" y="108" font-family="Arial,sans-serif" font-size="19" fill="#586982">${escapeXml(subtitle)}</text>
    <rect x="60" y="142" width="490" height="492" rx="20" fill="#fff" stroke="#d7e0ed"/>
    <rect x="574" y="142" width="646" height="492" rx="20" fill="#fff" stroke="#d7e0ed"/>
    ${content}
    <text x="64" y="675" font-family="Arial,sans-serif" font-size="15" fill="#586982">${escapeXml(footer)}</text>
    <text x="1216" y="675" text-anchor="end" font-family="Arial,sans-serif" font-size="15" fill="#718096">kernelCAD · local validation</text>
  </svg>`;
}

await mkdir(here, { recursive: true });
await initOcct();

const mixedResult = await runScript({ code: mixedCode, fileName: 'mixed-object-return.kcad.ts' })
  .then(() => undefined, (error: unknown) => error);
assert.ok(mixedResult instanceof KernelError, 'a mixed object map must be rejected');
assert.equal(mixedResult.code, 'feature.invalid-args');
assert.match(mixedResult.message, /mixed object: Shape keys motor_plate; non-Shape entries \(count: number\)/);

const exampleCode = await readFile(exampleFile, 'utf8');
const model = await buildModel({ code: exampleCode, fileName: exampleFile });
if (!isSceneBackend(model.rootShape)) throw new Error('The object-map return must lower to a SceneBackend.');
const partNames = model.rootShape.parts.map(part => part.name);
assert.deepEqual(partNames, ['motor_plate', 'drive_pinion']);
const partVolumesMm3 = Object.fromEntries(model.rootShape.parts.map(part => [part.name, part.shape.volume()]));

const meshing = await meshFeaturesPerFeature(model.records, model.session.paramTable, model.session);
assert.deepEqual(meshing.failedFeatureIds, []);
const scenePartNames = meshing.features
  .filter(feature => feature.assemblyFeatureId === model.rootId)
  .map(feature => feature.assemblyPartName)
  .sort();
assert.deepEqual(scenePartNames, ['drive_pinion', 'motor_plate']);
const boundsMm = [0, 1, 2].map(axis => meshing.bounds.max[axis]! - meshing.bounds.min[axis]!);
boundsMm.forEach((value, axis) => assert.ok(Math.abs(value - [40, 30, 14][axis]!) < 1e-3));

const exported = await runAndExport({
  code: exampleCode,
  fileName: exampleFile,
  format: 'glb',
  options: { format: 'glb', units: 'm' },
});
assert.ok(exported.bytes.length > 0, 'the object-map return must export a non-empty GLB');
assert.ok(!exported.diagnostics.some(diagnostic => diagnostic.severity === 'error'));
await writeFile(glbPath, exported.bytes);

const gltf = await new NodeIO().readBinary(exported.bytes);
const meshNodes = gltf.getRoot().listNodes().filter(node => node.getMesh() !== null).map(node => node.getName()).sort();
assert.deepEqual(meshNodes, ['drive_pinion', 'motor_plate']);
const triangles = await glbTriangles(exported.bytes);
assert.ok(triangles.length > 0, 'the GLB must contain renderable triangles');
const modelView = await renderTrianglesPng(triangles, {
  size: 450,
  yawDeg: 35,
  pitchDeg: 24,
  background: '#f7f9fc',
  label: '40 × 30 × 14 mm · local GLB mesh',
});

const beforeCard = cardSvg(
  'Return an object map of parts',
  'Before: the map fell back to the last captured feature and dropped the plate.',
  `<text x="88" y="194" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing=".8" fill="#64748b">SOURCE · OBJECT-MAP RETURN</text>
    <text x="88" y="239" font-family="monospace" font-size="16" fill="#294365">const plate = box(40, 30, 4);</text>
    <text x="88" y="269" font-family="monospace" font-size="16" fill="#294365">const pinion = cylinder(10, 6)</text>
    <text x="104" y="299" font-family="monospace" font-size="16" fill="#294365">.translate(10, 10, 4);</text>
    <text x="88" y="339" font-family="monospace" font-size="16" fill="#294365">return { motor_plate: plate,</text>
    <text x="160" y="369" font-family="monospace" font-size="16" fill="#294365">drive_pinion: pinion };</text>
    <rect x="86" y="410" width="438" height="150" rx="12" fill="#fff5f4" stroke="#f2d0cc"/>
    <text x="108" y="446" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#a63b34">develop f7231d509 (before)</text>
    <text x="108" y="482" font-family="Arial,sans-serif" font-size="15" fill="#773932">evaluate_script ok: true, 1 body</text>
    <text x="108" y="510" font-family="Arial,sans-serif" font-size="15" fill="#773932">volume 1131 mm³, size 12 × 12 × 10 mm</text>
    <text x="108" y="538" font-family="Arial,sans-serif" font-size="15" fill="#773932">motor_plate silently missing</text>
    <text x="604" y="194" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing=".8" fill="#64748b">MIXED MAP · NOW REJECTED</text>
    <text x="604" y="249" font-family="monospace" font-size="16" fill="#294365">return { motor_plate: plate, count: 2 };</text>
    <text x="604" y="303" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#a63b34">${escapeXml(mixedResult.code)}</text>
    <text x="604" y="335" font-family="Arial,sans-serif" font-size="15" fill="#773932">mixed object: Shape keys motor_plate;</text>
    <text x="604" y="361" font-family="Arial,sans-serif" font-size="15" fill="#773932">non-Shape entries (count: number)</text>`,
  'Before values from a local evaluate_script probe on develop f7231d509; no hosted claim.',
);

const resultCard = cardSvg(
  'Each key becomes a named part',
  'After: the map lowers to a Scene with both bodies, like an array return.',
  `<text x="88" y="194" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing=".8" fill="#64748b">AFTER · NAMED SCENE</text>
    <text x="88" y="239" font-family="monospace" font-size="16" fill="#164d9a">parts: ${escapeXml(partNames.join(', '))}</text>
    <text x="88" y="279" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#257449">2 named parts · no failed meshes</text>
    <text x="88" y="324" font-family="monospace" font-size="18" fill="#20344f">40 × 30 × 14 mm</text>
    <text x="88" y="364" font-family="monospace" font-size="15" fill="#20344f">motor_plate  ${partVolumesMm3.motor_plate!.toFixed(0)} mm³</text>
    <text x="88" y="392" font-family="monospace" font-size="15" fill="#20344f">drive_pinion ${partVolumesMm3.drive_pinion!.toFixed(0)} mm³</text>
    <text x="88" y="440" font-family="Arial,sans-serif" font-size="15" fill="#53657e">GLB mesh nodes: ${escapeXml(meshNodes.join(', '))}</text>
    <text x="604" y="194" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing=".8" fill="#64748b">EXPORTED GLB TRIANGLES · SOFTWARE VIEW</text>`,
  'Local build, mesh and GLB export checks only; no deployment, simulation, or hardware acceptance.',
);

const resultPng = await sharp(Buffer.from(resultCard))
  .composite([{ input: modelView, left: 672, top: 206 }])
  .png().toBuffer();
await writeFile(posterPath, resultPng);
await sharp(Buffer.from(beforeCard)).png().toFile(join(here, 'still-before.png'));
await writeFile(join(here, 'still-result.png'), resultPng);

execFileSync('ffmpeg', [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-loop', '1', '-t', '4', '-i', join(here, 'still-before.png'),
  '-loop', '1', '-t', '4', '-i', join(here, 'still-result.png'),
  '-filter_complex', '[0:v][1:v]concat=n=2:v=1:a=0,format=yuv420p[v]',
  '-map', '[v]', '-t', '8', '-r', String(fps), '-c:v', 'libx264', '-preset', 'medium', '-crf', '26',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', videoPath,
], { stdio: 'inherit' });

const videoProbe = JSON.parse(execFileSync('ffprobe', [
  '-v', 'error', '-show_entries', 'format=duration,size',
  '-show_entries', 'stream=codec_name,width,height,avg_frame_rate', '-of', 'json', videoPath,
], { encoding: 'utf8' })) as {
  format: { duration: string; size: string };
  streams: Array<{ codec_name: string; width: number; height: number; avg_frame_rate: string }>;
};

await writeFile(join(here, 'settings.json'), `${JSON.stringify(settings, null, 2)}\n`);
await writeFile(join(here, 'verification.json'), `${JSON.stringify({
  beforeDevelopF7231d509: {
    tool: 'evaluate_script (local callMcpTool probe)',
    ok: true,
    volumeMm3: 1130.97,
    sizeMm: [12, 12, 10],
    note: 'Only drive_pinion (the last captured feature) was kept.',
  },
  negativeCase: { diagnosticCode: mixedResult.code, message: mixedResult.message, hint: mixedResult.hint },
  objectMapReturn: {
    source: 'drive-plate.kcad.ts',
    returnKind: 'Scene',
    partNames,
    partVolumesMm3,
    emittedMeshPartNames: scenePartNames,
    failedFeatureIds: meshing.failedFeatureIds,
    boundsMm,
    glbBytes: exported.bytes.length,
    glbSha256: sha256(exported.bytes),
    meshNodeNames: meshNodes,
    triangleCount: triangles.length,
  },
  video: {
    file: 'demo.mp4',
    sha256: sha256(await readFile(videoPath)),
    durationSeconds: Number(videoProbe.format.duration),
    sizeBytes: Number(videoProbe.format.size),
    ...videoProbe.streams[0],
  },
  scope: settings.scope,
}, null, 2)}\n`);

console.log(JSON.stringify({
  negativeDiagnostic: mixedResult.code,
  parts: partNames,
  partVolumesMm3,
  boundsMm,
  meshNodes,
  triangleCount: triangles.length,
  video: videoProbe.streams[0],
}, null, 2));
