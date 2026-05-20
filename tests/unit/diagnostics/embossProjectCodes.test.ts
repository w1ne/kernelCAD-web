// tests/unit/diagnostics/embossProjectCodes.test.ts
import { describe, it, expect } from 'vitest';
import { DIAGNOSTIC_REGISTRY } from '../../../src/shared/diagnostics/registry';

const W3_CODES = [
  'feature.emboss-text.face-too-small',
  'feature.emboss-text.depth-zero',
  'feature.project-curve.no-intersection',
  'feature.project-curve.curve-empty',
  'feature.face.invalid-uv-anchor',
] as const;

describe('W3 face-authoring diagnostic codes', () => {
  for (const code of W3_CODES) {
    it(`registers '${code}' with a non-trivial hint and group=feature`, () => {
      const entry = (DIAGNOSTIC_REGISTRY as Record<string, unknown>)[code] as
        | { hintTemplate?: unknown; group?: unknown }
        | undefined;
      expect(entry, `${code} must be registered`).toBeDefined();
      expect(typeof entry!.hintTemplate).toBe('string');
      expect((entry!.hintTemplate as string).length).toBeGreaterThan(10);
      expect(entry!.group).toBe('feature');
    });
  }
});
