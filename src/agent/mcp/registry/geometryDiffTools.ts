// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Material-level geometry diff. Its own registry family, composed at the TAIL
// of TOOL_REGISTRY: kernelCAD-server consumes the historical registry order as
// part of the public contract, so a new family is appended rather than slotted
// next to diff_scripts — every pre-existing index stays put.
import { diffGeometryTool } from '../tools/diffGeometry';
import type { ToolRegistryEntry } from './types';

const diffGeometryToolEntry: ToolRegistryEntry = {
  definition: {
    name: 'diff_geometry',
    description:
      'Use this when you need to know WHAT MATERIAL changed between two versions of a model, not ' +
      "just how much. The deeper sibling of diff_scripts: a volume delta alone is ambiguous (a boss " +
      'that grew and a pocket that deepened report the same magnitude, and a part that only moved ' +
      'reports zero), so this tool answers it with geometry instead of pixels. Baseline is ' +
      '{ baseFile } or { baseCode }; the revised side is either another script ({ file } or ' +
      '{ code }) or the SAME script re-lowered with { params } overrides — a bag of declared ' +
      'param() name -> new value, which is the one-script form a parameter sweep actually asks for. ' +
      'Bodies pair by name and fall back to declaration-order positional pairing; anything left ' +
      'over is listed in `unmatched` and raises diff.body.unmatched. Per matched body it returns ' +
      'addedMm3 = volume(revised - base), removedMm3 = volume(base - revised), commonMm3 = ' +
      'volume(base ∩ revised) from OCCT booleans, exact bbox with min/max/extent deltas, face / ' +
      'edge / hole count deltas (hole counts reuse the cylindrical-hole detector), maxDeviationMm ' +
      '(two-sided discrete Hausdorff distance between the two surfaces), and a `verdict` — ' +
      'identical | moved | resized | topology-changed, precedence topology-changed > resized > ' +
      'moved > identical. Branch on the verdict; cite the numbers. Optional { render: true } also ' +
      'writes an overlay PNG (added green, removed red, unchanged material as a translucent ghost; the ' +
      'scene is a re-runnable .kcad.ts over lossless BREP sidecars) through the render_preview pipeline and ' +
      'fails open (the numeric diff is still returned) when that pipeline is unavailable. ' +
      'Read-only — never touches the active session.',
    inputSchema: {
      type: 'object',
      properties: {
        baseFile: { type: 'string', description: 'Baseline script — path to a .kcad.ts file.' },
        baseCode: { type: 'string', description: 'Baseline script — inline source.' },
        file: { type: 'string', description: 'Revised script — path to a .kcad.ts file. Mutually exclusive with params.' },
        code: { type: 'string', description: 'Revised script — inline source. Mutually exclusive with params.' },
        params: {
          type: 'object',
          additionalProperties: true,
          description:
            'Param-override mode: re-lower the BASELINE with these declared param() values changed ' +
            "(e.g. { plateThickness: 8 }). Mutually exclusive with file/code. A name the baseline " +
            'does not declare fails with the declared-param list in the message.',
        },
        render: {
          type: 'boolean',
          description:
            'Also render an overlay PNG — added material green, removed material red — via the ' +
            'render_preview pipeline. Off by default; the numeric table is the agent-facing evidence.',
        },
        out_dir: {
          type: 'string',
          description: 'Directory for the overlay PNG, its STL inputs, and the generated overlay script. Default: a temp dir.',
        },
      },
    },
  },
  handler: input => diffGeometryTool(input as Parameters<typeof diffGeometryTool>[0]),
};

export const geometryDiffToolEntries: ToolRegistryEntry[] = [diffGeometryToolEntry];
