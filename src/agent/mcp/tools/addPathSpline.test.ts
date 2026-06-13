// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/addPathSpline.test.ts
//
// V slice — Task V4: tool-level test that addPathSplineTool relays the new
// tangent opts through to the underlying edit + emits a recompute-clean
// fragment. The lower-level edit shape is covered by
// src/agent/mcp/edits/addPathSpline.test.ts.

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { addPathSplineTool } from './addPathSpline';

const SEED = [
  'const brow = path().moveTo(0, 0);',
  'const profile = brow.lineTo(40, 0).close();',
  'const part = profile.extrude(5);',
  'return part;',
].join('\n');

describe('add_path_spline MCP tool — tangent extension', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('relays startTangent + endTangent through to the call fragment', async () => {
    const r = await addPathSplineTool({
      code: SEED,
      chain_anchor: 'brow',
      points: [[0, 0], [5, 10], [10, 0]],
      startTangent: [1, 0],
      endTangent: [1, 0],
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('startTangent: [1,0]');
    expect(r.new_code).toContain('endTangent: [1,0]');
  });

  it('rejects malformed startTangent at the tool layer', async () => {
    const r = await addPathSplineTool({
      code: SEED,
      chain_anchor: 'brow',
      points: [[0, 0], [1, 1]],
      startTangent: [Number.NaN, 0],
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/startTangent/);
  });
});
