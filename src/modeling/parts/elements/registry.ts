// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { invalidArgs } from '../../../shared/intent/invalidArgs';
import { aluminumExtrusionSolid, extrusionBracketSolid, extrusionTNutSolid } from './extrusionSolids';
import { ALUMINUM_EXTRUSIONS, EXTRUSION_BRACKETS, EXTRUSION_T_NUTS,
  resolveAluminumExtrusion, resolveExtrusionBracket, resolveExtrusionTNut } from './extrusions';
import { linearBearingSolid, leadscrewSolid } from './linearMotionSolids';
import { LEADSCREWS, LINEAR_BEARINGS, resolveLeadscrew, resolveLinearBearing } from './linearMotion';
import { linearCarriageSolid, linearRailSolid } from './linearRailSolids';
import { LINEAR_CARRIAGES, LINEAR_RAILS, resolveLinearCarriage, resolveLinearRail } from './linearRails';
import { leadscrewNutSolid, shaftCollarSolid, shaftCouplerSolid, shaftSupportSolid } from './shaftHardwareSolids';
import { LEADSCREW_NUTS, SHAFT_COLLARS, SHAFT_COUPLERS, SHAFT_SUPPORTS,
  resolveLeadscrewNut, resolveShaftCollar, resolveShaftCoupler, resolveShaftSupport } from './shaftHardware';
import { resolveTimingPulley, TIMING_PULLEYS, timingPulleySolid } from './timingPulleys';
import type { ElementFamilySpec, ElementRequest, ResolvedElement } from './types';

const SPECS: readonly ElementFamilySpec[] = [LINEAR_RAILS, LINEAR_CARRIAGES, ALUMINUM_EXTRUSIONS,
  EXTRUSION_BRACKETS, EXTRUSION_T_NUTS, LINEAR_BEARINGS, SHAFT_SUPPORTS, LEADSCREWS,
  LEADSCREW_NUTS, SHAFT_COLLARS, SHAFT_COUPLERS, TIMING_PULLEYS];

type Resolver = (request: ElementRequest) => ResolvedElement;
type SolidBuilder = (part: ResolvedElement) => import('../../../kernel/backends/occt/occtBackend').OcctBackend;

const RESOLVERS: Record<string, Resolver> = {
  'linear-rail': resolveLinearRail, 'linear-carriage': resolveLinearCarriage,
  'aluminum-extrusion': resolveAluminumExtrusion, 'extrusion-bracket': resolveExtrusionBracket,
  'extrusion-t-nut': resolveExtrusionTNut, 'linear-bearing': resolveLinearBearing,
  'shaft-support': resolveShaftSupport, leadscrew: resolveLeadscrew,
  'leadscrew-nut': resolveLeadscrewNut, 'shaft-collar': resolveShaftCollar,
  'shaft-coupler': resolveShaftCoupler, 'timing-pulley': resolveTimingPulley,
};

const SOLIDS: Record<string, SolidBuilder> = {
  'linear-rail': linearRailSolid, 'linear-carriage': linearCarriageSolid,
  'aluminum-extrusion': aluminumExtrusionSolid, 'extrusion-bracket': extrusionBracketSolid,
  'extrusion-t-nut': extrusionTNutSolid, 'linear-bearing': linearBearingSolid,
  'shaft-support': shaftSupportSolid, leadscrew: leadscrewSolid,
  'leadscrew-nut': leadscrewNutSolid, 'shaft-collar': shaftCollarSolid,
  'shaft-coupler': shaftCouplerSolid, 'timing-pulley': timingPulleySolid,
};

export type ElementCatalogSeedEntry = ElementRequest;

export function isElementFamily(family: string): boolean {
  return Object.hasOwn(RESOLVERS, family);
}

export function resolveElement(request: ElementRequest): ResolvedElement {
  const resolver = RESOLVERS[request.family];
  if (resolver !== undefined) return resolver(request);
  invalidArgs({ api: 'lib.part({ family, size, lengthMm })', path: 'family', got: request.family,
    requires: `one of: ${Object.keys(RESOLVERS).join(', ')}`,
    example: "lib.part({ family: 'linear-rail', size: 'MGN12', lengthMm: 300 })" });
}

export function elementSolid(part: ResolvedElement) {
  const builder = SOLIDS[part.family];
  if (builder === undefined) {
    invalidArgs({ api: 'elementSolid(resolved)', path: 'family', got: part.family,
      requires: 'a resolved element family', example: "lib.part({ family: 'linear-rail', size: 'MGN12' })" });
  }
  return builder(part);
}

export function listElementCatalogSeedEntries(): ElementCatalogSeedEntry[] {
  return [
    ...seedSizes('linear-rail', LINEAR_RAILS, 300), ...seedSizes('linear-carriage', LINEAR_CARRIAGES),
    ...seedSizes('aluminum-extrusion', ALUMINUM_EXTRUSIONS, 400),
    ...seedSizes('extrusion-bracket', EXTRUSION_BRACKETS), ...seedSizes('extrusion-t-nut', EXTRUSION_T_NUTS),
    ...seedSizes('linear-bearing', LINEAR_BEARINGS), ...seedSizes('shaft-support', SHAFT_SUPPORTS),
    ...seedSizes('leadscrew', LEADSCREWS, 300), ...seedSizes('leadscrew-nut', LEADSCREW_NUTS),
    ...seedSizes('shaft-collar', SHAFT_COLLARS), ...seedSizes('shaft-coupler', SHAFT_COUPLERS),
    ...seedSizes('timing-pulley', TIMING_PULLEYS),
  ];
}

function seedSizes(family: string, spec: ElementFamilySpec, lengthMm?: number): ElementCatalogSeedEntry[] {
  return Object.keys(spec.sizes).map((size) => ({ family, size, ...(lengthMm === undefined ? {} : { lengthMm }) }));
}

export function elementFamilySpecs(): readonly ElementFamilySpec[] {
  return SPECS;
}
