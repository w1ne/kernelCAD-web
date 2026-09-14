// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { resolveAssumptionsTool } from '../tools/resolveAssumptions';
import type { ToolRegistryEntry } from './types';

export const referenceLedgerToolEntries: ToolRegistryEntry[] = [
  {
    definition: {
      name: 'resolve_assumptions',
      description:
        "Use this when you need to confirm or override the open facts in an assumption ledger from trace_from_image (missing scale, inferred/assumed values) before committing geometry built from a reference photo. " +
        "Reads the persisted `<model>.ledger.json` at `ledgerPath`, applies each resolution — `{ id, confirm: true }` to accept a fact as-is, or `{ id, value }` to override it — rewrites the ledger file, and returns the updated ledger plus `paramOverrides` (factId -> value) to feed straight into `set_param`. Pair with the `kernelcad-from-reference` skill.",
      inputSchema: {
        type: 'object',
        properties: {
          ledgerPath: {
            type: 'string',
            description: 'Path to the `<model>.ledger.json` file persisted alongside the traced source.',
          },
          resolutions: {
            type: 'array',
            description: 'One resolution per ledger fact id to act on.',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Matches a `facts[].id` in the ledger.' },
                value: { description: 'Overrides the fact\'s value; marks it `overridden`.' },
                confirm: { type: 'boolean', description: 'Accepts the fact as-is; marks it `confirmed`.' },
              },
              required: ['id'],
            },
          },
        },
        required: ['ledgerPath', 'resolutions'],
      },
    },
    handler: input => resolveAssumptionsTool(input as unknown as Parameters<typeof resolveAssumptionsTool>[0]),
  },
];
