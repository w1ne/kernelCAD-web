// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

// Merged dispatcher (selected by `check`): union of check-specific verifier outputs. All
// carry `ok` and (mostly) `diagnostics`; remaining fields are check-specific.
export const VERIFY_OUTPUT_SCHEMA = {
  type: 'object' as const,
  properties: {
    ok: { type: 'boolean', description: 'Whether the verification ran and passed its gate.' },
    source: { type: 'string', description: "fastener-installation/hole-fastener-coverage: local geometry evidence." },
    assembly: { type: ['string', 'null'], description: 'Audited lowered assembly.' },
    status: { type: 'string', description: 'fastener-installation/hole-fastener-coverage: pass, fail, partial, or no-coverage; partial/zero coverage cannot pass.' },
    counts: {
      type: 'object',
      anyOf: [
        {
          properties: {
            requested: { type: 'integer', minimum: 0 }, measured: { type: 'integer', minimum: 0 },
            passed: { type: 'integer', minimum: 0 }, failed: { type: 'integer', minimum: 0 }, unknown: { type: 'integer', minimum: 0 },
          }, required: ['requested', 'measured', 'passed', 'failed', 'unknown'], additionalProperties: false,
        },
        {
          properties: {
            holes: { type: 'integer', minimum: 0 }, matched: { type: 'integer', minimum: 0 }, explained: { type: 'integer', minimum: 0 },
            failed: { type: 'integer', minimum: 0 }, unknown: { type: 'integer', minimum: 0 },
          }, required: ['holes', 'matched', 'explained', 'failed', 'unknown'], additionalProperties: false,
        },
      ],
    },
    holes: {
      type: 'array', description: 'Every detected cylindrical bore, including catalog hardware bores.',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' }, part: { type: 'string' }, location: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
          diameterMm: { type: 'number' }, depthMm: { type: 'number' },
          status: { type: 'string', enum: ['matched', 'explained', 'fail', 'unknown'] }, message: { type: 'string' }, reason: { type: 'string' },
          fastener: {
            type: 'object', properties: {
              part: { type: 'string' }, catalogId: { type: 'string' }, size: { type: 'string' }, expectedDiameterMm: { type: 'number' },
              fit: { type: 'string', enum: ['clearance', 'tap', 'insert', 'thread'] },
            }, required: ['part', 'catalogId', 'size', 'expectedDiameterMm', 'fit'], additionalProperties: false,
          },
        }, required: ['id', 'part', 'location', 'diameterMm', 'depthMm', 'status', 'message'], additionalProperties: false,
      },
    },
    uncertainties: { type: 'array', items: { type: 'string' }, description: 'Unsupported or heuristic geometry prevents a coverage pass.' },
    stations: {
      type: 'array', description: 'Explicit fastener-installation stations only; no whole-assembly certification.',
      items: {
        type: 'object',
        properties: {
          part: { type: 'string' }, against: { type: 'array', items: { type: 'string' } },
          engagementPart: { type: ['string', 'null'] }, catalogId: { type: ['string', 'null'] },
          status: { type: 'string', enum: ['pass', 'fail', 'partial'] },
          metrics: {
            type: 'array', items: {
              type: 'object', properties: {
                name: { type: 'string' }, part: { type: ['string', 'null'] },
                status: { type: 'string', enum: ['pass', 'fail', 'unknown', 'not-applicable'] },
                value: { type: ['number', 'null'] }, unit: { type: 'string', enum: ['mm', 'deg'] },
                limit: { type: ['number', 'null'] }, basis: { type: 'string' }, repairHint: { type: ['string', 'null'] },
              }, required: ['name', 'part', 'status', 'value', 'unit', 'limit', 'basis', 'repairHint'], additionalProperties: false,
            },
          },
        }, required: ['part', 'against', 'engagementPart', 'catalogId', 'status', 'metrics'], additionalProperties: false,
      },
    },
    limitations: { type: 'array', items: { type: 'string' }, description: 'Coverage and physical limitations of the geometry audit.' },
    diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Verifier diagnostics (most checks).' },
    error: { type: 'string', description: 'Failure message (present on failure).' },
    errorCode: { type: 'string' },
  },
  required: ['ok'],
  additionalProperties: true,
};
