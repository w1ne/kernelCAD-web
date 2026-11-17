// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/flight/index.ts — rocket flight study (flightStudy / run_flight).

export { isa, G0 } from './atmosphere';
export { Motor, parseEngFile } from './motor';
export { barrowmanCp, estimateCd } from './barrowman';
export { simulateFlight } from './simulate';
export { normalizeFlightStudy, FLIGHT_STUDY_EXAMPLE } from './studySpec';
export { runFlightStudy, flightAnimation, seriesCsv, seriesRows, SERIES_COLUMNS, FLIGHT_DISCLAIMER } from './runFlight';
export type { FlightBody } from './geometry';
export type { FlightSummary, FlightRunResult, FlightAnimation, FlightStability, FlightVehicle } from './runFlight';
