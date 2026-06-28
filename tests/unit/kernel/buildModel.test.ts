import { describe, expect, it, vi } from 'vitest';
import {
  buildModel,
  buildModelFromFile,
  rebuildModelIncremental,
  updateModelParams,
} from '../../../src/modeling/buildModel';
import * as occtLowererModule from '../../../src/modeling/backends/occt/occtLowerer';

describe('buildModel', () => {
  it('builds source into a session, records, shapes, tail shape, and cache', async () => {
    const model = await buildModel({
      fileName: 'plate.kcad.ts',
      code: `
        const w = param('w', 20);
        const plate = box(w, 10, 2);
        return plate;
      `,
    });

    expect(model.records.map(r => r.kind)).toEqual(['box']);
    expect(model.tailId).toBe(model.records.at(-1)?.id);
    expect(model.tailShape).toBeDefined();
    expect(model.shapes.get(model.tailId!)).toBe(model.tailShape);
    expect(model.session.cachedShapes.get(model.tailId!)).toBe(model.tailShape);
    expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  });

  it('surfaces file read failures from buildModelFromFile', async () => {
    await expect(buildModelFromFile({ file: '/tmp/kernelcad-missing-file.kcad.ts' }))
      .rejects.toThrow();
  });

  it('returns recompute diagnostics when lowering fails', async () => {
    const model = await buildModel({
      fileName: 'bad.kcad.ts',
      code: `
        const plate = box(10, 10, 2);
        const bad = plate.fillet(9999);
        return bad;
      `,
    });

    expect(model.records.length).toBeGreaterThan(0);
    expect(model.diagnostics.some(d => d.severity === 'error')).toBe(true);
    expect(model.tailShape).toBeUndefined();
  });

  it('captures build warnings on the returned model and session', async () => {
    const model = await buildModel({
      fileName: 'warning.kcad.ts',
      code: `
        const addCablePort = param('addCablePort', false);
        const profile = path()
          .moveTo(-4, -2)
          .lineTo(4, -2)
          .lineTo(4, 2)
          .lineTo(-4, 2)
          .close();
        const plate = box(40, 20, 4);
        const port = plate.cutout(profile, {
          face: 'front',
          depth: 'through',
          enabled: addCablePort,
          name: 'cablePort',
        });
        const rounded = port.fillet(0.5, { face: 'cablePort.wall' });
        return rounded;
      `,
    });

    expect(model.warnings.some(w => w.hint === 'face-ref.skipped-by-param')).toBe(true);
    expect(model.session.warnings.some(w => w.hint === 'face-ref.skipped-by-param')).toBe(true);
  });

  it('updates params through the headless boundary and preserves relower metadata', async () => {
    const model = await buildModel({
      fileName: 'edit.kcad.ts',
      code: `
        const w = param('w', 20);
        const plate = box(w, 10, 2);
        const rounded = plate.fillet(0.5);
        return rounded;
      `,
    });

    const updated = await updateModelParams(model, [{ name: 'w', value: 30 }]);

    expect(updated.model.session).toBe(model.session);
    expect(updated.result.shape).toBe(updated.model.tailShape);
    expect(updated.result.relowered.length).toBeGreaterThan(0);
    expect(updated.model.session.paramTable.get('w').value).toBe(30);
  });
});

/** Instrument `createOcctLowerer` so a test can observe exactly which record
 *  ids were passed to the lowerer's `.lower()` during a build. Returns a
 *  Set populated as lowering happens and a `restore()` to remove the spy. */
function instrumentLoweredIds(): { loweredIds: Set<string>; restore: () => void } {
  const loweredIds = new Set<string>();
  const spy = vi
    .spyOn(occtLowererModule, 'createOcctLowerer')
    .mockImplementation((session?: Parameters<typeof occtLowererModule.createOcctLowerer>[0]) => {
      // Call through to the real implementation captured before the spy, then
      // wrap `.lower` so the test sees which record ids were actually lowered.
      const lowerer = realCreateOcctLowerer(session);
      const originalLower = lowerer.lower.bind(lowerer);
      lowerer.lower = async (record, ctx) => {
        loweredIds.add(record.id);
        return originalLower(record, ctx);
      };
      return lowerer;
    });
  return { loweredIds, restore: () => spy.mockRestore() };
}

// Captured BEFORE any spy replaces the export, so the spy can call through.
const realCreateOcctLowerer = occtLowererModule.createOcctLowerer;

describe('rebuildModelIncremental', () => {
  const PREFIX = `
    const base = box(20, 20, 5);
    const rounded = base.fillet(1);
    return rounded;
  `;
  // Append-only: identical prefix, one extra feature added at the end, and a
  // new return. The prefix records (box_1, fillet_1) must be byte-identical and
  // mint the same ids, so their cached shapes are reusable.
  const APPENDED = `
    const base = box(20, 20, 5);
    const rounded = base.fillet(1);
    const post = box(4, 4, 30);
    return rounded.union(post);
  `;
  // Mid-model edit: the FIRST feature's params changed (box dims). The prefix
  // structural hash diverges at record 0, so reuse must NOT fire.
  const MID_EDIT = `
    const base = box(25, 20, 5);
    const rounded = base.fillet(1);
    const post = box(4, 4, 30);
    return rounded.union(post);
  `;

  it('(a) reuses the unchanged prefix shapes on an append-only edit', async () => {
    const prev = await buildModel({ fileName: 'm.kcad.ts', code: PREFIX });
    expect(prev.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const prefixIds = prev.records.map(r => r.id);

    const { loweredIds, restore } = instrumentLoweredIds();
    try {
      const next = await rebuildModelIncremental(prev, { fileName: 'm.kcad.ts', code: APPENDED });
      // The prefix records must NOT have been re-lowered (they were seeded from
      // the previous build's cache).
      for (const id of prefixIds) {
        expect(loweredIds.has(id)).toBe(false);
      }
      // The newly-appended records WERE lowered. There is exactly one extra
      // primitive (`post` box) plus the new boolean union.
      const newIds = next.records.map(r => r.id).filter(id => !prefixIds.includes(id));
      expect(newIds.length).toBeGreaterThan(0);
      for (const id of newIds) {
        expect(loweredIds.has(id)).toBe(true);
      }
      // The seeded prefix shapes are reused object-identically.
      for (const id of prefixIds) {
        expect(next.shapes.get(id)).toBe(prev.shapes.get(id));
      }
      expect(next.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    } finally {
      restore();
    }
  });

  it('(b) falls back to a full rebuild on a mid-model edit and lowers the prefix', async () => {
    const prev = await buildModel({ fileName: 'm.kcad.ts', code: PREFIX });
    const prefixIds = prev.records.map(r => r.id);

    const { loweredIds, restore } = instrumentLoweredIds();
    try {
      const next = await rebuildModelIncremental(prev, { fileName: 'm.kcad.ts', code: MID_EDIT });
      // The first record's params changed → the structural hash diverges at
      // record 0 → reuse must not fire → the prefix is re-lowered from scratch.
      expect(loweredIds.has(prefixIds[0])).toBe(true);
      // And the prefix shapes are FRESH objects, not the previous build's.
      expect(next.shapes.get(prefixIds[0])).not.toBe(prev.shapes.get(prefixIds[0]));
      expect(next.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    } finally {
      restore();
    }
  });

  it('(c) incremental and full paths produce identical final geometry for the append case', async () => {
    const prev = await buildModel({ fileName: 'm.kcad.ts', code: PREFIX });
    const incremental = await rebuildModelIncremental(prev, {
      fileName: 'm.kcad.ts',
      code: APPENDED,
    });
    const full = await buildModel({ fileName: 'm.kcad.ts', code: APPENDED });

    // Same record topology.
    expect(incremental.records.map(r => r.id)).toEqual(full.records.map(r => r.id));
    // Same final-shape volume (geometry equivalence proxy). Both root shapes
    // must exist and report the same volume within a tight tolerance.
    expect(incremental.rootShape).toBeDefined();
    expect(full.rootShape).toBeDefined();
    const volA = incremental.rootShape!.volume();
    const volB = full.rootShape!.volume();
    expect(volA).toBeGreaterThan(0);
    expect(Math.abs(volA - volB)).toBeLessThan(1e-6);
    expect(incremental.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(full.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  });
});
