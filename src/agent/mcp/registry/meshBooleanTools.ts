// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { meshBooleanTool } from '../tools/meshBoolean';
import type { ToolRegistryEntry } from './types';

/** Appended family: mesh-native Boolean operations for imported triangle meshes. */
export const meshBooleanToolEntries: ToolRegistryEntry[] = [{
  definition: {
    name: 'mesh_boolean',
    description:
      'Use this when the user wants to union, subtract, or intersect two imported triangle mesh solids (STL, OBJ, or 3MF). ' +
      'Supports union, subtract (A minus B) and intersect. ' +
      'Pass each operand as { file } on the MCP server or { data } with base64 mesh bytes; formats are detected or may be specified. ' +
      'Returns volume in mm³, triangle count and a binary STL as data_base64; pass that payload to import_step to continue modeling. ' +
      'Inputs must be closed, consistently oriented 2-manifold meshes. Open, non-manifold, or invalid meshes return an error. ' +
      'This computes mesh geometry and does not create an editable B-rep feature tree.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['union', 'subtract', 'intersect'] },
        a: { type: 'object', description: 'First mesh: { file } or { data } base64, optional format stl|obj|3mf.' },
        b: { type: 'object', description: 'Second mesh: { file } or { data } base64, optional format stl|obj|3mf.' },
        toleranceMm: { type: 'number', description: 'Vertex weld tolerance in mm. Default 0.000001.' },
        maxTriangles: { type: 'integer', description: 'Maximum triangles per input and output. Default and maximum 100000.' },
      },
      required: ['operation', 'a', 'b'],
    },
  },
  handler: input => meshBooleanTool(input as unknown as Parameters<typeof meshBooleanTool>[0]),
}];
