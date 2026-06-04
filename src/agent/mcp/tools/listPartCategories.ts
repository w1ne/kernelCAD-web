// src/agent/mcp/tools/listPartCategories.ts
import { loadCatalog } from '../../../modeling/parts/catalog';

export interface ListPartCategoriesOutput {
  ok: true;
  categories: string[];
  remoteEnabled: boolean;
}

export async function listPartCategoriesTool(): Promise<ListPartCategoriesOutput> {
  const cat = loadCatalog();
  const categories = Array.from(new Set(cat.records.map((r) => r.category))).sort();
  const remoteEnabled = (process.env.KERNELCAD_PARTS_BASE_URL ?? '').length > 0;
  return { ok: true, categories, remoteEnabled };
}
