// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeEach, describe, expect, it, vi } from 'vitest';

const repairScriptTool = vi.fn();

vi.mock('../../../src/agent/mcp/tools/repairScript', () => ({
  repairScriptTool: (...args: unknown[]) => repairScriptTool(...args),
}));

import { buildRevisionAssist } from '../../../src/agent/loop/revisionAssist';

describe('buildRevisionAssist auto-apply path', () => {
  beforeEach(() => {
    repairScriptTool.mockReset();
  });

  it('returns auto-applied suggestedCode when repair_script accepts a candidate', async () => {
    repairScriptTool.mockResolvedValue({
      ok: true,
      strategy: 'try-all',
      target: { id: 'feature.edge-feature.short-edges-skipped@fillet_1#0', code: 'feature.edge-feature.short-edges-skipped' },
      candidates: [{
        id: 'c1',
        diagnosticId: 'feature.edge-feature.short-edges-skipped@fillet_1#0',
        code: 'feature.edge-feature.short-edges-skipped',
        summary: 'Shrink fillet radius to 4',
        predictedEffect: 'edges blend',
        patch: { startLine: 2, endLine: 2, before: 'return b.fillet(9);', after: 'return b.fillet(4);' },
        evidence: { radius: 4 },
      }],
      candidateStatus: 'candidates',
      attempts: [],
      applied: 'c1',
      new_code: 'const b = box(10, 10, 10);\nreturn b.fillet(4);\n',
      diff: '@@ -2,1 +2,1 @@\n-return b.fillet(9);\n+return b.fillet(4);',
    });

    const assist = await buildRevisionAssist({
      source: 'const b = box(10, 10, 10);\nreturn b.fillet(9);\n',
      goal: 'simple block',
      reviewFacts: [],
      diagnostics: [{ code: 'feature.edge-feature.short-edges-skipped' }],
      autoRevise: true,
    });

    expect(assist?.mode).toBe('auto-applied-candidate');
    expect(assist?.autoApplied?.suggestedCode).toContain('fillet(4)');
    expect(assist?.suggestedPatches?.[0]?.diff).toContain('fillet');
    expect(repairScriptTool).toHaveBeenCalledOnce();
  });

  it('skips repair_script when autoRevise is false', async () => {
    const assist = await buildRevisionAssist({
      source: 'return box(1,1,1);',
      goal: 'production housing',
      reviewFacts: [{
        code: 'assembly.quality.stacked-primitive-toy',
        severity: 'warning',
        message: 'toy',
      }],
      diagnostics: [{ code: 'feature.subtractive-noop' }],
      autoRevise: false,
    });

    expect(repairScriptTool).not.toHaveBeenCalled();
    expect(assist?.mode).toBe('hints-only');
  });
});
