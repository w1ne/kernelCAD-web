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
});
