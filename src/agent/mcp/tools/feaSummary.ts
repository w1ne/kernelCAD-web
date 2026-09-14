// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/feaSummary.ts
//
// MCP `fea_summary` tool — the read-only companion to `run_fea`.
//
// Three questions an agent asks around a structural check, none of which
// should cost a solve:
//   1. "What did the last run say?"      -> reads the stored summary JSON.
//   2. "Can I even run one here?"        -> probes the toolchain and, when it
//                                           is missing, hands back the exact
//                                           install command.
//   3. "What materials can I name?"      -> dumps the FEA material table with
//                                           real E / nu / yield numbers, so a
//                                           grade choice is made against data
//                                           rather than from memory.
//
// Nothing here meshes, solves, or writes.

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { feaMaterialTable, FEA_MATERIAL_NAMES } from '../../../kernel/fea/feaMaterials';
import { detectFeaToolchain } from '../../../kernel/fea/toolchain';
import type { FeaSummary } from '../../../kernel/fea/types';
import type { FeaMaterialProps } from '../../../shared/intent/feaStudyRecord';

export interface FeaSummaryInput {
  /** Directory a previous `run_fea` wrote to. Omit to get only the toolchain
   *  status and the material table. */
  output_dir?: string;
}

export interface FeaSummaryOutput {
  ok: boolean;
  /** The stored summary, when `output_dir` holds one. */
  summary?: FeaSummary;
  /** Whether a study can run on this machine right now, and how to fix it. */
  toolchain: {
    available: boolean;
    ccx?: string;
    gmshVersion?: string;
    missing: string[];
    hint?: string;
  };
  /** Named grades with their solver-unit properties (MPa / - / MPa). */
  materials: Record<string, FeaMaterialProps>;
  material_names: string[];
  error?: string;
  errorCode?: string;
}

/**
 * `fea_summary` MCP tool. Read-only: reports a stored study result, the
 * availability of the solver toolchain, and the material table.
 */
export async function feaSummaryTool(input: FeaSummaryInput): Promise<FeaSummaryOutput> {
  const tc = await detectFeaToolchain();
  const base: FeaSummaryOutput = {
    ok: true,
    toolchain: {
      available: tc.ok,
      ...(tc.ccx !== undefined ? { ccx: tc.ccx } : {}),
      ...(tc.gmshVersion !== undefined ? { gmshVersion: tc.gmshVersion } : {}),
      missing: [...tc.missing],
      ...(tc.hint !== undefined ? { hint: tc.hint } : {}),
    },
    materials: feaMaterialTable(),
    material_names: [...FEA_MATERIAL_NAMES],
  };

  if (input.output_dir === undefined) return base;

  const dir = isAbsolute(input.output_dir) ? input.output_dir : resolve(input.output_dir);
  const path = join(dir, 'fea-summary.json');
  if (!existsSync(path)) {
    return {
      ...base,
      ok: false,
      error: `No fea-summary.json in ${dir}. Run run_fea with output_dir set to that directory first.`,
      errorCode: 'cli.file-read',
    };
  }
  try {
    return { ...base, summary: JSON.parse(await readFile(path, 'utf8')) as FeaSummary };
  } catch (e) {
    return {
      ...base,
      ok: false,
      error: `Could not read ${path}: ${(e as Error).message}`,
      errorCode: 'cli.file-read',
    };
  }
}
