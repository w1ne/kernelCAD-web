// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/embossText.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { embossTextTool } from './embossText';

describe('emboss_text MCP tool', () => {
  beforeAll(async () => { await initOcct(); });

  it('inserts a <shapeVar>.embossText({...}) chained call before the last top-level return', async () => {
    const src = [
      'const plate = box(80, 30, 3);',
      'return plate;',
    ].join('\n');
    const out = await embossTextTool({
      code: src,
      target: 'plate',
      textContent: 'Ray-Ban',
      size: 6,
      depth: 0.4,
      face: 'top',
      align: 'center',
      bindAs: 'engraved',
    });
    expect(out.ok).toBe(true);
    expect(out.new_code).toContain(`const engraved = plate.embossText({`);
    // Proxy API key is `textContent`, not `text` — see edits/embossText.ts.
    expect(out.new_code).toContain(`textContent: "Ray-Ban"`);
    expect(out.new_code).toContain(`face: 'top'`);
  });

  it('serializes a negative depth (engrave) and a custom anchor', async () => {
    const src = [
      'const part = box(10, 10, 10);',
      'return part;',
    ].join('\n');
    const out = await embossTextTool({
      code: src,
      target: 'part',
      textContent: 'CE',
      size: 2,
      depth: -0.3,
      face: 'bottom',
      anchorU: 0.5,
      anchorV: 0.5,
    });
    expect(out.ok).toBe(true);
    expect(out.new_code).toContain(`depth: -0.3`);
    expect(out.new_code).toContain(`anchorU: 0.5`);
    expect(out.new_code).toContain(`anchorV: 0.5`);
  });

  it('reports error when no top-level return exists', async () => {
    const out = await embossTextTool({
      code: 'const x = 1;',
      target: 'x',
      textContent: 'KC',
      size: 2,
      depth: 0.2,
      face: 'top',
    });
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/return/i);
  });
});
