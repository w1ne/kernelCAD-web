// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/parts/types.ts
//
// PartRecord — the canonical metadata shape an agent sees for any catalog
// entry (bundled or remote). Geometry lives separately (in the cache);
// PartRecord is the discovery + provenance handle.

export type PartSource = 'local-catalog' | 'remote';

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
  return true;
}
