// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/parts/connectorManifest.ts
//
// Node-only sidecar JSON loader for bundled STEP files. Browser-safe manifest
// types and validation live in connectorManifestSchema.ts.

import { readFileSync } from 'node:fs';
import {
  validateConnectorManifest,
  type ConnectorManifest,
} from './connectorManifestSchema';

export {
  validateConnectorManifest,
  validateHashBoundConnectorManifest,
  type ConnectorAxisEntry,
  type ConnectorEntry,
  type ConnectorFrameEntry,
  type ConnectorManifest,
  type ConnectorManifestBinding,
  type ConnectorType,
  type HashBoundConnectorManifest,
} from './connectorManifestSchema';

export function loadConnectorManifest(path: string): ConnectorManifest {
  const raw = readFileSync(path, 'utf8');
  const json = JSON.parse(raw) as ConnectorManifest;
  validateConnectorManifest(json);
  return json;
}
