// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';

// The type fixture for `EdgeSelector` `{ face }` forms must also build: the
// type only advertises forms that the fillet/chamfer lowerers accept.
describe('edge selector face wrapper fixture', () => {
  it('evaluate_script builds every { face } form without an error', async () => {
    const code = readFileSync(
      join(__dirname, '../../unit/scripts/fixtures/edge-face-wrapper.kcad.ts'),
      'utf8',
    );
    const result = await callMcpTool('evaluate_script', { code }) as {
      ok: boolean;
      diagnostics: Array<{ code: string; severity: string; message?: string }>;
    };
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ok).toBe(true);
  }, 180_000);
});
