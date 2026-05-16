import { getActiveMcpSession } from '../activeSession';

export type ParamsListInput = object;

export interface ParamsListEntry {
  name: string;
  type: 'number' | 'boolean';
  value: number | boolean;
  defaultValue: number | boolean;
  min?: number;
  max?: number;
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
      ...(entry.meta?.description !== undefined ? { description: entry.meta.description } : {}),
    })),
  };
}
