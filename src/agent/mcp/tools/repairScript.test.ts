// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// End-to-end repair: a broken fixture goes in, a repaired script that
// evaluates clean comes out. Each case covers one diagnostic kind whose fix is
// derived from geometry the kernel already computed, so a passing test is
// evidence the derivation is right — not just that a patch applied.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { repairScriptTool } from './repairScript';
import { evaluateScriptTool } from './evaluateScript';
import { TOOL_OUTPUT_SCHEMAS } from '../toolOutputSchemas';

interface RepairCase {
  name: string;
  /** Broken source. */
  code: string;
  /** Diagnostic the repair must clear. */
  code_expected: string;
  /** Text the accepted patch must introduce, proving the derived value landed. */
  expectInNewCode: string;
}

const CASES: RepairCase[] = [
  {
    name: 'fillet radius larger than every adjacent edge',
    code: 'const b = box(10, 10, 10);\nreturn b.fillet(9);',
    code_expected: 'feature.edge-feature.short-edges-skipped',
    expectInNewCode: 'b.fillet(4)',
  },
  {
    name: 'chamfer distance larger than every adjacent edge',
    code: 'const b = box(10, 10, 10);\nreturn b.chamfer(8);',
    code_expected: 'feature.edge-feature.short-edges-skipped',
    expectInNewCode: 'b.chamfer(4)',
  },
  {
    name: 'boolean difference whose cutter misses the base',
    code: [
      'const base = box(10, 10, 10);',
      'const cutter = box(2, 2, 2).translate(100, 100, 100);',
      'return base.subtract(cutter);',
    ].join('\n'),
    code_expected: 'feature.subtractive-noop',
    expectInNewCode: '.translate(4, 4, 4)',
  },
  {
    name: 'intersection of disjoint bodies',
    code: [
      'const a = box(10, 10, 10);',
      'const b = box(10, 10, 10).translate(100, 100, 100);',
      'return a.intersect(b);',
    ].join('\n'),
    code_expected: 'feature.intersection-empty',
    expectInNewCode: '.translate(0, 0, 0)',
  },
  {
    name: 'hole anchored off its entry face',
    code: "return box(20, 20, 20).hole('top', { u: 80, v: 0, diameter: 4, depth: 10 });",
    code_expected: 'feature.subtractive-noop',
    expectInNewCode: 'u: 8',
  },
  {
    name: 'edge selector pointing at a coordinate with no edges',
    code: 'const b = box(20, 20, 20);\nreturn b.fillet(1, { atZ: 999 });',
    code_expected: 'feature.selection.no-match',
    expectInNewCode: 'atZ: 20',
  },
  {
    name: 'misspelled sketch-segment label',
    code: [
      "const p = path().moveTo(0, 0).lineTo(20, 0).label('rim').lineTo(20, 20).lineTo(0, 20).close();",
      'const s = p.extrude(10);',
      "return s.fillet(1, { face: 'rym' });",
    ].join('\n'),
    code_expected: 'feature.label.unknown-name',
    expectInNewCode: "face: 'rim'",
  },
  {
    name: 'emboss with zero depth',
    code: [
      'const b = box(40, 20, 6);',
      "return b.embossText({ textContent: 'HI', face: 'top', size: 4, depth: 0 });",
    ].join('\n'),
    code_expected: 'feature.emboss-text.depth-zero',
    expectInNewCode: 'depth: 0.3',
  },
  {
    name: 'face anchor outside the [0, 1] range',
    code: [
      'const b = box(40, 20, 6);',
      "return b.embossText({ textContent: 'HI', face: 'top', size: 4, depth: 0.5, anchorU: 1.8, anchorV: 0.5 });",
    ].join('\n'),
    code_expected: 'feature.face.invalid-uv-anchor',
    expectInNewCode: 'anchorU: 1',
  },
];

describe('repair_script — end to end', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  for (const testCase of CASES) {
    it(`repairs ${testCase.name}`, async () => {
      // The fixture really is broken, for the reason the case claims.
      const before = await evaluateScriptTool({ code: testCase.code, skipMechanismCheck: true });
      expect(before.ok).toBe(false);
      expect(before.diagnostics.map(d => d.code)).toContain(testCase.code_expected);

      const repaired = await repairScriptTool({ code: testCase.code, strategy: 'try-all' });
      expect(repaired.ok, JSON.stringify(repaired.attempts)).toBe(true);
      expect(repaired.target?.code).toBe(testCase.code_expected);
      expect(repaired.applied).toBeDefined();
      expect(repaired.new_code).toContain(testCase.expectInNewCode);
      expect(repaired.diff).toMatch(/^@@ /);

      // The repaired script evaluates clean — the real acceptance criterion.
      const after = await evaluateScriptTool({
        code: repaired.new_code!,
        skipMechanismCheck: true,
      });
      expect(after.ok, JSON.stringify(after.diagnostics)).toBe(true);
      expect(after.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
      expect(repaired.after?.featureHealth).toEqual([]);
    }, 120000);
  }
});

describe('repair_script — bounds and honesty', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('reports no-automatic-candidate with a region when no fix is derivable', async () => {
    const code = [
      'const p = path().moveTo(0, 0).lineTo(10, 0).lineTo(10, 0.0001).close();',
      'return p.extrude(0.0001);',
    ].join('\n');
    const repaired = await repairScriptTool({ code });

    expect(repaired.ok).toBe(false);
    expect(repaired.candidateStatus).toBe('no-automatic-candidate');
    expect(repaired.candidates).toEqual([]);
    expect(repaired.new_code).toBeUndefined();
    // The region is still the useful part of the answer.
    expect(repaired.repairRegion?.ranges.length).toBeGreaterThan(0);
    expect(repaired.diagnostics?.map(d => d.code)).toContain('tool.repair.no-candidate');
  }, 120000);

  it('keeps every candidate patch inside the repair region', async () => {
    const repaired = await repairScriptTool({
      code: [
        'const base = box(10, 10, 10);',
        'const cutter = box(2, 2, 2).translate(100, 100, 100);',
        'return base.subtract(cutter);',
      ].join('\n'),
      strategy: 'dry-run',
    });

    expect(repaired.candidates.length).toBeGreaterThan(0);
    const region = repaired.repairRegion!;
    for (const candidate of repaired.candidates) {
      const inside = region.ranges.some(
        range =>
          candidate.patch.startLine >= range.startLine &&
          candidate.patch.endLine <= range.endLine,
      );
      expect(inside, `candidate ${candidate.id} escaped the region`).toBe(true);
    }
  }, 120000);

  it('dry-run previews patches without evaluating or accepting anything', async () => {
    const repaired = await repairScriptTool({
      code: 'const b = box(10, 10, 10);\nreturn b.fillet(9);',
      strategy: 'dry-run',
    });

    expect(repaired.ok).toBe(true);
    expect(repaired.strategy).toBe('dry-run');
    expect(repaired.attempts).toEqual([]);
    expect(repaired.applied).toBeUndefined();
    expect(repaired.new_code).toBeUndefined();
    expect(repaired.before).toBeUndefined();
    expect(repaired.diff).toContain('b.fillet(4)');
    // Candidates are ordered: the largest feasible value first.
    expect(repaired.candidates.map(c => c.id)).toEqual([
      'fillet_1:shrink-radius:4',
      'fillet_1:shrink-radius:2.5',
      'fillet_1:shrink-radius:1',
    ]);
  }, 120000);

  it('bounds the walk by max_attempts', async () => {
    const repaired = await repairScriptTool({
      code: 'const b = box(10, 10, 10);\nreturn b.fillet(9);',
      strategy: 'try-all',
      max_attempts: 1,
    });
    expect(repaired.attempts.length).toBeLessThanOrEqual(1);
  }, 120000);

  it('applies only the top candidate under apply-first', async () => {
    const repaired = await repairScriptTool({
      code: 'const b = box(10, 10, 10);\nreturn b.fillet(9);',
      strategy: 'apply-first',
    });
    expect(repaired.attempts.length).toBe(1);
    expect(repaired.attempts[0].candidateId).toBe('fillet_1:shrink-radius:4');
  }, 120000);

  it('says so when there is nothing to repair', async () => {
    const repaired = await repairScriptTool({ code: 'return box(10, 10, 10);' });
    expect(repaired.ok).toBe(false);
    expect(repaired.error).toMatch(/already evaluates clean/);
  }, 120000);

  it('rejects an unknown diagnostic id instead of repairing something else', async () => {
    const repaired = await repairScriptTool({
      code: 'const b = box(10, 10, 10);\nreturn b.fillet(9);',
      diagnostic: 'not.a.real.code@fillet_1#0',
    });
    expect(repaired.ok).toBe(false);
    expect(repaired.error).toMatch(/No diagnostic with id/);
    expect(repaired.attempts).toEqual([]);
  }, 120000);

  it('declares its output shape in the MCP output schema', () => {
    const schema = TOOL_OUTPUT_SCHEMAS.repair_script;
    expect(schema).toBeDefined();
    expect(schema.properties.new_code).toBeDefined();
    expect(schema.properties.repairRegion).toBeDefined();
    expect(schema.properties.attempts).toBeDefined();
    expect(schema.required).toContain('ok');
  });
});
