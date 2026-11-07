// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Decision tests for the one-edit DFM auto-fix. Geometry is not built here;
// the integration loop (apply, recheck, still-fail) lives in
// tests/unit/dfm/dfmFixRecheck.test.ts.

import { describe, expect, it } from 'vitest';
import { planDfmAutoFix, type DfmFixFeature } from './dfmAutoFix';
import type { DfmReviewCheck } from './dfmReviewChecks';

function feature(
  id: string,
  kind: string,
  params: Record<string, number>,
  driven?: { name: string; paramRef: string },
): DfmFixFeature {
  const out: DfmFixFeature = { id, kind, params: {} };
  for (const [name, evaluated] of Object.entries(params)) {
    out.params[name] = {
      evaluated,
      ...(driven?.name === name ? { paramRef: driven.paramRef } : {}),
    };
  }
  return out;
}

function check(partial: Pick<DfmReviewCheck, 'id' | 'process' | 'status'> & Partial<DfmReviewCheck>): DfmReviewCheck {
  return {
    part: 'body',
    summary: partial.id,
    ...partial,
  };
}

describe('planDfmAutoFix', () => {
  it('raises the one fillet that matches the measured radius up to the named maximum', () => {
    const result = planDfmAutoFix({
      checks: [check({
        id: 'cnc.internal-corner-radius', process: 'cnc', status: 'fail', value: 1, limit: 2,
      })],
      records: [feature('fillet_1', 'fillet', { radius: 1 })],
    });
    expect(result.plan).toMatchObject({
      kind: 'increase-fillet-radius',
      checkId: 'cnc.internal-corner-radius',
      feature: 'fillet_1',
      param: 'radius',
      before: 1,
      after: 2,
      namedLimit: 2,
      unit: 'mm',
    });
    expect(result.refusal).toBeUndefined();
  });

  it('does not invent a fillet for a sharp (radius 0) internal corner', () => {
    const result = planDfmAutoFix({
      checks: [check({
        id: 'cnc.internal-corner-radius', process: 'cnc', status: 'fail', value: 0, limit: 3,
      })],
      records: [feature('box_1', 'box', { x: 40, y: 40, z: 10 })],
    });
    expect(result.plan).toBeUndefined();
    expect(result.refusal).toMatch(/sharp/i);
    expect(result.suggestions[0]?.guidance).toMatch(/fillet/i);
  });

  it('thickens the one shell whose thickness is the measured wall, up to the minimum', () => {
    const result = planDfmAutoFix({
      checks: [check({
        id: 'fdm.min-wall', process: 'fdm', status: 'fail', value: 0.3, limit: 0.8,
      })],
      records: [feature('shell_1', 'shell', { thickness: 0.3 })],
    });
    expect(result.plan).toMatchObject({
      kind: 'thicken-wall',
      feature: 'shell_1',
      param: 'thickness',
      before: 0.3,
      after: 0.81,
      namedLimit: 0.8,
      unit: 'mm',
    });
  });

  it('refuses to thicken a wall that is not a matching shell()', () => {
    const result = planDfmAutoFix({
      checks: [check({
        id: 'fdm.min-wall', process: 'fdm', status: 'fail', value: 0.3, limit: 0.8,
      })],
      records: [feature('box_1', 'box', { x: 40, y: 30, z: 0.3 })],
    });
    expect(result.plan).toBeUndefined();
    expect(result.refusal).toMatch(/shell/i);
  });

  it('raises the one draft() whose angle is the measured draft, up to the minimum', () => {
    const result = planDfmAutoFix({
      checks: [check({
        id: 'mold.draft', process: 'injection-molding', status: 'fail', value: 0.3, limit: 1,
      })],
      records: [
        feature('draft_1', 'draft', { angle: 2 }),
        feature('draft_2', 'draft', { angle: 0.3 }),
      ],
    });
    expect(result.plan).toMatchObject({
      kind: 'increase-draft',
      feature: 'draft_2',
      param: 'angle',
      before: 0.3,
      after: 1,
      unit: 'deg',
    });
  });

  it('does not add draft when the measured angle is not an existing draft()', () => {
    const result = planDfmAutoFix({
      checks: [check({
        id: 'mold.draft', process: 'injection-molding', status: 'fail', value: 0, limit: 1,
      })],
      records: [feature('draft_1', 'draft', { angle: 0.5 })],
    });
    expect(result.plan).toBeUndefined();
    expect(result.refusal).toMatch(/draft/i);
  });

  it('does not core out a thick-wall warning', () => {
    const result = planDfmAutoFix({
      checks: [check({
        id: 'mold.wall-thickness', process: 'injection-molding', status: 'warn', value: 8, limit: 4,
      })],
      records: [feature('box_1', 'box', { x: 20, y: 20, z: 8 })],
    });
    expect(result.plan).toBeUndefined();
    expect(result.refusal).toMatch(/not thinned|not cored|thick/i);
  });

  it('targets the requested check and does not apply a different safe fix', () => {
    const result = planDfmAutoFix({
      findingId: 'fdm.overhangs',
      checks: [
        check({ id: 'fdm.overhangs', process: 'fdm', status: 'fail', value: 90, limit: 45 }),
        check({ id: 'fdm.min-wall', process: 'fdm', status: 'fail', value: 0.3, limit: 0.8 }),
      ],
      records: [feature('shell_1', 'shell', { thickness: 0.3 })],
    });
    expect(result.plan).toBeUndefined();
    expect(result.refusal).toMatch(/fdm\.overhangs/);
    expect(result.suggestions.map(s => s.id)).toContain('fdm.overhangs');
  });

  it('resolves a diagnostic code onto the same check', () => {
    const result = planDfmAutoFix({
      diagnosticCode: 'dfm.fdm.wall-below-nozzle',
      checks: [
        check({ id: 'fdm.overhangs', process: 'fdm', status: 'fail' }),
        check({ id: 'fdm.min-wall', process: 'fdm', status: 'fail', value: 0.3, limit: 0.8 }),
      ],
      records: [feature('shell_1', 'shell', { thickness: 0.3 })],
    });
    expect(result.plan?.checkId).toBe('fdm.min-wall');
  });

  it('refuses when finding id and diagnostic code disagree', () => {
    const result = planDfmAutoFix({
      findingId: 'fdm.min-wall',
      diagnosticCode: 'dfm.fdm.overhang-unsupported',
      checks: [check({ id: 'fdm.min-wall', process: 'fdm', status: 'fail', value: 0.3, limit: 0.8 })],
      records: [feature('shell_1', 'shell', { thickness: 0.3 })],
    });
    expect(result.plan).toBeUndefined();
    expect(result.refusal).toMatch(/different checks/);
  });

  it('plans only the first safe fix when a wall and a fillet both qualify', () => {
    const result = planDfmAutoFix({
      checks: [
        check({ id: 'cnc.internal-corner-radius', process: 'cnc', status: 'fail', value: 1, limit: 2 }),
        check({ id: 'fdm.min-wall', process: 'fdm', status: 'fail', value: 0.3, limit: 0.8 }),
      ],
      records: [
        feature('fillet_1', 'fillet', { radius: 1 }),
        feature('shell_1', 'shell', { thickness: 0.3 }),
      ],
    });
    expect(result.plan?.kind).toBe('thicken-wall');
  });

  it('does not detach a param()-driven shell thickness', () => {
    const result = planDfmAutoFix({
      checks: [check({ id: 'fdm.min-wall', process: 'fdm', status: 'fail', value: 0.3, limit: 0.8 })],
      records: [feature('shell_1', 'shell', { thickness: 0.3 }, { name: 'thickness', paramRef: 'wall' })],
    });
    expect(result.plan).toBeUndefined();
    expect(result.refusal).toMatch(/param\('wall'\)/);
    expect(result.refusal).toMatch(/set_param/);
  });

  it('reports an already-passing review without a plan', () => {
    const result = planDfmAutoFix({
      checks: [check({ id: 'fdm.min-wall', process: 'fdm', status: 'pass', value: 2, limit: 0.8 })],
      records: [],
    });
    expect(result.plan).toBeUndefined();
    expect(result.refusal).toMatch(/nothing to fix/);
    expect(result.suggestions).toEqual([]);
  });
});
