// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/vision/index.ts
//
// Public surface of the `src/agent/vision/` module — photo-to-sketch trace.
// Top-level `traceFromImage()` orchestrator + re-exports for the wrapper
// types/clients used by the MCP tool layer.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  DEFAULT_MAX_WAYPOINTS_PER_FEATURE,
  type TraceBackend,
  type TraceDiagnostic,
  type TraceFeatureRequest,
  type TraceFeatureResult,
  type TraceFromImageInput,
  type TraceFromImageOutput,
  type Vec2Normalized,
} from './types';
import { defaultVisionClient, type VisionMediaType } from './anthropicVisionClient';
import { HINT_TEMPLATES, NEXT_ACTIONS } from '../../shared/diagnostics/registry';
import { extractFeaturesViaLLM, type VisionLlmClient } from './visionLlmBackend';
import { traceHybrid } from './hybridBackend';
import { extractSilhouettePolyline as defaultExtractSilhouettePolyline } from './opencvBackend';
import { decideBackend } from './router';
import { buildLedger, hasOpenMissingFact, type AssumptionLedger } from './ledger';
export {
  buildLedger,
  factFromPrior,
  factFromTracedFeature,
  hasOpenMissingFact,
  resolveAssumptions,
  scaleFact,
} from './ledger';
export type {
  AssumptionEvidence,
  AssumptionEvidenceSource,
  AssumptionFact,
  AssumptionKind,
  AssumptionLedger,
  AssumptionResolution,
  AssumptionResolutionInput,
  BuildLedgerInput,
  PriorInput,
  ResolveAssumptionsResult,
  ScaleAnchor,
} from './ledger';

export type {
  Vec2Normalized,
  TraceBackend,
  TraceFeatureKind,
  TraceFeatureRequest,
  TraceFeatureResult,
  TraceFromImageInput,
  TraceFromImageOutput,
  TraceDiagnostic,
} from './types';
export { DEFAULT_MAX_WAYPOINTS_PER_FEATURE } from './types';

export {
  AnthropicVisionClient,
  defaultVisionClient,
} from './anthropicVisionClient';
export type {
  AnthropicSdkLike,
  AnthropicVisionClientOptions,
  DefaultVisionClientOptions,
  VisionMediaType,
  VisionRequest,
  VisionResponse,
} from './anthropicVisionClient';

/**
 * Hard cap on any single backend dispatch. A backend must never hang the tool
 * forever (the original prod bug was opencv-js WASM init never settling). On
 * expiry the orchestrator returns a structured `trace_timeout` failure.
 */
const DEFAULT_BACKEND_TIMEOUT_MS = 20_000;

function backendTimeoutMs(): number {
  const configured = Number(process.env.KERNELCAD_TRACE_BACKEND_TIMEOUT_MS);
  if (Number.isFinite(configured) && configured > 0) return configured;
  return DEFAULT_BACKEND_TIMEOUT_MS;
}

/** Symbol thrown when a backend dispatch exceeds {@link backendTimeoutMs}. */
const TRACE_TIMEOUT = Symbol('trace_timeout');

async function withBackendTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(TRACE_TIMEOUT), timeoutMs);
        // Don't keep the event loop alive solely for this timer.
        if (typeof timer.unref === 'function') timer.unref();
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Options for callers that need to inject test seams. */
export interface TraceFromImageOptions {
  /** Override the vision-LLM client (test seam). */
  visionClient?: VisionLlmClient;
  /** Override the opencv silhouette extractor (test seam — avoids the WASM hang in vitest). */
  extractSilhouettePolyline?: (
    pngBytes: Buffer,
    maxWaypoints: number,
  ) => Promise<Vec2Normalized[]>;
  /** Override the per-backend hard timeout in ms (test seam). */
  backendTimeoutMs?: number;
}

/**
 * Top-level orchestrator for the `trace_from_image` MCP tool. Validates input,
 * fetches the image, picks (or accepts) a backend, dispatches, and returns
 * normalized waypoints + per-feature confidence + diagnostics.
 *
 * Never throws — every failure path emits a diagnostic and returns `ok: false`.
 */
export async function traceFromImage(
  input: TraceFromImageInput,
  opts: TraceFromImageOptions = {},
): Promise<TraceFromImageOutput> {
  // Step 1: validate imageUrl.
  if (typeof input?.imageUrl !== 'string' || input.imageUrl.length === 0) {
    return failOutput('tool.trace-from-image.invalid-image-url', 'imageUrl is missing or empty');
  }

  // Step 2: validate features (default to single silhouette).
  let features: TraceFeatureRequest[];
  if (input.features === undefined) {
    features = [{ label: 'silhouette', kind: 'silhouette' }];
  } else if (!Array.isArray(input.features) || input.features.length === 0) {
    return failOutput('tool.trace-from-image.no-features-requested', 'features array is empty');
  } else {
    features = input.features;
  }

  const maxWaypoints = input.maxWaypointsPerFeature ?? DEFAULT_MAX_WAYPOINTS_PER_FEATURE;

  // Step 3: fetch image bytes.
  let imageBytes: Buffer;
  let imageDims: [number, number] = [0, 0];
  let mediaType: VisionMediaType;
  try {
    imageBytes = await fetchImageBytes(input.imageUrl);
    const probe = await sharp(imageBytes).metadata();
    imageDims = [probe.width ?? 0, probe.height ?? 0];
    mediaType = inferMediaType(probe.format);
  } catch (err) {
    return failOutput(
      'tool.trace-from-image.image-fetch-failed',
      `failed to fetch or decode image at ${input.imageUrl}: ${errMsg(err)}`,
    );
  }

  // Step 4: pick backend.
  let backend: Exclude<TraceBackend, 'auto'>;
  if (input.backend === undefined || input.backend === 'auto') {
    try {
      backend = await decideBackend(imageBytes, features);
    } catch (err) {
      return failOutput(
        'tool.trace-from-image.backend-failed',
        `router failed to inspect image: ${errMsg(err)}`,
      );
    }
  } else {
    backend = input.backend;
  }

  const extract = opts.extractSilhouettePolyline ?? defaultExtractSilhouettePolyline;
  const diagnostics: TraceDiagnostic[] = [];

  // Step 5: dispatch (under a hard timeout so a backend can never hang).
  const timeoutMs = opts.backendTimeoutMs ?? backendTimeoutMs();
  try {
    const dispatch = async (): Promise<TraceFeatureResult[]> => {
    let results: TraceFeatureResult[];
    switch (backend) {
      case 'opencv': {
        const polyline = await extract(imageBytes, maxWaypoints);
        results = features.map((f) => ({
          label: f.label,
          kind: f.kind,
          waypoints: polyline,
          confidence: 1,
          backend: 'opencv' as const,
        }));
        const hasNamed = features.some((f) => f.kind === 'point' || f.kind === 'bbox');
        if (hasNamed) {
          diagnostics.push(
            makeDiag(
              'tool.trace-from-image.opencv-cannot-label',
              'warn',
              'opencv backend cannot label point/bbox features — every feature is returned with the same silhouette polyline. Switch to `hybrid` to label named features with the LLM.',
            ),
          );
        }
        break;
      }
      case 'vision-llm': {
        const client = opts.visionClient ?? defaultVisionClient();
        const imageU8 = new Uint8Array(
          imageBytes.buffer,
          imageBytes.byteOffset,
          imageBytes.byteLength,
        );
        results = await extractFeaturesViaLLM(
          client,
          imageU8,
          mediaType,
          features,
          input.hint,
          maxWaypoints,
        );
        break;
      }
      case 'hybrid': {
        const client = opts.visionClient ?? defaultVisionClient();
        results = await traceHybrid(
          client,
          imageBytes,
          mediaType,
          features,
          input.hint,
          maxWaypoints,
          { extractSilhouettePolyline: extract },
        );
        break;
      }
      default: {
        throw new Error(`unknown backend "${String(backend)}"`);
      }
    }
    return results;
    };

    const results = await withBackendTimeout(dispatch(), timeoutMs);

    const ledger = buildLedger({
      features: results,
      scaleAnchor: input.scaleAnchor,
      priors: input.priors,
    });
    if (ledger.unresolvedCount > 0) {
      const escalate = input.validate === 'error' && hasOpenMissingFact(ledger);
      diagnostics.push(
        makeDiag(
          'reference.assumptions.unresolved',
          escalate ? 'error' : 'warn',
          `${ledger.unresolvedCount} assumption ledger fact(s) remain open (scale/inferred/assumed) — call resolve_assumptions to confirm or override them before committing geometry.`,
        ),
      );
    }

    return {
      ok: results.length > 0 && !(input.validate === 'error' && hasOpenMissingFact(ledger)),
      features: results,
      imageDims,
      diagnostics,
      ledger,
    };
  } catch (err) {
    if (err === TRACE_TIMEOUT) {
      return {
        ok: false,
        features: [],
        imageDims,
        diagnostics: [
          ...diagnostics,
          makeDiag(
            'tool.trace-from-image.trace-timeout',
            'error',
            `${backend} backend timed out after ${timeoutMs}ms`,
          ),
        ],
        ledger: emptyLedger(),
      };
    }
    return {
      ok: false,
      features: [],
      imageDims,
      diagnostics: [
        ...diagnostics,
        makeDiag(
          'tool.trace-from-image.backend-failed',
          'error',
          `${backend} backend failed: ${errMsg(err)}`,
        ),
      ],
      ledger: emptyLedger(),
    };
  }
}

function emptyLedger(): AssumptionLedger {
  return { facts: [], unresolvedCount: 0 };
}

function failOutput(
  code:
    | 'tool.trace-from-image.invalid-image-url'
    | 'tool.trace-from-image.no-features-requested'
    | 'tool.trace-from-image.image-fetch-failed'
    | 'tool.trace-from-image.backend-failed',
  message: string,
): TraceFromImageOutput {
  return {
    ok: false,
    features: [],
    imageDims: [0, 0],
    diagnostics: [makeDiag(code, 'error', message)],
    ledger: emptyLedger(),
  };
}

function makeDiag(
  code: TraceDiagnostic['code'],
  severity: TraceDiagnostic['severity'],
  message: string,
): TraceDiagnostic {
  // `target` reuses the canonical BackendTarget union for wire-compat with the
  // capture-graph diagnostic stream; the tool itself doesn't run on a backend
  // but every CompilerDiagnostic carries a target — pick the one that matches
  // the dominant kernel target so downstream formatters/group-by routines stay
  // monomorphic.
  return {
    target: 'export-occt',
    code,
    severity,
    message,
    hint: HINT_TEMPLATES[code].template,
    nextAction: NEXT_ACTIONS[code],
  };
}

async function fetchImageBytes(imageUrl: string): Promise<Buffer> {
  if (imageUrl.startsWith('data:')) {
    const commaIdx = imageUrl.indexOf(',');
    if (commaIdx < 0) {
      throw new Error('data: URL missing comma separator');
    }
    const header = imageUrl.slice(5, commaIdx);
    const payload = imageUrl.slice(commaIdx + 1);
    if (header.includes(';base64')) {
      return Buffer.from(payload, 'base64');
    }
    return Buffer.from(decodeURIComponent(payload), 'utf8');
  }
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    const resp = await fetch(imageUrl);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${imageUrl}`);
    const buf = await resp.arrayBuffer();
    return Buffer.from(buf);
  }
  if (imageUrl.startsWith('file://')) {
    return readFile(fileURLToPath(imageUrl));
  }
  return readFile(imageUrl);
}

function inferMediaType(format: string | undefined): VisionMediaType {
  switch (format) {
    case 'png':
      return 'image/png';
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      throw new Error(`unsupported image format: ${format ?? 'unknown'}`);
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
