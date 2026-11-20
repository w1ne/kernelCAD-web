// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/backends/occt/projectCurveLowerer.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import type { Face } from 'replicad';
import { initOcct, OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { lowerProjectCurve, lowerProjectCurveEdges } from './projectCurveLowerer';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { SketchCommand } from '../../../shared/capture/sketchCommand';
import type { ProjectCurveSourcePlane } from '../../../shared/intent/projectCurveRecord';
import type { Vec3 } from '../../../shared/intent/types';

const mm = (n: number) => ({ expression: String(n), unit: 'mm' as const, evaluated: n });

const SAMPLE_COMMANDS: SketchCommand[] = [
  { kind: 'moveTo', x: mm(0), y: mm(0) },
  { kind: 'lineTo', x: mm(2), y: mm(0) },
  { kind: 'lineTo', x: mm(2), y: mm(2) },
  { kind: 'lineTo', x: mm(0), y: mm(2) },
  { kind: 'close' },
];
const OPEN_COMMANDS: SketchCommand[] = SAMPLE_COMMANDS.slice(0, 2);

describe('lowerProjectCurve', () => {
  beforeAll(async () => { await initOcct(); });

  it('returns { ok: false } with a diagnostic when metadata is missing', async () => {
    const parent = OcctBackend.box(20, 10, 2);
    const r: FeatureRecord = {
      id: 'proj-1',
      kind: 'projectCurve',
      params: {},
      inputs: {
        parent: { kind: 'feature', id: 'parent-0' },
        face: {
          kind: 'face',
          featureId: 'parent-0',
          ref: { kind: 'canonical', face: 'top' },
        },
      },
      transforms: [],
      suppressed: false,
      metadata: {},
    };
    const res = await lowerProjectCurve(r, parent, undefined);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.diagnostics[0].code).toBe('feature.invalid-args');
    }
  });

  it('refuses to lower open Curve3D output as a Shape feature', async () => {
    const parent = OcctBackend.box(20, 10, 2);
    const r: FeatureRecord = {
      id: 'proj-2',
      kind: 'projectCurve',
      params: {},
      inputs: {
        parent: { kind: 'feature', id: 'parent-0' },
        face: {
          kind: 'face',
          featureId: 'parent-0',
          ref: { kind: 'canonical', face: 'top' },
        },
      },
      transforms: [],
      suppressed: false,
      metadata: {
        source: { kind: 'sketchCommands', commands: OPEN_COMMANDS },
        scaleMode: 'original',
        asEdge: true,
        sourcePlane: { origin: [0, 0, 10], normal: [0, 0, 1], xAxis: [1, 0, 0] },
        direction: [0, 0, -1],
        faceRef: { kind: 'canonical', face: 'top' },
      },
    };
    const res = await lowerProjectCurve(r, parent, undefined);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      const code = res.diagnostics[0].code;
      expect(code).toBe('feature.invalid-args');
      const msg = res.diagnostics[0].message ?? '';
      expect(msg).toContain('must be awaited at capture time');
    }
  });

  it('returns diagnostics for null or malformed runtime placement values', () => {
    const face = undefined as unknown as Face;
    const nullPlane = lowerProjectCurveEdges(
      OPEN_COMMANDS,
      face,
      null as unknown as ProjectCurveSourcePlane,
      [0, 0, -1],
      'proj-null-plane',
    );
    const nullDirection = lowerProjectCurveEdges(
      OPEN_COMMANDS,
      face,
      { origin: [0, 0, 10], normal: [0, 0, 1], xAxis: [1, 0, 0] },
      null as unknown as Vec3,
      'proj-null-direction',
    );

    expect(nullPlane.ok).toBe(false);
    expect(nullDirection.ok).toBe(false);
    if (!nullPlane.ok && !nullDirection.ok) {
      expect(nullPlane.diagnostics[0].code).toBe('feature.invalid-args');
      expect(nullDirection.diagnostics[0].code).toBe('feature.invalid-args');
    }
  });

  it('produces a sketch-tagged OcctBackend for a closed-curve projection on a planar face', async () => {
    const parent = OcctBackend.box(30, 30, 2);
    const r: FeatureRecord = {
      id: 'proj-3',
      kind: 'projectCurve',
      params: {},
      inputs: {
        parent: { kind: 'feature', id: 'parent-0' },
        face: {
          kind: 'face',
          featureId: 'parent-0',
          ref: { kind: 'canonical', face: 'top' },
        },
      },
      transforms: [],
      suppressed: false,
      metadata: {
        source: { kind: 'sketchCommands', commands: SAMPLE_COMMANDS },
        scaleMode: 'original',
        asEdge: false,
        faceRef: { kind: 'canonical', face: 'top' },
      },
    };
    const res = await lowerProjectCurve(r, parent, undefined);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.backend.kind).toBe('sketch');
      // The face-bound sketch is extrudable along the face normal.
      const extruded = OcctBackend.extrudeFromSketch(res.backend, 0.4);
      expect(extruded.volume()).toBeGreaterThan(0);
    }
  });
});
