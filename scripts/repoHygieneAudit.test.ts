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
});
