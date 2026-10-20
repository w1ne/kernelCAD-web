// Roadster styling study: the front clip is a display overlay over the body.
// Declaring it as an overlay keeps it in the Scene/export but excludes its
// overlaps from the interference gate, without abusing the ignore list.
import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../../src/modeling/api';

function overlappingArm(overlay: boolean) {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const arm = kcad.assembly('car');
  arm
    .part('body', kcad.box(100, 40, 30))
    .connector('o', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
  arm
    .part('front-clip', kcad.box(30, 40, 30), { at: [85, 0, 0], overlay })
    .connector('o', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
  return { session, arm };
}

describe('assembly overlay semantics', () => {
  it('passes the error gate for an intentional display overlay', async () => {
    const { arm } = overlappingArm(true);
    const scene = await arm.solvedModel({}, { validate: 'error' });
    expect(scene.parts.map((p) => p.name).sort()).toEqual(['body', 'front-clip']);
    expect(scene.part('front-clip').metadata?.overlay).toBe(true);
  }, 60_000);

  it('reports the overlay intent instead of a silent ignore', async () => {
    const { arm } = overlappingArm(true);
    const scene = await arm.solvedModel({}, { validate: 'warn' });
    const info = scene.warnings.filter((w) => w.code === 'assembly.overlay.intentional');
    expect(info).toHaveLength(1);
    expect(info[0].severity).toBe('info');
    expect(info[0].partName).toBe('front-clip');
  }, 60_000);

  it('still rejects the same overlap without the overlay declaration', async () => {
    const { arm } = overlappingArm(false);
    await expect(arm.solvedModel({}, { validate: 'error' }))
      .rejects.toThrow(/overlap|interference/i);
  }, 60_000);

  it('records overlay exclusions for model-only assemblies', () => {
    const { arm } = overlappingArm(true);
    arm.model();
    const pairs = arm.__ignoreInterference();
    expect(pairs.some(([a, b]) =>
      (a === 'front-clip' && b === 'body') || (a === 'body' && b === 'front-clip'),
    )).toBe(true);
  });

  it('preserves overlay flags when importing a subassembly', () => {
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    const child = kcad.assembly('clip');
    child.part('shell', kcad.box(30, 40, 30), { overlay: true });
    const parent = kcad.assembly('car');
    parent.part('body', kcad.box(100, 40, 30));
    parent.subAssembly('front', child);
    const imported = parent.__parts().find((p) => p.name === 'front_shell');
    expect(imported?.overlay).toBe(true);
  });

  it('rejects a non-boolean overlay flag at capture time', () => {
    const { kcad, arm } = (() => {
      const session = new CaptureSession();
      const api = createModelingApi({ session });
      return { kcad: api, arm: api.assembly('car') };
    })();
    expect(() =>
      arm.part('bad', kcad.box(1, 1, 1), { overlay: 'yes' } as never),
    ).toThrow(/overlay.*requires a boolean|overlay must be a boolean/i);
  });
});
