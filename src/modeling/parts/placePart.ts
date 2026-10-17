// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// lib.part and lib.stack. A catalog STEP is used when the file is on disk.
// Otherwise the envelope is built in memory, which is what the browser can do.
// The catalog modules pull node:fs, so they are imported only when a filesystem
// is installed.

import { getHostFs, hasHostFs } from '../../shared/runtime/hostFs';
import type { Shape } from '../capture/proxy';
import type { CaptureSession } from '../capture/captureSession';
import {
  planStack,
  resolvePart,
  type PartRequest,
  type StackRequest,
} from './familyTable';
import { synthesizeEnvelope } from './envelopePart';

export interface PlaceCtx {
  session: CaptureSession;
  scriptDir?: string;
}

export interface PlacedStack {
  lengthMm: number;
  screw: Shape;
  headWasher?: Shape;
  tailWasher?: Shape;
  nut?: Shape;
}

async function shapeFor(ctx: PlaceCtx, request: PartRequest): Promise<Shape> {
  const part = resolvePart(request);
  if (hasHostFs()) {
    const fs = getHostFs();
    const { loadCatalog, resolveById } = await import('./catalog');
    const hit = resolveById(loadCatalog(), part.id);
    if (hit && fs?.fileExists(hit.stepPath)) {
      const { fetchPartHost } = await import('./fetchPart');
      const fetched = await fetchPartHost(ctx, part.id, { strict: true });
      return fetched.shape;
    }
  }
  return synthesizeEnvelope(ctx, part);
}

export async function placePart(ctx: PlaceCtx, request: PartRequest): Promise<Shape> {
  return shapeFor(ctx, request);
}

export async function placeStack(ctx: PlaceCtx, request: StackRequest): Promise<PlacedStack> {
  const plan = planStack(request);
  const placed: PlacedStack = {
    lengthMm: plan.lengthMm,
    screw: undefined as unknown as Shape,
  };
  for (const member of plan.members) {
    const shape = await shapeFor(ctx, {
      family: member.part.family,
      thread: member.part.thread,
      ...(member.part.kind === 'screw' ? { lengthMm: member.part.lengthMm } : {}),
    });
    if (member.offsetZ !== 0) shape.translate(0, 0, member.offsetZ);
    if (member.role === 'screw') placed.screw = shape;
    else if (member.role === 'head-washer') placed.headWasher = shape;
    else if (member.role === 'tail-washer') placed.tailWasher = shape;
    else placed.nut = shape;
  }
  return placed;
}
