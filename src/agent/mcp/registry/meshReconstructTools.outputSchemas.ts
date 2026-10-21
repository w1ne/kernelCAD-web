// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/registry/meshReconstructTools.outputSchemas.ts
//
// Output schema for mesh_to_features, spread into TOOL_OUTPUT_SCHEMAS. Moved
// out of toolOutputSchemas.ts to keep that file under the 800-line cap.

import type { JSONSchemaObject } from '../toolOutputSchemas';

export const MESH_RECONSTRUCT_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  mesh_to_features: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      script: { type: 'string', description: 'The emitted, evaluable .kcad.ts source. Omitted when ok is false because the mesh is not one editable profile.' },
      ledger: {
        type: 'object',
        additionalProperties: true,
        description: 'AssumptionLedger { facts, unresolvedCount }; dimension fact ids equal the param names (success).',
      },
      fidelity: {
        type: 'object',
        properties: {
          maxDeviationMm: { type: 'number', description: 'Two-sided discrete Hausdorff distance, mesh vs reconstruction.' },
          rmsMm: { type: 'number', description: 'RMS of the sampled point-to-surface distances.' },
          volumeIoU: { type: 'number', description: 'Volume intersection-over-union by column ray casting.' },
          verdict: {
            type: 'string',
            enum: ['faithful', 'approximate', 'failed'],
            description: 'faithful = IoU and deviation within thresholds, watertight mesh, nothing unmatched; approximate = IoU >= 0.85.',
          },
          thresholds: { type: 'object', additionalProperties: true, description: '{ minIoU, maxDeviationMm, approximateIoU } actually applied.' },
          pass: { type: 'number', description: 'Refinement pass whose script is returned.' },
        },
        required: ['maxDeviationMm', 'rmsMm', 'volumeIoU', 'verdict'],
        additionalProperties: true,
        description: 'Measured fidelity of the returned script (success).',
      },
      unmatchedRegions: {
        type: 'array',
        items: { type: 'object', additionalProperties: true },
        description: 'Surface regions no emitted feature represents: { kind, reason, areaMm2, triangleCount, centroid, bbox }.',
      },
      features: { type: 'object', additionalProperties: true, description: 'Body kind, hole groups, cutouts, boolean remainders, params (success).' },
      mesh: { type: 'object', additionalProperties: true, description: 'Clean-up and watertightness report for the input mesh.' },
      reconstructedHoles: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Holes the B-rep hole detector finds on the reconstruction.' },
      passes: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Per-pass tolerances and measured fidelity.' },
      notRepresented: { type: 'array', items: { type: 'string' } },
      written: { type: 'object', additionalProperties: true, description: '{ script, ledger } paths when out was given.' },
      error: { type: 'string', description: 'Failure message (failure).' },
      errorCode: { type: 'string' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
    },
    required: ['ok'],
    additionalProperties: true,
  },};
