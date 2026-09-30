// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// ChatGPT fail J: agents stop after dry-run / cookbook:evaluate (no mechanism
// probe) while full evaluate_script reports mechanism=broken on
// actuator-fix joint-mesh-gap. This test pins the cookbook to mechanism=real
// through the same evaluateScriptTool path agents use.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { lookupCookbookTool } from '../../../src/agent/mcp/tools/lookupCookbook';

function snippetBody(id: string): string {
  const md = readFileSync(`cookbook/snippets/${id}.md`, 'utf8');
  return md.split('```typescript')[1].split('```')[0];
}

beforeAll(async () => {
  await initOcct();
}, 60_000);

describe('scissor-lift-closed-loop cookbook — mechanism=real', () => {
  const code = snippetBody('scissor-lift-closed-loop');

  it('dry-run is green (capture-only path agents often stop at)', async () => {
    const r = await evaluateScriptTool({ code, dryRun: true });
    expect(r.ok, JSON.stringify(r.diagnostics.slice(0, 3))).toBe(true);
    expect(r.parts?.names.sort()).toEqual(['base-frame', 'lift-actuator', 'platform']);
  }, 60_000);

  it('full evaluate_script is green with mechanism=real (joint-mesh probe)', async () => {
    const r = await evaluateScriptTool({ code });
    expect(r.mechanism, JSON.stringify(r.diagnostics.map((d) => `${d.code}: ${d.message.slice(0, 160)}`))).toBe('real');
    expect(r.ok, JSON.stringify(r.diagnostics.slice(0, 5))).toBe(true);
    expect(r.diagnostics.filter((d) => d.code === 'mechanism.joint-mesh-gap')).toEqual([]);
    expect(r.parts?.names.sort()).toEqual(['base-frame', 'lift-actuator', 'platform']);
  }, 180_000);

  it('lookup_cookbook still routes scissor queries here', async () => {
    const r = await lookupCookbookTool({ query: 'scissor lift table mechanism=real', k: 5 });
    expect(r.ok).toBe(true);
    expect(r.hits!.map((h) => h.id)).toContain('scissor-lift-closed-loop');
  });
});
