// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/edits/projectCurve.test.ts
import { describe, it, expect } from 'vitest';
import { addProjectCurve } from './projectCurve';

const SQUARE = [
  { kind: 'moveTo' as const, x: 0, y: 0 },
  { kind: 'lineTo' as const, x: 2, y: 0 },
  { kind: 'lineTo' as const, x: 2, y: 2 },
  { kind: 'lineTo' as const, x: 0, y: 2 },
  { kind: 'close' as const },
];

describe('addProjectCurve serializer', () => {
  it('emits a structured source: { kind: "sketchCommands", commands: [...] } the runtime accepts', () => {
    const res = addProjectCurve({
      code: 'const body = cylinder(20, 5);\nreturn body;',
      target: 'body',
      commands: SQUARE,
      face: 'top',
      bindAs: 'logo',
    });
    expect(res.ok).toBe(true);
    const code = res.new_code ?? '';
    // Structured source — NOT the old broken `curve:` field.
    expect(code).toContain('const logo = body.projectCurve({');
    expect(code).toContain("source: { kind: 'sketchCommands', commands: [");
    expect(code).not.toContain('curve:');
    // Each command serializes with Param-shaped coordinates (expression/unit/evaluated).
    expect(code).toContain("{ kind: 'moveTo', x: { expression: '0', unit: 'mm', evaluated: 0 }, y: { expression: '0', unit: 'mm', evaluated: 0 } }");
    expect(code).toContain("{ kind: 'lineTo', x: { expression: '2', unit: 'mm', evaluated: 2 }, y: { expression: '2', unit: 'mm', evaluated: 2 } }");
    expect(code).toContain("{ kind: 'close' }");
    expect(code).toContain("face: 'top'");
  });

  it('emits scaleMode when provided', () => {
    const res = addProjectCurve({
      code: 'return cylinder(20, 5);',
      target: 'body',
      commands: SQUARE,
      face: 'top',
      scaleMode: 'bounds',
    });
    expect(res.ok).toBe(true);
    expect(res.new_code ?? '').toContain("scaleMode: 'bounds'");
  });

  it('rejects an empty commands list', () => {
    const res = addProjectCurve({
      code: 'return cylinder(20, 5);',
      target: 'body',
      commands: [],
      face: 'top',
    });
    expect(res.ok).toBe(false);
    expect(res.error ?? '').toMatch(/commands/i);
  });

  it('rejects asEdge: true as a deferred feature rather than emitting non-evaluating code', () => {
    const res = addProjectCurve({
      code: 'return cylinder(20, 5);',
      target: 'body',
      commands: SQUARE,
      face: 'top',
      asEdge: true,
    });
    expect(res.ok).toBe(false);
    expect(res.error ?? '').toMatch(/asEdge|deferred/i);
  });
});
