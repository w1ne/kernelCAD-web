// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/findPart.ts
//
// Discovery tier. Local-only by default; remote merges when partsBaseUrl
// is configured AND source !== 'local'.

import { loadCatalog, queryCatalog, type QueryOpts } from './catalog';
import { remoteFindParts, RemoteDisabledError } from './remoteClient';
import type { LicenseClass, PartRecord } from '../../shared/parts/types';

export interface FindPartOpts {
  category?: string;
  family?: string;
  standard?: string;
  tag?: string;
  limit?: number;
  source?: 'local' | 'remote' | 'auto';
  partsBaseUrl?: string;
  /** Restrict results to records of this redistribution license class. Records
   *  with NO licenseClass are treated as 'permissive' (the bundled catalog). */
  licenseClass?: LicenseClass;
}

/** A record's effective license class — absent ⇒ 'permissive' (bundled catalog). */
function effectiveLicenseClass(r: PartRecord): LicenseClass {
  return r.licenseClass ?? 'permissive';
}

function filterByLicenseClass(
  records: PartRecord[],
  licenseClass: LicenseClass | undefined,
): PartRecord[] {
  if (licenseClass === undefined) return records;
  return records.filter((r) => effectiveLicenseClass(r) === licenseClass);
}

function buildCatalogQueryOpts(opts: FindPartOpts): QueryOpts {
  return {
    ...(opts.category !== undefined ? { category: opts.category } : {}),
    ...(opts.family !== undefined ? { family: opts.family } : {}),
    ...(opts.standard !== undefined ? { standard: opts.standard } : {}),
    ...(opts.tag !== undefined ? { tag: opts.tag } : {}),
    ...(opts.limit !== undefined ? { limit: opts.limit } : {}),
  };
}

function remotePartsConfigured(opts: FindPartOpts): boolean {
  return (
    (opts.partsBaseUrl !== undefined && opts.partsBaseUrl.length > 0) ||
    (process.env.KERNELCAD_PARTS_BASE_URL !== undefined &&
      process.env.KERNELCAD_PARTS_BASE_URL.length > 0)
  );
}

function remoteFindPartsFor(query: string, opts: FindPartOpts) {
  return remoteFindParts({
    query,
    ...(opts.partsBaseUrl !== undefined
      ? { partsBaseUrl: opts.partsBaseUrl }
      : {}),
  });
}

function localOnlyResult(
  local: PartRecord[],
  remoteEnabled: boolean,
): FindPartResult {
  return {
    results: local,
    totalMatches: local.length,
    source: 'local',
    remoteEnabled,
  };
}

function mergeRemoteResults(
  local: PartRecord[],
  remoteResults: PartRecord[],
): PartRecord[] {
  const merged = [...local];
  for (const r of remoteResults) {
    if (!merged.find((m) => m.id === r.id)) merged.push(r);
  }
  return merged;
}

export interface FindPartResult {
  results: PartRecord[];
  totalMatches: number;
  source: 'local' | 'remote' | 'merged';
  remoteEnabled: boolean;
}

export async function findPartHost(
  query: string,
  opts: FindPartOpts = {},
): Promise<FindPartResult> {
  const source = opts.source ?? 'auto';
  const catalog = loadCatalog();
  const local = filterByLicenseClass(
    queryCatalog(catalog, query, buildCatalogQueryOpts(opts)),
    opts.licenseClass,
  );
  const remoteCandidate = remotePartsConfigured(opts);

  if (source === 'local') {
    return localOnlyResult(local, remoteCandidate);
  }
  if (source === 'remote') {
    const remote = await remoteFindPartsFor(query, opts);
    const results = filterByLicenseClass(remote.results, opts.licenseClass);
    return {
      results,
      totalMatches:
        opts.licenseClass !== undefined ? results.length : remote.totalMatches,
      source: 'remote',
      remoteEnabled: true,
    };
  }
  // auto
  if (!remoteCandidate) {
    return localOnlyResult(local, false);
  }
  try {
    const remote = await remoteFindPartsFor(query, opts);
    const remoteResults = filterByLicenseClass(
      remote.results,
      opts.licenseClass,
    );
    const merged = mergeRemoteResults(local, remoteResults);
    return {
      results: merged.slice(0, opts.limit ?? 10),
      totalMatches: merged.length,
      source: 'merged',
      remoteEnabled: true,
    };
  } catch (e) {
    if (e instanceof RemoteDisabledError) {
      return localOnlyResult(local, false);
    }
    // Network / 5xx failures: fall back to local.
    return localOnlyResult(local, true);
  }
}
