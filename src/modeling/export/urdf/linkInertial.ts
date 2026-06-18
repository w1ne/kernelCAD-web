// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/export/urdf/linkInertial.ts
//
// Emits a URDF <inertial> block for one link, sourcing mass / CoM /
// inertia from OcctBackend.massProperties(density). Defaults density
// to 1000 kg/m^3 (water) and emits an export.urdf.inertia-density-declared
// warning so the agent knows downstream dynamics will be off by ~8x for
// typical steel parts unless declared.

import type { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS } from '../../../shared/diagnostics/registry';

const MM_TO_M = 1e-3;

export interface LinkInertialResult {
  xml: string;
  diagnostics: CompilerDiagnostic[];
}

export function linkInertialBlock(
  shape: OcctBackend,
  density: number | undefined,
): LinkInertialResult {
  const effective = density ?? 1000;
  const mp = shape.massProperties(effective);
  const [ixx, ixy, ixz, iyy, iyz, izz] = mp.inertia6;
  const xml = [
    `    <inertial>`,
    `      <origin xyz="${mp.com.map(n => (n * MM_TO_M).toFixed(6)).join(' ')}" rpy="0 0 0"/>`,
    `      <mass value="${mp.mass.toFixed(6)}"/>`,
    `      <inertia ixx="${ixx.toExponential(6)}" ixy="${ixy.toExponential(6)}" ixz="${ixz.toExponential(6)}" iyy="${iyy.toExponential(6)}" iyz="${iyz.toExponential(6)}" izz="${izz.toExponential(6)}"/>`,
    `    </inertial>`,
  ].join('\n');

  const diagnostics: CompilerDiagnostic[] = [];
  if (density === undefined) {
    diagnostics.push({
      target: 'export-occt',
      code: 'export.urdf.inertia-density-declared',
      severity: 'warn',
      message: 'Link inertia computed with default density 1000 kg/m^3 (water). Downstream dynamics will be off by ~8x for steel, ~2.7x for aluminum.',
      hint: 'Pass density on arm.part(name, shape, { density }) to get physically meaningful inertia. Typical: steel 7850, aluminum 2700, ABS 1050.',
      nextAction: NEXT_ACTIONS['export.urdf.inertia-density-declared'],
    });
  }
  return { xml, diagnostics };
}
