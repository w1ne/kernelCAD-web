// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/naming/topoRef.ts
//
// Parser + formatter for the @kc[owner/kind/name] topology-ref grammar.
//
// Grammar (spec §3.1, BNF):
//   ref       ::= '@kc[' path ']'
//   path      ::= owner ( '/' kind ( '/' segment )* )?
//   owner     ::= name
//   kind      ::= 'face' | 'edge' | 'vertex' | 'connector' | 'sketch' | 'part' | 'solid'
//   segment   ::= name | name '[' digit+ ']'
//   name      ::= [A-Za-z][A-Za-z0-9_-]*
//   modifier  ::= '#' name   (attached to last segment; v1 modifiers = 'normal' | 'axis' | 'center')
//
// Returns a structured ParseError instead of throwing — callers expect to
// branch on the result without try/catch.

import { TOPO_REF_NAME_REGEX } from './uniquenessValidator';

export type TopoKind = 'face' | 'edge' | 'vertex' | 'connector' | 'sketch' | 'part' | 'solid';
export type TopoModifier = 'normal' | 'axis' | 'center';

const TOPO_KINDS: readonly TopoKind[] = ['face', 'edge', 'vertex', 'connector', 'sketch', 'part', 'solid'];
const TOPO_MODIFIERS: readonly TopoModifier[] = ['normal', 'axis', 'center'];

export interface TopoRef {
  /** The original input string, preserved for diagnostics. */
  readonly raw: string;
  /** The first path segment — part name, feature name, or top-level shape name. */
  readonly owner: string;
  /** The kind discriminator. Defaults to 'part' when the ref is just `@kc[<owner>]`. */
  readonly kind: TopoKind;
  /** Remaining path segments after the kind. Empty for bare-owner refs. */
  readonly segments: readonly string[];
  /** Sub-aspect modifier after `#`. Undefined when omitted. */
  readonly modifier?: TopoModifier;
}

export interface TopoRefParseError {
  readonly error: string;
  readonly raw: string;
}

export function parseTopoRef(s: string): TopoRef | TopoRefParseError {
  if (typeof s !== 'string' || s.length === 0) {
    return { error: 'empty input', raw: String(s) };
  }
  if (!s.startsWith('@kc[')) {
    return { error: `missing @kc[ prefix`, raw: s };
  }
  if (!s.endsWith(']')) {
    return { error: `missing closing bracket ]`, raw: s };
  }
  // Body lives between the FIRST '[' (after '@kc') and the LAST ']' in s.
  // We require depth-zero at the final ']' so that `@kc[foo[2]]` parses but
  // `@kc[foo[2]]extra` is rejected (trailing content) and unbalanced opens
  // are rejected. This replaces the old `/^@kc\[([^\]]*)\]$/` regex which
  // truncated the body at the FIRST inner ']' and thus rejected any ref
  // containing a `name[N]` indexed segment.
  const bodyStart = '@kc['.length; // index 4
  const bodyEnd = s.length - 1;    // index of the final ']'
  let depth = 1;
  for (let i = bodyStart; i < bodyEnd; i++) {
    if (s[i] === '[') depth++;
    else if (s[i] === ']') depth--;
    if (depth === 0) {
      return {
        error: `unbalanced brackets: closing ']' at offset ${i} ends the @kc[ wrapper before the final character (likely trailing content)`,
        raw: s,
      };
    }
  }
  if (depth !== 1) {
    return { error: `unbalanced brackets inside ref body`, raw: s };
  }
  const body = s.slice(bodyStart, bodyEnd);
  if (body.length === 0) {
    return { error: `empty ref body`, raw: s };
  }

  // Split off modifier first (everything after the last '#').
  let modifier: TopoModifier | undefined;
  let pathPart = body;
  const hashCount = (body.match(/#/g) ?? []).length;
  if (hashCount > 1) {
    return { error: `at most one '#' modifier separator is allowed`, raw: s };
  }
  if (hashCount === 1) {
    const hashIdx = body.lastIndexOf('#');
    const modCandidate = body.slice(hashIdx + 1);
    pathPart = body.slice(0, hashIdx);
    if (!(TOPO_MODIFIERS as readonly string[]).includes(modCandidate)) {
      return { error: `unknown modifier '${modCandidate}'; expected one of ${TOPO_MODIFIERS.join(', ')}`, raw: s };
    }
    modifier = modCandidate as TopoModifier;
  }

  const parts = pathPart.split('/');
  if (parts.some((p) => p.length === 0)) {
    return { error: `empty path segment (leading, trailing, or consecutive '/')`, raw: s };
  }

  const owner = parts[0];
  // Owners follow the same name | name '[' digit+ ']' grammar as segments
  // (spec §3.1) so feature-array entries like `mountingHoles[2]` survive as
  // refs.
  const ownerIdxStripped = owner.replace(/\[\d+\]$/, '');
  if (!TOPO_REF_NAME_REGEX.test(ownerIdxStripped)) {
    return { error: `owner name '${owner}' does not match ${TOPO_REF_NAME_REGEX.source}`, raw: s };
  }

  if (parts.length === 1) {
    return { raw: s, owner, kind: 'part', segments: [], ...(modifier !== undefined ? { modifier } : {}) };
  }

  const kindCandidate = parts[1];
  if (!(TOPO_KINDS as readonly string[]).includes(kindCandidate)) {
    return { error: `unknown kind '${kindCandidate}'; expected one of ${TOPO_KINDS.join(', ')}`, raw: s };
  }
  const kind = kindCandidate as TopoKind;

  const segments = parts.slice(2);
  for (const seg of segments) {
    // Allow optional [N] index suffix per spec §3.1: segment ::= name | name '[' digit+ ']'.
    const idxStripped = seg.replace(/\[\d+\]$/, '');
    if (!TOPO_REF_NAME_REGEX.test(idxStripped)) {
      return { error: `segment name '${seg}' does not match the grammar (reserved character or wrong form)`, raw: s };
    }
  }

  return { raw: s, owner, kind, segments, ...(modifier !== undefined ? { modifier } : {}) };
}

export interface FormatTopoRefParts {
  readonly owner: string;
  readonly kind: TopoKind;
  readonly segments?: readonly string[];
  readonly modifier?: TopoModifier;
}

export function formatTopoRef(parts: FormatTopoRefParts): string {
  const segs = parts.segments ?? [];
  const tail = parts.modifier !== undefined ? `#${parts.modifier}` : '';
  if (parts.kind === 'part' && segs.length === 0) {
    return `@kc[${parts.owner}${tail}]`;
  }
  return `@kc[${parts.owner}/${parts.kind}${segs.length > 0 ? '/' + segs.join('/') : ''}${tail}]`;
}
