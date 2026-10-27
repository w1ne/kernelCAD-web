// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Identity of files a script reads beside itself (`lib.fromSTEP`, fonts).
// The source text can stay the same while those bytes change. A path we
// cannot resolve is not a match: the document is rebuilt.

import { getHostFs } from '../../shared/runtime/hostFs';

// `meshFromSTL` must be listed whole: a `\bfromSTL` boundary does not see it.
// `fromGLB` / `fromGLTF` are not loaders. `fetchPart` is resolved below.
const IMPORT_CALL = /\b(?:meshFromSTL|fromSTEP|fromBREP|fromSTL|fromDXF|fromSVG|referenceImage|fontPath|fetchPart)\s*\(\s*/g;

function hashBytes(bytes: Uint8Array): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ bytes.length;
  for (let i = 0; i < bytes.length; i++) {
    const code = bytes[i] ?? 0;
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ code, 0x01000193);
  }
  return `${bytes.length.toString(16)}:${(h1 >>> 0).toString(16)}:${(h2 >>> 0).toString(16)}`;
}

function quotedPath(rest: string): { path: string; end: number } | null {
  const literal = /^(?:'([^'\\]*)'|"([^"\\]*)"|`([^`$\\]*)`)/.exec(rest);
  const path = literal?.[1] ?? literal?.[2] ?? literal?.[3];
  if (!literal || path === undefined) return null;
  return { path, end: literal[0].length };
}

function unprovable(): string {
  return `unprovable:${Math.random().toString(16).slice(2)}`;
}

/** A second argument can select different bytes than the literal alone. */
function literalOnly(rest: string, end: number): boolean {
  return /^\s*\)/.test(rest.slice(end));
}

function hashImport(path: string, scriptDir: string | undefined): string {
  const fs = getHostFs();
  if (!fs) return `unread:${path}`;
  const abs = fs.resolveScriptRelative(scriptDir, path);
  if (!fs.fileExists(abs)) return `missing:${abs}`;
  try {
    return `${abs}:${hashBytes(fs.readFileBytes(abs))}`;
  } catch {
    return `unreadable:${abs}`;
  }
}

async function hashFetchPart(id: string): Promise<string> {
  if (!getHostFs()) return unprovable();
  try {
    const { loadCatalog, resolveById } = await import('../parts/catalog');
    const hit = resolveById(loadCatalog(), id);
    if (!hit) return unprovable();
    const step = hashImport(hit.stepPath, undefined);
    const manifest = hit.stepPath.replace(/\.step$/i, '.json');
    const side = getHostFs()?.fileExists(manifest) ? hashImport(manifest, undefined) : 'no-manifest';
    return `fetch:${id}:${step}:${side}`;
  } catch {
    return unprovable();
  }
}

/** Stable when every imported literal's bytes are unchanged. */
export async function importIdentity(code: string, scriptDir: string | undefined): Promise<string> {
  const parts: string[] = [];
  const re = new RegExp(IMPORT_CALL);
  while (re.exec(code) !== null) {
    const name = /([A-Za-z]+)\s*\(\s*$/.exec(code.slice(0, re.lastIndex))?.[1] ?? '';
    const rest = code.slice(re.lastIndex);
    const quoted = quotedPath(rest);
    if (!quoted || !literalOnly(rest, quoted.end)) return unprovable();
    if (name === 'fetchPart') parts.push(await hashFetchPart(quoted.path));
    else parts.push(hashImport(quoted.path, scriptDir));
  }
  return parts.join('|');
}
