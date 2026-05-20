// tests/unit/capture/shapeEmbossProjectProxy.test.ts
import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import type { SketchCommand } from '../../../src/shared/capture/sketchCommand';

const SAMPLE_COMMANDS: SketchCommand[] = [
  { kind: 'moveTo', x: { expression: '0', unit: 'mm', evaluated: 0 }, y: { expression: '0', unit: 'mm', evaluated: 0 } },
  { kind: 'lineTo', x: { expression: '2', unit: 'mm', evaluated: 2 }, y: { expression: '0', unit: 'mm', evaluated: 0 } },
  { kind: 'lineTo', x: { expression: '2', unit: 'mm', evaluated: 2 }, y: { expression: '2', unit: 'mm', evaluated: 2 } },
  { kind: 'close' },
];

describe('Shape.embossText / Shape.projectCurve proxy methods', () => {
  it('Shape.embossText returns a new Shape with a different featureId and registers an embossText record', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const plate = kcad.box(40, 10, 2);
    const result = plate.embossText({
      textContent: 'KC',
      size: 4,
      depth: 0.4,
      face: 'top',
    });
    expect(result.id).not.toBe(plate.id);
    const rec = session.getRecords().find((r) => r.id === result.id)!;
    expect(rec.kind).toBe('embossText');
  });

  it('Shape.projectCurve returns a new Shape with a different featureId and registers a projectCurve record', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const cyl = kcad.cylinder(8, 5);
    const result = cyl.projectCurve({
      source: { kind: 'sketchCommands', commands: SAMPLE_COMMANDS },
      face: 'top',
    });
    expect(result.id).not.toBe(cyl.id);
    const rec = session.getRecords().find((r) => r.id === result.id)!;
    expect(rec.kind).toBe('projectCurve');
  });
});
