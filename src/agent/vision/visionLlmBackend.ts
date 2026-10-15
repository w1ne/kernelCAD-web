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
// - **Reduce the whole contour when the LLM overshoots the waypoint cap.**
//   Keeping only a prefix cuts away the remaining object boundary and turns
//   closed outlines into partial arcs. Keep the full traversal and endpoints.
// - **Out-of-range coords are a hard fail** — if the model returns
//   `[1.4, 0.2]` we cannot silently clamp because the agent has no way to know
//   what part of the image fell off the edge. Surface the error.

import type { PartRecord } from '../../shared/parts/types';
import type {
  AnthropicVisionClient,
  VisionMediaType,
  VisionRequest,
  VisionResponse,
} from './anthropicVisionClient';
import type {
  DraftBomItem,
  DetectedTracePart,
  TraceFeatureKind,
  TraceFeatureRequest,
  TraceFeatureResult,
  Vec2Normalized,
} from './types';
import { loadCatalog } from '../../modeling/parts/catalog';

export interface RawDetectedPart {
  name: string;
  quantity: number;
  bbox: [number, number, number, number];
  confidence: number;
}

/** One bounded vision pass for labeled boxes on a hand sketch. */
export async function detectPartsViaLLM(
  client: VisionLlmClient,
  imageBytes: Uint8Array,
  mediaType: VisionMediaType,
  hint?: string,
): Promise<RawDetectedPart[]> {
  const prompt = [
    'Inspect this hand sketch of a device and detect labeled component boxes or text labels such as ESP32, DHT22, LCD, or buttons x4.',
    'Return only JSON: {"parts":[{"name":"ESP32","quantity":1,"bbox":[xmin,ymin,xmax,ymax],"confidence":0.9}]}.',
    'Coordinates are normalized [0,1] to the full image, origin top-left. bbox is the box around the component drawing or its label.',
    'Only report components explicitly labeled or clearly drawn as labeled component boxes. Do not invent parts. quantity defaults to 1; parse counts such as x4. Confidence must be 0..1.',
    hint ? `Context: ${hint}` : '',
  ].filter(Boolean).join('\n');
  const response = await client.generate({ prompt, imageBytes, mediaType });
  const parsed = JSON.parse(stripCodeFences(response.text)) as { parts?: unknown };
  if (!Array.isArray(parsed?.parts)) throw new Error('visionLlmBackend: parts response missing parts array');
  return parsed.parts.map((entry, i) => validateDetectedPart(entry, i));
}

function validateDetectedPart(value: unknown, index: number): RawDetectedPart {
  if (!value || typeof value !== 'object') throw new Error(`visionLlmBackend: part ${index} is not an object`);
  const part = value as { name?: unknown; quantity?: unknown; bbox?: unknown; confidence?: unknown };
  if (typeof part.name !== 'string' || !part.name.trim()) throw new Error(`visionLlmBackend: part ${index} has no name`);
  const bbox = part.bbox;
  if (!Array.isArray(bbox) || bbox.length !== 4 || !bbox.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1)) {
    throw new Error(`visionLlmBackend: part ${index} bbox must be four normalized coordinates`);
  }
  const [xmin, ymin, xmax, ymax] = bbox as number[];
  if (xmin >= xmax || ymin >= ymax) throw new Error(`visionLlmBackend: part ${index} bbox is inverted or empty`);
  const quantity = typeof part.quantity === 'number' && Number.isInteger(part.quantity) && part.quantity > 0 ? part.quantity : 1;
  const confidence = typeof part.confidence === 'number' && Number.isFinite(part.confidence) ? Math.max(0, Math.min(1, part.confidence)) : 0.5;
  return { name: part.name.trim(), quantity, bbox: [xmin, ymin, xmax, ymax], confidence };
}

/** Convert in-outline boxes into silhouette coordinates, retain outside boxes in image coordinates, and draft the BOM. */
export function partsInOutlineFrame(
  rawParts: RawDetectedPart[],
  features: TraceFeatureResult[],
): { detectedParts: DetectedTracePart[]; draftBom: DraftBomItem[]; unmatchedLabels: import('./types').UnmatchedTraceLabel[]; partDetectionFrame: 'outline' | 'image' | 'mixed' } {
  const silhouette = features.find((feature) => feature.kind === 'silhouette' && feature.waypoints.length > 0);
  const partDetectionFrame = silhouette ? 'outline' : 'image';
  const xs = silhouette?.waypoints.map(([x]) => x) ?? [0, 1];
  const ys = silhouette?.waypoints.map(([, y]) => y) ?? [0, 1];
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
  const width = Math.max(right - left, Number.EPSILON), height = Math.max(bottom - top, Number.EPSILON);
  const catalog = loadCatalog();
  const detectedParts = rawParts.map((part) => {
    const [x1, y1, x2, y2] = part.bbox;
    const outsideOutline = Boolean(silhouette && (
      x1 < left || y1 < top || x2 > right || y2 > bottom ||
      !bboxInsidePolygon([x1, y1, x2, y2], silhouette.waypoints)
    ));
    const coordinateFrame: 'outline' | 'image' = silhouette && !outsideOutline ? 'outline' : 'image';
    const bbox: [number, number, number, number] = coordinateFrame === 'outline' ? [
      (x1 - left) / width, (y1 - top) / height,
      (x2 - left) / width, (y2 - top) / height,
    ] : [...part.bbox];
    const catalogMatch = findCatalogMatch(part.name, catalog.records);
    return {
      ...part,
      ...(catalogMatch ? { catalogMatch, matchedCatalogId: catalogMatch.id } : {}),
      bbox,
      position: [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2] as [number, number],
      coordinateFrame,
      ...(outsideOutline ? { outsideOutline: true } : {}),
    };
  });
  const partFrames = new Set(detectedParts.map((part) => part.coordinateFrame));
  const outputFrame: 'outline' | 'image' | 'mixed' = partFrames.size > 1 ? 'mixed' : (partFrames.values().next().value ?? partDetectionFrame);
  const unmatchedLabels = unmatchedLabelsFor(detectedParts);
  return { detectedParts, draftBom: groupDraftBom(detectedParts), unmatchedLabels, partDetectionFrame: outputFrame };
}

/** Require all box corners and edge midpoints to lie in the actual polygon. */
function bboxInsidePolygon(bbox: [number, number, number, number], polygon: Vec2Normalized[]): boolean {
  const [x1, y1, x2, y2] = bbox;
  const points: Vec2Normalized[] = [
    [x1, y1], [(x1 + x2) / 2, y1], [x2, y1], [x2, (y1 + y2) / 2],
    [x2, y2], [(x1 + x2) / 2, y2], [x1, y2], [x1, (y1 + y2) / 2],
  ];
  return points.every(([x, y]) => pointInPolygon(x, y, polygon));
}

function pointInPolygon(x: number, y: number, polygon: Vec2Normalized[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function groupDraftBom(detectedParts: readonly DetectedTracePart[]): DraftBomItem[] {
  const grouped = new Map<string, DraftBomItem>();
  for (const part of detectedParts) {
    const key = part.matchedCatalogId ? `catalog:${part.matchedCatalogId}` : `unmatched:${part.name.toLocaleLowerCase()}`;
    const item = grouped.get(key);
    if (item) { item.qty += part.quantity; item.confidence = Math.min(item.confidence, part.confidence); }
    else grouped.set(key, {
      partName: part.catalogMatch?.name ?? part.name,
      qty: part.quantity,
      confidence: part.confidence,
      ...(part.catalogMatch ? { catalogMatch: part.catalogMatch, matchedCatalogId: part.catalogMatch.id } : {}),
    });
  }
  return [...grouped.values()];
}

function unmatchedLabelsFor(detectedParts: readonly DetectedTracePart[]): import('./types').UnmatchedTraceLabel[] {
  return detectedParts.filter((part) => !part.catalogMatch).map((part) => ({
    label: part.name, quantity: part.quantity, confidence: part.confidence, reason: 'no-bundled-catalog-match' as const,
  }));
}

export function findCatalogMatch(
  label: string,
  records: readonly PartRecord[],
): { id: string; name: string; confidence: number } | undefined {
  const candidate = records
    .map((record) => ({ record, match: catalogMatchScore(label, record) }))
    .sort((a, b) => b.match.priority - a.match.priority || b.match.confidence - a.match.confidence)[0];
  if (!candidate || candidate.match.confidence < 0.6) return undefined;
  return { id: candidate.record.id, name: candidate.record.name, confidence: candidate.match.confidence };
}

function catalogMatchScore(label: string, candidate: PartRecord): { priority: number; confidence: number } {
  const normalize = (value: string) => value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const compact = (value: string) => normalize(value).replace(/\s+/g, '');
  const left = normalize(label);
  const mpn = Object.entries(candidate.attributes).filter(([key]) => /^(mpn|manufacturer part number)$/i.test(key)).map(([, value]) => String(value));
  const identifyingAliases = [candidate.id, candidate.name, candidate.standard ?? '', ...candidate.tags, ...mpn];
  const compactLabel = compact(label);
  if (!left) return { priority: 0, confidence: 0 };
  if (identifyingAliases.some((alias) => compact(alias) === compactLabel)) return { priority: 3, confidence: 1 };
  const right = normalize([candidate.id, candidate.name, candidate.standard ?? '', ...candidate.tags].join(' '));
  // A substring of an alias is not evidence that the detected label names the
  // same part (e.g. "ESP32" inside "ESP32 DevKitC-32E"). Exact normalized
  // identity above is safe; everything else must use the lower-confidence
  // token overlap below.
  const leftTokens = new Set(left.split(/\s+/));
  const rightTokens = new Set(right.split(/\s+/));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return { priority: 1, confidence: intersection / new Set([...leftTokens, ...rightTokens]).size };
}

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

function parseFeaturePayload(text: string): unknown[] {
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
  return (parsed as { features: unknown[] }).features;
}

interface ValidatedFeatureEntry {
  label: string;
  kind: TraceFeatureKind;
  rawWaypoints: unknown[];
  confidence: number;
}

function validateFeatureEntry(
  rf: unknown,
  requestedByLabel: Map<string, TraceFeatureRequest>,
): ValidatedFeatureEntry {
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

  let confidence = 0.5;
  const rawConf = r.confidence;
  if (typeof rawConf === 'number' && Number.isFinite(rawConf)) {
    confidence = Math.max(0, Math.min(1, rawConf));
  }
  return { label: r.label, kind: r.kind as TraceFeatureKind, rawWaypoints: r.waypoints, confidence };
}

/**
 * Accept the other shapes vision models commonly use for the same points and
 * turn them into `[[x, y], ...]`:
 * - a flat list of numbers, e.g. a bbox as `[x1, y1, x2, y2]` (Qwen-VL and
 *   other OpenAI-compatible models answer bboxes this way);
 * - `{ x, y }` objects.
 * Anything else is passed through unchanged and validated as before.
 */
function normalizeWaypointShape(input: unknown[]): unknown[] {
  let rawWaypoints = input;
  // A polyline wrapped in an extra list: [[[x, y], [x, y], ...]].
  while (
    rawWaypoints.length === 1 &&
    Array.isArray(rawWaypoints[0]) &&
    (rawWaypoints[0] as unknown[]).length > 0 &&
    (rawWaypoints[0] as unknown[]).every((v) => Array.isArray(v) || (v && typeof v === 'object'))
  ) {
    rawWaypoints = rawWaypoints[0] as unknown[];
  }
  if (rawWaypoints.length >= 2 && rawWaypoints.length % 2 === 0 && rawWaypoints.every((v) => typeof v === 'number')) {
    const pairs: unknown[] = [];
    for (let i = 0; i < rawWaypoints.length; i += 2) pairs.push([rawWaypoints[i], rawWaypoints[i + 1]]);
    return pairs;
  }
  const single = rawWaypoints.length === 1;
  return rawWaypoints.flatMap((wp): unknown[] => {
    if (wp && typeof wp === 'object' && !Array.isArray(wp) && 'x' in wp && 'y' in wp) {
      const o = wp as { x: unknown; y: unknown };
      return [[o.x, o.y]];
    }
    // "x, y" as a string.
    if (typeof wp === 'string') {
      const m = /^\s*\[?\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]?\s*$/.exec(wp);
      return m ? [[Number(m[1]), Number(m[2])]] : [wp];
    }
    if (Array.isArray(wp) && wp.every((v) => typeof v === 'number')) {
      // A single flat bbox nested one level: [[x1, y1, x2, y2]].
      if (single && wp.length === 4) return [[wp[0], wp[1]], [wp[2], wp[3]]];
      // [x, y, extra] (a confidence or z): keep the point.
      if (wp.length === 3) return [[wp[0], wp[1]]];
    }
    return [wp];
  });
}

/** Short printable form of a bad waypoint for the error message. */
function preview(v: unknown): string {
  let s: string;
  try {
    s = JSON.stringify(v) ?? String(v);
  } catch {
    s = String(v);
  }
  return s.length > 80 ? `${s.slice(0, 77)}...` : s;
}

function validateWaypoints(rawWaypoints: unknown[], label: string): Vec2Normalized[] {
  const validatedWaypoints: Vec2Normalized[] = [];
  for (const wp of normalizeWaypointShape(rawWaypoints)) {
    if (!Array.isArray(wp) || wp.length !== 2) {
      throw new Error(
        `visionLlmBackend: feature "${label}" waypoint is not a 2-tuple (got ${preview(wp)})`,
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
        `visionLlmBackend: feature "${label}" waypoint has non-finite coordinate`,
      );
    }
    if (x < 0 || x > 1 || y < 0 || y > 1) {
      // Out-of-range is a hard fail — do NOT silently clamp.
      throw new Error(
        `OUT_OF_RANGE: feature "${label}" waypoint [${x}, ${y}]`,
      );
    }
    validatedWaypoints.push([x, y]);
  }
  return validatedWaypoints;
}

function reduceWaypoints(waypoints: Vec2Normalized[], maxWaypointsPerFeature: number): Vec2Normalized[] {
  if (waypoints.length <= maxWaypointsPerFeature) return waypoints;
  if (maxWaypointsPerFeature === 1) return [waypoints[0]];
  return Array.from({ length: maxWaypointsPerFeature }, (_, i) =>
    waypoints[Math.round(i * (waypoints.length - 1) / (maxWaypointsPerFeature - 1))]);
}

/** @internal — exported for the test seam. */
export function parseAndValidate(
  text: string,
  features: TraceFeatureRequest[],
  maxWaypointsPerFeature: number,
): TraceFeatureResult[] {
  const rawFeatures = parseFeaturePayload(text);

  // Index requested features by label for cross-validation.
  const requestedByLabel = new Map<string, TraceFeatureRequest>();
  for (const f of features) {
    requestedByLabel.set(f.label, f);
  }

  const out: TraceFeatureResult[] = [];
  for (const rf of rawFeatures) {
    const entry = validateFeatureEntry(rf, requestedByLabel);
    const waypoints = reduceWaypoints(
      validateWaypoints(entry.rawWaypoints, entry.label),
      maxWaypointsPerFeature,
    );
    out.push({
      label: entry.label,
      kind: entry.kind,
      waypoints,
      confidence: entry.confidence,
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
