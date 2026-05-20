// tests/unit/capture/embossText.test.ts
import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import type { CompilerDiagnostic } from '../../../src/shared/diagnostics/diagnostic';
import type { EmbossTextMetadata } from '../../../src/shared/intent/embossTextRecord';

function makeParent(session: CaptureSession): string {
  // Build a small box via the public capture API.
  // box(...) uses createShape under the hood; we mimic by calling register
  // directly with the same shape.
  const r = session.register({
    kind: 'box',
    params: {
      width: { expression: '10', unit: 'mm', evaluated: 10 },
      height: { expression: '10', unit: 'mm', evaluated: 10 },
      depth: { expression: '10', unit: 'mm', evaluated: 10 },
      centered: { expression: 'false', unit: 'unitless', evaluated: 0 },
    },
    inputs: {},
  });
  return r.id;
}

describe('CaptureSession.addEmbossText', () => {
  it('produces an embossText record with normalized metadata', () => {
    const session = new CaptureSession();
    const parentId = makeParent(session);
    const id = session.addEmbossText(parentId, {
      textContent: 'KC',
      size: 4,
      depth: 0.6,
      align: 'center',
      anchorU: 0.5,
      anchorV: 0.5,
      face: { face: 'top' },
    });
    const rec = session.getRecords().find((r) => r.id === id)!;
    expect(rec).toBeDefined();
    expect(rec.kind).toBe('embossText');
    const meta = rec.metadata as unknown as EmbossTextMetadata & { diagnostics?: CompilerDiagnostic[] };
    expect(meta.textContent).toBe('KC');
    expect(meta.size.evaluated).toBe(4);
    expect(meta.depth.evaluated).toBeCloseTo(0.6);
    expect(meta.align).toBe('center');
    expect(meta.anchorU.evaluated).toBe(0.5);
    expect(meta.anchorV.evaluated).toBe(0.5);
    expect(meta.rotation.evaluated).toBe(0);
    expect(meta.scaleMode).toBe('original');
    expect(meta.faceRef).toEqual({ kind: 'canonical', face: 'top' });
    // No diagnostics for a clean call.
    expect(meta.diagnostics === undefined || meta.diagnostics.length === 0).toBe(true);
  });

  it('emits feature.emboss-text.depth-zero when depth === 0', () => {
    const session = new CaptureSession();
    const parentId = makeParent(session);
    const id = session.addEmbossText(parentId, {
      textContent: 'KC',
      size: 4,
      depth: 0,
      align: 'center',
      anchorU: 0.5,
      anchorV: 0.5,
      face: { face: 'top' },
    });
    const rec = session.getRecords().find((r) => r.id === id)!;
    const meta = rec.metadata as { diagnostics?: CompilerDiagnostic[] };
    expect(meta.diagnostics).toBeDefined();
    expect(meta.diagnostics!.some((d) => d.code === 'feature.emboss-text.depth-zero')).toBe(true);
  });

  it('emits feature.face.invalid-uv-anchor when anchorU outside [0,1]', () => {
    const session = new CaptureSession();
    const parentId = makeParent(session);
    const id = session.addEmbossText(parentId, {
      textContent: 'KC',
      size: 4,
      depth: 0.4,
      align: 'left',
      anchorU: 1.5,
      anchorV: 0.5,
      face: { face: 'top' },
    });
    const rec = session.getRecords().find((r) => r.id === id)!;
    const meta = rec.metadata as { diagnostics?: CompilerDiagnostic[] };
    expect(meta.diagnostics).toBeDefined();
    expect(meta.diagnostics!.some((d) => d.code === 'feature.face.invalid-uv-anchor')).toBe(true);
  });

  it('emits sketch.text.empty-content when textContent is whitespace-only', () => {
    const session = new CaptureSession();
    const parentId = makeParent(session);
    const id = session.addEmbossText(parentId, {
      textContent: '   ',
      size: 4,
      depth: 0.4,
      align: 'left',
      anchorU: 0.5,
      anchorV: 0.5,
      face: { face: 'top' },
    });
    const rec = session.getRecords().find((r) => r.id === id)!;
    const meta = rec.metadata as { diagnostics?: CompilerDiagnostic[] };
    expect(meta.diagnostics).toBeDefined();
    expect(meta.diagnostics!.some((d) => d.code === 'sketch.text.empty-content')).toBe(true);
  });
});
