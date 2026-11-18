// tests/unit/intent/projectCurveRecord.test.ts
import { describe, it, expect } from 'vitest';
import { isProjectCurveMetadata } from '../../../src/shared/intent/projectCurveRecord';
import type { SketchCommand } from '../../../src/shared/capture/sketchCommand';

describe('isProjectCurveMetadata', () => {
  const sampleCommands: SketchCommand[] = [
    { kind: 'moveTo', x: { expression: '0', unit: 'mm', evaluated: 0 }, y: { expression: '0', unit: 'mm', evaluated: 0 } },
    { kind: 'lineTo', x: { expression: '1', unit: 'mm', evaluated: 1 }, y: { expression: '0', unit: 'mm', evaluated: 0 } },
    { kind: 'lineTo', x: { expression: '1', unit: 'mm', evaluated: 1 }, y: { expression: '1', unit: 'mm', evaluated: 1 } },
    { kind: 'close' },
  ];

  const validMeta = {
    source: { kind: 'sketchCommands' as const, commands: sampleCommands },
    scaleMode: 'original' as const,
    asEdge: false,
    faceRef: { kind: 'canonical' as const, face: 'front' as const },
  };

  it('accepts a sketchCommands source', () => {
    expect(isProjectCurveMetadata(validMeta)).toBe(true);
  });

  it('rejects metadata missing source', () => {
    const { source: _drop, ...rest } = validMeta;
    void _drop;
    expect(isProjectCurveMetadata(rest)).toBe(false);
  });

  it('accepts open metadata only with one open command chain and an explicit frame', () => {
    const openCommands = sampleCommands.slice(0, 2);
    const openMeta = {
      ...validMeta,
      source: { kind: 'sketchCommands' as const, commands: openCommands },
      asEdge: true,
      sourcePlane: { origin: [0, 0, 10], normal: [0, 0, 1], xAxis: [1, 0, 0] },
      direction: [0, 0, -1],
    };
    expect(isProjectCurveMetadata(openMeta)).toBe(true);
    expect(isProjectCurveMetadata({ ...openMeta, direction: undefined })).toBe(false);
    expect(isProjectCurveMetadata({ ...openMeta, source: validMeta.source })).toBe(false);
    expect(isProjectCurveMetadata({ ...openMeta, sourcePlane: null })).toBe(false);
    expect(isProjectCurveMetadata({
      ...openMeta,
      sourcePlane: { origin: null, normal: [0, 0, 1], xAxis: [1, 0, 0] },
    })).toBe(false);
    expect(isProjectCurveMetadata({ ...openMeta, direction: null })).toBe(false);
  });
});
