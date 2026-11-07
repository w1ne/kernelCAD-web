// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Output schema for estimate_cost. Merged from toolOutputSchemas.ts so that
// file stays under the max-lines ratchet.
import type { JSONSchemaObject } from '../toolOutputSchemas';

export const COST_ESTIMATE_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  estimate_cost: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      currency: { type: 'string', description: "Always 'USD' on success." },
      currencyLabel: { type: 'string', description: "Always 'USD estimate'. A label, not a live quote." },
      label: { type: 'string', enum: ['offline-heuristic'] },
      quote: { type: 'boolean', description: 'Always false. This tool does not call a supplier.' },
      heuristic: { type: 'boolean' },
      disclaimer: { type: 'string' },
      quantity: { type: 'integer' },
      compared: { type: 'boolean', description: 'True when process was omitted and all three processes were priced.' },
      keyDrivers: { type: 'array', items: { type: 'string' } },
      parts: { type: 'array', items: { type: 'object', additionalProperties: true } },
      estimates: {
        type: 'array',
        items: { type: 'object', additionalProperties: true },
        description: 'Job rollup per process: materialUsd + setupUsd (once) + cycleUsd.',
      },
      skippedPurchased: { type: 'array', items: { type: 'string' } },
      error: { type: 'string' },
      errorCode: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },
};
