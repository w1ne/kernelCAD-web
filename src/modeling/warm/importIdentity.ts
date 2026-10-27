// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Identity of files a script reads beside itself (`lib.fromSTEP`, fonts).
// The source text can stay the same while those bytes change. A path we
// cannot resolve is not a match: the document is rebuilt.

import { getHostFs } from '../../shared/runtime/hostFs';

const IMPORT_CALL = /\b(?:fromSTEP|fromBREP|fromSTL|fromDXF|fromSVG|fromGLB|fromGLTF|referenceImage|fontPath)\s*\(\s*/g;

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

function quotedPath(rest: string): string | null {
  const literal = /^(?:'([^'\\]*)'|"([^"\\]*)"|`([^`$\\]*)`)/.exec(rest);
  return literal?.[1] ?? literal?.[2] ?? literal?.[3] ?? null;
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

/** Stable when every imported literal path's bytes are unchanged. */
export function importIdentity(code: string, scriptDir: string | undefined): string {
  const parts: string[] = [];
  const re = new RegExp(IMPORT_CALL);
  while (re.exec(code) !== null) {
    const path = quotedPath(code.slice(re.lastIndex));
    if (path === null) return `unprovable:${Math.random().toString(16).slice(2)}`;
    parts.push(hashImport(path, scriptDir));
  }
  return parts.join('|');
}
