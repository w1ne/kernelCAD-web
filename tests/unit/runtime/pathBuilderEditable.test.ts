// tests/unit/runtime/pathBuilderEditable.test.ts
//
// Regression suite for PathBuilder Editable<number> coords / scalars.
//
// Three case categories:
//   1. Per-method capture: each PathBuilder method (moveTo/lineTo/tangentArc/
//      threePointsArc/sagittaArc/bulgeArc/radiusArc) accepts a ParamRef and
//      stores a Param whose paramRef field is set.
//   2. End-to-end build: a fully-parametric path with leaf and composed
//      ParamRefs lowers cleanly through OcctLowerer.
//   3. Parametric reactivity: editing the param via session.params.update
//      changes the lowered shape's volume.
//
// Spec: kernelCAD-private/docs/specs/2026-05-08-revolverect-demotion-and-pathbuilder-editable-design.md

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import { CaptureSession } from '../../../src/capture/captureSession';
import { createApi } from '../../../src/modules/api';
import type { SketchCommand } from '../../../src/capture/sketch';

beforeAll(async () => { await initOcct(); });

// ---------------------------------------------------------------------------
// 1. Per-method capture: a leaf ParamRef survives onto the stored Param via
//    Param.paramRef.

function getCommands(session: CaptureSession): SketchCommand[] {
  const sketchRec = session.getRecords().find(r => r.kind === 'sketch');
  if (!sketchRec) throw new Error('no sketch record found');
  return ((sketchRec.metadata as { commands?: SketchCommand[] } | undefined)?.commands) ?? [];
}

describe('PathBuilder accepts Editable<number> — per-method capture', () => {
  it('moveTo stores ParamRef on x and y', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const r = api.param('r', 5);
    api.path().moveTo(r, 0).lineTo(10, 0).close();
    const cmds = getCommands(session);
    const move = cmds[0] as { kind: 'moveTo'; x: { paramRef?: unknown }; y: { paramRef?: unknown } };
    expect(move.kind).toBe('moveTo');
    expect(move.x.paramRef).toBe('r');
  });

  it('lineTo stores ParamRef on x and y', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const r = api.param('r', 5);
    api.path().moveTo(0, 0).lineTo(r, 0).close();
    const cmds = getCommands(session);
    const line = cmds[1] as { kind: 'lineTo'; x: { paramRef?: unknown } };
    expect(line.kind).toBe('lineTo');
    expect(line.x.paramRef).toBe('r');
  });

  it('tangentArc stores ParamRef on x and y', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const r = api.param('r', 5);
    api.path().moveTo(0, 0).lineTo(10, 0).tangentArc(r, 5).close();
    const cmds = getCommands(session);
    const arc = cmds.find(c => c.kind === 'tangentArc') as { x: { paramRef?: unknown } } | undefined;
    expect(arc).toBeDefined();
    expect(arc!.x.paramRef).toBe('r');
  });

  it('threePointsArc stores ParamRef on midX', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const m = api.param('m', 10);
    api.path().moveTo(0, 0).threePointsArc(20, 0, m, 5).close();
    const cmds = getCommands(session);
    const arc = cmds.find(c => c.kind === 'threePointsArc') as { midX: { paramRef?: unknown } } | undefined;
    expect(arc).toBeDefined();
    expect(arc!.midX.paramRef).toBe('m');
  });

  it('sagittaArc stores ParamRef on sagitta', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const s = api.param('s', 5);
    api.path().moveTo(0, 0).sagittaArc(20, 0, s).close();
    const cmds = getCommands(session);
    const arc = cmds.find(c => c.kind === 'sagittaArc') as { sagitta: { paramRef?: unknown } } | undefined;
    expect(arc).toBeDefined();
    expect(arc!.sagitta.paramRef).toBe('s');
  });

  it('bulgeArc stores ParamRef on bulge (unitless)', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const b = api.param('b', 0.5);
    api.path().moveTo(0, 0).bulgeArc(20, 0, b).close();
    const cmds = getCommands(session);
    const arc = cmds.find(c => c.kind === 'bulgeArc') as { bulge: { paramRef?: unknown; unit: string } } | undefined;
    expect(arc).toBeDefined();
    expect(arc!.bulge.paramRef).toBe('b');
    expect(arc!.bulge.unit).toBe('unitless');
  });

  it('radiusArc stores ParamRef on radius', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const radius = api.param('radius', 15);
    api.path().moveTo(0, 0).radiusArc(20, 0, radius).close();
    const cmds = getCommands(session);
    const arc = cmds.find(c => c.kind === 'radiusArc') as { radius: { paramRef?: unknown } } | undefined;
    expect(arc).toBeDefined();
    expect(arc!.radius.paramRef).toBe('radius');
  });
});

// ---------------------------------------------------------------------------
// 2. End-to-end: leaf and composed ParamRefs survive into a successful lower.

describe('PathBuilder Editable — end-to-end lowering', () => {
  it('builds and lowers a parametric path with leaf + composed ParamRefs', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const r = api.param('r', 5);
    const shape = api.path()
      .moveTo(r, 0)
      .lineTo(r.add(10), 0)
      .lineTo(r.add(10), 5)
      .lineTo(r, 5)
      .close()
      .extrude(3);
    const lowered = await shape.lower();
    expect(lowered.volume()).toBeCloseTo(150, 0); // 10 × 5 × 3
  });
});

// ---------------------------------------------------------------------------
// 3. Parametric reactivity: editing the param via session.params.update
//    re-lowers the shape with the new value, observable in the volume.

describe('PathBuilder Editable — params.update reactivity', () => {
  it('updating r changes the revolved shape volume', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const r = api.param('r', 5);
    // Washer profile: inner radius r, outer radius r+10, height 5.
    const shape = api.path()
      .moveTo(r, 0)
      .lineTo(r.add(10), 0)
      .lineTo(r.add(10), 5)
      .lineTo(r, 5)
      .close()
      .revolve();

    const initial = await shape.lower();
    const v1 = initial.volume();
    expect(v1).toBeGreaterThan(0);

    // Edit r 5 → 8. Outer radius grows from 15 to 18; inner radius from 5 to 8.
    // Volume = π * (outer² - inner²) * h:
    //   v1 = π * (15² - 5²) * 5 = π * 200 * 5 = 1000π ≈ 3141.6
    //   v2 = π * (18² - 8²) * 5 = π * 260 * 5 = 1300π ≈ 4084.1
    const updated = await session.params.update([{ name: 'r', value: 8 }]);
    const v2 = updated.shape.volume();
    expect(v2).toBeGreaterThan(v1);
    expect(Math.abs(v2 - v1)).toBeGreaterThan(50);
  });
});
