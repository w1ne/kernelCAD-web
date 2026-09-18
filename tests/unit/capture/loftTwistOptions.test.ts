import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import { KernelError } from '../../../src/shared/intent/kernelError';

function session() {
  const s = new CaptureSession();
  return { s, kcad: createApi({ session: s }) };
}

interface CapturedParam {
  expression: string;
  unit: string;
  evaluated: number;
  paramRef?: unknown;
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

describe('loft twist capture contract', () => {
  it('captures twistDeg as a degree param and twistCenter as metadata', () => {
    const { s, kcad } = session();
    const root = kcad.path().moveTo(0, -1).lineTo(2, 0).lineTo(0, 1).close();
    const tip = kcad.path().moveTo(0, -1).lineTo(2, 0).lineTo(0, 1).close();

    root.loft(tip, { spacing: 50, twistDeg: 35, twistCenter: [1, 0] });

    const rec = s.getRecords().at(-1)!;
    expect(rec.kind).toBe('loft');
    expect(rec.params.twistDeg).toMatchObject({ unit: 'deg', evaluated: 35 });
    const center = (rec.metadata as { twistCenter?: Array<number | { evaluated: number }> }).twistCenter;
    expect(center?.map((v) => (typeof v === 'number' ? v : v.evaluated))).toEqual([1, 0]);
  });

  it('captures per-plane rotationDeg symbolically for ParamRefs', () => {
    const { s, kcad } = session();
    const twist = kcad.param('twist', 20);
    const a = kcad.path().moveTo(0, -1).lineTo(2, 0).lineTo(0, 1).close();
    const b = kcad.path().moveTo(0, -1).lineTo(2, 0).lineTo(0, 1).close();

    a.loft(b, {
      planes: [
        { plane: 'XY', origin: [0, 0, 0] },
        { plane: 'XY', origin: [0, 0, 40], rotationDeg: twist },
      ],
    });

    const rec = s.getRecords().at(-1)!;
    const planes = (rec.metadata as { planes: Array<{ rotationDeg?: CapturedParam }> }).planes;
    expect(planes[1].rotationDeg?.paramRef).toBe('twist');
  });

  it('omits rotationDeg from the captured plane when explicitly undefined', () => {
    const { s, kcad } = session();
    const a = kcad.path().moveTo(0, -1).lineTo(2, 0).lineTo(0, 1).close();
    const b = kcad.path().moveTo(0, -1).lineTo(2, 0).lineTo(0, 1).close();

    a.loft(b, {
      planes: [
        { plane: 'XY', origin: [0, 0, 0], rotationDeg: undefined },
        { plane: 'XY', origin: [0, 0, 40] },
      ],
    });

    const rec = s.getRecords().at(-1)!;
    const planes = (rec.metadata as { planes: Array<Record<string, unknown>> }).planes;
    expect('rotationDeg' in planes[0]).toBe(false);
  });

  it('rejects an unknown loft option key with feature.invalid-args', () => {
    const { kcad } = session();
    const a = kcad.path().moveTo(0, -1).lineTo(2, 0).lineTo(0, 1).close();
    const b = kcad.path().moveTo(0, -1).lineTo(2, 0).lineTo(0, 1).close();

    const err = captureError(() => a.loft(b, { spacing: 10, twist: 30 } as never));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toMatch(/twist/);
  });

  it('rejects an unknown planes[] entry key with feature.invalid-args', () => {
    const { kcad } = session();
    const a = kcad.path().moveTo(0, -1).lineTo(2, 0).lineTo(0, 1).close();
    const b = kcad.path().moveTo(0, -1).lineTo(2, 0).lineTo(0, 1).close();

    const err = captureError(() =>
      a.loft(b, {
        planes: [
          { plane: 'XY', origin: [0, 0, 0] },
          { plane: 'XY', origin: [0, 0, 40], normal: [0, 0, 1] },
        ],
      } as never),
    );
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toMatch(/planes\[1\] option 'normal'/);
  });

  it('rejects non-numeric twistDeg and planes[].rotationDeg', () => {
    const { kcad } = session();
    const a = kcad.path().moveTo(0, -1).lineTo(2, 0).lineTo(0, 1).close();
    const b = kcad.path().moveTo(0, -1).lineTo(2, 0).lineTo(0, 1).close();

    const badTwist = captureError(() => a.loft(b, { twistDeg: { value: 35 } } as never));
    expect(badTwist.code).toBe('feature.invalid-args');
    expect(badTwist.message).toMatch(/opts\.twistDeg/);

    const badRotation = captureError(() =>
      a.loft(b, {
        planes: [{ plane: 'XY', origin: [0, 0, 0], rotationDeg: '45' }],
      } as never),
    );
    expect(badRotation.code).toBe('feature.invalid-args');
    expect(badRotation.message).toMatch(/planes\[0\]\.rotationDeg/);
  });
});
