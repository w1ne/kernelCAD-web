import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { KernelError } from '../../../src/shared/intent/kernelError';

function session() {
  const s = new CaptureSession();
  return { s, kcad: createModelingApi({ session: s }) };
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

  it('tolerates null opts (legacy optional-chaining behaviour)', () => {
    const nullOpts = session();
    const a1 = nullOpts.kcad.path().moveTo(0, -1).lineTo(2, 0).lineTo(0, 1).close();
    const b1 = nullOpts.kcad.path().moveTo(0, -1).lineTo(2, 0).lineTo(0, 1).close();
    expect(() => a1.loft(b1, null)).not.toThrow();

    const emptyOpts = session();
    const a2 = emptyOpts.kcad.path().moveTo(0, -1).lineTo(2, 0).lineTo(0, 1).close();
    const b2 = emptyOpts.kcad.path().moveTo(0, -1).lineTo(2, 0).lineTo(0, 1).close();
    a2.loft(b2, {});

    const nullRec = nullOpts.s.getRecords().find((r) => r.kind === 'loft')!;
    const emptyRec = emptyOpts.s.getRecords().find((r) => r.kind === 'loft')!;
    expect(nullRec.params).toEqual(emptyRec.params);
    expect(nullRec.metadata).toEqual(emptyRec.metadata);
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
  it('rejects a planes[] entry without a valid plane name', () => {
    const { kcad } = session();
    const a = kcad.path().moveTo(0, -1).lineTo(2, 0).lineTo(0, 1).close();
    const b = kcad.path().moveTo(0, -1).lineTo(2, 0).lineTo(0, 1).close();

    // Before the check, a missing plane passed capture and the loft failed
    // later as feature.empty-result, which named no cause.
    const missing = captureError(() =>
      a.loft(b, { planes: [{ origin: [0, 0, 0] }, { origin: [0, 0, 10] }] } as never),
    );
    expect(missing.code).toBe('feature.invalid-args');
    expect(missing.message).toMatch(/planes\[0\]\.plane/);
    expect(missing.message).toMatch(/'XY' \| 'YZ' \| 'XZ'/);

    const lowercase = captureError(() =>
      a.loft(b, {
        planes: [
          { plane: 'XY', origin: [0, 0, 0] },
          { plane: 'xy', origin: [0, 0, 10] },
        ],
      } as never),
    );
    expect(lowercase.code).toBe('feature.invalid-args');
    expect(lowercase.message).toMatch(/planes\[1\]\.plane/);
  });

  it('rejects a planes[] entry without a 3D origin', () => {
    const { kcad } = session();
    const a = kcad.path().moveTo(0, -1).lineTo(2, 0).lineTo(0, 1).close();
    const b = kcad.path().moveTo(0, -1).lineTo(2, 0).lineTo(0, 1).close();

    for (const origin of [undefined, [0, 10], [0, 0, 'ten'], [0, 0, Number.NaN]]) {
      const err = captureError(() =>
        a.loft(b, {
          planes: [
            { plane: 'XY', origin: [0, 0, 0] },
            { plane: 'XY', origin },
          ],
        } as never),
      );
      expect(err.code).toBe('feature.invalid-args');
      expect(err.message).toMatch(/planes\[1\]\.origin/);
    }
  });

  it('captures ParamRef origin coordinates in a valid planes[] entry', () => {
    const { s, kcad } = session();
    const height = kcad.param('height', 40);
    const a = kcad.path().moveTo(0, -1).lineTo(2, 0).lineTo(0, 1).close();
    const b = kcad.path().moveTo(0, -1).lineTo(2, 0).lineTo(0, 1).close();

    a.loft(b, {
      planes: [
        { plane: 'XY', origin: [0, 0, 0] },
        { plane: 'XY', origin: [0, 0, height] },
      ],
    });

    const rec = s.getRecords().at(-1)!;
    const planes = (rec.metadata as { planes: Array<{ origin: Array<number | CapturedParam> }> }).planes;
    expect((planes[1].origin[2] as CapturedParam).paramRef).toBe('height');
  });
});
