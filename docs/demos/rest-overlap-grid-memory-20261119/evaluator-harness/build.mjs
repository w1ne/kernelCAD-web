// Bundle src/agent/mcp/toolRegistry.ts the way kernelCAD-server scripts/buildPrivateRuntime.mjs does.
import { createRequire } from 'node:module';
import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const source = resolve(process.argv[2]);
const out = resolve(source, '.tmp-eval-rest-overlap');
const { build } = createRequire(resolve(source, 'package.json'))('esbuild');
mkdirSync(resolve(out, 'mcp'), { recursive: true });
await build({
  absWorkingDir: source, bundle: true, platform: 'node', format: 'esm', target: 'node22',
  alias: { 'verb-nurbs': resolve(source, 'vendor/verb-nurbs/build/verb.es.js') },
  external: ['commander', 'typescript', 'replicad', 'playwright', 'playwright-core', 'chromium-bidi', 'sharp'],
  banner: { js: "import{createRequire as __bcr}from'node:module';const require=__bcr(import.meta.url);const __filename=new URL(import.meta.url).pathname;const __dirname=new URL('.',import.meta.url).pathname;" },
  entryPoints: ['src/agent/mcp/toolRegistry.ts'], outfile: resolve(out, 'mcp/toolRegistry.js'), logLevel: 'warning',
});
cpSync(resolve(source, 'node_modules/replicad-opencascadejs/src/replicad_single.wasm'), resolve(out, 'mcp/replicad_single.wasm'));
console.log('built', out);
