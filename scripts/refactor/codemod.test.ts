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

  it('rewrites importer-side depth when importer moves but target does NOT', async () => {
    // Regression for PR-1 dispatch failure: src/capture/proxy.ts imported
    // '../runtime/paramRef'. Capture moved under src/shared/ but runtime did
    // not. The specifier still needs '../../runtime/paramRef' so resolution
    // works from the importer's new depth.
    await writeFile(join(root, 'src/sibling.ts'), `export const z = 2;\n`);
    await writeFile(
      join(root, 'src/mover.ts'),
      `import { z } from './sibling';\nexport const y = z;\n`,
    );
    const { rename } = await import('node:fs/promises');
    await mkdir(join(root, 'src/shared'), { recursive: true });
    await rename(join(root, 'src/mover.ts'), join(root, 'src/shared/mover.ts'));

    await rewriteImports({
      projectRoot: root,
      mapping: { 'src/mover.ts': 'src/shared/mover.ts' },
    });

    const updated = await readFile(join(root, 'src/shared/mover.ts'), 'utf8');
    expect(updated).toContain(`import { z } from '../sibling';`);
  });

  it('rewrites type-position import() expressions (TS inline type imports)', async () => {
    // Regression for PR-1: src/capture/captureSession.ts uses `import('../intent/types').T`
    // as a type annotation. The codemod's CallExpression branch missed these because
    // they're TypeScript ImportType AST nodes, not ImportKeyword call expressions.
    await writeFile(join(root, 'src/types.ts'), `export type T = number;\n`);
    await writeFile(
      join(root, 'src/uses.ts'),
      `export const x: import('./types').T = 1;\n`,
    );
    const { rename } = await import('node:fs/promises');
    await mkdir(join(root, 'src/sub'), { recursive: true });
    await rename(join(root, 'src/uses.ts'), join(root, 'src/sub/uses.ts'));

    await rewriteImports({
      projectRoot: root,
      mapping: { 'src/uses.ts': 'src/sub/uses.ts' },
    });

    const updated = await readFile(join(root, 'src/sub/uses.ts'), 'utf8');
    expect(updated).toContain(`import('../types').T`);
  });

  it('rewrites CommonJS require() calls', async () => {
    // Regression for PR-1: src/capture/proxy.ts contains
    //   `require('../backends/occt/flattenPattern') as typeof import('../...')`
    // Both the require() and the typeof import() halves need rewriting.
    await writeFile(join(root, 'src/mod.ts'), `module.exports = { v: 1 };\n`);
    await writeFile(
      join(root, 'src/loader.ts'),
      `const m = require('./mod') as typeof import('./mod');\n`,
    );
    const { rename } = await import('node:fs/promises');
    await mkdir(join(root, 'src/sub'), { recursive: true });
    await rename(join(root, 'src/loader.ts'), join(root, 'src/sub/loader.ts'));

    await rewriteImports({
      projectRoot: root,
      mapping: { 'src/loader.ts': 'src/sub/loader.ts' },
    });

    const updated = await readFile(join(root, 'src/sub/loader.ts'), 'utf8');
    expect(updated).toContain(`require('../mod')`);
    expect(updated).toContain(`typeof import('../mod')`);
  });

  it('rewrites dynamic imports in root-level *.config.ts files', async () => {
    // Regression for PR-1: vite.config.ts at repo root carried `import('./src/capture/...')`
    // which the codemod missed because it only scanned src/tests/scripts/eval.
    await writeFile(join(root, 'src/target.ts'), `export const v = 1;\n`);
    await writeFile(
      join(root, 'vite.config.ts'),
      `export default { build: { lazy: () => import('./src/target') } };\n`,
    );
    const { rename } = await import('node:fs/promises');
    await mkdir(join(root, 'src/sub'), { recursive: true });
    await rename(join(root, 'src/target.ts'), join(root, 'src/sub/target.ts'));

    await rewriteImports({
      projectRoot: root,
      mapping: { 'src/target.ts': 'src/sub/target.ts' },
    });

    const updated = await readFile(join(root, 'vite.config.ts'), 'utf8');
    expect(updated).toContain(`import('./src/sub/target')`);
  });
});
