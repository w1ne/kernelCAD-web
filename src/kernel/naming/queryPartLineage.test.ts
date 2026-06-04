// Q1.5 — Part-level lineage parity with FaceLineage / EdgeLineage.
//
// Unit-level verification that PartLineage exposes featureId / featureName /
// featureKind slots on every `.part(name, shape, opts?)` capture-site,
// and that the per-assembly partLineage map is exposed read-only via
// the internal `__partLineage()` accessor (mirrors the `__parts()` / `__mates()`
// underscore convention).
//
// Reality-vs-plan note: the plan's queryPartLineage.test.ts assumes an
// `evaluateScript` test helper and a `session.parts` / `assemblyByName(...)`
// accessor on the capture session. Neither exists in develop. Q1.5 therefore
// lands the type surface + capture-site population through the existing
// `createApi({ session })` test pattern (mirrors the Q1 unit test style and
// `assembly.partNameUniqueness.test.ts`).
//
// PartLineage carries no propagation helper (unlike EdgeLineage) because parts
// are first-class capture records — every `.part(name, shape, opts?)` mints a
// fresh `assemblyPart` FeatureRecord via `session.assemblyPart(...)`. The
// FeatureRecord's id IS the lineage's `featureId`. No cross-lowerer wiring is
// required (this is the key scope difference vs Q1's edge-history machinery).

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../modeling/capture/captureSession';
import { createApi } from '../../modeling/api';
import type { PartLineage, PartLineageMap } from './evolutionRecord';
import type { Assembly } from '../../modeling/capture/assembly';

describe('PartLineage type slots — Q1.5', () => {
  it('accepts featureId / featureName / featureKind on construction', () => {
    const lineage: PartLineage = {
      featureId: 'assemblyPart_1',
      featureName: 'arm',
      featureKind: 'assemblyPart',
    };
    expect(lineage.featureId).toBe('assemblyPart_1');
    expect(lineage.featureName).toBe('arm');
    expect(lineage.featureKind).toBe('assemblyPart');
  });
});

describe('PartLineage capture-site population — Q1.5', () => {
  it('every captured part on an assembly carries PartLineage.featureId', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm') as Assembly;
    arm.part('base', kcad.box(20, 20, 10));
    arm.part('lid', kcad.box(20, 20, 2).translate(0, 0, 10));

    const lineageMap: PartLineageMap = arm.__partLineage();
    expect(lineageMap.size).toBe(2);
    for (const [, lineage] of lineageMap) {
      expect(lineage.featureId).toBeDefined();
      expect(typeof lineage.featureId).toBe('string');
      expect(lineage.featureId.length).toBeGreaterThan(0);
      expect(lineage.featureName).toBeDefined();
      expect(lineage.featureKind).toBe('assemblyPart');
    }
  });

  it('part featureName matches the user-supplied name to .part(...)', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm') as Assembly;
    arm.part('servo', kcad.box(10, 10, 10));

    const lineageMap = arm.__partLineage();
    const servo = lineageMap.get('servo');
    expect(servo).toBeDefined();
    expect(servo!.featureName).toBe('servo');
    expect(servo!.featureId).toMatch(/^assemblyPart_/);
  });

  it('two .part calls in two different assemblies get distinct featureIds', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const a = kcad.assembly('a') as Assembly;
    const b = kcad.assembly('b') as Assembly;
    a.part('base', kcad.box(5, 5, 5));
    b.part('base', kcad.box(5, 5, 5));

    const aLineage = a.__partLineage().get('base');
    const bLineage = b.__partLineage().get('base');
    expect(aLineage).toBeDefined();
    expect(bLineage).toBeDefined();
    // Both parts have the same user-supplied featureName but distinct
    // session-stamped featureIds — this is what makes `kc.q.part(
    // kc.q.createdBy('<featureId>'))` resolve to ONE part across the
    // multi-assembly session.
    expect(aLineage!.featureName).toBe('base');
    expect(bLineage!.featureName).toBe('base');
    expect(aLineage!.featureId).not.toBe(bLineage!.featureId);
  });

  it('partLineage map keys by user-supplied part name', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm') as Assembly;
    arm.part('base', kcad.box(20, 20, 10));
    arm.part('lid', kcad.box(20, 20, 2));

    const lineageMap = arm.__partLineage();
    expect(lineageMap.has('base')).toBe(true);
    expect(lineageMap.has('lid')).toBe(true);
    expect(lineageMap.has('missing')).toBe(false);
  });

  it('partLineage featureId matches the AssemblyPartRef.id minted by session.assemblyPart', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm') as Assembly;
    const partRef = arm.part('base', kcad.box(20, 20, 10));

    const lineage = arm.__partLineage().get('base');
    expect(lineage).toBeDefined();
    // featureId on the lineage is the same id the capture-session minted
    // for the assemblyPart FeatureRecord — anchors the lineage to the
    // existing FeatureRecord graph rather than introducing a parallel id.
    expect(lineage!.featureId).toBe(partRef.id);
  });
});
