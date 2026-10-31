// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/standardPartRangeProof.ts
//
// S3 range proof for the standard-part catalog. Every declaration in
// STANDARD_PART_RANGES runs through the same `sweepTolerance` path an agent
// uses, with the mechanism gates off and the discrete thread/length domains as
// the swept parameters. The output is explicit about coverage: N points per
// case and the number of bisected boundaries (zero for a discrete domain).
//
// Run: npm run test:standard-part-ranges
//      npx tsx scripts/standardPartRangeProof.ts --json

import { initOcct } from '../src/kernel/backends/occt/occtBackend';
import { sweepTolerance } from '../src/kinematic/sweepTolerance';
import { defaultSweepEvaluator } from '../src/composition/scriptEvaluation';
import {
  STANDARD_PART_RANGES,
  STANDARD_PART_RANGE_REMAINING,
} from '../src/modeling/parts/standardPartRanges';

interface CaseEvidence {
  readonly member: string;
  readonly family: string;
  readonly parameter: string;
  readonly points: number;
  readonly boundaries: number;
  readonly requirements: string[];
  readonly ok: boolean;
  readonly detail: string;
}

const NO_GATES = { interference: false, mountingHoles: false, jointAxis: false } as const;

async function main(): Promise<void> {
  const json = process.argv.includes('--json');
  await initOcct();

  const evidence: CaseEvidence[] = [];
  let totalPoints = 0;
  let totalBoundaries = 0;
  let failed = 0;

  for (const declaration of STANDARD_PART_RANGES) {
    let declaredPoints = 0;
    for (const rangeCase of declaration.cases) {
      const result = await sweepTolerance({
        code: rangeCase.script,
        params: rangeCase.params,
        gates: NO_GATES,
        boundaryBudget: 0,
      }, defaultSweepEvaluator);

      const requirementNames = [...new Set(
        result.results.flatMap((row) => row.requirements.map((entry) => entry.name)),
      )];
      const points = result.combosEvaluated;
      declaredPoints += points;
      totalPoints += points;
      totalBoundaries += result.boundaries.length;

      const expected = rangeCase.expectedPoints;
      const problems: string[] = [];
      if (points !== expected) problems.push(`expected ${expected} points, got ${points}`);
      if (!result.ok) {
        const failing = result.results.filter((row) => row.verdict !== 'pass');
        for (const row of failing) {
          const reqs = row.requirements
            .filter((entry) => entry.status !== 'pass')
            .map((entry) => `${entry.name}=${entry.status} (measured ${JSON.stringify(entry.measured)}, limit ${JSON.stringify(entry.limit)})`);
          const diags = row.diagnostics.map((d) => `${d.code}: ${d.message}`);
          problems.push(`combo ${JSON.stringify(row.combo)} failed${reqs.length > 0 ? `: ${reqs.join(', ')}` : ''}${diags.length > 0 ? ` — ${diags.join('; ')}` : ''}`);
        }
        if (problems.length === 0) problems.push('sweep reported ok=false without a failing row');
      }

      if (problems.length > 0) {
        failed += 1;
        evidence.push({
          member: declaration.member,
          family: declaration.family,
          parameter: rangeCase.parameter,
          points,
          boundaries: result.boundaries.length,
          requirements: requirementNames,
          ok: false,
          detail: problems.join(' | '),
        });
        if (!json) {
          console.error(`✗ ${declaration.member} ${rangeCase.parameter}: ${points} points, ${result.boundaries.length} boundaries`);
          for (const problem of problems) console.error(`    ${problem}`);
        }
      } else {
        evidence.push({
          member: declaration.member,
          family: declaration.family,
          parameter: rangeCase.parameter,
          points,
          boundaries: result.boundaries.length,
          requirements: requirementNames,
          ok: true,
          detail: `checked ${points} points, 0 boundaries (discrete domain)`,
        });
        if (!json) {
          console.log(`✓ ${declaration.member} ${rangeCase.parameter}: ${points} points, 0 boundaries`);
        }
      }
    }

    const declared = Number(declaration.catalogAttributes.verifiedPoints ?? '0');
    if (declared !== declaredPoints) {
      failed += 1;
      const detail = `catalog verifiedPoints=${declared} does not match the ${declaredPoints} points actually run`;
      evidence.push({
        member: declaration.member,
        family: declaration.family,
        parameter: 'catalog',
        points: declaredPoints,
        boundaries: 0,
        requirements: declaration.requirements.map((r) => r.name),
        ok: false,
        detail,
      });
      if (!json) console.error(`✗ ${declaration.member} catalog metadata: ${detail}`);
    }
  }

  const summary = {
    ok: failed === 0,
    families: STANDARD_PART_RANGES.length,
    points: totalPoints,
    boundaries: totalBoundaries,
    remaining: STANDARD_PART_RANGE_REMAINING,
    evidence,
    statement:
      `Checked ${totalPoints} sampled points across ${STANDARD_PART_RANGES.length} standard-part families plus ${totalBoundaries} bisected boundaries; ` +
      'discrete domains are not bisected. Sampled, not proven.',
  };

  if (json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(
      `\n${failed === 0 ? '✓' : '✗'} ${summary.families} families, ${summary.points} points, ` +
      `${summary.boundaries} boundaries.`,
    );
    console.log(`  ${summary.statement}`);
    console.log(`  Not yet covered (${summary.remaining.length}): ${summary.remaining.join(', ')}`);
  }

  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('standard-part range proof failed:', error);
  process.exitCode = 1;
});
