// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/getMassProperties.ts
//
// Reader for inspect({ of: 'mass' }). Mirrors getShapeInfo.ts.
//
// The physics predates this file by a long way: OCCT BRepGProp::VolumeProperties
// via modeling/properties/massProperties.ts, already carefully written (it
// reconstructs the 6 unique inertia-tensor components from six MomentOfInertia
// calls because this opencascade.js build doesn't bind gp_Mat). It was reachable
// only from URDF/SDF/MJCF <inertial> serialization — no agent could ask for the
// mass of a part. This exposes it.
import { RecomputeEngine } from '../../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../modeling/backends/occt/occtLowerer';
import { resolveRootId } from '../../../modeling/buildModel';
import { runMcpScript } from '../runMcpScript';
import type { Vec3 } from '../../../shared/intent/types';

/** Water. Same default as OcctBackend.massProperties and URDF's linkInertialBlock. */
const DEFAULT_DENSITY = 1000;

export interface GetMassPropertiesInput {
  file?: string;
  code?: string;
  feature_id?: string;
  /** kg/m^3. Steel ~7850, aluminium ~2700, ABS ~1050. Defaults to water. */
  density?: number;
  /**
   * Optional arbitrary axis (shape-local mm) to additionally report the
   * radius of gyration about. Omit to get only the centroidal quantities.
   */
  gyration_axis?: { origin: [number, number, number]; direction: [number, number, number] };
}

export interface MassPropertiesInfo {
  id: string;
  /** kg, at the density used. */
  mass: number;
  /** kg/m^3 actually used — echoed so a defaulted value can't be mistaken for a declared one. */
  density: number;
  /** True when `density` was defaulted rather than supplied. */
  densityDefaulted: boolean;
  /** mm, shape-local. */
  com: [number, number, number];
  /** [ixx, ixy, ixz, iyy, iyz, izz] in kg*m^2, about the CoM. */
  inertia6: [number, number, number, number, number, number];
  /** Full symmetric 3x3 centroidal inertia tensor, row-major, kg*m^2. */
  inertiaMatrix: [Vec3, Vec3, Vec3];
  /** Principal moments in kg*m^2; principalMoments[i] pairs with principalAxes[i]. Not sorted. */
  principalMoments: [number, number, number];
  /** Unit direction of each principal axis, shape-local. */
  principalAxes: [Vec3, Vec3, Vec3];
  /** True when the mass distribution is rotationally / spherically symmetric. */
  hasSymmetryAxis: boolean;
  hasSymmetryPoint: boolean;
  /** mm, about the requested `gyration_axis`. Present only when that input was given. */
  radiusOfGyration?: number;
  /** mm^3. Included because mass is only as good as the density guess; volume is not. */
  volume: number;
}

export interface GetMassPropertiesOutput {
  ok: boolean;
  massProperties?: MassPropertiesInfo;
  error?: string;
  errorCode?: string;
  /** Set when density was defaulted — mirrors export.urdf.inertia-density-declared. */
  warning?: string;
}

export async function getMassPropertiesTool(
  input: GetMassPropertiesInput,
): Promise<GetMassPropertiesOutput> {
  if (input.density !== undefined && !(input.density > 0)) {
    return {
      ok: false,
      error: `density must be a positive number (kg/m^3); got ${input.density}.`,
      errorCode: 'feature.invalid-args',
    };
  }

  const axis = input.gyration_axis;
  if (axis !== undefined) {
    const triple = (v: unknown): v is [number, number, number] =>
      Array.isArray(v) && v.length === 3 && v.every(n => typeof n === 'number' && Number.isFinite(n));
    if (!triple(axis.origin) || !triple(axis.direction)) {
      return {
        ok: false,
        error: 'gyration_axis requires { origin: [x,y,z], direction: [x,y,z] } of finite numbers.',
        errorCode: 'feature.invalid-args',
      };
    }
    if (Math.hypot(...axis.direction) === 0) {
      return {
        ok: false,
        error: 'gyration_axis.direction must be a non-zero vector; got [0, 0, 0].',
        errorCode: 'feature.invalid-args',
      };
    }
  }

  const script = await runMcpScript(input);
  if (!script.ok) return script;
  const { run } = script;

  if (run.records.length === 0) {
    return { ok: false, error: 'Script produced no features.' };
  }

  const tailId = run.records[run.records.length - 1].id;
  const targetId = input.feature_id ?? resolveRootId(run.returnValue, tailId)!;
  const targetRecord = run.records.find(r => r.id === targetId);
  if (!targetRecord) {
    return { ok: false, error: `feature_id '${targetId}' not found in script's features.` };
  }

  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const result = await engine.run(run.records, { paramTable: run.paramTable });
  const shape = result.shapes.get(targetId);
  if (!shape) {
    const fatal = result.diagnostics.find(d => d.featureId === targetId && d.severity === 'error');
    return {
      ok: false,
      error: fatal
        ? `Feature '${targetId}' did not lower successfully: ${fatal.message}`
        : `Feature '${targetId}' was not lowered.`,
      errorCode: fatal?.code,
    };
  }

  const densityDefaulted = input.density === undefined;
  const density = input.density ?? DEFAULT_DENSITY;
  const mp = shape.massProperties(density, input.gyration_axis);

  return {
    ok: true,
    massProperties: {
      id: targetId,
      mass: mp.mass,
      density,
      densityDefaulted,
      com: mp.com,
      inertia6: mp.inertia6,
      inertiaMatrix: mp.inertiaMatrix,
      principalMoments: mp.principalMoments,
      principalAxes: mp.principalAxes,
      hasSymmetryAxis: mp.hasSymmetryAxis,
      hasSymmetryPoint: mp.hasSymmetryPoint,
      ...(mp.radiusOfGyration !== undefined
        ? { radiusOfGyration: mp.radiusOfGyration }
        : {}),
      volume: shape.volume(),
    },
    ...(densityDefaulted
      ? {
          warning:
            'Mass computed with default density 1000 kg/m^3 (water). Pass `density` for a ' +
            'real number — steel 7850 (~8x), aluminium 2700 (~2.7x), ABS 1050.',
        }
      : {}),
  };
}
