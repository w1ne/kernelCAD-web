// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { Vec3 } from '../../shared/intent/types';
import type { KernelCadApi } from '../api';
import type { Shape } from '../capture/proxy';
import { assertAllowedKeys, isFiniteNumber, vecDot } from './math';
import type { StructuralProfile } from './types';

const PROFILE_EXAMPLE =
  "structuralMember([0, 0, 0], [200, 0, 0], { profile: { kind: 'square-tube', size: 40, wall: 3 } })";

export interface ProfileMetrics {
  halfU: number;
  halfV: number;
  boundingRadius: number;
  area: number;
}

function assertPositive(
  value: unknown,
  path: string,
  apiName: string,
  featureId: string,
): number {
  if (!isFiniteNumber(value) || value <= 0) {
    invalidArgs({
      api: apiName,
      path,
      got: value,
      showType: typeof value !== 'number',
      requires: 'a finite positive number (> 0)',
      unit: 'mm',
      example: PROFILE_EXAMPLE,
      featureId,
    });
  }
  return value;
}

function assertWallBelowHalf(
  wall: number,
  span: number,
  spanName: string,
  path: string,
  apiName: string,
  featureId: string,
): void {
  if (!(2 * wall < span)) {
    invalidArgs({
      api: apiName,
      path,
      got: wall,
      requires: `wall < ${spanName} / 2 (${span / 2} mm) so the hollow cavity stays open`,
      unit: 'mm',
      example: PROFILE_EXAMPLE,
      featureId,
    });
  }
}

function assertThicknessBelowSpan(
  thickness: number,
  span: number,
  spanName: string,
  factor: 1 | 2,
  path: string,
  apiName: string,
  featureId: string,
): void {
  if (!(factor * thickness < span)) {
    invalidArgs({
      api: apiName,
      path,
      got: thickness,
      requires: factor === 2
        ? `thickness < ${spanName} / 2 (${span / 2} mm)`
        : `thickness < ${spanName} (${span} mm)`,
      unit: 'mm',
      example: PROFILE_EXAMPLE,
      featureId,
    });
  }
}

function validateSquareTube(
  raw: Record<string, unknown>,
  path: string,
  apiName: string,
  featureId: string,
): StructuralProfile {
  assertAllowedKeys(raw, new Set(['kind', 'size', 'wall']), {
    api: apiName, prefix: path, example: PROFILE_EXAMPLE, featureId,
  });
  const size = assertPositive(raw.size, `${path}.size`, apiName, featureId);
  const wall = assertPositive(raw.wall, `${path}.wall`, apiName, featureId);
  assertWallBelowHalf(wall, size, 'size', `${path}.wall`, apiName, featureId);
  return { kind: 'square-tube', size, wall };
}

function validateRectTube(
  raw: Record<string, unknown>,
  path: string,
  apiName: string,
  featureId: string,
): StructuralProfile {
  assertAllowedKeys(raw, new Set(['kind', 'width', 'height', 'wall']), {
    api: apiName, prefix: path, example: PROFILE_EXAMPLE, featureId,
  });
  const width = assertPositive(raw.width, `${path}.width`, apiName, featureId);
  const height = assertPositive(raw.height, `${path}.height`, apiName, featureId);
  const wall = assertPositive(raw.wall, `${path}.wall`, apiName, featureId);
  assertWallBelowHalf(wall, width, 'width', `${path}.wall`, apiName, featureId);
  assertWallBelowHalf(wall, height, 'height', `${path}.wall`, apiName, featureId);
  return { kind: 'rect-tube', width, height, wall };
}

function validateRoundTube(
  raw: Record<string, unknown>,
  path: string,
  apiName: string,
  featureId: string,
): StructuralProfile {
  assertAllowedKeys(raw, new Set(['kind', 'outerDiameter', 'wall']), {
    api: apiName, prefix: path, example: PROFILE_EXAMPLE, featureId,
  });
  const outerDiameter = assertPositive(raw.outerDiameter, `${path}.outerDiameter`, apiName, featureId);
  const wall = assertPositive(raw.wall, `${path}.wall`, apiName, featureId);
  assertWallBelowHalf(wall, outerDiameter, 'outerDiameter', `${path}.wall`, apiName, featureId);
  return { kind: 'round-tube', outerDiameter, wall };
}

function validateAngle(
  raw: Record<string, unknown>,
  path: string,
  apiName: string,
  featureId: string,
): StructuralProfile {
  assertAllowedKeys(raw, new Set(['kind', 'legA', 'legB', 'thickness']), {
    api: apiName, prefix: path, example: PROFILE_EXAMPLE, featureId,
  });
  const legA = assertPositive(raw.legA, `${path}.legA`, apiName, featureId);
  const legB = assertPositive(raw.legB, `${path}.legB`, apiName, featureId);
  const thickness = assertPositive(raw.thickness, `${path}.thickness`, apiName, featureId);
  assertThicknessBelowSpan(thickness, legA, 'legA', 1, `${path}.thickness`, apiName, featureId);
  assertThicknessBelowSpan(thickness, legB, 'legB', 1, `${path}.thickness`, apiName, featureId);
  return { kind: 'angle', legA, legB, thickness };
}

function validateCChannel(
  raw: Record<string, unknown>,
  path: string,
  apiName: string,
  featureId: string,
): StructuralProfile {
  assertAllowedKeys(raw, new Set(['kind', 'width', 'height', 'thickness']), {
    api: apiName, prefix: path, example: PROFILE_EXAMPLE, featureId,
  });
  const width = assertPositive(raw.width, `${path}.width`, apiName, featureId);
  const height = assertPositive(raw.height, `${path}.height`, apiName, featureId);
  const thickness = assertPositive(raw.thickness, `${path}.thickness`, apiName, featureId);
  assertThicknessBelowSpan(thickness, width, 'width', 1, `${path}.thickness`, apiName, featureId);
  assertThicknessBelowSpan(thickness, height, 'height', 2, `${path}.thickness`, apiName, featureId);
  return { kind: 'c-channel', width, height, thickness };
}

function validateFlatBar(
  raw: Record<string, unknown>,
  path: string,
  apiName: string,
  featureId: string,
): StructuralProfile {
  assertAllowedKeys(raw, new Set(['kind', 'width', 'thickness']), {
    api: apiName, prefix: path, example: PROFILE_EXAMPLE, featureId,
  });
  const width = assertPositive(raw.width, `${path}.width`, apiName, featureId);
  const thickness = assertPositive(raw.thickness, `${path}.thickness`, apiName, featureId);
  return { kind: 'flat-bar', width, thickness };
}

export function validateProfile(
  profile: unknown,
  path: string,
  apiName: string,
  featureId: string,
): StructuralProfile {
  if (typeof profile !== 'object' || profile === null || Array.isArray(profile)) {
    invalidArgs({
      api: apiName,
      path,
      got: profile,
      showType: true,
      requires: "a profile descriptor object with kind: 'square-tube' | 'rect-tube' | 'round-tube' | 'angle' | 'c-channel' | 'flat-bar'",
      example: PROFILE_EXAMPLE,
      featureId,
    });
  }
  const raw = profile as Record<string, unknown>;
  switch (raw.kind) {
    case 'square-tube': return validateSquareTube(raw, path, apiName, featureId);
    case 'rect-tube': return validateRectTube(raw, path, apiName, featureId);
    case 'round-tube': return validateRoundTube(raw, path, apiName, featureId);
    case 'angle': return validateAngle(raw, path, apiName, featureId);
    case 'c-channel': return validateCChannel(raw, path, apiName, featureId);
    case 'flat-bar': return validateFlatBar(raw, path, apiName, featureId);
    default:
      invalidArgs({
        api: apiName,
        path: `${path}.kind`,
        got: raw.kind,
        showType: true,
        requires: "one of 'square-tube', 'rect-tube', 'round-tube', 'angle', 'c-channel', 'flat-bar'",
        example: PROFILE_EXAMPLE,
        featureId,
      });
  }
}

export function profileMetrics(profile: StructuralProfile): ProfileMetrics {
  switch (profile.kind) {
    case 'square-tube': {
      const inner = profile.size - 2 * profile.wall;
      const half = profile.size / 2;
      return {
        halfU: half,
        halfV: half,
        boundingRadius: Math.hypot(half, half),
        area: profile.size * profile.size - inner * inner,
      };
    }
    case 'rect-tube': {
      const iw = profile.width - 2 * profile.wall;
      const ih = profile.height - 2 * profile.wall;
      const halfU = profile.width / 2;
      const halfV = profile.height / 2;
      return {
        halfU,
        halfV,
        boundingRadius: Math.hypot(halfU, halfV),
        area: profile.width * profile.height - iw * ih,
      };
    }
    case 'round-tube': {
      const outerR = profile.outerDiameter / 2;
      const innerR = outerR - profile.wall;
      return {
        halfU: outerR,
        halfV: outerR,
        boundingRadius: outerR,
        area: Math.PI * (outerR * outerR - innerR * innerR),
      };
    }
    case 'angle': {
      const halfU = profile.legA / 2;
      const halfV = profile.legB / 2;
      return {
        halfU,
        halfV,
        boundingRadius: Math.hypot(halfU, halfV),
        area: profile.thickness * (profile.legA + profile.legB - profile.thickness),
      };
    }
    case 'c-channel': {
      const halfU = profile.width / 2;
      const halfV = profile.height / 2;
      const innerArea = (profile.width - profile.thickness) * (profile.height - 2 * profile.thickness);
      return {
        halfU,
        halfV,
        boundingRadius: Math.hypot(halfU, halfV),
        area: profile.width * profile.height - innerArea,
      };
    }
    case 'flat-bar': {
      const halfU = profile.width / 2;
      const halfV = profile.thickness / 2;
      return {
        halfU,
        halfV,
        boundingRadius: Math.hypot(halfU, halfV),
        area: profile.width * profile.thickness,
      };
    }
  }
}

/**
 * Maximum projection of the profile cross-section along unit world vector `dir`
 * within the member's cross-section plane `(u, v)`.
 */
export function profileSupportDistance(
  profile: StructuralProfile,
  u: Vec3,
  v: Vec3,
  dir: Vec3,
): number {
  const du = vecDot(dir, u);
  const dv = vecDot(dir, v);
  if (profile.kind === 'round-tube') {
    return (profile.outerDiameter / 2) * Math.hypot(du, dv);
  }
  const { halfU, halfV } = profileMetrics(profile);
  return halfU * Math.abs(du) + halfV * Math.abs(dv);
}

/**
 * Extrude `profile` in local space along +Z from `z = 0` to `z = length`,
 * centered on `(0, 0)` in XY (`u = +X`, `v = +Y`).
 */
export function buildProfileSolid(
  api: KernelCadApi,
  profile: StructuralProfile,
  length: number,
): Shape {
  switch (profile.kind) {
    case 'square-tube': {
      const inner = profile.size - 2 * profile.wall;
      const outer = api.box(profile.size, profile.size, length, true).translate(0, 0, length / 2);
      const bore = api.box(inner, inner, length + 2, true).translate(0, 0, length / 2);
      return outer.subtract(bore);
    }
    case 'rect-tube': {
      const iw = profile.width - 2 * profile.wall;
      const ih = profile.height - 2 * profile.wall;
      const outer = api.box(profile.width, profile.height, length, true).translate(0, 0, length / 2);
      const bore = api.box(iw, ih, length + 2, true).translate(0, 0, length / 2);
      return outer.subtract(bore);
    }
    case 'round-tube': {
      const outerR = profile.outerDiameter / 2;
      const innerR = outerR - profile.wall;
      const outer = api.cylinder(length, outerR);
      const bore = api.cylinder(length + 2, innerR).translate(0, 0, -1);
      return outer.subtract(bore);
    }
    case 'angle': {
      const x0 = -profile.legA / 2;
      const x1 = profile.legA / 2;
      const y0 = -profile.legB / 2;
      const y1 = profile.legB / 2;
      const t = profile.thickness;
      return api.extrudePolygon(
        [[x0, y0], [x1, y0], [x1, y0 + t], [x0 + t, y0 + t], [x0 + t, y1], [x0, y1]],
        length,
      );
    }
    case 'c-channel': {
      const x0 = -profile.width / 2;
      const x1 = profile.width / 2;
      const y0 = -profile.height / 2;
      const y1 = profile.height / 2;
      const t = profile.thickness;
      return api.extrudePolygon(
        [
          [x0, y0], [x1, y0], [x1, y0 + t], [x0 + t, y0 + t],
          [x0 + t, y1 - t], [x1, y1 - t], [x1, y1], [x0, y1],
        ],
        length,
      );
    }
    case 'flat-bar':
      return api.box(profile.width, profile.thickness, length, true).translate(0, 0, length / 2);
  }
}
