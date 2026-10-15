// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import { runMcpScript } from '../runMcpScript';

export interface InspectMultiMaterialInput { file?: string; code?: string }

export interface InspectMultiMaterialOutput {
  ok: boolean;
  shadowedLeaves: Array<{
    leafFeatureId: string;
    leafFeatureKind: string;
    shadowingFeatureId: string;
    shadowingFeatureKind: string;
    leafMaterial: unknown;
    headMaterial: unknown;
    rewrite: string;
  }>;
  limitations: string[];
  error?: string;
}

/** Read-only analysis of explicit material metadata through captured boolean ancestry. */
export async function inspectMultiMaterialTool(
  input: InspectMultiMaterialInput,
): Promise<InspectMultiMaterialOutput> {
  const result = await runMcpScript(input);
  if (!result.ok) return { ok: false, shadowedLeaves: [], limitations: [], error: result.error };

  const records = result.run.records;
  const recordById = new Map(records.map((record) => [record.id, record]));
  const children = new Map<string, string[]>();
  for (const record of records) {
    if (isSubtract(record)) continue;
    for (const ref of Object.values(record.inputs)) {
      if (ref.kind !== 'feature') continue;
      const list = children.get(ref.id) ?? [];
      list.push(record.id);
      children.set(ref.id, list);
    }
  }

  const explicit = records.filter((record) => record.metadata?.material !== undefined);
  const shadowedLeaves: InspectMultiMaterialOutput['shadowedLeaves'] = [];
  for (const leaf of explicit) {
    const head = findMaterialHead(leaf.id, children, recordById, new Set(explicit.map((r) => r.id)));
    if (!head || JSON.stringify(leaf.metadata?.material) === JSON.stringify(head.metadata?.material)) continue;
    shadowedLeaves.push({
      leafFeatureId: leaf.id,
      leafFeatureKind: leaf.kind,
      shadowingFeatureId: head.id,
      shadowingFeatureKind: head.kind,
      leafMaterial: leaf.metadata?.material,
      headMaterial: head.metadata?.material,
      rewrite: `const arm = assembly('multi-material');\narm.part('${leaf.id}', ${leaf.id}); // preserve this operand's material\n// Keep the remaining fused body as its own arm.part(...) and return arm.model().`,
    });
  }
  return {
    ok: true,
    shadowedLeaves,
    limitations: [
      'This reports explicit .material() metadata on boolean descendants; it does not attribute faces or change the static mesh.',
      'Rewrite snippets are templates: authors must name/retain the source operands and choose assembly placements appropriate to their model.',
      'Named .finish() values currently compile to material metadata when captured; this report does not infer materials from unrecorded runtime state.',
    ],
  };
}

function isSubtract(record: FeatureRecord): boolean {
  return record.kind === 'boolean' && record.params.op?.expression.includes('difference') === true;
}

function findMaterialHead(
  leafId: string,
  children: ReadonlyMap<string, readonly string[]>,
  recordById: ReadonlyMap<string, FeatureRecord>,
  attributedIds: ReadonlySet<string>,
): FeatureRecord | undefined {
  const seen = new Set([leafId]);
  const queue = [...(children.get(leafId) ?? [])];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const record = recordById.get(id);
    if (!record) continue;
    if (attributedIds.has(id)) return record;
    queue.push(...(children.get(id) ?? []));
  }
  return undefined;
}
