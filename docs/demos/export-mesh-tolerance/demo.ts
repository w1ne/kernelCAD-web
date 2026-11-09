// SPDX-License-Identifier: MIT
// Run the actual public export_model implementation on a small native part.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportModelTool } from '../../../src/agent/mcp/tools/exportModel';

const outDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(outDir, '../../..');
const invocation = 'node --import tsx docs/demos/export-mesh-tolerance/demo.ts';
const scope = 'Local export_model replay; no deployment, slicer or hardware acceptance';
const toleranceMm = 0.01;
const sourcePath = resolve(outDir, 'part.kcad.ts');
const source = readFileSync(sourcePath, 'utf8');
const outputPath = resolve(outDir, 'tolerance-plate.stl');
const result = await exportModelTool({
  code: source,
  output_path: outputPath,
  format: 'stl',
  options: { format: 'stl', tolerance: toleranceMm },
});
assert.equal(result.ok, true, result.error ?? JSON.stringify(result.diagnostics));
assert(result.mesh_deviation, 'export_model should return measured mesh deviation');
assert.equal(result.mesh_deviation.requested_mm, toleranceMm);
assert.equal(result.mesh_deviation.global_max_certified, false);

const stl = readFileSync(outputPath);
assert(stl.length >= 84);
const header = stl.subarray(0, 80).toString('ascii');
const triangleCount = stl.readUInt32LE(80);
assert.equal(stl.length, 84 + triangleCount * 50);
assert.equal(triangleCount, result.mesh_deviation.triangles);
assert(header.includes('requested-mesh-tolerance=0.01mm'));

const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const evidence = {
  scope,
  invocation,
  settings: { format: 'stl', requestedToleranceMm: toleranceMm },
  generatedAt: new Date().toISOString(),
  nodeVersion: process.version,
  sourceFile: 'part.kcad.ts',
  sourceSha256: sha256(source),
  exporterSha256: sha256(readFileSync(resolve(root, 'src/agent/mcp/tools/exportModel.ts'))),
  outputFile: 'tolerance-plate.stl',
  outputSha256: sha256(stl),
  outputBytes: stl.length,
  triangleCount,
  meshDeviation: result.mesh_deviation,
  checks: {
    exportModelSucceeded: true,
    requestedToleranceReturned: result.mesh_deviation.requested_mm === toleranceMm,
    fileTriangleCountMatchesReport: triangleCount === result.mesh_deviation.triangles,
    requestedToleranceStampedInStlHeader: header.includes('requested-mesh-tolerance=0.01mm'),
    globalMaximumCertified: false,
  },
  deployed: false,
  slicerAccepted: false,
  hardwareAccepted: false,
};
const transcript = [
  `$ ${invocation}`,
  scope,
  'PART   native kernelCAD plate, 30 x 20 x 4 mm, two 6 mm through-holes',
  'CALL   export_model(format=stl, options.tolerance=0.01 mm)',
  `WRITE  tolerance-plate.stl (${stl.length} bytes; ${triangleCount} triangles)`,
  'CHECK  STL header contains requested-mesh-tolerance=0.01mm',
  `REPORT requested=${result.mesh_deviation.requested_mm.toFixed(3)} mm`,
  `REPORT measured sample max=${result.mesh_deviation.measured_max_mm.toFixed(6)} mm`,
  `REPORT measured sample p95=${result.mesh_deviation.measured_p95_mm.toFixed(6)} mm`,
  `REPORT ${result.mesh_deviation.samples} deterministic samples; ${result.mesh_deviation.triangles} output triangles`,
  'LIMIT  one-sided sampled B-rep-to-export-triangle distance',
  'LIMIT  global_max_certified=false; not dimensional or print-fit acceptance',
  'RESULT local export workflow completed; report and STL retained',
];
writeFileSync(resolve(outDir, 'verification.json'), JSON.stringify(evidence, null, 2) + '\n');
writeFileSync(resolve(outDir, 'transcript.txt'), transcript.join('\n') + '\n');
console.log(transcript.join('\n'));
