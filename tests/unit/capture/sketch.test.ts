// tests/unit/capture/sketch.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import { runScript } from '../../../src/script-runtime/runScript';

describe('path() builder + Sketch capture', () => {
  beforeAll(async () => { await initOcct(); });

  it('captures a sketch record from path().moveTo().lineTo().close()', async () => {
    const code = `
      const s = path().moveTo(0, 0).lineTo(10, 0).lineTo(10, 5).lineTo(0, 5).close();
      return s.extrude(3);
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    // Expect 2 features: the sketch + the extrude
    expect(result.records).toHaveLength(2);
    expect(result.records[0].kind).toBe('sketch');
    expect(result.records[1].kind).toBe('extrude');
  });

  it('stores commands in sketch metadata', async () => {
    const code = `return path().moveTo(0, 0).lineTo(10, 0).close().extrude(2);`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const sketchRec = result.records.find(r => r.kind === 'sketch')!;
    const commands = (sketchRec.metadata as { commands: unknown[] }).commands;
    expect(commands).toEqual([
      { kind: 'moveTo', x: 0, y: 0 },
      { kind: 'lineTo', x: 10, y: 0 },
      { kind: 'close' },
    ]);
  });

  it('extrude record references the sketch via inputs.sketch', async () => {
    const code = `return path().moveTo(0,0).lineTo(5,0).lineTo(5,5).close().extrude(1);`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const sketchRec = result.records.find(r => r.kind === 'sketch')!;
    const extrudeRec = result.records.find(r => r.kind === 'extrude')!;
    expect(extrudeRec.inputs.sketch).toEqual({ kind: 'feature', id: sketchRec.id });
    expect(extrudeRec.params.profileKind.expression).toBe(`'sketch'`);
    expect(extrudeRec.params.depth.evaluated).toBe(1);
  });

  it('errors at script-runtime when extrude is called on a non-closed path', async () => {
    // Builder enforces close-before-extrude. PathBuilder before .close() has no .extrude() method.
    const code = `return path().moveTo(0, 0).lineTo(10, 0).extrude(2);`;
    // The PathBuilder doesn't expose .extrude; type system prevents this at compile time
    // but at runtime it throws a TypeError ("extrude is not a function").
    // runScript propagates that as a thrown error — catch it and assert no extrude was captured.
    let caughtError: unknown;
    let result;
    try {
      result = await runScript({ code, fileName: 'test.kcad.ts' });
    } catch (e) {
      caughtError = e;
    }
    // Either the script threw (TypeError) or no extrude record was captured.
    const hasExtrudeRecord = result?.records.find(r => r.kind === 'extrude');
    expect(caughtError !== undefined || hasExtrudeRecord === undefined).toBe(true);
  });

  it('captures multiple sketches in one script', async () => {
    const code = `
      const a = path().moveTo(0,0).lineTo(5,0).lineTo(5,5).close().extrude(1);
      const b = path().moveTo(10,0).lineTo(15,0).lineTo(15,5).close().extrude(1);
      return a.union(b);
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const sketchRecs = result.records.filter(r => r.kind === 'sketch');
    expect(sketchRecs).toHaveLength(2);
  });

  it('Sketch.extrude works on the closed sketch', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    // Square 10x10 extruded by 5 → volume 500
    const code = `return path().moveTo(0,0).lineTo(10,0).lineTo(10,10).lineTo(0,10).close().extrude(5);`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const last = result.records[result.records.length - 1];
    expect(r.shapes.get(last.id)!.volume()).toBeCloseTo(500, 1);
  });

  it('captures tangentArc commands', async () => {
    const code = `
      const s = path()
        .moveTo(0, 0)
        .lineTo(10, 0)
        .tangentArc(15, 5)
        .lineTo(15, 15)
        .lineTo(0, 15)
        .close();
      return s.extrude(2);
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const sketchRec = result.records.find(r => r.kind === 'sketch')!;
    const commands = (sketchRec.metadata as { commands: unknown[] }).commands;
    expect(commands).toContainEqual({ kind: 'tangentArc', x: 15, y: 5 });
  });

  it('rejects tangentArc as the first command (would have no prior tangent)', async () => {
    // PathBuilder doesn't enforce this at the type level for v0.13.0-rc.3 — relies on
    // the lowerer's try/catch. The script should still run; the diagnostic should be
    // surfaced when the recompute lowers the sketch.
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    const code = `return path().tangentArc(10, 5).lineTo(10, 0).close().extrude(2);`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.some(d => d.severity === 'error')).toBe(true);
  });
});
