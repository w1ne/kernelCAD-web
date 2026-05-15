import esbuild from 'esbuild';
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function copyDir(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const s = join(src, entry.name);
    const d = join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else copyFileSync(s, d);
  }
}

await esbuild.build({
  entryPoints: ['src/cli/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: 'dist/cli/index.js',
  external: ['commander', 'typescript', 'replicad', 'playwright', 'playwright-core', 'chromium-bidi', 'sharp'],
  banner: {
    js: [
      '#!/usr/bin/env node',
      "import{createRequire as __bcr}from'node:module';",
      'const require=__bcr(import.meta.url);',
      "const __filename=new URL(import.meta.url).pathname;",
      "const __dirname=new URL('.',import.meta.url).pathname;",
    ].join('\n'),
  },
});

copyFileSync('node_modules/replicad-opencascadejs/src/replicad_single.wasm', 'dist/cli/replicad_single.wasm');
copyDir('src/skills', 'dist/cli/skills');
mkdirSync('dist/cli/fonts', { recursive: true });
copyFileSync('src/lib/fonts/LiberationSans-Regular.ttf', 'dist/cli/fonts/LiberationSans-Regular.ttf');
copyFileSync('src/lib/fonts/LICENSE-FONTS.md', 'dist/cli/fonts/LICENSE-FONTS.md');
console.log('dist/cli/index.js built');
