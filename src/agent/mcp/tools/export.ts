// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { exportModelTool } from './exportModel';
import { exportPartTool } from './exportPart';

/** The export target. Each value maps 1:1 to a dedicated exporter. */
export type ExportTarget = 'model' | 'part';

export interface ExportInput {
  target: ExportTarget;
  /**
   * Target-specific params, forwarded verbatim to the selected exporter:
   * - model: { file?, code?, output_path, format, feature_id?, options?, no_verify? }
   * - part:  { file?, code?, part?, output_path?, output_dir?, no_verify? }
   * Each exporter fails closed on its own missing required params.
   */
  [key: string]: unknown;
}

/**
 * Unified write-side export entrypoint. Replaces export_model and export_part.
 *
 * Pure routing layer: dispatches on `target` and forwards all other params to
 * the underlying exporter unchanged. The exporters' behavior is untouched.
 */
export function exportTool(input: ExportInput): Promise<unknown> {
  const { target, ...rest } = input;
  switch (target) {
    case 'model':
      return exportModelTool(rest as unknown as Parameters<typeof exportModelTool>[0]);
    case 'part':
      return exportPartTool(rest as unknown as Parameters<typeof exportPartTool>[0]);
    default:
      // Reject (not sync-throw) so the function honors its Promise return type
      // for every input — callers can rely on `.catch(...)`.
      return Promise.reject(
        new Error(
          `Unknown export target: ${String(target)}. Valid: model, part.`,
        ),
      );
  }
}
