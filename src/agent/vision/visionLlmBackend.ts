// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/vision/visionLlmBackend.ts
//
// Vision-LLM backend for the `trace_from_image` tool. Builds the prompt,
// dispatches it through an `AnthropicVisionClient`-shaped client, parses and
// validates the JSON response, retries once on malformed JSON, and returns
// `TraceFeatureResult[]`.
//
// Design rules:
// - **Prompt template lives here, not in a skill.** Prompt-text drift across
//   markdown is harder to test; the JSON schema is best validated alongside
//   the parser that consumes it. The matching skill MD instructs WHEN to call
//   `trace_from_image`, not HOW the prompt is built.
// - **One retry on malformed JSON, then throw.** Cost-bounded — never loops.
// - **Truncate, don't reject, when the LLM overshoots maxWaypointsPerFeature.**
//   The agent capped this for a reason; preserving the prefix gives a usable
//   polyline even if the model ignored the cap.
// - **Out-of-range coords are a hard fail** — if the model returns
//   `[1.4, 0.2]` we cannot silently clamp because the agent has no way to know
//   what part of the image fell off the edge. Surface the error.

import type {
  AnthropicVisionClient,
  VisionMediaType,
  VisionRequest,
  VisionResponse,
} from './anthropicVisionClient';
import type {
  TraceFeatureKind,
  TraceFeatureRequest,
  TraceFeatureResult,
  Vec2Normalized,
} from './types';

/** Minimal client surface used here — accepts the real client or a test mock. */
export interface VisionLlmClient {
  generate(req: VisionRequest): Promise<VisionResponse>;
}

export interface BuildVisionPromptArgs {
  features: TraceFeatureRequest[];
  maxWaypointsPerFeature: number;
  hint?: string;
}

const VALID_KINDS: TraceFeatureKind[] = ['silhouette', 'curve', 'point', 'bbox'];

/**
 * Build the prompt string sent to the vision LLM. Lists every requested
 * feature, the JSON schema the model must obey, the coord convention, and the
 * waypoint cap.
 */
export function buildVisionPrompt(args: BuildVisionPromptArgs): string {
  const { features, maxWaypointsPerFeature, hint } = args;

  const featureLines = features.map((f, i) => {
    const region = f.region ? ` (region: ${f.region})` : '';
    return `  ${i + 1}. label="${f.label}", kind="${f.kind}"${region}`;
  });

  const hintLine = hint
    ? `\nAdditional context from the caller:\n${hint}\n`
    : '';

  return [
    `You are a precise computer-vision annotator. Extract pixel-space waypoints from the reference image and return them as normalized [0, 1] coordinates with the top-left corner at (0, 0) and the bottom-right corner at (1, 1).`,
    '',
    `Features requested (${features.length}):`,
    ...featureLines,
    '',
    `Constraints:`,
    `- All x and y values must be finite numbers in the closed interval [0, 1].`,
    `- For kind="silhouette" or "curve", return at most ${maxWaypointsPerFeature} waypoints traversed in counter-clockwise order, starting at the topmost-leftmost vertex. Anchor-to-anchor for an open curve.`,
    `- For kind="point", return exactly 1 waypoint.`,
    `- For kind="bbox", return exactly 2 waypoints: top-left then bottom-right.`,
    `- Echo the requested label and kind verbatim for each feature.`,
    `- Provide an honest confidence score in [0, 1]: 0.9+ for clean unoccluded outlines, 0.6-0.8 for typical/partial views, 0.5 or below if occluded or ambiguous.`,
    hintLine,
    `Return ONLY a single JSON object (no prose, no markdown fence) with this exact shape:`,
    `{`,
    `  "features": [`,
    `    {`,
    `      "label": "<echoed label>",`,
    `      "kind": "silhouette" | "curve" | "point" | "bbox",`,
    `      "waypoints": [[x, y], [x, y], ...],`,
    `      "confidence": 0.0`,
    `    }`,
    `  ]`,
    `}`,
  ].join('\n');
}

/**
 * Extract `TraceFeatureResult[]` from the image via one LLM call (retry once
 * on malformed JSON). Throws if the second attempt is also malformed, or if
 * any waypoint is out of `[0, 1]`.
 */
export async function extractFeaturesViaLLM(
  client: VisionLlmClient,
  imageBytes: Uint8Array,
  mediaType: VisionMediaType,
  features: TraceFeatureRequest[],
  hint: string | undefined,
  maxWaypointsPerFeature: number,
): Promise<TraceFeatureResult[]> {
  const prompt = buildVisionPrompt({ features, maxWaypointsPerFeature, hint });

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const resp = await client.generate({ prompt, imageBytes, mediaType });
    try {
      return parseAndValidate(resp.text, features, maxWaypointsPerFeature);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      // Only retry on JSON shape failures — out-of-range is a hard fail.
      if (lastErr.message.startsWith('OUT_OF_RANGE:')) {
        throw new Error(
          `visionLlmBackend: waypoint out of [0,1] range: ${lastErr.message.slice('OUT_OF_RANGE:'.length).trim()}`,
        );
      }
    }
  }
  throw new Error(
    `visionLlmBackend: malformed JSON after retry (${lastErr?.message ?? 'unknown'})`,
  );
}

/** @internal — exported for the test seam. */
export function parseAndValidate(
  text: string,
  features: TraceFeatureRequest[],
  maxWaypointsPerFeature: number,
): TraceFeatureResult[] {
  const stripped = stripCodeFences(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch (err) {
    throw new Error(
      `visionLlmBackend: cannot parse JSON (${err instanceof Error ? err.message : String(err)})`,
    );
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !Array.isArray((parsed as { features?: unknown }).features)
  ) {
    throw new Error(
      'visionLlmBackend: response JSON missing "features" array',
    );
  }
  const rawFeatures = (parsed as { features: unknown[] }).features;

  // Index requested features by label for cross-validation.
  const requestedByLabel = new Map<string, TraceFeatureRequest>();
  for (const f of features) {
    requestedByLabel.set(f.label, f);
  }

  const out: TraceFeatureResult[] = [];
  for (const rf of rawFeatures) {
    if (!rf || typeof rf !== 'object') {
      throw new Error('visionLlmBackend: feature entry is not an object');
    }
    const r = rf as {
      label?: unknown;
      kind?: unknown;
      waypoints?: unknown;
      confidence?: unknown;
    };
    if (typeof r.label !== 'string' || r.label.length === 0) {
      throw new Error('visionLlmBackend: feature missing string label');
    }
    if (!requestedByLabel.has(r.label)) {
      throw new Error(
        `visionLlmBackend: feature label "${r.label}" was not requested`,
      );
    }
    if (typeof r.kind !== 'string' || !VALID_KINDS.includes(r.kind as TraceFeatureKind)) {
      throw new Error(
        `visionLlmBackend: feature "${r.label}" has invalid kind "${String(r.kind)}"`,
      );
    }
    if (!Array.isArray(r.waypoints)) {
      throw new Error(
        `visionLlmBackend: feature "${r.label}" missing waypoints array`,
      );
    }

    const validatedWaypoints: Vec2Normalized[] = [];
    for (const wp of r.waypoints as unknown[]) {
      if (!Array.isArray(wp) || wp.length !== 2) {
        throw new Error(
          `visionLlmBackend: feature "${r.label}" waypoint is not a 2-tuple`,
        );
      }
      const x = wp[0];
      const y = wp[1];
      if (
        typeof x !== 'number' ||
        typeof y !== 'number' ||
        !Number.isFinite(x) ||
        !Number.isFinite(y)
      ) {
        throw new Error(
          `visionLlmBackend: feature "${r.label}" waypoint has non-finite coordinate`,
        );
      }
      if (x < 0 || x > 1 || y < 0 || y > 1) {
        // Out-of-range is a hard fail — do NOT silently clamp.
        throw new Error(
          `OUT_OF_RANGE: feature "${r.label}" waypoint [${x}, ${y}]`,
        );
      }
      validatedWaypoints.push([x, y]);
    }

    // Truncate (don't reject) when LLM overshoots the cap. Preserve prefix.
    const truncated =
      validatedWaypoints.length > maxWaypointsPerFeature
        ? validatedWaypoints.slice(0, maxWaypointsPerFeature)
        : validatedWaypoints;

    const rawConf = r.confidence;
    let confidence = 0.5;
    if (typeof rawConf === 'number' && Number.isFinite(rawConf)) {
      confidence = Math.max(0, Math.min(1, rawConf));
    }

    out.push({
      label: r.label,
      kind: r.kind as TraceFeatureKind,
      waypoints: truncated,
      confidence,
      backend: 'vision-llm',
    });
  }

  return out;
}

/**
 * Remove stray markdown code fences (` ```json … ``` ` or ` ``` … ``` `) the
 * model might wrap around the JSON. Tolerant — leaves bare JSON untouched.
 */
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  // Match an opening fence with optional language tag, then the body, then
  // an optional closing fence. We do NOT want a greedy regex — handle as
  // string ops to stay simple.
  if (trimmed.startsWith('```')) {
    const firstNewline = trimmed.indexOf('\n');
    if (firstNewline >= 0) {
      const body = trimmed.slice(firstNewline + 1);
      const closeIdx = body.lastIndexOf('```');
      return (closeIdx >= 0 ? body.slice(0, closeIdx) : body).trim();
    }
  }
  return trimmed;
}

// Type-only re-export so callers can pass the production client to the same
// surface as the test mock.
export type { AnthropicVisionClient };
