// Locks the retained foundation diagnostic prefix and its recovery guidance.
// Supplier policy diagnostics were removed under the private commercial boundary.
// New foundation codes may append without changing this retained-prefix fixture.

import { describe, it, expect } from 'vitest';
import {
  DIAGNOSTIC_CODES,
  HINT_TEMPLATES,
  NEXT_ACTIONS,
} from '../../../src/shared/diagnostics/registry';
import fixture from './fixtures/registryProjection.json';

describe('diagnostic registry projections (legacy-prefix order + content lock)', () => {
  const legacyLength = fixture.DIAGNOSTIC_CODES.length;

  it('the retained DIAGNOSTIC_CODES prefix matches the fixture order exactly (no reorder)', () => {
    expect(DIAGNOSTIC_CODES.slice(0, legacyLength)).toEqual(fixture.DIAGNOSTIC_CODES);
  });

  it('every fixture code still has the exact fixture hint template and next action', () => {
    for (const code of fixture.DIAGNOSTIC_CODES) {
      expect(HINT_TEMPLATES[code as keyof typeof HINT_TEMPLATES], `missing HINT_TEMPLATES for ${code}`).toEqual(
        (fixture.HINT_TEMPLATES as Record<string, unknown>)[code],
      );
      expect(NEXT_ACTIONS[code as keyof typeof NEXT_ACTIONS], `missing NEXT_ACTIONS for ${code}`).toEqual(
        (fixture.NEXT_ACTIONS as Record<string, unknown>)[code],
      );
    }
  });

  // New codes may append after the retained prefix.
});
