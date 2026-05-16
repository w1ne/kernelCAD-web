import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rewriteImports } from './codemod';

describe('rewriteImports codemod', () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'codemod-test-'));
    await mkdir(join(root, 'src'), { recursive: true });
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('rewrites a simple relative import after a single-file move', async () => {
    await writeFile(join(root, 'src/foo.ts'), `export const x = 1;\n`);
    await writeFile(
      join(root, 'src/bar.ts'),
      `import { x } from './foo';\nexport const y = x;\n`,
    );
    // Caller already moved the file on disk; codemod only rewrites imports.
    await mkdir(join(root, 'src/sub'), { recursive: true });
    const { rename } = await import('node:fs/promises');
    await rename(join(root, 'src/foo.ts'), join(root, 'src/sub/foo.ts'));

    await rewriteImports({
      projectRoot: root,
      mapping: { 'src/foo.ts': 'src/sub/foo.ts' },
    });

    const updated = await readFile(join(root, 'src/bar.ts'), 'utf8');
    expect(updated).toContain(`import { x } from './sub/foo';`);
  });

  it('rewrites imports from a file when both importer and target move', async () => {
    await writeFile(join(root, 'src/foo.ts'), `export const x = 1;\n`);
    await writeFile(
      join(root, 'src/bar.ts'),
      `import { x } from './foo';\nexport const y = x;\n`,
    );
    const { rename } = await import('node:fs/promises');
    await mkdir(join(root, 'src/a'), { recursive: true });
    await mkdir(join(root, 'src/b'), { recursive: true });
    await rename(join(root, 'src/foo.ts'), join(root, 'src/a/foo.ts'));
    await rename(join(root, 'src/bar.ts'), join(root, 'src/b/bar.ts'));

    await rewriteImports({
      projectRoot: root,
      mapping: {
        'src/foo.ts': 'src/a/foo.ts',
        'src/bar.ts': 'src/b/bar.ts',
      },
    });

    const updated = await readFile(join(root, 'src/b/bar.ts'), 'utf8');
    expect(updated).toContain(`import { x } from '../a/foo';`);
  });

  it('rewrites re-exports', async () => {
    await writeFile(join(root, 'src/foo.ts'), `export const x = 1;\n`);
    await writeFile(join(root, 'src/index.ts'), `export * from './foo';\n`);
    const { rename } = await import('node:fs/promises');
    await mkdir(join(root, 'src/sub'), { recursive: true });
    await rename(join(root, 'src/foo.ts'), join(root, 'src/sub/foo.ts'));

    await rewriteImports({
      projectRoot: root,
      mapping: { 'src/foo.ts': 'src/sub/foo.ts' },
    });

    const updated = await readFile(join(root, 'src/index.ts'), 'utf8');
    expect(updated).toContain(`export * from './sub/foo';`);
  });

  it('leaves non-matching imports untouched', async () => {
    await writeFile(join(root, 'src/foo.ts'), `export const x = 1;\n`);
    await writeFile(join(root, 'src/keep.ts'), `export const z = 2;\n`);
    await writeFile(
      join(root, 'src/bar.ts'),
      `import { x } from './foo';\nimport { z } from './keep';\n`,
    );
    const { rename } = await import('node:fs/promises');
    await mkdir(join(root, 'src/sub'), { recursive: true });
    await rename(join(root, 'src/foo.ts'), join(root, 'src/sub/foo.ts'));

    await rewriteImports({
      projectRoot: root,
      mapping: { 'src/foo.ts': 'src/sub/foo.ts' },
    });

    const updated = await readFile(join(root, 'src/bar.ts'), 'utf8');
    expect(updated).toContain(`import { x } from './sub/foo';`);
    expect(updated).toContain(`import { z } from './keep';`);
  });

  it('handles dynamic import() expressions', async () => {
    await writeFile(join(root, 'src/foo.ts'), `export const x = 1;\n`);
    await writeFile(
      join(root, 'src/lazy.ts'),
      `export const lazy = () => import('./foo');\n`,
    );
    const { rename } = await import('node:fs/promises');
    await mkdir(join(root, 'src/sub'), { recursive: true });
    await rename(join(root, 'src/foo.ts'), join(root, 'src/sub/foo.ts'));

    await rewriteImports({
      projectRoot: root,
      mapping: { 'src/foo.ts': 'src/sub/foo.ts' },
    });

    const updated = await readFile(join(root, 'src/lazy.ts'), 'utf8');
    expect(updated).toContain(`import('./sub/foo')`);
  });
});
