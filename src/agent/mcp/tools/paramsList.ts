// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { getActiveMcpSession } from '../activeSession';
import { runMcpScript } from '../runMcpScript';
import type { ParamEntry } from '../../../shared/runtime/paramTable';

export interface ParamsListInput {
  /** Optional — when given, evaluates this file/code fresh (same as every
   *  other `inspect({ of: ... })` reader) instead of reading whatever
   *  session `evaluate_script` last left active. Without either, falls back
   *  to the active session (unchanged legacy behavior) so an agent that just
   *  called `evaluate_script` can still call `inspect({ of: 'params' })`
   *  with no arguments. Passing BOTH `file` and `code` is invalid input —
   *  `code` wins, same convention as `runMcpScript`. */
  file?: string;
  code?: string;
}

export interface ParamsListEntry {
  name: string;
  type: 'number' | 'boolean' | 'choice' | 'string';
  value: number | boolean | string;
  defaultValue: number | boolean | string;
  min?: number;
  max?: number;
  choices?: string[];
  description?: string;
}

export interface ParamsListOutput {
  params: ParamsListEntry[];
  error?: string;
  errorCode?: string;
}

export async function paramsListTool(input: ParamsListInput = {}): Promise<ParamsListOutput> {
  let entries: ParamEntry[];
  if (input.file !== undefined || input.code !== undefined) {
    const result = await runMcpScript(input);
    if (!result.ok) return { params: [], error: result.error, errorCode: result.errorCode };
    entries = result.run.paramTable.list();
  } else {
    const active = getActiveMcpSession();
    if (!active) return { params: [] };
    entries = active.session.params.list();
  }

  return {
    params: entries.map(entry => ({
      name: entry.name,
      type: entry.type,
      value: entry.value,
      defaultValue: entry.defaultValue,
      ...(entry.meta?.min !== undefined ? { min: entry.meta.min } : {}),
      ...(entry.meta?.max !== undefined ? { max: entry.meta.max } : {}),
      ...(entry.meta?.choices !== undefined ? { choices: entry.meta.choices } : {}),
      ...(entry.meta?.description !== undefined ? { description: entry.meta.description } : {}),
    })),
  };
}
