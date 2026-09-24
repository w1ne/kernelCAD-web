// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * MCP: verify({ check: 'body-likeness' }) — practical publish gate for organic /
 * automotive bodies. Combines cheap AABB↔wheel checks with agent-supplied
 * ortho still verdicts. Full CV silhouette matching is OUT OF SCOPE this turn.
 */
import { getShapeInfoTool } from './getShapeInfo';
import {
  evaluateBodyLikeness,
  REQUIRED_AUTOMOTIVE_STILL_CODES,
  type BBox,
  type BodyLikenessResult,
  type LengthAxis,
  type StillVerdict,
  type Vec3,
  type WheelSpec,
} from '../../likeness/bodyLikeness';

export interface CheckBodyLikenessInput {
  /** Inline script — used with body_feature_id to resolve body AABB when body_bbox omitted. */
  code?: string;
  file?: string;
  /** FeatureId whose bbox is the body envelope. */
  body_feature_id?: string;
  /** Explicit body AABB (mm). Preferred when already known from inspect. */
  body_bbox?: BBox;
  /** Optional cabin / greenhouse AABB for automated cabin-aft. */
  cabin_bbox?: BBox;
  /** Wheel centres + tire radii (mm). */
  wheels?: WheelSpec[];
  /** Wheelbase / length direction. Default 'x'. */
  length_axis?: LengthAxis;
  /**
   * Agent still verdicts after render_preview / open_in_studio. Required unless
   * require_stills is false. Codes: side-body-over-wheels, side-cabin-aft,
   * rear-haunch, ortho-proportions-vs-reference.
   */
  still_verdicts?: StillVerdict[];
  /** Default true — missing/failed stills block publishReady. */
  require_stills?: boolean;
  footprint_margin_mm?: number;
  max_body_above_wheel_top_mm?: number;
  min_overhang_mm?: number;
}

export type CheckBodyLikenessOutput = BodyLikenessResult & {
  source: 'local';
  requiredStillCodes: readonly string[];
  /** What is automated vs agent-required — for honest PR / agent DX. */
  honesty: {
    automated: readonly string[];
    agentRequired: readonly string[];
    notImplemented: readonly string[];
  };
};

const HONESTY = {
  automated: [
    'wheels-under-body-footprint (wheel XY vs body AABB)',
    'body-over-wheels-z (rocker vs tire top)',
    'body-spans-wheelbase (overhang past axles)',
    'cabin-aft-auto (when cabin_bbox + ≥2 wheels)',
  ],
  agentRequired: [
    ...REQUIRED_AUTOMOTIVE_STILL_CODES.map(
      (c) => `${c} (agent still verdict after ortho PNG / Studio)`,
    ),
  ],
  notImplemented: [
    'Full CV silhouette IoU / SSIM vs referenceImage',
    'Automatic ortho PNG scoring without agent findings',
    'Hard block inside open_in_studio publish (agents must call this verify check first)',
  ],
};

/**
 * `verify({ check: 'body-likeness' })` handler.
 */
export async function checkBodyLikenessTool(
  input: CheckBodyLikenessInput,
): Promise<CheckBodyLikenessOutput> {
  const body = await resolveBodyBBox(input);
  if (!body.ok) {
    return {
      ok: false,
      publishReady: false,
      source: 'local',
      checks: [{ code: 'input', passed: false, automated: true, message: body.error }],
      diagnostics: [{
        code: 'reference.likeness.auto-failed',
        severity: 'error',
        message: body.error,
        hint: 'Pass body_bbox: { min, max } or { code|file, body_feature_id } so the body AABB can be read.',
      }],
      summary: `Body likeness gate FAILED: ${body.error}`,
      requiredStillCodes: REQUIRED_AUTOMOTIVE_STILL_CODES,
      honesty: { ...HONESTY },
    };
  }

  const result = evaluateBodyLikeness({
    body: body.bbox,
    cabin: input.cabin_bbox,
    wheels: input.wheels,
    lengthAxis: input.length_axis,
    stillVerdicts: input.still_verdicts,
    requireStills: input.require_stills,
    footprintMarginMm: input.footprint_margin_mm,
    maxBodyAboveWheelTopMm: input.max_body_above_wheel_top_mm,
    minOverhangMm: input.min_overhang_mm,
  });

  return {
    ...result,
    source: 'local',
    requiredStillCodes: REQUIRED_AUTOMOTIVE_STILL_CODES,
    honesty: { ...HONESTY },
  };
}

async function resolveBodyBBox(
  input: CheckBodyLikenessInput,
): Promise<{ ok: true; bbox: BBox } | { ok: false; error: string }> {
  if (input.body_bbox) {
    return { ok: true, bbox: input.body_bbox };
  }
  if (!input.code && !input.file) {
    return {
      ok: false,
      error: 'body-likeness: pass body_bbox or { code|file, body_feature_id }.',
    };
  }
  const info = await getShapeInfoTool({
    code: input.code,
    file: input.file,
    feature_id: input.body_feature_id,
  });
  if (!info.ok || !info.shape) {
    return {
      ok: false,
      error: info.error ?? 'body-likeness: could not resolve body shape bbox.',
    };
  }
  return { ok: true, bbox: info.shape.bbox };
}

/** Re-export for tests / skill docs. */
export { REQUIRED_AUTOMOTIVE_STILL_CODES };
export type { BBox, StillVerdict, Vec3, WheelSpec };
