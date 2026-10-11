// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Verdict corpus — correct models. Each fixture under
// tests/fixtures/verdictCorpus/ok-*.kcad.ts is a realistic, correct part or
// assembly an agent would build (bolted bracket with clearance + tapped
// holes, Pi enclosure with screw bosses, hinges, two-link arm, pan-tilt
// head, coupled gear pair, linear slide, shaft coupler, snap-fit and bonded
// joints, mech40 reference solutions). Every one must pass verify
// ('assembly', 'mounting-holes') and review_cad with no blocking finding:
// a blocking finding here is a verifier false positive, not a model defect.
// Broken variants live in verdictCorpusBroken.test.ts.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { corpusFiles, describeVerdicts, runCorpusModel } from './verdictCorpusHarness';

describe('verdict corpus — correct models pass every verifier', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  const files = corpusFiles('ok-');
  it('has the expected corpus size', () => {
    expect(files.length).toBeGreaterThanOrEqual(15);
  });

  for (const file of files) {
    it(file, async () => {
      const v = await runCorpusModel(file);
      const summary = describeVerdicts(v);
      expect(v.assembly.ok, summary).toBe(true);
      expect(v.mountingHoles.ok, summary).toBe(true);
      expect(v.review.ok, summary).toBe(true);
      // Advisory findings never masquerade as blockers.
      expect(v.review.blocking, summary).toEqual([]);
    }, 600_000);
  }
});
