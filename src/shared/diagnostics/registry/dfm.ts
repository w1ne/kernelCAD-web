// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const DFM_CODES = {
  // DFM preflight (23) — Slice E
  'dfm.input.vendor-required': {
    hintTemplate:
      'dfm_preflight requires a vendor identifier. Pass `vendor: "sendcutsend"` (or another supported vendor SKU listed in catalogs/sources-manifest.json).',
    nextAction: { kind: 'fix-arg', field: 'vendor' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'dfm_preflight was called without a vendor identifier; the tool fails closed rather than guess.',
  },
  'dfm.input.material-required': {
    hintTemplate:
      'dfm_preflight requires a material SKU. Pass `material: "<sku>"` (use list_part_categories or the vendor catalog.json to enumerate the supported SKUs).',
    nextAction: { kind: 'fix-arg', field: 'material' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'dfm_preflight was called without a material SKU; the tool fails closed rather than guess.',
  },
  'dfm.input.thickness-required': {
    hintTemplate:
      'dfm_preflight requires a thickness. Pass `thicknessIn: <inches>` or `thicknessMm: <mm>`; pick a value from catalog[sku].thicknessesIn.',
    nextAction: { kind: 'fix-arg', field: 'thicknessMm' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'dfm_preflight was called without a thickness; the tool fails closed rather than guess.',
  },
  'dfm.units.dxf-not-mm': {
    hintTemplate:
      'DXF $INSUNITS header must be 4 (mm). Re-export from kernelCAD with the default unit, or pass `unit: "mm"` to export_model.',
    nextAction: { kind: 'fix-arg', field: 'unit' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'A DXF input declared $INSUNITS != 4 (mm); preflight refuses to rescale silently.',
  },
  'dfm.material.unknown-sku': {
    hintTemplate:
      'Material SKU is not present in the vendor catalog. Pick one from catalogs/vendors/<vendor>/catalog.json, or run `npm run shopcheck:refresh` if the vendor recently added it.',
    nextAction: { kind: 'fix-arg', field: 'material' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'Material SKU passed to dfm_preflight does not match any entry in the vendor catalog.',
  },
  'dfm.thickness.not-stocked': {
    hintTemplate:
      'Thickness is not one of the vendor-stocked gauges for this material. Pick a value from catalog[sku].thicknessesIn.',
    nextAction: { kind: 'fix-arg', field: 'thicknessMm' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: "Thickness passed to dfm_preflight is not in the vendor catalog's stocked-gauges list for the selected material.",
  },
  'dfm.thickness.out-of-range': {
    hintTemplate:
      'Thickness is outside the vendor service envelope (e.g. laser cutting). Pick a thickness inside the published min/max for this service.',
    nextAction: { kind: 'fix-arg', field: 'thicknessMm' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: "Thickness exceeds the vendor service's overall thickness envelope (e.g. laser cutting 0.015–0.750 in).",
  },
  'dfm.thickness.out-of-range-for-service': {
    hintTemplate:
      'Thickness is inside the laser envelope but outside the bending envelope. Either drop the bend (laser-only is fine), pick a thinner material for bending, or split into parts joined post-bend.',
    nextAction: { kind: 'fix-arg', field: 'service' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: "Thickness exceeds the vendor service-specific envelope (e.g. bending's 0.030–0.250 in band).",
  },
  'dfm.hole.below-minimum': {
    hintTemplate:
      'Hole diameter is below the vendor minimum for this material + thickness. Enlarge the hole to >= the published minimum, remove the hole, or switch to a thinner material.',
    nextAction: { kind: 'retry-with-smaller-param', param: 'thicknessMm', factor: 0.5 },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'A hole diameter is below the vendor minimum hole rule for the selected material and thickness.',
  },
  'dfm.slot.below-minimum': {
    hintTemplate:
      'Slot width is below the vendor minimum for this material + thickness. Widen the slot or split into multiple slots.',
    nextAction: { kind: 'fix-arg', field: 'slot.width' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'A slot width is below the vendor minimum slot rule for the selected material and thickness.',
  },
  'dfm.web.below-minimum': {
    hintTemplate:
      'Bridge / web width between two cutouts is below the vendor minimum. Increase the bridge width, merge the cutouts, or relocate one.',
    nextAction: { kind: 'fix-arg', field: 'web' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'The minimum bridge (web) width between cutouts is below the vendor minimum web rule for the selected material and thickness.',
  },
  'dfm.bend.radius-below-minimum': {
    hintTemplate:
      'Inner bend radius is below the vendor minimum for this material + thickness. Increase the radius arg in .bend(edge, angle, radius), or pick a thicker material.',
    nextAction: { kind: 'fix-arg', field: 'radius' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'A sheetMetal inner bend radius is below the vendor minimum bend-radius rule for the selected material and thickness.',
  },
  'dfm.bend.angle-too-acute': {
    hintTemplate:
      'Bend angle exceeds the vendor maximum (typically |angle| <= 130 deg for sheet metal). Reduce the angle in .bend(edge, angle, radius).',
    nextAction: { kind: 'fix-arg', field: 'angle' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'A bend angle is steeper than the vendor maximum acute-angle rule.',
  },
  'dfm.bend.length-exceeds-max': {
    hintTemplate:
      'Bend line is longer than the vendor maximum (typically 44 in / 1117 mm). Split the part along the bend axis, or accept the warning and request a custom quote.',
    nextAction: { kind: 'rewrite-feature', guidance: 'split the part along the bend axis to keep each segment under the vendor max bend length' },
    defaultSeverity: 'warn',
    group: 'dfm',
    description: 'Bend line length exceeds the vendor maximum bend length.',
  },
  'dfm.bend.flange-too-short': {
    hintTemplate:
      'Flange length on one side of the bend is below the vendor minimum. Lengthen the over-short side, or pick a thinner material so the minimum is reduced.',
    nextAction: { kind: 'fix-arg', field: 'flangeLength' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'A flange (before- or after-bend) is shorter than the vendor minimum flange rule for the selected material and thickness.',
  },
  'dfm.bend.channel-ratio-too-low': {
    hintTemplate:
      'Channel base length is shorter than 2x the flange (3x for polycarbonate). Lengthen the channel base, or shorten the flanges.',
    nextAction: { kind: 'fix-arg', field: 'channelBase' },
    defaultSeverity: 'warn',
    group: 'dfm',
    description: 'Channel base-to-flange ratio is below the vendor minimum for the selected material.',
  },
  'dfm.bend.layer-missing': {
    hintTemplate:
      'DXF input has bend metadata in the source but no BEND layer in the DXF. Re-export with export_model({ format: "dxf" }); the writer auto-emits the BEND layer.',
    nextAction: { kind: 'fix-arg', field: 'format' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'DXF input is missing the BEND layer; preflight cannot validate bend rules.',
  },
  'dfm.bending.material-unsupported': {
    hintTemplate:
      "Material is not on the vendor's bend-supported list. Switch material, or split into laser-only flat parts joined post-bend by the customer.",
    nextAction: { kind: 'fix-arg', field: 'material' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: "Material is not on the vendor's bend-supported list but the input has bend metadata.",
  },
  'dfm.size.below-minimum': {
    hintTemplate:
      'Part bounding box is below the vendor minimum part size. Enlarge the part, or switch to a vendor with smaller min-size limits.',
    nextAction: { kind: 'fix-arg', field: 'partAabb' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'Part bounding box is below the vendor minimum part size for the selected material category.',
  },
  'dfm.size.exceeds-instant-quote': {
    hintTemplate:
      'Part bounding box exceeds the vendor instant-quote envelope (typically 44 x 30 in). Part may need a custom quote — split it, or accept the warning.',
    nextAction: { kind: 'rewrite-feature', guidance: 'split the part to fit within the vendor instant-quote envelope' },
    defaultSeverity: 'warn',
    group: 'dfm',
    description: 'Part bounding box exceeds the vendor instant-quote envelope.',
  },
  'dfm.size.exceeds-max': {
    hintTemplate:
      'Part bounding box exceeds the vendor maximum part size. Split the part, or pick a vendor with larger stock.',
    nextAction: { kind: 'rewrite-feature', guidance: 'split the part to fit within the vendor maximum stock size' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'Part bounding box exceeds the vendor maximum part size.',
  },
  'dfm.dxf.spline-present': {
    hintTemplate:
      'DXF contains SPLINE entities on the cut layer. Re-export from kernelCAD (export_model emits LWPOLYLINE only).',
    nextAction: { kind: 'fix-arg', field: 'format' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'DXF contains SPLINE entities; the vendor only accepts LWPOLYLINE.',
  },
  'dfm.dxf.tessellation-near-tolerance': {
    hintTemplate:
      'A tessellated polyline segment is at or below the DXF tessellation tolerance (0.1 mm). Widen the feature, or re-export the DXF with a finer tessellation tolerance.',
    nextAction: { kind: 'fix-arg', field: 'tolerance' },
    defaultSeverity: 'warn',
    group: 'dfm',
    description: 'A polyline segment in the DXF is at or below the DXF tessellation tolerance, risking measurement disagreement at the vendor importer.',
  },
  'dfm.rule.threshold-unknown': {
    hintTemplate:
      'Vendor does not publish a threshold for this rule and material. Verify the feature manually with the vendor before ordering, or pick a material the vendor publishes a value for.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'warn',
    group: 'dfm',
    description: 'A rule\'s per-material threshold is null in specs.json because the vendor does not publish the value.',
  },
  // DFM print-prep gates (4) — W3 Task 7: dfmSpec({...}) enforcement
  // (min-wall sampling, part-pair clearance, voxel void/channel topology).
  'dfm.wall.too-thin': {
    hintTemplate:
      'A printed wall is thinner than dfmSpec.minWall at the reported location. Thicken the section (offset the cut, widen the rib), or lower minWall only if the target printer resolves it.',
    nextAction: { kind: 'rewrite-feature', guidance: 'thicken the wall at the reported xyz to >= minWall' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'Inward ray sampling measured a material wall thinner than the declared minimum.',
  },
  'dfm.clearance.violated': {
    hintTemplate:
      'Two distinct parts sit closer than dfmSpec.minClearance. Translate one part along its mating direction, or add the pair to dfmSpec.ignore if the contact is intentional (seated vendor part, fastened printed joint).',
    nextAction: { kind: 'rewrite-feature', guidance: 'open the gap to >= minClearance or declare the pair in dfmSpec.ignore' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'BREP minimum distance between a part pair is below the declared clearance and the pair is not mated, ignored, or interfering.',
  },
  'dfm.channel.openings-mismatch': {
    hintTemplate:
      'A declared channel has a different number of mouth openings than declared — a breach adds openings, a blocked mouth removes them, and found=0 can mean the channel is wider than the ~16mm detection limit. Inspect the channel walls near the part surface.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'Voxel flood-fill counted a different number of channel mouths than the dfmSpec.channels declaration.',
  },
  'dfm.void.undeclared': {
    hintTemplate:
      'A sealed internal void traps powder/resin/support and is unprintable on FDM without declaration. Open a drain channel, or declare it via dfmSpec.channels with sealed: true if intentional.',
    nextAction: { kind: 'rewrite-feature', guidance: 'open a drain channel or declare the void sealed: true' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'Flood-fill found an enclosed empty region not declared as a sealed channel.',
  },
  // FDM printability check (7) — dfmSpec({ process: 'fdm' }): overhang and
  // bridge support, nozzle-relative walls and features, bed contact, tip
  // risk, and bed fit, with a ranked axis-aligned print orientation.
  'dfm.fdm.overhang-unsupported': {
    hintTemplate:
      'Downward-facing surfaces steeper than maxOverhangDeg have nothing below them to print onto. Reorient the part, add a 45° chamfer or gusset under the overhang, or slice with supports.',
    nextAction: { kind: 'rewrite-feature', guidance: 'apply the recommended rotation or buildDirection, or chamfer the overhang to 45°' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'An overhang region is neither bridged between supports nor within one nozzle width of its support in the declared FDM build direction.',
  },
  'dfm.fdm.bridge-too-long': {
    hintTemplate:
      'A flat ceiling spans further between its supports than maxBridgeMm, so the bridge sags. Shorten the span with an intermediate rib, reorient the part, or slice with supports.',
    nextAction: { kind: 'rewrite-feature', guidance: 'add a rib under the span or reorient the part' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'A horizontal downward face anchored at both ends spans longer than the declared FDM maximum bridge length.',
  },
  'dfm.fdm.wall-below-nozzle': {
    hintTemplate:
      'A wall thinner than two nozzle widths cannot hold two perimeters; the slicer drops or thins it. Thicken it to at least 2 × nozzleMm.',
    nextAction: { kind: 'rewrite-feature', guidance: 'thicken the wall at the reported xyz to >= 2 × nozzleMm' },
    defaultSeverity: 'error',
    group: 'dfm',
    description: 'Inward ray sampling measured a wall thinner than twice the declared FDM nozzle diameter.',
  },
  'dfm.fdm.feature-too-small': {
    hintTemplate:
      'Holes under 5 × nozzleMm print undersized or close up; pins under 7.5 × nozzleMm are fragile. Enlarge the feature, drill the hole after printing, or use a finer nozzle.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'warn',
    group: 'dfm',
    description: 'A full cylindrical hole or pin has a diameter below the FDM minimum derived from the nozzle diameter.',
  },
  'dfm.fdm.bed-contact-low': {
    hintTemplate:
      'The part rests on a small fraction of its footprint, so first-layer adhesion is weak and it can detach mid-print. Reorient onto a flat face or add a brim.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'warn',
    group: 'dfm',
    description: 'Bed-contact area is below 10% of the convex footprint in the FDM build direction.',
  },
  'dfm.fdm.tip-risk': {
    hintTemplate:
      'The part is tall relative to its narrowest base width and may tip or wobble as the nozzle drags past. Print it lying down, widen the base, or add a brim.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'warn',
    group: 'dfm',
    description: 'Height divided by the minimum width of the bed-contact patch exceeds 8 in the FDM build direction.',
  },
  'dfm.fdm.exceeds-bed': {
    hintTemplate:
      "The part in its FDM build orientation is larger than the printer profile's bed. Reorient it, split it into printable sub-parts, or pick a printer profile with a larger bed.",
    nextAction: { kind: 'retry-with-smaller-param', param: 'scale', factor: 0.9 },
    defaultSeverity: 'error',
    group: 'dfm',
    description: "The part's extents in the declared FDM build direction exceed the selected printer profile's bed on some axis.",
  },
} as const satisfies Record<`dfm.${string}`, DiagnosticCodeSpec>;
