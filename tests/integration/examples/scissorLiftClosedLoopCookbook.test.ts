// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Issue #1265: the fused mid-pose X-links intersect the lowered platform at
// the 80 mm travel limit. A solvedModel ignore declaration must not make the
// evaluate_script mechanism verdict claim a clean sweep.
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

describe('scissor-lift-closed-loop cookbook — ignored swept collision', () => {
  const code = snippetBody('scissor-lift-closed-loop');

  it('dry-run is green (capture-only path agents often stop at)', async () => {
    const r = await evaluateScriptTool({ code, dryRun: true });
    expect(r.ok, JSON.stringify(r.diagnostics.slice(0, 3))).toBe(true);
    expect(r.parts?.names.sort()).toEqual(['base-frame', 'lift-actuator', 'platform']);
  }, 60_000);

  it('full evaluate_script fails with the ignored base/platform collision at the lower limit', async () => {
    const r = await evaluateScriptTool({ code });
    expect(r.mechanism).toBe('broken');
    expect(r.ok).toBe(false);
    const collision = r.diagnostics.find((d) => d.code === 'mechanism.interpenetration');
    expect(collision?.message).toMatch(/'base-frame'.*'platform'.*'platform-lift:80'/);
    expect(collision?.hint).toMatch(/remove.*ignore|correct.*geometry/i);
    expect(r.mechanismSummary?.ignoredPairs).toEqual([['base-frame', 'platform']]);
    expect(r.parts?.names.sort()).toEqual(['base-frame', 'lift-actuator', 'platform']);
  }, 180_000);

  it('keeps clean clamshell and 4-axis arm cookbooks sweep-clean', async () => {
    for (const id of ['clamshell-enclosure-release-pack', 'multi-dof-robot-arm-4axis']) {
      const r = await evaluateScriptTool({ code: snippetBody(id) });
      expect(r.ok, `${id}: ${JSON.stringify(r.diagnostics.slice(0, 3))}`).toBe(true);
      expect(r.mechanism, id).toBe('real');
    }
  }, 60_000);

  it('lookup_cookbook still routes scissor queries here', async () => {
    const r = await lookupCookbookTool({ query: 'scissor lift layout scaffold', k: 5 });
    expect(r.ok).toBe(true);
    expect(r.hits!.map((h) => h.id)).toContain('scissor-lift-closed-loop');
  });
});
