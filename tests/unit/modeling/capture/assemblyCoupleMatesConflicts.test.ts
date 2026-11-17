import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../../src/modeling/api';

// A coupling sets driven = ratio * source + offset. A mate coupled to itself,
// a mate driven by two couplings, or a closed loop of couplings has no single
// pose, so coupleMates must reject it when it is declared. Before this check
// the pose expansion kept the first coupling and dropped the second one
// without a diagnostic.
describe('coupleMates conflicting couplings', () => {
  function makeTrain() {
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    const arm = kcad.assembly('train');
    const axis = (x: number) => ({ type: 'axis' as const, origin: { kind: 'vec3' as const, value: [x, 0, 0] as [number, number, number] }, axis: [0, 0, 1] as [number, number, number] });
    arm.part('base', kcad.box(60, 10, 2))
      .connector('a', axis(0))
      .connector('b', axis(20))
      .connector('c', axis(40));
    for (const g of ['g1', 'g2', 'g3']) arm.part(g, kcad.cylinder(5, 2)).connector('axis', axis(0));
    arm.mate('input', 'base.a', 'g1.axis', 'revolute');
    arm.mate('idler', 'base.b', 'g2.axis', 'revolute');
    arm.mate('output', 'base.c', 'g3.axis', 'revolute');
    return arm;
  }

  it('rejects a mate coupled to itself', () => {
    const arm = makeTrain();
    expect(() => arm.coupleMates('idler', { source: 'idler', ratio: 2 })).toThrow(/cannot drive its own pose/);
    expect(arm.__mateCouplings()).toEqual([]);
  });

  it('rejects a second coupling for a mate that is already driven', () => {
    const arm = makeTrain();
    arm.coupleMates('output', { source: 'input', ratio: 2 });
    expect(() => arm.coupleMates('output', { source: 'idler', ratio: -1 }))
      .toThrow(/output.*already driven by 'input'/s);
    expect(arm.__mateCouplings()).toHaveLength(1);
  });

  it('rejects a coupling that closes a loop', () => {
    const arm = makeTrain();
    arm.coupleMates('idler', { source: 'input', ratio: -2 });
    arm.coupleMates('output', { source: 'idler', ratio: -0.5 });
    expect(() => arm.coupleMates('input', { source: 'output', ratio: 1 }))
      .toThrow(/input <- output <- idler <- input/);
    expect(arm.__mateCouplings()).toHaveLength(2);
  });

  it('accepts a fan-out and a chain declared in any order', () => {
    const arm = makeTrain();
    arm.coupleMates('output', { source: 'idler', ratio: -0.5 });
    arm.coupleMates('idler', { source: 'input', ratio: -2 });
    const fan = makeTrain();
    fan.coupleMates('idler', { source: 'input', ratio: 1 });
    fan.coupleMates('output', { source: 'input', ratio: -1 });
    expect(arm.__mateCouplings()).toHaveLength(2);
    expect(fan.__mateCouplings()).toHaveLength(2);
  });
});
