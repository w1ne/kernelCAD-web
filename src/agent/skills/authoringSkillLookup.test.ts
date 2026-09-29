// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lookupAuthoringSkill, parseAuthoringSkill } from './authoringSkillLookup';
import * as vendoredBundle from '../mcp/toolRegistry';

const SKILL = readFileSync('src/agent/skills/kernelcad-authoring/SKILL.md', 'utf8');

describe('lookupAuthoringSkill', () => {
  it('the full SKILL.md is far over an MCP response limit (why sections exist)', () => {
    expect(SKILL.length).toBeGreaterThan(60_000);
  });

  it('no args: quick-start + index under 8k chars', () => {
    const r = lookupAuthoringSkill(SKILL);
    expect(r.mode).toBe('index');
    expect(r.text.length).toBeLessThan(8_000);
    expect(r.text).toContain('## Coordinate System');
    expect(r.text).toContain('## Conventions');
    // Every ## section is listed by id.
    for (const s of parseAuthoringSkill(SKILL).sections.filter((x) => x.level === 2)) {
      expect(r.text).toContain(`\`${s.id}\``);
    }
    expect(r.text).toContain('`top-level-functions`');
  });

  it('section returns that section in full, including its subsections', () => {
    const r = lookupAuthoringSkill(SKILL, { section: 'materials' });
    expect(r.mode).toBe('section');
    expect(r.text.startsWith('## Materials')).toBe(true);
    expect(r.text).toContain('### Per-face materials');
    expect(r.text).not.toContain('## Reference images');
  });

  it('a ### section is addressable and topic accepts a loose title', () => {
    expect(lookupAuthoringSkill(SKILL, { section: 'top-level-functions' }).text).toMatch(/^### Top-level functions/);
    expect(lookupAuthoringSkill(SKILL, { topic: 'CLI commands' }).sections).toEqual(['cli-commands']);
  });

  it("section 'all' keeps the old full body", () => {
    expect(lookupAuthoringSkill(SKILL, { section: 'all' }).text).toBe(SKILL);
  });

  it('query returns matching sections, capped', () => {
    const r = lookupAuthoringSkill(SKILL, { query: 'glass brushed metal finish' });
    expect(r.mode).toBe('search');
    expect(r.sections).toContain('glass-brushed-metal-textured-surfaces');
    expect(r.text.length).toBeLessThan(30_000);
  });

  it('unknown section answers with the index instead of the whole file', () => {
    const r = lookupAuthoringSkill(SKILL, { section: 'no-such-thing' });
    expect(r.mode).toBe('not-found');
    expect(r.text).toContain('`coordinate-system`');
    expect(r.text.length).toBeLessThan(8_000);
  });

  it('headings inside fenced code are not sections', () => {
    const md = '# T\n\nintro\n\n## A\n\ntext a.\n\n```md\n## not a heading\n```\n\n## B\n\ntext b.\n';
    const { sections } = parseAuthoringSkill(md);
    expect(sections.map((s) => s.id)).toEqual(['a', 'b']);
    expect(sections[0].text).toContain('## not a heading');
  });

  it('is re-exported from the vendored bundle entry for kernelCAD-server', () => {
    expect(vendoredBundle.lookupAuthoringSkill).toBe(lookupAuthoringSkill);
    expect(vendoredBundle.LOOKUP_AUTHORING_SKILL_INPUT_SCHEMA.properties).toHaveProperty('section');
    expect(vendoredBundle.LOOKUP_AUTHORING_SKILL_DESCRIPTION).toMatch(/NO arguments first/);
  });
});
