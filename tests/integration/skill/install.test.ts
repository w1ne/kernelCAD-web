// tests/integration/skill/install.test.ts
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_BIN = join(__dirname, '..', '..', '..', 'dist', 'cli', 'index.js');

const SKIP = !existsSync(CLI_BIN);
const PUBLIC_SKILLS = [
  'kernelcad', 'kernelcad-assemblies', 'kernelcad-authoring', 'kernelcad-drawings',
  'kernelcad-fea', 'kernelcad-features', 'kernelcad-fields', 'kernelcad-from-reference',
  'kernelcad-kinematic', 'kernelcad-mcp', 'kernelcad-nurbs', 'kernelcad-params',
  'kernelcad-parts', 'kernelcad-patterns', 'kernelcad-print', 'kernelcad-repair',
  'kernelcad-sdformat', 'kernelcad-sheet-metal', 'kernelcad-srdf', 'kernelcad-tubes',
  'kernelcad-urdf',
];

describe.skipIf(SKIP)('skill install (built CLI)', () => {
  it('writes SKILL.md to a target directory', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-skill-int-'));
    execFileSync(process.execPath, [CLI_BIN, 'skill', 'install', tmp], { encoding: 'utf8' });
    // The install command copies each skill into its own subdirectory.
    const target = join(tmp, 'kernelcad', 'SKILL.md');
    expect(existsSync(target)).toBe(true);
    const content = readFileSync(target, 'utf8');
    expect(content).toMatch(/^---\nname: kernelcad/);
  });

  it('installs the complete public foundation skill set without commercial policy', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-skill-int-'));
    execFileSync(process.execPath, [CLI_BIN, 'skill', 'install', tmp], { encoding: 'utf8' });
    const dirs = readdirSync(tmp).sort();
    expect(dirs).toEqual(PUBLIC_SKILLS);
    expect(dirs).not.toContain('kernelcad-shopcheck');
  });

  it('writes combined skill content to an explicit path via skill onefile', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-skill-int-'));
    const out = join(tmp, 'context.md');
    execFileSync(process.execPath, [CLI_BIN, 'skill', 'onefile', out], { encoding: 'utf8' });
    expect(existsSync(out)).toBe(true);
    const content = readFileSync(out, 'utf8');
    expect(content).toMatch(/^---\nname: kernelcad/);
  });
});
