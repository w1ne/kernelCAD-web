// tests/unit/capture/projectCurve.test.ts
import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import type { CompilerDiagnostic } from '../../../src/shared/diagnostics/diagnostic';
import type { ProjectCurveMetadata } from '../../../src/shared/intent/projectCurveRecord';
import type { SketchCommand } from '../../../src/shared/capture/sketchCommand';

function makeParent(session: CaptureSession): string {
  const r = session.register({
    kind: 'cylinder',
    params: {
      h: { expression: '10', unit: 'mm', evaluated: 10 },
      r: { expression: '5', unit: 'mm', evaluated: 5 },
    },
    inputs: {},
  });
  return r.id;
}

const SAMPLE_COMMANDS: SketchCommand[] = [
  { kind: 'moveTo', x: { expression: '0', unit: 'mm', evaluated: 0 }, y: { expression: '0', unit: 'mm', evaluated: 0 } },
  { kind: 'lineTo', x: { expression: '2', unit: 'mm', evaluated: 2 }, y: { expression: '0', unit: 'mm', evaluated: 0 } },
  { kind: 'lineTo', x: { expression: '2', unit: 'mm', evaluated: 2 }, y: { expression: '2', unit: 'mm', evaluated: 2 } },
  { kind: 'close' },
];

describe('CaptureSession.addProjectCurve', () => {
  it('produces a projectCurve record with normalized metadata', () => {
    const session = new CaptureSession();
    const parentId = makeParent(session);
    const id = session.addProjectCurve(parentId, {
      source: { kind: 'sketchCommands', commands: SAMPLE_COMMANDS },
      face: { face: 'top' },
    });
    const rec = session.getRecords().find((r) => r.id === id)!;
    expect(rec).toBeDefined();
    expect(rec.kind).toBe('projectCurve');
    const meta = rec.metadata as unknown as ProjectCurveMetadata & {
      diagnostics?: CompilerDiagnostic[];
    };
    expect(meta.source.kind).toBe('sketchCommands');
    expect(meta.asEdge).toBe(false);
    expect(meta.scaleMode).toBe('original');
    expect(meta.faceRef).toEqual({ kind: 'canonical', face: 'top' });
    expect(meta.diagnostics === undefined || meta.diagnostics.length === 0).toBe(true);
  });

  it('emits feature.project-curve.curve-empty when commands are empty', () => {
    const session = new CaptureSession();
    const parentId = makeParent(session);
    const id = session.addProjectCurve(parentId, {
      source: { kind: 'sketchCommands', commands: [] },
      face: { face: 'top' },
    });
    const rec = session.getRecords().find((r) => r.id === id)!;
    const meta = rec.metadata as { diagnostics?: CompilerDiagnostic[] };
    expect(meta.diagnostics).toBeDefined();
    expect(meta.diagnostics!.some((d) => d.code === 'feature.project-curve.curve-empty')).toBe(true);
  });
});
