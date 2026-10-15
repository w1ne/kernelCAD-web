// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** Shared building blocks for toolOutputSchemas.ts. */
import { SCENE_SUMMARY_SCHEMA } from './sceneSummarySchema';

/** Same shape as McpToolDefinition['inputSchema'] — a JSON Schema object node. */
export type JSONSchemaObject = {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

/** Standard source-edit envelope: returns modified code + re-eval diagnostics. */
export const SOURCE_EDIT: JSONSchemaObject = {
  type: 'object',
  properties: {
    ok: { type: 'boolean', description: 'Whether the edit applied and re-evaluated cleanly.' },
    viewerUrl: { type: 'string', description: 'Same live Studio link when this edit built a replacement model.' },
    viewerError: { type: 'string', description: 'Viewer provisioning error, independent of edit diagnostics.' },
    viewerMode: { type: 'string', enum: ['hosted'], description: 'Hosted mode uses open_in_studio instead of a process-local viewer.' },
    viewerHint: { type: 'string', description: 'How to view the built model in hosted Studio.' },
    step: { type: 'object', additionalProperties: true, description: 'Per-step build validity, volume and paired local PNG paths with a shared iso frame; unavailable snapshots report an error. Not a topology certificate. Omitted on dry runs.' },
    sceneSummary: SCENE_SUMMARY_SCHEMA,
    new_code: { type: 'string', description: 'Modified .kcad.ts source (present on success). Caller persists it.' },
    binding_name: { type: 'string', description: 'JS const name bound to the new construct (when one was created).' },
    diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Diagnostics from re-evaluating the modified source.' },
    error: { type: 'string', description: 'Failure message (present when ok is false).' },
  },
  required: ['ok'],
  additionalProperties: true,
};

/** One tube joint in the line report: the other tube and the station on the trunk. */
export const TUBE_JOINT = (description: string): Record<string, unknown> => ({
  type: 'object',
  properties: {
    tube: { type: 'string', description: 'Name of the other tube of the joint.' },
    at: { type: 'number', description: "Station of the tee: mm along the trunk centreline from the trunk's from end." },
  },
  required: ['tube', 'at'],
  additionalProperties: false,
  description,
});

export const SELECTION: JSONSchemaObject = {
  type: 'object', properties: {
    ok: { type: 'boolean' }, selection: { anyOf: [{ type: 'null' }, { type: 'object', additionalProperties: true }] },
    revision: { type: 'integer' }, modelGeneration: { type: 'integer' }, error: { type: 'string' },
  }, required: ['ok'], additionalProperties: true,
};
