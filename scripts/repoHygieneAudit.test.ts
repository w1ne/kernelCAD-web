// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function gitLsFiles(path: string): string[] {
  const out = execFileSync('git', ['ls-files', path], { encoding: 'utf8' }).trim();
  return out ? out.split('\n') : [];
}

describe('repo hygiene audit', () => {
  it('keeps local environment files out of git and documents required variables', () => {
    expect(gitLsFiles('.env')).toEqual([]);
    expect(gitLsFiles('.env.local')).toEqual([]);
    expect(readFileSync('.gitignore', 'utf8')).toContain('\n.env\n');
    expect(readFileSync('.gitignore', 'utf8')).toContain('\n.env.local\n');

    expect(existsSync('.env.example')).toBe(true);
    const example = readFileSync('.env.example', 'utf8');
    expect(example).toContain('VITE_XAI_API_KEY=');
    expect(example).not.toMatch(/VITE_XAI_API_KEY=.+/);
  });

  it('keeps SPDX license headers on TypeScript sources under src/', () => {
    const spdxLine = '// SPDX-License-Identifier: MIT';
    const files = gitLsFiles('src').filter((f) => /\.(ts|tsx)$/.test(f));
    expect(files.length).toBeGreaterThan(0);
    const missing = files.filter((f) => {
      // Header must sit in the first three lines (line 1, or below a shebang).
      const head = readFileSync(f, 'utf8').split('\n', 3);
      return !head.some((line) => line.trim() === spdxLine);
    });
    expect(
      missing,
      `files missing the SPDX header — run \`node scripts/addSpdxHeaders.mjs\`:\n${missing.join('\n')}`,
    ).toEqual([]);
  });
});
