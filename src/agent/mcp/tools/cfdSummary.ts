// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/cfdSummary.ts
//
// MCP `cfd_summary` — the read-only companion to `run_cfd`, same shape as
// `fea_summary`: the stored summary of a previous run, whether OpenFOAM is
// available here (with the install command when it is not), and the fluid
// presets with their real density / viscosity numbers. Never meshes or solves.

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { RESULT_FILE, SUMMARY_FILE } from '../../../kernel/cfd/job';
import { CFD_FLUIDS } from '../../../kernel/cfd/studySpec';
import { detectCfdToolchain } from '../../../kernel/cfd/toolchain';
import type { CfdSummary } from '../../../kernel/cfd/types';

export interface CfdSummaryInput {
  output_dir?: string;
}

export interface CfdSummaryOutput {
  ok: boolean;
  summary?: CfdSummary;
  /** `progress.json` of a run still in flight in output_dir. */
  progress?: Record<string, unknown>;
  toolchain: { available: boolean; mode?: 'native' | 'docker'; image?: string; version?: string; missing: string[]; hint?: string };
  fluids: Record<string, { rho: number; nu: number }>;
  fluid_names: string[];
  error?: string;
  errorCode?: string;
}

async function readJson<T>(path: string): Promise<T | undefined> {
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch {
    return undefined;
  }
}

export async function cfdSummaryTool(input: CfdSummaryInput): Promise<CfdSummaryOutput> {
  const tc = await detectCfdToolchain();
  const base: CfdSummaryOutput = {
    ok: true,
    toolchain: {
      available: tc.ok,
      ...(tc.mode !== undefined ? { mode: tc.mode } : {}),
      ...(tc.image !== undefined ? { image: tc.image } : {}),
      ...(tc.version !== undefined ? { version: tc.version } : {}),
      missing: [...tc.missing],
      ...(tc.hint !== undefined ? { hint: tc.hint } : {}),
    },
    fluids: { ...CFD_FLUIDS },
    fluid_names: Object.keys(CFD_FLUIDS),
  };
  if (input.output_dir === undefined) return base;
  const dir = isAbsolute(input.output_dir) ? input.output_dir : resolve(input.output_dir);
  const summary = await readJson<CfdSummary>(join(dir, SUMMARY_FILE));
  if (summary !== undefined) return { ...base, summary };
  const progress = await readJson<Record<string, unknown>>(join(dir, 'progress.json'));
  if (progress !== undefined && !existsSync(join(dir, RESULT_FILE))) return { ...base, progress };
  return {
    ...base,
    ok: false,
    error: `No ${SUMMARY_FILE} in ${dir}. Run run_cfd with output_dir set to that directory first.`,
    errorCode: 'cli.file-read',
  };
}
