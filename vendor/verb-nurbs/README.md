# vendor/verb-nurbs

Vendored ESM build from upstream `verb-nurbs@3.0.3`.

- Upstream commit: `f3ba23c` (2025-04-02)
- Snapshot date: 2026-05-24
- License: MIT (see `LICENSE`)
- Internal-only consumer: `src/kernel/backends/verb/curveBridge.ts`

This is a committed source vendoring per spec D1. Not an npm dependency.
Updates require manual re-snapshot from the upstream tag and a bridge
test re-run (`npm test -- src/kernel/backends/verb/`).

## Local patch

The single line `import 'web-worker';` at the top of `build/verb.es.js`
has been commented out. It is the sole runtime dependency and is only
exercised by the async `WorkerPool` dispatcher, which the analytics
bridge does not import. Removing the import keeps zero transitive runtime
dependencies (per D1) and unblocks `node` and bundler resolution without
adding `web-worker` to `package.json`.

When re-snapshotting from a future upstream tag, re-apply the same
single-line patch and re-run the bridge tests.
