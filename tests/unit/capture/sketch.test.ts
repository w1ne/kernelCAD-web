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

  it('Sketch.revolve registers a revolve feature with inputs.sketch and profileKind sketch', async () => {
    const code = `return path().moveTo(10, 0).lineTo(20, 0).lineTo(20, 5).lineTo(10, 5).close().revolve();`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    // Expect 2 features: the sketch + the revolve
    expect(result.records).toHaveLength(2);
    const sketchRec = result.records.find(r => r.kind === 'sketch')!;
    const revolveRec = result.records.find(r => r.kind === 'revolve')!;
    expect(revolveRec).toBeDefined();
    expect(revolveRec.inputs.sketch).toEqual({ kind: 'feature', id: sketchRec.id });
    expect(revolveRec.params.profileKind.expression).toBe(`'sketch'`);
  });

  it('Sketch.revolve with tangentArc profile preserves commands on the sketch', async () => {
    const code = `
      const s = path()
        .moveTo(20, 0)
        .lineTo(20, 60)
        .tangentArc(25, 80)
        .lineTo(0, 80)
        .lineTo(0, 0)
        .close();
      return s.revolve();
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const sketchRec = result.records.find(r => r.kind === 'sketch')!;
    const commands = (sketchRec.metadata as { commands: unknown[] }).commands;
    expect(commands).toContainEqual({ kind: 'tangentArc', x: 25, y: 80 });
    expect(result.records.find(r => r.kind === 'revolve')).toBeDefined();
  });

  it('emits feature.revolve.crosses-axis when profile has x < 0', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    const code = `
      return path()
        .moveTo(-1, 0)
        .lineTo(10, 0)
        .lineTo(10, 5)
        .lineTo(-1, 5)
        .close()
        .revolve();
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.some(d => d.code === 'feature.revolve.crosses-axis' && d.severity === 'error')).toBe(true);
  });

  it('rejects revolve on a degenerate (no-segment) profile', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    // moveTo+close (no line segments) — area is zero. Either the sketch fails
    // to lower (Replicad rejects degenerate drawing) or the revolve validator
    // catches it. Both are valid rejection paths for an empty profile.
    const code = `return path().moveTo(0, 0).close().revolve();`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.some(d =>
      (d.code === 'feature.revolve.empty-profile' || d.code === 'feature.sketch.failed')
      && d.severity === 'error'
    )).toBe(true);
  });

  it('Sketch.revolve produces a valid solid for a washer profile', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    const code = `
      return path()
        .moveTo(10, 0)
        .lineTo(20, 0)
        .lineTo(20, 5)
        .lineTo(10, 5)
        .close()
        .revolve();
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const last = result.records[result.records.length - 1];
    const v = r.shapes.get(last.id)!.volume();
    expect(v).toBeGreaterThan(4500);
    expect(v).toBeLessThan(4900);
  });

  it('captures threePointsArc with end and midpoint', async () => {
    const code = `
      const s = path().moveTo(0, 0).threePointsArc(20, 0, 10, 5).close();
      return s.extrude(1);
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const sketchRec = result.records.find(r => r.kind === 'sketch')!;
    const commands = (sketchRec.metadata as { commands: unknown[] }).commands;
    expect(commands).toContainEqual({ kind: 'threePointsArc', x: 20, y: 0, midX: 10, midY: 5 });
  });

  it('captures sagittaArc with chord endpoint and bulge', async () => {
    const code = `return path().moveTo(0, 0).sagittaArc(20, 0, 5).close().extrude(1);`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const sketchRec = result.records.find(r => r.kind === 'sketch')!;
    const commands = (sketchRec.metadata as { commands: unknown[] }).commands;
    expect(commands).toContainEqual({ kind: 'sagittaArc', x: 20, y: 0, sagitta: 5 });
  });

  it('captures bulgeArc with chord endpoint and DXF bulge factor', async () => {
    const code = `return path().moveTo(0, 0).bulgeArc(20, 0, 0.5).close().extrude(1);`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const sketchRec = result.records.find(r => r.kind === 'sketch')!;
    const commands = (sketchRec.metadata as { commands: unknown[] }).commands;
    expect(commands).toContainEqual({ kind: 'bulgeArc', x: 20, y: 0, bulge: 0.5 });
  });

  it('captures radiusArc with chord endpoint and radius', async () => {
    const code = `return path().moveTo(0, 0).radiusArc(20, 0, 15).close().extrude(1);`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const sketchRec = result.records.find(r => r.kind === 'sketch')!;
    const commands = (sketchRec.metadata as { commands: unknown[] }).commands;
    expect(commands).toContainEqual({ kind: 'radiusArc', x: 20, y: 0, radius: 15 });
  });

  it('emits feature.sketch.degenerate-arc when radiusArc has invalid radius', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    // chord 20, radius 5 → 5 < 10 → degenerate
    const code = `return path().moveTo(0, 0).radiusArc(20, 0, 5).close().extrude(1);`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.some(d =>
      d.code === 'feature.sketch.degenerate-arc' && d.severity === 'error'
    )).toBe(true);
  });

  it('Shape.fillet captures EdgeQuery as edge ref (kind: query)', async () => {
    const code = `return box(10, 10, 5).fillet(1, { atZ: 5 });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const filletRec = result.records.find(r => r.kind === 'fillet')!;
    expect(filletRec.inputs.edges).toEqual({
      kind: 'edge',
      featureId: expect.any(String),
      ref: { kind: 'query', query: { atZ: 5 } },
    });
  });

  it('Shape.fillet captures multi-key EdgeQuery faithfully', async () => {
    const code = `return box(10, 10, 5).fillet(1, { atZ: 5, parallel: [1, 0, 0] });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const filletRec = result.records.find(r => r.kind === 'fillet')!;
    const ref = filletRec.inputs.edges as { kind: 'edge'; ref: { kind: 'query'; query: unknown } };
    expect(ref.ref.query).toEqual({ atZ: 5, parallel: [1, 0, 0] });
  });

  it('Shape.fillet captures { face: "topRim" } as label face ref', async () => {
    const code = `return box(10, 10, 5).fillet(1, { face: 'topRim' });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const filletRec = result.records.find(r => r.kind === 'fillet')!;
    expect(filletRec.inputs.face).toEqual({
      kind: 'face',
      featureId: expect.any(String),
      ref: { kind: 'label', name: 'topRim' },
    });
  });

  it('Shape.fillet still captures canonical face refs unchanged for canonical names', async () => {
    const code = `return box(10, 10, 5).fillet(1, { face: 'top' });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const filletRec = result.records.find(r => r.kind === 'fillet')!;
    expect(filletRec.inputs.face).toEqual({
      kind: 'face',
      featureId: expect.any(String),
      ref: { kind: 'canonical', face: 'top' },
    });
  });

  it('box.fillet(1, { atZ: 5 }) produces a filleted solid (volume reduced from 500)', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    const code = `return box(10, 10, 5).fillet(1, { atZ: 5 });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const last = result.records[result.records.length - 1];
    const v = r.shapes.get(last.id)!.volume();
    // Original 10x10x5 = 500; fillet on 4 top edges removes ~ 4 × ((1×1) − π/4) × 10 ≈ 8.6 mm³
    expect(v).toBeGreaterThan(490);
    expect(v).toBeLessThan(499);
  });

  it('box.fillet(1, { atZ: 999 }) emits feature.edge-feature.no-edges-match', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    const code = `return box(10, 10, 5).fillet(1, { atZ: 999 });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.some(d =>
      d.code === 'feature.edge-feature.no-edges-match' && d.severity === 'error'
    )).toBe(true);
  });

  it('box.fillet(1, { face: "top" }) (canonical) still works after EdgeSelector widening', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    const code = `return box(10, 10, 5).fillet(1, { face: 'top' });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const last = result.records[result.records.length - 1];
    expect(r.shapes.get(last.id)!.volume()).toBeGreaterThan(490);
  });

  it('PathBuilder.label() records label on the previous segment', async () => {
    const code = `
      const s = path().moveTo(0,0).lineTo(10, 0).label('bottom').close();
      return s.extrude(2);
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const sketchRec = result.records.find(r => r.kind === 'sketch')!;
    const commands = (sketchRec.metadata as { commands: Array<{ kind: string; label?: string }> }).commands;
    const lineToCmd = commands.find(c => c.kind === 'lineTo');
    expect(lineToCmd?.label).toBe('bottom');
  });

  it('PathBuilder.label() works after tangentArc / arc commands', async () => {
    const code = `
      const s = path().moveTo(0,0).lineTo(10,0).tangentArc(15,5).label('curve').close();
      return s.extrude(2);
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const sketchRec = result.records.find(r => r.kind === 'sketch')!;
    const commands = (sketchRec.metadata as { commands: Array<{ kind: string; label?: string }> }).commands;
    const arc = commands.find(c => c.kind === 'tangentArc');
    expect(arc?.label).toBe('curve');
  });

  it('PathBuilder.label() throws when called as the first command (no segment)', async () => {
    const code = `return path().label('orphan').moveTo(0,0).lineTo(5,0).close().extrude(1);`;
    let caught: unknown;
    try {
      await runScript({ code, fileName: 'test.kcad.ts' });
    } catch (e) { caught = e; }
    expect(String(caught)).toMatch(/label.*must follow a segment/i);
  });

  it('PathBuilder.label() throws when called immediately after moveTo', async () => {
    const code = `return path().moveTo(0,0).label('orphan').lineTo(5,0).close().extrude(1);`;
    let caught: unknown;
    try {
      await runScript({ code, fileName: 'test.kcad.ts' });
    } catch (e) { caught = e; }
    expect(String(caught)).toMatch(/label.*must follow a segment/i);
  });

  it('PathBuilder.label() throws on duplicate label name within one sketch', async () => {
    const code = `
      return path().moveTo(0,0)
        .lineTo(5,0).label('side')
        .lineTo(5,5).label('side')
        .lineTo(0,5).close().extrude(1);
    `;
    let caught: unknown;
    try {
      await runScript({ code, fileName: 'test.kcad.ts' });
    } catch (e) { caught = e; }
    expect(String(caught)).toMatch(/already used/i);
  });

  it('Sketch extrude + fillet by non-canonical label produces correct filleted solid', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    // Use a non-canonical label name ('topRim') so it doesn't collide with canonical 'top'.
    const code = `
      return path().moveTo(0,0)
        .lineTo(10,0).label('bottomEdge')
        .lineTo(10,5)
        .lineTo(0,5).label('topRim')
        .close()
        .extrude(3)
        .fillet(1, { face: 'topRim' });
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const last = result.records[result.records.length - 1];
    // Original area = 10x5 = 50, depth 3 -> volume 150. Fillet reduces.
    const v = r.shapes.get(last.id)!.volume();
    expect(v).toBeGreaterThan(140);
    expect(v).toBeLessThan(150);
  });
});
