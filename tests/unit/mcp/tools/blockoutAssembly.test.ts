// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { blockoutAssemblyTool } from '../../../../src/agent/mcp/tools/blockoutAssembly';

const parts = [
  { name: 'A1', bboxMm: [54.4, 27.9, 10] as [number, number, number], positionMm: [10, 20, 0] as [number, number, number], anchors: [{ name: 'P1', positionMm: [12, 22, 5] as [number, number, number] }] },
  { name: 'M-1', bboxMm: [20, 10, 5] as [number, number, number], positionMm: [80, 20, 0] as [number, number, number], anchors: [{ name: 'P1', positionMm: [82, 22, 2] as [number, number, number] }] },
];

describe('blockout_assembly', () => {
  it('emits corner-anchored box solids, bbox anchors, user anchors and fastened mates', () => {
    const result = blockoutAssemblyTool({ parts, connections: [{ from: 'A1.P1', to: 'M-1.P1' }] });
    expect(result.ok).toBe(true);
    expect(result.part_count).toBe(2);
    expect(result.connection_count).toBe(1);
    const script = result.script!;
    expect(script).toContain("assembly(\"blockout\")");
    expect(script).toContain('blockoutAssembly.part("A1", box(54.4, 27.9, 10), { at: [10, 20, 0] })');
    expect(script).toContain('part_A1.connector("bbox_center", { type: \'frame\', origin: { kind: \'vec3\', value: [27.2, 13.95, 5] } })');
    expect(script).toContain('part_A1.connector("anchor_p1", { type: \'frame\', origin: { kind: \'vec3\', value: [2, 2, 5] } })');
    expect(script).toContain('"A1.anchor_p1", "M-1.anchor_p1", \'fastened\'');
    expect(script).toContain('return blockoutAssembly.model();');
    expect(result.warnings.join(' ')).toContain('connectivity intent only');
  });

  it('accepts built-in anchors in connections and warns on unresolved endpoints', () => {
    const result = blockoutAssemblyTool({ parts, connections: [{ from: 'A1.bbox_x_max', to: 'M-1.origin' }, { from: 'A1.nope', to: 'M-1.origin' }, { from: 'X.y', to: 'A1.origin' }] });
    expect(result.connection_count).toBe(1);
    expect(result.warnings.filter(w => w.includes('does not resolve'))).toHaveLength(2);
  });

  it('normalizes rotated boxes so anchors stay at their placed world positions', () => {
    const result = blockoutAssemblyTool({ parts: [{ name: 'R', bboxMm: [10, 20, 30], positionMm: [100, 200, 0], rotationDeg: 90, anchors: [{ name: 'a', positionMm: [100, 200, 0] }] }] });
    expect(result.script).toContain('box(10, 20, 30).rotate([0, 0, 1], 90).translate(20, 0, 0)');
    expect(result.script).toContain('Rotated bbox envelope: 20 x 10 x 30 mm');
  });

  it('rejects malformed input', () => {
    expect(blockoutAssemblyTool({ parts: [] }).ok).toBe(false);
    expect(blockoutAssemblyTool({ parts: [parts[0], parts[0]] }).error).toContain('duplicate');
    expect(blockoutAssemblyTool({ parts: [{ ...parts[0], bboxMm: [1, 0, 1] }] }).error).toContain('bboxMm');
    expect(blockoutAssemblyTool({ parts: [{ ...parts[0], positionMm: [1, 2] as unknown as [number, number, number] }] }).error).toContain('positionMm');
    expect(blockoutAssemblyTool({ parts: [{ ...parts[0], name: 'A-1' }, { ...parts[0], name: 'A_1' }] }).error).toContain('collides');
    expect(blockoutAssemblyTool({ parts: [{ ...parts[0], anchors: [{ name: '', positionMm: [0, 0, 0] }] }] }).error).toContain('anchors[0]');
  });

  it('neutralizes comment and string injection in names', () => {
    const result = blockoutAssemblyTool({ parts: [{ name: 'x*/\nevil()', bboxMm: [1, 1, 1], positionMm: [0, 0, 0] }] });
    expect(result.script).not.toMatch(/\*\/\s*\nevil\(\)/);
  });
});
