---
name: kernelcad-shopcheck
description: Preflight a sheet-metal flat pattern or planar body against a job-shop's public ordering rules — material catalog, minimum hole / slot / web, bend radius, flange minimums, sheet-stock limits. Vendor identifier and material SKU are required parameters. Use when about to export DXF / STEP for a manufacturing service and you need a conservative, evidence-backed go / no-go before upload.
---

# kernelCAD — shop preflight (DFM check)

Run a flat-pattern or planar body through the configured vendor's published
ordering rules. Get a structured findings report with repair hints the agent
can paste straight back into authoring tools.

```typescript
// Preflight a bracket against the configured shop's rules.
await mcp.dfm_preflight({
  file: 'bracket.kcad.ts',
  vendor: 'sendcutsend',
  material: 'aluminum-6061-t6',
  thicknessIn: 0.125,
});
// → { ok: false, findings: [{ code: 'dfm.hole.below-minimum', measured: { ref: '@kc[bracket/face/top/hole/0]' }, repairHint: { action: 'enlarge', params: {...} } }] }
```

## Quick start

- Required inputs: `vendor` (string SKU), `material` (string SKU), and `thicknessIn` or `thicknessMm`.
- Optional inputs: `service` (laser / cnc-router / waterjet / bending — inferred when omitted), `featureId`, `dxf` (DXF path), `refreshCatalog`.
- The tool fails closed (`dfm.input.*-required`) when any of vendor / material / thickness is missing.

## API

```typescript
dfm_preflight(input: {
  file?: string;
  code?: string;
  dxf?: string;
  featureId?: string;
  vendor: string;
  material: string;
  thicknessIn?: number;
  thicknessMm?: number;
  service?: 'laser' | 'cnc-router' | 'waterjet' | 'bending';
  refreshCatalog?: boolean;
}): Promise<{
  ok: boolean;
  findings: Array<{
    code: DiagnosticCode;
    severity: 'info' | 'warn' | 'error';
    hint: string;
    ruleId: string;
    ruleSource: string;
    measured?: { kind, value, unit, location?: [x,y], ref?: '@kc[...]' };
    threshold?: { value, unit };
    repairHint?: { action: 'enlarge' | 'remove' | 'relocate' | 'change-material' | 'change-thickness', params };
  }>;
  diagnostics: CompilerDiagnostic[];
}>;
```

## Vendor support

Vendor identifier is a runtime parameter that selects a data directory under
`catalogs/vendors/<vendor>/`. Slice E ships with one configured vendor.
Add a new vendor by dropping `catalog.json` + `specs.json` + `rules.json` into
a new `catalogs/vendors/<new-vendor>/` directory and refreshing the manifest.
No code change required — the engine is data-driven.

## Rule sources

Each rule cites its source page or JSON field via `ruleSource`. The
catalog refresh script (`npm run shopcheck:refresh`) re-pulls the public
pages every 24 hours, pins the raw HTML by sha256 under
`catalogs/vendors/<vendor>/sources-snapshot/`, and updates the manifest
for drift detection.

## Diagnostic codes (24)

| Code | Severity | Recovery |
|------|----------|----------|
| dfm.input.vendor-required | error | Pass `vendor`. |
| dfm.input.material-required | error | Pass `material`. |
| dfm.input.thickness-required | error | Pass `thicknessIn` or `thicknessMm`. |
| dfm.units.dxf-not-mm | error | Re-export DXF with `$INSUNITS=4`. |
| dfm.material.unknown-sku | error | Use a SKU from `catalog.json`. |
| dfm.thickness.not-stocked | error | Pick a thickness from `catalog[sku].thicknessesIn`. |
| dfm.thickness.out-of-range | error | Pick a thickness inside the service envelope. |
| dfm.thickness.out-of-range-for-service | error | Drop the bend, pick a thinner material, or split. |
| dfm.hole.below-minimum | error | Enlarge the hole, remove it, or switch to a thinner material. |
| dfm.slot.below-minimum | error | Widen the slot. |
| dfm.web.below-minimum | error | Increase the bridge width. |
| dfm.bend.radius-below-minimum | error | Increase `radius` on `.bend(...)`. |
| dfm.bend.angle-too-acute | error | Reduce bend angle. |
| dfm.bend.length-exceeds-max | warn | Split the part along the bend axis. |
| dfm.bend.flange-too-short | error | Lengthen the over-short side. |
| dfm.bend.channel-ratio-too-low | warn | Lengthen channel base to >= 2x flange. |
| dfm.bend.layer-missing | error | Re-export DXF with the BEND layer. |
| dfm.bending.material-unsupported | error | Switch material or drop the bend. |
| dfm.size.below-minimum | error | Enlarge the part. |
| dfm.size.exceeds-instant-quote | warn | Custom quote needed; or split. |
| dfm.size.exceeds-max | error | Split the part or pick a vendor with larger stock. |
| dfm.dxf.spline-present | error | Re-export DXF with polyline tessellation. |
| dfm.dxf.tessellation-near-tolerance | warn | Widen the feature or re-export at finer tolerance. |
| dfm.rule.threshold-unknown | warn | Vendor does not publish; verify manually. |

The `dfm.rule.threshold-unknown` code collapses to a single warn-level row
even when multiple rules return null thresholds for the same material; this
avoids redundant noise.

## Verification gates

| Gate | Pass criterion |
|------|----------------|
| G-shopcheck-vendor-required | Calling `dfm_preflight` without `vendor` returns `dfm.input.vendor-required`. |
| G-shopcheck-material-required | Calling with `vendor` but no `material` returns `dfm.input.material-required`. |
| G-shopcheck-thickness-required | Calling without `thicknessIn` / `thicknessMm` returns `dfm.input.thickness-required`. |
| G-shopcheck-catalog-fresh | `catalog.json` and `specs.json` were last fetched within 30 days (warn) / 90 days (error). |
| G-shopcheck-units-mm | DXF input with `$INSUNITS != 4` returns `dfm.units.dxf-not-mm`. |
| G-shopcheck-bend-rule | Fixture with 1.0 mm bend radius on 3.175 mm 6061-T6 returns `dfm.bend.radius-below-minimum`. |
| G-shopcheck-passing-fixture | `passing-bracket.kcad.ts` returns `ok: true` with zero error findings. |
| G-shopcheck-roundtrip | Every `dfm.*` code in `findings[]` appears in `diagnostics[]` and vice versa. |
| G-shopcheck-repair-hint | Every error-severity finding carries a non-null `repairHint.action`. |

## Related skills

- `kernelcad-sheet-metal` — sheet-metal authoring; `dfm_preflight` reads
  its `flatten_pattern` and `get_bend_table` outputs.
- `kernelcad-mcp` — `flatten_pattern` and `get_bend_table` are the
  upstream tools; `dfm_preflight` is the validation gate.
- `kernelcad-features` — `hole`, `cutout`, `shell` feed the geometry
  `dfm_preflight` measures.
