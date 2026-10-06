// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createModelingApi } from '../api';
import { computeGeometryKeys, digest } from './geometryIdentity';
import { stepContentSha256 } from '../parts/stepParseCache';

type Kc = ReturnType<typeof createModelingApi>;

function capture(build: (kc: Kc) => void) {
  const session = new CaptureSession();
  const kc = createModelingApi({ session });
  build(kc);
  const records = session.getRecords();
  return { session, records, keys: computeGeometryKeys(records, session.paramTable) };
}

/** A "rack" helper: plate minus a hole, translated. Same call = same recipe. */
function bracket(kc: Kc, holeR = 2, dx = 0) {
  return kc.box(40, 20, 4).subtract(kc.cylinder(10, holeR).translate(10, 10, -1)).translate(dx, 0, 0);
}

describe('computeGeometryKeys', () => {
  it('gives identical recipes built in a loop the same non-null key', () => {
    const ids: string[] = [];
    const { keys } = capture((kc) => { for (let i = 0; i < 3; i++) ids.push(bracket(kc).id); });
    const k = ids.map((id) => keys.get(id));
    expect(k[0]).toBeDefined();
    expect(k[1]).toBe(k[0]);
    expect(k[2]).toBe(k[0]);
  });

  it('changes the key when a param, a transform or an input changes', () => {
    const ids: Record<string, string> = {};
    const { keys } = capture((kc) => {
      ids.base = bracket(kc).id;
      ids.param = kc.box(40, 20, 5).subtract(kc.cylinder(10, 2).translate(10, 10, -1)).id;
      ids.transform = bracket(kc, 2, 1).id;
      ids.input = bracket(kc, 3).id;
    });
    const base = keys.get(ids.base);
    expect(keys.get(ids.param)).not.toBe(base);
    expect(keys.get(ids.transform)).not.toBe(base);
    expect(keys.get(ids.input)).not.toBe(base);
  });

  it('resolves param refs against the param table (value change => key change)', () => {
    const session = new CaptureSession();
    const kc = createModelingApi({ session });
    const w = kc.param('w', 10);
    const a = kc.box(w, 10, 10);
    const b = kc.box(w, 10, 10);
    const before = computeGeometryKeys(session.getRecords(), session.paramTable);
    expect(before.get(a.id)).toBe(before.get(b.id));
    session.paramTable.set('w', 12);
    const after = computeGeometryKeys(session.getRecords(), session.paramTable);
    expect(after.get(a.id)).toBe(after.get(b.id));
    expect(after.get(a.id)).not.toBe(before.get(a.id));
  });

  it('ignores appearance metadata (color) but not geometry', () => {
    const ids: string[] = [];
    const { keys } = capture((kc) => {
      ids.push(kc.box(10, 10, 10).color('#ff0000').id);
      ids.push(kc.box(10, 10, 10).color('#00ff00').id);
    });
    expect(keys.get(ids[0])).toBeDefined();
    expect(keys.get(ids[1])).toBe(keys.get(ids[0]));
  });

  it('returns no key for a suppressed record or anything downstream of it', () => {
    const ids: string[] = [];
    const { records, session } = capture((kc) => {
      const b = kc.box(10, 10, 10);
      ids.push(b.id, b.subtract(kc.cylinder(20, 1)).id);
    });
    const mutable = records.map((r) => (r.id === ids[0] ? { ...r, suppressed: true } : r));
    const keys = computeGeometryKeys(mutable, session.paramTable);
    expect(keys.has(ids[0])).toBe(false);
    expect(keys.has(ids[1])).toBe(false);
  });

  it('returns no key for kinds off the allow-list (virtual reference image)', () => {
    const { records, keys } = capture((kc) => {
      kc.box(10, 10, 10);
    });
    const virtualRecord = { ...records[0], id: 'referenceImage_1', kind: 'referenceImage' as const, metadata: { virtual: true } };
    const k2 = computeGeometryKeys([...records, virtualRecord], undefined);
    expect(k2.has('referenceImage_1')).toBe(false);
    expect(keys.has(records[0].id)).toBe(true);
  });

  it('is independent of params key insertion order', () => {
    const { records } = capture((kc) => { kc.box(10, 20, 30); });
    const r = records[0];
    const reordered = { ...r, params: Object.fromEntries(Object.entries(r.params).reverse()) };
    const a = computeGeometryKeys([r], undefined).get(r.id);
    const b = computeGeometryKeys([reordered], undefined).get(r.id);
    expect(a).toBeDefined();
    expect(b).toBe(a);
  });

  it('keys assembly parts by their source geometry only (name and at ignored)', () => {
    const parts: string[] = [];
    const { keys } = capture((kc) => {
      const arm = kc.assembly('row');
      for (let i = 0; i < 3; i++) parts.push(arm.part(`rack-${i}`, bracket(kc), { at: [i * 100, 0, 0] }).id);
      parts.push(arm.part('odd', bracket(kc, 3), { at: [400, 0, 0] }).id);
      arm.model();
    });
    expect(keys.get(parts[1])).toBe(keys.get(parts[0]));
    expect(keys.get(parts[2])).toBe(keys.get(parts[0]));
    expect(keys.get(parts[3])).not.toBe(keys.get(parts[0]));
  });

  it('digest is deterministic and 28 hex chars', () => {
    expect(digest('abc')).toBe(digest('abc'));
    expect(digest('abc')).not.toBe(digest('abd'));
    expect(digest('abc')).toMatch(/^[0-9a-f]{28}$/);
  });
});

describe('importedStep identity', () => {
  it('keys an importedStep only when it carries a content hash', () => {
    const base = {
      kind: 'importedStep' as const, params: {}, inputs: {}, transforms: [], suppressed: false,
    };
    const withHash = { ...base, id: 'importedStep_1', metadata: { sourcePath: '/a.step', contentSha256: stepContentSha256(Buffer.from('x')) } };
    const without = { ...base, id: 'importedStep_2', metadata: { sourcePath: '/a.step' } };
    const keys = computeGeometryKeys([withHash, without], undefined);
    expect(keys.has('importedStep_1')).toBe(true);
    expect(keys.has('importedStep_2')).toBe(false);
  });
});

describe('torus key', () => {
  it('keys torus recipes by their params', () => {
    const ids: string[] = [];
    const { keys } = capture((kc) => {
      ids.push(kc.torus(20, 3).id, kc.torus(20, 3).id, kc.torus(20, 4).id);
    });
    expect(keys.get(ids[0])).toBeDefined();
    expect(keys.get(ids[1])).toBe(keys.get(ids[0]));
    expect(keys.get(ids[2])).not.toBe(keys.get(ids[0]));
  });
});
