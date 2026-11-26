// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';

const source = 'examples/parts/standard-elements-wave1.kcad.ts';
const sourceSha256 = createHash('sha256').update(await readFile(source)).digest('hex');
const evaluation = await evaluateScriptTool({ file: source });
if (!evaluation.ok) throw new Error(`evaluate_script failed: ${JSON.stringify(evaluation.diagnostics)}`);

const review = await reviewCadTool({ file: source, includeInterference: true,
  includePoseEnvelope: true, trackConnectors: ['carriage.top-mount'] });
if (!review.ok) throw new Error(`review_cad failed: ${JSON.stringify(review.diagnostics)}`);
const reviewErrors = review.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
if (reviewErrors.length > 0) throw new Error(`review_cad has errors: ${JSON.stringify(reviewErrors)}`);
const interferencePairs = review.poseEnvelope?.interferencePairs ?? [];
if (interferencePairs.length > 0) throw new Error(`review_cad found clashes: ${JSON.stringify(interferencePairs)}`);
const poses = review.poseEnvelope?.connectorPoses.filter((pose) => pose.ref === 'carriage.top-mount') ?? [];
const start = poses.find((pose) => pose.sampleName === 'slide:min')?.world;
const end = poses.find((pose) => pose.sampleName === 'slide:max')?.world;
const carriageTravelMm = start && end ? Math.abs(end[0] - start[0]) : null;
if (carriageTravelMm === null || Math.abs(carriageTravelMm - 80) > 1e-5) {
  throw new Error(`expected an 80 mm carriage sweep, got ${carriageTravelMm}`);
}

const evidence = {
  checkedAt: new Date().toISOString(),
  source,
  sourceSha256,
  evaluation: {
    ok: evaluation.ok,
    parts: evaluation.parts,
    diagnostics: evaluation.diagnostics,
    mechanism: evaluation.mechanism,
    mechanismSummary: evaluation.mechanismSummary,
  },
  review: {
    ok: review.ok,
    diagnostics: review.diagnostics,
    diagnosticCounts: {
      errors: reviewErrors.length,
      info: review.diagnostics.filter((diagnostic) => diagnostic.severity === 'info').length,
    },
    mechanismSummary: review.mechanismSummary,
    poseEnvelope: {
      diagnostics: review.poseEnvelope?.diagnostics ?? [],
      interferencePairs,
      samples: review.poseEnvelope?.samples.map(({ name }) => name) ?? [],
      carriageTravelMm,
    },
  },
  scope: 'Local KernelCAD evaluation and review of the committed example. This is not a deployed-platform capture, hardware test, or manufacturing acceptance.',
};

await writeFile('docs/demos/standard-elements-wave1/verification.json', `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, parts: evaluation.parts, diagnostics: evaluation.diagnostics.length,
  interferencePairs: evidence.review.poseEnvelope.interferencePairs.length,
  carriageTravelMm: evidence.review.poseEnvelope.carriageTravelMm }));
