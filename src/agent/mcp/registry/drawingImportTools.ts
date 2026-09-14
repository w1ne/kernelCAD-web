// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Engineering-drawing import. Its own registry family, composed at the TAIL
// of TOOL_REGISTRY: kernelCAD-server consumes the historical registry order as
// part of the public contract, so a new family is appended and every
// pre-existing index stays put.
import { drawingToCadTool } from '../tools/drawingToCad';
import type { ToolRegistryEntry } from './types';

const drawingToCadToolEntry: ToolRegistryEntry = {
  definition: {
    name: 'drawing_to_cad',
    description:
      'Use this when the reference for a part is a 2D engineering drawing PDF (orthographic views with ' +
      'dimensions), not a photo. Deterministic, no vision model: reads the vector linework (stroke width, ' +
      'dash) and positioned text; classifies visible / hidden / center / dimension / extension lines; reads ' +
      'the title block scale, units and projection symbol; identifies front / top / side views by projection ' +
      'alignment (third- or first-angle); ties dimension text to its lines (⌀, R, 4×, ±, THRU, depth). ' +
      'Dimension values win over measured lengths. Rebuilds the part as the view silhouette extruded by the ' +
      'depth an orthogonal view shows, or a turned part revolved from its half-silhouette, plus holes from ⌀ ' +
      'circles with THRU or hidden-line depth. Returns `script` — a `.kcad.ts` with role-named params (width, ' +
      'thickness, holeDia, hole1X, dia1, step1Length …) — and `ledger`, an assumption ledger where stated ' +
      'dimensions are `visible`, symmetry-derived positions `inferred`, defaults `assumed` and an unstated ' +
      'depth `missing`; a dimension that disagrees with the linework keeps its value and records the ' +
      'disagreement as an open fact. With verify (default) the script is evaluated, re-projected through the ' +
      'svg-drawing view stage and compared: `fidelity.verdict` is match | partial | mismatch | failed with ' +
      'per-axis extents, hole diameters and per-view silhouette IoU. Pass `out` to write the script and its ' +
      '`<stem>.ledger.json` (resolve open facts with resolve_assumptions, then set_param). A scanned ' +
      '(raster-only) page fails with reference.drawing.raster-only — use trace_from_image for those.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the drawing PDF on the machine running kernelCAD.' },
        pdfBase64: {
          type: 'string',
          description: 'The PDF inline, base64-encoded. Use this instead of `path` against a hosted kernelCAD server.',
        },
        page: { type: 'integer', minimum: 1, description: '1-based page to read. Default 1.' },
        projection: {
          type: 'string',
          enum: ['third-angle', 'first-angle'],
          description: 'Override the projection angle read from the sheet (default: projection symbol or note, else third-angle).',
        },
        out: {
          type: 'string',
          description: 'Write the emitted script here (a .kcad.ts path); the ledger is written beside it as <stem>.ledger.json.',
        },
        verify: {
          type: 'boolean',
          description: 'Evaluate the rebuilt part and compare it with the drawing. Default true.',
        },
      },
    },
  },
  handler: input => drawingToCadTool(input as Parameters<typeof drawingToCadTool>[0]),
};

export const drawingImportToolEntries: ToolRegistryEntry[] = [drawingToCadToolEntry];
