// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { shellStore } from './shellStore';

describe('StagedEdit direct-edit fields', () => {
  it('retains spec, delta, evaluation, and target script', () => {
    shellStore.proposeStagedEdit({
      id: 'e1',
      intent: "Translate part 'slider' by (5, 0, 0) mm",
      fromCode: 'a',
      toCode: 'b',
      specLabel: 'param PX · 20 → 25',
      validityDelta: { fromInterferences: 1, toInterferences: 0, fromVolumeMm3: 3.5, toVolumeMm3: 0, fromOk: false, toOk: true },
      evaluation: { ok: true },
      targetScript: 'examples/demo.kcad.ts',
      source: { kind: 'human', label: 'drag' },
    });
    const staged = shellStore.getSnapshot().stagedEdit;
    expect(staged?.specLabel).toBe('param PX · 20 → 25');
    expect(staged?.validityDelta?.toInterferences).toBe(0);
    expect(staged?.targetScript).toBe('examples/demo.kcad.ts');
    shellStore.clearStagedEdit();
  });
});
