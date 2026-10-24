// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Attach a catalog part's connectors to a captured shape: the exact frozen
// catalog entries plus the legacy discovery projection (`autoConnectors`)
// that connector listing and mates read. Shared by the STEP import
// (fetchPart.ts) and the in-memory builder (envelopePart.ts); no node:
// imports, so the browser path can use it.

import { formatTopoRef } from '../../kernel/naming';
import type { ConnectorEntry } from '../../shared/parts/connectorManifestSchema';
import type { CaptureSession } from '../capture/captureSession';

export function attachPartConnectors(
  session: CaptureSession,
  shapeId: string,
  connectors: readonly ConnectorEntry[],
): string[] {
  session.attachCatalogConnectors(shapeId, connectors);
  const projected = connectors.map((c) => ({
    name: c.name,
    ref: formatTopoRef({ owner: shapeId, kind: 'connector', segments: [c.name] }),
    origin: c.origin,
    axis: c.type === 'axis' ? c.axis : c.normal,
    type: 'frame' as const,
  }));
  session.attachAutoConnectors(shapeId, projected);
  return projected.map((connector) => connector.name);
}
