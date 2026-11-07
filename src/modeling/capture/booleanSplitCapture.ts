// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// shape.split keeps the overlap and both leftovers. The capture Scene lists
// the three candidate handles so `.part(name)` works while authoring. The
// lowered SceneBackend omits a fragment whose volume is ≤ 1e-6 mm³, so a
// dry-run part count is not the geometry.

import type { FeatureRef, Param } from '../../shared/intent/types';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import { Transform } from '../../shared/runtime/se3';
import { Scene } from '../validation/scene';
import type { CaptureSession } from './captureSession';
import type { Shape } from './proxy';

const SPLIT_KEEPS = ['parts', 'intersection', 'a_only', 'b_only'] as const;
export type SplitKeep = (typeof SPLIT_KEEPS)[number];
const FRAGMENTS = ['intersection', 'a_only', 'b_only'] as const;

const PARTS_EXAMPLE = 'box(20, 20, 20).split(box(20, 20, 20).translate(10, 0, 0))';
const SINGLE_EXAMPLE = "box(20, 20, 20).split(box(20, 20, 20).translate(10, 0, 0), { keep: 'intersection' })";

function isSplitKeep(value: unknown): value is SplitKeep {
  return typeof value === 'string' && (SPLIT_KEEPS as readonly string[]).includes(value);
}

function quote(value: string): Param {
  return { expression: `'${value}'`, unit: 'unitless', evaluated: 0 };
}

function assertOperand(session: CaptureSession, path: string, shape: Shape): void {
  const kind = session.getRecords().find((record) => record.id === shape.id)?.kind;
  if (kind === undefined) {
    invalidArgs({
      api: 'shape.split(other, opts)',
      path,
      got: shape.id,
      requires: 'a Shape created in this script',
      example: PARTS_EXAMPLE,
    });
  }
  if (kind === 'importedMesh') {
    invalidArgs({
      api: 'shape.split(other, opts)',
      path,
      gotText: 'a display mesh body',
      requires: 'BRep geometry; display mesh bodies do not support split',
      example: PARTS_EXAMPLE,
    });
  }
}

function resolveKeep(opts: { keep?: SplitKeep } | undefined): SplitKeep {
  const keep = opts?.keep ?? 'parts';
  if (isSplitKeep(keep)) return keep;
  invalidArgs({
    api: 'shape.split(other, opts)',
    path: 'opts.keep',
    got: opts?.keep,
    showType: true,
    requires: "'parts', 'intersection', 'a_only', or 'b_only'",
    example: SINGLE_EXAMPLE,
  });
}

function unavailableBbox(): never {
  invalidArgs({
    api: 'Scene.bbox',
    path: 'bbox',
    gotText: 'a capture-time split Scene',
    requires: 'part bounds from the lowered SceneBackend; capture-time bbox is not the solid measure',
    example: PARTS_EXAMPLE,
  });
}

function partsScene(session: CaptureSession, parent: Shape): Scene {
  const parts = FRAGMENTS.map((name) => ({
    name,
    shape: session.createShape({
      kind: 'booleanSplit',
      params: { keep: quote(name), fragment: quote(name) },
      inputs: { split: { kind: 'feature', id: parent.id } },
      metadata: { splitRole: 'fragment', fragment: name },
    }),
    worldTransform: Transform.identity(),
  }));
  return new Scene('split', parts, unavailableBbox, undefined, parent.id);
}

/** Register one `booleanSplit` record. `keep: 'parts'` also registers a handle per fragment. */
export function captureBooleanSplit(
  session: CaptureSession,
  base: Shape,
  tool: Shape,
  opts?: { keep?: SplitKeep },
): Shape | Scene {
  assertOperand(session, 'base', base);
  assertOperand(session, 'other', tool);
  const keep = resolveKeep(opts);
  const inputs: Record<string, FeatureRef> = {
    base: { kind: 'feature', id: base.id },
    tool: { kind: 'feature', id: tool.id },
  };
  const parent = session.createShape({
    kind: 'booleanSplit',
    params: { keep: quote(keep) },
    inputs,
    metadata: { splitRole: keep === 'parts' ? 'parts' : 'single' },
  });
  return keep === 'parts' ? partsScene(session, parent) : parent;
}
