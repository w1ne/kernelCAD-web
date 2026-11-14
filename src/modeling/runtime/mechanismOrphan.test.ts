// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/mechanismOrphan.test.ts
//
// `mechanism.orphan-part` is a graph walk with no BREP, so these cases call
// `checkOrphanParts` directly and run in the default (fast) suite. The
// end-to-end verdict cases live in `mechanismTruth.test.ts` (KCAD_SLOW).

import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createModelingApi } from '../api';
import type { Assembly } from '../capture/assembly';
import { checkOrphanParts } from './mechanismOrphan';

function makeArm(name = 'rig'): { arm: Assembly; kcad: ReturnType<typeof createModelingApi> } {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  return { arm: kcad.assembly(name), kcad };
}

/** Add a fastened base + plate pair; the caller decides what surrounds it. */
function addMatedStack(arm: Assembly, kcad: ReturnType<typeof createModelingApi>): void {
  const base = arm.part('base', kcad.box(60, 40, 10));
  const plate = arm.part('plate', kcad.box(60, 40, 5).translate(0, 0, 10));
  base.connector('top', { type: 'frame', origin: { kind: 'vec3', value: [30, 20, 10] } });
  plate.connector('bottom', { type: 'frame', origin: { kind: 'vec3', value: [30, 20, 10] } });
  arm.mate('stack', 'base.top', 'plate.bottom', 'fastened');
}

function orphanNames(arm: Assembly): Array<string | undefined> {
  return checkOrphanParts(arm).map((d) => /part '([^']+)' is not linked/.exec(d.message)?.[1]);
}

describe('checkOrphanParts — root selection', () => {
  it('an unlinked part declared LAST is the only orphan', () => {
    const { arm, kcad } = makeArm('mated-plus-floater');
    addMatedStack(arm, kcad);
    arm.part('floater', kcad.box(5, 5, 5).translate(0, 200, 0));

    expect(orphanNames(arm)).toEqual(['floater']);
  });

  it('an unlinked part declared FIRST is the orphan, not the mated mechanism after it', () => {
    // The walk used to root at parts[0]. An unlinked first part then made
    // every mated part an orphan of it, and no diagnostic named the part
    // that actually lacks a mate.
    const { arm, kcad } = makeArm('floater-plus-mated');
    arm.part('floater', kcad.box(5, 5, 5).translate(0, 200, 0));
    addMatedStack(arm, kcad);

    const orphans = checkOrphanParts(arm);
    expect(orphanNames(arm)).toEqual(['floater']);
    expect(orphans[0].message).toContain("Root 'base' reaches only ['base', 'plate']");
    expect(orphans[0].message).toContain("disconnected bodies: ['floater']");
  });

  it('a smaller cluster declared first is the orphan cluster', () => {
    const { arm, kcad } = makeArm('pair-plus-chain');
    const a = arm.part('a', kcad.box(10, 10, 10));
    const b = arm.part('b', kcad.box(10, 10, 10).translate(0, 0, 10));
    const c = arm.part('c', kcad.box(10, 10, 10).translate(100, 0, 0));
    const d = arm.part('d', kcad.box(10, 10, 10).translate(100, 0, 10));
    const e = arm.part('e', kcad.box(10, 10, 10).translate(100, 0, 20));
    arm.revolute('ab', a, b, { axis: [0, 0, 1], origin: [5, 5, 10], limitsDeg: [0, 90] });
    arm.revolute('cd', c, d, { axis: [0, 0, 1], origin: [105, 5, 10], limitsDeg: [0, 90] });
    arm.revolute('de', d, e, { axis: [0, 0, 1], origin: [105, 5, 20], limitsDeg: [0, 90] });

    expect(orphanNames(arm)).toEqual(['a', 'b']);
  });

  it('equally large clusters keep the first-declared one as the root', () => {
    const { arm, kcad } = makeArm('two-pairs');
    const a = arm.part('a', kcad.box(10, 10, 10));
    const b = arm.part('b', kcad.box(10, 10, 10).translate(0, 0, 10));
    const c = arm.part('c', kcad.box(10, 10, 10).translate(100, 0, 0));
    const d = arm.part('d', kcad.box(10, 10, 10).translate(100, 0, 10));
    arm.revolute('ab', a, b, { axis: [0, 0, 1], origin: [5, 5, 10], limitsDeg: [0, 90] });
    arm.revolute('cd', c, d, { axis: [0, 0, 1], origin: [105, 5, 10], limitsDeg: [0, 90] });

    const orphans = checkOrphanParts(arm);
    expect(orphanNames(arm)).toEqual(['c', 'd']);
    expect(orphans.every((o) => o.message.includes("Root 'a' reaches only ['a', 'b']"))).toBe(true);
  });

  it('unlinked bodies with no mate, joint or transmission are not orphans', () => {
    const { arm, kcad } = makeArm('enclosure');
    arm.part('base', kcad.box(60, 40, 20));
    arm.part('lid', kcad.box(60, 40, 3).translate(80, 0, 0));

    expect(checkOrphanParts(arm)).toEqual([]);
  });
});
