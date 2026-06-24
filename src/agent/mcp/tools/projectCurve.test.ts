// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/projectCurve.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { projectCurveTool } from './projectCurve';

describe('project_curve MCP tool', () => {
  beforeAll(async () => { await initOcct(); });

  // NOTE: project_curve is currently non-functional end to end — the edit
  // serializer emits `curve: <raw expr>` while the proxy API reads a structured
  // `source: ProjectCurveSource` ({kind:'sketchCommands'|'drawing'}), and
  // `asEdge` is a deferred (unbuilt) feature. The splice (string edit) works,
  // but evaluation fails. These tests pin the HONEST result — `ok` reflects the
  // failed evaluation rather than the old hardcoded `ok: true` that masked it.
  // Fixing the serializer/source mismatch is tracked as a follow-up.
  it('splices the chained call but reports ok:false (serializer/source mismatch)', async () => {
    const src = [
      'const body = cylinder(20, 5);',
      'return body;',
    ].join('\n');
    const out = await projectCurveTool({
      code: src,
      target: 'body',
      curveExpression: 'path().moveTo(0,0).lineTo(2,0).lineTo(2,2).close()',
      face: 'top',
      bindAs: 'logo',
    });
    // Splice mechanics still work and the code is returned for repair…
    expect(out.new_code).toContain(`const logo = body.projectCurve({`);
    expect(out.new_code).toContain(`face: 'top'`);
    // …but the spliced source does not evaluate cleanly today.
    expect(out.ok).toBe(false);
    expect(out.diagnostics?.length).toBeGreaterThan(0);
  });

  it('captures asEdge:true at edit time but reports ok:false (deferred at lower time)', async () => {
    const src = [
      'const part = box(10, 10, 10);',
      'return part;',
    ].join('\n');
    const out = await projectCurveTool({
      code: src,
      target: 'part',
      curveExpression: 'path().moveTo(0,0).lineTo(2,0).lineTo(2,2).close()',
      face: 'front',
      asEdge: true,
    });
    expect(out.new_code).toContain('asEdge: true');
    expect(out.ok).toBe(false);
  });
});
