import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../../src/kernel/backends/occt/occtBackend';
import { deriveAcm } from '../../../../../src/modeling/export/srdf/acmDerive';
import { CaptureSession } from '../../../../../src/modeling/capture/captureSession';
import { createApi } from '../../../../../src/modeling/api';

describe('deriveAcm — Task B4.B', () => {
  beforeAll(async () => { await initOcct(); });

  it('emits Adjacent for every link pair sharing a joint', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('a');
    const base = arm.part('base', kcad.box(10, 10, 10), { density: 2700 });
    const upper = arm.part('upper', kcad.box(80, 10, 10), { density: 2700 });
    base.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 10] }, axis: [0, 0, 1] });
    upper.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('shoulder', 'base.shoulder', 'upper.shoulder', 'revolute');
    const r = await deriveAcm(arm, { samplesPerMate: 4, combinatorial: false });
    const adjacent = r.pairs.filter(p => p.reason === 'Adjacent');
    expect(adjacent).toHaveLength(1);
    expect([adjacent[0].link1, adjacent[0].link2].sort()).toEqual(['base', 'upper']);
  });

  it('emits export.srdf.acm-sparse-sampling when samplesPerMate < 4', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('a');
    const base = arm.part('base', kcad.box(10, 10, 10), { density: 2700 });
    const tip = arm.part('tip', kcad.box(10, 10, 10), { density: 2700 });
    base.connector('j', { type: 'axis', origin: { kind: 'vec3', value: [10, 0, 0] }, axis: [0, 0, 1] });
    tip.connector('j', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('j', 'base.j', 'tip.j', 'revolute', { limitsDeg: [-30, 30] });
    const r = await deriveAcm(arm, { samplesPerMate: 1, combinatorial: false });
    expect(r.diagnostics.map(d => d.code)).toContain('export.srdf.acm-sparse-sampling');
  });

  it('user-declared disableCollision takes precedence and uses reason: User', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('a');
    arm.part('a', kcad.box(10, 10, 10), { density: 2700 });
    arm.part('b', kcad.box(10, 10, 10), { density: 2700 });
    arm.disableCollision('a', 'b', { reason: 'User' });
    const r = await deriveAcm(arm, { samplesPerMate: 4, combinatorial: true });
    const pair = r.pairs.find(p => (p.link1 === 'a' && p.link2 === 'b') || (p.link1 === 'b' && p.link2 === 'a'));
    expect(pair?.reason).toBe('User');
  });
});
