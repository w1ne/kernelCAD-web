// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/registry/flightTools.ts
//
// Flight family: model-rocket flight study (`run_flight`). Appended LAST in
// the composition: TOOL_REGISTRY order is a public contract.

import { runFlightTool } from '../tools/runFlight';
import type { ToolRegistryEntry } from './types';

const runFlightToolEntry: ToolRegistryEntry = {
  definition: {
    name: 'run_flight',
    description:
      'Use this when you need to know how high a model rocket goes, whether it is stable, and how fast it comes down under its parachute. Runs a rocket flight study on the model: mass and CG from the parts (material / density / massKg; the motor part is replaced by the declared motor, so the CG shifts as it burns), the Barrowman centre of pressure and static margin in calibers from the nose and fin geometry (or declared dimensions), and an RK4 point-mass trajectory with ISA atmosphere, launch rail, wind and parachute drag. Returns summary { apogeeM, apogeeTimeS, maxSpeedMs, maxAccelMs2, railExitSpeedMs, descentRateMs, landingTimeS, stability { liftoffCal, burnoutCal, cpFromNoseMm, cgLiftoffFromNoseMm }, motor { totalImpulseNs, impulseClass }, cd, massBreakdown, events, assumptions }, a time series (t, x, z, v, vz, a, a_axial, p_static_hpa, temp_c, mass, thrust, chute) as JSON columns or CSV, and an animationView-compatible track (altitude / downrange / chute / separation params with a ready-to-paste script fragment).\n' +
      "The study is EITHER declared in the script with `arm.flightStudy({...})` / `shape.flightStudy({...})` OR passed on the call (fields override a declared study): { code, motor: { thrustCurve: [[t, N], ...] | engFile: '<.eng text>', totalMassKg, propellantKg, part? }, aero: { cd: 'auto' | number, refDiameterMm?, nose?: { shape: 'ogive' | 'cone', part? }, fins?: { count, part? } }, launch: { railM, angleDeg, siteAltitudeM, windMs }, recovery: [{ cd, diameterMm, deploy: 'apogee' | 'apogee+1' | { atS }, part?, separates? }], dry_mass_kg?, min_stability_cal? }. " +
      'ok is false on an error diagnostic (flight.stability.below-min, flight.stability.unresolved, flight.study.part-unresolved, flight.mass.unavailable, flight.sim.no-liftoff); warnings: flight.rail.exit-speed-low, flight.mass.density-defaulted, flight.sim.timeout. Point mass at zero angle of attack, no Mach effects: an engineering estimate, not OpenRocket and not a certification. Runs in seconds, in process.',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Path to a .kcad.ts script (with a flightStudy, or pass the study on the call).' },
        code: { type: 'string', description: 'Inline kernelCAD script source (mutually exclusive with file).' },
        study: { type: ['string', 'object'], description: 'Name of a declared flightStudy (default: the last), or an inline study object.' },
        motor: { type: 'object', description: "{ thrustCurve: [[t s, N], ...] | engFile: '.eng text', totalMassKg, propellantKg, part?, cgFromNoseMm? }." },
        aero: { type: 'object', description: "{ cd: 'auto' | number, refDiameterMm?, axis?: '+Z', nose?: { shape?: 'ogive' | 'cone', part?, lengthMm? }, fins?: { count, part?, rootChordMm?, tipChordMm?, spanMm?, sweepMm?, leadingEdgeFromNoseMm? }, lengthMm? }." },
        launch: { type: 'object', description: '{ railM (default 1), angleDeg (from vertical), siteAltitudeM, windMs }.' },
        recovery: { type: 'array', items: { type: 'object' }, description: "[{ cd, diameterMm, deploy: 'apogee' | 'apogee+<s>' | { atS }, inflateS?, part?, separates?: [part names] }]." },
        dry_mass_kg: { type: 'number', description: 'Vehicle mass without the motor, kg (overrides the part masses).' },
        cg_from_nose_mm: { type: 'number', description: 'Dry CG from the nose tip, mm (overrides the part CG).' },
        min_stability_cal: { type: 'number', description: 'Minimum static margin, calibers; below it the run reports flight.stability.below-min.' },
        max_time_s: { type: 'number', description: 'Simulation cut-off, s (default 300).' },
        series: { type: 'string', enum: ['json', 'csv', 'none'], description: "Time series format: 'json' columns + rows (default), 'csv', or 'none'." },
        sample_dt_s: { type: 'number', description: 'Series row spacing, s (default 0.1).' },
        animation_speed: { type: 'number', description: 'Animation playback speed-up (default 1 = real time).' },
        output_dir: { type: 'string', description: 'Also write flight.csv (10 ms rows), summary.json and animation.json here.' },
      },
    },
  },
  handler: input => runFlightTool(input as unknown as Parameters<typeof runFlightTool>[0]),
};

export const flightToolEntries: ToolRegistryEntry[] = [runFlightToolEntry];
