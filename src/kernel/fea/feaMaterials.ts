// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/fea/feaMaterials.ts
//
// Material table for the linear-static FEA path: Young's modulus, Poisson's
// ratio, and tensile yield, in SOLVER UNITS (mm / N / MPa) so the numbers go
// straight into the CalculiX `*ELASTIC` card with no conversion step that
// could silently drop a factor of 1e6.
//
// Grade names, their aliases, E / yield and Poisson's ratio all come from the
// single material registry (`src/kinematic/engineeringMaterials.ts`) that mass
// properties, finishes and the beam check also resolve through — so a part
// declared `aluminum-6061` weighs, renders and solves as the same material.
// This module only converts units (Pa -> MPa) for the solver.
//
// Accepted names are the grades (`mild-steel`, `aluminum-6061`, `pla`, `petg`,
// `abs`, `nylon`) and the registry's bulk aliases (`steel` -> mild-steel,
// `aluminum`/`aluminium` -> aluminum-6061, `pet` -> petg). The resolved
// `name` is always the canonical grade.
//
// A name outside the registry is NOT guessed: `resolveFeaMaterial` returns a
// structured failure naming the valid grades, and the caller turns that into
// a `feature.invalid-args` throw at capture time. Agents with measured
// properties pass explicit `{ E, nu, yield }` instead.

import {
  ACCEPTED_MATERIAL_NAMES,
  ENGINEERING_MATERIAL_NAMES,
  canonicalMaterialName,
  engineeringMaterialProps,
  poissonRatio,
  type EngineeringMaterialName,
} from '../../shared/materials/engineeringMaterials';
import { isFeaMaterialProps, type FeaMaterialProps } from '../../shared/intent/feaStudyRecord';

/** Every canonical grade name the FEA path accepts, in table order. Aliases
 *  are accepted too (see `ACCEPTED_MATERIAL_NAMES`) but not listed here, so
 *  the table dump has one row per material. */
export const FEA_MATERIAL_NAMES: readonly string[] = [...ENGINEERING_MATERIAL_NAMES];

export type ResolveFeaMaterialResult =
  | { readonly ok: true; readonly props: FeaMaterialProps; readonly name: string }
  | { readonly ok: false; readonly message: string; readonly hint: string };

/** Expand one grade into solver-unit props (Pa -> MPa). */
function propsFor(name: EngineeringMaterialName): FeaMaterialProps {
  const row = engineeringMaterialProps(name);
  return {
    E: row.youngsModulusPa / 1e6,
    nu: poissonRatio(name),
    yield: row.yieldStressPa / 1e6,
  };
}

/** Numeric props for every named grade — the agent-facing table dump used by
 *  the `kernelcad-fea` skill and `fea_summary`. */
export function feaMaterialTable(): Record<string, FeaMaterialProps> {
  const out: Record<string, FeaMaterialProps> = {};
  for (const name of ENGINEERING_MATERIAL_NAMES) out[name] = propsFor(name);
  return out;
}

function badProps(props: FeaMaterialProps): string | undefined {
  if (!(Number.isFinite(props.E) && props.E > 0)) return `E must be a positive finite number of MPa; got ${props.E}`;
  if (!(Number.isFinite(props.nu) && props.nu > -1 && props.nu < 0.5)) {
    return `nu must be a finite Poisson's ratio in (-1, 0.5); got ${props.nu}`;
  }
  if (!(Number.isFinite(props.yield) && props.yield > 0)) {
    return `yield must be a positive finite number of MPa; got ${props.yield}`;
  }
  return undefined;
}

/**
 * Resolve a study's `material` field to solver-unit props.
 *
 * Accepts a grade NAME from the table above, or explicit
 * `{ E, nu, yield }` (MPa / dimensionless / MPa) for a measured lot or a
 * grade the table does not carry. Never falls back to a default material —
 * an unknown name returns a failure naming every valid grade.
 */
export function resolveFeaMaterial(material: unknown): ResolveFeaMaterialResult {
  if (isFeaMaterialProps(material)) {
    const why = badProps(material);
    if (why !== undefined) {
      return {
        ok: false,
        message: `feaStudy: explicit material props are invalid — ${why}.`,
        hint: 'invalid-args.fea-study.material — pass { E, nu, yield } in MPa / dimensionless / MPa, or a named grade.',
      };
    }
    return { ok: true, props: { ...material }, name: 'custom' };
  }
  if (typeof material !== 'string' || material.length === 0) {
    return {
      ok: false,
      message:
        `feaStudy: material must be a grade name or { E, nu, yield }; got ${JSON.stringify(material)}. ` +
        `Valid grades: ${ACCEPTED_MATERIAL_NAMES.join(', ')}.`,
      hint: 'invalid-args.fea-study.material — pass one of the named grades, or explicit { E, nu, yield } in MPa.',
    };
  }
  const grade = canonicalMaterialName(material);
  if (grade === undefined) {
    return {
      ok: false,
      message:
        `feaStudy: '${material}' is not a known FEA material grade. ` +
        `Valid grades: ${ACCEPTED_MATERIAL_NAMES.join(', ')}.`,
      hint: 'invalid-args.fea-study.material — pass one of the named grades, or explicit { E, nu, yield } in MPa if you have measured properties.',
    };
  }
  return { ok: true, props: propsFor(grade), name: grade };
}
