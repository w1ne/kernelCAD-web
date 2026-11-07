// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Tail-appended family: scan references. New families go at the END of
// TOOL_REGISTRY so kernelCAD-server's index-based public contract stays stable.
// Studio does not draw the cloud; see src/shared/scan/STATUS.md.
import { fitModelToScanTool } from '../tools/fitModelToScan';
import { loadScanReferenceTool } from '../tools/loadScanReference';
import type { ToolRegistryEntry } from './types';

export const scanReferenceToolEntries: ToolRegistryEntry[] = [
  {
    definition: {
      name: 'load_scan_reference',
      description:
        'Use this when you need a phone LiDAR, PLY, or XYZ point cloud as a measured reference rather than a solid. ' +
        'Pass { file } or base64 { data }, optional units ("mm" default, "m", or "in"), and optional max_points (positive integer, cap 200000). ' +
        'ASCII PLY and XYZ/XYZRGB text are read as one point per vertex. binary_little_endian PLY with scalar x, y, z is read. binary_big_endian and list vertex properties are refused by format name. ' +
        'Returns point_count, bbox { min, max, size } in millimetres, centroid, and downsampled when the cloud was stride-sampled. ' +
        'This is a reference cloud, not a BREP solid. Booleans on the scan are refused. Do not use it as a mesh_to_features or lib.fromSTL input.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to an ASCII PLY, little-endian binary PLY, or XYZ point cloud.' },
          data: { type: 'string', description: 'Base64-encoded PLY or XYZ bytes. Do not combine with file.' },
          units: {
            type: 'string',
            enum: ['mm', 'm', 'in'],
            description: 'Coordinate unit in the cloud. Default mm. m and in are scaled to millimetres.',
          },
          max_points: {
            type: 'integer',
            minimum: 1,
            maximum: 200000,
            description: 'Maximum stored sample. Default and cap 200000. Larger clouds are stride-downsampled and flagged.',
          },
        },
      },
    },
    handler: input => loadScanReferenceTool(input as unknown as Parameters<typeof loadScanReferenceTool>[0]),
  },
  {
    definition: {
      name: 'fit_model_to_scan',
      description:
        'Use this when a parametric model should fit a scanned opening or envelope. ' +
        'Pass { file | code } for the model and either scan_file, base64 scan_data, or scan_bbox { min_mm, max_mm } (min and max from a prior load_scan_reference bbox are accepted). ' +
        'Optional units scales a scan file. Optional requirement { min_clearance_mm } checks that the model extent fits inside the scan. ' +
        'Uses the model bounding box from evaluation. Returns model_bbox, scan_bbox, translate_mm (model center onto scan center), scale.per_axis, scale.uniform (largest isotropic factor that stays inside, applied about the model center before the translation), and clearance_mm (scan size minus model size; positive means the model fits inside). ' +
        'The scan is not a solid and is not booleaned into the model.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts model script.' },
          code: { type: 'string', description: 'Inline kernelCAD model script.' },
          scan_file: { type: 'string', description: 'Path to an ASCII PLY, little-endian binary PLY, or XYZ point cloud.' },
          scan_data: { type: 'string', description: 'Base64-encoded PLY or XYZ bytes. Do not combine with scan_file or scan_bbox.' },
          scan_bbox: {
            type: 'object',
            description: 'Scan envelope in millimetres. Prior load_scan_reference bbox min and max are accepted as aliases.',
            properties: {
              min_mm: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'number' } },
              max_mm: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'number' } },
              min: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'number' }, description: 'Alias of min_mm.' },
              max: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'number' }, description: 'Alias of max_mm.' },
            },
          },
          units: {
            type: 'string',
            enum: ['mm', 'm', 'in'],
            description: 'Coordinate unit of scan_file or scan_data. Default mm. Not used with scan_bbox.',
          },
          max_points: {
            type: 'integer',
            minimum: 1,
            maximum: 200000,
            description: 'Sample cap when reading scan_file or scan_data. The bbox still uses every point.',
          },
          requirement: {
            type: 'object',
            description: 'Optional fit window. pass is true when every clearance_mm is at least min_clearance_mm.',
            properties: {
              min_clearance_mm: { type: 'number', description: 'Minimum scan-minus-model slack on every axis, millimetres. Default 0.' },
            },
          },
        },
      },
    },
    handler: input => fitModelToScanTool(input as unknown as Parameters<typeof fitModelToScanTool>[0]),
  },
];
