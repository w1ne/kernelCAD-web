// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { blockoutAssemblyTool } from '../../../../src/agent/mcp/tools/blockoutAssembly';
import { evaluateScriptTool } from '../../../../src/agent/mcp/tools/evaluateScript';

const parts = [
  { name: 'A1', bboxMm: [54.4, 27.9, 10] as [number, number, number], positionMm: [10, 20, 0] as [number, number, number], anchors: [{ name: 'P1', positionMm: [12, 22, 5] as [number, number, number] }] },
  { name: 'M-1', bboxMm: [20, 10, 5] as [number, number, number], positionMm: [80, 20, 0] as [number, number, number], anchors: [{ name: 'P1', positionMm: [82, 22, 2] as [number, number, number] }] },
];

describe('blockout_assembly', () => {
  it('emits corner-anchored box solids, bbox anchors, user anchors and preserves positionMm for non-coincident connections', () => {
    const result = blockoutAssemblyTool({ parts, connections: [{ from: 'A1.P1', to: 'M-1.P1' }] });
    expect(result.ok).toBe(true);
    expect(result.part_count).toBe(2);
    expect(result.connection_count).toBe(1);
    const script = result.script!;
    expect(script).toContain("assembly(\"blockout\")");
    expect(script).toContain('blockoutAssembly.part("A1", box(54.4, 27.9, 10), { at: [10, 20, 0] })');
    expect(script).toContain('part_A1.connector("bbox_center", { type: \'frame\', origin: { kind: \'vec3\', value: [27.2, 13.95, 5] } })');
    expect(script).toContain('part_A1.connector("anchor_p1", { type: \'frame\', origin: { kind: \'vec3\', value: [2, 2, 5] } })');
    expect(script).not.toContain(".mate(");
    expect(script).toContain('A1.anchor_p1 -> M-1.anchor_p1');
    expect(script).toContain('return blockoutAssembly.model();');
    expect(result.warnings.join(' ')).toContain('connectivity intent only');
  });

  it('emits fastened mates only for coincident on-body anchors and passes evaluate_script cleanly', async () => {
    const result = blockoutAssemblyTool({
      name: 'coincident_stack',
      parts: [
        { name: 'plate', bboxMm: [50, 50, 2], positionMm: [0, 0, 0] },
        { name: 'chip', bboxMm: [20, 20, 5], positionMm: [15, 15, 2] },
      ],
      connections: [{ from: 'plate.bbox_z_max', to: 'chip.bbox_z_min' }],
    });
    expect(result.ok).toBe(true);
    expect(result.connection_count).toBe(1);
    expect(result.script).toContain('"plate.bbox_z_max", "chip.bbox_z_min", \'fastened\'');
    const evaluated = await evaluateScriptTool({ code: result.script! });
    expect(evaluated.ok).toBe(true);
    expect(evaluated.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  }, 120000);

  it('evaluates spatially separated blockout connections with zero mechanism.rest-interpenetration errors (#1819)', async () => {
    const result = blockoutAssemblyTool({
      name: 'greenhouse_vent_pcb_blockout',
      parts: [
        { name: 'stm32_bluepill', bboxMm: [53, 22.8, 12], positionMm: [7, 4, 1.6], anchors: [{ name: 'pcb_seat', positionMm: [33.5, 15.4, 1.6] }] },
        { name: 'oled_ssd1306', bboxMm: [27, 27, 4.5], positionMm: [20, 30, 1.6], anchors: [{ name: 'pcb_seat', positionMm: [33.5, 43.5, 1.6] }] },
        { name: 'bme280_sensor', bboxMm: [11.5, 15, 3], positionMm: [50, 62, 1.6], anchors: [{ name: 'pcb_seat', positionMm: [55.75, 69.5, 1.6] }] },
        { name: 'sg90_servo', bboxMm: [22.5, 12, 22.7], positionMm: [5, 62, 1.6], anchors: [{ name: 'pcb_seat', positionMm: [16.25, 68, 1.6] }] },
      ],
      connections: [
        { from: 'stm32_bluepill.pcb_seat', to: 'oled_ssd1306.pcb_seat' },
        { from: 'stm32_bluepill.pcb_seat', to: 'bme280_sensor.pcb_seat' },
        { from: 'stm32_bluepill.pcb_seat', to: 'sg90_servo.pcb_seat' },
      ],
    });
    expect(result.ok).toBe(true);
    expect(result.part_count).toBe(4);
    expect(result.connection_count).toBe(3);
    expect(result.script).not.toContain(".mate(");
    const evaluated = await evaluateScriptTool({ code: result.script! });
    expect(evaluated.ok).toBe(true);
    const errors = evaluated.diagnostics.filter(d => d.severity === 'error');
    expect(errors).toEqual([]);
    expect(evaluated.diagnostics.some(d => d.code === 'mechanism.rest-interpenetration')).toBe(false);
  }, 120000);

  it('accepts built-in anchors in connections and warns on unresolved endpoints', () => {
    const result = blockoutAssemblyTool({ parts, connections: [{ from: 'A1.bbox_x_max', to: 'M-1.origin' }, { from: 'A1.nope', to: 'M-1.origin' }, { from: 'X.y', to: 'A1.origin' }] });
    expect(result.connection_count).toBe(1);
    expect(result.warnings.filter(w => w.includes('does not resolve'))).toHaveLength(2);
  });

  it('normalizes rotated boxes so anchors stay at their placed world positions', async () => {
    const result = blockoutAssemblyTool({ parts: [{ name: 'R', bboxMm: [10, 20, 30], positionMm: [100, 200, 0], rotationDeg: 90, anchors: [{ name: 'a', positionMm: [100, 200, 0] }] }] });
    expect(result.script).toContain('box(10, 20, 30).rotate([0, 0, 1], 90).translate(20, 0, 0)');
    expect(result.script).toContain('Rotated bbox envelope: 20 x 10 x 30 mm');
    expect(result.script).toContain('part_R.connector("anchor_a", { type: \'frame\', origin: { kind: \'vec3\', value: [0, 0, 0] } })');

    const multiAxis = blockoutAssemblyTool({
      name: 'multi_axis_rotated_mate',
      parts: [
        { name: 'rot', bboxMm: [10, 20, 30], positionMm: [0, 0, 0], rotationDeg: [90, 90, 0] },
        { name: 'cap', bboxMm: [10, 10, 10], positionMm: [20, 10, 0], anchors: [{ name: 'touch', positionMm: [20, 15, 5] }] },
      ],
      connections: [{ from: 'rot.bbox_y_max', to: 'cap.touch' }],
    });
    expect(multiAxis.ok).toBe(true);
    expect(multiAxis.script).toContain('box(10, 20, 30).rotate([1, 0, 0], 90).rotate([0, 1, 0], 90)');
    expect(multiAxis.script).toContain('"rot.bbox_y_max", "cap.anchor_touch", \'fastened\'');
    const evaluated = await evaluateScriptTool({ code: multiAxis.script! });
    expect(evaluated.ok).toBe(true);
    expect(evaluated.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  }, 120000);

  it('skips fastened mates for same-part or off-body coincident anchors', () => {
    const result = blockoutAssemblyTool({
      parts: [
        { name: 'P1', bboxMm: [10, 10, 10], positionMm: [0, 0, 0], anchors: [{ name: 'floating', positionMm: [50, 50, 50] }] },
        { name: 'P2', bboxMm: [10, 10, 10], positionMm: [20, 0, 0], anchors: [{ name: 'floating', positionMm: [50, 50, 50] }] },
        { name: 'R45', bboxMm: [10, 20, 10], positionMm: [0, 0, 0], rotationDeg: 45 },
      ],
      connections: [
        { from: 'P1.origin', to: 'P1.origin' },
        { from: 'P1.floating', to: 'P2.floating' },
        { from: 'R45.origin', to: 'P1.origin' },
      ],
    });
    expect(result.ok).toBe(true);
    expect(result.connection_count).toBe(3);
    expect(result.script).not.toContain('.mate(');
    expect(result.script).toContain('same-part anchor reference');
    expect(result.script).toContain('anchor lies outside part solid');
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
