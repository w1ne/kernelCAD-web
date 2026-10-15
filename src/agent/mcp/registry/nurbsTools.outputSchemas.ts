// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSONSchemaObject } from '../toolOutputSchemas';

export const NURBS_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  inspect_nurbs: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      feature_id: { type: 'string' },
      entity: { type: 'string', enum: ['curve'] },
      representation: { type: 'string' },
      degree: { type: 'integer' },
      knots: { type: 'array', items: { type: 'number' } },
      multiplicities: { type: 'array', items: { type: 'integer' } },
      poles: { type: 'array', items: { type: 'array', items: { type: 'number' } } },
      weights: { type: 'array', items: { type: 'number' } },
      rational: { type: 'boolean', description: 'OCCT IsRational semantics: true when weights are not all equal. Equal non-unit weights cancel uniformly and are reported as non-rational.' },
      uniformWeights: { type: 'boolean', description: 'True when all weights have the same value, including equal weights other than 1.' },
      hasNonUnitWeights: { type: 'boolean', description: 'True when any weight differs from 1, even if all weights are equal and rational is false.' },
      parameter_range: { type: 'array', items: { type: 'number' } },
      closed: { type: 'boolean' },
      limitations: { type: 'array', items: { type: 'string' } },
      error: { type: 'string' }, errorCode: { type: 'string' }, hint: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },
};
