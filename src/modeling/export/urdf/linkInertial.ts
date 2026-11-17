// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/export/urdf/linkInertial.ts
//
// Emits a URDF <inertial> block for one link, sourcing mass / CoM /
// inertia from OcctBackend.massProperties(density). Defaults density
// to 1000 kg/m^3 (water) and emits an export.urdf.inertia-density-declared
// warning so the agent knows downstream dynamics will be off by ~8x for
// typical steel parts unless declared. A declared massKg replaces that
// mass and scales the inertia tensor by the same factor.

import type { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { MassProperties } from '../../../kernel/properties/massProperties';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS } from '../../../shared/diagnostics/registry';

const MM_TO_M = 1e-3;

/** Density used when a link declares neither `density` nor a material. Water. */
export const URDF_DEFAULT_DENSITY_KG_M3 = 1000;

export interface LinkInertialResult {
  xml: string;
  diagnostics: CompilerDiagnostic[];
}

/** Same substitution the MJCF writer records when mass properties throw. */
const UNIT_INERTIA_MASS_KG = 1;
const UNIT_INERTIA_DIAGONAL_KG_M2 = 1e-3;

function inertialXml(
  massKg: number,
  comMm: readonly number[],
  inertia6: readonly [number, number, number, number, number, number],
): string {
  const [ixx, ixy, ixz, iyy, iyz, izz] = inertia6;
  return [
    `    <inertial>`,
    `      <origin xyz="${comMm.map(n => (n * MM_TO_M).toFixed(6)).join(' ')}" rpy="0 0 0"/>`,
    `      <mass value="${massKg.toFixed(6)}"/>`,
    `      <inertia ixx="${ixx.toExponential(6)}" ixy="${ixy.toExponential(6)}" ixz="${ixz.toExponential(6)}" iyy="${iyy.toExponential(6)}" iyz="${iyz.toExponential(6)}" izz="${izz.toExponential(6)}"/>`,
    `    </inertial>`,
  ].join('\n');
}

export function linkInertialBlock(
  shape: OcctBackend,
  density: number | undefined,
  massKg?: number,
  partName?: string,
): LinkInertialResult {
  const effective = density ?? URDF_DEFAULT_DENSITY_KG_M3;
  let mp: MassProperties;
  try {
    mp = shape.massProperties(effective);
  } catch {
    const label = partName ?? 'link';
    return {
      xml: inertialXml(
        UNIT_INERTIA_MASS_KG,
        [0, 0, 0],
        [UNIT_INERTIA_DIAGONAL_KG_M2, 0, 0, UNIT_INERTIA_DIAGONAL_KG_M2, 0, UNIT_INERTIA_DIAGONAL_KG_M2],
      ),
      diagnostics: [{
        target: 'export-occt',
        code: 'export.urdf.inertia-fallback',
        severity: 'warn',
        message: `${label}: mass properties unavailable; substituted unit inertia (mass 1 kg, diagonal 1e-3 kg·m², centre of mass at the part origin)`,
        hint: 'Mass properties failed for this link, so the inertial is the unit substitute (1 kg, diagonal 1e-3 kg·m²). Repair the solid and export again.',
        nextAction: NEXT_ACTIONS['export.urdf.inertia-fallback'],
      }],
    };
  }
  // A declared mass wins over volume × density. CoM stays on the solid.
  // Inertia scales with the mass, the same rule the MJCF emitter uses.
  const declared = massKg !== undefined && massKg > 0 && mp.mass > 0 ? massKg : undefined;
  const k = declared !== undefined ? declared / mp.mass : 1;
  const mass = mp.mass * k;
  const inertia6 = mp.inertia6.map((v) => v * k) as [number, number, number, number, number, number];
  const xml = inertialXml(mass, mp.com, inertia6);

  const diagnostics: CompilerDiagnostic[] = [];
  if (density === undefined && declared === undefined) {
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
