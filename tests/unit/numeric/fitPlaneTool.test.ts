// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { fitPlaneTool } from '../../../src/agent/mcp/tools/fitPlane';
import { TOOL_OUTPUT_SCHEMAS } from '../../../src/agent/mcp/toolOutputSchemas';

describe('fit_plane MCP tool', () => {
  it('returns fits and validation errors as data', () => {
    expect(fitPlaneTool({ points: [[0, 0, 0], [1, 0, 0], [0, 1, 0]] })).toMatchObject({ ok: true, normal: [0, 0, 1], rms: 0 });
    expect(fitPlaneTool({ points: [[0, 0, 0]] })).toMatchObject({ ok: false, error: expect.stringMatching(/three points/) });
  });

  it('advertises a result envelope that accepts fitting errors', () => {
    const schema = TOOL_OUTPUT_SCHEMAS.fit_plane as { required?: string[]; additionalProperties?: boolean; properties?: Record<string, { description?: string }> };
    expect(schema.required).toContain('ok');
    expect(schema.additionalProperties).toBe(true);
    expect(schema.properties?.error?.description).toMatch(/when ok is false/);
  });

  it('returns successful results with the required schema discriminator', () => {
    const result = fitPlaneTool({ points: [[0, 0, 0], [1, 0, 0], [0, 1, 0]] });
    expect(result).toHaveProperty('ok', true);
    expect(TOOL_OUTPUT_SCHEMAS.fit_plane.required).toContain('ok');
  });
});
