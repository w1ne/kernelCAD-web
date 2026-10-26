// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { DIAGNOSTIC_CODES, DIAGNOSTIC_REGISTRY, HINT_TEMPLATES, NEXT_ACTIONS } from '../../../src/shared/diagnostics/registry';

describe('public diagnostic boundary', () => {
  it('does not expose supplier preflight or stock policy through runtime views', () => {
    const privatePrefixes = ['dfm.input.', 'dfm.units.', 'dfm.material.', 'dfm.thickness.', 'dfm.hole.', 'dfm.slot.', 'dfm.web.', 'dfm.bend.', 'dfm.bending.', 'dfm.size.', 'dfm.dxf.', 'dfm.rule.'];
    for (const view of [DIAGNOSTIC_REGISTRY, HINT_TEMPLATES, NEXT_ACTIONS]) {
      expect(Object.keys(view).filter(code => privatePrefixes.some(prefix => code.startsWith(prefix)))).toEqual([]);
    }
    expect(DIAGNOSTIC_CODES.filter(code => privatePrefixes.some(prefix => code.startsWith(prefix)))).toEqual([]);
    expect(JSON.stringify(DIAGNOSTIC_REGISTRY)).not.toMatch(/dfm.preflight|vendor.stocked|vendor minimum|vendor maximum|instant.quote envelope/i);
  });

  it('retains geometry diagnostics for declared walls, clearances and channels', () => {
    for (const code of ['dfm.wall.too-thin', 'dfm.clearance.violated', 'dfm.channel.openings-mismatch', 'dfm.void.undeclared', 'dfm.fdm.wall-below-nozzle'] as const) {
      expect(DIAGNOSTIC_REGISTRY[code]).toBeDefined();
      expect(HINT_TEMPLATES[code]).toBeTruthy();
      expect(NEXT_ACTIONS[code]).toBeDefined();
    }
  });
});
