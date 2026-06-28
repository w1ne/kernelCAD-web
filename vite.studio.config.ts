import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

// Library build for `kernelcad/studio` — emits a self-contained ESM
// bundle that proto.cat (and any future host) imports as
// `kernelcad/studio`. Replaces the earlier tsup attempt, which choked
// on two things Vite handles natively:
//
//   1. The `new Worker(new URL('../../kernel/backends/occt/worker.ts',
//      import.meta.url), { type: 'module' })` references inside
//      kernelCAD's geometry engine. Vite emits the worker as a
//      separate chunk in `dist/studio/` and rewrites the URL to point
//      at the emitted file. tsup left the URL unchanged, so the
//      consumer's bundler couldn't follow it.
//   2. The `verb-nurbs` alias to a vendored ES module. Without the
//      alias the dts pass can't resolve the bare specifier; with it
//      everything follows the same path the standalone app already
//      uses.
//
// Defines mirror the standalone config so build-time globals
// (`__APP_VERSION__`, `__COMMIT_HASH__`) survive bundling — kernelCAD
// source references them inside the Viewer header chrome which we
// `showHeader: false` away in embed mode, but they're still in the
// import graph.
//
// External strategy: anything not in our own source (`./`, `../`, or
// rooted at the repo) is the host's responsibility. That keeps React,
// three, supabase, replicad, @react-three/*, etc. on the consumer's
// version. We are NOT a peer-deps-aware shipping yet — those moves
// belong to the publish-to-npm milestone, not this commit.

const repoRoot = fileURLToPath(new URL('.', import.meta.url));

/**
 * Strip the in-browser geometry worker bootstrap before Vite's worker
 * scanner sees it. The standalone Studio app uses
 * `new Worker(new URL('../../kernel/backends/occt/worker.ts',
 *   import.meta.url), { type: 'module' })`
 * which Vite eagerly bundles — emitting a ~15 MB worker chunk plus a
 * ~10 MB WASM blob into `dist/studio/`. The embed never reaches that
 * code path (geometry routes through `StudioConfig.backendUrl`), so we
 * transform the source to throw before the `new URL(...)` constructor
 * is ever scanned. Result: no worker chunk, no WASM in the embed lib.
 *
 * Targets the exact line in `src/shared/worker/geometryEngine.ts`. If
 * that line ever moves, the build still works (`new Worker(...)` would
 * survive) — the worst-case symptom is the giant assets coming back.
 */
function stripGeometryWorkerForEmbed(): Plugin {
    const targetPath = 'src/shared/worker/geometryEngine.ts';
    return {
        name: 'kernelcad-strip-geometry-worker-for-embed',
        enforce: 'pre',
        transform(code, id) {
            if (!id.endsWith(targetPath)) return null;
            const replaced = code.replace(
                /this\.worker\s*=\s*new Worker\(new URL\([^)]*worker\.ts[^)]*\)[^)]*\);?/,
                "throw new Error('kernelCAD in-browser geometry worker is disabled in the embed library; route geometry through StudioConfig.backendUrl.');",
            );
            if (replaced === code) {
                // Tell the developer the worker pattern moved — better to
                // fail loudly than silently re-bundle ~25 MB of assets.
                this.warn(
                    `${targetPath}: expected worker bootstrap pattern not found; embed build will still include the geometry worker.`,
                );
            }
            return replaced;
        },
    };
}

function getGitCommitHashShort(): string {
    try {
        const headPath = new URL('./.git/HEAD', import.meta.url);
        const head = readFileSync(headPath, 'utf-8').trim();
        if (head.startsWith('ref:')) {
            const refPath = new URL(
                `./.git/${head.slice('ref:'.length).trim()}`,
                import.meta.url,
            );
            return readFileSync(refPath, 'utf-8').trim().slice(0, 7);
        }
        return head.slice(0, 7);
    } catch {
        return 'unknown';
    }
}

export default defineConfig({
    plugins: [
        stripGeometryWorkerForEmbed(),
        react(),
        dts({
            // Use the app-level tsconfig — the root tsconfig.json is
            // project-references only and carries no compilerOptions.
            tsconfigPath: './tsconfig.app.json',
            entryRoot: 'src/studio',
            // Emit a single rolled-up `index.d.ts` at the root of the
            // output dir so the package's exports map points at a
            // stable filename.
            rollupTypes: true,
            include: ['src/**/*.ts', 'src/**/*.tsx'],
            // Tests, route gen, and the demo player aren't part of the
            // library surface.
            exclude: [
                '**/*.test.ts',
                '**/*.test.tsx',
                'src/studio/__tests__/**',
                'src/studio/routes/**',
                'src/studio/routeTree.gen.ts',
                'src/studio/devlab/**',
                'src/studio/main.tsx',
            ],
        }),
    ],
    define: {
        __COMMIT_HASH__: JSON.stringify(getGitCommitHashShort()),
        __APP_VERSION__: JSON.stringify(
            JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')).version,
        ),
        // Hard-true in the embed build so Rollup dead-eliminates the
        // in-browser geometry worker init in `geometryEngine.ts` AND
        // the `new URL(... worker.ts ..., import.meta.url)` static
        // reference. Without this Vite emits the worker chunk + WASM
        // (~25 MB) into dist/studio and consumer bundlers (Turbopack)
        // also walk the URL ref in static analysis. Standalone Vite
        // builds and vitest leave this undefined.
        __KERNELCAD_EMBED__: 'true',
    },
    resolve: {
        alias: {
            'verb-nurbs': fileURLToPath(
                new URL('./vendor/verb-nurbs/build/verb.es.js', import.meta.url),
            ),
        },
    },
    worker: {
        format: 'es',
    },
    build: {
        outDir: 'dist/studio',
        emptyOutDir: true,
        sourcemap: false,
        cssCodeSplit: false,
        // We want the library bundle to be one consumable file; reduce
        // chunk warning noise.
        chunkSizeWarningLimit: 4096,
        lib: {
            entry: fileURLToPath(new URL('./src/studio/index.ts', import.meta.url)),
            formats: ['es'],
            fileName: () => 'index.js',
        },
        rollupOptions: {
            // Externalize every bare specifier (anything not starting
            // with `.` or `/` or the project root). Consumer installs
            // and resolves these.
            external: (id, _importer, isResolved) => {
                if (isResolved) return false;
                if (id.startsWith('.')) return false;
                if (id.startsWith('/')) return false;
                if (id.startsWith(repoRoot)) return false;
                // Vite injects `node:`-prefixed Node builtins in worker
                // bootstraps occasionally; mark those external so the
                // browser-side host can decide (Next polyfills via
                // `node:`-aware fallback).
                return true;
            },
            output: {
                preserveModules: false,
                // Inline dynamic imports into the same chunk where it
                // makes the import graph easier to reason about for
                // consumers. Workers stay separate (Vite handles that
                // via its worker plugin, not rollup output config).
                inlineDynamicImports: false,
            },
        },
        target: 'es2022',
    },
});
