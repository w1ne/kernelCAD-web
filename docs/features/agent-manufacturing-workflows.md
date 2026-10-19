# Agent manufacturing workflows

The local MCP reference is generated from `TOOLS`: descriptions, complete input/output
schemas, annotations and a JSON download. Search `/docs/mcp-tools`; follow its existing
client-specific setup links. Hosted tools can differ by authentication, profile and server
revision, so use that server's runtime discovery for the hosted contract.

The design guide at `/docs/design-guide` searches the existing cookbook and cited shop
catalogs. Agents retrieve recipes with `lookup_cookbook`. Vendor data is explicitly dated;
the 2026-05-23 SendCutSend snapshot must be rechecked before an order. Finding guidance
does not execute a geometry or manufacturing gate.

Small visual demonstrations, recorded from executed local workflows:

- [Tool discovery, exact arguments and existing Claude setup](../../site/public/demos/agent-workflows/reference-and-setup.mp4).
- [Recipe retrieval, dated sources and evaluated bracket](../../site/public/demos/agent-workflows/design-guidance.mp4).
- [Actual G-code export and slicer estimates](../../site/public/demos/agent-workflows/gcode-estimates.mp4).
- [Fastener fault, source repair and measured rerun](../../site/public/demos/agent-workflows/fastener-installation.mp4).

These clips replay actual captures and retained results. The new docs pages are local
previews pending deployment; the existing Claude setup is a public website readback.

## LabWired BOM to Google Sheets or CSV

`write_bom` accepts the LabWired `labwired-kernelcad-handoff/0.1` object as `handoff`,
`handoff_json`, or `handoff_path`. It creates one row per handoff ref with quantity,
part, MPN, source, unit price and notes, then merges matching optional
`catalog_parts` by ref or catalog id. Unmatched catalog parts are retained as extra
rows, which supports adding KernelCAD fasteners and priced catalog entries.

`write_bom` writes CSV under `artifacts/bom/` (or `output_path`) and returns the path,
CSV contents, `headers` and `sheets_rows`. Callers can consume the tabular values
without a Google API integration. Text cells beginning with spreadsheet formula
prefixes are apostrophe-prefixed in both CSV and Sheets-ready rows. Existing output
files are preserved unless `overwrite: true` is passed. Handoff input must use exactly
one of `handoff`, `handoff_json`, or `handoff_path`. The [BOM walkthrough
bundle](../demos/sheets-bom/README.md) uses the supplied drawbot handoff and demonstrates
local merge and CSV fallback only; no Google Sheet was connected or written during
validation.

## BOM order pack (`order-pack`, `fab_pack scope: 'bom'`)

`export({ format: 'order-pack' })` and `fab_pack({ scope: 'bom' })` build the same pack
through one collector (`collectOrderPack`) and pure builder (`buildOrderPack`): the BOM
(`bom.csv`, `bom.json` with totals), one `parts/<item>-<name>/` folder per fabricated row
(`model.step` always; `model.stl` for `3d-print`; `model.dxf` for `sheet-cut` when the
holes-aware flat-pattern walk succeeds; `drawing.pdf` where the per-row drawing pipeline
accepts the row), `handoffs/*.txt` paste texts for purchased rows, `manifest.json`
(per-part file index, McMaster caveat, per-row notes) and `README.txt`. Options narrow
which fabricated rows are packed: `processes` (by effective process) or `items` (by BOM
item number; wins). `fab_pack` additionally writes `<name>-order-pack.zip` and returns
per-process `quote_links`, each pointing at a service's public instant-quote upload page
with the pack file to upload.

Handoff texts match the vendors' own paste boxes: McMaster takes part numbers only —
quantities there mean packs and catalog pack sizes are not modeled yet, so the text never
carries a quantity and the caveat lives in the manifest/README instead; Mouser is
`PN|qty`; DigiKey is `PN,qty`, and the Studio Order sheet offers a pre-filled DigiKey
FastAdd cart URL only when every purchased row uses a DigiKey-style `-ND` part number.

Nothing is uploaded or ordered: the quote links are plain public web pages the user opens
and uploads to. The [order-pack demo bundle](../demos/bom-order/README.md) retains the
actual CSV, manifest, handoffs and per-row `process`/`processSource` provenance (declared
and inferred) from a local mixed fabrication + purchase run.

## G-code export receipts

```json
{
  "target": "model",
  "file": "part.kcad.ts",
  "format": "gcode",
  "output_path": "part.gcode",
  "options": {
    "format": "gcode",
    "printer": "generic-fdm",
    "material": "pla",
    "layerHeight": 0.2,
    "infill": 15,
    "supports": false
  }
}
```

Successful MCP `export` results include optional `gcode_stats`; CLI `--json` uses
`gcodeStats`. Nested metrics are `estimatedPrintTimeSeconds`, `filamentUsedGrams`,
`filamentUsedMeters`, `layerCount`, `maxZMm`, and optional `slicer: { name, version }`.
Missing or invalid fields are omitted. The original G-code bytes remain the artifact.
All material slots are summed; a scalar total mass takes precedence. Header identity
records the artifact's generator claim rather than independently verifying the executable.

A locally installed OrcaSlicer CLI is required. PrusaSlicer header parsing does not
establish PrusaSlicer CLI compatibility. Export predicts time/material and does not
contact or start a printer. The demonstration's 20 × 20 × 10 mm coupon produced
150,314 bytes, a 596-second estimate, 2.03 g filament and 50 layers with OrcaSlicer 2.4.2;
these are local slicer results, not physical print measurements.


## Explicit fastener installation audit

Prepare the small reproducible catalog for the example:

```sh
npx tsx scripts/generateFastenerInstallationCatalog.ts assets/parts
```

Then call `verify` with `check: "fastener-installation"`, a script file/code and explicit
stations, for example:

```json
{
  "check": "fastener-installation",
  "file": "examples/fastener-installation/l-bracket-mount.kcad.ts",
  "fasteners": [{
    "part": "right-screw",
    "against": ["right-washer", "l-bracket", "base"],
    "engagementPart": "right-nut",
    "minEngagementMm": 2.3,
    "maxProtrusionMm": 1.2
  }],
  "toleranceMm": 0.05,
  "angleToleranceDeg": 1
}
```

Measurements come from lowered BREP geometry and hash-bound catalog interfaces in the
solved world frame. The report includes coverage, per-station metrics, numeric limits,
measurement basis, repair hints and limitations. It checks annular bearing gap, bore-axis
alignment and diameter, axial overlap, declared receiver overlap and tip protrusion.
The example defaults to a 1.5 mm lifted right screw; set `liftedHeadMm` to zero and rerun.

Only listed stations are audited. Empty coverage is `no-coverage`; unsupported profiles,
missing/ambiguous bores or failed probes produce unknown metrics and cannot pass.
A passing supported scope is geometric installation evidence. Bearing support is sampled
at four radial locations on trimmed facing surfaces. Simplified catalog threads do not
prove thread contact, torque, preload, pull-out strength or physical acceptance.

The [manufacturing evidence bundle](../../site/public/demos/agent-workflows/fastener-evidence.zip)
retains faulty/repaired sources, audit JSON, repaired STEP and SVG drawing together.
Prepare the catalog with the command above before evaluating a downloaded source.
