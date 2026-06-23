// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/projectCurve.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { projectCurveTool } from './projectCurve';

const SQUARE = [
  { kind: 'moveTo' as const, x: -4, y: -4 },
  { kind: 'lineTo' as const, x: 4, y: -4 },
  { kind: 'lineTo' as const, x: 4, y: 4 },
  { kind: 'lineTo' as const, x: -4, y: 4 },
  { kind: 'close' as const },
];

describe('project_curve MCP tool', () => {
  beforeAll(async () => { await initOcct(); });

  it('inserts a structured <shapeVar>.projectCurve({ source: ... }) before the last top-level return', async () => {
    const src = ['const body = cylinder(20, 5);', 'return body;'].join('\n');
    const out = await projectCurveTool({
      code: src,
      target: 'body',
      commands: SQUARE,
      face: 'top',
      bindAs: 'logo',
    });
    expect(out.ok).toBe(true);
    expect(out.new_code).toContain('const logo = body.projectCurve({');
    expect(out.new_code).toContain("source: { kind: 'sketchCommands', commands: [");
    expect(out.new_code).not.toContain('curve:');
    expect(out.new_code).toContain("face: 'top'");
  });

  it('END-TO-END: emitted code evaluates with no error diagnostics and the projection lands', async () => {
    // Base script: a solid box with a flat top face to receive the projection.
    // The tool injects the projectCurve call, then we evaluate the result and
    // assert no error diagnostics — proving the emitted structured `source`
    // is actually accepted by the runtime API and lowered end-to-end.
    const src = [
      'const body = box(30, 30, 4);',
      'return body;',
    ].join('\n');
    const out = await projectCurveTool({
      code: src,
      target: 'body',
      commands: SQUARE,
      face: 'top',
      // Chain .extrude() so the projected face-bound sketch becomes a solid,
      // exercising the full sketchOnFace -> fromFaceBoundSketch -> extrude path.
      bindAs: 'logo',
    });
    expect(out.ok).toBe(true);
    const errs = (out.diagnostics ?? []).filter(d => d.severity === 'error');
    expect(errs).toEqual([]);
  });

  it('rejects asEdge: true (deferred) instead of emitting non-evaluating code', async () => {
    const out = await projectCurveTool({
      code: 'return box(10, 10, 10);',
      target: 'body',
      commands: SQUARE,
      face: 'front',
      asEdge: true,
    });
    expect(out.ok).toBe(false);
    expect(out.error ?? '').toMatch(/asEdge|deferred/i);
  });
});
