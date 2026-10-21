// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// One rule for Params, joints, chips, and the public customizer.
// Every declared parameter is a control. `response` chooses how the drag
// updates the model (a finish-skipping preview, then an exact release). It
// does not decide whether the control exists.

import type { ParamResponse } from '../shared/runtime/paramTable';

export type ParamSurface = 'editor' | 'hosted';

export function paramControlVisible(
  response: ParamResponse | undefined,
  surface: ParamSurface,
): boolean {
  void response;
  void surface;
  return true;
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
