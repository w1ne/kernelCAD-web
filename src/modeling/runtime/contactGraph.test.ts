// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/contactGraph.test.ts
//
// Deterministic geometric contact graph: counts distinct connected bodies
// and flags floating/disconnected geometry from the lowered BREP scene,
// so the design-loop's `main-object-count` and `no-stray-or-floating-geometry`
// visual checks are grounded in geometry instead of the agent's prose.
//
// Bodies are placed by hand (the tendonBodyIntersect.test.ts idiom) so the
// contact topology is exact and independent of the mate solver.

import { describe, it, expect, beforeAll } from 'vitest';
import { createApi } from '../api';
import { CaptureSession } from '../capture/captureSession';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import { Transform } from '../../shared/runtime/se3';
import { analyzeContactGraph } from './contactGraph';

async function box(sx: number, sy: number, sz: number): Promise<OcctBackend> {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  return (await kcad.box(sx, sy, sz, true).lower()) as OcctBackend;
}

function scene(parts: Record<string, { shape: OcctBackend; at: Transform }>): SceneBackend {
  return {
    parts: Object.entries(parts).map(([name, p]) => ({
      name,
      shape: p.shape,
      worldTransform: p.at,
    })),
  } as unknown as SceneBackend;
}

describe('analyzeContactGraph — deterministic object count + floating detection', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('reports one object when two 20mm boxes abut face-to-face', async () => {
    const a = await box(20, 20, 20);
    const b = await box(20, 20, 20);
    // Centred boxes span ±10; place b at x=20 so its -X face (x=10) meets
    // a's +X face (x=10): surface contact, zero gap.
    const s = scene({
      a: { shape: a, at: Transform.identity() },
      b: { shape: b, at: Transform.translation(20, 0, 0) },
    });
    const result = analyzeContactGraph(s);
    expect(result.objectCount).toBe(1);
    expect(result.floatingParts).toEqual([]);
  });

  it('reports two objects and flags the floating part across an air gap', async () => {
    const a = await box(20, 20, 20);
    const b = await box(20, 20, 20);
    // 30mm apart centre-to-centre → 10mm air gap between faces (> default
    // contact gap): b is geometrically disconnected even if it were mated.
    const s = scene({
      a: { shape: a, at: Transform.identity() },
      b: { shape: b, at: Transform.translation(30, 0, 0) },
    });
    const result = analyzeContactGraph(s);
    expect(result.objectCount).toBe(2);
    expect(result.floatingParts).toEqual(['b']);
  });

  it('groups a touching pair and isolates a distant island', async () => {
    const a = await box(20, 20, 20);
    const b = await box(20, 20, 20);
    const c = await box(20, 20, 20);
    const s = scene({
      a: { shape: a, at: Transform.identity() },
      b: { shape: b, at: Transform.translation(20, 0, 0) }, // touches a
      c: { shape: c, at: Transform.translation(0, 0, 200) }, // far away
    });
    const result = analyzeContactGraph(s);
    expect(result.objectCount).toBe(2);
    expect(result.components[0].sort()).toEqual(['a', 'b']);
    expect(result.floatingParts).toEqual(['c']);
  });
});
