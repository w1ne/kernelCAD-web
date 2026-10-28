// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Attach per-feature `bolt-holes-N` autos. Each feature still numbers from 1
// in (u, v) order; `holeAxisAutoConnectorsForShape` renumbers across the
// part when the connectors are promoted.

import type { CaptureSession } from './captureSession';
import {
  generateBoltHoleConnectors,
  holeAxisQueryName,
  type HoleCenter,
} from '../parts/holeAutoConnectors';

function depthMm(depth: number | 'through' | undefined): number {
  return typeof depth === 'number' ? depth : 0;
}

function partNameOf(metadata: Record<string, unknown>, shapeId: string): string {
  return typeof metadata.partName === 'string' ? metadata.partName : shapeId;
}

export function attachSingleHoleConnectors(
  session: CaptureSession,
  shapeId: string,
  metadata: Record<string, unknown>,
  resolved: { at?: unknown; u: number; v: number; depth?: number | 'through' },
): void {
  const center: HoleCenter = {
    u: resolved.at ? 0 : resolved.u,
    v: resolved.at ? 0 : resolved.v,
    depthMm: depthMm(resolved.depth),
    axis: [0, 0, -1],
    holeRef: holeAxisQueryName('hole', metadata),
  };
  session.attachAutoConnectors(
    shapeId,
    generateBoltHoleConnectors([center], { partName: partNameOf(metadata, shapeId) }),
  );
}

export function attachHolesConnectors(
  session: CaptureSession,
  shapeId: string,
  metadata: Record<string, unknown>,
  resolved: { positions: Array<{ u: number; v: number }>; depth?: number | 'through' },
): void {
  const depth = depthMm(resolved.depth);
  const centers: HoleCenter[] = resolved.positions.map((position, index) => ({
    u: position.u,
    v: position.v,
    depthMm: depth,
    axis: [0, 0, -1],
    holeRef: holeAxisQueryName('holes', metadata, index),
  }));
  session.attachAutoConnectors(
    shapeId,
    generateBoltHoleConnectors(centers, { partName: partNameOf(metadata, shapeId) }),
  );
}
