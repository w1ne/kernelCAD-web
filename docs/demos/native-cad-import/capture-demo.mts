// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/native-cad-import/capture-demo.mts

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { getOC } from 'replicad';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer, type OcctBackend } from '../../../src/modeling/backends/occt/occtLowerer';
import type { Shape } from '../../../src/modeling/capture/proxy';
import '../../../src/modeling/runtime/hostFsNode';

const ROOT = resolve(process.cwd());
const HERE = fileURLToPath(new URL('.', import.meta.url));
const SOURCE = 'docs/demos/native-cad-import/nist-ftc-06.kcad.ts';
const INVOCATION = 'node --import tsx docs/demos/native-cad-import/capture-demo.mts';
const NATIVE = 'tests/fixtures/native-cad-import/nist_ftc_06_asme1_rd_sw1802.SLDPRT';
const REFERENCE = 'tests/fixtures/native-cad-import/nist_ftc_06_asme1_ap242-e2.stp';
const IMPLEMENTATION_FILES = [
  'src/modeling/parts/fromNativeCAD.ts',
  'src/modeling/parts/hostParts.ts',
  'src/agent/cli/commands/importStep.ts',
  'src/agent/mcp/tools/importStep.ts',
  'src/kernel/import/stepBundleWriter.ts',
];
const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const round = (value: number, digits = 6) => Number(value.toFixed(digits)) + 0;

function validBrep(backend: OcctBackend): boolean {
  const oc = getOC() as any;
  const analyzer = new oc.BRepCheck_Analyzer(backend.getReplicadShape().wrapped, false, false);
  try {
    return Boolean(analyzer.IsValid_2());
  } finally {
    analyzer.delete?.();
  }
}

async function lowered(session: CaptureSession, shape: Shape): Promise<OcctBackend> {
  const result = await new RecomputeEngine(createOcctLowerer(session)).run(
    session.getRecords(), { paramTable: session.paramTable },
  );
  assert.deepEqual(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'), []);
  const backend = result.shapes.get(shape.id);
  assert.ok(backend, `no lowered B-rep for ${shape.id}`);
  return backend as OcctBackend;
}

function body(backend: OcctBackend) {
  return {
    solidCount: backend.solidComponents().length,
    validBrep: validBrep(backend),
    volumeMm3: round(backend.volume(), 6),
    boundsMm: {
      min: backend.boundingBox().min.map((v) => round(v, 6)),
      max: backend.boundingBox().max.map((v) => round(v, 6)),
    },
  };
}

await initOcct();
const source = await readFile(join(ROOT, SOURCE), 'utf8');
const nativeBytes = await readFile(join(ROOT, NATIVE));
const referenceBytes = await readFile(join(ROOT, REFERENCE));
assert.ok(source.includes('lib.fromNativeCAD'), 'demo source calls the native import API');
const nativeSession = new CaptureSession();
const nativeApi = createModelingApi({ session: nativeSession, scriptDir: HERE });
const nativeShape = await nativeApi.lib.fromNativeCAD(`../../../${NATIVE}`);
const nativeBackend = await lowered(nativeSession, nativeShape);
const nativeBody = body(nativeBackend);
const mesh = nativeBackend.getMesh();
await writeFile(join(HERE, 'geometry.json'), `${JSON.stringify({
  positions: Array.from(mesh.positions, (v) => round(v, 5)),
  indices: Array.from(mesh.indices),
})}\n`);
const referenceSession = new CaptureSession();
const referenceApi = createModelingApi({ session: referenceSession, scriptDir: HERE });
const referenceShape = await referenceApi.lib.fromSTEP(`../../../${REFERENCE}`);
const referenceBody = body(await lowered(referenceSession, referenceShape));
assert.equal(nativeBody.validBrep, true, 'translated native B-rep is valid');
assert.equal(referenceBody.validBrep, true, 'NIST STEP twin B-rep is valid');
assert.equal(nativeBody.solidCount, 1);
assert.equal(referenceBody.solidCount, 1);
assert.ok(Math.abs(nativeBody.volumeMm3 - referenceBody.volumeMm3) < 20, 'volume comparison');
const boundDifferences = nativeBody.boundsMm.min.map((v, axis) => Math.abs(v - referenceBody.boundsMm.min[axis]))
  .concat(nativeBody.boundsMm.max.map((v, axis) => Math.abs(v - referenceBody.boundsMm.max[axis])));
const maxBoundsDifferenceMm = Math.max(...boundDifferences);
assert.ok(maxBoundsDifferenceMm < 0.01, 'bounding-box comparison');

// Exercise the public CLI command itself. Its output stays in an ignored
// workspace temp folder and is deleted after the manifest and result are read.
const scratch = await mkdtemp(join(ROOT, '.tmp/native-cad-import-demo-'));
let cliResult: Record<string, any>;
try {
  const cli = spawnSync(process.execPath, [
    '--import', 'tsx', 'src/agent/cli/index.ts', 'import-step', NATIVE,
    '--out', join(scratch, 'native-part'), '--json',
  ], { cwd: ROOT, encoding: 'utf8', env: process.env, maxBuffer: 8 * 1024 * 1024 });
  if (cli.error) throw cli.error;
  assert.equal(cli.status, 0, `kernelcad import-step failed: ${cli.stderr}`);
  const payloadStart = cli.stdout.search(/\{\s*"ok"\s*:/s);
  assert.notEqual(payloadStart, -1, `CLI did not return JSON: ${cli.stdout}`);
  cliResult = JSON.parse(cli.stdout.slice(payloadStart)) as Record<string, any>;
  assert.equal(cliResult.ok, true, cli.stderr);
  const manifest = JSON.parse(await readFile(cliResult.bundle.manifest, 'utf8')) as Record<string, any>;
  assert.equal(manifest.input.format, 'sldprt');
  assert.match(manifest.input.conversionEngine, /^cadmpeg 0\.6\./);
  assert.equal(manifest.input.sha256, sha256(nativeBytes));
  assert.equal(manifest.definitions.length, 1);
  assert.equal(manifest.definitions[0].validation.valid, true);
  assert.match(cliResult.warnings.join(' '), /feature history, PMI, and assembly relations are not preserved/);
  const evidence = {
    scope: 'Local kernelCAD Node API, CLI import-step, and OCCT B-rep validation. It does not establish deployed behavior or hardware acceptance.',
    invocation: INVOCATION,
    source: SOURCE,
    sourceSha256: sha256(source),
    implementationSha256: Object.fromEntries(await Promise.all(IMPLEMENTATION_FILES.map(async (file) => [
      file, sha256(await readFile(join(ROOT, file))),
    ]))),
    fixture: {
      nativeFile: NATIVE,
      nativeSha256: sha256(nativeBytes),
      referenceStep: REFERENCE,
      referenceStepSha256: sha256(referenceBytes),
    },
    cli: {
      command: `kernelcad import-step ${NATIVE} --out ./native-part --json`,
      outputFormat: manifest.input.format,
      conversionEngine: manifest.input.conversionEngine,
      inputSha256: manifest.input.sha256,
      partAssets: cliResult.bundle.partAssets,
      definitionCount: manifest.definitions.length,
      occurrenceCount: manifest.occurrences.length,
      script: basename(cliResult.bundle.script),
      manifest: basename(cliResult.bundle.manifest),
      conversionWarnings: cliResult.warnings,
    },
    nativeBody,
    referenceBody,
    comparison: {
      volumeDifferenceMm3: round(Math.abs(nativeBody.volumeMm3 - referenceBody.volumeMm3), 6),
      maxBoundsDifferenceMm: round(maxBoundsDifferenceMm, 8),
      volumeToleranceMm3: 20,
      boundsToleranceMm: 0.01,
    },
    limitations: [
      'One NIST FTC-06 SolidWorks 2018 part was measured; this does not qualify every .sldprt version or feature type.',
      'The STEP handoff carries geometry, not the original feature history, PMI, assembly relations or mates.',
      'The video paints the validated OCCT tessellation in a deterministic software projection; the Studio viewport capture could not attach to the existing CDP sessions.',
      'No simulation, deployment or physical hardware test was performed.',
    ],
    simulationRun: false,
    deployed: false,
    hardwareAccepted: false,
  };
  await writeFile(join(HERE, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ cli: evidence.cli, nativeBody, referenceBody, comparison: evidence.comparison }, null, 2));
} finally {
  await rm(scratch, { recursive: true, force: true });
}
