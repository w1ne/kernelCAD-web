// src/modeling/parts/stepPartsAdapter.ts
//
// Adapter for the step.parts public catalog (https://api.step.parts). This is
// the default remote source that lets kernelCAD *find* off-the-shelf parts it
// does not bundle. step.parts returns its own JSON schema — this module maps a
// step.parts record onto kernelCAD's canonical `PartRecord`.
//
// Two schema gaps are filled here, not at the API:
//   - `connectors` — step.parts ships none; they are synthesized at fetch time
//     from the downloaded STEP (see synthesizeConnectors.ts). The mapper emits
//     an empty list; fetchPartHost fills it.
//   - `license`    — step.parts exposes no license field. We stamp a provenance
//     default (`STEP_PARTS_LICENSE`) plus `attribution = pageUrl` so the source
//     is always recorded. The STEP geometry is NOT re-hosted; it is fetched to
//     the user cache on demand.
//
// `sha256` and `stepUrl` ARE present on the per-part detail endpoint, so byte
// integrity verification (getOrFetchAsync) works unchanged.

import type { PartRecord } from '../../shared/parts/types';

export const STEP_PARTS_BASE_URL = 'https://api.step.parts';

/** Provenance marker stamped on every step.parts record. step.parts publishes
 *  no per-part license; the catalog repo is MIT, but individual geometry terms
 *  are the source's to state, so we record provenance rather than assert a
 *  license we cannot verify. */
export const STEP_PARTS_LICENSE = 'unverified:step.parts';

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
  pngUrl?: string;
  byteSize?: number;
  sha256?: string;
  pageUrl?: string;
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
 * `connectors` is intentionally empty — fetchPartHost synthesizes them from the
 * downloaded STEP. Aliases are folded into `tags` so fuzzy discovery can match
 * the names humans actually type ("M3 set screw").
 */
export function mapStepPartsRecord(raw: StepPartsRecord): PartRecord {
  const tags = [...(raw.tags ?? []), ...(raw.aliases ?? [])];
  const record: PartRecord = {
    id: raw.id,
    name: raw.name,
    category: raw.category,
    family: raw.family,
    tags,
    attributes: coerceAttributes(raw.attributes),
    sha256: raw.sha256 ?? '',
    source: 'remote',
    license: STEP_PARTS_LICENSE,
    connectors: [],
  };
  const standard = flattenStandard(raw.standard);
  if (standard !== undefined) record.standard = standard;
  if (raw.pageUrl) record.attribution = raw.pageUrl;
  if (raw.stepUrl) record.stepUrl = raw.stepUrl;
  return record;
}
