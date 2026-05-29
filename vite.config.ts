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

      server.middlewares.use('/__kernelcad/source', async (req, res) => {
        const { createSourceEndpoint } = await import('./src/server/middleware/sourceEndpoint');
        const handler = createSourceEndpoint({ resolveScript: resolveExampleScript });
        await handler(req, res);
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
            cachedShapes?: Map<string, unknown>;
            cachedFeatureMeshes?: Map<string, unknown>;
            cachedAssemblyPartMeshes?: Map<string, Map<string, unknown>>;
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
            // The full CaptureSession carries `cachedShapes`,
            // `cachedFeatureMeshes`, and `cachedAssemblyPartMeshes` —
            // meshFeaturesPerFeature derives its own seedShapes from those.
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
            // pooled CaptureSession satisfies the structural type and also
            // carries the `cachedFeatureMeshes` / `cachedAssemblyPartMeshes`
            // maps populated by this pass and reused on the next.
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
          // Slice A export-trio: widened from {stl, step} to the five-format
          // set runAndExport now dispatches. The reserved urdf/srdf/sdf-gazebo
          // slots intentionally stay out of the Studio UI — they ship in a
          // follow-up slice; until then they fire export.<format>.not-implemented
          // from the runtime, which would surface as "export produced no bytes"
          // here.
          const SUPPORTED_STUDIO_FORMATS = ['stl', 'step', 'dxf', '3mf', 'glb'] as const;
          type StudioFormat = (typeof SUPPORTED_STUDIO_FORMATS)[number];
          if (!SUPPORTED_STUDIO_FORMATS.includes(formatParam as StudioFormat)) {
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({
              error: `format must be one of ${SUPPORTED_STUDIO_FORMATS.join(', ')}`,
            }));
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
            format: formatParam as StudioFormat,
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

          const CONTENT_TYPES: Record<StudioFormat, string> = {
            stl: 'model/stl',
            step: 'application/STEP',
            dxf: 'image/vnd.dxf',
            '3mf': 'model/3mf',
            glb: 'model/gltf-binary',
          };
          const contentType = CONTENT_TYPES[formatParam as StudioFormat];
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

      server.middlewares.use('/__kernelcad/review-paint', async (req, res) => {
        try {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: 'POST only' }));
            return;
          }
          const chunks: Buffer[] = [];
          for await (const chunk of req as unknown as AsyncIterable<Buffer>) {
            chunks.push(chunk);
            if (chunks.reduce((acc, b) => acc + b.length, 0) > 16 * 1024 * 1024) {
              res.statusCode = 413;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ error: 'packet too large (max 16MB)' }));
              return;
            }
          }
          const body = Buffer.concat(chunks).toString('utf-8');
          const parsed = JSON.parse(body) as {
            screenshot: string;
            mask: string;
            meta: { note?: string; scriptPath?: string | null; ts?: string; ua?: string };
          };
          const scriptPath = resolveExampleScript(parsed.meta?.scriptPath ?? null);
          const { mkdirSync, writeFileSync, existsSync, unlinkSync, symlinkSync } =
            await import('node:fs');
          const { dirname, basename, join } = await import('node:path');
          const ts = (parsed.meta?.ts ?? new Date().toISOString()).replace(/[:]/g, '-');
          // If the request has a valid examples/*.kcad.ts scriptPath the
          // packet lands beside it (best for the agent's hook + IDE). If
          // not (user testing at /, or a non-examples gallery URL), fall
          // back to a repo-root .review-paint/ so the agent's hook scan
          // still finds it.
          const reviewRoot = scriptPath
            ? `${scriptPath}.review-paint`
            : resolve(repoRoot, '.review-paint');
          const packetDir = join(reviewRoot, ts);
          mkdirSync(packetDir, { recursive: true });
          const stripDataUrl = (s: string): Buffer => {
            const comma = s.indexOf(',');
            const b64 = comma === -1 ? s : s.slice(comma + 1);
            return Buffer.from(b64, 'base64');
          };
          writeFileSync(join(packetDir, 'screenshot.png'), stripDataUrl(parsed.screenshot));
          writeFileSync(join(packetDir, 'mask.png'), stripDataUrl(parsed.mask));
          writeFileSync(
            join(packetDir, 'meta.json'),
            JSON.stringify(
              {
                note: parsed.meta?.note ?? '',
                scriptPath: scriptPath ? relative(repoRoot, scriptPath) : null,
                ts: parsed.meta?.ts ?? new Date().toISOString(),
                ua: parsed.meta?.ua ?? '',
              },
              null,
              2,
            ),
          );
          const latest = join(reviewRoot, 'latest');
          try {
            if (existsSync(latest)) unlinkSync(latest);
          } catch {
            // Best-effort symlink swap; ignore if it doesn't exist.
          }
          try {
            symlinkSync(basename(packetDir), latest, 'dir');
          } catch (err) {
            // Symlink may fail on platforms without permission; non-fatal.
            void err;
          }
          // Quiet the unused-import lint when `dirname` is conditional on
          // future tweaks.
          void dirname;
          res.statusCode = 200;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ ok: true, path: relative(repoRoot, packetDir) }));
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
          const { detectInterferences } = await import('./src/modeling/runtime/detectInterferences');
          const { isSceneBackend } = await import('./src/kernel/backends/sceneBackend');

          // When a session token is present, recompute raw interferences
          // against the LIVE pooled session's tail scene — that captures the
          // user's current Params-tab edits via the SSE relower path. The
          // base reviewCadTool still re-evaluates from the script source so
          // its validator + envelope output stays comparable across reloads;
          // we overlay the live raw count on top for the Studio HUD's
          // slider-drag responsiveness.
          const sessionToken = url.searchParams.get('session');
          const review = await reviewCadTool({
            file: scriptPath,
            includePoseEnvelope: true,
            includeInterference: true,
          });

          if (sessionToken) {
            try {
              const bundle = await getPoolBundle();
              const entry = bundle.pool.get(sessionToken);
              // After `session.params.update`, the pool entry's `model.tailShape`
              // can be stale — `updateModelParams` returns a fresh BuiltModel
              // but doesn't write back to the pool. The session's
              // `cachedShapes` map IS updated though, so we read the latest
              // tail from there directly to capture the user's live Params
              // edits.
              const session = entry?.model.session as unknown as {
                cachedShapes?: Map<string, unknown>;
              } | undefined;
              const tailId = entry?.model.tailId;
              const liveTail = tailId && session?.cachedShapes?.get(tailId);
              const tail = liveTail ?? entry?.model.tailShape;
              if (tail && isSceneBackend(tail as { parts?: unknown })) {
                const livePairs = detectInterferences(
                  tail as Parameters<typeof detectInterferences>[0],
                  0.01,
                  new Set<string>(),
                ).pairs;
                (review as { rawInterferencePairs?: unknown }).rawInterferencePairs = livePairs;
              }
            } catch {
              // Session-side overlay failed; fall back to the script-eval pairs
              // already on `review`. The HUD will show the default-pose count
              // instead of the live count, but the request still succeeds.
            }
          }

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
      routeFileIgnorePattern: '\\.test\\.ts$',
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
  resolve: {
    alias: {
      'verb-nurbs': fileURLToPath(
        new URL('./vendor/verb-nurbs/build/verb.es.js', import.meta.url),
      ),
    },
  },
  server: {
    watch: {
      ignored: [
        '**/.git/**',
        '**/.claude/**',
        '**/kernelCAD-web-worktrees/**',
      ],
    },
  },
}))
