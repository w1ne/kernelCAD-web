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
        'Use this when you need a manufacturability (DFM) report before printing or machining a part: returns a pass/fail checklist, no dfmSpec(...) needed. ' +
        "Pass { file | code } and optional processes (default ['fdm', 'cnc']). " +
        'FDM 3D printing checks: fdm.overhangs (unsupported overhang steeper than max_overhang_deg, default 45° from vertical), fdm.bridging (bridges over max_bridge_mm, default 10), ' +
        'fdm.min-wall (walls under 2 × nozzle_mm, default 0.4 mm nozzle), fdm.min-hole (holes under 5 × nozzle), fdm.min-pin (warn), fdm.bed-fit (printer profile bed, default generic-fdm), fdm.bed-contact (warn). ' +
        'CNC 3-axis milling checks: cnc.undercuts (surface unreachable from approach_axes, default [\'+z\']; list several axes for several setups) and ' +
        'cnc.internal-corner-radius (sharp internal corners and fillets smaller than the end-mill radius, tool_diameter_mm default 6). ' +
        "Returns { ok, verdict: 'pass'|'fail', checks: [{ id, process, part, status: 'pass'|'fail'|'warn', summary, value?, limit? }], fdm?, cnc?, diagnostics }. " +
        "Settings from the script's dfmSpec({ process: 'fdm' }) are used as defaults; call options win. For the script-declared gates (clearance, voids, channels) use verify({ check: 'dfm' }).",
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          processes: {
            type: 'array',
            items: { type: 'string', enum: ['fdm', 'cnc'] },
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
        },
      },
    },
    handler: input => dfmReviewTool(input as unknown as Parameters<typeof dfmReviewTool>[0]),
  },
];
