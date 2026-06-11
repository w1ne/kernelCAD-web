// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/mcp/tools/addSketchText.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { addSketchTextTool } from './addSketchText';

describe('add_sketch_text MCP tool', () => {
  beforeAll(async () => { await initOcct(); });

  it('inserts a sketch.text(...) call before the last top-level return', async () => {
    const src = [
      'const base = box(80, 30, 3);',
      'return base;',
    ].join('\n');
    const out = await addSketchTextTool({
      code: src,
      content: 'KERNEL',
      size: 12,
      align: 'center',
      position: [40, 15],
      bindAs: 'label',
    });
    expect(out.ok).toBe(true);
    expect(out.new_code).toContain(
      `const label = sketch.text("KERNEL", { size: 12, align: 'center', position: [40, 15] });`,
    );
    expect(out.new_code).toContain('return base;');
    expect(out.diagnostics?.filter(d => d.severity === 'error')).toEqual([]);
  });

  it('omitting bindAs emits an unbound expression statement', async () => {
    const src = `return box(10, 10, 10);`;
    const out = await addSketchTextTool({
      code: src,
      content: 'A',
      size: 5,
    });
    expect(out.ok).toBe(true);
    expect(out.new_code).toContain(`sketch.text("A", { size: 5 });`);
  });

  it('serializes rotation + font when provided', async () => {
    const src = `return box(10, 10, 10);`;
    const out = await addSketchTextTool({
      code: src,
      content: 'KC',
      size: 20,
      align: 'center',
      position: [30, 30],
      rotation: 15,
      bindAs: 'logo',
    });
    expect(out.ok).toBe(true);
    expect(out.new_code).toContain(
      `const logo = sketch.text("KC", { size: 20, align: 'center', position: [30, 30], rotation: 15 });`,
    );
  });

  it('escapes special characters in content', async () => {
    const src = `return box(10, 10, 10);`;
    const out = await addSketchTextTool({
      code: src,
      content: 'A"B',
      size: 5,
    });
    expect(out.ok).toBe(true);
    // Content gets JSON.stringify'd to escape the embedded quote.
    expect(out.new_code).toContain(`sketch.text("A\\"B", { size: 5 });`);
  });

  it('reports error when no top-level return exists', async () => {
    const src = `const x = 1;`;
    const out = await addSketchTextTool({
      code: src,
      content: 'KERNEL',
      size: 12,
    });
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/return/i);
  });
});
