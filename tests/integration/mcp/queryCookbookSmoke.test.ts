// tests/integration/mcp/queryCookbookSmoke.test.ts
//
// Q6 cookbook smoke. Loads each Q-S<N>-*.kcad.ts snippet under
// `src/agent/skills/<skill>/cookbook/snippets/` and asserts it
// evaluates clean through `evaluateScriptTool`.
//
// Per `[[feedback_actually_use_what_you_ship]]`: cookbook snippets that
// document the surface MUST be live-executable. A snippet that doesn't
// run is a bug in user-visible docs.
//
// Per Q1.5 sign-off + plan §"Task Q6": exactly 6 snippets ship.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';

const SKILL_ROOTS = [
  'src/agent/skills/kernelcad-features',
  'src/agent/skills/kernelcad-assemblies',
  'src/agent/skills/kernelcad-mcp',
] as const;

function discoverCookbookSnippets(): Array<{ skill: string; path: string; name: string }> {
  const out: Array<{ skill: string; path: string; name: string }> = [];
  for (const root of SKILL_ROOTS) {
    const dir = join(root, 'cookbook', 'snippets');
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.kcad.ts')) continue;
      if (!f.startsWith('Q-S')) continue;
      out.push({ skill: root, path: join(dir, f), name: f });
    }
  }
  return out;
}

describe('Q6 cookbook snippets — smoke test', () => {
  const snippets = discoverCookbookSnippets();

  it('exactly 6 Q-S snippets ship (Q-S1 through Q-S6)', () => {
    const names = snippets.map((s) => s.name).sort();
    expect(names.length).toBe(6);
    // Each Q-S1..Q-S6 must appear once.
    for (let i = 1; i <= 6; i++) {
      const hits = names.filter((n) => n.startsWith(`Q-S${i}-`));
      expect(hits.length, `expected exactly one Q-S${i}-*.kcad.ts; got ${hits.length}`).toBe(1);
    }
  });

  for (const snippet of snippets) {
    it(`${snippet.name} evaluates clean via evaluate_script (ok:true)`, async () => {
      const code = readFileSync(snippet.path, 'utf8');
      const r = await evaluateScriptTool({ code });
      if (!r.ok) {
        const summary = r.diagnostics.slice(0, 3).map((d) => `${d.code}: ${d.message}`).join('\n');
        throw new Error(`Snippet ${snippet.name} failed:\n${summary}`);
      }
      expect(r.ok).toBe(true);
      expect(r.featureCount).toBeGreaterThan(0);
    });
  }
});
