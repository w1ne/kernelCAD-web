// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Issue #1262: keep the shop-release planetary gearbox valid at rest, and
// reject an animation that translates its fastened cover through geometry.

import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';

const RECIPE = 'cookbook/snippets/planetary-gearbox-shop-release.md';

function recipeSource(): string {
  const markdown = readFileSync(RECIPE, 'utf8');
  const match = markdown.match(/```typescript\r?\n([\s\S]*?)\r?\n```/);
  if (!match) throw new Error(`No TypeScript source block in ${RECIPE}`);
  return match[1];
}

function translatedCoverSeed(source: string): string {
  const assemblyLine = "const arm = assembly('planetary-gearbox-shop');";
  const coverLine = "const c = arm.part('cover', cover, { material: 'aluminum-6061' });";
  const returnLine = 'return arm.solvedModel({});';
  for (const line of [assemblyLine, coverLine, returnLine]) {
    if (source.split(line).length !== 2) throw new Error(`Expected one ${line} in the planetary recipe`);
  }

  return source
    .replace(assemblyLine, `const seedSpin = param('seedSpin', 0, { min: -5, max: 12 });\n${assemblyLine}`)
    .replace(coverLine, "const c = arm.part('cover', cover.translate(0, 0, seedSpin), { material: 'aluminum-6061' });")
    .replace(returnLine, `animationView({
  name: 'seed-fixed-motion',
  tracks: [{ param: 'seedSpin', keys: [{ atMs: 0, value: 0 }, { atMs: 500, value: 8 }] }],
  fps: 12,
});
${returnLine}`);
}

describe('planetary gearbox animation on a fastened cover (#1262)', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60_000);

  it('keeps the clean recipe real and rejects the animated geometry seed', async () => {
    const source = recipeSource();
    const clean = await evaluateScriptTool({ code: source });
    expect(clean.ok).toBe(true);
    expect(clean.mechanism).toBe('real');
    expect(clean.diagnostics.some(d => d.code === 'mechanism.motion-on-fixed-joint')).toBe(false);

    const seeded = await evaluateScriptTool({ code: translatedCoverSeed(source) });
    const failure = seeded.diagnostics.find(d => d.code === 'mechanism.motion-on-fixed-joint');
    expect(seeded.ok).toBe(false);
    expect(seeded.mechanism).toBe('broken');
    expect(failure).toMatchObject({
      severity: 'error',
      mateName: 'cover',
      partName: 'cover',
      paramName: 'seedSpin',
    });
    expect(failure?.message).toMatch(/Param 'seedSpin'.*part 'cover'.*fastened joint 'cover'/);
    expect(failure?.hint).toMatch(/revolute|prismatic/);
  }, 60_000);
});
