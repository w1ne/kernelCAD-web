// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/modeling/compute/recomputeEngineProcessRecord.test.ts
//
// Characterisation pins for RecomputeEngine.processRecord as observed through
// run(): suppression / virtual / seed-cache skips, gated-off passthrough,
// missing-input failure, lowered success + warning health, and the KernelError
// vs generic-exception failure diagnostics.

import { describe, it, expect } from 'vitest';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { KernelError } from '../../../../src/shared/intent/kernelError';
import type { FeatureLowerer, LowerResult, ShapeBackend } from '../../../../src/kernel/backends/backend';
import type { FeatureRecord } from '../../../../src/shared/intent/featureRecord';
import type { FeatureKind } from '../../../../src/shared/intent/types';
import type { CompilerDiagnostic } from '../../../../src/shared/diagnostics/diagnostic';
import type { FeatureEvent } from '../../../../src/modeling/compute/featureEvents';
import { ParamTable } from '../../../../src/shared/runtime/paramTable';

/** Shape stub: every geometry method throws — the engine under test only
 *  stores / forwards the reference. */
class StubShape implements ShapeBackend {
  readonly target = 'export-occt' as const;
  translate(): never { throw new Error('stub'); }
  rotate(): never { throw new Error('stub'); }
  scale(): never { throw new Error('stub'); }
  union(): never { throw new Error('stub'); }
  subtract(): never { throw new Error('stub'); }
  intersect(): never { throw new Error('stub'); }
  splitByPlane(): never { throw new Error('stub'); }
  boundingBox(): never { throw new Error('stub'); }
  volume(): never { throw new Error('stub'); }
  surfaceArea(): never { throw new Error('stub'); }
  massProperties(): never { throw new Error('stub'); }
  isEmpty(): never { throw new Error('stub'); }
  solidComponents(): never { throw new Error('stub'); }
  getMesh(): never { throw new Error('stub'); }
  exportSTL(): never { throw new Error('stub'); }
  exportSTEP(): never { throw new Error('stub'); }
}

class StubLowerer implements FeatureLowerer {
  readonly target = 'export-occt' as const;
  readonly supports: ReadonlySet<FeatureKind> = new Set<FeatureKind>(['box', 'boolean']);
  calls: string[] = [];
  constructor(private readonly impl: (record: FeatureRecord) => Promise<LowerResult>) {}
  async lower(record: FeatureRecord): Promise<LowerResult> {
    this.calls.push(record.id);
    return this.impl(record);
  }
}

function record(id: string, over: Partial<FeatureRecord> = {}): FeatureRecord {
  return { id, kind: 'box', inputs: {}, params: {}, transforms: [], suppressed: false, ...over };
}

function errorDiag(featureId: string): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'recompute.input.missing',
    featureId,
    severity: 'error',
    message: `lower failed for ${featureId}`,
    hint: 'fix it',
  };
}

function warnDiag(featureId: string): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'recompute.input.missing',
    featureId,
    severity: 'warn',
    message: `lower warned for ${featureId}`,
    hint: 'check it',
  };
}

const okShape = () => new StubShape();

describe('RecomputeEngine.processRecord — characterisation', () => {
  it('skips suppressed records and health-marks virtual ones without lowering', async () => {
    const lowerer = new StubLowerer(async () => ({ shape: okShape(), diagnostics: [] }));
    const engine = new RecomputeEngine(lowerer);
    const res = await engine.run([
      record('sup', { suppressed: true }),
      record('virt', { kind: 'referenceImage', metadata: { virtual: true } }),
    ]);
    expect(lowerer.calls).toEqual([]);
    expect(res.health.has('sup')).toBe(false);
    expect(res.health.get('virt')).toBe('healthy');
    expect(res.shapes.size).toBe(0);
    expect(res.diagnostics).toEqual([]);
  });

  it('treats a seedShapes hit as a cache hit: healthy, no lowering', async () => {
    const lowerer = new StubLowerer(async () => ({ shape: okShape(), diagnostics: [] }));
    const engine = new RecomputeEngine(lowerer);
    const seed = okShape();
    const res = await engine.run([record('a')], { seedShapes: new Map([['a', seed]]) });
    expect(lowerer.calls).toEqual([]);
    expect(res.health.get('a')).toBe('healthy');
    expect(res.shapes.get('a')).toBe(seed);
  });

  it('fails a record whose upstream shape is missing, in event order', async () => {
    const lowerer = new StubLowerer(async (r) => ({
      shape: okShape(),
      diagnostics: r.id === 'a' ? [errorDiag('a')] : [],
    }));
    const engine = new RecomputeEngine(lowerer);
    const events: FeatureEvent[] = [];
    const res = await engine.run(
      [record('a'), record('b', { inputs: { base: { kind: 'feature', id: 'a' } } })],
      { onEvent: (e) => events.push(e) },
    );
    expect(lowerer.calls).toEqual(['a']);
    expect(
      events.map((e) => (e.kind === 'recompute.complete' ? e.kind : `${e.kind}:${e.featureId}`)),
    ).toEqual(['feature.failed:a', 'feature.failed:b', 'recompute.complete']);
    const missing = res.diagnostics.find((d) => d.code === 'recompute.input.missing' && d.featureId === 'b');
    expect(missing).toBeDefined();
    expect(missing?.message).toBe("Input 'base' references missing/failed feature 'a'");
    expect(res.health.get('a')).toBe('error');
    expect(res.health.get('b')).toBe('error');
  });

  it('emits feature.compiled with warning health when the lowerer warns', async () => {
    const lowerer = new StubLowerer(async () => ({
      shape: okShape(),
      diagnostics: [warnDiag('a')],
    }));
    const engine = new RecomputeEngine(lowerer);
    const events: FeatureEvent[] = [];
    const res = await engine.run([record('a')], { onEvent: (e) => events.push(e) });
    expect(res.health.get('a')).toBe('warning');
    expect(res.shapes.has('a')).toBe(true);
    const compiled = events.find((e) => e.kind === 'feature.compiled');
    expect(compiled).toMatchObject({ featureId: 'a', featureKind: 'box', health: 'warning' });
    expect(res.diagnostics).toEqual([warnDiag('a')]);
  });

  it('maps a KernelError to its code/hint and a generic throw to recompute.lowering.exception', async () => {
    const kernelLowerer = new StubLowerer(async () => {
      throw new KernelError('feature.invalid-args', 'axis must be non-zero', 'k', 'invalid-args.axis.zero');
    });
    const kernelRes = await new RecomputeEngine(kernelLowerer).run([record('k')]);
    expect(kernelRes.diagnostics).toHaveLength(1);
    expect(kernelRes.diagnostics[0]).toMatchObject({
      code: 'feature.invalid-args',
      featureId: 'k',
      severity: 'error',
      message: 'axis must be non-zero',
      hint: 'invalid-args.axis.zero',
    });
    expect(kernelRes.health.get('k')).toBe('error');

    const genericLowerer = new StubLowerer(async () => {
      throw new Error('kaboom');
    });
    const genericRes = await new RecomputeEngine(genericLowerer).run([record('g')]);
    expect(genericRes.diagnostics).toHaveLength(1);
    expect(genericRes.diagnostics[0]).toMatchObject({
      code: 'recompute.lowering.exception',
      featureId: 'g',
      severity: 'error',
      message: 'kaboom',
    });
  });

  it('passes a gated-off record through to its upstream shape without lowering', async () => {
    const lowerer = new StubLowerer(async () => ({ shape: okShape(), diagnostics: [] }));
    const engine = new RecomputeEngine(lowerer);
    const gatedNames = new Map<string, string | undefined>();
    const res = await engine.run(
      [
        record('up'),
        record('g', {
          inputs: { base: { kind: 'feature', id: 'up' } },
          metadata: { name: 'gatedBox', enabled: { evaluated: 0, paramRef: 'addBox' } },
        }),
      ],
      { gatedFeatureNames: gatedNames },
    );
    expect(lowerer.calls).toEqual(['up']);
    expect(res.shapes.get('g')).toBe(res.shapes.get('up'));
    expect(res.health.get('g')).toBe('healthy');
    expect(gatedNames.get('gatedBox')).toBe('addBox');
  });

  it('warns and passthroughs when a face ref names a gated feature', async () => {
    const lowerer = new StubLowerer(async () => ({ shape: okShape(), diagnostics: [] }));
    const engine = new RecomputeEngine(lowerer);
    const warnings: string[] = [];
    const res = await engine.run(
      [
        record('up'),
        record('g', {
          inputs: {
            base: { kind: 'feature', id: 'up' },
            face: { kind: 'face', featureId: 'up', ref: { kind: 'label', name: 'gatedBox' } },
          },
          metadata: { name: 'gatedBox', enabled: { evaluated: 0, paramRef: 'addBox' } },
        }),
      ],
      { warningSink: (w) => warnings.push(w.message), gatedFeatureNames: new Map() },
    );
    expect(warnings).toEqual([
      "feature 'gatedBox' gated off by param 'addBox' (=false); box on 'gatedBox' became a passthrough.",
    ]);
    expect(res.shapes.get('g')).toBe(res.shapes.get('up'));
    expect(res.health.get('g')).toBe('warning');
  });

  it('resolves params from the table before gating and lowering', async () => {
    const seen: number[] = [];
    const lowerer = new StubLowerer(async (r) => {
      seen.push(r.params.width.evaluated);
      return { shape: okShape(), diagnostics: [] };
    });
    const engine = new RecomputeEngine(lowerer);
    const paramTable = new ParamTable();
    paramTable.declare('width', 'number', 42);
    await engine.run(
      [record('a', { params: { width: { expression: 'width', unit: 'mm', evaluated: 1, paramRef: 'width' } } })],
      { paramTable },
    );
    expect(seen).toEqual([42]);
  });
});
