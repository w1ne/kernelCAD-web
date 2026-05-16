import type { FeatureKind } from '../../src/shared/intent/types';

export interface FeatureSpec {
  id: string;
  kind: FeatureKind;
}

export interface FeatureTimeline {
  startAtMs: number;
  durationMs: number;
  pauseMsAfter: number;
  cameraNudgeMs: number;
}

export interface PacingOverride {
  features?: Record<string, { pauseMsAfterOverride?: number; transitionMsOverride?: number }>;
  rotateMsOverride?: number;
  preRollMsOverride?: number;
}

export interface Pacing {
  features: Map<string, FeatureTimeline>;
  preRollMs: number;
  rotateStartMs: number;
  rotateDurationMs: number;
  totalDurationMs: number;
  truncated: boolean;
}

const DEFAULT_PAUSE_MS = 800;
const COMPRESSED_PAUSE_MS = 200;
const DEFAULT_NUDGE_MS = 300;
const COMPRESSED_NUDGE_MS = 100;
const DEFAULT_ROTATE_MS = 8000;
const SHORT_BUILD_ROTATE_MS = 12000;
const TITLE_CARD_MS = 2000;
const HARD_CAP_MS = 30000;
const SHORT_BUILD_THRESHOLD_MS = 4000;
const BUFFER_MS = 2000;

export function transitionMsForKind(kind: FeatureKind): number {
  switch (kind) {
    case 'box': case 'cylinder': case 'sphere': case 'torus':
    case 'extrude': case 'revolve': case 'loft': case 'sweep':
    case 'importedMesh': case 'importedStep':
      return 500;
    case 'boolean': case 'hole': case 'cut':
      return 600;
    case 'fillet': case 'chamfer': case 'shell': case 'draft':
      return 400;
    case 'mirror':
      return 500;
    case 'sketch': case 'constrainedSketch':
      return 400;
    default:
      return 400;
  }
}

export function computeTimeline(
  features: readonly FeatureSpec[],
  override: PacingOverride,
): Pacing {
  const buildOne = (
    pauseMs: number,
    nudgeMs: number,
    list: readonly FeatureSpec[],
  ): { features: Map<string, FeatureTimeline>; buildEndMs: number } => {
    const map = new Map<string, FeatureTimeline>();
    let cursor = 0;
    for (const f of list) {
      const featOverride = override.features?.[f.id];
      const transitionMs = featOverride?.transitionMsOverride ?? transitionMsForKind(f.kind);
      const featPauseMs = featOverride?.pauseMsAfterOverride ?? pauseMs;
      map.set(f.id, {
        startAtMs: cursor,
        durationMs: transitionMs,
        pauseMsAfter: featPauseMs,
        cameraNudgeMs: nudgeMs,
      });
      cursor += transitionMs + featPauseMs + nudgeMs;
    }
    return { features: map, buildEndMs: cursor };
  };

  const rotateMs = override.rotateMsOverride ?? DEFAULT_ROTATE_MS;

  // Try default pacing.
  let result = buildOne(DEFAULT_PAUSE_MS, DEFAULT_NUDGE_MS, features);
  let preRollMs = override.preRollMsOverride ?? 0;
  let activeRotateMs = rotateMs;

  // Short build → extend rotate + add title card.
  if (result.buildEndMs < SHORT_BUILD_THRESHOLD_MS) {
    activeRotateMs = override.rotateMsOverride ?? SHORT_BUILD_ROTATE_MS;
    preRollMs = override.preRollMsOverride ?? TITLE_CARD_MS;
  }

  let truncated = false;
  let totalMs = preRollMs + result.buildEndMs + activeRotateMs + BUFFER_MS;

  // Long build → compress pauses then nudges.
  if (totalMs > HARD_CAP_MS) {
    result = buildOne(COMPRESSED_PAUSE_MS, DEFAULT_NUDGE_MS, features);
    totalMs = preRollMs + result.buildEndMs + activeRotateMs + BUFFER_MS;
  }
  if (totalMs > HARD_CAP_MS) {
    result = buildOne(COMPRESSED_PAUSE_MS, COMPRESSED_NUDGE_MS, features);
    totalMs = preRollMs + result.buildEndMs + activeRotateMs + BUFFER_MS;
  }
  if (totalMs > HARD_CAP_MS) {
    // Truncate: keep first N features that fit.
    const keep: FeatureSpec[] = [];
    let cursor = 0;
    for (const f of features) {
      const transitionMs = transitionMsForKind(f.kind);
      const next = cursor + transitionMs + COMPRESSED_PAUSE_MS + COMPRESSED_NUDGE_MS;
      if (preRollMs + next + activeRotateMs + BUFFER_MS > HARD_CAP_MS) break;
      keep.push(f);
      cursor = next;
    }
    result = buildOne(COMPRESSED_PAUSE_MS, COMPRESSED_NUDGE_MS, keep);
    totalMs = preRollMs + result.buildEndMs + activeRotateMs + BUFFER_MS;
    truncated = keep.length < features.length;
  }

  return {
    features: result.features,
    preRollMs,
    rotateStartMs: preRollMs + result.buildEndMs,
    rotateDurationMs: activeRotateMs,
    totalDurationMs: totalMs,
    truncated,
  };
}
