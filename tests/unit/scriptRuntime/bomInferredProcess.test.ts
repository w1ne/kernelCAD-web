// tests/unit/scriptRuntime/bomInferredProcess.test.ts
//
// Regression coverage for `inferredProcess` — the exported heuristic shared
// by `computeBom` (undeclared fabricated parts) and the fabPack single-shape
// BOM fallback, so both surfaces agree. Locks the plain-shape default and the
// importedStep → 'cnc' remap.
import { describe, it, expect } from 'vitest';
import { inferredProcess } from '../../../src/agent/script-runtime/bom';
import type { FeatureRecord } from '../../../src/shared/intent/featureRecord';
import type { FeatureKind, FeatureRef } from '../../../src/shared/intent/types';

function record(id: string, kind: FeatureKind, base?: string): FeatureRecord {
  const inputs: Record<string, FeatureRef> = {};
  if (base !== undefined) inputs.base = { kind: 'feature', id: base };
  return { id, kind, inputs, params: {}, transforms: [], suppressed: false };
}

describe('inferredProcess', () => {
  it("maps a plain box shapeId to '3d-print'", () => {
    const records = [record('box_1', 'box')];
    expect(inferredProcess(records, 'box_1')).toBe('3d-print');
  });

  it("maps an importedStep record to 'cnc'", () => {
    const records = [record('importedStep_1', 'importedStep')];
    expect(inferredProcess(records, 'importedStep_1')).toBe('cnc');
  });
});
