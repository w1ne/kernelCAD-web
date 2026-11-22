// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Guards the named-finish table that `.finish()` looks up. A registry that
// lags source (npm stuck on an older package) hides this API from `npx`; this
// test fails in-repo if the aluminium token or its expander disappears.

import { describe, it, expect } from 'vitest';
import { FINISH_TOKENS, isFinishToken, expandFinish } from '../../src/shared/render/finishes';

describe('finish API surface', () => {
  it('exports aluminium and expands to a material record', () => {
    expect(FINISH_TOKENS).toContain('aluminium');
    expect(isFinishToken('aluminium')).toBe(true);
    const mat = expandFinish('aluminium');
    expect(mat).toBeTruthy();
    expect(typeof mat).toBe('object');
  });
});
