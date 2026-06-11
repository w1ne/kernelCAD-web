#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/scoreMeshVsMesh.ts
//
// CLI wrapper around eval/oracle/scoreMesh.ts. Designed to be called from
// agent-driven loops where the agent has exported a build to STL and wants
// to compare it geometrically against a reference STL.
//
// Usage:
//   npx tsx scripts/scoreMeshVsMesh.ts \
//     --generated examples/gallery/meta-glasses/build.stl \
//     --reference eval/tasks/eyewear-wayfarer-front/reference.stl
//
//   # JSON output
//   ... --json
//
// Exit codes:
//   0 — scoring succeeded
//   2 — input error (missing flag / file)
//   3 — scorer threw

import { resolve } from 'node:path';
import { scoreMesh } from '../eval/oracle/scoreMesh';

interface Args {
  generated: string;
  reference: string;
  json: boolean;
  maxSamples?: number;
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = { json: false };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--generated': args.generated = argv[++i]; break;
      case '--reference': args.reference = argv[++i]; break;
      case '--json': args.json = true; break;
      case '--max-samples': args.maxSamples = parseInt(argv[++i], 10); break;
      case '-h':
      case '--help':
        console.log('usage: scoreMeshVsMesh --generated <stl> --reference <stl> [--json] [--max-samples N]');
        process.exit(0);
    }
  }
  if (!args.generated || !args.reference) {
    console.error('scoreMeshVsMesh: --generated and --reference required');
    process.exit(2);
  }
  return args as Args;
}

const args = parseArgs(process.argv.slice(2));
try {
  const score = scoreMesh(resolve(args.generated), resolve(args.reference), { maxSamples: args.maxSamples });
  if (args.json) {
    console.log(JSON.stringify({
      generated: resolve(args.generated),
      reference: resolve(args.reference),
      ...score,
    }, null, 2));
  } else {
    console.log(`Chamfer distance:    ${score.chamferDistance.toFixed(3)} mm`);
    console.log(`Hausdorff 99p:       ${score.hausdorff99p.toFixed(3)} mm`);
    console.log(`Bbox IoU:            ${score.bboxIoU.toFixed(3)}`);
    console.log(`Reference bbox vol:  ${score.referenceBboxVolume.toFixed(0)} mm^3 (${score.referenceTriangles} tris)`);
    console.log(`Generated bbox vol:  ${score.generatedBboxVolume.toFixed(0)} mm^3 (${score.generatedTriangles} tris)`);
  }
} catch (e) {
  console.error(`scoreMeshVsMesh: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(3);
}
