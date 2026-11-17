// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Output schema for check_export_health. Kept out of toolOutputSchemas.ts
// so that file stays under the max-lines ceiling.
import type { JSONSchemaObject } from '../toolOutputSchemas';

const INERTIA = {
  type: 'object',
  additionalProperties: true,
  description: 'massKg, comM (metres), inertia6 [ixx, ixy, ixz, iyy, iyz, izz] in kg·m².',
} as const;

export const EXPORT_HEALTH_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  check_export_health: {
    type: 'object',
    properties: {
      ok: { type: 'boolean', description: 'True only when rest contacts, visual collision bits, inertia rows, and qpos0 joint ranges are all clean.' },
      source: { type: 'string' },
      summary: { type: 'string' },
      tolerance: { type: 'object', additionalProperties: true, description: 'Stated mass, centre-of-mass, inertia, and penetration thresholds.' },
      restContacts: {
        type: 'object',
        additionalProperties: true,
        description: 'penetrating and marginOnly rows. Parent/child pairs and explicit exclusions are omitted.',
      },
      restQpos: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Scalar qpos0 for each compiled hinge and slide, in radians or metres.' },
      qposOutsideLimits: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Compiled qpos0 values outside the joint range.' },
      visualFindings: { type: 'array', items: { type: 'object', additionalProperties: true } },
      inertia: { type: 'array', items: INERTIA },
      geoms: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Compiled geoms: contype, conaffinity, group, and role.' },
      excludedBodyPairs: { type: 'array', items: { type: 'object', additionalProperties: true } },
      inertiaNotes: { type: 'array', items: { type: 'string' } },
      error: { type: 'string' },
      errorCode: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },
};
