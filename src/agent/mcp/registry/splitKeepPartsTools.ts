// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Tail-appended family: shape.split keep-parts. New families go at the END
// of TOOL_REGISTRY so kernelCAD-server's index-based public contract stays
// stable. subtract, intersect and union are unchanged.
import { splitKeepPartsTool } from '../tools/splitKeepParts';
import type { ToolRegistryEntry } from './types';

export const splitKeepPartsToolEntries: ToolRegistryEntry[] = [
  {
    definition: {
      name: 'split_keep_parts',
      description:
        'Use this when a cutter must keep the overlap and both leftovers as separate solids. ' +
        'Pass file or code that returns shape.split, or body_code and tool_code (each a Shape expression) which the tool wraps as body.split(tool). ' +
        "keep is parts (default), intersection, a_only, or b_only, and it applies only to the body_code wrapper. " +
        'parts returns a Scene named intersection (A ∩ B), a_only (A − B) and b_only (B − A). A fragment at or below 1e-6 mm³ is omitted, so disjoint operands return a_only and b_only. ' +
        'A single keep returns that one solid; an empty request returns ok false. ' +
        'Returns parts with name, volume_mm3 and bbox, plus ok and diagnostics. ' +
        'subtract, intersect and union still return one Shape and discard the complement. Face refs that the cut splits stay ambiguous. It writes nothing.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path of a .kcad.ts script that returns shape.split. Mutually exclusive with code and with body_code.' },
          code: { type: 'string', description: 'Inline script that returns shape.split. Mutually exclusive with file and with body_code.' },
          body_code: { type: 'string', description: 'Shape expression for the body. Pair with tool_code. The tool calls body.split(tool).' },
          tool_code: { type: 'string', description: 'Shape expression for the cutter. Pair with body_code.' },
          keep: {
            type: 'string',
            enum: ['parts', 'intersection', 'a_only', 'b_only'],
            description: "Which fragments to keep. Default parts. Only with body_code and tool_code; a script sets keep itself.",
          },
        },
      },
    },
    handler: async (input) => splitKeepPartsTool(input),
  },
];
