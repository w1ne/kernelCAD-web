// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Tail-appended inspection tool. The historical inspect/query/repair slices
// stay put; this family is spread at the end of TOOL_REGISTRY.
import { inspectStepViewsTool } from '../tools/inspectStepViews';
import type { ToolRegistryEntry } from './types';

export const stepInspectViewsToolEntries: ToolRegistryEntry[] = [
  {
    definition: {
      name: 'inspect_step_views',
      description:
        'Use this when you need labeled engineering views of one normalized STEP import. ' +
        'Pass { file } (a .step path). The tool imports it once with lib.fromSTEP and returns four PNGs ' +
        '(front, right, top, iso), a face list, and an edge list. ' +
        'height is the model viewport in pixels (64 to 1024, default 260); each PNG adds a 56 px legend band. ' +
        'width defaults to 360. ' +
        'faces carry id (fN), listRef (the same @kc string inspect faces emits), ref (the selector hole and offsetFaces accept), surfaceType, area, normal, and centroid. ' +
        'A positional fN listRef is not an edit selector. On an unlabeled import, ref is the FaceQuery { near: centroid }. ' +
        'A named face keeps its @kc ref. edges carry id, ref (@kc owner/edge/eN, which edge edits accept), curveType, length, and midpoint. ' +
        'importGeneration is owner@sha256-prefix of the file bytes. refScope says these selectors do not survive healing or a later edit. ' +
        'target_face highlights that face in every view where the face or its boundary is visible. ' +
        'Pass an id, a listRef, or a named ref from this import. A miss returns ok false, errorCode feature.selection.no-match, the face list, and no images. ' +
        'On-image labels are the largest visible faces and longest visible edges. The legend names at most 18 remaining face ids and 18 remaining edge ids, then a +N count. max_labels (default 8) caps on-image face labels. ' +
        'The default reply is compact, including a call that only passes report_id or report_path. detail true returns the saved full report (label placements and edge direction). ' +
        'Images come back as filesystem paths. When KERNELCAD_ARTIFACT_BASE_URL is set, each image also has a url of that base plus the file name.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path of a STEP file to import and draw.' },
          target_face: {
            type: 'string',
            description: 'Face id, listRef, or named ref from this import. Highlighted where it is visible.',
          },
          out_dir: { type: 'string', description: 'Directory for the four PNGs and report.json. Default is a new temp directory.' },
          width: { type: 'integer', minimum: 64, maximum: 1024, description: 'Image width in pixels. Default 360.' },
          height: {
            type: 'integer',
            minimum: 64,
            maximum: 1024,
            description: 'Model viewport height in pixels. Default 260. The PNG is 56 px taller for the legend.',
          },
          max_labels: { type: 'integer', minimum: 1, maximum: 32, description: 'Maximum face labels drawn on each view. Default 8.' },
          detail: { type: 'boolean', description: 'When true, include the full report in the reply. Default false.' },
          report_id: { type: 'string', description: 'Return a report kept in this process. Do not pass file.' },
          report_path: { type: 'string', description: 'Return a report.json written by an earlier call. Do not pass file.' },
        },
        required: [],
      },
    },
    handler: async (input) => inspectStepViewsTool(input),
  },
];
