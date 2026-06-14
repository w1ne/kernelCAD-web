// vite.player.config.ts
//
// Builds the standalone headless demo-player bundle (dist/headless-player/)
// consumed by src/agent/render/playerServer.ts. This closes the
// "render requires a running studio dev server" gap (#440): the render
// pipeline serves this prebuilt static page from an ephemeral localhost
// server instead.
//
// Deliberately minimal vs vite.config.ts: no TanStack router plugin, no
// tailwind, no studio middleware — the entry (src/agent/render/headless-player)
// mounts DemoPlayerPage directly and is driven entirely through the
// window.__demoPlayer bridge. The HDRI presets are copied alongside so
// setRenderEnvironment('studio'|...) resolves /hdri/<name>.hdr offline.

import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { cpSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const playerRoot = resolve(repoRoot, 'src/agent/render/headless-player');
const outDir = resolve(repoRoot, 'dist/headless-player');

/** Copy the bundled HDRI environment presets next to the built page so the
 *  static server can satisfy `/hdri/<preset>.hdr` fetches without the studio
 *  dev server's public/ directory. */
function copyHdriPresets(): Plugin {
  return {
    name: 'kernelcad-copy-hdri-presets',
    closeBundle() {
      const src = resolve(repoRoot, 'public/hdri');
      if (existsSync(src)) cpSync(src, resolve(outDir, 'hdri'), { recursive: true });
    },
  };
}

export default defineConfig({
  root: playerRoot,
  // public/ holds the full studio assets (incl. an 11 MB wasm the player
  // never loads); the only runtime assets the player needs are the HDRIs,
  // copied explicitly above.
  publicDir: false,
  plugins: [react(), copyHdriPresets()],
  define: {
    // Keep the render watermark in sync with the shipped package version,
    // matching the studio build (vite.config.ts).
    '__APP_VERSION__': JSON.stringify(
      JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')).version,
    ),
  },
  resolve: {
    alias: {
      'verb-nurbs': resolve(repoRoot, 'vendor/verb-nurbs/build/verb.es.js'),
    },
  },
  build: {
    outDir,
    emptyOutDir: true,
    chunkSizeWarningLimit: 4096,
  },
});
