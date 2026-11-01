// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Output schemas for run_cfd and cfd_summary, spread into TOOL_OUTPUT_SCHEMAS.
import type { JSONSchemaObject } from '../toolOutputSchemas';

export const CFD_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  run_cfd: {
    type: 'object',
    properties: {
      ok: { type: 'boolean', description: 'True only when the solve converged. False on a missing solver, an unresolved patch, a failed mesh, divergence, a timeout, or an unconverged solve (numbers then provisional).' },
      summary: {
        type: 'object',
        additionalProperties: true,
        description: "Solved evidence: flow, fluid { rho, nu, mu }, reynolds { value, lengthMm, speed, basis }, turbulence { model, chosen, reason }, mesh (checkMesh: cells, ok, failedChecks, maxNonOrthogonality, maxSkewness, patchFaces, surfaceCellMm), convergence { verdict 'converged' | 'not-converged' | 'diverged', finalResiduals, monitorDrift, reason }, residualHistory, pressureDropPa (internal), patches [{ patch, flowM3s, massFlowKgs, pressurePa }], massBalance { inflowKgs, outflowKgs, imbalance }, maxVelocity (m/s), forces { totalN, dragN, liftN, cd, cl, referenceAreaMm2 } (external), meshMs / solveMs, disclaimer, inputHash.",
      },
      images: { type: 'array', items: { type: 'string' }, description: 'Absolute path of the mid-plane velocity-magnitude PNG.' },
      out_dir: { type: 'string', description: 'Run directory: case/, cfd-summary.json, cfd-result.json, progress.json, the PNG.' },
      artifacts: { type: 'object', additionalProperties: true, description: 'Absolute paths: caseDir, stlPath, summaryPath, previewPng, vtkDir (export_vtk), solver logs.' },
      reused: { type: 'string', description: "'finished': returned from an identical earlier run; 'joined': waited on a live identical run." },
      toolchain: { type: 'object', additionalProperties: true, description: '{ missing[], hint } when OpenFOAM is not installed.' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'cfd.* diagnostics raised by the run.' },
      error: { type: 'string' },
      errorCode: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },
  cfd_summary: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      summary: { type: 'object', additionalProperties: true, description: 'Stored summary of a previous run_cfd in output_dir, when present.' },
      progress: { type: 'object', additionalProperties: true, description: 'Stage of a run still in progress in output_dir.' },
      toolchain: { type: 'object', additionalProperties: true, description: '{ available, mode, image?, version?, missing[], hint? }.' },
      fluids: { type: 'object', additionalProperties: true, description: 'Preset name -> { rho (kg/m^3), nu (m^2/s) }.' },
      fluid_names: { type: 'array', items: { type: 'string' } },
      error: { type: 'string' },
      errorCode: { type: 'string' },
    },
    required: ['ok', 'toolchain', 'fluids', 'fluid_names'],
    additionalProperties: true,
  },
};
