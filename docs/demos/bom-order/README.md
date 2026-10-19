# BOM order-pack walkthrough

[run-demo.mjs](run-demo.mjs) evaluates one small mixed assembly — a fabricated
CNC plate (`box(40, 20, 3)`, declared `process: 'cnc'`), a fabricated bent
sheet-metal bracket (process inferred from its `sheetMetal` chain) and two
purchased M2 × 4 socket-head cap screws (`lib.fetchPart('iso-4762-m2x4')`) —
and collects the order pack through the same agent-side pipeline
`fab_pack({ scope: 'bom' })` and `export({ format: 'order-pack' })` share:
`evaluateAndBuildScript` → `collectOrderPack` → `buildOrderPack`. Only the text
evidence is retained here; the per-part model/drawing bytes and the zip are
produced by the same local run and intentionally not written. Nothing was
uploaded, no price or quote was fetched, and no Google Sheet was touched.

## Retained source and evidence

- [run-demo.mjs](run-demo.mjs): executable demonstration source with the inline
  `.kcad.ts` assembly.
- [bom.csv](bom.csv) and [manifest.json](manifest.json): actual local order-pack
  output (`bomToCsv` and `buildOrderPack`); the bracket row reports its flat
  blank bbox, not the folded body.
- [handoffs/](handoffs/): the actual vendor paste texts — `mcmaster.txt` (part
  numbers only, because quantities there mean packs), `mouser.txt` (`PN|qty`)
  and `digikey.txt` (`PN,qty`).
- [result.json](result.json): per-row `process`/`processSource` provenance,
  per-vendor handoff line counts and the pack's notes.
- Entries the run produced in memory (12): `bom.csv`, `bom.json`,
  `manifest.json`, `README.txt`, three `handoffs/*.txt`, and
  `parts/1-plate/{model.step,drawing.pdf}`,
  `parts/2-bracket/{model.step,model.dxf,drawing.pdf}` — the DXF is the
  sheet-cut flat pattern; the drawings came from the per-row drawing pipeline.

## Reproduce

From the repository root with Node 22:

```sh
export PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH
npx tsc -b
node --import tsx docs/demos/bom-order/run-demo.mjs
```

The run rewrites `bom.csv`, `manifest.json`, `handoffs/*.txt` and
`result.json` in place; `manifest.json.created` is the capture timestamp, so
re-running refreshes it.

## Scope notes

- The purchased row's part number is the bundled catalog's standard
  (`ISO 4762`), not a vendor-specific SKU — which is exactly why the McMaster
  handoff is a part-number list whose quantities must be checked by hand. The
  pack-size caveat travels in `manifest.json.handoffCaveats` and the pack
  README, never in the pasteable text.
- The MCP `fab_pack({ scope: 'bom' })` tool wraps this same collector and
  additionally returns per-process instant-quote links (public upload pages)
  and the `<name>-order-pack.zip`; this local run neither opened a link nor
  uploaded anything.
- No demo video is retained for this local file-output workflow; the executed
  run and its text outputs above are the evidence. This is local validation of
  the pack text, not a shop quote, upload or physical fabrication.
