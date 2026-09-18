import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import { KernelError } from '../../../src/shared/intent/kernelError';

function session() {
  const s = new CaptureSession();
  return { s, kcad: createApi({ session: s }) };
}

function captureError(fn: () => unknown): KernelError {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(KernelError);
    return e as KernelError;
  }
  throw new Error('expected the call to throw KernelError');
}

describe('extrude twistAngle capture contract', () => {
  it('rejects an unknown extrude option key with feature.invalid-args', () => {
    const { kcad } = session();
    const sketch = kcad.path().moveTo(0, 0).lineTo(30, 0).lineTo(30, 6).close();

    const err = captureError(() => sketch.extrude(80, { thickness: 2 } as never));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toMatch(/thickness/);
  });

  it('captures twistAngle as a symbolic degree param for ParamRefs', () => {
    const { s, kcad } = session();
    const t = kcad.param('t', 45);
    const sketch = kcad.path().moveTo(0, 0).lineTo(30, 0).lineTo(30, 6).close();

    sketch.extrude(80, { twistAngle: t });

    const rec = s.getRecords().at(-1)!;
    expect(rec.kind).toBe('extrude');
    expect(rec.params.twistAngle).toMatchObject({ unit: 'deg', paramRef: 't' });
  });

  it('captures twistAngle 0 when omitted or explicitly undefined', () => {
    const { s, kcad } = session();
    const omitted = kcad.path().moveTo(0, 0).lineTo(30, 0).lineTo(30, 6).close();
    const explicit = kcad.path().moveTo(0, 0).lineTo(30, 0).lineTo(30, 6).close();

    omitted.extrude(80);
    explicit.extrude(80, { twistAngle: undefined });

    const recs = s.getRecords();
    expect(recs.at(-2)!.params.twistAngle).toMatchObject({ unit: 'deg', evaluated: 0 });
    expect(recs.at(-1)!.params.twistAngle).toMatchObject({ unit: 'deg', evaluated: 0 });
  });

  it('rejects a non-numeric twistAngle with feature.invalid-args', () => {
    const { kcad } = session();
    const sketch = kcad.path().moveTo(0, 0).lineTo(30, 0).lineTo(30, 6).close();

    const err = captureError(() => sketch.extrude(80, { twistAngle: { value: 35 } } as never));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toMatch(/opts\.twistAngle/);
  });
});
