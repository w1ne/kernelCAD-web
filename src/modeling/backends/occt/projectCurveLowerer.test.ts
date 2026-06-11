// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/backends/occt/projectCurveLowerer.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { lowerProjectCurve } from './projectCurveLowerer';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { SketchCommand } from '../../../shared/capture/sketchCommand';

const mm = (n: number) => ({ expression: String(n), unit: 'mm' as const, evaluated: n });

const SAMPLE_COMMANDS: SketchCommand[] = [
  { kind: 'moveTo', x: mm(0), y: mm(0) },
  { kind: 'lineTo', x: mm(2), y: mm(0) },
  { kind: 'lineTo', x: mm(2), y: mm(2) },
  { kind: 'lineTo', x: mm(0), y: mm(2) },
  { kind: 'close' },
];

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

  it('emits feature.project-curve.no-intersection (deferred) when asEdge: true', async () => {
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
        source: { kind: 'sketchCommands', commands: SAMPLE_COMMANDS },
        scaleMode: 'original',
        asEdge: true,
        faceRef: { kind: 'canonical', face: 'top' },
      },
    };
    const res = await lowerProjectCurve(r, parent, undefined);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      const code = res.diagnostics[0].code;
      expect(code).toBe('feature.project-curve.no-intersection');
      const msg = res.diagnostics[0].message ?? '';
      expect(msg.toLowerCase()).toContain('asedge');
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
