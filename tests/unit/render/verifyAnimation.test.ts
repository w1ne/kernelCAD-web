// tests/unit/render/verifyAnimation.test.ts
//
// Animation-pose interference verification against REAL kernel builds of
// the two animation fixtures:
//   - revolute-sweep.kcad.ts — mechanism-clean at every animated pose;
//   - colliding-sweep.kcad.ts — the arm sweeps through a post at the
//     keyframe-midpoint pose (~45°, tMs=500) but is clear at both keys.
//
// GATE INTEGRITY: the volume threshold assertions import the mechanism-
// validity gate's shared constant (`jointContactCapMm3`) — never a literal —
// so the test can't drift from the gate it mirrors.

import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildModelFromFile } from '../../../src/modeling/buildModel';
import { jointContactCapMm3 } from '../../../src/modeling/runtime/jointContactCap';
import { keyframeSampleSet } from '../../../src/agent/render/animationSampler';
import { verifyAnimation } from '../../../src/agent/render/verifyAnimation';
import type { BuiltModel } from '../../../src/modeling/buildModel';
import type { NormalizedAnimationTrack } from '../../../src/shared/intent/animationViewRecord';

const CLEAN_FIXTURE = 'tests/fixtures/animation/revolute-sweep.kcad.ts';
const COLLIDING_FIXTURE = 'tests/fixtures/animation/colliding-sweep.kcad.ts';

async function buildWithTracks(file: string): Promise<{
  model: BuiltModel;
  tracks: NormalizedAnimationTrack[];
  durationMs: number;
}> {
  const model = await buildModelFromFile({ file });
  expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const anims = model.records.filter((r) => r.kind === 'animationView');
  expect(anims.length).toBeGreaterThan(0);
  const metadata = anims[anims.length - 1].metadata as unknown as {
    tracks: NormalizedAnimationTrack[];
    durationMs: number;
  };
  return { model, tracks: metadata.tracks, durationMs: metadata.durationMs };
}

function paramSnapshot(model: BuiltModel): Record<string, number | boolean> {
  const out: Record<string, number | boolean> = {};
  for (const entry of model.session.paramTable.list()) out[entry.name] = entry.value;
  return out;
}

describe('verifyAnimation', () => {
  it('mechanism-clean fixture: ok, every keyframe-set pose sampled, params restored', async () => {
    const { model, tracks } = await buildWithTracks(CLEAN_FIXTURE);
    const before = paramSnapshot(model);

    const result = await verifyAnimation(model, tracks);

    expect(result.ok).toBe(true);
    expect(result.collisions).toEqual([]);
    expect(result.diagnostics).toEqual([]);
    expect(result.posesSampled).toBe(keyframeSampleSet(tracks).length);
    // Restoration contract: the paramTable shows the pre-verification values.
    expect(paramSnapshot(model)).toEqual(before);
  }, 120_000);

  it('colliding fixture: mid-travel collision reported, rest pose clean, params restored', async () => {
    const { model, tracks, durationMs } = await buildWithTracks(COLLIDING_FIXTURE);
    const before = paramSnapshot(model);
    const cap = jointContactCapMm3();

    const result = await verifyAnimation(model, tracks);

    expect(result.ok).toBe(false);
    expect(result.posesSampled).toBe(keyframeSampleSet(tracks).length);
    expect(result.collisions.length).toBeGreaterThanOrEqual(1);
    for (const c of result.collisions) {
      // Collision strictly mid-travel: never at the rest key (tMs=0) nor at
      // the end key — the deliberate design of the fixture.
      expect(c.tMs).toBeGreaterThan(0);
      expect(c.tMs).toBeLessThan(durationMs);
      // GATE INTEGRITY: threshold from the shared mechanism-gate constant.
      expect(c.volumeMm3).toBeGreaterThan(cap);
      expect([c.a, c.b].sort()).toEqual(['arm', 'base']);
    }
    // NO false collision at the rest pose.
    expect(result.collisions.some((c) => c.tMs === 0)).toBe(false);

    // One animation.collision error per row; message names tMs + both parts
    // + the volume.
    const collisionDiags = result.diagnostics.filter((d) => d.code === 'animation.collision');
    expect(collisionDiags).toHaveLength(result.collisions.length);
    for (let i = 0; i < result.collisions.length; i += 1) {
      const c = result.collisions[i];
      const d = collisionDiags[i];
      expect(d.severity).toBe('error');
      expect(d.message).toContain(`tMs=${c.tMs}`);
      expect(d.message).toContain(`'${c.a}'`);
      expect(d.message).toContain(`'${c.b}'`);
      expect(d.message).toContain('mm³');
    }
    // No pose-solve failures got mixed in.
    expect(result.diagnostics.every((d) => d.code === 'animation.collision')).toBe(true);

    // Restoration contract holds on the failing path too.
    expect(paramSnapshot(model)).toEqual(before);
  }, 120_000);

  it('explicit sampleTimesMs replaces the keyframe set (collision pose excluded → clean)', async () => {
    const { model, tracks, durationMs } = await buildWithTracks(COLLIDING_FIXTURE);

    const result = await verifyAnimation(model, tracks, { sampleTimesMs: [0, durationMs] });

    expect(result.ok).toBe(true);
    expect(result.collisions).toEqual([]);
    expect(result.posesSampled).toBe(2);
  }, 120_000);

  it('ignorePairs silences a known pair (pairKey form)', async () => {
    const { model, tracks } = await buildWithTracks(COLLIDING_FIXTURE);
    const { pairKey } = await import('../../../src/modeling/runtime/detectInterferences');

    const result = await verifyAnimation(model, tracks, {
      ignorePairs: new Set([pairKey('arm', 'base')]),
    });

    expect(result.ok).toBe(true);
    expect(result.collisions).toEqual([]);
  }, 120_000);

  // Gate-hole regression (review fix #1): a script that DECLARES an assembly
  // but returns a plain shape — the wrong return value — must NOT pass
  // silently. Verification can't see the assembly, so it fails closed.
  it('assembly declared but script returns a plain shape → ok:false with cli.invalid-args (gate hole closed)', async () => {
    // Same assembly/mate/track shape as colliding-sweep, but `return arm`
    // (a bare body) instead of `return asm.solvedModel(...)`.
    const PLAIN_RETURN_FIXTURE = `
const armDeg = param('armDeg', 0, { min: 0, max: 90 });
animationView({
  name: 'plain-return',
  fps: 12,
  tracks: [{ param: 'armDeg', keys: [{ atMs: 0, value: 0 }, { atMs: 1000, value: 90 }] }],
});
const base = box(60, 40, 10, true).translate(0, 0, 5).color('plate');
const arm = box(40, 8, 6, true).translate(18, 0, 3).color('gear');
const asm = assembly('plain-return');
const basePart = asm.part('base', base);
basePart.connector('armAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 12] }, axis: [0, 0, 1] });
const armPart = asm.part('arm', arm);
armPart.connector('hub', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
asm.mate('arm-pivot', 'base.armAxis', 'arm.hub', 'revolute', { pose: armDeg, limitsDeg: [0, 90] });
return arm;
`;
    const tmp = mkdtempSync(join(tmpdir(), 'verifyAnimation-gatehole-'));
    const file = join(tmp, 'plain-return.kcad.ts');
    writeFileSync(file, PLAIN_RETURN_FIXTURE);

    const model = await buildModelFromFile({ file });
    expect(model.session.assemblies.size).toBeGreaterThan(0);
    const anims = model.records.filter((r) => r.kind === 'animationView');
    const tracks = (anims[anims.length - 1].metadata as unknown as {
      tracks: NormalizedAnimationTrack[];
    }).tracks;

    const result = await verifyAnimation(model, tracks);

    expect(result.ok).toBe(false);
    const gate = result.diagnostics.find((d) => d.code === 'cli.invalid-args');
    expect(gate).toBeDefined();
    expect(gate!.severity).toBe('error');
    expect(gate!.message).toMatch(/solved scene|plain shape/);
    expect(gate!.message).toContain('cannot see the assembly');
    expect(gate!.hint).toContain('solvedModel');
    // No false collisions invented — the failure is the unresolved-scene gate.
    expect(result.collisions).toEqual([]);
  }, 120_000);

  it('clean fixture still passes (gate-hole guard does not over-fire on a solved scene)', async () => {
    const { model, tracks } = await buildWithTracks(CLEAN_FIXTURE);
    const result = await verifyAnimation(model, tracks);
    expect(result.ok).toBe(true);
    expect(result.diagnostics.every((d) => d.code !== 'cli.invalid-args')).toBe(true);
  }, 120_000);
});
