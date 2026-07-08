// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/naming/topoRefName.ts
//
// Shared topology-ref name grammar. Used by shared manifests and re-exported
// by kernel/naming for existing runtime callers.

import { KernelError } from '../intent/kernelError';

/** Characters reserved by the @kc[...] grammar. None may appear inside a
 *  name segment. The set is fixed by spec §3.1 (separators) + §3.1 reserved
 *  chars + the grammar wrapper (`@`, `[`, `]`). */
export const RESERVED_TOPO_REF_CHARS = [
  '.', '/', '[', ']', '@', '#', '*', '?', ',',
] as const;

/** Regex form of the name grammar — alpha-leading, alnum + dash + underscore. */
export const TOPO_REF_NAME_REGEX = /^[A-Za-z][A-Za-z0-9_-]*$/;

/**
 * Throw KernelError('feature.invalid-args') if `name` is not safe to embed
 * in a `@kc[owner/kind/name]` topology reference.
 *
 * `scope` is a human-readable category used in the error message
 * ('face-label', 'part-name', 'connector-name', 'feature-name',
 * 'wrap-geom-name').
 *
 * `featureId` (optional) attaches to the thrown error for diagnostic plumbing.
 */
export function assertTopoRefSafeName(
  name: string,
  scope: 'face-label' | 'part-name' | 'connector-name' | 'feature-name' | 'wrap-geom-name',
  featureId?: string,
): void {
  if (typeof name !== 'string' || name.length === 0) {
    throw new KernelError(
      'feature.invalid-args',
      `${scope} must be a non-empty string; got ${JSON.stringify(name)}.`,
      featureId,
      `Use a non-empty identifier matching ${TOPO_REF_NAME_REGEX.source}.`,
    );
  }
  if (!TOPO_REF_NAME_REGEX.test(name)) {
    const offenders = RESERVED_TOPO_REF_CHARS.filter((c) => name.includes(c));
    const reason = offenders.length > 0
      ? `contains reserved character(s): ${offenders.map((c) => `'${c}'`).join(', ')}`
      : `does not match ${TOPO_REF_NAME_REGEX.source} (must start with a letter; subsequent chars must be letters, digits, dash, or underscore)`;
    throw new KernelError(
      'feature.invalid-args',
      `${scope} '${name}' is not a valid topology-ref name: ${reason}.`,
      featureId,
      `Rename to an identifier matching ${TOPO_REF_NAME_REGEX.source}; the disallowed characters are reserved by the @kc[owner/kind/name] grammar.`,
    );
  }
}
