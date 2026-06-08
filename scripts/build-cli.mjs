import esbuild from 'esbuild';
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

function copyDir(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const s = join(src, entry.name);
    const d = join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else copyFileSync(s, d);
  }
}

// `verb-nurbs` is a TS-path-mapped vendored ESM module (see tsconfig.node.json,
// vite.config.ts, vitest.config.ts). The CLI bundler needs the same alias so
// the V slice analytics + tangent-constrained lowerer code paths resolve.
const verbNurbsPath = fileURLToPath(new URL('../vendor/verb-nurbs/build/verb.es.js', import.meta.url));

await esbuild.build({
  entryPoints: ['src/agent/cli/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: 'dist/cli/index.js',
  external: ['commander', 'typescript', 'replicad', 'playwright', 'playwright-core', 'chromium-bidi', 'sharp'],
  alias: {
    'verb-nurbs': verbNurbsPath,
  },
  banner: {
    // __filename/__dirname shim for the ESM bundle. MUST use fileURLToPath, not
    // `new URL(...).pathname`: on Windows the latter yields "/D:/path" (leading
    // slash + drive letter), so when the OCCT loader joins it with the wasm
    // filename the drive doubles into "D:\D:\...\replicad_single.wasm" and the
    // load fails. fileURLToPath produces a native path ("D:\path") on Windows
    // and "/path" on POSIX, so the wasm resolves on every platform.
    js: [
      '#!/usr/bin/env node',
      "import{createRequire as __bcr}from'node:module';",
      "import{fileURLToPath as __furl}from'node:url';",
      'const require=__bcr(import.meta.url);',
      "const __filename=__furl(import.meta.url);",
      "const __dirname=__furl(new URL('.',import.meta.url));",
    ].join('\n'),
  },
});

copyFileSync('node_modules/replicad-opencascadejs/src/replicad_single.wasm', 'dist/cli/replicad_single.wasm');
copyDir('src/agent/skills', 'dist/cli/skills');
mkdirSync('dist/cli/fonts', { recursive: true });
copyFileSync('src/shared/fonts/LiberationSans-Regular.ttf', 'dist/cli/fonts/LiberationSans-Regular.ttf');
copyFileSync('src/shared/fonts/LICENSE-FONTS.md', 'dist/cli/fonts/LICENSE-FONTS.md');
console.log('dist/cli/index.js built');
