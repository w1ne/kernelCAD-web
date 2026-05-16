import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createApi } from '../api';

// v0.6 Task 4: arm.part(name, shape).connector(name, opts) chain method.
//
// Existing v0.5 surface: `partRef.connector(name)` (1-arg) returns an
// `AssemblyConnectorRef` for use in `connect: { to }`. This task overloads
// the same method with a 2-arg form that *registers* a `Connector` (mate-style,
// with `type` + structured `ConnectorOrigin`) on the part and returns the
// part-ref itself for chaining.

describe('arm.part(...).connector(...)', () => {
  it('records a connector on the part', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    const box = kcad.box(10, 10, 10);
    arm.part('p1', box).connector('mountFlange', {
      type: 'frame',
      origin: { kind: 'vec3', value: [0, 0, 5] },
    });

    const scene = arm.model();
    const part = scene.part('p1');
    expect(part.connectors).toHaveLength(1);
    expect(part.connectors![0].name).toBe('mountFlange');
    expect(part.connectors![0].type).toBe('frame');
    expect(part.connectors![0].origin).toEqual({ kind: 'vec3', value: [0, 0, 5] });
  });

  it('throws on duplicate connector name on same part', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    const box = kcad.box(10, 10, 10);
    expect(() =>
      arm.part('p1', box)
        .connector('c', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
        .connector('c', { type: 'frame', origin: { kind: 'vec3', value: [1, 0, 0] } }),
    ).toThrow(/assembly\.connector\.duplicate-name/);
  });
});
