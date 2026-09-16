import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { resolveExampleScript } from '../../../src/server/middleware/resolveExampleScript';

const tempDirs: string[] = [];

function makeRepoRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'kernelcad-resolve-'));
  tempDirs.push(root);
  mkdirSync(join(root, 'examples'), { recursive: true });
  mkdirSync(join(root, 'tests', 'fixtures'), { recursive: true });
  return root;
}

function makeOutsideDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'kernelcad-outside-'));
  tempDirs.push(dir);
  return dir;
}

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

describe('resolveExampleScript', () => {
  it('resolves an existing examples/*.kcad.ts path', () => {
    const root = makeRepoRoot();
    writeFileSync(join(root, 'examples', 'ok.kcad.ts'), 'return box(1, 1, 1);');

    expect(resolveExampleScript('examples/ok.kcad.ts', root)).toBe(
      resolve(root, 'examples/ok.kcad.ts'),
    );
  });

  it('resolves a not-yet-existing examples/*.kcad.ts path through its parent', () => {
    const root = makeRepoRoot();

    expect(resolveExampleScript('examples/new.kcad.ts', root)).toBe(
      resolve(root, 'examples/new.kcad.ts'),
    );
  });

  it('keeps accepting the tests/fixtures allowed root', () => {
    const root = makeRepoRoot();

    expect(resolveExampleScript('tests/fixtures/fixture.kcad.ts', root)).toBe(
      resolve(root, 'tests/fixtures/fixture.kcad.ts'),
    );
  });

  it('rejects .. traversal out of the allowed roots', () => {
    const root = makeRepoRoot();

    expect(resolveExampleScript('examples/../secret.kcad.ts', root)).toBeNull();
    expect(resolveExampleScript('../secret.kcad.ts', root)).toBeNull();
  });

  it('rejects non-.kcad.ts paths', () => {
    const root = makeRepoRoot();
    writeFileSync(join(root, 'examples', 'notes.txt'), 'x');

    expect(resolveExampleScript('examples/notes.txt', root)).toBeNull();
  });

  it('rejects a parent directory symlinked outside the repo root', () => {
    const root = makeRepoRoot();
    const outside = makeOutsideDir();
    symlinkSync(outside, join(root, 'examples', 'evil'), 'dir');

    expect(resolveExampleScript('examples/evil/owned.kcad.ts', root)).toBeNull();
  });

  it('rejects a script whose parent directory does not exist', () => {
    const root = makeRepoRoot();

    expect(resolveExampleScript('examples/missing/new.kcad.ts', root)).toBeNull();
  });

  it('still accepts a symlinked directory that stays inside an allowed root', () => {
    const root = makeRepoRoot();
    mkdirSync(join(root, 'examples', 'sub'), { recursive: true });
    symlinkSync(join(root, 'examples', 'sub'), join(root, 'examples', 'alias'), 'dir');

    expect(resolveExampleScript('examples/alias/ok.kcad.ts', root)).toBe(
      resolve(root, 'examples/alias/ok.kcad.ts'),
    );
  });
});
