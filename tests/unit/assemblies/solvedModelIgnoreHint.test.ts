// Regression: the interference hint must name the SECOND `solvedModel`
// argument. `solvedModel({ ignore })` puts the option bag where poses belong,
// so following the old hint produced `unknown-joint` instead of silencing the
// intended contact.
import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { isKernelError } from '../../../src/shared/intent/kernelError';

function overlappingArm() {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const arm = kcad.assembly('t');
  arm
    .part('a', kcad.box(10, 10, 10))
    .connector('o', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
  arm
    .part('b', kcad.box(10, 10, 10))
    .connector('o', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
  arm.mate('m', 'a.o', 'b.o', 'fastened');
  return arm;
}

describe('solvedModel ignore argument position', () => {
  it('silences a declared contact when ignore is the second argument', async () => {
    const arm = overlappingArm();
    const scene = await arm.solvedModel({}, {
      validate: 'error',
      ignore: [['a', 'b']],
    });
    expect(scene.parts).toHaveLength(2);
    expect(scene.warnings.some((w) => w.code === 'assembly.interference.overlap')).toBe(false);
  }, 60_000);

  it('hints the second-argument form when the overlap is not ignored', async () => {
    const arm = overlappingArm();
    let caught: unknown;
    try {
      await arm.solvedModel({}, { validate: 'error' });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeDefined();
    expect(isKernelError(caught)).toBe(true);
    if (!isKernelError(caught)) return;
    expect(caught.hint).toContain('SECOND argument');
    expect(caught.hint).toContain("solvedModel({}, { ignore: [['a', 'b']] })");
  }, 60_000);

  it('still rejects the first-argument form, proving the hint is accurate', async () => {
    const arm = overlappingArm();
    expect(() => arm.solvedModel({ ignore: [['a', 'b']] } as never))
      .toThrow(/ignore|unknown|not declared|pose/i);
  }, 60_000);
});
