// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/vision/ledger.ts
//
// Assumption ledger for image/photo-driven modeling. `trace_from_image`
// silently distinguishes measured pixels from guessed ones only inside its
// per-feature `confidence` number — nothing forces an agent to notice which
// facts are grounded before it commits geometry. `buildLedger()` turns the
// real tracer signals (which backend produced a feature, its self-reported
// confidence, whether a scale anchor or priors were supplied) into an
// explicit, machine-checkable ledger. `resolveAssumptions()` lets an agent
// (or the `resolve_assumptions` MCP tool) confirm/override open facts and
// derive param overrides.
//
// Spec: kernelCAD-private/docs/specs/2026-09-14-image-ledger-design.md.

import type { TraceFeatureResult } from './types';

/** Evidence source behind a ledger fact — always a real upstream signal.
 *  `mesh` facts come from measuring a triangle mesh (`mesh_to_features`). */
export type AssumptionEvidenceSource = 'image' | 'scale' | 'symmetry' | 'prior' | 'mesh';

/** Classification of how a fact was established. */
export type AssumptionKind = 'visible' | 'inferred' | 'assumed' | 'missing';

/** Resolution state of a ledger fact. */
export type AssumptionResolution = 'confirmed' | 'overridden' | 'open';

export interface AssumptionEvidence {
  source: AssumptionEvidenceSource;
  /** Pixel-space region the fact was drawn from, `[x, y, w, h]`. */
  region?: [number, number, number, number];
  /** Model-space (mm) box the fact was drawn from, for mesh-derived facts. */
  bbox?: { min: [number, number, number]; max: [number, number, number] };
}

export interface AssumptionFact {
  /** Stable identifier — matches the traced feature `label`, `'scale'`, or a caller-chosen prior id. */
  id: string;
  /** Human-readable statement of the fact, for agent/user review. */
  statement: string;
  kind: AssumptionKind;
  evidence?: AssumptionEvidence;
  /** The measured/inferred/assumed value, when one exists (absent for `missing`). */
  value?: unknown;
  /** 0..1 — always echoes a real upstream signal, never fabricated. */
  confidence: number;
  resolution: AssumptionResolution;
}

export interface AssumptionLedger {
  facts: AssumptionFact[];
  /** Set once a scale anchor is supplied; absent while scale is `missing`. */
  scale?: { mmPerPixel: number; source: 'scale-anchor' };
  /** Count of facts still `resolution: 'open'`. */
  unresolvedCount: number;
}

/** Caller-supplied pixel-to-real-world scale anchor. */
export interface ScaleAnchor {
  /** Distance in pixels between two points the caller measured on the image. */
  pixelDistance: number;
  /** The same distance in real-world units. */
  realDistance: number;
  unit: 'mm' | 'cm' | 'in';
}

/** Caller-supplied prior default (category norm, e.g. "acetate wall ~2mm"). */
export interface PriorInput {
  id: string;
  statement: string;
  value: unknown;
  /** Caller's own stated confidence in the prior — recorded verbatim, never adjusted. */
  confidence: number;
}

const UNIT_TO_MM: Record<ScaleAnchor['unit'], number> = { mm: 1, cm: 10, in: 25.4 };

/** Build a fact from a single traced feature result. Exported for direct testing. */
export function factFromTracedFeature(feature: TraceFeatureResult): AssumptionFact {
  const region: [number, number, number, number] | undefined =
    feature.waypoints.length > 0
      ? boundingBoxOf(feature.waypoints)
      : undefined;

  if (feature.backend === 'opencv') {
    return {
      id: feature.label,
      statement: `${feature.label} (${feature.kind}): silhouette traced by deterministic contour extraction.`,
      kind: 'visible',
      evidence: { source: 'image', region },
      value: feature.waypoints,
      confidence: feature.confidence,
      resolution: feature.confidence >= 1 ? 'confirmed' : 'open',
    };
  }
  // vision-llm (and hybrid-labeled features report their own backend, so this
  // branch also covers hybrid's LLM-labeled points/bboxes).
  return {
    id: feature.label,
    statement: `${feature.label} (${feature.kind}): labeled by vision-LLM inference, self-reported confidence ${feature.confidence.toFixed(2)}.`,
    kind: 'inferred',
    evidence: { source: 'image', region },
    value: feature.waypoints,
    confidence: feature.confidence,
    resolution: 'open',
  };
}

function boundingBoxOf(points: TraceFeatureResult['waypoints']): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX - minX, maxY - minY];
}

/** Build the scale fact — `visible` when a scale anchor was supplied, `missing` otherwise. */
export function scaleFact(scaleAnchor?: ScaleAnchor): { fact: AssumptionFact; scale?: AssumptionLedger['scale'] } {
  if (!scaleAnchor) {
    return {
      fact: {
        id: 'scale',
        statement: 'Pixel-to-real-world scale was not established — no scale anchor was supplied.',
        kind: 'missing',
        confidence: 0,
        resolution: 'open',
      },
    };
  }
  const mmPerPixel = (scaleAnchor.realDistance * UNIT_TO_MM[scaleAnchor.unit]) / scaleAnchor.pixelDistance;
  return {
    fact: {
      id: 'scale',
      statement: `Scale anchor: ${scaleAnchor.pixelDistance}px = ${scaleAnchor.realDistance}${scaleAnchor.unit} (${mmPerPixel.toFixed(4)} mm/px).`,
      kind: 'visible',
      evidence: { source: 'scale' },
      value: mmPerPixel,
      confidence: 1,
      resolution: 'confirmed',
    },
    scale: { mmPerPixel, source: 'scale-anchor' },
  };
}

/** Build an `assumed` fact from a caller-supplied prior. Recorded verbatim, never adjusted. */
export function factFromPrior(prior: PriorInput): AssumptionFact {
  return {
    id: prior.id,
    statement: prior.statement,
    kind: 'assumed',
    evidence: { source: 'prior' },
    value: prior.value,
    confidence: prior.confidence,
    resolution: 'open',
  };
}

export interface BuildLedgerInput {
  features: TraceFeatureResult[];
  scaleAnchor?: ScaleAnchor;
  priors?: PriorInput[];
}

/** Derive the full assumption ledger from real tracer signals. Never throws. */
export function buildLedger(input: BuildLedgerInput): AssumptionLedger {
  const facts: AssumptionFact[] = input.features.map(factFromTracedFeature);
  const { fact: scaleFactResult, scale } = scaleFact(input.scaleAnchor);
  facts.push(scaleFactResult);
  for (const prior of input.priors ?? []) {
    facts.push(factFromPrior(prior));
  }
  return {
    facts,
    scale,
    unresolvedCount: facts.filter((f) => f.resolution === 'open').length,
  };
}

export function hasOpenMissingFact(ledger: AssumptionLedger): boolean {
  return ledger.facts.some((f) => f.kind === 'missing' && f.resolution === 'open');
}

/** A single resolution instruction from the agent/user. */
export interface AssumptionResolutionInput {
  id: string;
  /** Pass a concrete value to override the fact, or `'confirm'` to accept it as-is. */
  value?: unknown;
  confirm?: boolean;
}

export interface ResolveAssumptionsResult {
  ledger: AssumptionLedger;
  /** `factId -> value` for every fact resolved with a concrete value. Feed straight into `set_param`. */
  paramOverrides: Record<string, unknown>;
  /** Resolution ids that did not match any fact in the ledger. */
  unknownIds: string[];
}

/** Apply resolutions to a ledger, returning the updated ledger + derived param overrides. Pure. */
export function resolveAssumptions(
  ledger: AssumptionLedger,
  resolutions: AssumptionResolutionInput[],
): ResolveAssumptionsResult {
  const byId = new Map(ledger.facts.map((f) => [f.id, f] as const));
  const unknownIds: string[] = [];
  const paramOverrides: Record<string, unknown> = {};

  const updatedFacts = ledger.facts.map((f) => ({ ...f }));
  const updatedById = new Map(updatedFacts.map((f) => [f.id, f] as const));

  for (const r of resolutions) {
    const fact = byId.get(r.id);
    if (!fact) {
      unknownIds.push(r.id);
      continue;
    }
    const target = updatedById.get(r.id)!;
    if (r.value !== undefined) {
      target.value = r.value;
      target.resolution = 'overridden';
      paramOverrides[r.id] = r.value;
    } else if (r.confirm) {
      target.resolution = 'confirmed';
      if (target.value !== undefined) paramOverrides[r.id] = target.value;
    }
  }

  return {
    ledger: {
      facts: updatedFacts,
      scale: ledger.scale,
      unresolvedCount: updatedFacts.filter((f) => f.resolution === 'open').length,
    },
    paramOverrides,
    unknownIds,
  };
}
