// tests/integration/v0.3-slice3-edit-numeric.test.ts
//
// Phase-3 integration test: end-to-end edit-after-build for numeric params.
// Build parametric plate, edit boltDia, verify final shape volume reflects
// new diameter; verify relowered/skipped granularity is correct.

import { describe, it, expect, beforeAll } from 'vitest';
import { runScript } from '../../src/modeling/runtime/runScript';
import { initOcct } from '../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../src/modeling/capture/captureSession';
import { createApi } from '../../src/modeling/api';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';

// Slice 2E: `session.params.update` requires an engine attached to the session
// (normally done by `buildModel`). Tests that drive `CaptureSession` directly
// must attach one manually.
function attachEngine(session: CaptureSession): void {
  session.setEngine(new RecomputeEngine(createOcctLowerer(session)));
}

describe('v0.3 slice-3 — params.update on numeric param', () => {
  beforeAll(async () => { await initOcct(); });

  it('edits boltDia and re-lowers only affected records', async () => {
    const session = new CaptureSession();
    attachEngine(session);
    const api = createApi({ session });
    const dia = api.param('boltDia', 5, { min: 1, max: 20 });
    const plate = api.box(60, 40, 5).hole('top', { u: 0, v: 0, diameter: dia, depth: 'through' });

    // Initial build to populate cache.
    const initialShape = await plate.lower();
    const initialVolume = initialShape.volume();
    expect(initialVolume).toBeGreaterThan(0);
    // Cache populated for both records (box + hole).
    expect(session.cachedShapes.size).toBe(2);

    // Edit the param: boltDia 5 → 10. Volume should DECREASE (bigger hole).
    const result = await session.params.update([{ name: 'boltDia', value: 10 }]);
    const editedVolume = result.shape.volume();
    expect(editedVolume).toBeLessThan(initialVolume);

    // The hole record references boltDia; box record does not.
    // So skipped = [box], relowered = [hole].
    const records = session.getRecords();
    const boxId = records.find(r => r.kind === 'box')!.id;
    const holeId = records.find(r => r.kind === 'hole')!.id;
    expect(result.skipped).toContain(boxId);
    expect(result.relowered).toContain(holeId);
    expect(result.warnings).toEqual([]);
  });

  it('multi-edit applies atomically and re-lowers from earliest affected', async () => {
    const session = new CaptureSession();
    attachEngine(session);
    const api = createApi({ session });
    const w = api.param('w', 60);
    const dia = api.param('boltDia', 5);
    const plate = api.box(w, 40, 5).hole('top', { u: 0, v: 0, diameter: dia, depth: 'through' });

    await plate.lower();
    const result = await session.params.update([
      { name: 'w', value: 80 },
      { name: 'boltDia', value: 6 },
    ]);
    // 'w' is referenced by record 0 (box); both records re-lower.
    const records = session.getRecords();
    expect(result.relowered).toEqual([records[0].id, records[1].id]);
    expect(result.skipped).toEqual([]);
  });

  it('edit of unreferenced param re-lowers nothing', async () => {
    const session = new CaptureSession();
    attachEngine(session);
    const api = createApi({ session });
    api.param('orphan', 99); // declared but unused
    const w = api.param('w', 60);
    const plate = api.box(w, 40, 5);

    await plate.lower();
    const result = await session.params.update([{ name: 'orphan', value: 50 }]);
    expect(result.relowered).toEqual([]);
    expect(result.skipped).toEqual(session.getRecords().map(r => r.id));
  });

  it('rejects edit with unknown name (atomic — no edits apply)', async () => {
    const session = new CaptureSession();
    attachEngine(session);
    const api = createApi({ session });
    api.param('boltDia', 5);
    api.box(60, 40, 5);

    await expect(session.params.update([
      { name: 'boltDia', value: 6 },
      { name: 'mystery', value: 1 },
    ])).rejects.toThrow();
    // boltDia should NOT have been changed (atomic validation-then-apply).
    expect(session.paramTable.get('boltDia').value).toBe(5);
  });

  it('rejects edit out-of-range and atomically rolls back', async () => {
    const session = new CaptureSession();
    attachEngine(session);
    const api = createApi({ session });
    api.param('boltDia', 5, { min: 1, max: 10 });
    let err: unknown;
    try { await session.params.update([{ name: 'boltDia', value: 20 }]); } catch (e) { err = e; }
    expect((err as { hint?: string }).hint).toContain('value-out-of-range');
    expect(session.paramTable.get('boltDia').value).toBe(5);
  });

  it('rejects edit with type-mismatch', async () => {
    const session = new CaptureSession();
    attachEngine(session);
    const api = createApi({ session });
    api.param('toggle', true);
    let err: unknown;
    try {
      await session.params.update([
        { name: 'toggle', value: 5 as unknown as boolean },
      ]);
    } catch (e) { err = e; }
    expect((err as { hint?: string }).hint).toContain('type-mismatch');
  });

  it('params.list returns current entries', async () => {
    const session = new CaptureSession();
    attachEngine(session);
    const api = createApi({ session });
    api.param('a', 5, { min: 1, max: 10 });
    api.param('b', true);
    const list = session.params.list();
    expect(list).toHaveLength(2);
    expect(list.find(e => e.name === 'a')?.value).toBe(5);
    expect(list.find(e => e.name === 'b')?.value).toBe(true);
  });
});
