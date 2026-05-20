import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
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
      // Slice 2E.bridge: lazily-initialised pool + middlewares. We can't import
      // the pool at module top because it pulls in `src/modeling/buildModel`,
      // which transitively boots OCCT — Vite's config is loaded synchronously
      // and we want OCCT init delayed until the first request. Build the pool
      // on demand, then close over it for the session/events/params handlers.
      type PoolBundle = {
        pool: import('./src/server/sessionPool').SessionPool;
        sessionHandler: (req: import('http').IncomingMessage, res: import('http').ServerResponse) => Promise<void>;
        eventsHandler: (req: import('http').IncomingMessage, res: import('http').ServerResponse) => Promise<void>;
        paramsHandler: (req: import('http').IncomingMessage, res: import('http').ServerResponse) => Promise<void>;
      };
      let poolBundlePromise: Promise<PoolBundle> | undefined;
      function ensureOcctShims(): void {
        // The Node-side OCCT package is an Emscripten CommonJS artifact that
        // reads `__dirname` to locate its sibling WASM file. The CLI bundle
        // injects this in its esbuild banner; the Vite dev endpoint needs the
        // same shim before dynamically importing the meshing/build paths.
        const occtPackageDir = resolve(repoRoot, 'node_modules/replicad-opencascadejs/src');
        Object.assign(globalThis, {
          __dirname: occtPackageDir,
          __filename: resolve(occtPackageDir, 'replicad_single.js'),
          require,
        });
      }
      function getPoolBundle(): Promise<PoolBundle> {
        if (!poolBundlePromise) {
          poolBundlePromise = (async () => {
            ensureOcctShims();
            const [
              { createSessionPool },
              { createSessionEndpoint },
              { createEventsEndpoint },
              { createParamsEndpoint },
              { buildModelFromFile },
            ] = await Promise.all([
              import('./src/server/sessionPool'),
              import('./src/server/middleware/sessionEndpoint'),
              import('./src/server/middleware/eventsEndpoint'),
              import('./src/server/middleware/paramsEndpoint'),
              import('./src/modeling/buildModel'),
            ]);
            const pool = createSessionPool({
              build: (scriptPath) => buildModelFromFile({ file: scriptPath }),
              ttlMs: 5 * 60 * 1000,
            });
            // Periodic eviction of idle sessions. The interval is unref'd so
            // it doesn't keep the Vite dev process alive past shutdown.
            const interval = setInterval(() => pool.prune(), 60_000);
            interval.unref?.();
            return {
              pool,
              sessionHandler: createSessionEndpoint({ pool, resolveScript: resolveExampleScript }),
              eventsHandler: createEventsEndpoint({ pool, heartbeatMs: 15_000 }),
              paramsHandler: createParamsEndpoint({ pool }),
            };
          })();
        }
        return poolBundlePromise;
      }

      server.middlewares.use('/__kernelcad/texture', async (req, res) => {
        const { handleTextureRequest } = await import('./src/server/middleware/textureEndpoint');
        await handleTextureRequest(req, res as unknown as import('node:http').ServerResponse);
      });

      server.middlewares.use('/__kernelcad/session', async (req, res) => {
        const bundle = await getPoolBundle();
        await bundle.sessionHandler(req, res);
      });
      server.middlewares.use('/__kernelcad/events', async (req, res) => {
        const bundle = await getPoolBundle();
        await bundle.eventsHandler(req, res);
      });
      server.middlewares.use('/__kernelcad/params', async (req, res) => {
        const bundle = await getPoolBundle();
        await bundle.paramsHandler(req, res);
      });

      server.middlewares.use('/__kernelcad/mesh', async (req, res) => {
        try {
          const url = new URL(req.url ?? '', 'http://localhost');
          const script = url.searchParams.get('script');
          const sessionToken = url.searchParams.get('session');
          if (!script && !sessionToken) {
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: 'missing script or session query parameter' }));
            return;
          }

          ensureOcctShims();

          const [{ loadScriptFeatures }, { meshFeaturesPerFeature }, { serializeForBridge }] = await Promise.all([
            import('./src/modeling/runtime/scriptLoader'),
            import('./src/modeling/capture/featureMeshing'),
            import('./src/modeling/capture/featureMeshSerialize'),
          ]);

          // Slice 2E.bridge: with a session token, mesh against the pooled
          // CaptureSession so the BuiltModel that `params.update` mutates and
          // the renderer reads from share the same record list + param table.
          // Without a token, fall back to the legacy per-request build.
          let source: string;
          let records: readonly import('./src/shared/intent/featureRecord').FeatureRecord[];
          let paramTable: import('./src/shared/runtime/paramTable').ParamTable;
          let meshSession: {
            importedGeometry: Map<string, unknown>;
            getSurfaceRecord?: (id: string) => unknown;
          };

          if (sessionToken) {
            const bundle = await getPoolBundle();
            const entry = bundle.pool.get(sessionToken);
            if (!entry) {
              res.statusCode = 404;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ error: 'unknown session token' }));
              return;
            }
            const { readFile } = await import('node:fs/promises');
            source = await readFile(entry.scriptPath, 'utf-8');
            records = entry.model.records;
            paramTable = entry.model.session.paramTable;
            meshSession = entry.model.session as unknown as typeof meshSession;
          } else {
            const scriptPath = resolveExampleScript(script);
            if (!scriptPath) {
              res.statusCode = 400;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ error: 'script must be a repo examples/*.kcad.ts file' }));
              return;
            }
            const loaded = await loadScriptFeatures(scriptPath);
            source = loaded.source;
            records = loaded.features.map((f) => f.record);
            paramTable = loaded.paramTable;
            meshSession = loaded.session as unknown as typeof meshSession;
          }

          const meshing = await meshFeaturesPerFeature(
            records,
            paramTable,
            // The mesher accepts the optional session-shaped helper; the
            // pooled CaptureSession satisfies the structural type.
            meshSession as Parameters<typeof meshFeaturesPerFeature>[2],
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
          // featureRecords carry the captured FeatureRecord per feature so the
          // Studio shell can render scene rows / inline validity badges
          // against the real model. JSON.stringify here drops any
          // non-JSON-safe metadata values silently; the kernel guarantees
          // ids/kinds/params are JSON-safe.
          res.end(JSON.stringify({
            source,
            features: meshing.features.map(serializeForBridge),
            featureRecords: records,
            bounds: meshing.bounds,
            params: paramTable.serialize(),
          }));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }));
        }
      });

      server.middlewares.use('/__kernelcad/export', async (req, res) => {
        try {
          const url = new URL(req.url ?? '', 'http://localhost');
          const scriptPath = resolveExampleScript(url.searchParams.get('script'));
          const formatParam = url.searchParams.get('format');
          if (!scriptPath) {
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: 'script must be a repo examples/*.kcad.ts file' }));
            return;
          }
          if (formatParam !== 'stl' && formatParam !== 'step') {
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: 'format must be stl or step' }));
            return;
          }

          const [{ readFile }, { runAndExport }, { dirname, basename }] = await Promise.all([
            import('node:fs/promises'),
            import('./src/agent/script-runtime/export'),
            import('node:path'),
          ]);
          const code = await readFile(scriptPath, 'utf-8');
          const fileName = basename(scriptPath);
          const result = await runAndExport({
            code,
            fileName,
            format: formatParam,
            scriptDir: dirname(scriptPath),
          });

          if (result.bytes.length === 0) {
            res.statusCode = 500;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({
              error: 'export produced no bytes',
              diagnostics: result.diagnostics,
            }));
            return;
          }

          const contentType = formatParam === 'stl'
            ? 'model/stl'
            : 'application/STEP';
          const downloadName = `${fileName.replace(/\.[^./]+$/, '')}.${formatParam}`;
          res.statusCode = 200;
          res.setHeader('content-type', contentType);
          res.setHeader('content-disposition', `attachment; filename="${downloadName}"`);
          res.end(Buffer.from(result.bytes));
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

          const { reviewCadTool } = await import('./src/agent/mcp/tools/reviewCad');
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
    TanStackRouterVite({
      routesDirectory: './src/studio/routes',
      generatedRouteTree: './src/studio/routeTree.gen.ts',
    }),
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
