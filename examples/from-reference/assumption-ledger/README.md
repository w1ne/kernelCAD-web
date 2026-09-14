# Assumption ledger example

Demonstrates the `trace_from_image` assumption ledger + `resolve_assumptions`
MCP tool end-to-end against a real image, with no `ANTHROPIC_API_KEY`
required (uses the deterministic `opencv` backend).

## Files

- `reference-square.png` — the reference photo (a uniform-background test
  fixture; same one `src/agent/vision/orchestrator.test.ts` uses for its
  opencv happy path).
- `run-ledger-example.ts` — traces the photo, inspects the resulting ledger
  (scale comes back `missing`), resolves it with `resolve_assumptions`, then
  retraces with a `scaleAnchor` supplied up front to show `unresolvedCount`
  drop to zero immediately.
- `bracket-from-trace.kcad.ts` — a real, buildable kernelCAD model whose
  `plateSide` param default is derived from the ledger-resolved scale. Its
  header comment records the Real Object Brief + `// Ledger:` pointer, per
  the `kernelcad-from-reference` skill convention.
- `bracket-from-trace.ledger.json` — the persisted ledger this example
  writes and resolves (regenerated each run).

## Run

```bash
npx tsx examples/from-reference/assumption-ledger/run-ledger-example.ts
```

## Expected output

```
--- Step 1: trace without a scale anchor ---
ok: true
unresolvedCount: 1
  fact silhouette: kind=visible confidence=1 resolution=confirmed
  fact scale: kind=missing confidence=0 resolution=open
diagnostics: [ 'warn:reference.assumptions.unresolved' ]

ledger persisted to .../bracket-from-trace.ledger.json

--- Step 2: resolve the open scale fact ---
ok: true
unresolvedCount: 0
paramOverrides: { scale: 0.1548 }

--- Step 3: retrace with the scale anchor supplied up front ---
ok: true
unresolvedCount: 0
scale: { mmPerPixel: 0.1548, source: 'scale-anchor' }
```

## Verify the model builds

```bash
npx kernelcad evaluate examples/from-reference/assumption-ledger/bracket-from-trace.kcad.ts
```

Expected: `ok: true`, `featureCount: 1`, zero diagnostics — the box's side
length (`plateSide`, default 15.33mm) is exactly the ledger-resolved scale
(0.1548 mm/px) applied to the traced silhouette's pixel width (99.0px on the
256x256 reference).
