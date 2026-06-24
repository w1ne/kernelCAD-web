// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/addFeature.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { addFeatureTool } from './addFeature';

// Representative coverage for the source-edit wrapper family
// (add_feature / emboss_text / set_param_value / project_curve /
// remove_feature / add_variable_sweep / add_surface_from_boundary /
// add_nurbs_surface / add_sketch_text / add_pattern_feature / path-*).
// All re-evaluate the spliced source and must report `ok` from that
// evaluation rather than hardcoding success.
describe('add_feature MCP tool — ok reflects evaluation', () => {
  beforeAll(async () => { await initOcct(); });

  it('reports ok:true when the spliced feature evaluates clean', async () => {
    const src = ['const base = box(10, 10, 10);', 'return base;'].join('\n');
    const out = await addFeatureTool({ code: src, feature_code: 'const lip = base;' });
    expect(out.new_code).toContain('const lip = base;');
    expect(out.diagnostics?.filter(d => d.severity === 'error')).toEqual([]);
    expect(out.ok).toBe(true);
  });

  it('reports ok:false when the spliced feature fails evaluation', async () => {
    const src = ['const base = box(10, 10, 10);', 'return base;'].join('\n');
    const out = await addFeatureTool({
      code: src,
      // Reachable, type-valid, throws a TypeError at evaluation time.
      feature_code: 'const boom = (base as any).definitelyNotAMethod();',
    });
    // The edit itself succeeds (a top-level return exists), so the new code
    // and diagnostics are still returned for the agent to repair from — but
    // `ok` must reflect the failed evaluation, not the successful splice.
    expect(out.new_code).toContain('definitelyNotAMethod');
    expect(out.diagnostics?.length).toBeGreaterThan(0);
    expect(out.ok).toBe(false);
  });
});
