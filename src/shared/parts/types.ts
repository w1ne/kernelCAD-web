// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/parts/types.ts
//
// PartRecord — the canonical metadata shape an agent sees for any catalog
// entry (bundled or remote). Geometry lives separately (in the cache);
// PartRecord is the discovery + provenance handle.

import {
  validateHashBoundConnectorManifest,
  type ConnectorAxisEntry,
  type ConnectorEntry,
  type ConnectorFrameEntry,
  type HashBoundConnectorManifest,
} from './connectorManifestSchema';

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

type ReadonlyVector3 = readonly [number, number, number];

/** Deeply immutable connector entry retained on catalog-backed runtime metadata. */
export type CatalogConnectorEntry =
  | (Readonly<Omit<ConnectorFrameEntry, 'origin' | 'normal'>> & {
      readonly origin: ReadonlyVector3;
      readonly normal: ReadonlyVector3;
    })
  | (Readonly<Omit<ConnectorAxisEntry, 'origin' | 'axis'>> & {
      readonly origin: ReadonlyVector3;
      readonly axis: ReadonlyVector3;
    });

/** Deeply immutable manifest snapshot retained on catalog-backed runtime metadata. */
export type CatalogConnectorManifest =
  Readonly<Omit<HashBoundConnectorManifest, 'connectors'>> & {
    readonly connectors: readonly CatalogConnectorEntry[];
  };

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
  /** Authored connector frames, bound to this record's exact geometry digest. */
  connectorManifest?: HashBoundConnectorManifest;
  stepUrl?: string;
  /**
   * Display-mesh URL (GLB), when the catalog serves this part as a mesh instead
   * of BREP. The authored dev-board records (`*-board`, built by
   * scripts/buildBoardGlbs.ts) are GLB-only *by design*: their STEP is 4–27 MB
   * and the biggest exceeds Cloudflare Pages' 25 MiB per-file limit, so the
   * catalog drops `stepUrl` and serves `glbUrl`.
   *
   * A GLB is a triangle mesh, NOT a BREP body — kernelCAD's OCCT kernel has no
   * mesh-import lowerer, so a record with only `glbUrl` cannot be turned into a
   * Shape. `fetchPartHost` detects that case and fails with
   * `parts.fetch.geometry-not-brep` naming this field, rather than reporting a
   * generic "no stepUrl" API error.
   */
  glbUrl?: string;
  /** License class governing redistribution. Optional for back-compat with the
   *  pre-ingestion bundled catalog (those records are implicitly 'permissive'). */
  licenseClass?: LicenseClass;
  /** Mirror vs fetch-only. Optional; absent ⇒ bundled/local ('mirror'). */
  redistribution?: RedistributionMode;
  /** Provenance for ingested (mirrored) parts. */
  upstream?: UpstreamProvenance;
}

/**
 * Immutable catalog identity retained on an imported Shape's FeatureRecord.
 *
 * `lib.fetchPart()` intentionally returns a normal composable Shape, but the
 * Shape must not become anonymous just because the host facade has consumed
 * its internal `{ shape, record }` result.  This snapshot carries the package
 * identity, dimensions and provenance into the feature graph and, from there,
 * into assembly Scene parts and inspectors.
 */
export interface CatalogPartMetadata {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly family: string;
  readonly standard?: string;
  readonly tags: readonly string[];
  readonly attributes: Readonly<Record<string, number | string>>;
  readonly sha256: string;
  readonly source: PartSource;
  readonly license: string;
  readonly attribution?: string;
  readonly connectors: readonly string[];
  readonly connectorManifest?: CatalogConnectorManifest;
  readonly stepUrl?: string;
  readonly glbUrl?: string;
  readonly licenseClass?: LicenseClass;
  readonly redistribution?: RedistributionMode;
  readonly upstream?: Readonly<UpstreamProvenance>;
}

function snapshotVector3(vector: [number, number, number]): ReadonlyVector3 {
  const snapshot: [number, number, number] = [...vector];
  Object.freeze(snapshot);
  return snapshot;
}

function snapshotConnectorEntry(entry: ConnectorEntry): CatalogConnectorEntry {
  if (entry.type === 'frame') {
    const snapshot: CatalogConnectorEntry = {
      name: entry.name,
      type: 'frame',
      origin: snapshotVector3(entry.origin),
      normal: snapshotVector3(entry.normal),
    };
    Object.freeze(snapshot);
    return snapshot;
  }
  const snapshot: CatalogConnectorEntry = {
    name: entry.name,
    type: 'axis',
    origin: snapshotVector3(entry.origin),
    axis: snapshotVector3(entry.axis),
  };
  Object.freeze(snapshot);
  return snapshot;
}

/** Deep-copy nested connector data so runtime metadata cannot retain raw catalog references. */
function snapshotConnectorManifest(
  manifest: HashBoundConnectorManifest,
): CatalogConnectorManifest {
  const connectors: CatalogConnectorEntry[] = manifest.connectors.map(snapshotConnectorEntry);
  Object.freeze(connectors);
  const snapshot: CatalogConnectorManifest = {
    schemaVersion: manifest.schemaVersion,
    partId: manifest.partId,
    family: manifest.family,
    geometrySha256: manifest.geometrySha256,
    connectors,
    ...(manifest.license === undefined ? {} : { license: manifest.license }),
    ...(manifest.attribution === undefined ? {} : { attribution: manifest.attribution }),
    ...(manifest.generatedAt === undefined ? {} : { generatedAt: manifest.generatedAt }),
  };
  Object.freeze(snapshot);
  return snapshot;
}

/** Create a detached, frozen copy of a catalog record for runtime metadata. */
export function snapshotCatalogPart(record: PartRecord): CatalogPartMetadata {
  const snapshot: CatalogPartMetadata = {
    id: record.id,
    name: record.name,
    category: record.category,
    family: record.family,
    ...(record.standard === undefined ? {} : { standard: record.standard }),
    tags: Object.freeze([...record.tags]),
    attributes: Object.freeze({ ...record.attributes }),
    sha256: record.sha256,
    source: record.source,
    license: record.license,
    ...(record.attribution === undefined ? {} : { attribution: record.attribution }),
    connectors: Object.freeze([...record.connectors]),
    ...(record.connectorManifest === undefined
      ? {}
      : { connectorManifest: snapshotConnectorManifest(record.connectorManifest) }),
    ...(record.stepUrl === undefined ? {} : { stepUrl: record.stepUrl }),
    ...(record.glbUrl === undefined ? {} : { glbUrl: record.glbUrl }),
    ...(record.licenseClass === undefined ? {} : { licenseClass: record.licenseClass }),
    ...(record.redistribution === undefined ? {} : { redistribution: record.redistribution }),
    ...(record.upstream === undefined
      ? {}
      : { upstream: Object.freeze({ ...record.upstream }) }),
  };
  return Object.freeze(snapshot);
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
  if (
    !Array.isArray(r.connectors) ||
    !r.connectors.every((connector) => typeof connector === 'string')
  ) {
    return false;
  }
  if (r.connectorManifest !== undefined) {
    try {
      const manifest = r.connectorManifest;
      validateHashBoundConnectorManifest(
        manifest,
        {
          partId: r.id,
          family: r.family,
          geometrySha256: r.sha256,
        },
      );
      const manifestConnectorNames = manifest.connectors.map((connector) => connector.name);
      if (
        r.connectors.length !== manifestConnectorNames.length ||
        r.connectors.some((connector, index) => connector !== manifestConnectorNames[index])
      ) {
        return false;
      }
    } catch {
      return false;
    }
  }
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
