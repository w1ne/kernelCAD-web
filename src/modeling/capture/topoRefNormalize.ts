// src/modeling/capture/topoRefNormalize.ts
//
// Single-source-of-truth helper for accepting either a `@kc[owner/kind/name]`
// string OR a bare canonical-name string OR a structured selector object,
// returning the structured form. Used at MCP tool input edges so the @kc
// acceptance lives in one place.

import { parseTopoRef } from '../../kernel/naming';
import { KernelError } from '../../shared/intent/kernelError';

export type NormalizedRef =
  | { face: string }
  | { edge: string }
  | { vertex: string }
  | { connector: string; ownerPart: string };

export function normalizeTopoRefOrString(
  input: string,
  expectedKind: 'face' | 'edge' | 'vertex' | 'connector',
): NormalizedRef {
  if (typeof input !== 'string') {
    throw new KernelError(
      'feature.invalid-args',
      `expected a string ref; got ${typeof input}.`,
      undefined,
      `Pass a @kc[owner/${expectedKind}/name] string or the bare canonical name (e.g. 'top').`,
    );
  }
  if (input.startsWith('@kc[')) {
    const parsed = parseTopoRef(input);
    if ('error' in parsed) {
      throw new KernelError(
        'feature.invalid-args',
        `malformed topology ref '${input}': ${parsed.error}.`,
        undefined,
        `Topology refs use the @kc[owner/kind/name] grammar. ${parsed.error}.`,
      );
    }
    if (parsed.kind !== expectedKind) {
      throw new KernelError(
        'feature.invalid-args',
        `ref '${input}' has kind '${parsed.kind}'; this slot requires '${expectedKind}'.`,
        undefined,
        `Use a ref whose second path segment is '${expectedKind}' (e.g. '@kc[base/${expectedKind}/<name>]').`,
      );
    }
    const name = parsed.segments[parsed.segments.length - 1];
    if (name === undefined) {
      throw new KernelError(
        'feature.invalid-args',
        `ref '${input}' has no entity name segment.`,
        undefined,
        `Append a name segment: '@kc[${parsed.owner}/${expectedKind}/<name>]'.`,
      );
    }
    if (expectedKind === 'connector') {
      return { connector: name, ownerPart: parsed.owner };
    }
    if (expectedKind === 'edge') return { edge: name };
    if (expectedKind === 'vertex') return { vertex: name };
    return { face: name };
  }
  // Bare canonical-name shorthand.
  if (expectedKind === 'connector') {
    // The legacy connector ref form is `<partName>.<connectorName>` —
    // callers that hit this code path with a dot-form should split before
    // calling. We don't accept bare canonical names for connectors.
    throw new KernelError(
      'feature.invalid-args',
      `connector ref '${input}' must be either '<partName>.<connectorName>' or '@kc[<partName>/connector/<connectorName>]'.`,
      undefined,
      `Use the dot form for legacy compatibility or the @kc[...] form going forward.`,
    );
  }
  if (expectedKind === 'edge') return { edge: input };
  if (expectedKind === 'vertex') return { vertex: input };
  return { face: input };
}
