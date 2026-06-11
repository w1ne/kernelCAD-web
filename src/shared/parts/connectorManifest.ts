// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/parts/connectorManifest.ts
//
// Sidecar JSON loaded next to each bundled STEP file. The loader rejects a
// file without `schemaVersion: 1`; the validator runs every connector
// `name` through assertTopoRefSafeName so a manifest that would later
// collide with the @kc[...] grammar fails AT BUILD TIME, not at runtime.

import { readFileSync } from 'node:fs';
import { assertTopoRefSafeName } from '../../kernel/naming';

export type ConnectorType = 'frame' | 'axis';

export interface ConnectorFrameEntry {
  name: string;
  type: 'frame';
  origin: [number, number, number];
  normal: [number, number, number];
}

export interface ConnectorAxisEntry {
  name: string;
  type: 'axis';
  origin: [number, number, number];
  axis: [number, number, number];
}

export type ConnectorEntry = ConnectorFrameEntry | ConnectorAxisEntry;

export interface ConnectorManifest {
  schemaVersion: 1;
  partId: string;
  family: string;
  connectors: ConnectorEntry[];
  license?: string;
  attribution?: string | null;
  generatedAt?: string;
}

export function validateConnectorManifest(m: ConnectorManifest): void {
  if (!m || typeof m !== 'object') throw new Error('manifest: not an object');
  if (m.schemaVersion !== 1) {
    throw new Error(
      `manifest: schemaVersion must be 1, got ${String(m.schemaVersion)}`,
    );
  }
  if (typeof m.partId !== 'string' || m.partId.length === 0) {
    throw new Error('manifest: partId required');
  }
  if (typeof m.family !== 'string' || m.family.length === 0) {
    throw new Error('manifest: family required');
  }
  if (!Array.isArray(m.connectors)) {
    throw new Error('manifest: connectors must be an array');
  }
  for (const c of m.connectors) {
    const entry = c as { name: string; type: unknown };
    // Throws KernelError if the name would conflict with the @kc[...] grammar.
    assertTopoRefSafeName(entry.name, 'connector-name', m.partId);
    if (entry.type !== 'frame' && entry.type !== 'axis') {
      throw new Error(
        `manifest: connector ${entry.name} type must be 'frame' or 'axis'`,
      );
    }
  }
}

export function loadConnectorManifest(path: string): ConnectorManifest {
  const raw = readFileSync(path, 'utf8');
  const json = JSON.parse(raw) as ConnectorManifest;
  validateConnectorManifest(json);
  return json;
}
