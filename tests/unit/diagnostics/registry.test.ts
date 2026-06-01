// Permanent invariants on DIAGNOSTIC_REGISTRY.
//
// Sister to codes.test.ts (catalogue coverage) and nextAction.test.ts
// (well-formed nextAction shape) — this file asserts the per-spec fields
// the registry refactor added: description, group, defaultSeverity.

import { describe, it, expect } from 'vitest';
import {
  DIAGNOSTIC_CODES,
  DIAGNOSTIC_REGISTRY,
} from '../../../src/shared/diagnostics/registry';
import type { NextAction } from '../../../src/shared/diagnostics/nextAction';

const ALLOWED_SEVERITIES = new Set(['info', 'warn', 'error']);
const ALLOWED_GROUPS = new Set([
  'feature',
  'sketch',
  'recompute',
  'cli',
  'export',
  'assembly',
  'mesher',
  'tool',
  'dfm',
  'query',
  'kinematic',
  'mechanism',
]);

// Mirror of the well-formed-shape predicate from nextAction.test.ts so the
// registry-side check stays self-contained.
function isWellFormedNextAction(a: NextAction): boolean {
  switch (a.kind) {
    case 'retry-with-smaller-param':
      return typeof a.param === 'string' && typeof a.factor === 'number' && a.factor > 0 && a.factor < 1;
    case 'call-introspection-tool':
      return typeof a.tool === 'string' && a.tool.length > 0;
    case 'rewrite-feature':
      return typeof a.guidance === 'string' && a.guidance.length > 0;
    case 'reorder-pipeline':
      return typeof a.guidance === 'string' && a.guidance.length > 0;
    case 'fix-arg':
      return typeof a.field === 'string' && a.field.length > 0;
    case 'inspect-message':
      return true;
    case 'rename':
      return typeof a.guidance === 'string' && a.guidance.length > 0;
    case 'add-return':
      return true;
    case 'check-cli-args':
      return true;
    case 'check-file-path':
      return true;
  }
}

describe('DIAGNOSTIC_REGISTRY per-spec invariants', () => {
  it('catalogue length matches the registry length', () => {
    expect(DIAGNOSTIC_CODES.length).toBe(Object.keys(DIAGNOSTIC_REGISTRY).length);
  });

  it('every spec has all required fields populated', () => {
    for (const code of DIAGNOSTIC_CODES) {
      const spec = DIAGNOSTIC_REGISTRY[code];
      expect(spec, `missing spec for ${code}`).toBeDefined();
      expect(typeof spec.hintTemplate, `${code}.hintTemplate is not a string`).toBe('string');
      expect(spec.hintTemplate.trim().length, `${code}.hintTemplate is empty`).toBeGreaterThan(0);
      expect(typeof spec.description, `${code}.description is not a string`).toBe('string');
      expect(spec.description.trim().length, `${code}.description is empty`).toBeGreaterThan(0);
      expect(spec.nextAction, `${code}.nextAction is missing`).toBeDefined();
      expect(typeof spec.defaultSeverity, `${code}.defaultSeverity is not a string`).toBe('string');
      expect(typeof spec.group, `${code}.group is not a string`).toBe('string');
    }
  });

  it('defaultSeverity is one of {info, warn, error}', () => {
    for (const code of DIAGNOSTIC_CODES) {
      const sev = DIAGNOSTIC_REGISTRY[code].defaultSeverity;
      expect(
        ALLOWED_SEVERITIES.has(sev),
        `${code} has invalid defaultSeverity '${sev}'`,
      ).toBe(true);
    }
  });

  it('nextAction is well-formed for every code', () => {
    for (const code of DIAGNOSTIC_CODES) {
      const a = DIAGNOSTIC_REGISTRY[code].nextAction;
      expect(
        isWellFormedNextAction(a),
        `${code} has malformed nextAction: ${JSON.stringify(a)}`,
      ).toBe(true);
    }
  });

  it('group is one of the allowed namespaces', () => {
    for (const code of DIAGNOSTIC_CODES) {
      const g = DIAGNOSTIC_REGISTRY[code].group;
      expect(ALLOWED_GROUPS.has(g), `${code} has invalid group '${g}'`).toBe(true);
    }
  });

  it('group matches the code prefix (registry stays self-describing)', () => {
    for (const code of DIAGNOSTIC_CODES) {
      const prefix = code.split('.', 1)[0];
      expect(
        DIAGNOSTIC_REGISTRY[code].group,
        `${code}.group should be '${prefix}' to match the code prefix`,
      ).toBe(prefix);
    }
  });
});
