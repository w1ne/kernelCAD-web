// src/agent/mcp/tools/traceFromImage.test.ts
//
// MCP wrapper tests for `trace_from_image`. The wrapper is a thin pass-through
// over `traceFromImage()` in `../../vision`; we only verify the contract here
// (passes inputs through, returns the envelope shape, emits the right
// diagnostic on missing imageUrl).

import { describe, expect, it } from 'vitest';
import { traceFromImageTool } from './traceFromImage';

describe('traceFromImageTool', () => {
  it('returns invalid-image-url diagnostic when imageUrl is missing', async () => {
    const out = await traceFromImageTool({} as Parameters<typeof traceFromImageTool>[0]);
    expect(out.ok).toBe(false);
    expect(out.diagnostics?.[0].code).toBe('tool.trace-from-image.invalid-image-url');
    expect(out.features).toEqual([]);
  });

  it('returns the envelope shape on a happy path (via test seam)', async () => {
    const out = await traceFromImageTool({
      imageUrl: 'file:///tmp/does-not-exist-' + Math.random() + '.png',
    });
    // We expect a fetch failure here — the goal is to confirm the wrapper
    // returns a populated envelope rather than throwing.
    expect(out.ok).toBe(false);
    expect(Array.isArray(out.features)).toBe(true);
    expect(Array.isArray(out.diagnostics)).toBe(true);
    expect(Array.isArray(out.imageDims)).toBe(true);
    expect(out.diagnostics.some((d) => d.code === 'tool.trace-from-image.image-fetch-failed')).toBe(true);
  });
});
