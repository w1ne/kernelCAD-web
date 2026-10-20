// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// One rule for Params, joints, chips, and the public customizer.
// A heavy param is never a control. An unmeasured param is a control in the
// in-process editor and is hidden on a hosted page, where the only honest
// class is the one publish wrote down.

import type { ParamResponse } from '../shared/runtime/paramTable';

export type ParamSurface = 'editor' | 'hosted';

export function paramControlVisible(
  response: ParamResponse | undefined,
  surface: ParamSurface,
): boolean {
  if (response === 'local' || response === 'rigid') return true;
  if (response === 'heavy') return false;
  return surface === 'editor';
}

/** A joint row stays when it has no param, or when one of its params is a control. */
export function jointControlVisible(
  poseParamNames: readonly (string | null)[],
  responseOf: (name: string) => ParamResponse | undefined,
  surface: ParamSurface,
): boolean {
  const names = poseParamNames.filter((name): name is string => name !== null);
  if (names.length === 0) return true;
  return names.some((name) => paramControlVisible(responseOf(name), surface));
}
