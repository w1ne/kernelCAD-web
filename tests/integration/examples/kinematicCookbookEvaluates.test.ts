// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Every kinematic skill cookbook script carries its own in-script assertions
// and must run to the end. A script that throws there is a broken pattern in
// the skill an agent copies from. Snippet 8 threw after the interference rule
// began to pass face contact up to 0.01 mm thick: its bisected boundary moved
// from 0 mm to -0.01 mm.
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { evaluateScript } from '../../../src/agent/cli/commands/evaluate';
import { defaultSweepEvaluator } from '../../../src/composition/scriptEvaluation';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { sweepTolerance } from '../../../src/kinematic/sweepTolerance';
import { CONTACT_THICKNESS_MM } from '../../../src/modeling/runtime/jointContactCap';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const COOKBOOK_DIR = join(REPO_ROOT, 'src/agent/skills/kernelcad-kinematic/cookbook');
const cookbooks = readdirSync(COOKBOOK_DIR).filter((name) => name.endsWith('.kcad.ts')).sort();

describe('kinematic skill cookbook scripts run to the end', () => {
  it('discovers the cookbook scripts', () => {
    expect(cookbooks.length).toBeGreaterThanOrEqual(9);
  });

  for (const name of cookbooks) {
    it(`${name} evaluates with no error`, async () => {
      const result = await evaluateScript({ file: join(COOKBOOK_DIR, name) });
      const errors = result.diagnostics
        .filter((d) => d.severity === 'error')
        .map((d) => `${d.code}: ${d.message}`);
      expect(errors, name).toEqual([]);
      expect(result.exitCode, name).toBe(0);
    }, 60_000);
  }
});

describe('sweepTolerance interference boundary', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60_000);

  it('is at the face-contact thickness, not at zero gap', async () => {
    // Same two-box fixture as cookbook snippet 8.
    const code = `
      const arm = assembly('sweep-clearance-boundary');
      const gap = param('GapMm', 10);
      arm.part('a', box(20, 20, 20, true));
      arm.part('b', box(20, 20, 20, true).translate(gap.add(20), 0, 0));
      return arm.solvedModel({});
    `;
    const sweep = await sweepTolerance(
      {
        code,
        params: { GapMm: { values: [10, 0, -5] } },
        gates: { interference: true, mountingHoles: false, jointAxis: false },
      },
      defaultSweepEvaluator,
    );
    expect(sweep.results.find((row) => row.combo['GapMm'] === 0)?.gates['interference']).toBe('pass');
    const boundary = sweep.boundaries.find((b) => b.bindingGates.includes('interference'));
    expect(boundary, JSON.stringify(sweep.boundaries)).toBeDefined();
    expect(boundary!.withinTolerance).toBe(true);
    // The pass side overlaps by no more than the face-contact thickness; the
    // fail side overlaps by more than it.
    expect(-boundary!.passValue).toBeLessThanOrEqual(CONTACT_THICKNESS_MM + 1e-9);
    expect(-boundary!.failValue).toBeGreaterThan(CONTACT_THICKNESS_MM);
    expect(Math.abs(boundary!.value - -CONTACT_THICKNESS_MM)).toBeLessThanOrEqual(sweep.boundaryTolerance);
  }, 60_000);
});
