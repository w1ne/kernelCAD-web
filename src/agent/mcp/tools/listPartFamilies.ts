// src/agent/mcp/tools/listPartFamilies.ts
import { loadCatalog } from '../../../modeling/parts/catalog';

export interface ListPartFamiliesInput {
  category?: string;
}

export interface FamilyEntry {
  name: string;
  category: string;
  standard?: string;
  count: number;
  exemplarIds: string[];
}

export interface ListPartFamiliesOutput {
  ok: true;
  families: FamilyEntry[];
  remoteEnabled: boolean;
}

export async function listPartFamiliesTool(
  input: ListPartFamiliesInput,
): Promise<ListPartFamiliesOutput> {
  const cat = loadCatalog();
  const filtered = input.category
    ? cat.records.filter((r) => r.category === input.category)
    : cat.records;
  const map = new Map<string, FamilyEntry>();
  for (const r of filtered) {
    const existing = map.get(r.family);
    const e: FamilyEntry = existing ?? {
      name: r.family,
      category: r.category,
      ...(r.standard !== undefined ? { standard: r.standard } : {}),
      count: 0,
      exemplarIds: [],
    };
    e.count++;
    if (e.exemplarIds.length < 3) e.exemplarIds.push(r.id);
    map.set(r.family, e);
  }
  return {
    ok: true,
    families: Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
    remoteEnabled: (process.env.KERNELCAD_PARTS_BASE_URL ?? '').length > 0,
  };
}
