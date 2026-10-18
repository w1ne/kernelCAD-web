# Studio browser kernel — perf record & demo (2026-10-18)

LOCAL validation of `feat/studio-browser-kernel`. The deployed
app.kernelcad.com build does not contain the browser kernel yet; the server
fallback path is unchanged and remains the safety net.

## What is measured

The routing contract: a parameter edit on a warm in-browser kernel updates the
model with **zero network** — no `/__kernelcad/mesh` POST, no payload download.

- `perf.json` — raw numbers from the last run.
- `kernel-demo.mp4` — screen recording of the run (fixture model, slider edits);
  the raw webm is not committed.

### Numbers (fixture model, `KERNEL_MEASURE_FIXTURE=1`, this machine)

| metric | value |
| --- | --- |
| worker + wasm init (first warm of the session) | 1.5 s |
| warm build, amortized (worker already up) | **570 ms** |
| param edit compute (kernel, in-worker) | **7–11 ms** |
| param patch size | **~2.5 KB** |
| param edit wall time (UI round trip incl. paint) | ~300 ms |
| server mesh POSTs during edits | **0** |

The same flow under `?kernel=off` posts to the server for every edit (pinned
by the Playwright E2E control case).

## How to rerun

```bash
# E2E (hermetic fixture; asserts zero mesh POSTs on the warm path and a
# server POST with ?kernel=off):
npx playwright test --config playwright.browser-kernel.config.ts

# Perf record + demo (fixture mode; writes perf.json + video into this folder):
KERNEL_MEASURE_FIXTURE=1 npx tsx scripts/measure-browser-kernel.mts

# Perf record against the published coffee grinder (see open items):
npx tsx scripts/measure-browser-kernel.mts
```

The grinder mode proxies `gallery.json` to kernelcad.com and remaps the
precomputed-mesh URLs to the CDN.

## Bugs found and fixed while producing this record

1. **The worker could not load the TypeScript compiler.** `transpileTs`
   reaches `typescript` through `node:module`'s `createRequire`; in a browser
   worker the module load crashed (`node:module has been externalized`). A
   dynamic `import('typescript')` resolved to an empty module in Vite's dev
   worker environment. Fixed with `src/modeling/runtime/transpileBrowser.ts`
   (static import; pinned by `browserRuntime.transpile.test.ts`).
2. **`optimizeDeps.exclude: ['typescript']`** made the browser serve the raw
   CJS package, so named imports fail. `typescript` is now prebundled
   (`vite.config.ts`), which is what makes the worker's compiler load at all.
3. **The background warm budget was the interactive one (300 s).** A heavy
   gallery model's cold in-browser build exceeds it; warming is off the
   interaction path, so `buildBudgetMs` (default 900 s) now covers it while
   interactive params keep 300 s (`browserKernelClient.test.ts` pins both).
4. Worker failures were silent; the client now logs a breadcrumb for worker
   errors and failed builds (dev-facing).

## Open items (grinder measurement not yet completed)

- **Heavy-model initial paint:** the grinder's CDN precompute is a 19 MB JSON
  file; on localhost it paints in ~110 s. The bin1 precompute (this branch)
  removes most of that once the marketing site ships it.
- **Cold in-browser warm of the grinder** did not finish inside practical
  measurement windows in this environment (dev-mode transform graph), and the
  production preview's worker chunk closed on load without an `onerror`
  breadcrumb — both need a follow-up measurement on a production build with
  the worker-chunk lifetime instrumented. The fixture record above isolates
  the routing performance from that cold-build cost.
- The E2E's Playwright config is not yet wired into CI.
