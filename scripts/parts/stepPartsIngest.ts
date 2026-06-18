// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/stepPartsIngest.ts
//
// step.parts ingestion adapter. Reads the public step.parts catalog index and
// the catalog repo's THIRD_PARTY_NOTICES.md, resolves a per-part license,
// classifies it, and emits PartCandidate[] for the REDISTRIBUTABLE subset
// (permissive + share-alike); fetch-only parts (NC/ND/unknown) are dropped and
// accounted for in the run report.
//
// Reality note (vs the original brief): step.parts' THIRD_PARTY_NOTICES.md is a
// per-SOURCE license table (KiCad / FreeCAD-library / Adafruit / SparkFun /
// original-MIT), NOT a per-part id→license map. The catalog index items also
// carry no per-part license field. So we parse the notices file defensively for
// BOTH shapes — explicit `id: SPDX` lines if a future version adds them, AND the
// per-source `### Section … SPDX-expression` table — and map a part to a license
// by (1) an exact id match, then (2) its source section inferred from the part's
// family/category/id provenance, then (3) UNKNOWN ⇒ fetch-only (dropped).

import type {
  PartCandidate,
  IngestRunReport,
} from './contracts';
import type { LicenseClass } from '../../src/shared/parts/types';
import {
  guessCategory,
  isPartCategory,
} from '../../src/shared/parts/taxonomy';
import {
  STEP_PARTS_BASE_URL,
  mapStepPartsRecord,
  type StepPartsRecord,
} from '../../src/modeling/parts/stepPartsAdapter';

const NOTICES_URL =
  'https://raw.githubusercontent.com/earthtojake/step.parts/main/THIRD_PARTY_NOTICES.md';

const STEP_PARTS_REPO = 'github.com/earthtojake/step.parts';

/** A catalog index item (the per-part summary in parts.index.json `items`). */
interface CatalogIndexItem extends StepPartsRecord {
  // index items carry id/name/category/family/standard/tags/aliases/pageUrl;
  // stepUrl + sha256 may be supplied (e.g. in fixtures / future index versions)
  // and are passed straight through if present.
  sourceKey?: string;
}

interface CatalogIndex {
  catalog?: { version?: string; sha256?: string; lastModified?: string };
  fields?: string[];
  items: CatalogIndexItem[];
}

/**
 * Classify an SPDX-ish license string into a redistribution LicenseClass.
 *   permissive  — MIT / BSD / Apache / CC0 / CC-BY (no SA/NC/ND) / ISC / Unlicense
 *   share-alike — CC-BY-SA / CERN-OHL / GPL / LGPL / MPL
 *   fetch-only  — CC*NC* / CC*ND* / 'unknown' / empty
 */
export function classifyLicense(spdx: string | undefined | null): LicenseClass {
  const s = (spdx ?? '').trim().toUpperCase();
  if (s.length === 0 || s === 'UNKNOWN' || s === 'NONE' || s === 'NOASSERTION') {
    return 'fetch-only';
  }
  // Non-commercial / no-derivatives are never mirrorable, regardless of base.
  if (/\bNC\b/.test(s) || s.includes('-NC') || s.includes('NONCOMMERCIAL')) {
    return 'fetch-only';
  }
  if (/\bND\b/.test(s) || s.includes('-ND') || s.includes('NODERIV')) {
    return 'fetch-only';
  }
  // Share-alike / copyleft.
  if (
    s.includes('-SA') ||
    s.includes('SHAREALIKE') ||
    s.includes('CERN-OHL') ||
    s.includes('GPL') || // covers GPL / LGPL / AGPL
    s.includes('MPL') ||
    s.includes('EPL')
  ) {
    return 'share-alike';
  }
  // Permissive.
  if (
    s.includes('MIT') ||
    s.includes('BSD') ||
    s.includes('APACHE') ||
    s.includes('CC0') ||
    s.includes('CC-BY') || // BY without SA/NC/ND fell through to here ⇒ permissive
    s.includes('CC BY') ||
    s.includes('ISC') ||
    s.includes('UNLICENSE') ||
    s.includes('ZLIB') ||
    s.includes('PUBLIC DOMAIN')
  ) {
    return 'permissive';
  }
  // Anything unrecognized is treated as not-known-safe to mirror.
  return 'fetch-only';
}

/**
 * Parse THIRD_PARTY_NOTICES.md into license-resolution tables.
 *
 * Returns two maps:
 *   byId     — explicit `partId: SPDX` lines (rare/future; matched first).
 *   bySource — per-source-section SPDX, keyed by a normalized source token
 *              ('kicad', 'freecad-library', 'adafruit', 'sparkfun', ...).
 * Also returns `defaultSpdx` — the repo-level/original-material license (MIT)
 * used as the last resort before UNKNOWN.
 *
 * Parsing is intentionally tolerant: it scans line-by-line, tracks the current
 * `###`/`##` section heading, and records the first SPDX-looking token within
 * that section. Unknown shapes simply yield empty maps (everything → fetch-only).
 */
export function parseThirdPartyNotices(md: string): {
  byId: Map<string, string>;
  bySource: Map<string, string>;
  defaultSpdx: string | undefined;
} {
  const byId = new Map<string, string>();
  const bySource = new Map<string, string>();
  let defaultSpdx: string | undefined;

  // SPDX expression: letters/digits and . - + with optional `WITH exception`.
  const spdxRe =
    /\b((?:CC0|CC[\s-]?BY(?:[\s-]?SA|[\s-]?NC|[\s-]?ND)*(?:[\s-]?\d(?:\.\d)?)?|MIT|BSD-[0-9]-Clause|BSD|Apache-2\.0|Apache|GPL-[0-9]\.[0-9](?:-or-later|-only)?|LGPL-[0-9]\.[0-9]|AGPL-[0-9]\.[0-9]|MPL-[0-9]\.[0-9]|MPL|CERN-OHL(?:-[A-Z])?-[0-9]\.[0-9]|ISC|Unlicense|Zlib)(?:\s+WITH\s+[\w.-]+)?)\b/i;

  let currentSection: string | null = null;
  for (const rawLine of md.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0) continue;

    // Section heading (## or ###). Normalize to a lowercase source token.
    const heading = line.match(/^#{2,4}\s+(.*)$/);
    if (heading) {
      currentSection = normalizeSourceToken(heading[1]);
      continue;
    }

    const spdxMatch = line.match(spdxRe);
    const spdx = spdxMatch ? spdxMatch[1].replace(/\s+/g, '-') : undefined;

    // Explicit per-part line: `someId: SPDX` or `| someId | SPDX |`.
    const idLine = line.match(/^[|\s]*([a-z0-9][a-z0-9._-]{2,})\s*[:|]\s*(.+)$/i);
    if (idLine && spdx && looksLikePartId(idLine[1])) {
      byId.set(idLine[1].toLowerCase(), spdx);
      continue;
    }

    // Per-source SPDX inside a known section (first SPDX in the section wins).
    if (spdx && currentSection) {
      if (!bySource.has(currentSection)) bySource.set(currentSection, spdx);
      // The "original / not based on third-party" section defines the default.
      if (
        defaultSpdx === undefined &&
        (currentSection.includes('original') ||
          currentSection.includes('project-material') ||
          currentSection.includes('first-party'))
      ) {
        defaultSpdx = spdx;
      }
    } else if (spdx && currentSection === null && defaultSpdx === undefined) {
      // Top-of-file MIT statement before any section.
      if (/license/i.test(line) && spdx.toUpperCase().includes('MIT')) {
        defaultSpdx = spdx;
      }
    }
  }

  return { byId, bySource, defaultSpdx };
}

function normalizeSourceToken(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[`*]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function looksLikePartId(s: string): boolean {
  // Part ids are snake/kebab tokens, not prose words like "License" or "Source".
  return /[_-]/.test(s) || /\d/.test(s);
}

/** Source tokens we can infer for a step.parts item, used to hit bySource. */
function inferSourceTokens(item: CatalogIndexItem): string[] {
  const tokens: string[] = [];
  if (item.sourceKey) tokens.push(normalizeSourceToken(item.sourceKey));
  const blob = `${item.id} ${item.family} ${item.category} ${(item.tags ?? []).join(' ')}`.toLowerCase();
  // Heuristic source attribution from the part's provenance fingerprint.
  if (/kicad/.test(blob)) tokens.push('kicad', 'kicad-packages3d');
  if (/freecad/.test(blob)) tokens.push('freecad', 'freecad-library');
  if (/adafruit/.test(blob)) tokens.push('adafruit', 'adafruit-cad-parts');
  if (/sparkfun/.test(blob)) tokens.push('sparkfun');
  return tokens;
}

function resolveSpdx(
  item: CatalogIndexItem,
  tables: ReturnType<typeof parseThirdPartyNotices>,
): string | undefined {
  // 1. Explicit per-part override.
  const direct = tables.byId.get(item.id.toLowerCase());
  if (direct) return direct;
  // 2. An inline per-item license field (fixtures / future index versions).
  const inline = (item as unknown as { license?: string }).license;
  if (typeof inline === 'string' && inline.length > 0) return inline;
  // 3. Per-source section.
  for (const tok of inferSourceTokens(item)) {
    const hit = tables.bySource.get(tok);
    if (hit) return hit;
  }
  // No positive license signal. The repo-level default (`tables.defaultSpdx`,
  // MIT) covers only step.parts' OWN original material — it must NOT blanket
  // every unattributed part, or we'd mirror geometry whose provenance we can't
  // prove. So an unresolved part is UNKNOWN ⇒ fetch-only ⇒ dropped.
  return undefined;
}

/** Pick a robotics-taxonomy category, preferring the source's own when valid. */
function resolveCategory(item: CatalogIndexItem): string {
  if (isPartCategory(item.category)) return item.category;
  const hint = `${item.name} ${item.family} ${(item.tags ?? []).join(' ')} ${item.id}`;
  return guessCategory(hint);
}

export interface IngestStepPartsOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  limit?: number;
}

/**
 * Ingest the step.parts catalog into PartCandidate[] (redistributable subset).
 *
 * 1. GET `${baseUrl}/v1/catalog/parts.index.json`.
 * 2. GET THIRD_PARTY_NOTICES.md → license-resolution tables.
 * 3. Classify each part; drop fetch-only (NC/ND/unknown), count them.
 * 4. Map the kept parts via `mapStepPartsRecord`, stamping licenseClass,
 *    redistribution:'mirror', upstream provenance, stepUrl, attribution, and
 *    a robotics-taxonomy category.
 * 5. Fill the IngestRunReport.
 */
export async function ingestStepParts(opts: IngestStepPartsOptions = {}): Promise<{
  candidates: PartCandidate[];
  report: IngestRunReport;
}> {
  const baseUrl = opts.baseUrl ?? STEP_PARTS_BASE_URL;
  const doFetch = opts.fetchImpl ?? fetch;

  const report: IngestRunReport = {
    source: 'step-parts',
    ingested: 0,
    skippedUnparseable: 0,
    droppedForLicense: 0,
    deduped: 0,
    connectorless: 0,
    errors: [],
  };
  const candidates: PartCandidate[] = [];

  // 1. Catalog index.
  let index: CatalogIndex;
  try {
    const res = await doFetch(`${baseUrl}/v1/catalog/parts.index.json`);
    if (!res.ok) {
      report.errors.push(`catalog index HTTP ${res.status}`);
      return { candidates, report };
    }
    index = (await res.json()) as CatalogIndex;
  } catch (err) {
    report.errors.push(`catalog index fetch failed: ${String(err)}`);
    return { candidates, report };
  }

  const items = Array.isArray(index?.items) ? index.items : [];
  if (items.length === 0) {
    report.errors.push('catalog index had no items');
    return { candidates, report };
  }

  // 2. License tables.
  let tables: ReturnType<typeof parseThirdPartyNotices> = {
    byId: new Map(),
    bySource: new Map(),
    defaultSpdx: undefined,
  };
  try {
    const res = await doFetch(NOTICES_URL);
    if (res.ok) {
      tables = parseThirdPartyNotices(await res.text());
    } else {
      report.errors.push(`THIRD_PARTY_NOTICES HTTP ${res.status} (licenses → unknown)`);
    }
  } catch (err) {
    report.errors.push(`THIRD_PARTY_NOTICES fetch failed: ${String(err)}`);
  }

  const upstreamCommit = index.catalog?.version ?? index.catalog?.sha256 ?? 'main';
  const limit = opts.limit;
  const seen = new Set<string>();

  for (const item of items) {
    if (limit !== undefined && candidates.length >= limit) break;
    if (!item || typeof item.id !== 'string' || item.id.length === 0) {
      report.skippedUnparseable++;
      continue;
    }

    const spdx = resolveSpdx(item, tables);
    const licenseClass = classifyLicense(spdx);

    // Drop the non-redistributable subset.
    if (licenseClass === 'fetch-only') {
      report.droppedForLicense++;
      continue;
    }

    if (seen.has(item.id)) {
      report.deduped++;
      continue;
    }
    seen.add(item.id);

    const base = mapStepPartsRecord(item);
    const category = resolveCategory(item);
    const stepUrl =
      item.stepUrl ?? base.stepUrl ?? `${baseUrl}/v1/parts/${item.id}/step`;
    const attribution =
      base.attribution ?? item.pageUrl ?? `https://www.step.parts/parts/${item.id}`;

    const candidate: PartCandidate = {
      id: base.id,
      name: base.name,
      category,
      family: base.family,
      tags: base.tags,
      attributes: base.attributes,
      license: spdx ?? base.license,
      licenseClass,
      attribution,
      redistribution: 'mirror',
      upstream: {
        repo: STEP_PARTS_REPO,
        commit: upstreamCommit,
        path: item.id,
      },
      stepUrl,
    };
    if (base.standard !== undefined) candidate.standard = base.standard;

    candidates.push(candidate);
    report.ingested++;
    report.connectorless++; // connectors are synthesized later, at fetch time
  }

  return { candidates, report };
}
