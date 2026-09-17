// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Locks the exact order and content of the four agent-facing projections
// derived from DIAGNOSTIC_REGISTRY (DIAGNOSTIC_CODES, HINT_TEMPLATES,
// NEXT_ACTIONS). The registry is being split into per-domain files
// (docs/plans/2026-09-17-quality-slice-5-diagnostics-registry.md); this
// fixture is the pre-split projection so the split can never silently
// reorder or drop a code.

import { describe, it, expect } from 'vitest';
import {
  DIAGNOSTIC_CODES,
  HINT_TEMPLATES,
  NEXT_ACTIONS,
} from '../../../src/shared/diagnostics/registry';
import fixture from './fixtures/registryProjection.json';

describe('diagnostic registry projections (order + content lock)', () => {
  it('matches the committed pre-split fixture byte-for-byte in content and order', () => {
    const current = { DIAGNOSTIC_CODES, HINT_TEMPLATES, NEXT_ACTIONS };
    expect(JSON.parse(JSON.stringify(current))).toEqual(fixture);
  });

  it('DIAGNOSTIC_CODES order matches the fixture order exactly (no re-sort)', () => {
    expect(DIAGNOSTIC_CODES).toEqual(fixture.DIAGNOSTIC_CODES);
  });
});
