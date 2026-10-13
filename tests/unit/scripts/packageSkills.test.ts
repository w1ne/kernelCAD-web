import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
// @ts-expect-error — build helper is native ESM JavaScript.
import { copyPackageSkills } from '../../../scripts/lib/packageSkills.mjs';

const root = process.cwd();

describe('npm package skills', () => {
  it('copies the real skill tree with metadata.version tied to package.json', () => {
    mkdirSync(join(root, 'node_modules/.tmp'), { recursive: true });
    const out = mkdtempSync(join(root, 'node_modules/.tmp/package-skills-'));
    try {
      const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
      copyPackageSkills(join(root, 'src/agent/skills'), out, pkg.version);
      const skill = readFileSync(join(out, 'kernelcad/SKILL.md'), 'utf8');
      const metadata = parse(skill.split('---')[1]);
      expect(metadata.metadata.version).toBe(pkg.version);
      const paths = readdirSync(out, { recursive: true, encoding: 'utf8' })
        .filter(path => path.endsWith('SKILL.md'));
      expect(paths.length).toBeGreaterThan(20);
      for (const path of paths) {
        const frontmatter = readFileSync(join(out, path), 'utf8').split('---')[1];
        expect(parse(frontmatter).metadata.version, path).toBe(pkg.version);
      }
      expect(skill).toContain('Load `kernelcad-authoring`');
      expect(existsSync(join(out, 'kernelcad-from-reference/blockout-model/SKILL.md'))).toBe(true);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  it('restamps every nested skill on a version bump, preserving assets and other metadata', () => {
    mkdirSync(join(root, 'node_modules/.tmp'), { recursive: true });
    const out = mkdtempSync(join(root, 'node_modules/.tmp/package-skills-'));
    const source = join(out, 'source');
    const dest = join(out, 'dest');
    mkdirSync(join(source, 'nested'), { recursive: true });
    const skill = '---\nname: sample\ndescription: sample skill\nmetadata:\n  version: "0.1.0"\n  author: kernelCAD\n---\n\n# Unchanged body\n';
    writeFileSync(join(source, 'SKILL.md'), skill);
    writeFileSync(join(source, 'nested/SKILL.md'), skill);
    writeFileSync(join(source, 'nested/recipe.md'), '# Recipe\n');
    try {
      copyPackageSkills(source, dest, '0.17.0');
      writeFileSync(join(dest, 'obsolete.md'), 'stale');
      copyPackageSkills(source, dest, '0.18.0-beta.1');
      for (const path of ['SKILL.md', 'nested/SKILL.md']) {
        const result = readFileSync(join(dest, path), 'utf8');
        expect(parse(result.split('---')[1]).metadata).toEqual({ version: '0.18.0-beta.1', author: 'kernelCAD' });
        expect(result.endsWith('\n\n# Unchanged body\n')).toBe(true);
      }
      expect(readFileSync(join(source, 'SKILL.md'), 'utf8')).toBe(skill);
      expect(readFileSync(join(dest, 'nested/recipe.md'), 'utf8')).toBe('# Recipe\n');
      expect(existsSync(join(dest, 'obsolete.md'))).toBe(false);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
