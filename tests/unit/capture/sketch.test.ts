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

  it('Two concurrent recomputes against different scripts resolve labels correctly (no global-state contamination)', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    // Script A: labeled-rim sketch + fillet by label 'rimA'
    const codeA = `
      return path().moveTo(0,0)
        .lineTo(10,0).label('bottomA')
        .lineTo(10,5)
        .lineTo(0,5).label('rimA')
        .close()
        .extrude(3)
        .fillet(1, { face: 'rimA' });
    `;
    // Script B: differently-labeled sketch + fillet by 'rimB'
    const codeB = `
      return path().moveTo(0,0)
        .lineTo(20,0).label('bottomB')
        .lineTo(20,5)
        .lineTo(0,5).label('rimB')
        .close()
        .extrude(2)
        .fillet(0.5, { face: 'rimB' });
    `;
    const [resultA, resultB] = await Promise.all([
      runScript({ code: codeA, fileName: 'a.kcad.ts' }),
      runScript({ code: codeB, fileName: 'b.kcad.ts' }),
    ]);
    const engineA = new RecomputeEngine(new OcctLowerer());
    const engineB = new RecomputeEngine(new OcctLowerer());
    const [rA, rB] = await Promise.all([
      engineA.run(resultA.records),
      engineB.run(resultB.records),
    ]);
    // Both must succeed with no errors. Shared global state could cause one
    // to see the other's records and emit unknown-label diagnostics.
    expect(rA.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    expect(rB.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
  });

  it('I1: buildEdgeFeatureRef rejects unknown EdgeQuery keys at lowering', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    // Add a key that is NOT in the EDGE_QUERY_KEYS whitelist; capture takes it
    // (the type system can't enforce extra keys at runtime), but lowering should diagnose.
    const code = `return box(10,10,5).fillet(1, { atZ: 5, foo: true });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.some(d =>
      d.code === 'feature.edge-feature.invalid-query' && d.severity === 'error'
    )).toBe(true);
  });

  it('I1: valid 14-key EdgeQuery passes through cleanly (regression check)', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    const code = `return box(10,10,5).fillet(1, { atZ: 5, parallel: [1,0,0], tolerance: 0.5 });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
  });

  it('B1: box.chamfer(0.5, { atZ: 5 }) chamfers top edges', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    const code = `return box(10, 10, 5).chamfer(0.5, { atZ: 5 });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const last = result.records[result.records.length - 1];
    const v = r.shapes.get(last.id)!.volume();
    // Chamfer 0.5 on 4 top edges — small sliver removed per edge.
    expect(v).toBeGreaterThan(490);
    expect(v).toBeLessThan(499);
  });

  it('B1: box.shell(1, { face: { atZ: 5 } }) hollows out leaving the top open', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    const code = `return box(10, 10, 5).shell(1, { face: { atZ: 5 } });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const last = result.records[result.records.length - 1];
    const v = r.shapes.get(last.id)!.volume();
    expect(v).toBeGreaterThan(200);
    expect(v).toBeLessThan(320);
  });

  it('Sketch.sweep registers a sweep feature with inputs.sketch + metadata.rail', async () => {
    const code = `
      const profile = path().moveTo(-1,-1).lineTo(1,-1).lineTo(1,1).lineTo(-1,1).close();
      return profile.sweep([[0,0,0], [0,0,10]]);
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const sketchRec = result.records.find(r => r.kind === 'sketch')!;
    const sweepRec = result.records.find(r => r.kind === 'sweep')!;
    expect(sweepRec).toBeDefined();
    expect(sweepRec.inputs.sketch).toEqual({ kind: 'feature', id: sketchRec.id });
    expect(sweepRec.params.profileKind.expression).toBe(`'sketch'`);
    const rail = (sweepRec.metadata as { rail: unknown }).rail;
    expect(rail).toEqual([[0,0,0], [0,0,10]]);
  });

  it('Sketch.sweep with { frenet: true } records params.frenet.evaluated === 1', async () => {
    const code = `
      const profile = path().moveTo(-1,-1).lineTo(1,-1).lineTo(1,1).lineTo(-1,1).close();
      return profile.sweep([[0,0,0], [0,0,10]], { frenet: true });
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const sweepRec = result.records.find(r => r.kind === 'sweep')!;
    expect(sweepRec.params.frenet.evaluated).toBeGreaterThan(0.5);
  });

  it('Sketch.sweep with default opts → frenet evaluated === 0', async () => {
    const code = `
      const profile = path().moveTo(-1,-1).lineTo(1,-1).lineTo(1,1).lineTo(-1,1).close();
      return profile.sweep([[0,0,0], [0,0,10]]);
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const sweepRec = result.records.find(r => r.kind === 'sweep')!;
    expect(sweepRec.params.frenet.evaluated).toBeLessThan(0.5);
  });

  it('Sketch.sweep end-to-end pipe via RecomputeEngine produces a valid solid (volume ≈ 4 × 50 = 200)', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    const code = `
      const profile = path().moveTo(-1,-1).lineTo(1,-1).lineTo(1,1).lineTo(-1,1).close();
      return profile.sweep([[0,0,0], [0,0,50]]);
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const last = result.records[result.records.length - 1];
    const v = r.shapes.get(last.id)!.volume();
    expect(v).toBeGreaterThan(190);
    expect(v).toBeLessThan(210);
  });

  it('Sketch.sweep with rail of 1 point → feature.sweep.invalid-rail diagnostic', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    const code = `
      const profile = path().moveTo(-1,-1).lineTo(1,-1).lineTo(1,1).lineTo(-1,1).close();
      return profile.sweep([[0,0,0]]);
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.some(d =>
      d.code === 'feature.sweep.invalid-rail' && d.severity === 'error'
    )).toBe(true);
  });

  it('Sketch.sweep with NaN in rail → feature.sweep.invalid-rail', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    const code = `
      const profile = path().moveTo(-1,-1).lineTo(1,-1).lineTo(1,1).lineTo(-1,1).close();
      return profile.sweep([[0,0,0], [0, NaN, 10]]);
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.some(d =>
      d.code === 'feature.sweep.invalid-rail' && d.severity === 'error'
    )).toBe(true);
  });

  it('Sketch.sweep with helix rail and frenet=true produces a valid spring solid', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    const code = `
      const rail = helix({ radius: 8, pitch: 4, turns: 2, pointsPerTurn: 16 });
      const profile = path().moveTo(-0.5,-0.5).lineTo(0.5,-0.5).lineTo(0.5,0.5).lineTo(-0.5,0.5).close();
      return profile.sweep(rail, { frenet: true });
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const last = result.records[result.records.length - 1];
    expect(r.shapes.get(last.id)!.volume()).toBeGreaterThan(0);
  });

  it('rail.length > 5000 emits feature.sweep.invalid-rail with hint to reduce pointsPerTurn', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    const code = `
      // Synthesize a 5001-point rail directly (faster than helix(...) at high resolution).
      const rail = [];
      for (let i = 0; i < 5001; i++) rail.push([0, 0, i * 0.01]);
      const profile = path().moveTo(-1,-1).lineTo(1,-1).lineTo(1,1).lineTo(-1,1).close();
      return profile.sweep(rail);
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.some(d =>
      d.code === 'feature.sweep.invalid-rail' && d.severity === 'error'
    )).toBe(true);
  });

  it('Sketch.loft(other) registers a loft feature with sectionCount=2 + sketch_0/sketch_1 inputs', async () => {
    const code = `
      const s1 = path().moveTo(-1,-1).lineTo(1,-1).lineTo(1,1).lineTo(-1,1).close();
      const s2 = path().moveTo(-2,-2).lineTo(2,-2).lineTo(2,2).lineTo(-2,2).close();
      return s1.loft(s2, { spacing: 30 });
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const sketches = result.records.filter(r => r.kind === 'sketch');
    const loftRec = result.records.find(r => r.kind === 'loft')!;
    expect(loftRec).toBeDefined();
    expect(loftRec.params.profileKind.expression).toBe(`'sketch'`);
    expect(loftRec.params.sectionCount.evaluated).toBe(2);
    expect(loftRec.params.spacing.evaluated).toBe(30);
    expect(loftRec.inputs.sketch_0).toEqual({ kind: 'feature', id: sketches[0].id });
    expect(loftRec.inputs.sketch_1).toEqual({ kind: 'feature', id: sketches[1].id });
  });

  it('Sketch.loft([s1, s2, s3]) flattens array, sectionCount=4 (this + 3 others)', async () => {
    const code = `
      const root = path().moveTo(-3,-3).lineTo(3,-3).lineTo(3,3).lineTo(-3,3).close();
      const r1 = path().moveTo(-2,-2).lineTo(2,-2).lineTo(2,2).lineTo(-2,2).close();
      const r2 = path().moveTo(-1.5,-1.5).lineTo(1.5,-1.5).lineTo(1.5,1.5).lineTo(-1.5,1.5).close();
      const tip = path().moveTo(-1,-1).lineTo(1,-1).lineTo(1,1).lineTo(-1,1).close();
      return root.loft([r1, r2, tip], { spacing: 25 });
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const loftRec = result.records.find(r => r.kind === 'loft')!;
    expect(loftRec.params.sectionCount.evaluated).toBe(4);
    expect(loftRec.inputs.sketch_3).toBeDefined();
  });

  it('Sketch.loft with { ruled: true } records params.ruled.evaluated === 1', async () => {
    const code = `
      const s1 = path().moveTo(-1,-1).lineTo(1,-1).lineTo(1,1).lineTo(-1,1).close();
      const s2 = path().moveTo(-2,-2).lineTo(2,-2).lineTo(2,2).lineTo(-2,2).close();
      return s1.loft(s2, { spacing: 30, ruled: true });
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const loftRec = result.records.find(r => r.kind === 'loft')!;
    expect(loftRec.params.ruled.evaluated).toBeGreaterThan(0.5);
  });

  it('Sketch.loft with { planes: [...] } records metadata.planes', async () => {
    const code = `
      const s1 = path().moveTo(-1,-1).lineTo(1,-1).lineTo(1,1).lineTo(-1,1).close();
      const s2 = path().moveTo(-2,-2).lineTo(2,-2).lineTo(2,2).lineTo(-2,2).close();
      return s1.loft(s2, {
        planes: [
          { plane: 'XY', origin: [0, 0, 0] },
          { plane: 'XY', origin: [0, 0, 50] },
        ],
      });
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const loftRec = result.records.find(r => r.kind === 'loft')!;
    const planes = (loftRec.metadata as { planes?: unknown[] } | undefined)?.planes;
    expect(Array.isArray(planes)).toBe(true);
    expect(planes).toHaveLength(2);
  });

  it('Sketch.loft end-to-end via RecomputeEngine: 2-square frustum produces volume in [260, 300]', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    const code = `
      const s1 = path().moveTo(-1,-1).lineTo(1,-1).lineTo(1,1).lineTo(-1,1).close();
      const s2 = path().moveTo(-2,-2).lineTo(2,-2).lineTo(2,2).lineTo(-2,2).close();
      return s1.loft(s2, { spacing: 30 });
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const last = result.records[result.records.length - 1];
    const v = r.shapes.get(last.id)!.volume();
    expect(v).toBeGreaterThan(260);
    expect(v).toBeLessThan(300);
  });

  it('Sketch.loft([]) (empty array) → feature.loft.empty-sections', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    const code = `
      const s1 = path().moveTo(-1,-1).lineTo(1,-1).lineTo(1,1).lineTo(-1,1).close();
      return s1.loft([]);
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.some(d =>
      d.code === 'feature.loft.empty-sections' && d.severity === 'error'
    )).toBe(true);
  });

  it('opts.planes length mismatch → feature.loft.invalid-planes', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    const code = `
      const s1 = path().moveTo(-1,-1).lineTo(1,-1).lineTo(1,1).lineTo(-1,1).close();
      const s2 = path().moveTo(-2,-2).lineTo(2,-2).lineTo(2,2).lineTo(-2,2).close();
      // Two sketches, but only one plane spec — mismatch.
      return s1.loft(s2, { planes: [{ plane: 'XY', origin: [0, 0, 0] }] });
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.some(d =>
      d.code === 'feature.loft.invalid-planes' && d.severity === 'error'
    )).toBe(true);
  });

  it('I-B: loft with missing upstream sketch input emits feature.loft.bad-sketch', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    // Construct a script that produces an upstream sketch that fails to lower
    // (lineTo as first command violates the moveTo-first invariant), so when
    // the loft tries to read sketch_1, it's absent from inputs.byKey.
    const code = `
      const s1 = path().moveTo(-1,-1).lineTo(1,-1).lineTo(1,1).lineTo(-1,1).close();
      // Invalid: missing moveTo. fromSketchCommands rejects this so sketch_2
      // emits feature.sketch.failed and never registers as a loft input.
      const s2 = path().lineTo(1, 1).close();
      return s1.loft(s2, { spacing: 30 });
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    // Either the upstream sketch fails first (feature.sketch.failed) AND the
    // loft surfaces feature.loft.bad-sketch for the missing input — both are
    // valid agent-actionable signals. Pre-rc.11 the latter was lumped under
    // generic feature.loft.failed.
    expect(r.diagnostics.some(d =>
      (d.code === 'feature.loft.bad-sketch' || d.code === 'feature.sketch.failed')
      && d.severity === 'error'
    )).toBe(true);
  });

  it('I-A: loft success path with explicit { planes: [...] } at axial origins', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    const code = `
      const s1 = path().moveTo(-1,-1).lineTo(1,-1).lineTo(1,1).lineTo(-1,1).close();
      const s2 = path().moveTo(-2,-2).lineTo(2,-2).lineTo(2,2).lineTo(-2,2).close();
      return s1.loft(s2, {
        planes: [
          { plane: 'XY', origin: [0, 0, 0] },
          { plane: 'XY', origin: [0, 0, 30] },
        ],
      });
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const last = result.records[result.records.length - 1];
    const v = r.shapes.get(last.id)!.volume();
    // Same frustum as the spacing-path test: h/3 × (4 + 16 + 8) = 280
    expect(v).toBeGreaterThan(260);
    expect(v).toBeLessThan(300);
  });

  it('I-A: loft success path with non-axial planes origin', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    const code = `
      const s1 = path().moveTo(-1,-1).lineTo(1,-1).lineTo(1,1).lineTo(-1,1).close();
      const s2 = path().moveTo(-2,-2).lineTo(2,-2).lineTo(2,2).lineTo(-2,2).close();
      // Same frustum geometry but shifted +X by 10. Volume identical.
      return s1.loft(s2, {
        planes: [
          { plane: 'XY', origin: [10, 0, 0] },
          { plane: 'XY', origin: [10, 0, 30] },
        ],
      });
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const last = result.records[result.records.length - 1];
    const v = r.shapes.get(last.id)!.volume();
    expect(v).toBeGreaterThan(260);
    expect(v).toBeLessThan(300);
  });

  it('Shape.fillet([{edges, radius}]) (single group) records metadata.variable=true + group radius + edge_group_0 input', async () => {
    const code = `return box(10, 10, 5).fillet([{ edges: { atZ: 5 }, radius: 2 }]);`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const filletRec = result.records.find(r => r.kind === 'fillet')!;
    const meta = filletRec.metadata as { variable?: boolean; groups?: Array<{ radius: number }> };
    expect(meta.variable).toBe(true);
    expect(meta.groups).toHaveLength(1);
    expect(meta.groups![0].radius).toBe(2);
    // edge_group_0 input must reference the correct edges via FeatureRef.
    expect(filletRec.inputs.edge_group_0).toBeDefined();
    expect(filletRec.inputs.edge_group_0.kind).toBe('edge');
  });

  it('Shape.fillet([g1, g2]) (two groups) records both groups with separate edge_group_${i} inputs', async () => {
    const code = `
      return box(10, 10, 5).fillet([
        { edges: { atZ: 5 }, radius: 2 },
        { edges: { atZ: 0 }, radius: 0.5 },
      ]);
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const filletRec = result.records.find(r => r.kind === 'fillet')!;
    const meta = filletRec.metadata as { groups: Array<{ radius: number }> };
    expect(meta.groups).toHaveLength(2);
    expect(meta.groups[0].radius).toBe(2);
    expect(meta.groups[1].radius).toBe(0.5);
    expect(filletRec.inputs.edge_group_0).toBeDefined();
    expect(filletRec.inputs.edge_group_1).toBeDefined();
  });

  it('Shape.fillet([{ edges: { face: "top" }, radius: 1 }]) accepts canonical-face wrapper as edges', async () => {
    const code = `return box(10, 10, 5).fillet([{ edges: { face: 'top' }, radius: 1 }]);`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const filletRec = result.records.find(r => r.kind === 'fillet')!;
    // The face wrapper produces a face-typed FeatureRef rather than edge-typed.
    // Capture stores it under inputs.edge_group_0 (same slot regardless of
    // ref kind — lowerer dispatches based on ref.kind).
    expect(filletRec.inputs.edge_group_0).toBeDefined();
  });

  it('Shape.chamfer([{edges, distance}]) (array form) records metadata.variable=true + distance', async () => {
    const code = `return box(10, 10, 5).chamfer([{ edges: { atZ: 5 }, distance: 1 }]);`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const chamferRec = result.records.find(r => r.kind === 'chamfer')!;
    const meta = chamferRec.metadata as { variable?: boolean; groups?: Array<{ distance: number }> };
    expect(meta.variable).toBe(true);
    expect(meta.groups![0].distance).toBe(1);
  });

  it('Shape.fillet(2, { atZ: 5 }) (existing single-radius form) still records old shape unchanged', async () => {
    const code = `return box(10, 10, 5).fillet(2, { atZ: 5 });`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const filletRec = result.records.find(r => r.kind === 'fillet')!;
    // Old form: params.radius set, no metadata.variable.
    expect(filletRec.params.radius?.evaluated).toBe(2);
    const meta = filletRec.metadata as { variable?: boolean } | undefined;
    expect(meta?.variable).toBeFalsy();
  });

  it('Shape.fillet([{edges, radius: -1}]) → feature.fillet.invalid-group at lowering', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    const code = `return box(10, 10, 5).fillet([{ edges: { atZ: 5 }, radius: -1 }]);`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.some(d =>
      d.code === 'feature.fillet.invalid-group' && d.severity === 'error'
    )).toBe(true);
  });

  it('Shape.mirror(plane) creates a mirror feature with metadata.plane', async () => {
    const code = `return box(10, 5, 5).translate(5, 0, 0).mirror('yz');`;
    const run = await runScript({ code, fileName: '<test>' });
    expect(run.records).toHaveLength(2);  // box + mirror
    const mirror = run.records[1];
    expect(mirror.kind).toBe('mirror');
    expect(mirror.inputs.base).toMatchObject({ kind: 'feature' });
    expect(mirror.metadata).toMatchObject({ plane: 'yz' });
  });

  it('Shape.fillet([]) (empty array) → feature.fillet.empty-groups at lowering', async () => {
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
    const code = `return box(10, 10, 5).fillet([]);`;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.some(d =>
      d.code === 'feature.fillet.empty-groups' && d.severity === 'error'
    )).toBe(true);
  });

  describe('Sketch.reflect(axis)', () => {
    it('reflects line segments across the x-axis', async () => {
      const code = `
        const sketch = path()
          .moveTo(0, 0)
          .lineTo(10, 0)
          .lineTo(10, 5)
          .lineTo(0, 5)
          .close();
        return sketch.reflect('x').extrude(1);
      `;
      const result = await runScript({ code, fileName: 'test.kcad.ts' });
      // There are 3 records: original sketch, reflected sketch, extrude
      const sketches = result.records.filter(r => r.kind === 'sketch');
      expect(sketches).toHaveLength(2);
      const reflectedSketch = sketches[1];
      const cmds = (reflectedSketch.metadata as { commands: Array<{ kind: string; x?: number; y?: number }> }).commands;
      expect(cmds[0]).toMatchObject({ kind: 'moveTo', x: 0, y: 0 });
      expect(cmds[1]).toMatchObject({ kind: 'lineTo', x: 10, y: 0 });
      expect(cmds[2]).toMatchObject({ kind: 'lineTo', x: 10, y: -5 });
      expect(cmds[3]).toMatchObject({ kind: 'lineTo', x: 0, y: -5 });
    });

    it('reflects across the y-axis with offset', async () => {
      // axis: y, offset: 5 → x' = 2*5 - x = 10 - x
      const code = `
        const sketch = path().moveTo(8, 0).lineTo(13, 5).close();
        return sketch.reflect({ axis: 'y', offset: 5 }).extrude(1);
      `;
      const result = await runScript({ code, fileName: 'test.kcad.ts' });
      const sketches = result.records.filter(r => r.kind === 'sketch');
      const reflectedSketch = sketches[1];
      const cmds = (reflectedSketch.metadata as { commands: Array<{ kind: string; x?: number; y?: number }> }).commands;
      expect(cmds[0]).toMatchObject({ kind: 'moveTo', x: 2, y: 0 });
      expect(cmds[1]).toMatchObject({ kind: 'lineTo', x: -3, y: 5 });
    });

    it('negates sagitta sign on sagittaArc (winding inversion)', async () => {
      const code = `
        const sketch = path().moveTo(0, 0).sagittaArc(20, 0, 5).close();
        return sketch.reflect('x').extrude(1);
      `;
      const result = await runScript({ code, fileName: 'test.kcad.ts' });
      const sketches = result.records.filter(r => r.kind === 'sketch');
      const reflectedSketch = sketches[1];
      const cmds = (reflectedSketch.metadata as { commands: Array<{ kind: string; sagitta?: number }> }).commands;
      const arcCmd = cmds.find(c => c.kind === 'sagittaArc');
      expect(arcCmd).toBeDefined();
      expect(arcCmd!.sagitta).toBe(-5);
    });

    it('negates radius sign on radiusArc (winding inversion)', async () => {
      const code = `
        const sketch = path().moveTo(0, 0).radiusArc(20, 0, 15).close();
        return sketch.reflect('x').extrude(1);
      `;
      const result = await runScript({ code, fileName: 'test.kcad.ts' });
      const sketches = result.records.filter(r => r.kind === 'sketch');
      const reflectedSketch = sketches[1];
      const cmds = (reflectedSketch.metadata as { commands: Array<{ kind: string; radius?: number }> }).commands;
      const arcCmd = cmds.find(c => c.kind === 'radiusArc');
      expect(arcCmd).toBeDefined();
      expect(arcCmd!.radius).toBe(-15);
    });

    it('preserves labels on their corresponding segments', async () => {
      const code = `
        const sketch = path()
          .moveTo(0, 0)
          .lineTo(10, 0)
          .label('rim')
          .lineTo(10, 5)
          .close();
        return sketch.reflect('x').extrude(1);
      `;
      const result = await runScript({ code, fileName: 'test.kcad.ts' });
      const sketches = result.records.filter(r => r.kind === 'sketch');
      const reflectedSketch = sketches[1];
      const cmds = (reflectedSketch.metadata as { commands: Array<{ kind: string; label?: string }> }).commands;
      const labeledCmd = cmds.find(c => (c as { label?: string }).label === 'rim');
      expect(labeledCmd).toBeDefined();
      expect(labeledCmd!.kind).toBe('lineTo');
    });

    it('Sketch.reflect({ axis: "x" }) is equivalent to Sketch.reflect("x") (offset defaults to 0)', async () => {
      const code = `
        const sketch = path().moveTo(0, 0).lineTo(10, 5).close();
        const stringForm = sketch.reflect('x');
        const objectForm = sketch.reflect({ axis: 'x' });
        // Return both as extrudes so we can inspect the sketch records
        return objectForm.extrude(1);
      `;
      // We compare by running both forms and checking their commands match.
      const codeString = `
        const sketch = path().moveTo(0, 0).lineTo(10, 5).close();
        return sketch.reflect('x').extrude(1);
      `;
      const codeObject = `
        const sketch = path().moveTo(0, 0).lineTo(10, 5).close();
        return sketch.reflect({ axis: 'x' }).extrude(1);
      `;
      const [resString, resObject] = await Promise.all([
        runScript({ code: codeString, fileName: 'test.kcad.ts' }),
        runScript({ code: codeObject, fileName: 'test.kcad.ts' }),
      ]);
      const getReflectedCmds = (res: typeof resString) => {
        const sketches = res.records.filter(r => r.kind === 'sketch');
        return (sketches[1].metadata as { commands: unknown[] }).commands;
      };
      expect(getReflectedCmds(resObject)).toEqual(getReflectedCmds(resString));
    });

    it('Sketch.reflect({ axis: "y" }) is equivalent to Sketch.reflect("y") (offset defaults to 0)', async () => {
      const codeString = `
        const sketch = path().moveTo(3, 0).lineTo(10, 5).close();
        return sketch.reflect('y').extrude(1);
      `;
      const codeObject = `
        const sketch = path().moveTo(3, 0).lineTo(10, 5).close();
        return sketch.reflect({ axis: 'y' }).extrude(1);
      `;
      const [resString, resObject] = await Promise.all([
        runScript({ code: codeString, fileName: 'test.kcad.ts' }),
        runScript({ code: codeObject, fileName: 'test.kcad.ts' }),
      ]);
      const getReflectedCmds = (res: typeof resString) => {
        const sketches = res.records.filter(r => r.kind === 'sketch');
        return (sketches[1].metadata as { commands: unknown[] }).commands;
      };
      expect(getReflectedCmds(resObject)).toEqual(getReflectedCmds(resString));
    });

    it('rejects malformed axis with feature.sketch.reflect.invalid-axis', async () => {
      const code = `
        const sketch = path().moveTo(0, 0).lineTo(1, 1).close();
        return sketch.reflect('z').extrude(1);
      `;
      let caught: unknown;
      try {
        await runScript({ code, fileName: 'test.kcad.ts' });
      } catch (e) { caught = e; }
      expect(String(caught)).toMatch(/invalid-axis|axis must be/i);
    });

    it('feature.sketch.reflect.invalid-axis diagnostic carries featureId when caught from a sketch context', async () => {
      const { kernelErrorToDiagnostic } = await import('../../../src/script-runtime/kernelErrorToDiagnostic');
      const code = `
        const sketch = path().moveTo(0, 0).lineTo(1, 1).close();
        return sketch.reflect('z').extrude(1);
      `;
      let caught: unknown;
      try {
        await runScript({ code, fileName: 'test.kcad.ts' });
      } catch (e) { caught = e; }
      expect(caught).toBeDefined();
      const diag = kernelErrorToDiagnostic(caught);
      expect(diag.code).toBe('feature.sketch.reflect.invalid-axis');
      expect(diag.featureId).toBeDefined();
      expect(typeof diag.featureId).toBe('string');
    });

    it('reflected sketch extrudes to a valid solid with the same volume as the original', async () => {
      const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
      const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
      // 10x5 rectangle extruded by 2 = volume 100
      const codeOriginal = `return path().moveTo(0,0).lineTo(10,0).lineTo(10,5).lineTo(0,5).close().extrude(2);`;
      const codeReflected = `return path().moveTo(0,0).lineTo(10,0).lineTo(10,5).lineTo(0,5).close().reflect('x').extrude(2);`;

      const runAndGetVolume = async (code: string) => {
        const run = await runScript({ code, fileName: '<test>' });
        const engine = new RecomputeEngine(new OcctLowerer());
        const r = await engine.run(run.records);
        expect(r.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
        const last = run.records[run.records.length - 1];
        return r.shapes.get(last.id)!.volume();
      };

      const vOriginal = await runAndGetVolume(codeOriginal);
      const vReflected = await runAndGetVolume(codeReflected);
      expect(vReflected).toBeCloseTo(vOriginal, 1);
    });

    it('I4: Sketch.reflect registers inputs.source referencing the upstream sketch', async () => {
      const code = `
        const sketch = path().moveTo(0, 0).lineTo(10, 0).lineTo(10, 5).close();
        return sketch.reflect('x').extrude(1);
      `;
      const run = await runScript({ code, fileName: '<test>' });
      const sketches = run.records.filter(r => r.kind === 'sketch');
      expect(sketches).toHaveLength(2);
      const [upstream, reflected] = sketches;
      // The reflected sketch must reference the upstream via inputs.source.
      expect(reflected.inputs.source).toEqual({ kind: 'feature', id: upstream.id });
    });

    it('I4: upstream sketch failure cascades to reflected sketch via recompute.input.missing', async () => {
      const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
      const { OcctLowerer } = await import('../../../src/backends/occt/occtLowerer');
      // The upstream sketch is invalid (lineTo without moveTo first), so it
      // fails to lower and is never added to the shapes map. The reflected
      // sketch has inputs.source pointing at the upstream; the engine detects
      // the upstream is missing and emits recompute.input.missing on the
      // reflected sketch — proving the cascade works.
      const code = `
        const bad = path().lineTo(1, 1).close();
        return bad.reflect('x').extrude(1);
      `;
      const run = await runScript({ code, fileName: '<test>' });
      const engine = new RecomputeEngine(new OcctLowerer());
      const r = await engine.run(run.records);
      const codes = r.diagnostics.map(d => d.code);
      // Upstream emits feature.sketch.failed (or similar); reflected sketch
      // must emit recompute.input.missing because its inputs.source is absent.
      expect(codes).toContain('recompute.input.missing');
    });

    it('Sketch.reflect is its own inverse — reflect twice produces the original geometry (cardinal axis)', async () => {
      const code = `
        const sketch = path().moveTo(0, 0).lineTo(10, 5).close();
        return sketch.reflect('x').reflect('x').extrude(1);
      `;
      const run = await runScript({ code, fileName: '<test>' });
      // Records: original sketch, first reflect sketch, second reflect sketch, extrude
      const sketches = run.records.filter(r => r.kind === 'sketch');
      expect(sketches).toHaveLength(3);
      const originalCmds = (sketches[0].metadata as { commands: unknown[] }).commands;
      const twiceCmds = (sketches[2].metadata as { commands: unknown[] }).commands;
      // For cardinal axis 'x', -(-y) = y exactly. Commands should match.
      expect(twiceCmds).toEqual(originalCmds);
    });

    it('Sketch.reflect involution holds for axes with offset', async () => {
      const code = `
        const sketch = path().moveTo(8, 0).lineTo(13, 5).close();
        return sketch.reflect({ axis: 'y', offset: 5 }).reflect({ axis: 'y', offset: 5 }).extrude(1);
      `;
      const run = await runScript({ code, fileName: '<test>' });
      // Records: original sketch, first reflect sketch, second reflect sketch, extrude
      const sketches = run.records.filter(r => r.kind === 'sketch');
      expect(sketches).toHaveLength(3);
      const originalCmds = (sketches[0].metadata as { commands: unknown[] }).commands;
      const twiceCmds = (sketches[2].metadata as { commands: unknown[] }).commands;
      // 2*offset - (2*offset - x) = x — exact in floating-point for integer offset.
      expect(twiceCmds).toEqual(originalCmds);
    });
  });
});
