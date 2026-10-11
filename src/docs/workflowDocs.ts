// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { McpToolDefinition } from '../agent/mcp/registry/types';
import type { Snippet } from '../agent/cookbook/loader';

/** Preserve the full discovered contract, including conditional schema blocks. */
export function buildMcpReference(tools: readonly McpToolDefinition[]) {
  return { schemaVersion: 1, scope: 'local' as const, tools };
}

export interface GuideEntry {
  readonly id: string;
  readonly title: string;
  readonly kind: 'recipe' | 'rule' | 'material';
  readonly summary: string;
  readonly keywords: readonly string[];
  readonly content: string;
  readonly sourceUrl: string;
  readonly snapshotDate?: string;
  readonly sourceUrls?: readonly string[];
}

interface RuleCatalog {
  readonly rules: readonly { id: string; description: string; scope: string; ruleSource: string }[];
}
interface MaterialCatalog {
  readonly lastFetched: string;
  readonly skus: Readonly<Record<string, { displayName: string; category: string; services: string[]; thicknessesIn: number[] }>>;
}
interface SourceManifest {
  readonly vendors: { readonly sendcutsend: { readonly sources: readonly { url: string; lastFetched: string }[] } };
}
const REPO_SOURCE = 'https://github.com/w1ne/kernelCAD-web/blob/develop/';
const SHOP_PATH = 'src/agent/skills/kernelcad-shopcheck/catalogs/';

/** Build discovery over existing native recipes and versioned shop data. */
export function buildDesignGuide(
  snippets: readonly Snippet[], rules: RuleCatalog, materials: MaterialCatalog, manifest: SourceManifest,
): GuideEntry[] {
  const sourceUrls = manifest.vendors.sendcutsend.sources.map(source => source.url);
  const snapshotDate = materials.lastFetched.slice(0, 10);
  return [
    ...snippets.map(snippet => ({
      id: `recipe:${snippet.id}`, title: snippet.title, kind: 'recipe' as const,
      summary: snippet.when_to_use, keywords: [...snippet.tags, ...snippet.keywords],
      content: snippet.body, sourceUrl: `${REPO_SOURCE}cookbook/snippets/${snippet.id}.md`,
    })),
    ...rules.rules.map(rule => ({
      id: `rule:${rule.id}`, title: rule.description, kind: 'rule' as const,
      summary: `Shop check: ${rule.scope}. Recorded rule source: ${rule.ruleSource}.`,
      keywords: [rule.scope, rule.id, rule.ruleSource], content: JSON.stringify(rule, null, 2),
      sourceUrl: `${REPO_SOURCE}${SHOP_PATH}vendors/sendcutsend/rules.json`, snapshotDate, sourceUrls,
    })),
    ...Object.entries(materials.skus).map(([id, material]) => ({
      id: `material:${id}`, title: material.displayName, kind: 'material' as const,
      summary: `Catalog snapshot: ${material.services.join(', ')}; stocked thicknesses in inches.`,
      keywords: [id, material.category, ...material.services], content: JSON.stringify(material, null, 2),
      sourceUrl: `${REPO_SOURCE}${SHOP_PATH}vendors/sendcutsend/catalog.json`, snapshotDate, sourceUrls,
    })),
  ];
}

/** All query words must match metadata; cap callers to fifty results. */
export function searchGuide(entries: readonly GuideEntry[], query: string, limit = 20): GuideEntry[] {
  if (!Number.isFinite(limit) || limit <= 0) return [];
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return entries.filter(entry => {
    const text = `${entry.title} ${entry.summary} ${entry.keywords.join(' ')}`.toLowerCase();
    return words.every(word => text.includes(word));
  }).slice(0, Math.min(50, Math.floor(limit)));
}
