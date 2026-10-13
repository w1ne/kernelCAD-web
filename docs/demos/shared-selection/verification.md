# Verification — 2026-10-13

Node 22.23.2; dependencies installed from package-lock.json. Bundled parts were
generated with `npm run generate:parts`. Native platform packages omitted by
npm on macOS were restored from their official npm tarballs at locked versions.
No package or lockfile changes.

Command:

```sh
TMPDIR="$PWD/node_modules/.selection-tmp" npx vitest run \
  src/agent/mcp/ src/server/middleware/ src/server/sessionPool.rebuild.test.ts \
  src/studio/selectionCode/ \
  src/studio/components/viewer/entities/ShapeGeometry.test.tsx \
  src/studio/__tests__/useFaceSelection.test.tsx \
  tests/unit/mcp/toolRegistrySchema.test.ts
npm run typecheck
npm run lint
```

Result: 65 test files, 391 tests passed. Typecheck exit 0. Lint exit 0,
29 existing warnings. The temporary directory avoids macOS `/var` versus
`/private/var` path assertions in the existing review-paint tests.

Regression evidence: stale selection POST returned HTTP 200 before the
generation check, causing the new expected-409 test to fail. Restoring the
callback-dependent sync effect caused the hook lifetime test to fail (zero
POSTs instead of one); the stable per-session bridge passed it. All final
regressions passed in the full command above.

Actual local workflow: viewer face click was returned as body 0 / face 5 /
box_1. Front-edge click was returned as body 0 / edge 6 / box_1. Agent face
selection visibly tinted the top face; agent edge selection cleared that tint
and drew the front edge. Captures, invocation and actual JSON results are
retained in this bundle. The MP4 is a replay of these captures, visually
inspected from a decoded frame. No production or hardware result is claimed.

Independent read-only review: initial callback-lifetime and late-write issues
were fixed and re-reviewed; no remaining important findings. Caller must
supply indices that exist in the current mesh, as documented.
