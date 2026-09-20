// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Evaluate-scope no-shape gate: a script that does not return an exportable
// model artifact is not a model. Emits `export.no-shape` (error) so the gate
// suite and the repair loop catch it instead of shipping an empty model.
//
// Exportable: Shape | Scene | Region | non-empty array of Shape.

import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS } from '../../shared/diagnostics/registry';
import { isRegion } from '../../shared/intent/region';
import { Shape } from '../capture/proxy';
import { Scene } from './scene';

export interface NoShapeReturnInput {
  /** The raw value the script `return`ed. */
  returnValue: unknown;
}

/** True when the value is a model artifact the exporters can consume. */
export function isExportableReturn(value: unknown): boolean {
  if (value instanceof Shape || value instanceof Scene) return true;
  if (isRegion(value)) return true;
  if (Array.isArray(value)) {
    return value.length > 0 && value.every((el) => el instanceof Shape);
  }
  return false;
}

export function detectNoShapeReturn(input: NoShapeReturnInput): CompilerDiagnostic[] {
  if (isExportableReturn(input.returnValue)) return [];
  return [
    {
      target: 'export-occt',
      code: 'export.no-shape',
      severity: 'error',
      message:
        'Script produced no model: evaluate requires the script to return a Shape, Scene, or Region.',
      hint: 'End the script with `return <shape>` (or `return asm.model()` for assemblies).',
      nextAction: NEXT_ACTIONS['export.no-shape'],
    },
  ];
}
