// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { getActiveMcpSession } from '../activeSession';

export type ParamsListInput = object;

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
}

export async function paramsListTool(): Promise<ParamsListOutput> {
  const active = getActiveMcpSession();
  if (!active) return { params: [] };
  return {
    params: active.session.params.list().map(entry => ({
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
