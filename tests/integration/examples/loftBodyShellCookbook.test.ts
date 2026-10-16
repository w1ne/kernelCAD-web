// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// loft-body-shell-from-profiles: its fillet used to be a silent no-op, so
// fillet-then-shell evaluated in ~2 s; once the fillet really applied, the
// shell of the filleted loft took ~50 s (every thick-solid join mode fails
// on the offset blends and the offset-and-subtract fallback runs). The
// snippet now shells first and fillets after: same technique (loft →
// hollow → softened long edges), a few seconds, and both steps real.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/modeling/buildModel';

function snippetBody(id: string): string {
  return readFileSync(`cookbook/snippets/${id}.md`, 'utf8').split('```typescript')[1].split('```')[0];
}

describe('loft-body-shell-from-profiles cookbook', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('evaluates fast, and the shell and the fillet both apply', async () => {
    const code = snippetBody('loft-body-shell-from-profiles');
    const t0 = Date.now();
    const m = await buildModel({ fileName: 'loft-shell.kcad.ts', code });
    const ms = Date.now() - t0;
    expect(m.diagnostics.filter((d) => d.severity === 'error'), JSON.stringify(m.diagnostics)).toEqual([]);
    const shelled = m.tailShape!.volume();

    const solid = (await buildModel({
      fileName: 'loft-solid.kcad.ts',
      code: code.replace(/return body[\s\S]*$/, 'return body;'),
    })).tailShape!.volume();
    const shellOnly = (await buildModel({
      fileName: 'loft-shell-only.kcad.ts',
      code: code.replace(/\n\s*\.fillet\([^\n]*;/, ';'),
    })).tailShape!.volume();

    // Hollow: a 2.5 mm wall keeps well under half the solid loft.
    expect(shelled).toBeLessThan(0.4 * solid);
    // The fillet changed the shelled body (outer edges rounded, inner corners filled).
    expect(Math.abs(shelled - shellOnly)).toBeGreaterThan(1);
    // A cookbook snippet must stay interactive (was ~50 s with fillet-then-shell).
    expect(ms).toBeLessThan(20_000);
  }, 180_000);
});
