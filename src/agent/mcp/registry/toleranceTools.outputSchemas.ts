// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Output schema for analyze_tolerance_stack. Merged from toolOutputSchemas.ts
// so that file stays under the max-lines ratchet.
import type { JSONSchemaObject } from '../toolOutputSchemas';

export const TOLERANCE_STACK_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  analyze_tolerance_stack: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      method: { type: 'string', enum: ['1d-arithmetic'] },
      nominalMm: { type: 'number' },
      worstCase: { type: 'object', additionalProperties: true },
      rss: {
        type: 'object',
        additionalProperties: true,
        description: 'Independent RSS band. half-width is the ±3σ proxy; sigmaEquivalent is 3.',
      },
      contributors: { type: 'array', items: { type: 'object', additionalProperties: true } },
      requirement: {
        type: 'object',
        additionalProperties: true,
        description: 'Present when a requirement was passed. pass follows the worst case.',
      },
      disclaimer: { type: 'string' },
      error: { type: 'string' },
      errorCode: { type: 'string' },
    },
    required: ['ok', 'disclaimer'],
    additionalProperties: true,
  },
};
