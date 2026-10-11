// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Verdict corpus — deliberately broken variants
// (tests/fixtures/verdictCorpus/bad-*.kcad.ts). Each must be caught by the
// verifier responsible for that defect class; where both verify and
// review_cad own the class they must agree.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { corpusFiles, describeVerdicts, runCorpusModel, type CorpusVerdicts } from './verdictCorpusHarness';

const blockingCodes = (v: CorpusVerdicts): string[] => (v.assembly.blocking ?? []).map((b) => b.code);

const EXPECTATIONS: Record<string, (v: CorpusVerdicts) => void> = {
  'bad-01-floating-part.kcad.ts': (v) => {
    expect(blockingCodes(v)).toContain('mechanism.orphan-part');
    expect(v.review.blocking).toContain('mechanism.orphan-part');
  },
  'bad-02-interpenetrating.kcad.ts': (v) => {
    expect(blockingCodes(v)).toContain('assembly.interference.overlap');
    expect(v.review.blocking).toContain('assembly.interference.overlap');
  },
  'bad-03-misaligned-holes.kcad.ts': (v) => {
    expect(v.mountingHoles.mismatches?.map((m) => m.reason)).toContain('misaligned');
    expect(blockingCodes(v)).toContain('assembly.mounting-hole.misaligned');
    expect(v.review.blocking).toContain('assembly.mounting-hole.misaligned');
  },
  'bad-04-over-constrained.kcad.ts': (v) => {
    expect(blockingCodes(v)).toContain('assembly.mate.over-constrained');
    expect(v.review.blocking).toContain('assembly.mate.over-constrained');
  },
  'bad-05-hole-diameter-mismatch.kcad.ts': (v) => {
    // Record-level diameter mismatch: owned by verify('mounting-holes'); the
    // review keeps it as an advisory (info) finding.
    expect(v.mountingHoles.mismatches).toEqual([
      expect.objectContaining({ mateName: 'screwed', reason: 'diameter-mismatch' }),
    ]);
    expect(v.review.diagnostics.some((d) => d.code === 'assembly.mounting-hole.mismatch')).toBe(true);
  },
  'bad-06-hinge-axis-in-air.kcad.ts': (v) => {
    expect(blockingCodes(v)).toContain('assembly.mechanical.connector-not-in-solid');
    expect(v.review.blocking).toContain('assembly.mechanical.connector-not-in-solid');
  },
  'bad-07-rated-hinge-sag-masked.kcad.ts': (v) => {
    // Physics-only defect: review_cad's drop test. The free flap's swing must
    // not mask the rated flap's sag.
    const drop = v.review.mechanismFailures.find((d) => d.code === 'mechanism.drops-on-release' && d.severity === 'error');
    expect(drop?.message).toContain("'rated'");
    expect(v.review.ok).toBe(false);
  },
  'bad-08-floating-gears-transmission.kcad.ts': (v) => {
    // A declared transmission claims a mechanism: unmated gears are orphans.
    expect(blockingCodes(v)).toContain('mechanism.orphan-part');
    expect(v.review.blocking).toContain('mechanism.orphan-part');
  },
  'bad-09-offset-hole-pattern.kcad.ts': (v) => {
    // 7.07 mm pattern offset: the hole circles do not overlap, but every
    // bracket hole opens onto the plate's material with no coaxial partner.
    expect(v.mountingHoles.mismatches).toEqual([
      expect.objectContaining({
        mateName: 'bolted',
        reason: 'misaligned',
        sideA: expect.objectContaining({ partName: 'plate', connectorName: 'bolt1' }),
        sideB: expect.objectContaining({ partName: 'bracket', connectorName: 'bolt1' }),
      }),
    ]);
    expect(blockingCodes(v)).toContain('assembly.mounting-hole.misaligned');
    expect(v.review.blocking).toContain('assembly.mounting-hole.misaligned');
  },
  'bad-10-hinge-knuckle-overlap.kcad.ts': (v) => {
    // ~10 mm³ shared by two ~2400 mm³ leaves: under the uniform 20 mm³ cap,
    // over the per-pair cap scaled to the smaller part.
    expect(blockingCodes(v)).toContain('assembly.interference.overlap');
    expect(v.review.blocking).toContain('assembly.interference.overlap');
  },
};

describe('verdict corpus — broken variants are caught', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('every broken fixture has an expectation', () => {
    expect(corpusFiles('bad-')).toEqual(Object.keys(EXPECTATIONS).sort());
  });

  for (const [file, expectCaught] of Object.entries(EXPECTATIONS)) {
    it(file, async () => {
      const v = await runCorpusModel(file);
      try {
        expectCaught(v);
      } catch (e) {
        throw new Error(`${file}: ${describeVerdicts(v)}\n${e instanceof Error ? e.message : String(e)}`);
      }
      // Whatever catches it, no verifier may call the broken model clean.
      expect(v.assembly.ok && v.mountingHoles.ok && v.review.ok, describeVerdicts(v)).toBe(false);
    }, 600_000);
  }
});
