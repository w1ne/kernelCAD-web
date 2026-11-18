// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The fused mid-pose X-links stay outboard of the moving platform through its
// full authored travel, so the cookbook remains honest without ignored pairs.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { lookupCookbookTool } from '../../../src/agent/mcp/tools/lookupCookbook';
import { verifyTool } from '../../../src/agent/mcp/tools/verify';

function snippetBody(id: string): string {
  const md = readFileSync(`cookbook/snippets/${id}.md`, 'utf8');
  return md.split('```typescript')[1].split('```')[0];
}

beforeAll(async () => {
  await initOcct();
}, 60_000);

describe('scissor-lift-closed-loop cookbook — clear open-chain sweep', () => {
  const code = snippetBody('scissor-lift-closed-loop');

  it('dry-run is green (capture-only path agents often stop at)', async () => {
    const r = await evaluateScriptTool({ code, dryRun: true });
    expect(r.ok, JSON.stringify(r.diagnostics.slice(0, 3))).toBe(true);
    expect(r.parts?.names.sort()).toEqual(['base-frame', 'lift-actuator', 'platform']);
  }, 60_000);

  it('full evaluate_script reports a real mechanism without ignored collisions', async () => {
    const r = await evaluateScriptTool({ code });
    expect(r.mechanism).toBe('real');
    expect(r.ok).toBe(true);
    expect(r.diagnostics.some((d) => d.code === 'mechanism.interpenetration')).toBe(false);
    expect(r.mechanismSummary?.ignoredPairs ?? []).toEqual([]);
    expect(r.parts?.names.sort()).toEqual(['base-frame', 'lift-actuator', 'platform']);
    expect(code).not.toMatch(/ignore\s*:/);
  }, 180_000);

  it('verify swept-collision clears base-frame/platform through the authored limits', async () => {
    const r = await verifyTool({ check: 'swept-collision', code }) as {
      ok: boolean;
      posesSampled: number;
      collidingPoses: Array<{ pose: Record<string, number>; contacts: Array<{ partA: string; partB: string }> }>;
    };
    expect(r.ok).toBe(true);
    expect(r.posesSampled).toBe(71);
    expect(r.collidingPoses).toEqual([]);
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
