// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/parts/types.ts
//
// PartRecord — the canonical metadata shape an agent sees for any catalog
// entry (bundled or remote). Geometry lives separately (in the cache);
// PartRecord is the discovery + provenance handle.

export type PartSource = 'local-catalog' | 'remote';

/**
 * How a part's license governs redistribution of its geometry.
 * - 'permissive'   — MIT/BSD/Apache/CC0/CC-BY: re-host freely (attribution kept).
 * - 'share-alike'  — CC-BY-SA / CERN-OHL / GPL: re-host with copyleft obligations;
 *                    kept in an attributed partition, served behind a legal gate.
 * - 'fetch-only'   — NC/ND/unlicensed/vendor-ToS: NEVER mirrored; fetch-by-URL only.
 */
export type LicenseClass = 'permissive' | 'share-alike' | 'fetch-only';

/** Whether kernelCAD re-hosts the geometry ('mirror') or only fetches it on demand. */
export type RedistributionMode = 'mirror' | 'fetch-only';

/** Where an ingested part came from, for provenance + attribution audit. */
export interface UpstreamProvenance {
  repo: string;
  commit: string;
  path: string;
}

export interface PartRecord {
  id: string;
  name: string;
  category: string;
  family: string;
  standard?: string;
  tags: string[];
  attributes: Record<string, number | string>;
  sha256: string;
  source: PartSource;
  license: string;
  attribution?: string;
  connectors: string[];
  stepUrl?: string;
  /** License class governing redistribution. Optional for back-compat with the
   *  pre-ingestion bundled catalog (those records are implicitly 'permissive'). */
  licenseClass?: LicenseClass;
  /** Mirror vs fetch-only. Optional; absent ⇒ bundled/local ('mirror'). */
  redistribution?: RedistributionMode;
  /** Provenance for ingested (mirrored) parts. */
  upstream?: UpstreamProvenance;
}

export function isLicenseClass(v: unknown): v is LicenseClass {
  return v === 'permissive' || v === 'share-alike' || v === 'fetch-only';
}

export function isPartRecord(v: unknown): v is PartRecord {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  if (typeof r.id !== 'string' || r.id.length === 0) return false;
  if (typeof r.name !== 'string') return false;
  if (typeof r.category !== 'string') return false;
  if (typeof r.family !== 'string') return false;
  if (!Array.isArray(r.tags)) return false;
  if (typeof r.attributes !== 'object' || r.attributes === null) return false;
  if (typeof r.sha256 !== 'string') return false;
  if (r.source !== 'local-catalog' && r.source !== 'remote') return false;
  if (typeof r.license !== 'string') return false;
  if (!Array.isArray(r.connectors)) return false;
  if (r.licenseClass !== undefined && !isLicenseClass(r.licenseClass)) return false;
  if (
    r.redistribution !== undefined &&
    r.redistribution !== 'mirror' &&
    r.redistribution !== 'fetch-only'
  ) {
    return false;
  }
  return true;
}
