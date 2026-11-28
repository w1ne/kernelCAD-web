// SPDX-License-Identifier: MIT
// Run the 644k-triangle export regression through kernelCAD's OCCT mesh path.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compoundShapes } from 'replicad';
import type { Shape3D } from 'replicad';
import { OcctBackend, initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { encodeBinaryStlBytes } from '../../../src/kernel/backends/occt/exportStlBinary';
import { verifyWatertight } from '../../../src/kernel/backends/occt/meshHeal';
import { meshShapeForExport } from '../../../src/kernel/backends/occt/backendMesh';

const outDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(outDir, '../../..');
const invocation = 'node --import tsx docs/demos/stl-cleanup-memory-20261128/demo.ts';
const outputPath = resolve(outDir, 'export-output.stl');
const sourceTestPath = resolve(outDir, '../../../tests/integration/export/stlExportPeakMemory1585.test.ts');
const sourceTest = readFileSync(sourceTestPath);
const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');

const testCommand = 'KCAD_STL_MEMORY_EVIDENCE=1 vitest run tests/integration/export/stlExportPeakMemory1585.test.ts -t "600k-triangle part" --reporter=verbose --pool=forks --maxWorkers=1';
const testOutput = execFileSync(process.execPath, [
  resolve(root, 'node_modules/vitest/vitest.mjs'),
  'run', sourceTestPath, '-t', '600k-triangle part', '--reporter=verbose', '--pool=forks', '--maxWorkers=1',
], {
  cwd: root,
  env: { ...process.env, KCAD_STL_MEMORY_EVIDENCE: '1' },
  encoding: 'utf8',
});
const measured = testOutput.match(/STL_MEMORY_EVIDENCE baseline=[\d.]+ MB peak=[\d.]+ MB delta=([\d.]+) MB triangles=(\d+)/);
assert(measured, `the memory test did not emit its result:\n${testOutput}`);
const testPeakRssMb = Number(measured[1]);
const testTriangleCount = Number(measured[2]);
assert(testPeakRssMb < 300, `memory test grew ${testPeakRssMb} MB`);
writeFileSync(resolve(outDir, 'test-transcript.txt'), `${testOutput.trimEnd()}\n`);

await initOcct();
const spheres = Array.from({ length: 20 }, (_, i) =>
  OcctBackend.sphere(10)
    .translate((i % 5) * 25, Math.floor(i / 5) * 25, 0)
    .getReplicadShape());
const compound = compoundShapes(spheres) as unknown as Shape3D;
const mesh = meshShapeForExport(compound);
const report = verifyWatertight(mesh);
const stl = encodeBinaryStlBytes(mesh);
const triangleCount = mesh.triangles.length / 3;

assert.equal(triangleCount, 644_040);
assert.equal(testTriangleCount, triangleCount);
assert.equal(report.ok, true, JSON.stringify(report));
assert.equal(stl.byteLength, 84 + triangleCount * 50);
assert.equal(new DataView(stl.buffer, stl.byteOffset, stl.byteLength).getUint32(80, true), triangleCount);
writeFileSync(outputPath, stl);

const evidence = {
  scope: 'Local engine replay; no deployed, slicer, or hardware acceptance',
  invocation,
  settings: { shape: '20 sphere compound', radiusMm: 10, gridSpacingMm: 25 },
  nodeVersion: process.version,
  fixtureSource: 'tests/integration/export/stlExportPeakMemory1585.test.ts',
  fixtureSourceSha256: sha256(sourceTest),
  baseline: {
    base: 'origin/develop at 8412efb1ceb9bf752cefaaf84baa63336a78b571',
    incrementalPeakRssMb: 318.64,
    result: 'failed the 300 MB regression budget',
  },
  current: {
    memoryTestCommand: testCommand,
    incrementalPeakRssMb: testPeakRssMb,
    triangleCount,
    outputBytes: stl.byteLength,
    outputSha256: sha256(stl),
    watertight: report.ok,
    openEdges: report.openEdgeCount,
    nonManifoldEdges: report.nonManifoldEdgeCount,
  },
  checks: {
    expectedTriangleCount: triangleCount === 644_040,
    outputByteCountMatchesBinaryStlHeader: stl.byteLength === 84 + triangleCount * 50,
    watertight: report.ok,
    below300MbBudget: testPeakRssMb < 300,
  },
  deployed: false,
  slicerAccepted: false,
  hardwareAccepted: false,
};
assert(Object.values(evidence.checks).every(Boolean), JSON.stringify(evidence.checks));

const transcript = [
  `$ ${invocation}`,
  evidence.scope,
  'FIXTURE 20 spheres, radius 10 mm, arranged on a 25 mm grid',
  'PATH    meshShapeForExport -> weld -> cleanup -> binary STL',
  `WRITE   export-output.stl (${stl.byteLength.toLocaleString()} bytes; ${triangleCount.toLocaleString()} triangles)`,
  `CHECK   watertight=${report.ok}; openEdges=${report.openEdgeCount}; nonManifoldEdges=${report.nonManifoldEdgeCount}`,
  `MEASURE integration test peak RSS=${testPeakRssMb.toFixed(2)} MB (limit 300 MB)`,
  'BASE    origin/develop replay: 318.64 MB; failed the regression budget',
  'RESULT  local engine replay passed; verification.json retains output hash and checks',
  'LIMIT   not a deployed export, slicer acceptance, or hardware acceptance',
];
writeFileSync(resolve(outDir, 'verification.json'), JSON.stringify(evidence, null, 2) + '\n');
writeFileSync(resolve(outDir, 'transcript.txt'), transcript.join('\n') + '\n');
console.log(transcript.join('\n'));
