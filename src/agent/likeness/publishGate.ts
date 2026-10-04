// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Hard publish gate for organic / automotive bodies on the ChatGPT MCP path.
 *
 * When likeness is required (explicit profile or source heuristics), agents
 * must not claim open_in_studio / design_loop success unless
 * evaluateBodyLikeness reports publishReady. See docs/agent/adam-quality-bar.md.
 */
import {
  evaluateBodyLikeness,
  type BodyLikenessInput,
  type BodyLikenessResult,
  type BBox,
  type StillVerdict,
  type WheelSpec,
} from './bodyLikeness';

/** DX: open_in_studio / success claim refused because likeness is not green. */
export const LIKENESS_PUBLISH_BLOCKED = 'reference.likeness.publish-blocked';
/** DX: likenessProfile set but body-likeness fields were not supplied. */
export const LIKENESS_GATE_REQUIRED = 'reference.likeness.gate-required';

export type LikenessProfile = 'automotive';

export interface LikenessPublishGateInput extends Omit<BodyLikenessInput, 'body'> {
  /** Body AABB — required when the gate must evaluate (fail closed if missing). */
  body?: BBox;
  /** Explicit profile from open_in_studio / design_loop. */
  likenessProfile?: LikenessProfile;
  /** Source text — used only for require-detection heuristics when profile omitted. */
  source?: string;
}

export interface LikenessPublishGateResult {
  /** True when likeness is required for a success claim. */
  required: boolean;
  /** True when required && publishReady (or not required). */
  successClaimable: boolean;
  /** Mirror of evaluateBodyLikeness when evaluation ran. */
  likeness?: BodyLikenessResult;
  diagnostics: Array<{
    code: string;
    severity: 'error' | 'warn';
    message: string;
    hint?: string;
  }>;
  summary: string;
}

const AUTOMOTIVE_SOURCE_CUES = [
  /\bautomotive-body-envelope\b/i,
  /\bnetwork-body-panels-via-sew\b/i,
  /\bberlinetta\b/i,
  /\blikenessProfile\s*[:=]\s*['"]automotive['"]/i,
  /\breferenceImage\s*\([^)]*(?:car|vehicle|berlinetta|sports.?car)/i,
  /\b(?:organic\s+)?(?:car|vehicle)\s+body\b/i,
  /\bfairing\s+body\b/i,
];

/**
 * Heuristic: source looks like an organic / automotive body that must pass
 * body-likeness before a success claim. Pure string match — no OCCT.
 */
export function sourceRequiresAutomotiveLikeness(source: string | undefined): boolean {
  if (!source || source.trim() === '') return false;
  return AUTOMOTIVE_SOURCE_CUES.some((re) => re.test(source));
}

/** True when an explicit profile or source cues require the likeness gate. */
export function likenessGateRequired(
  likenessProfile?: LikenessProfile,
  source?: string,
): boolean {
  return likenessProfile === 'automotive' || sourceRequiresAutomotiveLikeness(source);
}

/**
 * Run the publish gate. When likeness is not required, returns
 * successClaimable:true without evaluating. When required but body AABB is
 * missing, fails closed with LIKENESS_GATE_REQUIRED (do not claim success).
 */
export function assertLikenessPublishReady(
  input: LikenessPublishGateInput,
): LikenessPublishGateResult {
  const required = likenessGateRequired(input.likenessProfile, input.source);
  if (!required) {
    return {
      required: false,
      successClaimable: true,
      diagnostics: [],
      summary: 'Likeness publish gate not required for this model.',
    };
  }

  if (!input.body) {
    return {
      required: true,
      successClaimable: false,
      diagnostics: [{
        code: LIKENESS_GATE_REQUIRED,
        severity: 'error',
        message:
          'likeness_profile/automotive requires body-likeness before a success claim, but body AABB was not supplied.',
        hint:
          'Call verify({ check: \'body-likeness\', body_bbox|code+body_feature_id, wheels, still_verdicts }) ' +
          'and re-open_in_studio with likeness_profile:\'automotive\' (or pass body_bbox/wheels/still_verdicts on open_in_studio). ' +
          'WIP previews may omit likeness_profile — never claim organic likeness success without it.',
      }],
      summary:
        'Body likeness gate REQUIRED but incomplete — do NOT claim open_in_studio / design_loop success.',
    };
  }

  const likeness = evaluateBodyLikeness({
    body: input.body,
    wheels: input.wheels,
    cabin: input.cabin,
    lengthAxis: input.lengthAxis,
    stillVerdicts: input.stillVerdicts,
    requireStills: input.requireStills,
    footprintMarginMm: input.footprintMarginMm,
    maxBodyAboveWheelTopMm: input.maxBodyAboveWheelTopMm,
    minOverhangMm: input.minOverhangMm,
  });

  if (likeness.publishReady) {
    return {
      required: true,
      successClaimable: true,
      likeness,
      diagnostics: [],
      summary: likeness.summary,
    };
  }

  return {
    required: true,
    successClaimable: false,
    likeness,
    diagnostics: [
      {
        code: LIKENESS_PUBLISH_BLOCKED,
        severity: 'error',
        message:
          'open_in_studio / success claim blocked: body-likeness is not publishReady.',
        hint:
          'Fix geometry or still verdicts, re-run verify({ check: \'body-likeness\' }), then retry. ' +
          'See docs/agent/adam-quality-bar.md.',
      },
      ...likeness.diagnostics,
    ],
    summary: `Publish blocked — ${likeness.summary}`,
  };
}

export type { BBox, StillVerdict, WheelSpec, BodyLikenessResult };
