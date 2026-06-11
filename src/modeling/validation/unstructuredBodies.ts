// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Agent-parts-discipline check: flag multi-body models that were authored as
// loose top-level bodies instead of named `assembly().part(name, shape)`
// parts.
//
// A multi-body model that skips assembly structure loses per-part identity:
// `inspect --focus`, `list_part_stats`, and Studio's hide / keep-whole /
// per-part validity all key off part names. This emits the advisory
// `assembly.structure.unstructured-bodies` (info) so the review loop nudges
// the author toward wrapping each distinct component in a named part.
//
// Runs for EVERY script (assembly or not) — that is why it lives beside, not
// inside, `validateAssemblyWithMates` (which only sees assembly-built scenes).
// It emits at one seam (`evaluateAndBuildScript`), so both the
// `evaluate_script` MCP tool and the `/__kernelcad/review` payload carry the
// same diagnostic.

import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS } from '../../shared/diagnostics/registry';
import { Shape } from '../capture/proxy';
import { Scene } from './scene';
import { getReturnedVariables } from '../../shared/codeGeneration/ast';

export interface UnstructuredBodiesInput {
  /** The raw value the script `return`ed. */
  returnValue: unknown;
  /** Script source — optional. When present, returned-variable names refine
   *  the message (how many returned bodies are anonymous expressions). */
  code?: string;
}

/**
 * Inspect a script's return value and emit `assembly.structure.unstructured-bodies`
 * (info, 0 or 1 diagnostic) when the model is multi-body WITHOUT assembly
 * structure.
 *
 * Fires when the script returns an array of ≥2 `Shape`s (loose top-level
 * bodies with no part identity).
 *
 * Stays silent for: a single returned `Shape` (single body), an
 * assembly-built `Scene` (`assembly().model()` / `.solvedModel()`), a
 * sketch-only or empty return, and any non-Shape array element (the return is
 * not a clean multi-body solid list, so the part-discipline nudge would be
 * noise).
 */
export function detectUnstructuredBodies(
  input: UnstructuredBodiesInput,
): CompilerDiagnostic[] {
  const { returnValue, code } = input;

  // Assembly-built scenes already carry part identity — never fire.
  if (returnValue instanceof Scene) return [];

  // Only an array return represents multiple top-level bodies. A single
  // returned Shape is one body; a Scene is handled above.
  if (!Array.isArray(returnValue)) return [];

  const shapes = returnValue.filter((el): el is Shape => el instanceof Shape);
  // Need at least two genuine bodies. If the array mixes in non-Shape values
  // (sketches, virtual handles, plain data), it is not a clean multi-body
  // solid list and the discipline nudge would be noise.
  if (shapes.length < 2 || shapes.length !== returnValue.length) return [];

  const bodyCount = shapes.length;
  let anonymousNote = '';
  if (code !== undefined) {
    try {
      const names = getReturnedVariables(code);
      const anonymous = names.filter((n) => n === null).length;
      if (anonymous > 0) {
        anonymousNote =
          anonymous === bodyCount
            ? ' None of the returned bodies are named variables.'
            : ` ${anonymous} of ${bodyCount} returned bodies are anonymous expressions.`;
      }
    } catch {
      // AST parse failed — fall back to the count-only message.
    }
  }

  return [
    {
      target: 'export-occt',
      code: 'assembly.structure.unstructured-bodies',
      severity: 'info',
      message:
        `This model returns ${bodyCount} loose top-level bodies with no assembly structure.` +
        anonymousNote +
        ' Each physically distinct component should be a named assembly().part(name, shape).',
      hint:
        'Wrap the loose bodies in assembly().part(name, shape) so each part carries identity, per-part stats, and review handles; name every returned shape.',
      nextAction: NEXT_ACTIONS['assembly.structure.unstructured-bodies'],
    },
  ];
}
