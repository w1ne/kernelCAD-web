// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Output schema for run_flight, spread into TOOL_OUTPUT_SCHEMAS.
import type { JSONSchemaObject } from '../toolOutputSchemas';

export const FLIGHT_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  run_flight: {
    type: 'object',
    properties: {
      ok: { type: 'boolean', description: 'False when any error diagnostic was raised (stability below minimum or unresolved, unknown part, no mass, no liftoff).' },
      summary: {
        type: 'object',
        additionalProperties: true,
        description: 'apogeeM (above the site), apogeeAslM, apogeeTimeS, maxSpeedMs, maxMach, maxAccelMs2, maxAccelG, railExitSpeedMs, burnoutTimeS, descentRateMs, landingTimeS, landed, downrangeM, liftoffMassKg, burnoutMassKg, dryMassKg, thrustToWeight, cd, cdSource, cdBreakdown, refDiameterMm, lengthMm, motor { totalImpulseNs, impulseClass, burnTimeS, peakThrustN, averageThrustN }, stability { liftoffCal, burnoutCal, minCal, cpFromNoseMm, cgLiftoffFromNoseMm, cgBurnoutFromNoseMm, cnAlpha, components }, aero { noseShape, noseLengthMm, fins }, massBreakdown, events, assumptions, disclaimer.',
      },
      vehicle: { type: 'object', additionalProperties: true, description: 'Mass, motor and stability when the trajectory could not run.' },
      series: { type: 'object', additionalProperties: true, description: "{ columns, rows, sample_dt_s } (series 'json') or { csv, sample_dt_s } (series 'csv')." },
      animation: { type: 'object', additionalProperties: true, description: '{ durationMs, speed, tracks: [{ param, keys: [{ atMs, value, ease? }] }], scriptFragment } for animationView().' },
      files: { type: 'object', additionalProperties: true, description: 'Paths written under output_dir: csv, summary, animation.' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'flight.* diagnostics raised by the run.' },
      error: { type: 'string' },
      errorCode: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },
};
