// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import type { CheckGeometryQualityOutput } from '../../../src/agent/mcp/tools/checkGeometryQuality';

const dir = fileURLToPath(new URL('./', import.meta.url));
const requests = [
  { check: 'geometry-quality', file: 'docs/demos/geometry-quality/tiny-step.kcad.ts' },
  { check: 'geometry-quality', file: 'docs/demos/geometry-quality/symmetric-bracket.kcad.ts', asserted_plane: { origin: [0,0,0], normal: [1,0,0] } },
  { check: 'geometry-quality', file: 'docs/demos/geometry-quality/asymmetric-bracket.kcad.ts', asserted_plane: { origin: [0,0,0], normal: [1,0,0] } },
];
const records = [];
for (const input of requests) {
  const source = readFileSync(input.file, 'utf8');
  const result = await callMcpTool('verify', input) as CheckGeometryQualityOutput;
  assert(!('error' in result), 'error' in result ? result.error : '');
  records.push({ input, source, sourceSha256: createHash('sha256').update(source).digest('hex'), result });
}
const [tiny, symmetric, asymmetric] = records.map(r => r.result);
assert(tiny.tinyFaces.length > 0 && tiny.shortEdges.length > 0 && !tiny.ok);
const passing = symmetric.symmetry.planes.find(p => p.name === 'asserted')!;
const failing = asymmetric.symmetry.planes.find(p => p.name === 'asserted')!;
assert(symmetric.ok && passing.passed && !asymmetric.ok && !failing.passed);
const fmt = (n: number) => n.toPrecision(5);
const loc = (p: number[]) => p.map(fmt).join(', ');
const tinyFace = tiny.tinyFaces.reduce((a,b) => a.areaMm2 < b.areaMm2 ? a : b);
const shortEdge = tiny.shortEdges.reduce((a,b) => a.lengthMm < b.lengthMm ? a : b);
const cards = [
  { title: 'Find tiny faces and short edges', lines: [
    'MCP verify  check: "geometry-quality"',
    'file: docs/demos/geometry-quality/tiny-step.kcad.ts',
    '', 'Synthetic part: 20 x 10 x 5 mm body + 0.01 mm step',
    'Defaults: face area < 0.01 mm2; edge length < 0.1 mm',
    '', `Actual result: ok=${tiny.ok}  faces=${tiny.counts.faces}  edges=${tiny.counts.edges}`,
    `Tiny faces: ${tiny.tinyFaces.length}   Short edges: ${tiny.shortEdges.length}`,
    `Face ${tinyFace.id}: ${fmt(tinyFace.areaMm2)} mm2  at (${loc(tinyFace.location)})`,
    `Edge ${shortEdge.id}: ${fmt(shortEdge.lengthMm)} mm  at (${loc(shortEdge.location)})`,
    'Ids are scoped to this feature rebuild; units are millimetres.',
  ] },
  { title: 'Discover and assert mirror symmetry', lines: [
    'MCP verify  check: "geometry-quality"',
    'file: docs/demos/geometry-quality/symmetric-bracket.kcad.ts',
    'asserted_plane: { origin: [0,0,0], normal: [1,0,0] }',
    '', 'Candidates: centroid XY / YZ / XZ + 3 inertia-axis planes',
    `Matches: ${symmetric.symmetry.matchingPlanes.join(', ')}`,
    '', `Actual result: ok=${symmetric.ok}  asserted plane passed=${passing.passed}`,
    `Max sampled deviation: ${fmt(passing.maxDeviationMm)} mm`,
    `Tolerance: ${symmetric.symmetry.toleranceMm} mm   Samples: ${passing.sampleCount}`,
    `Mesh: ${symmetric.symmetry.triangleCount} triangles; deflection ${symmetric.symmetry.meshDeflectionMm} mm`,
    'Every triangle contributes vertices, edge midpoints and centroid.',
  ] },
  { title: 'An asymmetric notch fails the asserted plane', lines: [
    'MCP verify  check: "geometry-quality"',
    'file: docs/demos/geometry-quality/asymmetric-bracket.kcad.ts',
    'asserted_plane: { origin: [0,0,0], normal: [1,0,0] }',
    '', `Actual result: ok=${asymmetric.ok}  asserted plane passed=${failing.passed}`,
    `Max sampled deviation: ${fmt(failing.maxDeviationMm)} mm > ${asymmetric.symmetry.toleranceMm} mm`,
    `Worst source:    (${loc(failing.worst.source)})`,
    `Reflected point: (${loc(failing.worst.reflected)})`,
    `Closest mesh:    (${loc(failing.worst.closest)})`,
    '', 'Candidate-plane discovery alone does not require symmetry.',
    'A declared asserted plane makes mirror symmetry part of the gate.',
  ] },
  { title: 'Local evidence and reproducible handoff', lines: [
    '$ npx tsx docs/demos/geometry-quality/run.ts',
    '$ swift docs/demos/geometry-quality/render.swift',
    '', 'results.json: actual verify requests, sources, hashes, full outputs',
    'cards.json: readable excerpts generated from those outputs',
    'demo.mp4: replay of these locally validated requests/results',
    '', 'BREP area/length measurements use existing kernel APIs.',
    'Symmetry uses sampled tessellation + BVH closest-point distance.',
    'Between-sample defects and curved tessellation remain limitations.',
    'Branch validation only: no deployment or hardware acceptance.',
    'Guide: docs/guide/geometry-quality.md',
  ] },
];
writeFileSync(`${dir}results.json`, JSON.stringify({ provenance: 'actual local MCP dispatch; video is recorded-result replay', generatedAt: new Date().toISOString(), baseHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), records }, null, 2)+'\n');
writeFileSync(`${dir}cards.json`, JSON.stringify(cards, null, 2)+'\n');
console.log(`Verified ${records.length} actual requests: step fails, symmetric bracket passes, asymmetric bracket fails. Wrote results.json and cards.json.`);
