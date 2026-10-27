// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/holeAutoConnectors.ts
//
// Bracket-side auto-connector rule: any hole feature emits a `bolt-holes-N`
// connector. The numeric origin stays the historical face-local bottom-face
// point. When `holeRef` is set, the connector also carries a `hole-axis`
// topology query (entry-face mouth + into-body axis) so mates re-resolve
// after a param edit. Numbering is by (u, v) so the same script emits the
// same connector names across re-runs.

import { formatTopoRef } from '../../kernel/naming';
import type { FeatureRecord } from '../../shared/intent/featureRecord';

export interface HoleCenter {
  /** Face-local U coordinate, mm. */
  u: number;
  /** Face-local V coordinate, mm. */
  v: number;
  /** Through-axis vector (typically -Z in face-local frame). */
  axis: [number, number, number];
  /** Hole depth, mm — used to place the historical bottom-face origin. */
  depthMm: number;
  /** Stable `hole-axis` query name for this hole. Survives the (u, v) sort. */
  holeRef?: string;
}

export interface AutoConnector {
  name: string;
  ref: string;
  origin: [number, number, number];
  axis: [number, number, number];
  type: 'frame';
  /** Preferred mate origin. Catalog STEP connectors leave this unset. */
  topology?: { kind: 'hole-axis'; name: string };
}

export interface AutoConnectorOpts {
  partName: string;
}

export function generateBoltHoleConnectors(
  holes: ReadonlyArray<HoleCenter>,
  opts: AutoConnectorOpts,
): AutoConnector[] {
  const sorted = [...holes].sort((a, b) => a.u - b.u || a.v - b.v);
  return sorted.map((h, idx) => {
    const n = idx + 1;
    const name = `bolt-holes-${n}`;
    // Bottom face of the hole: depth along the through-axis from the face plane.
    const origin: [number, number, number] = [h.u, h.v, -h.depthMm];
    return {
      name,
      ref: formatTopoRef({
        owner: opts.partName,
        kind: 'connector',
        segments: [name],
      }),
      origin,
      axis: h.axis,
      type: 'frame',
      ...(h.holeRef !== undefined
        ? { topology: { kind: 'hole-axis' as const, name: h.holeRef } }
        : {}),
    };
  });
}

/** Query name shared by emission and resolution.
 *  Unnamed `.hole()` → `hole<ordinal>` (`hole1`). Named → the feature name.
 *  `.holes()` → `<base>[i]` with `i` the authored position index. */
export function holeAxisQueryName(
  kind: 'hole' | 'holes',
  metadata: Record<string, unknown> | undefined,
  index?: number,
): string {
  const named = typeof metadata?.name === 'string' ? metadata.name : undefined;
  const ordinal = typeof metadata?.ordinal === 'number' ? metadata.ordinal : 1;
  if (kind === 'hole') return named ?? `hole${ordinal}`;
  return `${named ?? `holes${ordinal}`}[${index ?? 0}]`;
}

/** Feature ids from `startId` back through `target` / `shape` / `base`. */
export function ancestorFeatureIds(records: readonly FeatureRecord[], startId: string): string[] {
  const byId = new Map(records.map((record) => [record.id, record]));
  const order: string[] = [];
  const visited = new Set<string>();
  let current: string | undefined = startId;
  while (current !== undefined && !visited.has(current)) {
    visited.add(current);
    order.push(current);
    current = parentFeatureId(byId.get(current));
  }
  return order;
}

function parentFeatureId(record: FeatureRecord | undefined): string | undefined {
  const inputs = record?.inputs;
  if (!inputs) return undefined;
  for (const key of ['target', 'shape', 'base'] as const) {
    const ref = inputs[key];
    if (ref?.kind === 'feature') return ref.id;
  }
  for (const ref of Object.values(inputs)) {
    if (ref.kind === 'feature') return ref.id;
  }
  return undefined;
}

function isHoleAxisAuto(raw: unknown): raw is AutoConnector & { topology: { kind: 'hole-axis'; name: string } } {
  if (typeof raw !== 'object' || raw === null) return false;
  const connector = raw as AutoConnector;
  return typeof connector.name === 'string'
    && connector.topology?.kind === 'hole-axis'
    && typeof connector.topology.name === 'string';
}

/** Hole-axis auto connectors on `shapeId` or an ancestor feature. Nearest wins. */
export function holeAxisAutoConnectorsForShape(
  records: readonly FeatureRecord[],
  autoConnectors: ReadonlyMap<string, ReadonlyArray<unknown>>,
  shapeId: string,
): Array<AutoConnector & { topology: { kind: 'hole-axis'; name: string } }> {
  const out: Array<AutoConnector & { topology: { kind: 'hole-axis'; name: string } }> = [];
  const seen = new Set<string>();
  for (const id of ancestorFeatureIds(records, shapeId)) {
    for (const raw of autoConnectors.get(id) ?? []) {
      if (!isHoleAxisAuto(raw) || seen.has(raw.name)) continue;
      seen.add(raw.name);
      out.push(raw);
    }
  }
  return out;
}
