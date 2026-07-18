// Sentinels for the Slice C parts.* diagnostic codes.

import { describe, it, expect } from 'vitest';
import { DIAGNOSTIC_REGISTRY } from '../../../src/shared/diagnostics/registry';

describe('parts.* diagnostic codes (Slice C)', () => {
  const PARTS_CODES = [
    'parts.input.id-or-query-required',
    'parts.fetch.offline-and-uncached',
    'parts.fetch.checksum-mismatch',
    'parts.fetch.checksum-drift',
    'parts.fetch.api-error',
    'parts.fetch.remote-disabled',
    'parts.fetch.geometry-not-brep',
  ] as const;

  for (const code of PARTS_CODES) {
    it(`${code} is registered with group "parts" and a non-empty hint`, () => {
      const entry = (
        DIAGNOSTIC_REGISTRY as Record<
          string,
          { group: string; hintTemplate: string; nextAction: unknown }
        >
      )[code];
      expect(entry).toBeDefined();
      expect(entry.group).toBe('parts');
      expect(entry.hintTemplate.length).toBeGreaterThan(20);
      expect(entry.nextAction).toBeDefined();
    });
  }
});
