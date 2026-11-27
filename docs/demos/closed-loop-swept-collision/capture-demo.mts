// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSweptCollisionTool } from '../../../src/agent/mcp/tools/checkSweptCollision.ts';

const bundleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(bundleDir, '../../..');
const sourcePath = resolve(repoRoot, 'src/agent/skills/kernelcad-kinematic/cookbook/09-four-bar-loop-swept.kcad.ts');
const source = await readFile(sourcePath);
const result = await checkSweptCollisionTool({
  file: relative(repoRoot, sourcePath),
  joint: 'crank',
  range: [120, 200, 2],
});

const walk = result.walks?.find((item) => item.joint === 'crank');
const pair = walk?.overlaps.find((item) =>
  [item.partA, item.partB].includes('rocker') && [item.partA, item.partB].includes('stop'));
if (result.ok || walk === undefined || pair === undefined || pair.stretches.length !== 1 || walk.unknown.length !== 0) {
  throw new Error(`Unexpected local swept-collision result: ${JSON.stringify(result)}`);
}

const evidence = {
  evidenceKind: 'local_in_process_engine_replay',
  createdAt: new Date().toISOString(),
  repoHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim(),
  source: {
    path: relative(repoRoot, sourcePath),
    sha256: createHash('sha256').update(source).digest('hex'),
  },
  request: {
    tool: 'check_swept_collision',
    joint: 'crank',
    range: [120, 200, 2],
  },
  result,
  scope: {
    deployedBehaviorVerified: false,
    hardwareAcceptance: false,
  },
};

await writeFile(resolve(bundleDir, 'verification.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({
  file: relative(repoRoot, sourcePath),
  sourceSha256: evidence.source.sha256,
  posesSampled: result.posesSampled,
  refinementSamples: walk.refinementSamples,
  pair: [pair.partA, pair.partB],
  stretch: pair.stretches[0],
  collisionToleranceMm3: walk.collisionToleranceMm3,
  worstVolumeMm3: pair.worstVolumeMm3,
  worstPose: pair.worstPose,
  unknown: walk.unknown.length,
}));
