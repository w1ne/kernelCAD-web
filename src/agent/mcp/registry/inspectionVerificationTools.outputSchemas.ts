// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Output schema for assembly_checks, spread into TOOL_OUTPUT_SCHEMAS.
import type { JSONSchemaObject } from '../toolOutputSchemaParts';

const FINDING: JSONSchemaObject = {
  type: 'object',
  properties: {
    code: { type: 'string' },
    message: { type: 'string' },
    hint: { type: 'string' },
    severity: { type: 'string' },
    parts: { type: 'array', items: { type: 'string' } },
  },
  required: ['code', 'message'],
  additionalProperties: false,
};

const CHECK: JSONSchemaObject = {
  type: 'object',
  properties: {
    ok: { type: 'boolean', description: 'False when this check has a severity-error finding.' },
    findings: { type: 'array', items: FINDING },
    summary: { type: 'string' },
  },
  required: ['ok', 'findings', 'summary'],
  additionalProperties: false,
};

export const INSPECTION_VERIFICATION_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  assembly_checks: {
    type: 'object',
    properties: {
      ok: { type: 'boolean', description: 'False when any selected check has a blocking finding, or the review did not run.' },
      checks: {
        type: 'object',
        properties: {
          interference: CHECK,
          floating: CHECK,
          joints: CHECK,
          stability: CHECK,
        },
        additionalProperties: false,
        description: 'One entry per requested check. Default is all four.',
      },
      summary: { type: 'string' },
      error: { type: 'string' },
      errorCode: { type: 'string' },
      errorHint: { type: 'string' },
    },
    required: ['ok', 'checks', 'summary'],
    additionalProperties: true,
  },
};
