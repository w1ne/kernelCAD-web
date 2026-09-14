// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `why_did_this_fail` used to end at "here is the chain". These tests pin the
// rest of the answer an agent needs to act: which lines it may edit, and what
// edits are on the table.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { whyDidThisFailTool } from './whyDidThisFail';
import { repairScriptTool } from './repairScript';
import { TOOL_OUTPUT_SCHEMAS } from '../toolOutputSchemas';

const OVERSIZED_FILLET = [
  "const radius = param('radius', 9);",
  'const b = box(10, 10, 10);',
  'return b.fillet(9);',
].join('\n');

describe('why_did_this_fail — repair plan', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('keeps returning the upstream chain', async () => {
    const out = await whyDidThisFailTool({ code: OVERSIZED_FILLET });
    expect(out.ok).toBe(true);
    expect(out.chain?.map(entry => entry.feature_id)).toEqual(['box_1', 'fillet_1']);
  }, 120000);

  it('returns the full feature trace alongside the chain', async () => {
    const out = await whyDidThisFailTool({ code: OVERSIZED_FILLET });
    expect(out.trace?.map(entry => entry.feature_id)).toEqual(['box_1', 'fillet_1']);
    const fillet = out.trace?.find(entry => entry.feature_id === 'fillet_1');
    expect(fillet?.location?.line).toBe(3);
    expect(fillet?.nodeRange).toEqual({ startLine: 3, endLine: 3 });
    expect(fillet?.inputs).toEqual(['box_1']);
  }, 120000);

  it('returns a bounded repair region for the failing feature', async () => {
    const out = await whyDidThisFailTool({ code: OVERSIZED_FILLET });
    const ranges = out.repairRegion?.ranges ?? [];
    expect(ranges.some(r => r.role === 'failing-feature' && r.startLine === 3)).toBe(true);
    expect(ranges.some(r => r.role === 'input-feature' && r.startLine === 2)).toBe(true);
    // `radius` is declared but not read by the fillet, so its line is not in
    // the region — the region tracks real data flow, not textual proximity.
    expect(ranges.some(r => r.startLine === 1)).toBe(false);
  }, 120000);

  it('returns ordered candidates with a patch, a predicted effect, and evidence', async () => {
    const out = await whyDidThisFailTool({ code: OVERSIZED_FILLET });
    expect(out.candidateStatus).toBe('candidates');
    const candidates = out.candidates ?? [];
    expect(candidates.length).toBeGreaterThanOrEqual(3);

    const top = candidates[0];
    expect(top.code).toBe('feature.edge-feature.short-edges-skipped');
    expect(top.featureId).toBe('fillet_1');
    expect(top.patch.before).toBe('return b.fillet(9);');
    expect(top.patch.after).toBe('return b.fillet(4);');
    expect(top.predictedEffect.length).toBeGreaterThan(0);
    // The fix is derived from geometry, and says which geometry.
    expect(top.evidence.shortestAdjacentEdgeMm).toBe(10);
    expect(top.evidence.maxFeasibleValueMm).toBe(5);
  }, 120000);

  it('hands repair_script a diagnostic id that selects the same failure', async () => {
    const out = await whyDidThisFailTool({ code: OVERSIZED_FILLET });
    expect(out.targetDiagnosticId).toBeDefined();

    const repaired = await repairScriptTool({
      code: OVERSIZED_FILLET,
      diagnostic: out.targetDiagnosticId!,
      strategy: 'dry-run',
    });
    expect(repaired.target?.id).toBe(out.targetDiagnosticId);
    expect(repaired.candidates.map(c => c.id)).toEqual((out.candidates ?? []).map(c => c.id));
  }, 120000);

  it('reports no-automatic-candidate honestly, with the region still bounded', async () => {
    const out = await whyDidThisFailTool({
      code: [
        'const p = path().moveTo(0, 0).lineTo(10, 0).lineTo(10, 0.0001).close();',
        'return p.extrude(0.0001);',
      ].join('\n'),
    });
    expect(out.candidateStatus).toBe('no-automatic-candidate');
    expect(out.candidates).toEqual([]);
    expect(out.candidateReason).toMatch(/No mechanical fix/);
    expect((out.repairRegion?.ranges ?? []).length).toBeGreaterThan(0);
  }, 120000);

  it('omits the repair plan for a healthy script', async () => {
    const out = await whyDidThisFailTool({ code: 'return box(10, 10, 10);' });
    expect(out.ok).toBe(true);
    expect(out.trace?.length).toBe(1);
    expect(out.repairRegion).toBeUndefined();
    expect(out.candidates).toBeUndefined();
  }, 120000);

  it('declares the new fields in the MCP output schema', () => {
    const schema = TOOL_OUTPUT_SCHEMAS.why_did_this_fail;
    expect(schema.properties.trace).toBeDefined();
    expect(schema.properties.repairRegion).toBeDefined();
    expect(schema.properties.candidates).toBeDefined();
    expect(schema.properties.candidateStatus).toBeDefined();
  });
});

describe('diagnostic id stability', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  // Two failures in one script: the id `why_did_this_fail` hands out for the
  // SECOND one must still select that same diagnostic in `repair_script`,
  // which searches the unfiltered list.
  const TWO_FAILURES = [
    'const a = box(10, 10, 10);',
    'const cutter = box(2, 2, 2).translate(100, 100, 100);',
    'const cut = a.subtract(cutter);',
    'return cut.fillet(9);',
  ].join('\n');

  it('hands out ids that select the same diagnostic in repair_script', async () => {
    const out = await whyDidThisFailTool({ code: TWO_FAILURES, feature_id: 'fillet_1' });
    const id = out.targetDiagnosticId!;
    expect(id).toBeDefined();

    const repaired = await repairScriptTool({
      code: TWO_FAILURES,
      diagnostic: id,
      strategy: 'dry-run',
    });
    expect(repaired.ok).toBe(true);
    expect(repaired.target?.id).toBe(id);
    expect(repaired.target?.code).toBe(
      out.candidates?.[0]?.code ?? out.chain?.at(-1)?.diagnostics[0]?.code,
    );
  }, 120000);
});
