// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { EDGE_RADIUS_OUTPUT_PROPERTIES } from './edgeRadiusOutputSchema';

// Merged dispatcher (selected by `check`): union of verifier outputs. All
// carry `ok` and (mostly) `diagnostics`; remaining fields are check-specific.
export const VERIFY_OUTPUT_SCHEMA = {
  type: 'object' as const,
  properties: {
    ...EDGE_RADIUS_OUTPUT_PROPERTIES,
    ok: { type: 'boolean', description: 'Whether the verification ran and passed its gate.' },
    source: { type: 'string', description: "fastener-installation/geometry-quality/assembly-path/edge-radius: local geometry evidence." },
    featureId: { type: 'string', description: 'geometry-quality: measured body feature.' },
    frame: { type: 'string', description: 'geometry-quality: model coordinate frame for all locations.' },
    thresholds: { type: 'object', additionalProperties: true, description: 'geometry-quality: effective area/length thresholds and total surface area.' },
    tinyFaces: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'geometry-quality: rebuild-scoped face id/index, areaMm2, location.' },
    shortEdges: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'geometry-quality: rebuild-scoped edge id/index, lengthMm, parametric midpoint location.' },
    degenerateEdges: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'geometry-quality: explicit BREP degenerated pole/parameterization edges, ids and locations; excluded from the physical short-edge gate.' },
    symmetry: { type: 'object', additionalProperties: true, description: 'geometry-quality: sampled-mesh-reflection; planes with passed, maxDeviationMm, rmsDeviationMm, sampleCount and worst-point witnesses, matchingPlanes, toleranceMm and meshDeflectionMm.' },
    basis: { type: 'string', description: 'assembly-path: continuous-triangle-mesh.' },
    parts: { type: 'array', description: 'assembly-path: initial per-part removable, validDirections, directions with distanceMm, clear and blockingParts, and the three-way state (removable / blocked / unknown).', items: { type: 'object', additionalProperties: true } },
    model: { type: 'object', additionalProperties: true, description: 'assembly-path: model stamp — rigid parts, straight-line translation, tested directions, no gravity, mesh tessellation and clearance tolerance.' },
    blockingGraph: { type: 'object', additionalProperties: true, description: 'assembly-path: union of the per-direction blocker sets as part -> blocker -> direction edges.' },
    sequence: { type: 'object', additionalProperties: true, description: 'assembly-path: { steps, model, unknown, search? }. Steps are the reverse of the removal peel with insertion direction; subassembly steps name the unit and its internal build. search lists sampling paths labelled found-by-search (never proven); unknown lists parts that could not be proven (never "impossible").' },
    removalOrder: { type: 'array', description: 'assembly-path: deterministic part removal steps, each with part and direction.', items: { type: 'object', additionalProperties: true } },
    search: { type: 'array', description: 'assembly-path: non-straight paths found by the sampling fallback. Each entry has part, status: found-by-search and waypoints; it is evidence inside a finite budget, not a proof.', items: { type: 'object', additionalProperties: true } },
    stuckParts: { type: 'array', items: { type: 'string' }, description: 'assembly-path: remaining parts when no straight removal is available.' },
    assembly: { type: ['string', 'null'], description: 'Audited lowered assembly.' },
    status: { type: 'string', description: 'fastener-installation/edge-radius: pass, fail, partial, or no-coverage; partial/zero coverage cannot pass.' },
    counts: {
      anyOf: [{
        type: 'object',
        properties: {
          requested: { type: 'integer', minimum: 0 }, measured: { type: 'integer', minimum: 0 },
          passed: { type: 'integer', minimum: 0 }, failed: { type: 'integer', minimum: 0 }, unknown: { type: 'integer', minimum: 0 },
        },
        required: ['requested', 'measured', 'passed', 'failed', 'unknown'], additionalProperties: false,
      }, {
        type: 'object', properties: { faces: { type: 'integer', minimum: 0 }, edges: { type: 'integer', minimum: 0 } },
        required: ['faces', 'edges'], additionalProperties: false,
      }],
    },
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
