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

describe.skipIf(SKIP)('skill install (built CLI)', () => {
  it('writes SKILL.md to a target directory', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-skill-int-'));
    execFileSync('node', [CLI_BIN, 'skill', 'install', tmp], { encoding: 'utf8' });
    // The install command copies each skill into its own subdirectory.
    const target = join(tmp, 'kernelcad', 'SKILL.md');
    expect(existsSync(target)).toBe(true);
    const content = readFileSync(target, 'utf8');
    expect(content).toMatch(/^---\nname: kernelcad/);
  });

  it('installs all 17 skill subdirectories', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-skill-int-'));
    execFileSync('node', [CLI_BIN, 'skill', 'install', tmp], { encoding: 'utf8' });
    const dirs = readdirSync(tmp);
    expect(dirs.length).toBe(17);
  });

  it('writes combined skill content to an explicit path via skill onefile', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-skill-int-'));
    const out = join(tmp, 'context.md');
    execFileSync('node', [CLI_BIN, 'skill', 'onefile', out], { encoding: 'utf8' });
    expect(existsSync(out)).toBe(true);
    const content = readFileSync(out, 'utf8');
    expect(content).toMatch(/^---\nname: kernelcad/);
  });
});
