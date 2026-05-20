// src/agent/vision/types.ts
//
// Public I/O types for the `trace_from_image` photo-to-sketch trace tool.
// Spec: kernelCAD-private/docs/specs/2026-05-20-agent-vision-pipeline-design.md §3.
// Plan: kernelCAD-private/docs/plans/2026-05-20-agent-vision-trace-from-image.md.
//
// The tool converts pixel-space features from a reference photo into normalized
// `[0..1]` waypoints the agent can map to mm via a scale anchor and feed to
// `path().spline()`. Three backends (opencv / vision-llm / hybrid) are dispatched
// behind a single orchestrator entry point — `traceFromImage()` in `./index.ts`.

import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';

/** Default cap on waypoints emitted per requested feature. */
export const DEFAULT_MAX_WAYPOINTS_PER_FEATURE = 12;

/** A 2D coordinate normalized to `[0..1]` with top-left origin. */
export type Vec2Normalized = [number, number];

/**
 * Which backend handled (or should handle) a given feature.
 *
 * - `'opencv'`: pure-JS findContours on a uniform-bg silhouette mask. Cheap,
 *   deterministic, no API spend; cannot label named features.
 * - `'vision-llm'`: Anthropic vision API returns JSON. Handles named points,
 *   cluttered backgrounds, occluded outlines. Has API spend.
 * - `'hybrid'`: opencv supplies the silhouette polyline; vision-llm labels
 *   named points on top.
 * - `'auto'`: router picks one of the above per-image — used only as input.
 */
export type TraceBackend = 'opencv' | 'vision-llm' | 'hybrid' | 'auto';

/** Kind of feature the agent is asking for. */
export type TraceFeatureKind = 'silhouette' | 'curve' | 'point' | 'bbox';

/** A single requested feature in the input payload. */
export interface TraceFeatureRequest {
  /** Caller-chosen identifier (e.g. `frame_brow_top`). Echoed in the response. */
  label: string;
  /** Geometric shape the caller expects. */
  kind: TraceFeatureKind;
  /**
   * Optional free-text region hint (e.g. `'upper-left quadrant'`). Forwarded
   * to vision-LLM backends as part of the prompt; ignored by opencv.
   */
  region?: string;
}

/** A single returned feature in the response payload. */
export interface TraceFeatureResult {
  /** Echoes the request's `label`. */
  label: string;
  /** Echoes the request's `kind`. */
  kind: TraceFeatureKind;
  /**
   * Extracted waypoints, normalized to `[0..1]` with image top-left at
   * `(0, 0)` and bottom-right at `(1, 1)`. For `kind === 'point'` the array
   * length is 1; for silhouettes/curves it is up to `maxWaypointsPerFeature`;
   * for `kind === 'bbox'` length is 2 (top-left, bottom-right).
   */
  waypoints: Vec2Normalized[];
  /**
   * Backend-reported confidence in `[0..1]`. opencv backend returns `1.0`
   * for any contour it extracts; vision-LLM returns the model's self-report.
   */
  confidence: number;
  /** Which backend actually produced this feature (never `'auto'`). */
  backend: Exclude<TraceBackend, 'auto'>;
}

/** Input to the top-level `traceFromImage()` orchestrator (and the MCP tool). */
export interface TraceFromImageInput {
  /**
   * URL or path to the reference image. Supported schemes:
   * - `file://path`
   * - `http://` / `https://`
   * - `data:image/...;base64,...`
   * - bare path (treated as a local filesystem path)
   */
  imageUrl: string;
  /** Optional free-text hint forwarded to vision-LLM backends. */
  hint?: string;
  /**
   * Features the agent wants traced. Defaults to a single silhouette request:
   * `[{ label: 'silhouette', kind: 'silhouette' }]`.
   */
  features?: TraceFeatureRequest[];
  /** Cap on waypoints per feature. Defaults to {@link DEFAULT_MAX_WAYPOINTS_PER_FEATURE}. */
  maxWaypointsPerFeature?: number;
  /** Force a specific backend. `undefined` is equivalent to `'auto'`. */
  backend?: TraceBackend;
}

/** Output of the top-level orchestrator (and the MCP tool). */
export interface TraceFromImageOutput {
  /** `true` iff at least one feature was extracted. */
  ok: boolean;
  /** Extracted features, in the same order as the input `features` array. */
  features: TraceFeatureResult[];
  /** `[width, height]` of the source image in pixels. */
  imageDims: [number, number];
  /** Diagnostics — empty array on the happy path; warnings + errors otherwise. */
  diagnostics: TraceDiagnostic[];
}

/**
 * Diagnostic emitted by the trace tool. Reuses {@link CompilerDiagnostic} so
 * agents and the eval harness can treat trace diagnostics uniformly with the
 * existing capture-graph diagnostic stream.
 */
export type TraceDiagnostic = CompilerDiagnostic;
