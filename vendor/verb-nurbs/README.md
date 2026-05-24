# vendor/verb-nurbs

Vendored ESM build from upstream `verb-nurbs@3.0.3`.

- Upstream commit: `f3ba23c` (2025-04-02)
- Snapshot date: 2026-05-24
- License: MIT (see `LICENSE`)
- Internal-only consumer: `src/kernel/backends/verb/curveBridge.ts`

This is a committed source vendoring per spec D1. Not an npm dependency.
Updates require manual re-snapshot from the upstream tag and a bridge
test re-run (`npm test -- src/kernel/backends/verb/`).

## Local patches

Two single-line patches against the upstream ESM build. Re-apply both
when re-snapshotting from a future upstream tag, then re-run the bridge
tests (`npm test -- src/kernel/backends/verb/`).

### Patch 1 — drop the `web-worker` import

The line `import 'web-worker';` at the top of `build/verb.es.js` has
been commented out. It is the sole runtime dependency and is only
exercised by the async `WorkerPool` dispatcher, which the analytics
bridge does not import. Removing the import keeps zero transitive
runtime dependencies (per D1) and unblocks `node` and bundler
resolution without adding `web-worker` to `package.json`.

### Patch 2 — suppress the stdout version print

The call `verb_Verb.main();` (last line inside the IIFE in
`build/verb.es.js`, around line 8675 in the v3.0.3 snapshot) has been
commented out. Upstream calls it as a load-time side effect; its sole
behaviour is to print a one-line version banner to stdout. That banner
pollutes the CLI evaluate-harness's `--json` stdout (the harness
expects a single JSON line and silently flips `ok` to `false` when the
parse fails), breaking every eval script that loads the analytics
bridge. The library is otherwise unaffected — `main` is not referenced
by any public API.
