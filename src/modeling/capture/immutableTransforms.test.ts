// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// translate / rotate / scale / reflect / color return a NEW Shape and leave
// the receiver untouched. Pins the semantics, the record layout of chained
// scripts (unchanged ids), and the statement-form compatibility pass.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { CaptureSession } from './captureSession';
import { createModelingApi } from '../api';
import { runScript } from '../runtime/runScript';
import { RecomputeEngine } from '../compute/recomputeEngine';
import { createOcctLowerer } from '../backends/occt/occtLowerer';
import type { FeatureRecord } from '../../shared/intent/featureRecord';

beforeAll(async () => {
  await initOcct();
}, 60_000);

const minX = async (shape: { lower(): Promise<{ boundingBox(): { min: number[] } }> }): Promise<number> =>
  (await shape.lower()).boundingBox().min[0];

async function lowerAll(session: CaptureSession, records: readonly FeatureRecord[]) {
  const engine = new RecomputeEngine(createOcctLowerer(session));
  return engine.run(records, { paramTable: session.paramTable });
}

describe('immutable shape transforms', () => {
  it('const b = a.translate(…) leaves a where it was', async () => {
    const session = new CaptureSession();
    const k = createModelingApi({ session });
    const a = k.box(10, 10, 10);
    const b = a.translate(50, 0, 0);
    expect(b).not.toBe(a);
    expect(await minX(b)).toBeCloseTo(50, 6);
    expect(await minX(a)).toBeCloseTo(0, 6);
  });

  it('a lowers to the same geometry whether or not it was translated from', async () => {
    const plain = new CaptureSession();
    const kp = createModelingApi({ session: plain });
    const before = (await kp.box(10, 20, 30).rotate([0, 0, 1], 30).lower()).boundingBox();

    const session = new CaptureSession();
    const k = createModelingApi({ session });
    const a = k.box(10, 20, 30).rotate([0, 0, 1], 30);
    a.translate(100, 0, 0).scale(2);
    const after = (await a.lower()).boundingBox();
    for (let i = 0; i < 3; i += 1) {
      expect(after.min[i]).toBeCloseTo(before.min[i], 6);
      expect(after.max[i]).toBeCloseTo(before.max[i], 6);
    }
  });

  it('two placements from one base are two shapes (no last-wins aliasing)', async () => {
    const session = new CaptureSession();
    const k = createModelingApi({ session });
    const wheel = k.cylinder(4, 10);
    const left = wheel.translate(-30, 0, 0);
    const right = wheel.translate(30, 0, 0);
    const car = k.box(40, 10, 10, true).union(left, right);
    const box = (await car.lower()).boundingBox();
    expect(box.min[0]).toBeCloseTo(-40, 6);
    expect(box.max[0]).toBeCloseTo(40, 6);
  });

  it('mirror-and-union keeps both halves', async () => {
    const session = new CaptureSession();
    const k = createModelingApi({ session });
    const half = k.box(10, 10, 10).translate(5, 0, 0);
    const whole = half.union(half.reflect('yz'));
    const box = (await whole.lower()).boundingBox();
    expect(box.min[0]).toBeCloseTo(-15, 6);
    expect(box.max[0]).toBeCloseTo(15, 6);
  });

  it('a chain stays on one record, so ids and refs are unchanged', () => {
    const session = new CaptureSession();
    const k = createModelingApi({ session });
    const part = k.box(10, 10, 10).translate(1, 2, 3).rotate([0, 0, 1], 45).scale(2).color('#ff0000');
    const records = session.getRecords();
    expect(records).toHaveLength(1);
    expect(part.id).toBe(records[0].id);
    expect(records[0].transforms.map((t) => t.op)).toEqual(['translate', 'rotateAxis', 'scale']);
    expect(records[0].metadata?.color).toBe('#ff0000');
  });

  it('color returns a new shape; the receiver keeps its colour', () => {
    const session = new CaptureSession();
    const k = createModelingApi({ session });
    const base = k.box(10, 10, 10).color('#00ff00');
    const red = base.color('#ff0000');
    const records = session.getRecords();
    const colorOf = (id: string) => records.find((r) => r.id === id)?.metadata?.color;
    expect(colorOf(red.id)).toBe('#ff0000');
    expect(colorOf(base.id)).toBe('#00ff00');
  });

  it('a transform after the shape was consumed does not move the consumer', async () => {
    const session = new CaptureSession();
    const k = createModelingApi({ session });
    const pin = k.cylinder(2, 10);
    const plate = k.box(20, 20, 4).subtract(pin.translate(10, 10, -1));
    const moved = pin.translate(100, 0, 0);
    const lowered = await lowerAll(session, session.getRecords());
    expect(lowered.shapes.get(plate.id)).toBeDefined();
    expect((await minX(moved)) - (await minX(pin))).toBeCloseTo(100, 6);
    expect((await plate.lower()).boundingBox().max[0]).toBeCloseTo(20, 6);
  });
});

describe('statement-form compatibility (runScript)', () => {
  it('p.translate(…) as a statement still moves p, with a warning', async () => {
    const { session, returnValue } = await runScript({
      code: [
        'const p = box(10, 10, 10);',
        'p.translate(50, 0, 0);',
        'return p.union(box(1, 1, 1));',
      ].join('\n'),
      fileName: 'statement.kcad.ts',
    });
    const result = returnValue as { lower(): Promise<{ boundingBox(): { max: number[] } }> };
    expect((await result.lower()).boundingBox().max[0]).toBeCloseTo(60, 6);
    expect(session.warnings.some((w) => w.code === 'script.discarded-transform')).toBe(true);
  });

  it('p.color(…) as a statement keeps the colour on p', async () => {
    const { session, returnValue } = await runScript({
      code: [
        'const p = box(10, 10, 10);',
        "p.color('#2a6cbd');",
        'return p;',
      ].join('\n'),
      fileName: 'statement-color.kcad.ts',
    });
    const id = (returnValue as { id: string }).id;
    expect(session.getRecords().find((r) => r.id === id)?.metadata?.color).toBe('#2a6cbd');
    expect(session.getRecords().filter((r) => r.kind === 'box')).toHaveLength(1);
  });

  it('an assigned result is not folded back', async () => {
    const { session, returnValue } = await runScript({
      code: [
        'const a = box(10, 10, 10);',
        'const b = a.translate(50, 0, 0);',
        'return a.union(b);',
      ].join('\n'),
      fileName: 'assigned.kcad.ts',
    });
    const result = returnValue as { lower(): Promise<{ boundingBox(): { min: number[]; max: number[] } }> };
    const box = (await result.lower()).boundingBox();
    expect(box.min[0]).toBeCloseTo(0, 6);
    expect(box.max[0]).toBeCloseTo(60, 6);
    expect(session.warnings.some((w) => w.code === 'script.discarded-transform')).toBe(false);
  });
});
