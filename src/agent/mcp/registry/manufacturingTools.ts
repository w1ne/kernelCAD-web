// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { dfmReviewTool } from '../tools/dfmReview';
import { PRINTER_PROFILE_IDS } from '../../../kernel/export/gcode/printerProfiles';
import type { ToolRegistryEntry } from './types';

const AXIS_ENUM = ['+x', '-x', '+y', '-y', '+z', '-z'];

/**
 * Tail-appended family: manufacturability review. New families go at the END
 * of TOOL_REGISTRY so kernelCAD-server's index-based public contract stays stable.
 */
export const manufacturingToolEntries: ToolRegistryEntry[] = [
  {
    definition: {
      name: 'dfm_review',
      description:
        'Use this when you need a manufacturability (DFM) report before printing, machining, bending (sheet metal) or injection molding a part: returns a pass/fail checklist, no dfmSpec(...) needed. ' +
        "Pass { file | code } and optional processes: 'fdm' | 'cnc' | 'sheet-metal' | 'injection-molding' (default ['fdm', 'cnc']). " +
        'FDM 3D printing checks: fdm.overhangs (unsupported overhang steeper than max_overhang_deg, default 45° from vertical), fdm.bridging (bridges over max_bridge_mm, default 10), ' +
        'fdm.min-wall (walls under 2 × nozzle_mm, default 0.4 mm nozzle), fdm.min-hole (holes under 5 × nozzle), fdm.min-pin (warn), fdm.bed-fit (printer profile bed, default generic-fdm), fdm.bed-contact (warn). ' +
        'CNC 3-axis milling checks: cnc.undercuts (surface unreachable from approach_axes, default [\'+z\']; list several axes for several setups) and ' +
        'cnc.internal-corner-radius (sharp internal corners and fillets smaller than the end-mill radius, tool_diameter_mm default 6). ' +
        'Sheet-metal checks (sheetMetal(...).bend(...) parts; thickness read from the model; a non-sheet part returns one sheet.not-sheet-metal warn) on the flat pattern: ' +
        'sheet.min-bend-radius (inner radius ≥ min_bend_radius_ratio × t, default 1), sheet.hole-to-bend (hole edge to bend line ≥ hole_to_bend_thicknesses × t + R, default 2.5), ' +
        'sheet.hole-to-edge (≥ hole_to_edge_thicknesses × t, default 2), sheet.min-flange (outside of bend to edge ≥ min_flange_thicknesses × t, default 4). ' +
        "Injection-molding checks (the dfmSpec({ process: 'moulding' }) engine; two-part mold opening along ±pull_direction, default '+z'): mold.draft (faces with less than min_draft_deg draft, default 1°, named by @kc face ref), " +
        'mold.wall-thickness (fail under min_wall_mm, default 1; warn over max_wall_mm, default 4, or when thickest/thinnest > max_wall_ratio, default 2.5), mold.undercuts (faces neither mold half releases), ' +
        'mold.sharp-internal-corners (warn: creases and fillets under min_radius_mm, default 0.5), mold.unmeasured (warn, only when a quantity could not be measured). ' +
        "Returns { ok, verdict: 'pass'|'fail', checks: [{ id, process, part, status: 'pass'|'fail'|'warn', summary, value?, limit? }], fdm?, cnc?, sheetMetal?, injectionMolding?, diagnostics }. " +
        "Settings from the script's dfmSpec({ process: 'fdm' | 'moulding' }) are used as defaults; call options win. For the script-declared gates (clearance, voids, channels) use verify({ check: 'dfm' }).",
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          processes: {
            type: 'array',
            items: { type: 'string', enum: ['fdm', 'cnc', 'sheet-metal', 'injection-molding'] },
            description: "Processes to review. Default ['fdm', 'cnc'].",
          },
          nozzle_mm: { type: 'number', description: 'FDM nozzle diameter, mm. Default 0.4.' },
          max_overhang_deg: { type: 'number', description: 'FDM steepest printable overhang, degrees from vertical (0 = wall, 90 = flat ceiling). Default 45.' },
          max_bridge_mm: { type: 'number', description: 'FDM longest unsupported bridge, mm. Default 10.' },
          printer: { type: 'string', enum: [...PRINTER_PROFILE_IDS], description: "FDM printer profile id for the bed-fit check. Default 'generic-fdm'." },
          build_direction: { type: 'string', enum: AXIS_ENUM, description: "FDM part-local axis pointing up from the bed. Default '+z'." },
          tool_diameter_mm: { type: 'number', description: 'CNC end-mill diameter, mm. Default 6.' },
          approach_axes: {
            type: 'array',
            items: { type: 'string', enum: AXIS_ENUM },
            description: "CNC tool approach directions, one per setup (the tool comes from that side). Default ['+z'].",
          },
          max_undercut_area_mm2: { type: 'number', description: 'CNC unreachable area tolerated before cnc.undercuts fails, mm². Default 1.' },
          min_bend_radius_ratio: { type: 'number', description: 'Sheet metal: inner bend radius must be ≥ this × thickness. Default 1.' },
          hole_to_bend_thicknesses: { type: 'number', description: 'Sheet metal: hole edge to bend line must be ≥ this × thickness + bend radius. Default 2.5.' },
          hole_to_edge_thicknesses: { type: 'number', description: 'Sheet metal: hole edge to blank edge must be ≥ this × thickness. Default 2.' },
          min_flange_thicknesses: { type: 'number', description: 'Sheet metal: flange length from the outside of the bend must be ≥ this × thickness. Default 4.' },
          pull_direction: { type: 'string', enum: AXIS_ENUM, description: "Injection molding: part-local mold-opening axis (the two halves separate along ±this). Default '+z'." },
          min_draft_deg: { type: 'number', description: 'Injection molding: minimum draft angle to the pull direction, degrees. Default 1.' },
          min_wall_mm: { type: 'number', description: 'Injection molding: thinnest allowed wall, mm. Default 1.' },
          max_wall_mm: { type: 'number', description: 'Injection molding: thickest allowed section, mm. Default 4.' },
          max_wall_ratio: { type: 'number', description: 'Injection molding: thickest / thinnest wall above this warns (non-uniform walls warp and sink). Default 2.5.' },
          min_radius_mm: { type: 'number', description: 'Injection molding: smallest internal corner radius before mold.sharp-internal-corners warns, mm. Default 0.5.' },
        },
      },
    },
    handler: input => dfmReviewTool(input as unknown as Parameters<typeof dfmReviewTool>[0]),
  },
];
