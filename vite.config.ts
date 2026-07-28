import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarizeInterferencePairs } from './src/modeling/runtime/interferenceClassification';

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
  const allowedRoots = [
    resolve(repoRoot, 'examples'),
    resolve(repoRoot, 'tests/fixtures'),
  ];
  const scriptPath = resolve(repoRoot, script);
  if (
    !script.endsWith('.kcad.ts') ||
    !allowedRoots.some((root) => isPathInside(root, scriptPath))
  ) {
    return null;
  }
  return scriptPath;
}

/**
 * Auto-spawn the standalone review-paint save server in a Node worker thread
 * when vite starts. Worker threads have their own event loop, so even when
 * vite's main thread saturates on OCCT/replicad transforms the brush can
 * still land a packet on disk. Killed automatically when vite exits.
 */
function reviewPaintSaveServer(): Plugin {
  return {
    name: 'kernelcad-review-paint-save-server',
    apply: 'serve',
    async configureServer() {
      const { Worker } = await import('node:worker_threads');
      const workerPath = fileURLToPath(new URL('./scripts/review-paint-server.mjs', import.meta.url));
      const worker = new Worker(workerPath, { stderr: false, stdout: false });
      worker.on('error', (err) => {
        console.error('[review-paint-server] worker error:', err);
      });
      worker.on('exit', (code) => {
        if (code !== 0) console.error(`[review-paint-server] worker exited with code ${code}`);
      });
      process.on('exit', () => { worker.terminate(); });
    },
  };
}

function kernelCadMeshEndpoint(): Plugin {
  // Slice 2E.bridge: lazily-initialised pool + middlewares. We can't import
  // the pool at module top because it pulls in `src/modeling/buildModel`,
  // which transitively boots OCCT — Vite's config is loaded synchronously
  // and we want OCCT init delayed until the first request. Build the pool
  // on demand, then close over it for the session/events/params handlers.
  // The promise lives at plugin-factory scope so `handleHotUpdate` (the
  // `.kcad.ts` live-edit bridge) can reach the pool too.
  type PoolBundle = {
    pool: import('./src/server/sessionPool').SessionPool;
    sessionHandler: (req: import('http').IncomingMessage, res: import('http').ServerResponse) => Promise<void>;
    eventsHandler: (req: import('http').IncomingMessage, res: import('http').ServerResponse) => Promise<void>;
    paramsHandler: (req: import('http').IncomingMessage, res: import('http').ServerResponse) => Promise<void>;
    transformsHandler: (req: import('http').IncomingMessage, res: import('http').ServerResponse) => Promise<void>;
    animationBakeHandler: (req: import('http').IncomingMessage, res: import('http').ServerResponse) => Promise<void>;
  };
  let poolBundlePromise: Promise<PoolBundle> | undefined;

  return {
    name: 'kernelcad-mesh-endpoint',
    apply: 'serve',
    // Live-edit bridge: `.kcad.ts` scripts are loaded through the
    // `/__kernelcad/source` middleware, not the module graph, so Vite's
    // default HMR does nothing when one changes on disk. Two pushes:
    //
    // 1. Rebuild any pooled session for the changed script and fan a
    //    synthetic `relower` out over its SSE channel — the viewport in
    //    `?script=` mode renders from the pooled server session (NOT from
    //    the browser `code` state), so this is what actually re-meshes
    //    open Studio tabs.
    // 2. Send a `kernelcad:script-changed` WS event so the client can
    //    refresh the Code tab text (liveScriptBridge.ts).
    //
    // Returning [] suppresses the default (no-op) HMR handling.
    handleHotUpdate(ctx) {
      if (!ctx.file.endsWith('.kcad.ts')) return;
      if (poolBundlePromise) {
        void poolBundlePromise
          .then((bundle) => bundle.pool.rebuildByScript(ctx.file))
          .then((rebuilt) => {
            if (rebuilt) ctx.server.config.logger.info(`[kernelcad] live-rebuilt session for ${ctx.file}`);
          })
          .catch((err) => {
            ctx.server.config.logger.error(
              `[kernelcad] live rebuild failed for ${ctx.file}: ${err instanceof Error ? err.message : String(err)}`,
            );
          });
      }
      ctx.server.ws.send({
        type: 'custom',
        event: 'kernelcad:script-changed',
        data: { file: relative(repoRoot, ctx.file).split('\\').join('/') },
      });
      return [];
    },
    configureServer(server) {
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
              { createTransformsEndpoint },
              { createAnimationBakeEndpoint },
              { buildModelFromFile },
            ] = await Promise.all([
              import('./src/server/sessionPool'),
              import('./src/server/middleware/sessionEndpoint'),
              import('./src/server/middleware/eventsEndpoint'),
              import('./src/server/middleware/paramsEndpoint'),
              import('./src/server/middleware/transformsEndpoint'),
              import('./src/server/middleware/animationBakeEndpoint'),
              import('./src/modeling/buildModel'),
            ]);
            // Single-user dev pool: no `maxEntries` cap (unbounded) and no
            // `runExclusive` lock (identity passthrough) — one local developer
            // shares this OCCT instance, so the multi-user backstops are off.
            // The hosted server injects a real `maxEntries` (OCCT-heap memory
            // backstop) and a real `runExclusive` mutex (the kernel is shared
            // with the stateless mesh route), composes a per-user `key` +
            // `ownerId` on `getOrCreate`, and routes its param-update/bake
            // kernel work through `pool.runExclusive`.
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
              transformsHandler: createTransformsEndpoint({ pool }),
              animationBakeHandler: createAnimationBakeEndpoint({ pool }),
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
      server.middlewares.use('/__kernelcad/transforms', async (req, res) => {
        const bundle = await getPoolBundle();
        await bundle.transformsHandler(req, res);
      });
      server.middlewares.use('/__kernelcad/animation-bake', async (req, res) => {
        const bundle = await getPoolBundle();
        await bundle.animationBakeHandler(req, res);
      });

      server.middlewares.use('/__kernelcad/mesh', async (req, res) => {
        try {
          const url = new URL(req.url ?? '', 'http://localhost');
          const script = url.searchParams.get('script');
          const sessionToken = url.searchParams.get('session');
          // POST { source } meshes ARBITRARY edited code through the node
          // kernel — the path the Studio editor uses on localhost dev when
          // the in-browser worker can't run the modern assembly/joint/tendon
          // API. GET ?script= / ?session= keep their existing behaviour.
          const isPost = (req.method ?? 'GET').toUpperCase() === 'POST';
          if (!script && !sessionToken && !isPost) {
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: 'missing script or session query parameter (or POST { source })' }));
            return;
          }

          ensureOcctShims();

          const [{ loadScriptFeatures }, { meshFeaturesPerFeature }, { serializeForBridge }, { runScript }] = await Promise.all([
            import('./src/modeling/runtime/scriptLoader'),
            import('./src/modeling/capture/featureMeshing'),
            import('./src/modeling/capture/featureMeshSerialize'),
            import('./src/modeling/runtime/runScript'),
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

          if (isPost) {
            // Read the JSON body { source }. Dev-only middleware on
            // localhost, so executing the user's own edited script through
            // runScript carries no extra trust boundary.
            const chunks: Buffer[] = [];
            for await (const chunk of req) chunks.push(chunk as Buffer);
            let parsedBody: { source?: unknown; params?: unknown };
            try {
              parsedBody = JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}');
            } catch {
              res.statusCode = 400;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ error: 'POST body must be JSON { source: string }' }));
              return;
            }
            if (typeof parsedBody.source !== 'string' || parsedBody.source.length === 0) {
              res.statusCode = 400;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ error: 'POST body must include a non-empty "source" string' }));
              return;
            }
            source = parsedBody.source;
            // Compile straight from the source string (no file). scriptDir =
            // examples root so any relative asset paths resolve the same way
            // a shipped example would.
            const run = await runScript({
              code: source,
              fileName: 'studio-edit.kcad.ts',
              scriptDir: resolve(repoRoot, 'examples'),
            });
            records = run.records;
            paramTable = run.paramTable;
            // Stateless param recompute: apply any `{ params: { name: value } }`
            // overrides to the freshly-built param table BEFORE meshing, so a
            // slider edit re-runs the script with the new value baked in (the
            // path used when there is no live kernel session). ParamRefs in the
            // records resolve against this table at lower time, so the override
            // flows into the geometry. The echoed `params` below reflects them.
            if (parsedBody.params && typeof parsedBody.params === 'object') {
              for (const [name, value] of Object.entries(parsedBody.params as Record<string, unknown>)) {
                if (typeof value === 'number' || typeof value === 'boolean') {
                  paramTable.set(name, value);
                }
              }
            }
            meshSession = run.session as unknown as typeof meshSession;
          } else if (sessionToken) {
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
          const formatParam = url.searchParams.get('format');
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

          // POST { source } exports ARBITRARY edited editor code (Studio
          // without ?script=, or live edits). GET ?script= keeps the
          // curated-example path for deep-links / tooling.
          const isPost = (req.method ?? 'GET').toUpperCase() === 'POST';
          let code: string;
          let fileName: string;
          let scriptDir: string;

          if (isPost) {
            const chunks: Buffer[] = [];
            for await (const chunk of req) chunks.push(chunk as Buffer);
            let parsedBody: { source?: unknown };
            try {
              parsedBody = JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}');
            } catch {
              res.statusCode = 400;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ error: 'POST body must be JSON { source: string }' }));
              return;
            }
            if (typeof parsedBody.source !== 'string' || parsedBody.source.trim().length === 0) {
              res.statusCode = 400;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ error: 'POST body must include a non-empty "source" string' }));
              return;
            }
            code = parsedBody.source;
            fileName = 'studio-export.kcad.ts';
            // Relative asset paths resolve the same way as mesh POST.
            scriptDir = resolve(repoRoot, 'examples');
          } else {
            const scriptPath = resolveExampleScript(url.searchParams.get('script'));
            if (!scriptPath) {
              res.statusCode = 400;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({
                error: 'missing script query parameter (or POST { source })',
              }));
              return;
            }
            const [{ readFile }, { dirname, basename }] = await Promise.all([
              import('node:fs/promises'),
              import('node:path'),
            ]);
            code = await readFile(scriptPath, 'utf-8');
            fileName = basename(scriptPath);
            scriptDir = dirname(scriptPath);
          }

          ensureOcctShims();

          const { runAndExport } = await import('./src/agent/script-runtime/export');
          const result = await runAndExport({
            code,
            fileName,
            format: formatParam as StudioFormat,
            scriptDir,
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

          // When a session token is present, recompute interferences
          // against the LIVE pooled session's tail scene — that captures the
          // user's current Params-tab edits via the SSE relower path. The
          // base reviewCadTool still re-evaluates from the script source so
          // its validator + envelope output stays comparable across reloads;
          // we overlay the live raw pairs and actionable summary on top for
          // the Studio HUD's slider-drag responsiveness.
          const sessionToken = url.searchParams.get('session');

          // `live=1` (sent by the client's relower-triggered refresh): skip
          // the FULL review — reviewCadTool re-evaluates the script from
          // source and runs the pose-envelope sweep, which on a jointed
          // assembly takes MINUTES — and return only the live interference
          // channel from the pooled session. Session-backed initial load
          // also uses this cheap path; explicit Validate still runs the full
          // review, and the client merges the lighter payload over the last
          // full one when available.
          const liveOnly = url.searchParams.get('live') === '1' && Boolean(sessionToken);
          const review: {
            ok: boolean;
            diagnostics: unknown[];
            fitness?: {
              functional?: boolean;
              repairMode?: string;
              blockingReasons?: readonly unknown[];
            };
            live?: boolean;
            livePhysicalUseCaseReview?: boolean;
            [key: string]: unknown;
          } = liveOnly
            ? { ok: true, diagnostics: [], live: true }
            : await reviewCadTool({
                file: scriptPath,
                includePoseEnvelope: true,
                includeInterference: true,
              }) as unknown as {
                ok: boolean;
                diagnostics: unknown[];
                fitness?: {
                  functional?: boolean;
                  repairMode?: string;
                  blockingReasons?: readonly unknown[];
                };
                live?: boolean;
                livePhysicalUseCaseReview?: boolean;
                [key: string]: unknown;
              };
          const sourceDeclaresPhysicalUseCase = liveOnly
            ? readFileSync(scriptPath, 'utf-8').includes('physicalUseCase(')
            : false;

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
                Object.assign(review, {
                  rawInterferencePairs: livePairs,
                  interferenceSummary: summarizeInterferencePairs(livePairs),
                });
              }
              if (sourceDeclaresPhysicalUseCase) {
                review.livePhysicalUseCaseReview = true;
                const { reviewPhysicalUseCasesWithReachability } = await import('./src/modeling/mates/physicalUseCase');
                const session = entry?.model.session as unknown as {
                  assemblies?: Map<string, Parameters<typeof reviewPhysicalUseCasesWithReachability>[0]>;
                } | undefined;
                const assemblies = [...(session?.assemblies?.values() ?? [])];
                const diagnostics = [];
                for (const assembly of assemblies) {
                  const physical = await reviewPhysicalUseCasesWithReachability(assembly, {
                    requirePhysicalUseCase: true,
                    includeReachability: true,
                    reachabilitySamplesPerMate: 3,
                  });
                  diagnostics.push(...physical.diagnostics);
                }
                if (diagnostics.length > 0) {
                  review.diagnostics = [...review.diagnostics, ...diagnostics];
                  const hasError = diagnostics.some((diagnostic) => diagnostic.severity === 'error');
                  if (hasError) {
                    review.ok = false;
                    review.fitness = {
                      ...(review.fitness ?? {}),
                      functional: false,
                      repairMode: 'physical-use-case',
                      blockingReasons: [
                        ...(review.fitness?.blockingReasons ?? []),
                        ...diagnostics,
                      ],
                    };
                  }
                }
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
    reviewPaintSaveServer(),
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
        // Keep sibling worktrees out of the watch set — but only when the
        // server itself runs from the main checkout. When the dev server is
        // started inside a worktree, this glob would match every project
        // file (the worktree root contains the segment) and silently kill
        // all hot-reload, so it must be dropped there.
        ...(repoRoot.includes('kernelCAD-web-worktrees')
          ? []
          : ['**/kernelCAD-web-worktrees/**']),
      ],
    },
  },
  optimizeDeps: {
    // ts-morph (13MB) and typescript (9.5MB) reach the Studio module graph
    // only through `import('.../RefactoringManager')` in CodeContext (a
    // rename-variable codepath users rarely hit). Vite's dep scanner pulls
    // dynamic imports into the cold-start prebundle, which is what makes
    // `npm run dev` saturate one core for ~60s and keep "Geometry kernel
    // warming up..." visible. Excluding them defers the bundle work until
    // (if ever) a user triggers the rename — and keeps cold-start light.
    exclude: ['ts-morph', 'typescript'],
  },
}))
