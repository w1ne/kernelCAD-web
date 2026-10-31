// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Param, FeatureId } from '../../shared/intent/types';
import { isParamRef, isTypedParamRef, type Editable, type TypedParamRef } from '../../shared/runtime/paramRef';
import { invalidArgsError } from '../../shared/intent/invalidArgs';
import { currentValue, paramValue } from '../../shared/runtime/editableHelpers';
import { formatScalarForError } from '../../shared/intent/types';
import type { CaptureSession } from './captureSession';

export const NONFINITE_TRANSFORM_GUIDANCE =
  'Recompute the expression that produced NaN/undefined; common causes: Math.sqrt of a negative, dividing by zero, reading an undeclared variable, or using a param before it exists. Replace with finite numbers or ParamRefs whose expressions resolve to finite numbers.';

function isTypedParam(value: unknown): value is Param {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Param).unit === 'string' &&
    typeof (value as Param).evaluated === 'number'
  );
}

function checkUntypedParamRef(component: unknown, label: string, table: CaptureSession['paramTable']): string | undefined {
  const ref = component as TypedParamRef & { $param: unknown };
  try {
    const resolved = currentValue(component as Editable<number>, table);
    if (!Number.isFinite(resolved)) {
      return `${label}=ParamRef(${ref.$param}) resolves to ${formatScalarForError(resolved)}`;
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return `${label}=ParamRef(${ref.$param}) could not resolve (${reason})`;
  }
  return undefined;
}

function checkTypedParam(component: unknown, label: string, table: CaptureSession['paramTable']): string | undefined {
  const param = component as Param;
  try {
    const resolved = paramValue(param, table);
    if (!Number.isFinite(resolved) || !Number.isFinite(param.evaluated)) {
      const refText = param.paramRef === undefined ? '' : `ParamRef(${typeof param.paramRef === 'string' ? param.paramRef : formatScalarForError(param.paramRef)}) `;
      const detail = Number.isFinite(resolved)
        ? `stores ${formatScalarForError(param.evaluated)} but resolves to ${formatScalarForError(resolved)}`
        : `resolves to ${formatScalarForError(resolved)}`;
      return `${label}=${refText}${detail}`;
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return `${label}=ParamRef could not resolve (${reason})`;
  }
  return undefined;
}

function checkComponent(component: unknown, label: string, table: CaptureSession['paramTable']): string | undefined {
  if (isParamRef(component) && !isTypedParamRef(component)) {
    return checkUntypedParamRef(component, label, table);
  }
  if (isTypedParam(component)) {
    return checkTypedParam(component, label, table);
  }
  if (typeof component !== 'number' || !Number.isFinite(component)) {
    return `${label}=${formatScalarForError(component)}`;
  }
  return undefined;
}

export function invalidEditableVec3Components(value: unknown, table: CaptureSession['paramTable']): string[] {
  const labels = ['x', 'y', 'z'] as const;
  const components: unknown[] | undefined = Array.isArray(value)
    ? [value[0], value[1], value[2]]
    : typeof value === 'object' && value !== null
      ? [(value as Record<string, unknown>).x, (value as Record<string, unknown>).y, (value as Record<string, unknown>).z]
      : undefined;
  if (!components) return [`vector=${formatScalarForError(value)}`];

  const issues: string[] = [];
  for (let i = 0; i < components.length; i++) {
    const label = labels[i]!;
    const issue = checkComponent(components[i], label, table);
    if (issue) issues.push(issue);
  }
  return issues;
}


export function invalidTransformVec3Error(
  operation: 'translate' | 'rotate-axis' | 'rotate-pivot',
  label: string,
  value: unknown,
  featureId: FeatureId,
  table: CaptureSession['paramTable'],
): ReturnType<typeof invalidArgsError> {
  const issues = invalidEditableVec3Components(value, table);
  const detail = issues.length > 0 ? issues.join(', ') : formatScalarForError(value);
  return invalidArgsError({
    api: label,
    path: 'vector',
    gotText: detail,
    requires: 'three finite numbers (or ParamRefs resolving to finite numbers)',
    example: 'shape.translate(0, 1, 2)',
    featureId: featureId as unknown as string,
    hint: `invalid-args.${operation}.nonfinite — ${NONFINITE_TRANSFORM_GUIDANCE}`,
  });
}
