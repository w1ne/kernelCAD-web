// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { PBRMaterial } from '../../shared/intent/material';

export interface MaterialNamingInput {
  readonly pbr?: PBRMaterial;
  readonly finishName?: string;
  readonly colorParamName?: string;
  readonly partName?: string;
  readonly materialIndex?: number;
  /** Resolved legacy `.color()` value, included in identity when no PBR baseColor exists. */
  readonly color?: string;
}

export interface ResolvedMaterialName {
  /** Unique GLB-facing name (shared for identical name + PBR pairs). */
  readonly name: string;
  /** Stable identity key for material-instance reuse. */
  readonly key: string;
}

/** Resolve an authored material name without allocating collision suffixes. */
export function resolveMaterialName(input: MaterialNamingInput): string {
  return nonEmpty(input.pbr?.name)
    ?? nonEmpty(input.finishName)
    ?? nonEmpty(input.colorParamName)
    ?? nonEmpty(input.partName)
    ?? `material_${input.materialIndex ?? 0}`;
}

/**
 * Create a per-export name allocator. Identical named PBR payloads map to one
 * key/name; different payloads that request the same name get `-2`, `-3`, ….
 */
export function createMaterialNameRegistry(): {
  resolve(input: MaterialNamingInput): ResolvedMaterialName;
} {
  const byIdentity = new Map<string, ResolvedMaterialName>();
  const usedNames = new Set<string>();

  return {
    resolve(input) {
      const baseName = resolveMaterialName(input);
      const hash = stableHash(materialFields(input));
      const key = JSON.stringify([baseName, hash]);
      const existing = byIdentity.get(key);
      if (existing !== undefined) return existing;

      let name = baseName;
      let suffix = 2;
      while (usedNames.has(name)) name = `${baseName}-${suffix++}`;
      const resolved = { name, key };
      usedNames.add(name);
      byIdentity.set(key, resolved);
      return resolved;
    },
  };
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function materialFields(input: MaterialNamingInput): unknown {
  if (input.pbr === undefined) return { baseColor: input.color ?? '#cccccc' };
  const fields = Object.fromEntries(
    Object.entries(input.pbr).filter(([key]) => key !== 'name'),
  ) as Omit<PBRMaterial, 'name'>;
  return input.pbr.baseColor === undefined && input.color !== undefined
    ? { ...fields, baseColor: input.color }
    : fields;
}

function stableHash(value: unknown): string {
  const serialized = stableSerialize(value);
  let hash = 0x811c9dc5;
  for (let i = 0; i < serialized.length; i++) {
    hash = Math.imul(hash ^ serialized.charCodeAt(i), 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
