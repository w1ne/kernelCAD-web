// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/stepPartsAdapter.ts
//
// Adapter for the step.parts public catalog (https://api.step.parts). This is
// the default remote source that lets kernelCAD *find* off-the-shelf parts it
// does not bundle. step.parts returns its own JSON schema — this module maps a
// step.parts record onto kernelCAD's canonical `PartRecord`.
//
// Two schema gaps are filled here, not at the API:
//   - `connectors` — records without an authored, hash-bound connector manifest
//     synthesize them at fetch time from downloaded STEP (see
//     synthesizeConnectors.ts). The mapper otherwise exposes the authored names.
//   - `license`    — step.parts exposes no per-part license field, but the
//     catalog repo (earthtojake/step.parts) is MIT, which covers the geometry.
//     We stamp `STEP_PARTS_LICENSE` ('MIT') plus `attribution = pageUrl` to
//     satisfy MIT's attribution requirement. The STEP is NOT re-hosted; it is
//     fetched to the user cache on demand.
//
// `sha256` and `stepUrl` ARE present on the per-part detail endpoint, so byte
// integrity verification (getOrFetchAsync) works unchanged.

import type { PartRecord } from '../../shared/parts/types';
import { validateHashBoundConnectorManifest } from '../../shared/parts/connectorManifestSchema';

export const STEP_PARTS_BASE_URL = 'https://api.step.parts';

/** License stamped on every step.parts record. The catalog repo
 *  (earthtojake/step.parts) is MIT, which covers the bundled geometry; MIT's
 *  attribution requirement is met by each record's `attribution` (the part's
 *  catalog page). Matches kernelCAD's own bundled-tier license. */
export const STEP_PARTS_LICENSE = 'MIT';

/** Raw shape of a step.parts /v1/parts/{id} detail record (the fields we read). */
export interface StepPartsRecord {
  id: string;
  name: string;
  description?: string;
  category: string;
  family: string;
  tags?: string[];
  aliases?: string[];
  standard?: { body?: string; number?: string; designation?: string } | string | null;
  attributes?: Record<string, unknown>;
  stepUrl?: string;
  /** Display-mesh URL. kernelCAD's own catalog serves the authored `*-board`
   *  records as GLB-only (no `stepUrl`) — see PartRecord.glbUrl. Must survive
   *  the mapping so fetchPartHost can explain *why* there is no BREP instead of
   *  reporting a bare "no stepUrl". */
  glbUrl?: string;
  pngUrl?: string;
  byteSize?: number;
  sha256?: string;
  pageUrl?: string;
  /** Optional authored connector data, bound to this exact geometry digest. */
  connectorManifest?: unknown;
}

/** step.parts `standard` is an object `{body, number, designation}`; kernelCAD's
 *  PartRecord wants a flat string. Tolerate the legacy string form too. */
function flattenStandard(
  s: StepPartsRecord['standard'],
): string | undefined {
  if (s == null) return undefined;
  if (typeof s === 'string') return s.length > 0 ? s : undefined;
  return s.designation ?? s.number ?? s.body ?? undefined;
}

/** Coerce step.parts attribute values to PartRecord's `number | string` union.
 *  Nested objects/arrays are JSON-stringified rather than dropped, so no design
 *  metadata is silently lost. */
function coerceAttributes(
  attrs: Record<string, unknown> | undefined,
): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  if (!attrs) return out;
  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v === 'number' || typeof v === 'string') out[k] = v;
    else if (typeof v === 'boolean') out[k] = String(v);
    else if (v != null) out[k] = JSON.stringify(v);
  }
  return out;
}

/**
 * Map a step.parts detail record onto a kernelCAD PartRecord.
 *
 * Authored connector manifests are validated against the raw record and
 * transported intact; otherwise `connectors` remains empty for fetch-time
 * synthesis. Aliases are folded into `tags` so fuzzy discovery can match the
 * names humans actually type ("M3 set screw").
 */
export function mapStepPartsRecord(raw: StepPartsRecord): PartRecord {
  const tags = [...(raw.tags ?? []), ...(raw.aliases ?? [])];
  const sha256 = raw.sha256 ?? '';
  const connectorManifest = raw.connectorManifest;
  if (connectorManifest !== undefined) {
    if (typeof raw.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(raw.sha256)) {
      throw new Error('step.parts: connectorManifest requires a lowercase record sha256');
    }
    validateHashBoundConnectorManifest(connectorManifest, {
      partId: raw.id,
      family: raw.family,
      geometrySha256: sha256,
    });
  }
  const record: PartRecord = {
    id: raw.id,
    name: raw.name,
    category: raw.category,
    family: raw.family,
    tags,
    attributes: coerceAttributes(raw.attributes),
    sha256,
    source: 'remote',
    license: STEP_PARTS_LICENSE,
    connectors: connectorManifest?.connectors.map((connector) => connector.name) ?? [],
    ...(connectorManifest === undefined ? {} : { connectorManifest }),
  };
  const standard = flattenStandard(raw.standard);
  if (standard !== undefined) record.standard = standard;
  if (raw.pageUrl) record.attribution = raw.pageUrl;
  if (raw.stepUrl) record.stepUrl = raw.stepUrl;
  if (raw.glbUrl) record.glbUrl = raw.glbUrl;
  return record;
}
