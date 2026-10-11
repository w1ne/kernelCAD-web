// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  fullAuthoringSkill, lookupAuthoringSkill, parseAuthoringSkill, parseWithReferences,
} from './authoringSkillLookup';
import { AUTHORING_REFERENCES } from './authoringReferences.gen';
import { readReferenceFiles, renderReferencesModule, GENERATED_PATH } from '../../../scripts/buildAuthoringReferences';
import * as vendoredBundle from '../mcp/toolRegistry';

const SKILL = readFileSync('src/agent/skills/kernelcad-authoring/SKILL.md', 'utf8');
const FULL = fullAuthoringSkill(SKILL);

describe('lookupAuthoringSkill', () => {
  it('SKILL.md is the lean core; the full skill (with references) is far over an MCP response limit', () => {
    expect(SKILL.length).toBeLessThanOrEqual(15_500);
    expect(FULL.length).toBeGreaterThan(60_000);
  });

  it('the embedded references match references/*.md (run npm run skill:references)', () => {
    expect(readFileSync(GENERATED_PATH, 'utf8')).toBe(renderReferencesModule(readReferenceFiles()));
    expect(AUTHORING_REFERENCES.map((r) => r.file)).toContain('references/api.md');
  });

  it('no args: quick-start + index under 16k chars', () => {
    const r = lookupAuthoringSkill(SKILL);
    expect(r.mode).toBe('index');
    expect(r.text.length).toBeLessThan(16_000);
    expect(r.text).toContain('## Coordinate System');
    expect(r.text).toContain('## Conventions');
    expect(r.text).toContain('## Before you finish');
    // Every ## section, in SKILL.md or a reference file, is listed by id.
    for (const s of parseWithReferences(SKILL).sections.filter((x) => x.level === 2)) {
      expect(r.text).toContain(`\`${s.id}\``);
    }
    expect(r.text).toContain('`top-level-functions`');
  });

  it('every section of every reference file is addressable by id', () => {
    for (const ref of AUTHORING_REFERENCES) {
      for (const s of parseAuthoringSkill(ref.markdown).sections) {
        const r = lookupAuthoringSkill(SKILL, { section: s.id });
        expect(r.sections, `${ref.file}#${s.id}`).toEqual([s.id]);
        expect(r.text).toBe(s.text);
      }
    }
  });

  it('an all-in-one SKILL.md plus the references yields no duplicate ids', () => {
    const ids = parseWithReferences(FULL).sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some((id) => /-2$/.test(id))).toBe(false);
  });

  it('no args: inlines the manufacturing intent → API table, and every cookbook id in it exists', () => {
    const r = lookupAuthoringSkill(SKILL);
    expect(r.text).toContain('## Manufacturing intent → API');
    for (const api of ['thread: { pitch }', 'spurGear(', 'sheetMetal(', "process: 'fdm'", 'lib.standard', 'trace_from_image']) {
      expect(r.text).toContain(api);
    }
    const table = r.text.slice(r.text.indexOf('## Manufacturing intent → API'), r.text.indexOf('## Sections'));
    const ids = [...table.matchAll(/\| ([a-z0-9]+(?:-[a-z0-9]+)+) \|$/gm)].map((m) => m[1]).filter((id) => id !== 'kernelcad-parts');
    expect(ids.length).toBeGreaterThanOrEqual(8);
    const snippetIds = new Set(readdirSync('cookbook/snippets').map((f) => f.replace(/\.md$/, '')));
    for (const id of ids) expect(snippetIds, id).toContain(id);
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

  it("section 'all' returns SKILL.md plus every reference file", () => {
    const all = lookupAuthoringSkill(SKILL, { section: 'all' }).text;
    expect(all).toBe(FULL);
    expect(all.startsWith(SKILL)).toBe(true);
    for (const ref of AUTHORING_REFERENCES) expect(all).toContain(ref.markdown);
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
