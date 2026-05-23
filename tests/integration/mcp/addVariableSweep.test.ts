// tests/integration/mcp/addVariableSweep.test.ts
//
// NURBS Slice B Task 11: integration test for the `add_variable_sweep` MCP
// tool. Covers minimal insertion with two sections, binding-resolution
// errors (spine and profile), and a full evaluateScript round-trip so the
// inserted code actually parses through the capture pipeline.

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { addVariableSweepTool } from '../../../src/agent/mcp/tools/addVariableSweep';
import { TOOL_REGISTRY } from '../../../src/agent/mcp/toolRegistry';

// Use a Sketch spine — the curve3d-spine path is gated on a future
// recompute-engine change (see occtLowerer.ts comment at the variableSweep
// arm). Sketch spines lower end-to-end today, which is what this integration
// test exercises through evaluateScript.
const SEED_CODE = [
  'const spineSketch = path().moveTo(0, 0).lineTo(10, 0).lineTo(20, 0).lineTo(30, 0).close();',
  'const profileA = path().moveTo(-2, -2).lineTo(2, -2).lineTo(2, 2).lineTo(-2, 2).close();',
  'const profileB = path().moveTo(-1, -1).lineTo(1, -1).lineTo(1, 1).lineTo(-1, 1).close();',
  'const base = box(1, 1, 1);',
  'return base;',
].join('\n');

describe('add_variable_sweep MCP tool', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('inserts a minimal variableSweep declaration with two sections', async () => {
    const r = await addVariableSweepTool({
      code: SEED_CODE,
      spine_binding: 'spineSketch',
      sections: [
        { t: 0, profile_binding: 'profileA' },
        { t: 1, profile_binding: 'profileB' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toMatch(/const _sweep_1 = variableSweep\(spineSketch, \[/);
    expect(r.new_code).toContain('{ t: 0, profile: profileA }');
    expect(r.new_code).toContain('{ t: 1, profile: profileB }');
    expect(r.new_code).toContain('return base;');
    expect(r.diagnostics?.filter(d => d.severity === 'error') ?? []).toEqual([]);
  });

  it('serializes optional continuity + binding_name', async () => {
    const r = await addVariableSweepTool({
      code: SEED_CODE,
      spine_binding: 'spineSketch',
      sections: [
        { t: 0, profile_binding: 'profileA' },
        { t: 1, profile_binding: 'profileB' },
      ],
      continuity: 'C2',
      binding_name: 'body',
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('const body = variableSweep(spineSketch,');
    expect(r.new_code).toContain('continuity: "C2"');
  });

  it('rejects when spine_binding is not declared in the source', async () => {
    const r = await addVariableSweepTool({
      code: SEED_CODE,
      spine_binding: 'nonexistentSpine',
      sections: [
        { t: 0, profile_binding: 'profileA' },
        { t: 1, profile_binding: 'profileB' },
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/spine_binding "nonexistentSpine" is not declared/);
  });

  it('rejects when any profile_binding is not declared in the source', async () => {
    const r = await addVariableSweepTool({
      code: SEED_CODE,
      spine_binding: 'spineSketch',
      sections: [
        { t: 0, profile_binding: 'profileA' },
        { t: 1, profile_binding: 'ghostProfile' },
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/profile_binding "ghostProfile" is not declared/);
  });

  it('rejects fewer than 2 sections', async () => {
    const r = await addVariableSweepTool({
      code: SEED_CODE,
      spine_binding: 'spineSketch',
      sections: [{ t: 0, profile_binding: 'profileA' }],
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/at least 2/);
  });

  it('rejects non-increasing section t values before insertion', async () => {
    const r = await addVariableSweepTool({
      code: SEED_CODE,
      spine_binding: 'spineSketch',
      sections: [
        { t: 0, profile_binding: 'profileA' },
        { t: 0.5, profile_binding: 'profileB' },
        { t: 0.5, profile_binding: 'profileA' },
        { t: 1, profile_binding: 'profileB' },
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/strictly increasing/);
    expect(r).not.toHaveProperty('new_code');
  });

  it('rejects section t values that do not span 0 to 1 before insertion', async () => {
    const r = await addVariableSweepTool({
      code: SEED_CODE,
      spine_binding: 'spineSketch',
      sections: [
        { t: 0.1, profile_binding: 'profileA' },
        { t: 1, profile_binding: 'profileB' },
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/first t must be 0 and last t must be 1/);
    expect(r).not.toHaveProperty('new_code');
  });

  it('documents that orientation is not exposed by the MCP add tool', () => {
    const entry = TOOL_REGISTRY.find(t => t.definition.name === 'add_variable_sweep');
    expect(entry).toBeDefined();
    expect(entry!.definition.description).toMatch(/orientation/i);
    expect(entry!.definition.description).toMatch(/not exposed/i);
    expect(entry!.definition.inputSchema.properties).not.toHaveProperty('orientation');
  });
});
