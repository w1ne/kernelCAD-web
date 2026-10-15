// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { importHandoffTool } from '../../../../src/agent/mcp/tools/importHandoff';
import { evaluateScriptTool } from '../../../../src/agent/mcp/tools/evaluateScript';

const fixture = JSON.parse(readFileSync(new URL('../../../fixtures/argon/handoff-drawbot.json', import.meta.url), 'utf8')) as Record<string, unknown>;

describe('import_handoff', () => {
  it('imports the LabWired fixture as corner-anchored placeholder assembly with warnings and anchors', () => {
    const result = importHandoffTool({ handoff: fixture });
    expect(result.ok).toBe(true);
    expect(result.part_count).toBe(7);
    expect(result.wire_mate_count).toBeGreaterThan(0);
    expect(result.cutout_hints).toContainEqual({ ref: 'A1', feature: 'usb_micro_b', face: '-X', cutout_mm: [8, 4] });
    expect(result.script).toContain('box(54.4, 27.9, 10)');
    expect(result.script).toContain("connector('bbox_center'");
    expect(result.script).toContain(`connector("hole_1"`);
    expect(result.script).toContain('Cut-out hint for A1 usb_micro_b');
    expect(result.script).toContain("'fastened'");
    expect(result.script).toContain('Endpoint connectivity intent only');
    expect(result.warnings.some(w => w.includes('no wire geometry or routing is generated'))).toBe(true);
    expect(result.script).not.toContain('const wire_');
    expect(result.script).toContain('bbox corner');
    expect(result.warnings.some(w => w.includes('M1: position is null'))).toBe(true);
    expect(result.warnings.some(w => w.includes('J1: bbox'))).toBe(true);
    expect(result.warnings.some(w => w.includes('endpoint position is null'))).toBe(false);
    expect(result.warnings.some(w => w.includes('estimated'))).toBe(true);
  });

  it('rejects unsupported schema, invalid units, duplicate refs, and malformed bboxes', () => {
    expect(importHandoffTool({ handoff: { ...fixture, schema: 'other' } }).ok).toBe(false);
    expect(importHandoffTool({ handoff: { ...fixture, units: 'inch' } }).error).toContain('units');
    const one = (fixture.parts as unknown[])[0] as Record<string, unknown>;
    expect(importHandoffTool({ handoff: { ...fixture, parts: [one, one] } }).error).toContain('duplicate');
    expect(importHandoffTool({ handoff: { ...fixture, parts: [{ ...one, bbox_mm: { value: [1, 0, 1], status: 'exact' } }] } }).error).toContain('bbox_mm');
  });

  it('uses explicit zero defaults with warnings when placement fields are null', () => {
    const part = { ...(fixture.parts as Record<string, unknown>[])[0], position_mm: null, rotation_deg: null };
    const result = importHandoffTool({ handoff: { ...fixture, parts: [part] } });
    expect(result.ok).toBe(true);
    expect(result.script).toContain('{ at: [0, 0, 0] }');
    expect(result.warnings.some(w => w.includes('position is null'))).toBe(true);
    expect(result.warnings.some(w => w.includes('rotation is null'))).toBe(true);
  });

  it('keeps untrusted ref, feature, and face text inside generated comments', () => {
    const first = (fixture.parts as Record<string, unknown>[])[0];
    const payload = 'injected(); */\nconst pwned = true; /*';
    const result = importHandoffTool({ handoff: {
      ...fixture,
      wires: [],
      parts: [{ ...first, ref: `REF\n${payload}`, faces: [{ feature: `FEATURE\n${payload}`, face: `FACE\n${payload}`, center_mm: [1, 2, 3], cutout_mm: [4, 5] }] }],
    } });
    expect(result.ok).toBe(true);
    expect(result.script).toContain('REF injected(); * / const pwned = true; / *: bbox');
    expect(result.script).toContain('Cut-out hint for REF injected(); * / const pwned = true; / * FEATURE injected(); * / const pwned = true; / * on FACE injected(); * / const pwned = true; / *');
    expect(result.script).not.toContain('\nconst pwned');
  });

  it('does not crash on nullable optional handoff fields and imports status-wrapped geometry', () => {
    const first = (fixture.parts as Record<string, unknown>[])[0];
    expect(() => importHandoffTool({ handoff: { ...fixture, board_outline: null, parts: [{ ...first, position_mm: null, rotation_deg: null, physical: { ...first.physical as object, bbox_mm: [10, 20, 3] } }] } })).not.toThrow();
  });

  it('rejects malformed nested geometry arrays and generated-name collisions', () => {
    const first = (fixture.parts as Record<string, unknown>[])[0];
    expect(importHandoffTool({ handoff: { ...fixture, parts: [{ ...first, physical: { ...first.physical as object, connector_faces: null } }] } }).error).toContain('connector_faces');
    expect(importHandoffTool({ handoff: { ...fixture, parts: [{ ...first, ref: 'A-1' }, { ...first, ref: 'A_1' }] } }).error).toContain('collides');
    expect(importHandoffTool({ handoff: { ...fixture, parts: [{ ...first, ref: 'handoffAssembly' }] } }).error).toContain('collides');
  });

  it('normalizes rotated placeholders to their rotated bbox corner and shifts face anchors with the solid', async () => {
    const first = (fixture.parts as Record<string, unknown>[])[0];
    const result = importHandoffTool({ handoff: { ...fixture, wires: [], parts: [{ ...first, ref: 'ROT', bbox_mm: [10, 20, 30], position_mm: [100, 200], rotation_deg: 90, pins: [] }] } });
    expect(result.ok).toBe(true);
    expect(result.script).toContain('box(10, 20, 30).rotate([0, 0, 1], 90).translate(20, 0, 0), { at: [100, 200, 0] }');
    expect(result.script).toContain(`bbox_center', { type: 'frame', origin: { kind: 'vec3', value: [10, 5, 15] }`);
    expect(result.script).toContain(`connector("bbox_x_min", { type: 'frame', origin: { kind: 'vec3', value: [10, 0, 15] }`);
    expect((await evaluateScriptTool({ code: result.script, dryRun: true })).ok).toBe(true);
  });

  it('disambiguates normalized face, pin, and mate names without breaking wire references', async () => {
    const [a, b] = (fixture.parts as Record<string, unknown>[]).slice(0, 2);
    const handoff = {
      ...fixture,
      parts: [
        { ...a, ref: 'A', faces: [{ feature: 'same', center_mm: [1, 1, 1] }, { feature: 'same', center_mm: [2, 2, 2] }], physical: { ...a.physical as object, connector_faces: [{ feature: 'same', center_mm: [3, 3, 3] }] }, pins: [{ name: 'PIN-A', pos_mm: [1, 2] }, { name: 'PIN_A', pos_mm: [2, 3] }] },
        { ...b, ref: 'B', pins: [{ name: 'DEST', pos_mm: [3, 4] }] },
      ],
      wires: [
        { net: 'same-net', from: { ref: 'A', pin: 'PIN-A', pos_mm: [1, 2] }, to: { ref: 'B', pin: 'DEST', pos_mm: [3, 4] } },
        { net: 'same-net', from: { ref: 'A', pin: 'PIN_A', pos_mm: [2, 3] }, to: { ref: 'B', pin: 'DEST', pos_mm: [3, 4] } },
      ],
    };
    const result = importHandoffTool({ handoff });
    expect(result.ok).toBe(true);
    expect(result.script).toContain('connector("face_same_2"');
    expect(result.script).toContain('connector("face_same_3"');
    expect(result.script).toContain('connector("pin_pin_a_2"');
    expect(result.script).toContain('"A.pin_pin_a_2"');
    expect(result.script).toContain('mate("wire_1_same_net"');
    expect(result.script).toContain('mate("wire_2_same_net"');
    const evaluated = await evaluateScriptTool({ code: result.script, dryRun: true });
    expect(evaluated.ok).toBe(true);
  });

  it('rejects malformed metadata on status-wrapped dimensions and placement', () => {
    const first = (fixture.parts as Record<string, unknown>[])[0];
    expect(importHandoffTool({ handoff: { ...fixture, parts: [{ ...first, bbox_mm: { value: null, status: 17 } }] } }).error).toContain('status-wrapper');
    expect(importHandoffTool({ handoff: { ...fixture, parts: [{ ...first, position_mm: { value: null, source: 17 } }] } }).error).toContain('status-wrapper');
  });

  it('converts board-frame pin positions into connector-local coordinates without rotating them twice', () => {
    const first = (fixture.parts as Record<string, unknown>[])[0];
    const result = importHandoffTool({ handoff: { ...fixture, wires: [], parts: [{ ...first, ref: 'PINPART', bbox_mm: [10, 20, 30], position_mm: [100, 200], rotation_deg: 90, pins: [{ name: 'TEST', pos_mm: [105, 205] }] }] } });
    expect(result.ok).toBe(true);
    expect(result.script).toContain('connector("pin_test", { type: \'frame\', origin: { kind: \'vec3\', value: [5, 15, 0] }');
  });

  it('keeps combined Euler rotations aligned with normalized bounds and board-frame pin anchors', () => {
    const first = (fixture.parts as Record<string, unknown>[])[0];
    const result = importHandoffTool({ handoff: { ...fixture, wires: [], parts: [{ ...first, ref: 'COMBINED', bbox_mm: [2, 3, 4], position_mm: [10, 20, 30], rotation_deg: [90, 90, 0], pins: [{ name: 'P', pos_mm: [11, 23, 31] }] }] } });
    expect(result.ok).toBe(true);
    expect(result.script).toContain('box(2, 3, 4).rotate([0, 1, 0], 90).rotate([1, 0, 0], 90).translate(0, 4, 2)');
    expect(result.script).toContain(`bbox_center', { type: 'frame', origin: { kind: 'vec3', value: [1.5, 2, 1] }`);
    expect(result.script).toContain('connector("pin_p", { type: \'frame\', origin: { kind: \'vec3\', value: [1, 1, 1] }');
  });

  it('creates wire mates from resolved named pin anchors when wire positions are null', () => {
    const [source, target] = (fixture.parts as Record<string, unknown>[]).slice(0, 2);
    const handoff = {
      ...fixture,
      parts: [
        { ...source, ref: 'SOURCE', bbox_mm: [10, 10, 2], position_mm: [0, 0], pins: [{ name: 'OUT', pos_mm: [2, 3] }] },
        { ...target, ref: 'TARGET', bbox_mm: [10, 10, 2], position_mm: [20, 0], pins: [{ name: 'IN', pos_mm: [22, 3] }] },
      ],
      wires: [{ net: 'LINK', from: { ref: 'SOURCE', pin: 'OUT', pos_mm: null }, to: { ref: 'TARGET', pin: 'IN', pos_mm: null } }],
    };
    const result = importHandoffTool({ handoff });
    expect(result.ok).toBe(true);
    expect(result.wire_mate_count).toBe(1);
    expect(result.script).toContain('mate("wire_1_link", "SOURCE.pin_out", "TARGET.pin_in", \'fastened\')');
    expect(result.warnings.some(warning => warning.includes('endpoint position'))).toBe(false);
  });

  it('does not create wire mates when a referenced pin has no position', () => {
    const [source, target] = (fixture.parts as Record<string, unknown>[]).slice(0, 2);
    const handoff = {
      ...fixture,
      parts: [
        { ...source, ref: 'SOURCE', bbox_mm: [10, 10, 2], position_mm: [0, 0], pins: [{ name: 'OUT' }] },
        { ...target, ref: 'TARGET', bbox_mm: [10, 10, 2], position_mm: [20, 0], pins: [{ name: 'IN', pos_mm: [22, 3] }] },
      ],
      wires: [{ net: 'MISSING_PIN', from: { ref: 'SOURCE', pin: 'OUT' }, to: { ref: 'TARGET', pin: 'IN' } }],
    };
    const result = importHandoffTool({ handoff });
    expect(result.ok).toBe(true);
    expect(result.wire_mate_count).toBe(0);
    expect(result.script).not.toContain('mate("wire_');
    expect(result.warnings.some(warning => warning.includes('endpoint pin anchor is missing'))).toBe(true);
  });

  it('warns when wire endpoint references are missing or malformed', () => {
    const result = importHandoffTool({ handoff: { ...fixture, wires: [{ net: 'BROKEN', from: { pin: 'P', pos_mm: [1, 2] }, to: { ref: 'A1', pin: 'P', pos_mm: [3, 4] } }] } });
    expect(result.ok).toBe(true);
    expect(result.wire_mate_count).toBe(0);
    expect(result.warnings).toContain('BROKEN: endpoint reference is missing or invalid; no fixed mate was created.');
  });

  it('rotates mounting-hole axis vectors with the part', () => {
    const first = (fixture.parts as Record<string, unknown>[])[0];
    const result = importHandoffTool({ handoff: { ...fixture, wires: [], parts: [{ ...first, ref: 'HOLEPART', bbox_mm: [10, 20, 30], position_mm: [0, 0], rotation_deg: [90, 0, 0], pins: [], mounting_holes: [{ pos_mm: [1, 2], diameter_mm: 3 }] }] } });
    expect(result.ok).toBe(true);
    expect(result.script).toContain('axis: [0, -1, 0]');
  });

  it('rejects malformed supplied connector-face centers', () => {
    const first = (fixture.parts as Record<string, unknown>[])[0];
    expect(importHandoffTool({ handoff: { ...fixture, parts: [{ ...first, faces: [{ feature: 'bad', center_mm: [1, 2] }] }] } }).error).toContain('center_mm');
    expect(importHandoffTool({ handoff: { ...fixture, parts: [{ ...first, physical: { ...first.physical as object, connector_faces: [{ feature: 'bad', center_mm: { value: [1, 2, 'x'], status: 'estimated' } }] } }] } }).error).toContain('center_mm');
  });

  it('emits a script accepted by the capture dry-run', async () => {
    const result = importHandoffTool({ handoff: fixture });
    expect(result.ok).toBe(true);
    const evaluated = await evaluateScriptTool({ code: result.script, dryRun: true });
    expect(evaluated.ok).toBe(true);
    expect(evaluated.parts?.count).toBe(6);
    expect(evaluated.parts?.names).not.toContain('J1');
  });
});
