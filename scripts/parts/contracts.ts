// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/contracts.ts
//
// Shared seams for the parts ingestion-at-scale pipeline. The source registry,
// the ingestion engine, the step.parts adapter, and the mirror store all build
// against these interfaces so the pieces compose without coupling.

import type {
  LicenseClass,
  RedistributionMode,
  PartRecord,
  UpstreamProvenance,
} from '../../src/shared/parts/types';
import type { PartCategory } from '../../src/shared/parts/taxonomy';

/** Which ingest path a source uses. */
export type IngestAdapter = 'step-passthrough' | 'step-parts' | 'github-glob';

/** How a source's per-part license is resolved (when not uniform across the source). */
export type PerPartLicenseMode = 'third-party-notices' | 'spdx-header';

/** One entry in the source registry (the machine-readable form of the sweep). */
export interface PartSourceEntry {
  /** Stable id, e.g. 'step-parts', 'freecad-library', 'adafruit-cad'. */
  id: string;
  /** Canonical upstream URL. */
  repo: string;
  /** Pinned SHA / tag for reproducible ingest. */
  commit: string;
  licenseClass: LicenseClass;
  redistribution: RedistributionMode;
  /** SPDX id, or 'mixed-per-part' when resolved via perPartLicense. */
  license: string;
  /** Attribution applied to every part unless a per-part override exists. */
  attribution: string;
  adapter: IngestAdapter;
  /** Path globs for STEP files within the source. */
  include: string[];
  exclude?: string[];
  /** Upstream-dir → kernelCAD category hint; unmapped parts use keyword heuristics. */
  categoryMap?: Record<string, PartCategory>;
  /** How to resolve per-part licenses; null/undefined ⇒ use the source-level license. */
  perPartLicense?: PerPartLicenseMode | null;
  /** Requires legal sign-off before being served live (e.g. CC-BY-SA collections). */
  legalHold?: boolean;
}

/**
 * A part discovered by an adapter, BEFORE geometry-derived fields (sha256,
 * connectors) are computed. The engine turns candidates into IngestedParts by
 * fetching the STEP bytes, inspecting, synthesizing connectors, and mirroring.
 * The bytes come from `stepUrl` (remote: step.parts / github-raw) or `stepPath`
 * (a locally-cloned file).
 */
export interface PartCandidate {
  id: string;
  name: string;
  category: PartCategory | string;
  family: string;
  standard?: string;
  tags: string[];
  attributes: Record<string, number | string>;
  license: string;
  licenseClass: LicenseClass;
  attribution?: string;
  redistribution: RedistributionMode;
  upstream: UpstreamProvenance;
  stepUrl?: string;
  stepPath?: string;
}

/** A part produced by the ingestion engine: record + (for mirrored parts) STEP bytes. */
export interface IngestedPart {
  record: PartRecord;
  /** Present only for redistribution:'mirror'; absent for fetch-only. */
  stepBytes?: Uint8Array;
}

/**
 * Pluggable, content-addressed mirror store. Local-fs impl for tests/dev,
 * Cloudflare R2 impl for prod. Keyed by sha256 ⇒ automatic global dedup.
 */
export interface MirrorStore {
  /** Idempotently store STEP bytes under the sha256 key; returns the public URL/key. */
  put(sha256: string, bytes: Uint8Array): Promise<string>;
  has(sha256: string): Promise<boolean>;
}

/** Per-source ingest accounting — surfaced in the run report, never silently dropped. */
export interface IngestRunReport {
  source: string;
  ingested: number;
  skippedUnparseable: number;
  droppedForLicense: number;
  deduped: number;
  connectorless: number;
  errors: string[];
}
