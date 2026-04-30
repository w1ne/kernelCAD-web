// tests/integration/skill/install.test.ts
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_BIN = join(__dirname, '..', '..', '..', 'dist', 'cli', 'index.js');

const SKIP = !existsSync(CLI_BIN);

describe.skipIf(SKIP)('skill install (built CLI)', () => {
  it('writes SKILL.md to a target directory', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-skill-int-'));
    const out = execFileSync('node', [CLI_BIN, 'skill', 'install', '--dir', tmp], { encoding: 'utf8' });
    expect(out).toMatch(/Wrote/);
    const target = join(tmp, 'SKILL.md');
    expect(existsSync(target)).toBe(true);
    const content = readFileSync(target, 'utf8');
    expect(content).toMatch(/^---\nname: kernelcad/);
  });

  it('writes SKILL.md to an explicit path via skill one-file', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-skill-int-'));
    const out = join(tmp, 'context.md');
    execFileSync('node', [CLI_BIN, 'skill', 'one-file', out], { encoding: 'utf8' });
    expect(existsSync(out)).toBe(true);
    const content = readFileSync(out, 'utf8');
    expect(content).toMatch(/^---\nname: kernelcad/);
  });
});
