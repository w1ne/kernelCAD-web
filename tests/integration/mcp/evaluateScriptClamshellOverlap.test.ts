// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { readFileSync } from 'node:fs';
import { describe, expect, it, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';

const SOURCE = new URL('../../../cookbook/snippets/clamshell-enclosure-release-pack.md', import.meta.url);

function sourceCode(): string {
  const markdown = readFileSync(SOURCE, 'utf8');
  const code = markdown.match(/```typescript\n([\s\S]*?)\n```/)?.[1];
  if (code === undefined) throw new Error('clamshell cookbook script was not found');
  return code;
}

function withAttachedIntruder(): string {
  return sourceCode().replace(
    'return arm.solvedModel({});',
    `const seedIntruder = arm.part('seed-intruder', box(80, 80, 80, true));
seedIntruder.connector('origin', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
arm.mate('seed-intruder-fix', 'seed-intruder.origin', 'base-shell.gasket', 'fastened');
return arm.solvedModel({});`,
  );
}

describe('evaluate_script rest-pose overlap on the clamshell enclosure', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('keeps the clean clamshell real', async () => {
    const out = await evaluateScriptTool({ code: sourceCode() });
    expect(out.ok).toBe(true);
    expect(out.mechanism).toBe('real');
    expect(out.diagnostics.some((d) => d.code === 'mechanism.rest-interpenetration')).toBe(false);
  }, 120_000);

  it('reports the mated intruder as a rest-pose mechanism failure', async () => {
    const out = await evaluateScriptTool({ code: withAttachedIntruder() });
    const overlap = out.diagnostics.find((d) => d.code === 'mechanism.rest-interpenetration');
    expect(overlap, JSON.stringify(out.diagnostics.map((d) => d.code))).toBeDefined();
    expect(overlap!.severity).toBe('error');
    expect(overlap!.message).toContain("'base-shell'");
    expect(overlap!.message).toContain("'seed-intruder'");
    expect(overlap!.hint).toBeTruthy();
    expect(out.diagnostics.some((d) => d.code === 'feature.invalid-args')).toBe(false);
    expect(out.mechanism).toBe('broken');
    expect(out.ok).toBe(false);
  }, 120_000);
});
