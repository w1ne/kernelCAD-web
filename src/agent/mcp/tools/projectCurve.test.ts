// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/projectCurve.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { projectCurveTool } from './projectCurve';

describe('project_curve MCP tool', () => {
  beforeAll(async () => { await initOcct(); });

  it('inserts a <shapeVar>.projectCurve({...}) chained call before the last top-level return', async () => {
    const src = [
      'const body = cylinder(20, 5);',
      'return body;',
    ].join('\n');
    const out = await projectCurveTool({
      code: src,
      target: 'body',
      curveExpression: 'path().moveTo(0,0).lineTo(2,0).lineTo(2,2).close().build()',
      face: 'top',
      bindAs: 'logo',
    });
    expect(out.ok).toBe(true);
    expect(out.new_code).toContain(`const logo = body.projectCurve({`);
    expect(out.new_code).toContain(`curve: path().moveTo(0,0).lineTo(2,0).lineTo(2,2).close().build()`);
    expect(out.new_code).toContain(`face: 'top'`);
  });

  it('serializes asEdge:true (deferred at lower time, captured at edit)', async () => {
    const src = `return box(10, 10, 10);`;
    const out = await projectCurveTool({
      code: src,
      target: 'box',
      curveExpression: 'someCurve',
      face: 'front',
      asEdge: true,
    });
    expect(out.ok).toBe(true);
    expect(out.new_code).toContain('asEdge: true');
  });
});
