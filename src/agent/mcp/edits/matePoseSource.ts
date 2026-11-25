// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `add_mate` pose authoring: turn the MCP `pose` argument into a `.kcad.ts`
// expression the Studio TypeScript checker and the mate solver both accept.
//
// `MatePose` is `Editable<number>` (a number or a `ParamRef<number>`) or an
// Euler triple of those — a `{ param: '<Name>' }` object is NOT valid source.
// Emitting it verbatim (issue #1765) failed Studio compilation and made
// `solveMates` resolve the object to NaN. This module resolves a param name
// (or the legacy `{ param }` object) to the identifier of the `param(...)`
// declaration already in the source, so the emitted call binds the real
// ParamRef.

import { formatJsValue, isValidIdentifier } from './sourceEditUtils';

/** One scalar pose coordinate as the MCP caller may pass it. */
export type MatePoseScalarSource =
  | number
  /** Declared param name (`'Stroke'`) or binding (`'stroke'`). */
  | string
  /** Legacy object form; resolved to the declared param binding. */
  | { readonly param: string };

/** `add_mate` pose argument: one scalar, or an XYZ Euler triple for ball mates. */
export type MatePoseSource =
  | MatePoseScalarSource
  | readonly [MatePoseScalarSource, MatePoseScalarSource, MatePoseScalarSource];

export type MatePoseExpression =
  | { readonly ok: true; readonly expression: string }
  | { readonly ok: false; readonly error: string };

interface ParamDeclaration {
  readonly binding: string;
  readonly name: string;
}

/** `const stroke = param('Stroke', 25, { min: -40, max: 40 })`, also matching
 *  a namespaced call such as `kcad.param(...)`. */
const PARAM_DECLARATION_RE =
  /(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:[A-Za-z_$][A-Za-z0-9_$]*\.)*param\s*\(\s*(['"])([^'"]+)\2/g;

function declaredParams(code: string): ParamDeclaration[] {
  const declarations: ParamDeclaration[] = [];
  for (const match of code.matchAll(PARAM_DECLARATION_RE)) {
    declarations.push({ binding: match[1]!, name: match[3]! });
  }
  return declarations;
}

/** Resolve a param name or binding to the JS identifier bound in `code`. */
export function resolvePoseParamBinding(code: string, reference: string): MatePoseExpression {
  const wanted = reference.trim();
  const declarations = declaredParams(code);
  const byName = declarations.find((declaration) => declaration.name === wanted);
  if (byName !== undefined) return { ok: true, expression: byName.binding };
  const byBinding = declarations.find((declaration) => declaration.binding === wanted);
  if (byBinding !== undefined && isValidIdentifier(wanted)) return { ok: true, expression: byBinding.binding };

  const declared = declarations.length === 0
    ? 'The source declares no params.'
    : `Declared params: ${declarations.map((declaration) => `'${declaration.name}'`).join(', ')}.`;
  return {
    ok: false,
    error:
      `pose refers to param '${wanted}', but the source has no ` +
      `\`const <binding> = param('${wanted}', ...)\` declaration. ${declared} ` +
      `Declare the param first, or pass a numeric pose.`,
  };
}

function formatPoseScalar(code: string, scalar: MatePoseScalarSource): MatePoseExpression {
  if (typeof scalar === 'number') {
    if (!Number.isFinite(scalar)) return { ok: false, error: `pose must be finite; got ${String(scalar)}.` };
    return { ok: true, expression: formatJsValue(scalar) };
  }
  if (typeof scalar === 'string') return resolvePoseParamBinding(code, scalar);
  if (typeof scalar === 'object' && scalar !== null && typeof scalar.param === 'string') {
    return resolvePoseParamBinding(code, scalar.param);
  }
  return {
    ok: false,
    error: 'pose must be a finite number, a declared param name, { param: <name> }, or a 3-element Euler triple.',
  };
}

/**
 * Render the `pose:` option value for `<assembly>.mate(...)`.
 *
 * Accepts a number, a declared param name/binding, the legacy
 * `{ param: '<Name>' }` shape, or a 3-element triple of those. Anything that
 * would not compile as `MatePose` fails closed with a repair message.
 */
export function formatMatePose(code: string, pose: MatePoseSource): MatePoseExpression {
  if (Array.isArray(pose)) {
    if (pose.length !== 3) return { ok: false, error: 'pose triple must be exactly [x, y, z].' };
    const components: string[] = [];
    for (const scalar of pose) {
      const formatted = formatPoseScalar(code, scalar);
      if (!formatted.ok) return formatted;
      components.push(formatted.expression);
    }
    return { ok: true, expression: `[${components.join(', ')}]` };
  }
  return formatPoseScalar(code, pose as MatePoseScalarSource);
}
