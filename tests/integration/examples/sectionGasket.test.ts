// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Pins the section-gasket example so it cannot rot. The example is the
// runnable proof for shape.sectionSketch; it must evaluate cleanly and the
// gasket must be a real cross-section (volume = section area x thickness).

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';

const EXAMPLE = 'examples/section-gasket.kcad.ts';

describe('examples/section-gasket', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('evaluates cleanly', async () => {
    const result = await evaluateScriptTool({ file: EXAMPLE, skipMechanismCheck: true });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  });
});
