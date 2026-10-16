// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A bare study label names one face. On box.union(boss) the canonical
// 'top' label is carried by the shoulder (z=10) AND the boss top (z=30); the
// selector used to bind both and silently split the load between them.
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, type OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/modeling/buildModel';
import { resolveSelector } from '../../../src/kernel/fea/faceBinding';

let shape: OcctBackend;
let ctx: { owner: string; records: Awaited<ReturnType<typeof buildModel>>['records'] };

beforeAll(async () => {
  await initOcct();
  const m = await buildModel({ fileName: 'boss.kcad.ts', code: 'return box(40,40,10).union(box(10,10,20).translate(15,15,10));' });
  shape = m.tailShape as OcctBackend;
  ctx = { owner: m.records[m.records.length - 1].id, records: m.records };
}, 60_000);

describe('bare label selectors on a boolean result', () => {
  it("'top' matching two faces is an error listing both, with a selector for each", () => {
    const r = resolveSelector(shape, 'top', ctx);
    expect(r.ok).toBe(false);
    expect(r.ambiguous).toBe(true);
    expect(r.faces.map(f => f.centroid[2]).sort((a, b) => a - b)).toEqual([10, 30]);
    expect(r.error).toMatch(/'top' is ambiguous: 2 faces/);
    expect(r.error).toMatch(/\{ atX: 20, atY: 20, atZ: 30 \}/);
    expect(r.error).toMatch(/\{ atX: 20, atY: 20, atZ: 10 \}/);
    expect(r.error).toMatch(/@kcq\[face\(withLabel\("top"\)\)\]/);
  });

  it('a bare label with one face still binds it', () => {
    const r = resolveSelector(shape, 'bottom', ctx);
    expect(r.ok).toBe(true);
    expect(r.faces).toHaveLength(1);
    expect(r.faces[0].centroid[2]).toBeCloseTo(0);
  });

  it('the suggested disambiguations resolve: one face by point, every face by the explicit query', () => {
    const one = resolveSelector(shape, { atX: 20, atY: 20, atZ: 30 }, ctx);
    expect(one.ok).toBe(true);
    expect(one.faces).toHaveLength(1);
    expect(one.faces[0].centroid[2]).toBeCloseTo(30);
    const all = resolveSelector(shape, '@kcq[face(withLabel("top"))]', ctx);
    expect(all.ok).toBe(true);
    expect(all.faces).toHaveLength(2);
  });
});

describe('bare label split across one plane', () => {
  it("a bridge's two feet are one 'bottom' support (coplanar split faces bind together)", async () => {
    const m = await buildModel({ fileName: 'bridge.kcad.ts', code: 'return box(60,20,10).subtract(box(20,20,5).translate(20,0,0));' });
    const r = resolveSelector(m.tailShape as OcctBackend, 'bottom', { owner: m.records[m.records.length - 1].id, records: m.records });
    expect(r.ok).toBe(true);
    expect(r.ambiguous).toBeUndefined();
    expect(r.faces).toHaveLength(2);
    expect(r.faces.every(f => Math.abs(f.centroid[2]) < 1e-6)).toBe(true);
    expect(r.faces.reduce((s, f) => s + f.area, 0)).toBeCloseTo(2 * 20 * 20, 3);
  });

  it('faces with the same label on parallel but different planes stay ambiguous', async () => {
    const m = await buildModel({ fileName: 'steps.kcad.ts', code: 'return box(80,20,5).union(box(5,20,30).translate(0,0,5)).union(box(5,20,30).translate(75,0,5));' });
    const r = resolveSelector(m.tailShape as OcctBackend, 'top', { owner: m.records[m.records.length - 1].id, records: m.records });
    expect(r.ok).toBe(false);
    expect(r.ambiguous).toBe(true);
  });
});
