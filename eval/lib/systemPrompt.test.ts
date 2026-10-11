// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildSystemPrompt, DEFAULT_EVAL_SKILLS, describeSkillSelection, loadSkillSelection, parseSkillSelection, SWEEP_SKILLS,
} from './systemPrompt';
import { loadCombinedSkillMd } from '../skillContext';

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

describe('parseSkillSelection', () => {
  it('defaults to the authoring + MCP core', () => {
    expect(parseSkillSelection([])).toEqual({ mode: 'default', skills: DEFAULT_EVAL_SKILLS });
    expect(DEFAULT_EVAL_SKILLS).toEqual(['kernelcad-authoring', 'kernelcad-mcp']);
  });

  it('--all-skills restores every skill; --skills picks a list', () => {
    expect(parseSkillSelection(['--all-skills'])).toEqual({ mode: 'all' });
    expect(parseSkillSelection(['--skills', 'a, b'])).toEqual({ mode: 'custom', skills: ['a', 'b'] });
    expect(describeSkillSelection({ mode: 'all' })).toBe('all');
  });

  it('rejects a missing list and the two flags together', () => {
    expect(() => parseSkillSelection(['--skills'])).toThrow(/comma-separated/);
    expect(() => parseSkillSelection(['--skills', 'a', '--all-skills'])).toThrow(/mutually exclusive/);
  });

  it('loads the selection: the default is far smaller than every skill', () => {
    const all = loadSkillSelection({ mode: 'all' }, loadCombinedSkillMd);
    const core = loadSkillSelection(parseSkillSelection([]), loadCombinedSkillMd);
    expect(core).toContain('name: kernelcad-authoring');
    expect(core).toContain('name: kernelcad-mcp');
    expect(core.length * 3).toBeLessThan(all.length);
  });
});
