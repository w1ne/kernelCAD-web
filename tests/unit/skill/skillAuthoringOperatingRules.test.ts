import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadCombinedSkillMd } from './_helpers';

const SKILL_MD = loadCombinedSkillMd();

describe('kernelCAD agent authoring operating rules', () => {
  it('documents source-first CAD, explicit artifacts, validation, and standard parts in bundled skills', () => {
    expect(SKILL_MD).toMatch(/Source-first CAD/);
    expect(SKILL_MD).toMatch(/Words to CAD/);
    expect(SKILL_MD).toMatch(/Words to geometry/);
    expect(SKILL_MD).toMatch(/Map words to geometry/);
    expect(SKILL_MD).toMatch(/Agent authoring loop/);
    expect(SKILL_MD).toMatch(/Source and artifact policy/);
    expect(SKILL_MD).toMatch(/explicit provenance metadata/);
    expect(SKILL_MD).toMatch(/generated capture-run metadata/);
    expect(SKILL_MD).toMatch(/Generate explicit targets/);
    expect(SKILL_MD).toMatch(/Validate deterministically/);
    expect(SKILL_MD).toMatch(/Inspect visual artifacts honestly/);
    expect(SKILL_MD).toMatch(/Standard parts and vendor geometry/);
    expect(SKILL_MD).toMatch(/lib\.fromSTEP\(\.\.\.\)/);
  });

  it('imports ForgeCAD loop practices for assemblies, connectors, viewport posing, and artifact packets', () => {
    expect(SKILL_MD).toMatch(/moving parts/i);
    expect(SKILL_MD).toMatch(/connectors? and mates/i);
    expect(SKILL_MD).toMatch(/viewport-side joint/i);
    expect(SKILL_MD).toMatch(/artifact packet/i);
  });

  it('requires deterministic inspection bundles for visual evidence', () => {
    expect(SKILL_MD).toMatch(/inspection bundle/i);
    expect(SKILL_MD).toMatch(/manifest/i);
    expect(SKILL_MD).toMatch(/canonical RGB views/i);
    expect(SKILL_MD).toMatch(/--focus <names>/);
    expect(SKILL_MD).toMatch(/--hide <names>/);
    expect(SKILL_MD).toMatch(/mask/i);
    expect(SKILL_MD).toMatch(/depth/i);
    expect(SKILL_MD).toMatch(/normals/i);
  });

  it('keeps README and Claude repo conventions aligned with the same operating rules', () => {
    const readme = readFileSync('README.md', 'utf8');
    const claude = readFileSync('CLAUDE.md', 'utf8');

    for (const doc of [readme, claude]) {
      expect(doc).toMatch(/source of truth/);
      expect(doc).toMatch(/generated/);
      expect(doc).toMatch(/deterministic/);
      expect(doc).toMatch(/visual/);
      expect(doc).toMatch(/inspection bundle/);
      expect(doc).toMatch(/manifest/);
      expect(doc).toMatch(/canonical RGB views/);
      expect(doc).toMatch(/mask/);
      expect(doc).toMatch(/depth/);
      expect(doc).toMatch(/normals/);
      expect(doc).toMatch(/lib\.fromSTEP/);
    }
  });

  it('keeps the public site capability and gallery tag vocabulary distinct', () => {
    const indexHtml = readFileSync('site/index.html', 'utf8');
    const gallery = JSON.parse(readFileSync('site/gallery/entries.json', 'utf8'));

    expect(indexHtml).toMatch(/Words to CAD/);
    expect(indexHtml).not.toMatch(/capability-name">Words to Geometry/);
    expect(gallery.entries[0].tags).toContain('words-to-geometry');
    expect(gallery.entries[1].tags).toContain('words-to-geometry');
  });
});
