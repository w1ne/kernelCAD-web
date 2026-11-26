// tests/unit/scriptRuntime/bomInferredProcess.test.ts
//
// Regression coverage for `inferredProcess` — the exported heuristic shared
// by `computeBom` (undeclared fabricated parts), the fabPack single-shape
// BOM fallback and the cost estimate, so those surfaces agree. Locks the
// plain-shape default, the importedStep/imported-mesh → 'cnc' remap, and the
// metallic-material → 'cnc' inference (#1782).
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

  it("maps native metal stock to 'cnc' instead of a polymer print", () => {
    const records = [record('box_1', 'box')];
    expect(inferredProcess(records, 'box_1', 'aluminum-6061')).toBe('cnc');
    expect(inferredProcess(records, 'box_1', 'mild-steel')).toBe('cnc');
    // Legacy bulk aliases resolve to the same metallic grade.
    expect(inferredProcess(records, 'box_1', 'aluminum')).toBe('cnc');
    expect(inferredProcess(records, 'box_1', 'steel')).toBe('cnc');
  });

  it("keeps polymer grades and an undeclared material on '3d-print'", () => {
    const records = [record('box_1', 'box')];
    expect(inferredProcess(records, 'box_1', 'petg')).toBe('3d-print');
    expect(inferredProcess(records, 'box_1', 'pla')).toBe('3d-print');
    expect(inferredProcess(records, 'box_1')).toBe('3d-print');
    expect(inferredProcess(records, 'box_1', null)).toBe('3d-print');
  });

  it("keeps a sheet-metal part at 'sheet-cut' even when it declares metal", () => {
    const records = [
      record('sheetMetal_1', 'sheetMetal'),
      record('bend_1', 'bend', 'sheetMetal_1'),
    ];
    expect(inferredProcess(records, 'bend_1', 'mild-steel')).toBe('sheet-cut');
  });
});
