// SPDX-License-Identifier: MIT
// Local #1799 demo: npx tsx docs/demos/unfinished-assembly-return/capture-demo.mts

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
const brokenFixture = join(here, 'unfinished-assembly.kcad.ts');
const exampleFile = join(repo, 'examples/params/color-enclosure.kcad.ts');
const videoPath = join(here, 'demo.mp4');
const posterPath = join(here, 'poster.png');
const glbPath = join(here, 'enclosure.glb');
const width = 1280;
const height = 720;
const fps = 20;

const settings = {
  invocation: 'npx tsx docs/demos/unfinished-assembly-return/capture-demo.mts',
  sourceScript: 'examples/params/color-enclosure.kcad.ts',
  negativeFixture: 'docs/demos/unfinished-assembly-return/unfinished-assembly.kcad.ts',
  checks: ['unfinished AssemblyPartRef diagnostic', 'Scene mesh names and bounds', 'GLB node and triangle output'],
  render: 'scripts/lib/glbSoftwareRender.ts; triangles parsed from the locally exported GLB',
  browser: 'none; offline SVG + Sharp + FFmpeg capture',
  dimensionsMm: [60, 40, 21],
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

const brokenCode = await readFile(brokenFixture, 'utf8');
const brokenResult = await runScript({ code: brokenCode, fileName: brokenFixture })
  .then(() => undefined, (error: unknown) => error);
assert.ok(brokenResult instanceof KernelError, 'unfinished assembly return must be rejected');
assert.equal(brokenResult.code, 'feature.invalid-args');
assert.match(brokenResult.message, /\.kcad\.ts script return value/);
assert.match(brokenResult.hint ?? '', /append \.model\(\)/);

const exampleCode = await readFile(exampleFile, 'utf8');
const model = await buildModel({ code: exampleCode, fileName: exampleFile });
if (!isSceneBackend(model.rootShape)) throw new Error('The corrected example must lower to a SceneBackend.');
const partNames = model.rootShape.parts.map(part => part.name).sort();
assert.deepEqual(partNames, ['base', 'lid']);

const meshing = await meshFeaturesPerFeature(model.records, model.session.paramTable, model.session);
assert.deepEqual(meshing.failedFeatureIds, []);
const scenePartNames = meshing.features
  .filter(feature => feature.assemblyFeatureId === model.rootId)
  .map(feature => feature.assemblyPartName)
  .sort();
assert.deepEqual(scenePartNames, ['base', 'lid']);
const boundsMm = [0, 1, 2].map(axis => meshing.bounds.max[axis]! - meshing.bounds.min[axis]!);
boundsMm.forEach((value, axis) => assert.ok(Math.abs(value - [60, 40, 21][axis]!) < 1e-4));

const exported = await runAndExport({
  code: exampleCode,
  fileName: exampleFile,
  format: 'glb',
  options: { format: 'glb', units: 'm' },
});
assert.ok(exported.bytes.length > 0, 'corrected example must export a non-empty GLB');
assert.ok(!exported.diagnostics.some(diagnostic => diagnostic.severity === 'error'));
await writeFile(glbPath, exported.bytes);

const gltf = await new NodeIO().readBinary(exported.bytes);
const meshNodes = gltf.getRoot().listNodes().filter(node => node.getMesh() !== null).map(node => node.getName()).sort();
const glbMaterials = gltf.getRoot().listMaterials().map(material => material.getName()).filter(Boolean).sort();
const triangles = await glbTriangles(exported.bytes);
assert.ok(triangles.length > 0, 'the GLB must contain renderable triangles');
const modelView = await renderTrianglesPng(triangles, {
  size: 450,
  yawDeg: 35,
  pitchDeg: 24,
  background: '#f7f9fc',
  label: '60 × 40 × 21 mm · local GLB mesh',
});

const errorCard = cardSvg(
  'Return a completed assembly scene',
  'The evaluator now rejects unfinished assembly values with a repair hint.',
  `<text x="88" y="194" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing=".8" fill="#64748b">INVALID RETURN · PART REFERENCE</text>
    <text x="88" y="239" font-family="monospace" font-size="16" fill="#294365">return assembly('enclosure')</text>
    <text x="104" y="269" font-family="monospace" font-size="16" fill="#294365">.part('base', base)</text>
    <text x="104" y="299" font-family="monospace" font-size="16" fill="#294365">.part('lid', lid);</text>
    <rect x="86" y="344" width="438" height="208" rx="12" fill="#fff5f4" stroke="#f2d0cc"/>
    <text x="108" y="382" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#a63b34">feature.invalid-args</text>
    <text x="108" y="418" font-family="Arial,sans-serif" font-size="15" fill="#773932">Requires a Shape or Scene from</text>
    <text x="108" y="446" font-family="monospace" font-size="15" fill="#773932">arm.model() / arm.solvedModel(...)</text>
    <text x="108" y="493" font-family="Arial,sans-serif" font-size="15" fill="#773932">Append .model() to the fluent chain.</text>
    <text x="604" y="194" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing=".8" fill="#64748b">COPYABLE REPAIR</text>
    <text x="604" y="249" font-family="monospace" font-size="18" fill="#164d9a">return arm.model();</text>
    <text x="604" y="303" font-family="Arial,sans-serif" font-size="17" fill="#53657e">The example's part-ref chain has the same</text>
    <text x="604" y="332" font-family="Arial,sans-serif" font-size="17" fill="#53657e">.model() terminator for direct returns.</text>
    <text x="604" y="420" font-family="Arial,sans-serif" font-size="15" fill="#64748b">No empty geometry is reported as success.</text>`,
  'Observed locally with runScript; this does not claim hosted Studio or MCP behavior.',
);

const resultCard = cardSvg(
  'Append .model() to build visible geometry',
  'The official parameterized enclosure now returns its named Scene.',
  `<text x="88" y="194" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing=".8" fill="#64748b">SOURCE CHANGE · EXPLICIT SCENE RETURN</text>
    <text x="88" y="239" font-family="monospace" font-size="16" fill="#164d9a">.part('base', base)</text>
    <text x="88" y="269" font-family="monospace" font-size="16" fill="#164d9a">.part('lid', lid)</text>
    <text x="88" y="299" font-family="monospace" font-size="16" font-weight="700" fill="#164d9a">.model();</text>
    <path d="M88 336H522" stroke="#e4eaf2"/>
    <text x="88" y="379" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#257449">2 named parts · no failed meshes</text>
    <text x="88" y="424" font-family="monospace" font-size="18" fill="#20344f">60 × 40 × 21 mm</text>
    <text x="88" y="473" font-family="Arial,sans-serif" font-size="15" fill="#53657e">Bounds from emitted Scene meshes</text>
    <text x="604" y="194" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing=".8" fill="#64748b">EXPORTED GLB TRIANGLES · SOFTWARE VIEW</text>`,
  'Local build and mesh checks only; no deployment, simulation, or hardware acceptance.',
);

const resultPng = await sharp(Buffer.from(resultCard))
  .composite([{ input: modelView, left: 672, top: 206 }])
  .png().toBuffer();
await writeFile(posterPath, resultPng);
await sharp(Buffer.from(errorCard)).png().toFile(join(here, 'still-error.png'));
await writeFile(join(here, 'still-result.png'), resultPng);

execFileSync('ffmpeg', [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-loop', '1', '-t', '4', '-i', join(here, 'still-error.png'),
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
  negativeCase: {
    source: 'unfinished-assembly.kcad.ts',
    diagnosticCode: brokenResult.code,
    message: brokenResult.message,
    hint: brokenResult.hint,
  },
  correctedExample: {
    source: 'examples/params/color-enclosure.kcad.ts',
    returnKind: 'Scene',
    partNames,
    emittedMeshPartNames: scenePartNames,
    failedFeatureIds: meshing.failedFeatureIds,
    boundsMm,
    glbBytes: exported.bytes.length,
    glbSha256: sha256(exported.bytes),
    meshNodeNames: meshNodes,
    materialNames: glbMaterials,
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
  negativeDiagnostic: brokenResult.code,
  parts: partNames,
  emittedMeshPartNames: scenePartNames,
  boundsMm,
  triangleCount: triangles.length,
  video: videoProbe.streams[0],
}, null, 2));
