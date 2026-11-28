// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/import3mfPackage.ts
//
// 3MF package access for import3mf.ts: the ZIP container, the root model
// part named by the OPC start-part relationship, and the other model parts
// that the Production extension (3MF Production Extension v1.1) references
// with `p:path` — the layout Bambu Studio and OrcaSlicer project files use.

import { unzipSync } from 'fflate';

export class ThreeMfImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ThreeMfImportError';
  }
}

export const PRODUCTION_NAMESPACE = 'http://schemas.microsoft.com/3dmanufacturing/production/2015/06';
const MODEL_RELATIONSHIP_TYPE = 'http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel';

export function attribute(tag: string, name: string): string | undefined {
  const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(tag);
  return match?.[1] ?? match?.[2];
}

export interface ThreeMfPackage {
  /** Absolute part name of the root model part, e.g. `/3D/3dmodel.model`. */
  rootPath: string;
  /** Model part XML by absolute part name, or undefined if the part is absent. */
  modelXml(path: string): string | undefined;
}

/** OPC part names are case-insensitive and absolute (`/3D/...`). */
export function partKey(path: string): string {
  return `/${path.replace(/^\/+/, '')}`.toLowerCase();
}

function startPartPath(files: Record<string, Uint8Array>, byKey: Map<string, string>): string | undefined {
  const relsName = byKey.get(partKey('_rels/.rels'));
  if (relsName === undefined) return undefined;
  const rels = new TextDecoder().decode(files[relsName]);
  const relationshipRe = /<Relationship\b([^>]*)\/?>/gi;
  let relationship: RegExpExecArray | null;
  while ((relationship = relationshipRe.exec(rels)) !== null) {
    const target = attribute(relationship[1], 'Target');
    if (attribute(relationship[1], 'Type') === MODEL_RELATIONSHIP_TYPE && target && byKey.has(partKey(target))) {
      return byKey.get(partKey(target));
    }
  }
  return undefined;
}

export function read3mfPackage(bytes: Uint8Array): ThreeMfPackage {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new ThreeMfImportError('3MF is not a readable ZIP archive.');
  }
  const names = Object.keys(files);
  const byKey = new Map(names.map((name) => [partKey(name), name]));
  const canonical = byKey.get(partKey('3D/3dmodel.model'));
  const candidates = names.filter((name) => /^3d\/.+\.model$/i.test(name));
  const rootName = startPartPath(files, byKey) ?? canonical ?? (candidates.length === 1 ? candidates[0] : undefined);
  if (!rootName || !files[rootName]) {
    throw new ThreeMfImportError('3MF must contain one unambiguous 3D model part.');
  }
  return {
    rootPath: `/${rootName.replace(/^\/+/, '')}`,
    modelXml(path) {
      const name = byKey.get(partKey(path));
      return name === undefined ? undefined : new TextDecoder().decode(files[name]);
    },
  };
}

/** The prefix a model element binds to the Production extension namespace. */
export function productionPrefix(modelTag: string): string | undefined {
  const declarationRe = /(?:^|\s)xmlns:([A-Za-z_][\w.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let declaration: RegExpExecArray | null;
  while ((declaration = declarationRe.exec(modelTag)) !== null) {
    if ((declaration[2] ?? declaration[3]) === PRODUCTION_NAMESPACE) return declaration[1];
  }
  return undefined;
}

/** Refuse every required extension except Production, whose `p:path` references are resolved. */
export function assertRequiredExtensions(modelTag: string, prefix: string | undefined): void {
  const required = (attribute(modelTag, 'requiredextensions') ?? '').trim().split(/\s+/).filter(Boolean);
  const unsupported = required.filter((token) => token !== prefix);
  if (unsupported.length > 0) {
    throw new ThreeMfImportError(`3MF requires unsupported extensions: ${unsupported.join(' ')}.`);
  }
}
