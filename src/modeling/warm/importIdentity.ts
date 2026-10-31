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

/**
 * Text of the second argument, or `''` when the call is only the path.
 * `null` when the path is not a single literal the call actually ends.
 */
function optionsSource(rest: string, end: number): string | null {
  const tail = rest.slice(end);
  if (/^\s*\)/.test(tail)) return '';
  const comma = /^\s*,\s*/.exec(tail);
  if (!comma) return null;
  let depth = 0;
  for (let i = comma[0].length; i < tail.length; i++) {
    const ch = tail[i];
    if (ch === '(' || ch === '{' || ch === '[') depth += 1;
    else if (ch === ')' || ch === '}' || ch === ']') {
      if (ch === ')' && depth === 0) return tail.slice(comma[0].length, i);
      depth -= 1;
    }
  }
  return null;
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

/** A missing font must not become a stable identity. The next open rebuilds. */
function hashFontPath(path: string, scriptDir: string | undefined): string {
  const hashed = hashImport(path, scriptDir);
  if (hashed.startsWith('missing:') || hashed.startsWith('unreadable:') || hashed.startsWith('unread:')) {
    return unprovable();
  }
  return hashed;
}

async function hashFetchPart(id: string, options: string): Promise<string> {
  if (!getHostFs()) return unprovable();
  try {
    const { loadCatalog, resolveById } = await import('../parts/catalog');
    const hit = resolveById(loadCatalog(), id);
    if (!hit) return unprovable();
    const step = hashImport(hit.stepPath, undefined);
    if (step.startsWith('missing:') || step.startsWith('unreadable:') || step.startsWith('unread:')) {
      return unprovable();
    }
    const manifest = hit.stepPath.replace(/\.step$/i, '.json');
    const side = getHostFs()?.fileExists(manifest) ? hashImport(manifest, undefined) : 'no-manifest';
    const base = `fetch:${id}:${step}:${side}`;
    if (!options.trim()) return base;
    return `${base}|opts:${hashBytes(new TextEncoder().encode(options))}`;
  } catch {
    return unprovable();
  }
}

async function hashCall(name: string, path: string, scriptDir: string | undefined, options: string): Promise<string> {
  if (name === 'fetchPart') return hashFetchPart(path, options);
  const hashed = name === 'fontPath' ? hashFontPath(path, scriptDir) : hashImport(path, scriptDir);
  if (hashed.startsWith('unprovable:')) return hashed;
  // The path was a literal, but its bytes could not be read.
  if (hashed.startsWith('missing:') || hashed.startsWith('unreadable:')) return unprovable();
  return hashed;
}

/** Stable when every imported literal's bytes are unchanged. */
export async function importIdentity(code: string, scriptDir: string | undefined): Promise<string> {
  const parts: string[] = [];
  const re = new RegExp(IMPORT_CALL);
  while (re.exec(code) !== null) {
    const name = /([A-Za-z]+)\s*\(\s*$/.exec(code.slice(0, re.lastIndex))?.[1] ?? '';
    const rest = code.slice(re.lastIndex);
    const quoted = quotedPath(rest);
    if (!quoted) return unprovable();
    const options = optionsSource(rest, quoted.end);
    if (options === null) return unprovable();
    parts.push(await hashCall(name, quoted.path, scriptDir, options));
  }
  return parts.join('|');
}
