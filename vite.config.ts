import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);

function getGitCommitHashShort(): string {
  try {
    const headPath = resolve(repoRoot, '.git', 'HEAD');
    const head = readFileSync(headPath, 'utf-8').trim();

    if (head.startsWith('ref:')) {
      const ref = head.slice('ref:'.length).trim();
      const refPath = resolve(repoRoot, '.git', ref);
      const full = readFileSync(refPath, 'utf-8').trim();
      return full.slice(0, 7);
    }

    // Detached HEAD (HEAD contains the full hash)
    return head.slice(0, 7);
  } catch {
    return 'unknown';
  }
}

function isPathInside(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function resolveExampleScript(script: string | null): string | null {
  if (!script) return null;
  const examplesRoot = resolve(repoRoot, 'examples');
  const scriptPath = resolve(repoRoot, script);
  if (
    !script.endsWith('.kcad.ts') ||
    !isPathInside(examplesRoot, scriptPath)
  ) {
    return null;
  }
  return scriptPath;
}

function kernelCadMeshEndpoint(): Plugin {
  return {
    name: 'kernelcad-mesh-endpoint',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__kernelcad/mesh', async (req, res) => {
        try {
          const url = new URL(req.url ?? '', 'http://localhost');
          const script = url.searchParams.get('script');
          if (!script) {
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: 'missing script query parameter' }));
            return;
          }

          const scriptPath = resolveExampleScript(script);
          if (!scriptPath) {
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: 'script must be a repo examples/*.kcad.ts file' }));
            return;
          }

          // The Node-side OCCT package is an Emscripten CommonJS artifact that
          // reads `__dirname` to locate its sibling WASM file. The CLI bundle
          // injects this in its esbuild banner; the Vite dev endpoint needs
          // the same shim before dynamically importing the meshing path.
          const occtPackageDir = resolve(repoRoot, 'node_modules/replicad-opencascadejs/src');
          Object.assign(globalThis, {
            __dirname: occtPackageDir,
            __filename: resolve(occtPackageDir, 'replicad_single.js'),
            require,
          });

          const [{ loadScriptFeatures }, { meshFeaturesPerFeature }, { serializeForBridge }] = await Promise.all([
            import('./src/script-runtime/scriptLoader'),
            import('./src/capture/featureMeshing'),
            import('./src/capture/featureMeshSerialize'),
          ]);
          const loaded = await loadScriptFeatures(scriptPath);
          const meshing = await meshFeaturesPerFeature(
            loaded.features.map((f) => f.record),
            loaded.paramTable,
            loaded.session,
          );
          if (meshing.failedFeatureIds.length > 0) {
            res.statusCode = 500;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({
              error: 'one or more features failed to compile',
              failedFeatureIds: meshing.failedFeatureIds,
            }));
            return;
          }

          res.statusCode = 200;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({
            source: loaded.source,
            features: meshing.features.map(serializeForBridge),
            bounds: meshing.bounds,
            params: loaded.paramTable.serialize(),
          }));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }));
        }
      });

      server.middlewares.use('/__kernelcad/review', async (req, res) => {
        try {
          const url = new URL(req.url ?? '', 'http://localhost');
          const scriptPath = resolveExampleScript(url.searchParams.get('script'));
          if (!scriptPath) {
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: 'script must be a repo examples/*.kcad.ts file' }));
            return;
          }

          const { reviewCadTool } = await import('./src/mcp/tools/reviewCad');
          const review = await reviewCadTool({
            file: scriptPath,
            includePoseEnvelope: true,
            includeInterference: true,
          });

          res.statusCode = 200;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(review));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: process.env.VITE_BASE_PATH ?? (command === 'build' ? '/kernelCAD-web/' : '/'),
  plugins: [
    kernelCadMeshEndpoint(),
    react(),
    tailwindcss(),
  ],
  define: {
    '__COMMIT_HASH__': JSON.stringify(getGitCommitHashShort()),
    '__APP_VERSION__': JSON.stringify(
      JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')).version,
    ),
  },
  worker: {
    format: 'es',
  },
}))
