// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/edits/shapeDraft.ts
//
// Insert a `const <binding> = <shape>.draft(angle, opts)` statement into a
// .kcad.ts script immediately before the last top-level return.

import { addFeature } from './addFeature';
import type { AddFeatureResult } from './addFeature';
import { isValidIdentifier, bindingExists } from './sourceEditUtils';

export interface ShapeDraftInput {
  /** Current .kcad.ts source. */
  code: string;
  /** JS variable name of the Shape to draft (must be declared in source). */
  shape_binding: string;
  /** Draft angle in degrees (0–90). */
  angle_deg: number;
  /**
   * Face selector — canonical name, user label, or FaceQuery descriptor string.
   * Passed verbatim to the runtime `.draft(angle, { face })` call.
   */
  face: string;
  /**
   * Parting-line face. Defaults to `face` at lower time if omitted.
   * Accepted as a canonical name or label string.
   */
  neutral_plane?: string;
  /**
   * Demoulding direction [x, y, z]. Defaults to face normal at lower time.
   */
  pull_dir?: [number, number, number];
  /** JS const name for the resulting Shape binding. Auto-derived if omitted. */
  binding_name?: string;
}

function deriveDefaultBinding(code: string): string {
  let max = 0;
  for (const m of code.matchAll(/const\s+_drafted_(\d+)\s*=/g)) {
    const n = parseInt(m[1], 10);
    if (n > max) max = n;
  }
  return `_drafted_${max + 1}`;
}

export function shapeDraftEdit(input: ShapeDraftInput): AddFeatureResult {
  const error = bindingError(input) ?? angleError(input.angle_deg) ?? faceError(input.face) ?? pullDirError(input.pull_dir);
  if (error !== undefined) {
    return { ok: false, error };
  }

  const binding = input.binding_name ?? deriveDefaultBinding(input.code);
  const optsParts: string[] = [`face: ${JSON.stringify(input.face)}`];
  if (input.neutral_plane !== undefined) optsParts.push(`neutralPlane: ${JSON.stringify(input.neutral_plane)}`);
  if (input.pull_dir !== undefined) optsParts.push(`pullDir: ${JSON.stringify(input.pull_dir)}`);

  const feature_code = `const ${binding} = ${input.shape_binding}.draft(${JSON.stringify(input.angle_deg)}, { ${optsParts.join(', ')} });`;
  return addFeature(input.code, feature_code);
}

function bindingError(input: ShapeDraftInput): string | undefined {
  if (typeof input.shape_binding !== 'string' || !isValidIdentifier(input.shape_binding)) {
    return `shape_draft: shape_binding must be a valid JS identifier; got ${JSON.stringify(input.shape_binding)}.`;
  }
  if (!bindingExists(input.code, input.shape_binding)) {
    return `shape_draft: binding "${input.shape_binding}" is not declared in the source.`;
  }
  return undefined;
}

function angleError(angle: number): string | undefined {
  if (typeof angle !== 'number' || !Number.isFinite(angle) || angle < 0 || angle > 90) {
    return `shape_draft: angle_deg must be a finite number in [0, 90]; got ${JSON.stringify(angle)}.`;
  }
  return undefined;
}

function faceError(face: string): string | undefined {
  if (typeof face !== 'string' || face.length === 0) {
    return 'shape_draft: face must be a non-empty string (canonical name, label, or FaceQuery descriptor).';
  }
  return undefined;
}

function pullDirError(pullDir: [number, number, number] | undefined): string | undefined {
  if (pullDir === undefined) return undefined;
  if (!Array.isArray(pullDir) || pullDir.length !== 3 || !pullDir.every(v => typeof v === 'number' && Number.isFinite(v))) {
    return `shape_draft: pull_dir must be a [number, number, number] triple; got ${JSON.stringify(pullDir)}.`;
  }
  return undefined;
}
