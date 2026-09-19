// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildSystemPrompt, SWEEP_SKILLS } from './systemPrompt';

describe('buildSystemPrompt', () => {
  it('joins selected skills in sorted order with separators', () => {
    const root = mkdtempSync(join(tmpdir(), 'skills-'));
    for (const name of ['b', 'a']) {
      mkdirSync(join(root, name));
      writeFileSync(join(root, name, 'SKILL.md'), `# ${name}`);
    }
    const out = buildSystemPrompt(['b', 'a'], root);
    expect(out).toBe('# a\n\n---\n\n# b');
  });

  it('throws when a selected skill is missing', () => {
    const root = mkdtempSync(join(tmpdir(), 'skills-'));
    expect(() => buildSystemPrompt(['nope'], root)).toThrow("SKILL.md not found for skill 'nope'");
  });

  it('ships the pilot skill selection by default', () => {
    expect(SWEEP_SKILLS).toEqual([
      'kernelcad',
      'kernelcad-authoring',
      'kernelcad-assemblies',
      'kernelcad-parts',
    ]);
  });
});
